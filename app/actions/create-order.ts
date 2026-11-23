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
  pointsUsed: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}

// 성공 시 주문 결과, 실패 시 고객에게 보여줄 메시지를 "데이터로" 돌려준다.
// (에러를 throw하면 프로덕션 빌드에서 Next.js가 메시지를 가려버려 — "An error occurred
//  in the Server Components render..." — 고객이 실제 사유(재고 부족 등)를 볼 수 없다.)
export type CreateOrderOutcome =
  | ({ ok: true } & CreateOrderResult)
  | { ok: false; message: string };

const GENERIC_ORDER_ERROR = "주문을 생성하지 못했습니다. 다시 시도해주세요.";

interface CreateOrderRpcResponse {
  order_id: string;
  order_number: string;
  subtotal_amount: number;
  discount_amount: number;
  points_used: number;
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
export async function createOrderSecure(raw: unknown): Promise<CreateOrderOutcome> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "주문 기능을 사용할 수 없습니다." };
  }

  let input: CreateOrderInput;
  try {
    input = parseCreateOrderInput(raw);
  } catch (err) {
    // 입력(장바구니) 형식 검증 실패 — 사용자용 메시지를 그대로 전달.
    return { ok: false, message: err instanceof Error ? err.message : GENERIC_ORDER_ERROR };
  }

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
    p_user_coupon_id: input.userCouponId,
    p_user_coupon_ids: input.userCouponIds,
    p_points_to_use: input.pointsToUse,
    p_attribution: input.attribution,
  });

  if (error || !data) {
    logSupabaseError("createOrder", error);
    // create_order가 raise exception으로 올린 안내(PostgreSQL code 'P0001')는
    // 고객용으로 설계된 한글 메시지라 그대로 보여준다
    // (예: "재고가 부족합니다 (테리빕 · 옐로우)", "최소 주문금액 미달", 쿠폰 안내 등).
    // 그 외(시스템 오류·버그)는 민감정보 노출 없이 일반 메시지로.
    const message =
      error?.code === "P0001" && typeof error.message === "string" && error.message.length > 0
        ? error.message
        : GENERIC_ORDER_ERROR;
    return { ok: false, message };
  }

  const result = data as CreateOrderRpcResponse;
  return {
    ok: true,
    orderId: result.order_id,
    orderNumber: result.order_number,
    subtotalAmount: result.subtotal_amount,
    discountAmount: result.discount_amount,
    pointsUsed: result.points_used,
    shippingFee: result.shipping_fee,
    totalAmount: result.total_amount,
    currency: result.currency,
    orderStatus: result.order_status,
    paymentStatus: result.payment_status,
    fulfillmentStatus: result.fulfillment_status,
  };
}
