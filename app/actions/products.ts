"use server";

import { mockProducts, mockReviews } from "@/lib/mock-data";
import { isSupabaseConfigured, logSupabaseError } from "@/lib/supabase-config";
import type { Product, ProductVariant, Review } from "@/lib/types";

const IS_CONFIGURED = isSupabaseConfigured();

// products와 함께 product_variants/product_images를 한 번에 끌어와 N+1을 피한다.
// (product_variants.product_id, product_images.product_id에 FK가 있어
// PostgREST가 자동으로 관계를 인식해 중첩 배열로 반환한다.)
const PRODUCT_SELECT = "*, product_variants(*), product_images(*)";

interface VariantRow {
  id: string;
  color_name: string | null;
  color_hex: string | null;
  option_name: string | null;
  image_url: string | null;
  price_override: number | null;
  is_active: boolean;
  display_order: number;
}

interface ImageRow {
  role: string;
  image_url: string;
  alt_text: string | null;
  layout: string | null;
  width: number | null;
  height: number | null;
  display_order: number;
}

function byOrder<T extends { display_order: number }>(a: T, b: T) {
  return a.display_order - b.display_order;
}

// Supabase 행(products + 중첩된 product_variants/product_images) → Product 타입 변환
function mapRow(row: Record<string, unknown>): Product {
  const variants = (Array.isArray(row.product_variants) ? (row.product_variants as VariantRow[]) : [])
    .slice()
    .sort(byOrder);
  const images = (Array.isArray(row.product_images) ? (row.product_images as ImageRow[]) : [])
    .slice()
    .sort(byOrder);

  const byRole = (role: string) => images.filter((i) => i.role === role);
  const oneByRole = (role: string) => byRole(role)[0];

  const hero = oneByRole("hero");
  const gallery = byRole("gallery");
  const story = oneByRole("story");
  const materialDetail = oneByRole("material_detail");
  const colorSection = oneByRole("color_section");
  const detail = byRole("detail");

  const price = Number(row.price);

  // colors/sizes는 활성 variant에서만 파생한다 — 비활성 처리된 행(예: 색상+
  // 사이즈 조합형 정비 후 남겨둔 split-axis 레거시 행)이 선택지에 다시
  // 노출되면 안 된다. 색상 전용/사이즈 전용 행뿐 아니라 색상+사이즈를 모두
  // 가진 조합형 행도 각각 colors/sizes 파생에 기여해야 하므로 서로를
  // 배제하는 조건은 두지 않고, 같은 이름은 처음 등장한 활성 행의 값을
  // 대표값으로 삼아 한 번만 남긴다(Map은 삽입 순서를 보존하므로 노출 순서는
  // 기존 display_order 정렬을 그대로 따른다).
  const activeVariants = variants.filter((v) => v.is_active);

  const colorMap = new Map<string, { name: string; hex: string; image?: string }>();
  for (const v of activeVariants) {
    if (v.color_name && !colorMap.has(v.color_name)) {
      colorMap.set(v.color_name, {
        name: v.color_name,
        hex: v.color_hex as string,
        ...(v.image_url ? { image: v.image_url } : {}),
      });
    }
  }
  const colors = Array.from(colorMap.values());

  const sizeMap = new Map<string, { name: string; price: number }>();
  for (const v of activeVariants) {
    if (v.option_name && !sizeMap.has(v.option_name)) {
      sizeMap.set(v.option_name, {
        name: v.option_name,
        price: v.price_override ?? price,
      });
    }
  }
  const sizes = Array.from(sizeMap.values());

  // colors/sizes는 렌더링용 파생 뷰일 뿐, 실제 variant_id 결정(장바구니/주문)은
  // 이 원본 목록을 기준으로 색상+사이즈 조합을 정확히 매칭해서 이루어져야 한다.
  const productVariants: ProductVariant[] = variants.map((v) => ({
    id: v.id,
    ...(v.color_name ? { colorName: v.color_name } : {}),
    ...(v.color_hex ? { colorHex: v.color_hex } : {}),
    ...(v.option_name ? { optionName: v.option_name } : {}),
    ...(v.image_url ? { imageUrl: v.image_url } : {}),
    ...(v.price_override !== null ? { priceOverride: v.price_override } : {}),
    isActive: v.is_active,
  }));

  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    nameKo: row.name_ko ? String(row.name_ko) : undefined,
    description: String(row.description ?? ""),
    shortDescription: row.short_description ? String(row.short_description) : undefined,
    price,
    imageUrl: hero ? hero.image_url : null,
    images: gallery.map((i) => i.image_url),
    colors: colors.length > 0 ? colors : undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    variants: productVariants.length > 0 ? productVariants : undefined,
    category: String(row.category ?? ""),
    stock: Number(row.stock ?? 0),
    isComingSoon: Boolean(row.is_coming_soon),
    material: row.material ? String(row.material) : undefined,
    sizeGuide: row.size_guide ? String(row.size_guide) : undefined,
    careInstructions: row.care_instructions ? String(row.care_instructions) : undefined,
    detailIntro: row.detail_intro ? String(row.detail_intro) : undefined,
    tagline: row.tagline ? String(row.tagline) : undefined,
    features: Array.isArray(row.features) ? (row.features as Product["features"]) : undefined,
    brandStory: row.brand_story ? String(row.brand_story) : undefined,
    storyImage: story ? story.image_url : undefined,
    storyImageAlt: story?.alt_text ? story.alt_text : undefined,
    materialDetailImage: materialDetail ? materialDetail.image_url : undefined,
    materialDetailImageAlt: materialDetail?.alt_text ? materialDetail.alt_text : undefined,
    detailImages:
      detail.length > 0
        ? detail.map((d) => ({
            src: d.image_url,
            alt: d.alt_text ?? "",
            width: d.width ?? 0,
            height: d.height ?? 0,
            ...(d.layout ? { layout: d.layout as NonNullable<Product["detailImages"]>[number]["layout"] } : {}),
          }))
        : undefined,
    colorSectionTitle: row.color_section_title ? String(row.color_section_title) : undefined,
    colorDescription: row.color_description ? String(row.color_description) : undefined,
    colorSectionImage: colorSection ? colorSection.image_url : undefined,
    colorSectionImageAlt: colorSection?.alt_text ? colorSection.alt_text : undefined,
    certificationNumber: row.certification_number ? String(row.certification_number) : undefined,
    certificationText: row.certification_text ? String(row.certification_text) : undefined,
    accordionItems: Array.isArray(row.accordion_items) && (row.accordion_items as unknown[]).length > 0
      ? (row.accordion_items as Product["accordionItems"])
      : undefined,
    relatedProductSlugs: Array.isArray(row.related_product_slugs) ? (row.related_product_slugs as string[]) : undefined,
    imageAlts: gallery.length > 0 ? gallery.map((i) => i.alt_text ?? "") : undefined,
    imageAltSubject: row.image_alt_subject ? String(row.image_alt_subject) : undefined,
    hardwareInfo: row.hardware_info ? String(row.hardware_info) : undefined,
    rating: row.rating ? Number(row.rating) : undefined,
    reviewCount: row.review_count ? Number(row.review_count) : undefined,
    createdAt: String(row.created_at ?? ""),
  };
}

export async function getProducts(filters?: {
  category?: string;
  sort?: string;
}): Promise<Product[]> {
  if (IS_CONFIGURED) {
    try {
      const { createServerSideClient } = await import("@/lib/supabase-server");
      const supabase = createServerSideClient();
      let query = supabase.from("products").select(PRODUCT_SELECT);

      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      switch (filters?.sort) {
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "popular":
          query = query.order("review_count", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (!error && data) return data.map(mapRow);
      if (error) logSupabaseError("getProducts 조회", error);
    } catch (error) {
      logSupabaseError("getProducts", error);
    }
  }

  // Mock 폴백
  let products = [...mockProducts];

  if (filters?.category && filters.category !== "all") {
    products = products.filter((p) => p.category === filters.category);
  }

  switch (filters?.sort) {
    case "price_asc":
      products.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      products.sort((a, b) => b.price - a.price);
      break;
    case "popular":
      products.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
      break;
    default:
      products.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  return products;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (IS_CONFIGURED) {
    try {
      const { createServerSideClient } = await import("@/lib/supabase-server");
      const supabase = createServerSideClient();
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", slug)
        .single();

      if (!error && data) return mapRow(data);
      if (error) logSupabaseError("getProductBySlug 조회", error);
    } catch (error) {
      logSupabaseError("getProductBySlug", error);
    }
  }

  return mockProducts.find((p) => p.slug === slug) ?? null;
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  if (IS_CONFIGURED) {
    try {
      const { createServerSideClient } = await import("@/lib/supabase-server");
      const supabase = createServerSideClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles(name)")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map((r) => ({
          id: String(r.id),
          productId: String(r.product_id),
          userId: String(r.user_id),
          userName: (r.profiles as { name: string } | null)?.name ?? "익명",
          rating: Number(r.rating),
          content: String(r.content),
          createdAt: String(r.created_at),
        }));
      }
      if (error) logSupabaseError("getProductReviews 조회", error);
    } catch (error) {
      logSupabaseError("getProductReviews", error);
    }
  }

  return mockReviews.filter((r) => r.productId === productId);
}
