"use server";

import { mockProducts, mockReviews } from "@/lib/mock-data";
import type { Product, Review } from "@/lib/types";

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http");

// Supabase 행 → Product 타입 변환
function mapRow(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description ?? ""),
    shortDescription: row.short_description ? String(row.short_description) : undefined,
    price: Number(row.price),
    imageUrl: row.image_url ? String(row.image_url) : null,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    category: String(row.category ?? ""),
    stock: Number(row.stock ?? 0),
    isComingSoon: Boolean(row.is_coming_soon),
    material: row.material ? String(row.material) : undefined,
    sizeGuide: row.size_guide ? String(row.size_guide) : undefined,
    careInstructions: row.care_instructions ? String(row.care_instructions) : undefined,
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
      let query = supabase.from("products").select("*");

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
    } catch {}
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
        .select("*")
        .eq("slug", slug)
        .single();

      if (!error && data) return mapRow(data);
    } catch {}
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
    } catch {}
  }

  return mockReviews.filter((r) => r.productId === productId);
}
