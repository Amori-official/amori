"use server";

import type { Order, ShippingAddress } from "@/lib/types";
import type { PointTransaction } from "@/lib/points";
import { revalidatePath } from "next/cache";

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http");

/**
 * 신 스키마의 3개 상태(order_status/payment_status/fulfillment_status)를
 * UI가 사용하는 단일 표시 상태로 파생한다. 우선순위: 취소 > 배송완료 > 배송중 >
 * 결제완료 > 그 외(결제 대기).
 */
function deriveOrderStatus(
  orderStatus: string,
  paymentStatus: string,
  fulfillmentStatus: string
): Order["status"] {
  if (orderStatus === "cancelled") return "cancelled";
  if (fulfillmentStatus === "delivered") return "delivered";
  if (fulfillmentStatus === "preparing" || fulfillmentStatus === "shipped") return "shipped";
  if (paymentStatus === "paid") return "paid";
  return "pending";
}

// ── 주문 내역 ──────────────────────────────────────────────
export async function getOrders(): Promise<Order[]> {
  if (!IS_CONFIGURED) return [];

  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 본인 주문만 조회된다(orders RLS: auth.uid() = user_id).
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, total_amount, order_status, payment_status, fulfillment_status, return_status, courier, tracking_number, shipping_address, created_at, order_items(*)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((o) => ({
      // 표시용 주문번호는 사람이 읽는 order_number(ORD…)를 사용한다(완료 페이지와 일치).
      id: String(o.order_number ?? o.id),
      orderId: String(o.id),
      fulfillmentStatus: String(o.fulfillment_status ?? "unfulfilled"),
      paymentStatus: String(o.payment_status ?? "pending"),
      returnStatus: o.return_status ? String(o.return_status) : null,
      courier: o.courier ? String(o.courier) : null,
      trackingNumber: o.tracking_number ? String(o.tracking_number) : null,
      userId: String(user.id),
      items: Array.isArray(o.order_items)
        ? o.order_items.map((i: Record<string, unknown>) => ({
            productId: String(i.product_id),
            productName: String(i.product_name),
            quantity: Number(i.quantity),
            price: Number(i.price),
          }))
        : [],
      totalAmount: Number(o.total_amount),
      status: deriveOrderStatus(
        String(o.order_status ?? ""),
        String(o.payment_status ?? ""),
        String(o.fulfillment_status ?? "")
      ),
      shippingAddress: o.shipping_address as ShippingAddress,
      createdAt: String(o.created_at),
    }));
  } catch {
    return [];
  }
}

// ── 적립금(포인트) ──────────────────────────────────────────
// 내 적립금 잔액.
export async function getMyPoints(): Promise<number> {
  if (!IS_CONFIGURED) return 0;
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data } = await supabase.from("profiles").select("points").eq("id", user.id).maybeSingle();
    return Number(data?.points ?? 0);
  } catch {
    return 0;
  }
}

// 내 적립금 내역.
export async function getPointHistory(): Promise<PointTransaction[]> {
  if (!IS_CONFIGURED) return [];
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("point_transactions")
      .select("id, amount, balance_after, type, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []).map((t) => ({
      id: String(t.id),
      amount: Number(t.amount),
      balanceAfter: Number(t.balance_after),
      type: String(t.type),
      reason: t.reason ? String(t.reason) : null,
      createdAt: String(t.created_at),
    }));
  } catch {
    return [];
  }
}

// ── 리뷰 작성 (1b) ──────────────────────────────────────────
// 내가 이미 리뷰를 작성한 상품 id 목록(주문내역에서 '작성 완료' 표시용).
export async function getReviewedProductIds(): Promise<string[]> {
  if (!IS_CONFIGURED) return [];
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from("reviews").select("product_id").eq("user_id", user.id);
    return (data ?? []).map((r) => String(r.product_id));
  } catch {
    return [];
  }
}

// 배송완료 주문의 상품에 리뷰 작성. 구매 검증·중복 방지·평점 집계는 create_review RPC가 수행.
export async function createReview(input: {
  productId: string;
  orderId: string;
  rating: number;
  content: string;
}): Promise<{ error?: string }> {
  if (!IS_CONFIGURED) return { error: "사용할 수 없습니다." };
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "로그인이 필요합니다." };

    const { error } = await supabase.rpc("create_review", {
      p_product_id: input.productId,
      p_order_id: input.orderId,
      p_rating: input.rating,
      p_content: input.content,
    });
    if (error) {
      // RPC가 raise한 한글 메시지를 그대로 전달(마지막 세그먼트만).
      const msg = error.message.includes(":")
        ? error.message.split(":").pop()!.trim()
        : error.message;
      return { error: msg || "리뷰 작성에 실패했습니다." };
    }
    revalidatePath("/account/orders");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "리뷰 작성 중 오류가 발생했습니다." };
  }
}

// 결제 실패/취소 시, 방금 만든 미결제 주문을 해제하고 쿠폰·적립금을 복원한다.
// (재시도가 깨지지 않도록) — 로그인 사용자만 의미 있음(게스트는 복원할 것 없음).
export async function releaseMyPendingOrder(orderNumber: string): Promise<{ error?: string }> {
  if (!IS_CONFIGURED) return {};
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", orderNumber)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!order) return {};
    const { error } = await supabase.rpc("release_pending_order", { p_order_id: order.id });
    if (error) return { error: "주문 해제에 실패했습니다." };
    revalidatePath("/account/orders");
    return {};
  } catch {
    return {};
  }
}

// ── 고객 자가 취소 / 반품 (PC3) ────────────────────────────
// 취소(배송 준비 전): Toss 환불 선 처리 → cancel_my_order RPC로 상태/쿠폰 반영.
export async function cancelMyOrder(orderId: string): Promise<{ error?: string }> {
  if (!IS_CONFIGURED) return { error: "사용할 수 없습니다." };
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "로그인이 필요합니다." };

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, buyer_name, total_amount, payment_status, fulfillment_status, order_status")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!order) return { error: "주문을 찾을 수 없습니다." };
    if (order.order_status === "cancelled") return { error: "이미 취소된 주문입니다." };
    if (order.payment_status !== "paid") return { error: "취소할 수 없는 상태입니다." };
    if (order.fulfillment_status !== "unfulfilled") {
      return { error: "이미 배송 준비가 시작되어 직접 취소할 수 없어요. 반품 신청을 이용해 주세요." };
    }

    const { data: pay } = await supabase
      .from("payments")
      .select("payment_key")
      .eq("order_id", orderId)
      .not("payment_key", "is", null)
      .maybeSingle();
    if (!pay?.payment_key) return { error: "결제 정보를 찾을 수 없습니다. 고객센터로 문의해주세요." };

    const { cancelTossPayment } = await import("@/lib/toss");
    await cancelTossPayment(String(pay.payment_key), "고객 주문 취소");

    const { error: rpcErr } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
    if (rpcErr) {
      return { error: "환불은 처리됐지만 주문 반영에 실패했습니다. 고객센터로 문의해주세요." };
    }

    // 운영진 알림 — 고객이 직접 취소(환불 완료)
    try {
      const { notifyKakaoWork, won } = await import("@/lib/notify");
      await notifyKakaoWork(
        `❌ 주문 취소 (고객)\n주문번호: ${order.order_number}\n주문자: ${order.buyer_name ?? "-"}\n환불금액: ${won(Number(order.total_amount ?? 0))}`
      );
    } catch {}

    revalidatePath("/account/orders");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "취소 처리 중 오류가 발생했습니다." };
  }
}

// 반품 신청(배송 준비 후): 상태만 'requested'로. 실제 환불은 관리자 승인 시.
export async function requestReturn(orderId: string, reason: string): Promise<{ error?: string }> {
  if (!IS_CONFIGURED) return { error: "사용할 수 없습니다." };
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "로그인이 필요합니다." };

    const { error } = await supabase.rpc("request_order_return", {
      p_order_id: orderId,
      p_reason: reason,
    });
    if (error) return { error: error.message || "반품 신청에 실패했습니다." };

    // 운영진 알림 — 고객 반품 신청(승인 처리 필요)
    try {
      const { data: ord } = await supabase
        .from("orders")
        .select("order_number, buyer_name, total_amount")
        .eq("id", orderId)
        .maybeSingle();
      const { notifyKakaoWork, won } = await import("@/lib/notify");
      const r = (reason ?? "").trim();
      await notifyKakaoWork(
        `↩️ 반품 신청 (승인 필요)\n주문번호: ${ord?.order_number ?? "-"}\n주문자: ${ord?.buyer_name ?? "-"}\n금액: ${won(Number(ord?.total_amount ?? 0))}${r ? `\n사유: ${r.slice(0, 200)}` : ""}`
      );
    } catch {}

    revalidatePath("/account/orders");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// 회원 탈퇴(소프트) — 계정 비활성화 후 로그아웃. 주문 기록은 보존된다.
export async function deactivateMyAccount(): Promise<{ error?: string }> {
  if (!IS_CONFIGURED) return { error: "사용할 수 없습니다." };
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "로그인이 필요합니다." };

    const { error } = await supabase.rpc("set_account_deactivated", {
      p_user_id: user.id,
      p_deactivated: true,
    });
    if (error) return { error: "탈퇴 처리에 실패했습니다." };

    await supabase.auth.signOut();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "오류가 발생했습니다." };
  }
}

// ── 프로필 수정 ────────────────────────────────────────────
export async function updateProfile(data: {
  name: string;
  phone: string;
  marketingAgreed: boolean;
}): Promise<{ error?: string; success?: boolean }> {
  if (!IS_CONFIGURED) return { success: true };

  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "로그인이 필요합니다." };

    const { error: authError } = await supabase.auth.updateUser({
      data: { name: data.name, phone: data.phone, marketing_agreed: data.marketingAgreed },
    });
    if (authError) return { error: authError.message };

    await supabase
      .from("profiles")
      .update({ name: data.name, phone: data.phone, marketing_agreed: data.marketingAgreed })
      .eq("id", user.id);

    revalidatePath("/account/profile");
    return { success: true };
  } catch {
    return { error: "오류가 발생했습니다." };
  }
}

// ── 비밀번호 변경 ──────────────────────────────────────────
export async function changePassword(data: {
  newPassword: string;
}): Promise<{ error?: string; success?: boolean }> {
  if (!IS_CONFIGURED) return { success: true };

  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();

    const { error } = await supabase.auth.updateUser({ password: data.newPassword });
    if (error) return { error: error.message };

    return { success: true };
  } catch {
    return { error: "비밀번호 변경에 실패했습니다." };
  }
}

// ── 배송지 목록 ────────────────────────────────────────────
export async function getAddresses(): Promise<(ShippingAddress & { id: string; isDefault: boolean })[]> {
  if (!IS_CONFIGURED) return [];

  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });

    return (data ?? []).map((a) => ({
      id: String(a.id),
      name: String(a.name),
      phone: String(a.phone),
      zipCode: String(a.zip_code),
      address: String(a.address),
      addressDetail: String(a.address_detail ?? ""),
      isDefault: Boolean(a.is_default),
    }));
  } catch {
    return [];
  }
}

export async function upsertAddress(
  address: ShippingAddress & { id?: string; isDefault?: boolean }
): Promise<{ error?: string; success?: boolean }> {
  if (!IS_CONFIGURED) return { success: true };

  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "로그인이 필요합니다." };

    const payload = {
      user_id: user.id,
      name: address.name,
      phone: address.phone,
      zip_code: address.zipCode,
      address: address.address,
      address_detail: address.addressDetail,
      is_default: address.isDefault ?? false,
    };

    if (address.id) {
      await supabase.from("addresses").update(payload).eq("id", address.id);
    } else {
      await supabase.from("addresses").insert(payload);
    }

    revalidatePath("/account/profile");
    return { success: true };
  } catch {
    return { error: "배송지 저장에 실패했습니다." };
  }
}

export async function deleteAddress(id: string): Promise<{ error?: string }> {
  if (!IS_CONFIGURED) return {};

  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    await supabase.from("addresses").delete().eq("id", id);
    revalidatePath("/account/profile");
    return {};
  } catch {
    return { error: "배송지 삭제에 실패했습니다." };
  }
}

// ── 보유 쿠폰 ──────────────────────────────────────────────
export interface UserCoupon {
  id: string;
  code: string;
  name: string;
  discountLabel: string;
  discountType: string; // 'percent' | 'amount'
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  status: "active" | "used" | "expired";
  expiresAt: string | null;
  stackable: boolean;
}

// ── 체크아웃 자동입력(회원 기본정보 + 기본 배송지) ──────────
export interface CheckoutPrefill {
  name: string;
  email: string;
  phone: string;
  address: {
    name: string;
    phone: string;
    zip: string;
    address: string;
    addressDetail: string;
  } | null;
}

export async function getCheckoutPrefill(): Promise<CheckoutPrefill | null> {
  if (!IS_CONFIGURED) return null;
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, phone")
      .eq("id", user.id)
      .maybeSingle();

    const { data: addr } = await supabase
      .from("addresses")
      .select("name, phone, zip_code, address, address_detail, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    const pName = String(profile?.name ?? "");
    const pPhone = String(profile?.phone ?? "");
    return {
      name: pName,
      email: String(user.email ?? ""),
      phone: pPhone,
      address: addr
        ? {
            name: String(addr.name ?? pName),
            phone: String(addr.phone ?? pPhone),
            zip: String(addr.zip_code ?? ""),
            address: String(addr.address ?? ""),
            addressDetail: String(addr.address_detail ?? ""),
          }
        : null,
    };
  } catch {
    return null;
  }
}

// ── 쿠폰 코드 등록 ────────────────────────────────────────
export async function redeemCouponByCode(
  code: string
): Promise<{ error?: string; name?: string }> {
  if (!IS_CONFIGURED) return { error: "쿠폰 기능을 사용할 수 없습니다." };
  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "로그인 후 이용해주세요." };

    const { data, error } = await supabase.rpc("redeem_coupon", { p_code: code });
    if (error) {
      const msg = error.message || "";
      // RPC의 raise exception 메시지를 사용자에게 그대로 전달(한국어 안내 문구).
      const known = [
        "로그인 후 이용해주세요.",
        "쿠폰 코드를 입력해주세요.",
        "유효하지 않은 쿠폰 코드입니다.",
        "이미 등록된 쿠폰입니다.",
      ].find((k) => msg.includes(k));
      return { error: known ?? "쿠폰 등록에 실패했습니다." };
    }
    revalidatePath("/account/coupons");
    const name = (data as { name?: string } | null)?.name;
    return { name: name ?? "쿠폰" };
  } catch {
    return { error: "쿠폰 등록에 실패했습니다." };
  }
}

export async function getUserCoupons(): Promise<UserCoupon[]> {
  if (!IS_CONFIGURED) return [];

  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("user_coupons")
      .select(
        "id, status, expires_at, coupons(code, name, discount_type, discount_value, min_order_amount, max_discount_amount, stackable, ends_at)"
      )
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false });

    if (error || !data) return [];

    const now = Date.now();
    return data.map((uc) => {
      // to-one 조인이지만 Supabase 타입은 배열로 추론될 수 있어 방어적으로 처리.
      const raw = uc.coupons as unknown;
      const c = ((Array.isArray(raw) ? raw[0] : raw) ?? {}) as Record<string, unknown>;
      const expiresAt = uc.expires_at ? String(uc.expires_at) : null;
      const endsAt = c.ends_at ? String(c.ends_at) : null;
      const expiredByIssue = expiresAt ? new Date(expiresAt).getTime() < now : false;
      const expiredByEvent = endsAt ? new Date(endsAt).getTime() < now : false;
      const expired = expiredByIssue || expiredByEvent;
      const status: UserCoupon["status"] =
        uc.status === "used" ? "used" : expired ? "expired" : "active";
      const discountLabel =
        c.discount_type === "percent"
          ? `${Number(c.discount_value)}% 할인`
          : `${Number(c.discount_value).toLocaleString("ko-KR")}원 할인`;
      return {
        id: String(uc.id),
        code: String(c.code ?? ""),
        name: String(c.name ?? ""),
        discountLabel,
        discountType: String(c.discount_type ?? "percent"),
        discountValue: Number(c.discount_value ?? 0),
        maxDiscountAmount: c.max_discount_amount == null ? null : Number(c.max_discount_amount),
        minOrderAmount: Number(c.min_order_amount ?? 0),
        status,
        expiresAt,
        stackable: Boolean(c.stackable),
      };
    });
  } catch {
    return [];
  }
}
