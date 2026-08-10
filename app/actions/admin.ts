"use server";

// 관리자 페이지 전용 서버 액션.
//
// 보안: 모든 쓰기는 Supabase RLS의 admin 정책(is_admin())으로 DB 레벨에서 강제되지만,
// 서버 액션에서도 requireAdmin()으로 한 번 더 확인한다(방어적). is_admin()은
// profiles.role='admin' 기준의 SECURITY DEFINER 함수.

import { createServerSideClient } from "@/lib/supabase-server";
import { isSupabaseConfigured, logSupabaseError } from "@/lib/supabase-config";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminProductVariant {
  id: string;
  colorName: string | null;
  optionName: string | null;
  isActive: boolean;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  nameKo: string | null;
  category: string | null;
  price: number;
  isPublished: boolean;
  saleStatus: string;
  variants: AdminProductVariant[];
}

export interface AdminOrderItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  buyerName: string | null;
  recipientName: string | null;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  items: AdminOrderItem[];
}

/** 현재 세션이 관리자인지 (레이아웃 가드용 — throw 없이 boolean 반환). */
export async function isCurrentUserAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = createServerSideClient();
    const { data, error } = await supabase.rpc("is_admin");
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/** 관리자 아니면 throw. 모든 쓰기 액션 앞에서 호출한다. */
async function requireAdmin(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error || data !== true) {
    throw new Error("관리자 권한이 필요합니다.");
  }
}

// ── 상품 ────────────────────────────────────────────────
export async function getAdminProducts(): Promise<AdminProduct[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, slug, name, name_ko, category, price, is_published, sale_status, product_variants(id, color_name, option_name, is_active, display_order)"
      )
      .order("created_at", { ascending: true });

    if (error || !data) {
      logSupabaseError("getAdminProducts", error);
      return [];
    }

    return data.map((p) => ({
      id: String(p.id),
      slug: String(p.slug),
      name: String(p.name),
      nameKo: (p.name_ko as string | null) ?? null,
      category: (p.category as string | null) ?? null,
      price: Number(p.price),
      isPublished: Boolean(p.is_published),
      saleStatus: String(p.sale_status ?? "active"),
      variants: (Array.isArray(p.product_variants) ? p.product_variants : [])
        .slice()
        .sort(
          (a: Record<string, unknown>, b: Record<string, unknown>) =>
            Number(a.display_order ?? 0) - Number(b.display_order ?? 0)
        )
        .map((v: Record<string, unknown>) => ({
          id: String(v.id),
          colorName: (v.color_name as string | null) ?? null,
          optionName: (v.option_name as string | null) ?? null,
          isActive: Boolean(v.is_active),
        })),
    }));
  } catch {
    return [];
  }
}

export async function setProductPublished(
  productId: string,
  isPublished: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase
      .from("products")
      .update({ is_published: isPublished })
      .eq("id", productId);
    if (error) {
      logSupabaseError("setProductPublished", error);
      return { error: "상태 변경에 실패했습니다." };
    }
    revalidatePath("/admin/products");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

export async function setVariantActive(
  variantId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase
      .from("product_variants")
      .update({ is_active: isActive })
      .eq("id", variantId);
    if (error) {
      logSupabaseError("setVariantActive", error);
      return { error: "옵션 상태 변경에 실패했습니다." };
    }
    revalidatePath("/admin/products");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// ── 주문 ────────────────────────────────────────────────
export async function getAdminOrders(): Promise<AdminOrder[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, buyer_name, recipient_name, total_amount, order_status, payment_status, fulfillment_status, created_at, order_items(product_name, quantity, price)"
      )
      .order("created_at", { ascending: false });

    if (error || !data) {
      logSupabaseError("getAdminOrders", error);
      return [];
    }

    return data.map((o) => ({
      id: String(o.id),
      orderNumber: String(o.order_number ?? o.id),
      buyerName: (o.buyer_name as string | null) ?? null,
      recipientName: (o.recipient_name as string | null) ?? null,
      totalAmount: Number(o.total_amount),
      orderStatus: String(o.order_status ?? "pending"),
      paymentStatus: String(o.payment_status ?? "ready"),
      fulfillmentStatus: String(o.fulfillment_status ?? "unfulfilled"),
      createdAt: String(o.created_at),
      items: (Array.isArray(o.order_items) ? o.order_items : []).map(
        (i: Record<string, unknown>) => ({
          productName: String(i.product_name ?? ""),
          quantity: Number(i.quantity ?? 0),
          price: Number(i.price ?? 0),
        })
      ),
    }));
  } catch {
    return [];
  }
}

const FULFILLMENT_VALUES = ["unfulfilled", "preparing", "shipped", "delivered", "returned"];
const ORDER_STATUS_VALUES = ["pending", "confirmed", "cancelled", "completed"];

export async function updateOrderStatus(
  orderId: string,
  patch: { fulfillmentStatus?: string; orderStatus?: string }
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const update: Record<string, string> = {};
    if (patch.fulfillmentStatus !== undefined) {
      if (!FULFILLMENT_VALUES.includes(patch.fulfillmentStatus)) {
        return { error: "잘못된 배송 상태입니다." };
      }
      update.fulfillment_status = patch.fulfillmentStatus;
    }
    if (patch.orderStatus !== undefined) {
      if (!ORDER_STATUS_VALUES.includes(patch.orderStatus)) {
        return { error: "잘못된 주문 상태입니다." };
      }
      update.order_status = patch.orderStatus;
    }
    if (Object.keys(update).length === 0) return {};

    const { error } = await supabase.from("orders").update(update).eq("id", orderId);
    if (error) {
      logSupabaseError("updateOrderStatus", error);
      return { error: "주문 상태 변경에 실패했습니다." };
    }
    revalidatePath("/admin/orders");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// ── 상품 상세 편집 (2단계) ──────────────────────────────
export interface Feature {
  label: string;
  body: string;
}
export interface AccordionItem {
  title: string;
  content: string;
}
export interface AdminVariantDetail {
  id: string;
  colorName: string;
  colorHex: string;
  optionName: string;
  sku: string;
  imageUrl: string;
  priceOverride: number | null;
  isActive: boolean;
  displayOrder: number;
}
export interface AdminProductDetail {
  id: string;
  slug: string;
  name: string;
  nameKo: string;
  category: string;
  price: number;
  tagline: string;
  shortDescription: string;
  description: string;
  detailIntro: string;
  brandStory: string;
  material: string;
  sizeGuide: string;
  careInstructions: string;
  hardwareInfo: string;
  certificationNumber: string;
  certificationText: string;
  colorSectionTitle: string;
  colorDescription: string;
  imageAltSubject: string;
  seoTitle: string;
  seoDescription: string;
  saleStatus: string;
  isPublished: boolean;
  images: string[];
  relatedProductSlugs: string[];
  features: Feature[];
  accordionItems: AccordionItem[];
  variants: AdminVariantDetail[];
}

const s = (v: unknown): string => (v == null ? "" : String(v));
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export async function getAdminProductDetail(id: string): Promise<AdminProductDetail | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { data, error } = await supabase
      .from("products")
      .select("*, product_variants(*)")
      .eq("id", id)
      .single();
    if (error || !data) {
      logSupabaseError("getAdminProductDetail", error);
      return null;
    }
    const d = data as Record<string, unknown>;
    const rawFeatures = Array.isArray(d.features) ? (d.features as Record<string, unknown>[]) : [];
    const rawAccordion = Array.isArray(d.accordion_items) ? (d.accordion_items as Record<string, unknown>[]) : [];
    return {
      id: s(d.id),
      slug: s(d.slug),
      name: s(d.name),
      nameKo: s(d.name_ko),
      category: s(d.category),
      price: Number(d.price ?? 0),
      tagline: s(d.tagline),
      shortDescription: s(d.short_description),
      description: s(d.description),
      detailIntro: s(d.detail_intro),
      brandStory: s(d.brand_story),
      material: s(d.material),
      sizeGuide: s(d.size_guide),
      careInstructions: s(d.care_instructions),
      hardwareInfo: s(d.hardware_info),
      certificationNumber: s(d.certification_number),
      certificationText: s(d.certification_text),
      colorSectionTitle: s(d.color_section_title),
      colorDescription: s(d.color_description),
      imageAltSubject: s(d.image_alt_subject),
      seoTitle: s(d.seo_title),
      seoDescription: s(d.seo_description),
      saleStatus: s(d.sale_status) || "active",
      isPublished: Boolean(d.is_published),
      images: arr(d.images),
      relatedProductSlugs: arr(d.related_product_slugs),
      features: rawFeatures.map((f) => ({ label: s(f.label), body: s(f.body) })),
      accordionItems: rawAccordion.map((a) => ({ title: s(a.title), content: s(a.content) })),
      variants: (Array.isArray(d.product_variants) ? (d.product_variants as Record<string, unknown>[]) : [])
        .slice()
        .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0))
        .map((v) => ({
          id: s(v.id),
          colorName: s(v.color_name),
          colorHex: s(v.color_hex),
          optionName: s(v.option_name),
          sku: s(v.sku),
          imageUrl: s(v.image_url),
          priceOverride: v.price_override == null ? null : Number(v.price_override),
          isActive: Boolean(v.is_active),
          displayOrder: Number(v.display_order ?? 0),
        })),
    };
  } catch {
    return null;
  }
}

export type ProductUpdateInput = Omit<AdminProductDetail, "id" | "variants">;

export async function updateProduct(
  id: string,
  input: ProductUpdateInput
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    if (!input.name.trim()) return { error: "상품명은 필수입니다." };
    if (!input.slug.trim()) return { error: "슬러그(URL)는 필수입니다." };
    if (!Number.isFinite(input.price) || input.price < 0) return { error: "가격이 올바르지 않습니다." };

    const update = {
      slug: input.slug.trim(),
      name: input.name.trim(),
      name_ko: input.nameKo || null,
      category: input.category || null,
      price: Math.round(input.price),
      tagline: input.tagline || null,
      short_description: input.shortDescription || null,
      description: input.description || null,
      detail_intro: input.detailIntro || null,
      brand_story: input.brandStory || null,
      material: input.material || null,
      size_guide: input.sizeGuide || null,
      care_instructions: input.careInstructions || null,
      hardware_info: input.hardwareInfo || null,
      certification_number: input.certificationNumber || null,
      certification_text: input.certificationText || null,
      color_section_title: input.colorSectionTitle || null,
      color_description: input.colorDescription || null,
      image_alt_subject: input.imageAltSubject || null,
      seo_title: input.seoTitle || null,
      seo_description: input.seoDescription || null,
      sale_status: input.saleStatus || "active",
      is_published: input.isPublished,
      images: input.images.filter((x) => x.trim()),
      related_product_slugs: input.relatedProductSlugs.filter((x) => x.trim()),
      features: input.features.filter((f) => f.label.trim() || f.body.trim()),
      accordion_items: input.accordionItems.filter((a) => a.title.trim() || a.content.trim()),
    };

    const { error } = await supabase.from("products").update(update).eq("id", id);
    if (error) {
      logSupabaseError("updateProduct", error);
      return { error: "상품 저장에 실패했습니다. (슬러그 중복 여부 확인)" };
    }
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/shop");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

export interface VariantInput {
  colorName: string;
  colorHex: string;
  optionName: string;
  sku: string;
  imageUrl: string;
  priceOverride: number | null;
  isActive: boolean;
  displayOrder: number;
}

function variantRow(v: VariantInput) {
  return {
    color_name: v.colorName || null,
    color_hex: v.colorHex || null,
    option_name: v.optionName || null,
    sku: v.sku || null,
    image_url: v.imageUrl || null,
    price_override: v.priceOverride == null || Number.isNaN(v.priceOverride) ? null : Math.round(v.priceOverride),
    is_active: v.isActive,
    display_order: Math.round(v.displayOrder) || 0,
  };
}

export async function updateVariant(id: string, input: VariantInput): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase.from("product_variants").update(variantRow(input)).eq("id", id);
    if (error) {
      logSupabaseError("updateVariant", error);
      return { error: "옵션 저장에 실패했습니다." };
    }
    revalidatePath("/admin/products");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

export async function createVariant(
  productId: string,
  input: VariantInput
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, ...variantRow(input) });
    if (error) {
      logSupabaseError("createVariant", error);
      return { error: "옵션 추가에 실패했습니다." };
    }
    revalidatePath("/admin/products");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

export async function deleteVariant(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase.from("product_variants").delete().eq("id", id);
    if (error) {
      logSupabaseError("deleteVariant", error);
      return { error: "옵션 삭제에 실패했습니다." };
    }
    revalidatePath("/admin/products");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// ── 상품 신규 생성 (3단계) ──────────────────────────────
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createProduct(input: {
  name: string;
  nameKo: string;
  slug: string;
  category: string;
  price: number;
}): Promise<{ id?: string; error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();
    if (!name) return { error: "상품명은 필수입니다." };
    if (!SLUG_REGEX.test(slug)) return { error: "슬러그는 영문 소문자·숫자·하이픈만 사용하세요 (예: hand-towel)." };
    if (!Number.isFinite(input.price) || input.price < 0) return { error: "가격이 올바르지 않습니다." };

    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        name_ko: input.nameKo.trim() || null,
        slug,
        category: input.category.trim() || null,
        price: Math.round(input.price),
        is_published: false, // 등록 직후엔 미게시 — 상세 편집 후 게시
      })
      .select("id")
      .single();

    if (error || !data) {
      logSupabaseError("createProduct", error);
      if (error?.code === "23505") return { error: "이미 사용 중인 슬러그입니다." };
      return { error: "상품 생성에 실패했습니다." };
    }
    revalidatePath("/admin/products");
    return { id: String(data.id) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}
