"use server";

// 16-3 서버 주문 생성 호출 래퍼 (초안).
//
// 이 파일은 아직 어디에서도 import되지 않는다 — checkout UI 연결은
// 이번 단계의 범위가 아니다. supabase/migrations/006_create_order_rpc.sql의
// create_order() RPC를 호출하는 최소한의 서버 진입점만 마련해둔다.
//
// fail-closed: Supabase 환경변수가 없는 환경(Production 등)에서는
// isSupabaseConfigured()가 false를 반환하므로 Supabase 호출 자체가
// 발생하지 않고 즉시 실패한다. 기존 Production mock 구매 흐름은
// 이 파일이 아예 사용되지 않으므로 영향받지 않는다.

import { createServerSideClient } from "@/lib/supabase-server";
import { isSupabaseConfigured, logSupabaseError } from "@/lib/supabase-config";
import { parseCreateOrderInput, type CreateOrderInput } from "@/lib/order-input";

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}

interface CreateOrderRpcResponse {
  order_id: string;
  order_number: string;
  subtotal_amount: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  order_status: string;
  payment_status: string;
  fulfillment_status: string;
}

/**
 * 신뢰할 수 없는 입력(raw)을 검증한 뒤 create_order() RPC를 호출한다.
 * 가격/배송비/최종금액/상품정보는 전부 RPC(서버) 쪽에서 결정되며,
 * 이 함수는 그 값을 그대로 전달만 한다 — 클라이언트 값을 신뢰하지 않는다.
 */
export async function createOrderSecure(raw: unknown): Promise<CreateOrderResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("주문 기능을 사용할 수 없습니다.");
  }

  const input: CreateOrderInput = parseCreateOrderInput(raw);

  const supabase = createServerSideClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
    })),
    p_buyer_name: input.buyerName,
    p_buyer_email: input.buyerEmail,
    p_buyer_phone: input.buyerPhone,
    p_recipient_name: input.recipientName,
    p_recipient_phone: input.recipientPhone,
    p_postal_code: input.postalCode,
    p_address_line1: input.addressLine1,
    p_address_line2: input.addressLine2,
    p_delivery_request: input.deliveryRequest,
  });

  if (error || !data) {
    logSupabaseError("createOrder", error);
    throw new Error("주문을 생성하지 못했습니다. 다시 시도해주세요.");
  }

  const result = data as CreateOrderRpcResponse;
  return {
    orderId: result.order_id,
    orderNumber: result.order_number,
    subtotalAmount: result.subtotal_amount,
    discountAmount: result.discount_amount,
    shippingFee: result.shipping_fee,
    totalAmount: result.total_amount,
    currency: result.currency,
    orderStatus: result.order_status,
    paymentStatus: result.payment_status,
    fulfillmentStatus: result.fulfillment_status,
  };
}
