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
import type { SiteSettings } from "@/lib/site";
import { toAttribution, type Attribution } from "@/lib/attribution";

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
  stock: number;
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
  returnStatus: string | null;
  createdAt: string;
  items: AdminOrderItem[];
  /** 유입 경로(UTM 등) — orders.attribution */
  attribution: Attribution | null;
  /** 고객 배송 요청사항(메모) — orders.shipping_request */
  shippingRequest: string | null;
  /** 취소 주체: 'admin'(판매자) | 'customer'(구매자) | 'system'(자동) | null */
  cancelledBy: string | null;
  /** 취소 사유 라벨 — orders.cancel_reason */
  cancelReason: string | null;
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

// ── 대시보드 (Phase 1) ──────────────────────────────────
export interface DashboardStats {
  totalSales: number;
  todaySales: number;
  totalOrders: number;
  todayOrders: number;
  unfulfilledCount: number;
  memberCount: number;
  todayMemberCount: number;
  publishedCount: number;
  unpublishedCount: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    buyerName: string;
    totalAmount: number;
    paymentStatus: string;
    fulfillmentStatus: string;
    createdAt: string;
  }[];
}

// KST(UTC+9) 기준 "오늘 0시"의 UTC ISO 문자열.
function kstTodayStartISO(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const startUtcMs = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600 * 1000;
  return new Date(startUtcMs).toISOString();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const empty: DashboardStats = {
    totalSales: 0,
    todaySales: 0,
    totalOrders: 0,
    todayOrders: 0,
    unfulfilledCount: 0,
    memberCount: 0,
    todayMemberCount: 0,
    publishedCount: 0,
    unpublishedCount: 0,
    recentOrders: [],
  };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const todayStart = kstTodayStartISO();

    // 매출(결제완료 주문의 total_amount 합) — 소규모 카탈로그 가정, JS 합산
    const { data: paid } = await supabase
      .from("orders")
      .select("total_amount, created_at")
      .eq("payment_status", "paid");
    const paidRows = paid ?? [];
    const totalSales = paidRows.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    // 문자열 비교는 타임존 표기(+00:00 vs Z) 차이로 자정 경계에서 어긋날 수 있어 Date로 비교한다.
    const todayStartMs = new Date(todayStart).getTime();
    const todaySales = paidRows
      .filter((o) => new Date(String(o.created_at)).getTime() >= todayStartMs)
      .reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

    const head = { count: "exact" as const, head: true };
    const [
      totalOrdersRes,
      todayOrdersRes,
      unfulfilledRes,
      memberRes,
      todayMemberRes,
      publishedRes,
      unpublishedRes,
    ] = await Promise.all([
      supabase.from("orders").select("*", head),
      supabase.from("orders").select("*", head).gte("created_at", todayStart),
      supabase.from("orders").select("*", head).eq("payment_status", "paid").eq("fulfillment_status", "unfulfilled"),
      supabase.from("profiles").select("*", head),
      supabase.from("profiles").select("*", head).gte("created_at", todayStart),
      supabase.from("products").select("*", head).eq("is_published", true),
      supabase.from("products").select("*", head).eq("is_published", false),
    ]);
    const totalOrders = totalOrdersRes.count ?? 0;
    const todayOrders = todayOrdersRes.count ?? 0;
    const unfulfilledCount = unfulfilledRes.count ?? 0;
    const memberCount = memberRes.count ?? 0;
    const todayMemberCount = todayMemberRes.count ?? 0;
    const publishedCount = publishedRes.count ?? 0;
    const unpublishedCount = unpublishedRes.count ?? 0;

    const { data: recent } = await supabase
      .from("orders")
      .select("id, order_number, buyer_name, total_amount, payment_status, fulfillment_status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      totalSales,
      todaySales,
      totalOrders,
      todayOrders,
      unfulfilledCount,
      memberCount,
      todayMemberCount,
      publishedCount,
      unpublishedCount,
      recentOrders: (recent ?? []).map((o) => ({
        id: String(o.id),
        orderNumber: String(o.order_number ?? o.id),
        buyerName: String(o.buyer_name ?? "-"),
        totalAmount: Number(o.total_amount ?? 0),
        paymentStatus: String(o.payment_status ?? "ready"),
        fulfillmentStatus: String(o.fulfillment_status ?? "unfulfilled"),
        createdAt: String(o.created_at),
      })),
    };
  } catch {
    return empty;
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
        "id, slug, name, name_ko, category, price, stock, is_published, sale_status, product_variants(id, color_name, option_name, is_active, display_order)"
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
      stock: Number(p.stock ?? 0),
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

// 재고 수정(품절 표시는 stock=0 기준). 음수 방지.
export async function setProductStock(
  productId: string,
  stock: number
): Promise<{ error?: string }> {
  try {
    if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) {
      return { error: "재고 수량이 올바르지 않습니다." };
    }
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase.from("products").update({ stock }).eq("id", productId);
    if (error) {
      logSupabaseError("setProductStock", error);
      return { error: "재고 변경에 실패했습니다." };
    }
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// 카테고리 수정. 빈 값이면 null(미분류)로 저장.
export async function setProductCategory(
  productId: string,
  category: string
): Promise<{ error?: string }> {
  try {
    const value = category.trim();
    if (value.length > 50) return { error: "카테고리명이 너무 깁니다." };
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase
      .from("products")
      .update({ category: value || null })
      .eq("id", productId);
    if (error) {
      logSupabaseError("setProductCategory", error);
      return { error: "카테고리 변경에 실패했습니다." };
    }
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// 상품 삭제. 이미지/옵션/리뷰/위시는 CASCADE로 함께 삭제되고,
// 주문 항목(order_items)은 product_id/variant_id가 SET NULL 되어 주문 이력은 보존된다.
export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      logSupabaseError("deleteProduct", error);
      return { error: "상품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요." };
    }
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// ── 주문 ────────────────────────────────────────────────
const ORDERS_PAGE_SIZE = 50;

export interface AdminOrdersResult {
  orders: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getAdminOrders(filters?: {
  fulfillment?: string;
  payment?: string;
  q?: string;
  page?: number;
}): Promise<AdminOrdersResult> {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = ORDERS_PAGE_SIZE;
  const empty: AdminOrdersResult = { orders: [], total: 0, page, pageSize };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    // 조회 전 일괄 점검(실패해도 목록 조회는 계속 진행):
    //  · 환불 기간(배송완료 +7일) 지난 주문 → 자동 '완료'
    //  · 30분 넘게 방치된 미결제(pending) 주문 → 자동 해제(쿠폰·포인트 복원 + 결제대기 더미 정리)
    try {
      await supabase.rpc("auto_complete_orders");
    } catch {}
    try {
      await supabase.rpc("release_all_stale_pending_orders", { p_minutes: 30 });
    } catch {}

    let query = supabase
      .from("orders")
      .select(
        "id, order_number, buyer_name, recipient_name, total_amount, order_status, payment_status, fulfillment_status, return_status, created_at, attribution, shipping_request, cancelled_by, cancel_reason, order_items(product_name, quantity, price)",
        { count: "exact" }
      );

    if (filters?.fulfillment && FULFILLMENT_VALUES.includes(filters.fulfillment)) {
      query = query.eq("fulfillment_status", filters.fulfillment);
    }
    if (filters?.payment && PAYMENT_FILTER_VALUES.includes(filters.payment)) {
      query = query.eq("payment_status", filters.payment);
    }
    const q = filters?.q?.trim();
    if (q) {
      // 주문번호·주문자·받는분·연락처·이메일 부분 검색 (특수문자는 제거해 or 필터 안전하게)
      const safe = q.replace(/[%,()]/g, "");
      query = query.or(
        `order_number.ilike.%${safe}%,buyer_name.ilike.%${safe}%,recipient_name.ilike.%${safe}%,buyer_phone.ilike.%${safe}%,recipient_phone.ilike.%${safe}%,buyer_email.ilike.%${safe}%`
      );
    }

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error || !data) {
      logSupabaseError("getAdminOrders", error);
      return empty;
    }

    return {
      page,
      pageSize,
      total: count ?? data.length,
      orders: data.map((o) => ({
        id: String(o.id),
        orderNumber: String(o.order_number ?? o.id),
        buyerName: (o.buyer_name as string | null) ?? null,
        recipientName: (o.recipient_name as string | null) ?? null,
        totalAmount: Number(o.total_amount),
        orderStatus: String(o.order_status ?? "pending"),
        paymentStatus: String(o.payment_status ?? "ready"),
        fulfillmentStatus: String(o.fulfillment_status ?? "unfulfilled"),
        returnStatus: o.return_status ? String(o.return_status) : null,
        createdAt: String(o.created_at),
        attribution: toAttribution(o.attribution),
        shippingRequest: o.shipping_request ? String(o.shipping_request) : null,
        cancelledBy: o.cancelled_by ? String(o.cancelled_by) : null,
        cancelReason: o.cancel_reason ? String(o.cancel_reason) : null,
        items: (Array.isArray(o.order_items) ? o.order_items : []).map(
          (i: Record<string, unknown>) => ({
            productName: String(i.product_name ?? ""),
            quantity: Number(i.quantity ?? 0),
            price: Number(i.price ?? 0),
          })
        ),
      })),
    };
  } catch {
    return empty;
  }
}

const FULFILLMENT_VALUES = ["unfulfilled", "preparing", "shipped", "delivered", "returned"];
const ORDER_STATUS_VALUES = ["pending", "confirmed", "cancelled", "completed"];
const PAYMENT_FILTER_VALUES = ["ready", "pending", "paid", "failed", "cancelled", "refunded", "partially_refunded"];

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
      // 취소는 쿠폰 복원이 필요하므로 반드시 cancelOrder()를 거치게 한다(정합성 일원화).
      if (patch.orderStatus === "cancelled") {
        return { error: "주문 취소는 '주문 취소' 기능을 사용해 주세요." };
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

// ── 주문 상세 · 송장 · 취소 (P1-B) ──────────────────────
export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  createdAt: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  shippingRequest: string;
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  courier: string;
  trackingNumber: string;
  couponName: string | null;
  returnStatus: string | null;
  returnReason: string;
  returnRequestedAt: string;
  cancelledBy: string | null;
  cancelReason: string;
  attribution: Attribution | null;
  items: { productName: string; variantLabel: string; quantity: number; price: number }[];
}

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(product_name, variant_label, quantity, price)")
      .eq("id", id)
      .single();
    if (error || !data) {
      logSupabaseError("getAdminOrderDetail", error);
      return null;
    }
    const d = data as Record<string, unknown>;

    // 사용된 쿠폰 이름(있으면)
    let couponName: string | null = null;
    const { data: uc } = await supabase
      .from("user_coupons")
      .select("coupons(name)")
      .eq("used_order_id", id)
      .maybeSingle();
    if (uc) {
      const raw = (uc as { coupons?: unknown }).coupons as unknown;
      const c = (Array.isArray(raw) ? raw[0] : raw) as { name?: string } | undefined;
      couponName = c?.name ?? null;
    }

    return {
      id: s(d.id),
      orderNumber: s(d.order_number),
      createdAt: s(d.created_at),
      buyerName: s(d.buyer_name),
      buyerEmail: s(d.buyer_email),
      buyerPhone: s(d.buyer_phone),
      recipientName: s(d.recipient_name),
      recipientPhone: s(d.recipient_phone),
      postalCode: s(d.postal_code),
      addressLine1: s(d.address_line1),
      addressLine2: s(d.address_line2),
      shippingRequest: s(d.shipping_request),
      subtotalAmount: Number(d.subtotal_amount ?? 0),
      discountAmount: Number(d.discount_amount ?? 0),
      shippingFee: Number(d.shipping_fee ?? 0),
      totalAmount: Number(d.total_amount ?? 0),
      orderStatus: s(d.order_status) || "pending",
      paymentStatus: s(d.payment_status) || "ready",
      fulfillmentStatus: s(d.fulfillment_status) || "unfulfilled",
      courier: s(d.courier),
      trackingNumber: s(d.tracking_number),
      couponName,
      returnStatus: d.return_status ? s(d.return_status) : null,
      returnReason: s(d.return_reason),
      returnRequestedAt: s(d.return_requested_at),
      cancelledBy: d.cancelled_by ? s(d.cancelled_by) : null,
      cancelReason: s(d.cancel_reason),
      attribution: toAttribution(d.attribution),
      items: (Array.isArray(d.order_items) ? (d.order_items as Record<string, unknown>[]) : []).map((i) => ({
        productName: s(i.product_name),
        variantLabel: s(i.variant_label),
        quantity: Number(i.quantity ?? 0),
        price: Number(i.price ?? 0),
      })),
    };
  } catch {
    return null;
  }
}

export async function setOrderTracking(
  id: string,
  courier: string,
  trackingNumber: string
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const update: Record<string, string | null> = {
      courier: courier.trim() || null,
      tracking_number: trackingNumber.trim() || null,
    };
    // 송장 입력 시 배송중으로 자동 전환(아직 미처리/준비 상태였다면)
    const hasTracking = !!courier.trim() && !!trackingNumber.trim();
    const { data: cur } = await supabase.from("orders").select("fulfillment_status").eq("id", id).single();
    if (hasTracking && cur && ["unfulfilled", "preparing"].includes(String(cur.fulfillment_status))) {
      update.fulfillment_status = "shipped";
    }
    const { error } = await supabase.from("orders").update(update).eq("id", id);
    if (error) {
      logSupabaseError("setOrderTracking", error);
      return { error: "송장 저장에 실패했습니다." };
    }
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// 단건 취소 핵심 로직(권한 확인·revalidate 제외) — 단건/일괄 취소가 공유한다.
// 결제 완료 건은 토스 환불을 선 처리한 뒤 상태 취소(환불 실패 시 취소하지 않아
// '취소됐는데 환불 안 됨' 정합성 깨짐을 방지). 미결제 건은 상태 취소만. + 쿠폰 복원.
async function cancelOrderCore(
  supabase: SupabaseClient,
  id: string
): Promise<{ error?: string }> {
  const { data: cur } = await supabase
    .from("orders")
    .select("order_status, payment_status")
    .eq("id", id)
    .single();
  if (!cur) return { error: "주문을 찾을 수 없습니다." };
  // 이미 취소된 주문은 재취소하지 않는다(쿠폰 이중 복원 방지).
  if (cur.order_status === "cancelled") {
    return { error: "이미 취소된 주문입니다." };
  }

  // 결제 완료 건은 토스 환불을 선 처리한다. 성공해야 상태를 취소로 바꾼다.
  let nextPaymentStatus = "cancelled";
  if (cur.payment_status === "paid") {
    const { data: pay } = await supabase
      .from("payments")
      .select("payment_key")
      .eq("order_id", id)
      .not("payment_key", "is", null)
      .maybeSingle();
    if (!pay?.payment_key) {
      return { error: "결제키를 찾을 수 없어 환불할 수 없습니다. 고객센터 확인이 필요합니다." };
    }
    try {
      const { cancelTossPayment } = await import("@/lib/toss");
      await cancelTossPayment(String(pay.payment_key), "관리자 주문 취소");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "환불 처리에 실패했습니다." };
    }
    nextPaymentStatus = "refunded";
  }

  const { error } = await supabase
    .from("orders")
    .update({
      order_status: "cancelled",
      payment_status: nextPaymentStatus,
      cancelled_by: "admin",
      cancel_reason: "관리자 취소",
    })
    .eq("id", id);
  if (error) {
    logSupabaseError("cancelOrder", error);
    return { error: "주문 취소에 실패했습니다." };
  }

  // 사용된 쿠폰 복원(있으면 다시 사용 가능하도록).
  await supabase
    .from("user_coupons")
    .update({ status: "active", used_at: null, used_order_id: null })
    .eq("used_order_id", id);

  // 사용된 포인트 복원(이중 복원 방지는 RPC 내부에서 처리).
  await supabase.rpc("restore_order_points", { p_order_id: id });

  return {};
}

export async function cancelOrder(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const res = await cancelOrderCore(supabase, id);
    if (res.error) return res;

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

export interface BulkCancelResult {
  cancelled: number;
  failed: { id: string; error: string }[];
  error?: string;
}

// 여러 주문을 한 번에 취소한다(관리자 선택/일괄 취소). 각 건은 단건 취소와
// 동일하게 상태 취소 + 쿠폰 복원으로 처리되며, 일부 실패해도 나머지는 계속 진행한다.
export async function bulkCancelOrders(ids: string[]): Promise<BulkCancelResult> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const unique = Array.from(new Set(ids.filter((v) => typeof v === "string" && v)));
    if (unique.length === 0) return { cancelled: 0, failed: [], error: "선택된 주문이 없습니다." };
    if (unique.length > 100) return { cancelled: 0, failed: [], error: "한 번에 최대 100건까지 취소할 수 있습니다." };

    let cancelled = 0;
    const failed: { id: string; error: string }[] = [];
    // 결제/쿠폰 정합성을 위해 순차 처리한다.
    for (const id of unique) {
      const res = await cancelOrderCore(supabase, id);
      if (res.error) failed.push({ id, error: res.error });
      else cancelled++;
    }

    revalidatePath("/admin/orders");
    return { cancelled, failed };
  } catch (e) {
    return { cancelled: 0, failed: [], error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// ── 반품 승인/반려 (PC3) ────────────────────────────────
export async function approveReturn(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const { data: order } = await supabase
      .from("orders")
      .select("return_status, order_status")
      .eq("id", id)
      .single();
    if (!order) return { error: "주문을 찾을 수 없습니다." };
    if (order.return_status !== "requested") return { error: "반품 신청 상태가 아닙니다." };
    if (order.order_status === "cancelled") return { error: "이미 취소된 주문입니다." };

    const { data: pay } = await supabase
      .from("payments")
      .select("payment_key")
      .eq("order_id", id)
      .not("payment_key", "is", null)
      .maybeSingle();
    if (!pay?.payment_key) return { error: "결제 정보를 찾을 수 없습니다." };

    const { cancelTossPayment } = await import("@/lib/toss");
    await cancelTossPayment(String(pay.payment_key), "반품 승인 환불");

    const { error } = await supabase
      .from("orders")
      .update({
        order_status: "cancelled",
        payment_status: "refunded",
        fulfillment_status: "returned",
        return_status: "approved",
        cancelled_by: "admin",
        cancel_reason: "반품 승인",
      })
      .eq("id", id);
    if (error) {
      logSupabaseError("approveReturn", error);
      return { error: "반품 승인 반영에 실패했습니다." };
    }

    // 사용된 쿠폰 복원
    await supabase
      .from("user_coupons")
      .update({ status: "active", used_at: null, used_order_id: null })
      .eq("used_order_id", id);

    // 사용된 포인트 복원
    await supabase.rpc("restore_order_points", { p_order_id: id });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

export async function rejectReturn(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase
      .from("orders")
      .update({ return_status: "rejected" })
      .eq("id", id);
    if (error) {
      logSupabaseError("rejectReturn", error);
      return { error: "처리에 실패했습니다." };
    }
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// ── 회원 관리 (P1-C) ────────────────────────────────────
export interface AdminMember {
  id: string;
  email: string;
  name: string;
  phone: string;
  marketingAgreed: boolean;
  role: string;
  createdAt: string;
  deactivatedAt: string | null;
  orderCount: number;
  totalSpent: number;
}

const MEMBERS_PAGE_SIZE = 50;

export interface AdminMembersResult {
  members: AdminMember[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getAdminMembers(filters?: {
  q?: string;
  page?: number;
}): Promise<AdminMembersResult> {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = MEMBERS_PAGE_SIZE;
  const empty: AdminMembersResult = { members: [], total: 0, page, pageSize };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { data, error } = await supabase.rpc("admin_list_members", {
      p_q: filters?.q?.trim() || null,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    });
    if (error) {
      logSupabaseError("getAdminMembers", error);
      return empty;
    }
    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    const total = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;
    return {
      page,
      pageSize,
      total,
      members: rows.map((m) => ({
        id: s(m.id),
        email: s(m.email),
        name: s(m.name),
        phone: s(m.phone),
        marketingAgreed: !!m.marketing_agreed,
        role: s(m.role) || "user",
        createdAt: s(m.created_at),
        deactivatedAt: m.deactivated_at ? s(m.deactivated_at) : null,
        orderCount: Number(m.order_count ?? 0),
        totalSpent: Number(m.total_spent ?? 0),
      })),
    };
  } catch {
    return empty;
  }
}

export interface AdminMemberDetail {
  id: string;
  email: string;
  name: string;
  phone: string;
  birthday: string;
  marketingAgreed: boolean;
  role: string;
  createdAt: string;
  deactivatedAt: string | null;
  points: number;
  adminNote: string;
  orders: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    paymentStatus: string;
    fulfillmentStatus: string;
    createdAt: string;
  }[];
  coupons: {
    id: string;
    name: string;
    status: string;
    expiresAt: string | null;
  }[];
}

export async function getAdminMemberDetail(id: string): Promise<AdminMemberDetail | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const { data: rows, error } = await supabase.rpc("admin_get_member", { p_id: id });
    const m = (Array.isArray(rows) ? rows[0] : rows) as Record<string, unknown> | undefined;
    if (error || !m) {
      logSupabaseError("getAdminMemberDetail", error);
      return null;
    }

    const { data: orderRows } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, payment_status, fulfillment_status, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    const { data: couponRows } = await supabase
      .from("user_coupons")
      .select("id, status, expires_at, coupons(name)")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    return {
      id: s(m.id),
      email: s(m.email),
      name: s(m.name),
      phone: s(m.phone),
      birthday: s(m.birthday),
      deactivatedAt: m.deactivated_at ? s(m.deactivated_at) : null,
      points: Number(m.points ?? 0),
      adminNote: s(m.admin_note),
      marketingAgreed: !!m.marketing_agreed,
      role: s(m.role) || "user",
      createdAt: s(m.created_at),
      orders: (Array.isArray(orderRows) ? orderRows : []).map((o: Record<string, unknown>) => ({
        id: s(o.id),
        orderNumber: s(o.order_number),
        totalAmount: Number(o.total_amount ?? 0),
        paymentStatus: s(o.payment_status) || "ready",
        fulfillmentStatus: s(o.fulfillment_status) || "unfulfilled",
        createdAt: s(o.created_at),
      })),
      coupons: (Array.isArray(couponRows) ? couponRows : []).map((c: Record<string, unknown>) => {
        const raw = c.coupons as unknown;
        const co = (Array.isArray(raw) ? raw[0] : raw) as { name?: string } | undefined;
        return {
          id: s(c.id),
          name: co?.name ?? "쿠폰",
          status: s(c.status) || "active",
          expiresAt: c.expires_at ? s(c.expires_at) : null,
        };
      }),
    };
  } catch {
    return null;
  }
}

// 관리자: 회원 소프트 탈퇴/복구 (PC5)
export async function adminSetMemberDeactivated(
  userId: string,
  deactivated: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase.rpc("set_account_deactivated", {
      p_user_id: userId,
      p_deactivated: deactivated,
    });
    if (error) {
      logSupabaseError("adminSetMemberDeactivated", error);
      return { error: "처리에 실패했습니다." };
    }
    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${userId}`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// 관리자: 회원 영구삭제(auth.users 행 삭제). 되돌릴 수 없음.
// 프로필/장바구니/리뷰/찜/쿠폰/적립금 내역은 함께 삭제되고, 주문 기록은 보존(연결 해제)된다.
// 같은 이메일로 재가입이 가능해진다. 관리자·본인 계정은 RPC에서 차단한다.
export async function purgeMember(userId: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase.rpc("admin_purge_member", { p_user_id: userId });
    if (error) {
      logSupabaseError("purgeMember", error);
      // RPC가 올린 한국어 메시지(권한/본인/관리자/대상없음)는 그대로 노출.
      return { error: error.message || "영구삭제에 실패했습니다." };
    }
    revalidatePath("/admin/members");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// 적립금 수동 조정(+지급/-차감, 사유 기록). 성공 시 변경된 잔액 반환.
export async function adminAdjustPoints(
  userId: string,
  amount: number,
  reason: string
): Promise<{ error?: string; balance?: number }> {
  try {
    if (!Number.isInteger(amount) || amount === 0) {
      return { error: "조정할 포인트(0이 아닌 정수)를 입력해주세요." };
    }
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { data, error } = await supabase.rpc("admin_adjust_points", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
    });
    if (error) {
      const msg = error.message.includes(":") ? error.message.split(":").pop()!.trim() : error.message;
      return { error: msg || "적립금 조정에 실패했습니다." };
    }
    revalidatePath(`/admin/members/${userId}`);
    return { balance: Number(data ?? 0) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// 회원별 관리자 메모 저장.
export async function adminSetMemberNote(userId: string, note: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase.rpc("admin_set_member_note", { p_user_id: userId, p_note: note });
    if (error) {
      logSupabaseError("adminSetMemberNote", error);
      return { error: "메모 저장에 실패했습니다." };
    }
    revalidatePath(`/admin/members/${userId}`);
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
export interface AdminProductImage {
  id: string;
  role: string;
  imageUrl: string;
  altText: string;
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
  productImages: AdminProductImage[];
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
      .select("*, product_variants(*), product_images(*)")
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
      productImages: (Array.isArray(d.product_images) ? (d.product_images as Record<string, unknown>[]) : [])
        .slice()
        .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0))
        .map((img) => ({
          id: s(img.id),
          role: s(img.role),
          imageUrl: s(img.image_url),
          altText: s(img.alt_text),
          displayOrder: Number(img.display_order ?? 0),
        })),
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

export type ProductUpdateInput = Omit<AdminProductDetail, "id" | "variants" | "productImages">;

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

// ── 상품 이미지 (product_images 테이블 · role별) ─────────
const IMAGE_ROLES = ["hero", "gallery", "detail", "story", "material_detail", "color_section"];
// hero/story/material_detail/color_section은 상품당 1장(교체), gallery/detail은 여러 장.
const SINGLE_ROLES = new Set(["hero", "story", "material_detail", "color_section"]);

export async function addProductImage(
  productId: string,
  role: string,
  imageUrl: string,
  altText = ""
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    if (!IMAGE_ROLES.includes(role)) return { error: "잘못된 이미지 역할입니다." };
    if (!imageUrl.trim()) return { error: "이미지 URL이 비어 있습니다." };

    if (SINGLE_ROLES.has(role)) {
      // 이미 있으면 교체(update), 없으면 삽입
      const { data: existing } = await supabase
        .from("product_images")
        .select("id")
        .eq("product_id", productId)
        .eq("role", role)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("product_images")
          .update({ image_url: imageUrl.trim(), alt_text: altText || null })
          .eq("id", existing.id);
        if (error) {
          logSupabaseError("addProductImage(update)", error);
          return { error: "이미지 저장에 실패했습니다." };
        }
        revalidatePath(`/admin/products/${productId}`);
        revalidatePath("/shop");
        return {};
      }
    }

    // 다음 display_order 계산
    const { data: rows } = await supabase
      .from("product_images")
      .select("display_order")
      .eq("product_id", productId)
      .eq("role", role)
      .order("display_order", { ascending: false })
      .limit(1);
    const nextOrder = rows && rows[0] ? Number(rows[0].display_order) + 1 : 0;

    const { error } = await supabase.from("product_images").insert({
      product_id: productId,
      role,
      image_url: imageUrl.trim(),
      alt_text: altText || null,
      display_order: nextOrder,
    });
    if (error) {
      logSupabaseError("addProductImage(insert)", error);
      return { error: "이미지 추가에 실패했습니다." };
    }
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/shop");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

export async function deleteProductImage(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase.from("product_images").delete().eq("id", id);
    if (error) {
      logSupabaseError("deleteProductImage", error);
      return { error: "이미지 삭제에 실패했습니다." };
    }
    revalidatePath("/shop");
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

// ── 쿠폰 관리 (C3) ──────────────────────────────────────
export interface AdminCoupon {
  id: string;
  code: string;
  name: string;
  discountType: string; // 'percent' | 'amount'
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  validDays: number | null;
  isActive: boolean;
  codeRedeemable: boolean;
  stackable: boolean;
  endsAt: string | null;
  autoIssueOnSignup: boolean;
  issuedCount: number;
}

export interface CouponInput {
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  validDays: number | null;
  isActive: boolean;
  codeRedeemable: boolean;
  stackable: boolean;
  endsAt: string | null;
  autoIssueOnSignup: boolean;
}

const COUPON_CODE_REGEX = /^[A-Z0-9]{2,40}$/;

function validateCoupon(input: CouponInput): string | null {
  if (!COUPON_CODE_REGEX.test(input.code)) return "코드는 영문 대문자·숫자 2~40자여야 합니다.";
  if (!input.name.trim()) return "쿠폰 이름은 필수입니다.";
  if (input.discountType !== "percent" && input.discountType !== "amount") return "할인 방식이 올바르지 않습니다.";
  if (!Number.isFinite(input.discountValue) || input.discountValue < 0) return "할인값이 올바르지 않습니다.";
  if (input.discountType === "percent" && input.discountValue > 100) return "정률 할인은 100%를 넘을 수 없습니다.";
  if (!Number.isFinite(input.minOrderAmount) || input.minOrderAmount < 0) return "최소 주문금액이 올바르지 않습니다.";
  if (input.maxDiscountAmount != null && (!Number.isFinite(input.maxDiscountAmount) || input.maxDiscountAmount < 0))
    return "최대 할인액이 올바르지 않습니다.";
  if (input.validDays != null && (!Number.isInteger(input.validDays) || input.validDays < 0))
    return "유효일수가 올바르지 않습니다.";
  if (input.endsAt != null && input.endsAt.trim() !== "" && Number.isNaN(new Date(toEndsAtISO(input.endsAt)!).getTime()))
    return "이벤트 종료일이 올바르지 않습니다.";
  return null;
}

function couponRow(input: CouponInput) {
  return {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    discount_type: input.discountType,
    discount_value: Math.round(input.discountValue),
    min_order_amount: Math.round(input.minOrderAmount),
    max_discount_amount: input.maxDiscountAmount == null ? null : Math.round(input.maxDiscountAmount),
    valid_days: input.validDays == null ? null : Math.round(input.validDays),
    is_active: input.isActive,
    code_redeemable: input.codeRedeemable,
    stackable: input.stackable,
    ends_at: toEndsAtISO(input.endsAt),
    auto_issue_on_signup: input.autoIssueOnSignup,
  };
}

// 종료일: 날짜만(YYYY-MM-DD) 입력 시 해당 날짜의 끝(KST 23:59:59)으로 저장. 비우면 null.
function toEndsAtISO(v: string | null): string | null {
  if (!v) return null;
  const sv = v.trim();
  if (!sv) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(sv)) return `${sv}T23:59:59+09:00`;
  return sv;
}

export async function getAdminCoupons(): Promise<AdminCoupon[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: true });
    if (error || !data) {
      logSupabaseError("getAdminCoupons", error);
      return [];
    }

    const result: AdminCoupon[] = [];
    for (const c of data) {
      const { count } = await supabase
        .from("user_coupons")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", c.id);
      result.push({
        id: String(c.id),
        code: String(c.code),
        name: String(c.name),
        discountType: String(c.discount_type),
        discountValue: Number(c.discount_value),
        minOrderAmount: Number(c.min_order_amount ?? 0),
        maxDiscountAmount: c.max_discount_amount == null ? null : Number(c.max_discount_amount),
        validDays: c.valid_days == null ? null : Number(c.valid_days),
        isActive: Boolean(c.is_active),
        codeRedeemable: Boolean(c.code_redeemable),
        stackable: Boolean(c.stackable),
        endsAt: c.ends_at ? String(c.ends_at) : null,
        autoIssueOnSignup: Boolean(c.auto_issue_on_signup),
        issuedCount: count ?? 0,
      });
    }
    return result;
  } catch {
    return [];
  }
}

export async function createCoupon(input: CouponInput): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const err = validateCoupon(input);
    if (err) return { error: err };
    const { error } = await supabase.from("coupons").insert(couponRow(input));
    if (error) {
      logSupabaseError("createCoupon", error);
      if (error.code === "23505") return { error: "이미 사용 중인 코드입니다." };
      return { error: "쿠폰 생성에 실패했습니다." };
    }
    revalidatePath("/admin/coupons");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

export async function updateCoupon(id: string, input: CouponInput): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const err = validateCoupon(input);
    if (err) return { error: err };
    const { error } = await supabase.from("coupons").update(couponRow(input)).eq("id", id);
    if (error) {
      logSupabaseError("updateCoupon", error);
      if (error.code === "23505") return { error: "이미 사용 중인 코드입니다." };
      return { error: "쿠폰 저장에 실패했습니다." };
    }
    revalidatePath("/admin/coupons");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// ── 리뷰 관리 (Phase 2-A) ───────────────────────────────────
export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  userName: string;
  rating: number;
  content: string;
  createdAt: string;
}

const REVIEWS_PAGE_SIZE = 50;

export interface AdminReviewsResult {
  reviews: AdminReview[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getAdminReviews(filters?: {
  page?: number;
  productId?: string;
}): Promise<AdminReviewsResult> {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = REVIEWS_PAGE_SIZE;
  const empty: AdminReviewsResult = { reviews: [], total: 0, page, pageSize };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    let query = supabase
      .from("reviews")
      .select("id, product_id, rating, content, created_at, products(name, slug), profiles(name)", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filters?.productId) query = query.eq("product_id", filters.productId);

    const { data, error, count } = await query;
    if (error) {
      logSupabaseError("getAdminReviews", error);
      return empty;
    }
    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    return {
      page,
      pageSize,
      total: count ?? rows.length,
      reviews: rows.map((r) => {
        const product = (r.products ?? {}) as { name?: string; slug?: string };
        const profile = (r.profiles ?? {}) as { name?: string };
        return {
          id: s(r.id),
          productId: s(r.product_id),
          productName: s(product.name) || "(삭제된 상품)",
          productSlug: s(product.slug),
          userName: s(profile.name) || "익명",
          rating: Number(r.rating ?? 0),
          content: s(r.content),
          createdAt: s(r.created_at),
        };
      }),
    };
  } catch {
    return empty;
  }
}

export async function adminDeleteReview(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { error } = await supabase.rpc("admin_delete_review", { p_review_id: id });
    if (error) {
      logSupabaseError("adminDeleteReview", error);
      return { error: "리뷰 삭제에 실패했습니다." };
    }
    revalidatePath("/admin/reviews");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// ── 통계 (Phase 2-C) ────────────────────────────────────────
export interface SalesStats {
  days: number;
  totalSales: number;
  orderCount: number;
  avgOrder: number;
  newMembers: number;
  daily: { label: string; sales: number; orders: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
}

// KST 기준 날짜키(YYYY-MM-DD).
function kstDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export async function getSalesStats(days: number = 30): Promise<SalesStats> {
  const period = days === 7 ? 7 : 30; // 허용값만
  const empty: SalesStats = {
    days: period, totalSales: 0, orderCount: 0, avgOrder: 0, newMembers: 0, daily: [], topProducts: [],
  };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    // 기간 시작(KST 자정 기준 period-1일 전)
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 3600 * 1000);
    const todayStartUtcMs =
      Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600 * 1000;
    const startUtcMs = todayStartUtcMs - (period - 1) * 86400000;
    const startISO = new Date(startUtcMs).toISOString();

    // 결제완료 주문(기간)
    const { data: paid } = await supabase
      .from("orders")
      .select("total_amount, created_at")
      .eq("payment_status", "paid")
      .gte("created_at", startISO);
    const rows = paid ?? [];
    const totalSales = rows.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const orderCount = rows.length;
    const avgOrder = orderCount ? Math.round(totalSales / orderCount) : 0;

    // 일별 버킷 초기화(연속된 날짜)
    const buckets = new Map<string, { sales: number; orders: number }>();
    const order: string[] = [];
    for (let i = 0; i < period; i++) {
      const key = kstDateKey(new Date(startUtcMs + i * 86400000).toISOString());
      buckets.set(key, { sales: 0, orders: 0 });
      order.push(key);
    }
    for (const o of rows) {
      const key = kstDateKey(String(o.created_at));
      const b = buckets.get(key);
      if (b) {
        b.sales += Number(o.total_amount ?? 0);
        b.orders += 1;
      }
    }
    const daily = order.map((key) => {
      const [, m, d] = key.split("-");
      return { label: `${m}/${d}`, sales: buckets.get(key)!.sales, orders: buckets.get(key)!.orders };
    });

    // 신규 회원(기간)
    const { count: newMembers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO);

    // 인기 상품(기간 내 결제완료 주문의 품목 집계)
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity, price, orders!inner(payment_status, created_at)")
      .eq("orders.payment_status", "paid")
      .gte("orders.created_at", startISO);
    const prodMap = new Map<string, { qty: number; revenue: number }>();
    for (const it of items ?? []) {
      const name = String((it as Record<string, unknown>).product_name ?? "-");
      const qty = Number((it as Record<string, unknown>).quantity ?? 0);
      const price = Number((it as Record<string, unknown>).price ?? 0);
      const cur = prodMap.get(name) ?? { qty: 0, revenue: 0 };
      cur.qty += qty;
      cur.revenue += price * qty;
      prodMap.set(name, cur);
    }
    const topProducts = Array.from(prodMap.entries())
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

    return { days: period, totalSales, orderCount, avgOrder, newMembers: newMembers ?? 0, daily, topProducts };
  } catch {
    return empty;
  }
}

// ── 사이트 콘텐츠(팝업/공지바) 관리 (Phase 3-A) ─────────────
// 날짜 입력(datetime-local 'YYYY-MM-DDTHH:mm' 또는 빈값)을 ISO(KST)로.
function toTsOrNull(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  // 'YYYY-MM-DDTHH:mm' → KST로 간주
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00+09:00`;
  return s;
}

export async function updateSiteSettings(input: SiteSettings): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    const marquee = (Array.isArray(input.marqueeItems) ? input.marqueeItems : [])
      .map((i) => ({
        text: String(i.text ?? "").slice(0, 200),
        href: String(i.href ?? "").slice(0, 500),
        action: i.action === "signup" ? "signup" : null,
      }))
      .filter((i) => i.text.trim().length > 0)
      .slice(0, 10);

    // 배송비: 0 이상 정수로 정규화(음수·소수·NaN 방어). 상한도 둔다(오입력 방지).
    const clampFee = (v: unknown, fallback: number) => {
      const n = Math.round(Number(v));
      if (!Number.isFinite(n) || n < 0) return fallback;
      return Math.min(n, 100_000_000);
    };

    const { error } = await supabase
      .from("site_settings")
      .update({
        marquee_items: marquee,
        popup_enabled: !!input.popupEnabled,
        popup_title: input.popupTitle?.slice(0, 200) || null,
        popup_body: input.popupBody?.slice(0, 2000) || null,
        popup_image_url: input.popupImageUrl?.slice(0, 1000) || null,
        popup_link_url: input.popupLinkUrl?.slice(0, 1000) || null,
        popup_link_label: input.popupLinkLabel?.slice(0, 100) || null,
        popup_starts_at: toTsOrNull(input.popupStartsAt),
        popup_ends_at: toTsOrNull(input.popupEndsAt),
        free_shipping_threshold: clampFee(input.freeShippingThreshold, 50000),
        shipping_base_fee: clampFee(input.shippingBaseFee, 3000),
        shipping_remote_fee: clampFee(input.shippingRemoteFee, 6000),
      })
      .eq("id", "default");

    if (error) {
      logSupabaseError("updateSiteSettings", error);
      return { error: "저장에 실패했습니다." };
    }
    // 사이트 전역에 반영(레이아웃에서 읽음).
    revalidatePath("/", "layout");
    revalidatePath("/admin/content");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}
