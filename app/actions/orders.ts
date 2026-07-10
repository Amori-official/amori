"use server";

import type { CartItem } from "@/store/cart";
import type { ShippingAddress } from "@/lib/types";

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http");

export async function createOrder(data: {
  items: CartItem[];
  shippingAddress: ShippingAddress;
  paymentKey: string;
  orderId: string;
  amount: number;
  giftWrapping: boolean;
  giftMessage?: string;
}): Promise<{ orderId?: string; error?: string }> {
  // Supabase 미설정 시 성공 Mock 반환
  if (!IS_CONFIGURED) {
    return { orderId: data.orderId };
  }

  try {
    const { createServerSideClient } = await import("@/lib/supabase-server");
    const supabase = createServerSideClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "로그인이 필요합니다." };

    // 토스페이먼츠 결제 승인
    const secretKey = process.env.TOSS_SECRET_KEY ?? "";
    if (secretKey) {
      const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey: data.paymentKey,
          orderId: data.orderId,
          amount: data.amount,
        }),
      });

      if (!confirmRes.ok) {
        const err = (await confirmRes.json()) as { message?: string };
        return { error: err.message ?? "결제 확인에 실패했습니다." };
      }
    }

    // 주문 저장
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: data.amount,
        status: "paid",
        shipping_address: data.shippingAddress,
        gift_wrapping: data.giftWrapping,
        gift_message: data.giftMessage ?? null,
        payment_key: data.paymentKey,
      })
      .select("id")
      .single();

    if (orderError || !order) return { error: "주문 저장에 실패했습니다." };

    // 주문 상품 저장
    await supabase.from("order_items").insert(
      data.items.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.quantity,
        price: i.product.price,
      }))
    );

    return { orderId: order.id as string };
  } catch {
    return { error: "주문 처리 중 오류가 발생했습니다." };
  }
}
