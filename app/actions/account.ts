"use server";

import type { Order, ShippingAddress } from "@/lib/types";
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
        "id, order_number, total_amount, order_status, payment_status, fulfillment_status, shipping_address, created_at, order_items(*)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((o) => ({
      // 표시용 주문번호는 사람이 읽는 order_number(ORD…)를 사용한다(완료 페이지와 일치).
      id: String(o.order_number ?? o.id),
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
        "id, status, expires_at, coupons(code, name, discount_type, discount_value, min_order_amount, max_discount_amount)"
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
      const expired = expiresAt ? new Date(expiresAt).getTime() < now : false;
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
      };
    });
  } catch {
    return [];
  }
}
