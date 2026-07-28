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
