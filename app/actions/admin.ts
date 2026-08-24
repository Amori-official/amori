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
    const todaySales = paidRows
      .filter((o) => String(o.created_at) >= todayStart)
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
export async function getAdminOrders(filters?: {
  fulfillment?: string;
  q?: string;
}): Promise<AdminOrder[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    let query = supabase
      .from("orders")
      .select(
        "id, order_number, buyer_name, recipient_name, total_amount, order_status, payment_status, fulfillment_status, created_at, order_items(product_name, quantity, price)"
      );

    if (filters?.fulfillment && FULFILLMENT_VALUES.includes(filters.fulfillment)) {
      query = query.eq("fulfillment_status", filters.fulfillment);
    }
    const q = filters?.q?.trim();
    if (q) {
      // 주문번호·주문자·받는분 부분 검색 (특수문자는 제거해 or 필터 안전하게)
      const safe = q.replace(/[%,()]/g, "");
      query = query.or(
        `order_number.ilike.%${safe}%,buyer_name.ilike.%${safe}%,recipient_name.ilike.%${safe}%`
      );
    }

    const { data, error } = await query.order("created_at", { ascending: false });

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

export async function cancelOrder(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);

    // 주문 취소(상태만 — 실제 결제 취소/환불은 PG 연동 후 별도 처리 필요).
    const { error } = await supabase
      .from("orders")
      .update({ order_status: "cancelled", payment_status: "cancelled" })
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
  orderCount: number;
  totalSpent: number;
}

export async function getAdminMembers(q?: string): Promise<AdminMember[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createServerSideClient();
    await requireAdmin(supabase);
    const { data, error } = await supabase.rpc("admin_list_members", {
      p_q: q?.trim() || null,
    });
    if (error) {
      logSupabaseError("getAdminMembers", error);
      return [];
    }
    return (Array.isArray(data) ? data : []).map((m: Record<string, unknown>) => ({
      id: s(m.id),
      email: s(m.email),
      name: s(m.name),
      phone: s(m.phone),
      marketingAgreed: !!m.marketing_agreed,
      role: s(m.role) || "user",
      createdAt: s(m.created_at),
      orderCount: Number(m.order_count ?? 0),
      totalSpent: Number(m.total_spent ?? 0),
    }));
  } catch {
    return [];
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
  };
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
