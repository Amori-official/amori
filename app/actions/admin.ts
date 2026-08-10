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
