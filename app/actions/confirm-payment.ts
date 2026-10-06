"use server";

// 16-4(3단계) 결제 승인 서버 액션.
//
// checkout에서 pending 주문을 만든 뒤 Toss 결제창으로 결제하면, 성공 시
// /checkout/complete로 리다이렉트되며 이 액션이 호출된다.
//
// 흐름:
//   1) Toss 승인 API(POST /v1/payments/confirm)를 시크릿 키로 호출해 결제를 확정.
//      → 시크릿 키(TOSS_SECRET_KEY)는 서버 전용. 클라이언트에 절대 노출되지 않는다.
//   2) 승인 결과를 confirm_order_payment() RPC로 주문에 원자적으로 반영.
//      → 금액 대조(주문 total_amount == 승인 금액)와 상태 전환(paid/confirmed)은
//        RPC 내부(SECURITY DEFINER)에서만 이뤄진다.
//
// 이 액션은 리다이렉트 쿼리(신뢰할 수 없는 입력)를 받으므로 형식을 먼저 검증한다.

import { createServerSideClient } from "@/lib/supabase-server";
import { isSupabaseConfigured, logSupabaseError } from "@/lib/supabase-config";
import { sendCapiEvent } from "@/lib/meta-capi";
import { notifyKakaoWork, won } from "@/lib/notify";

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";
// 주문번호 형식: create_order()가 발급하는 'ORDYYMMDD-XXXXXXXX' + 여유. Toss orderId 규칙과도 호환.
const ORDER_NUMBER_REGEX = /^[A-Za-z0-9_-]{6,64}$/;
const PAYMENT_KEY_REGEX = /^[A-Za-z0-9_-]{1,200}$/;

export interface ConfirmPaymentResult {
  orderNumber: string;
  /** Toss가 실제 승인한 금액 */
  amount: number;
  paymentStatus: string;
  orderStatus: string;
  alreadyConfirmed: boolean;
}

interface ConfirmPaymentRpcResponse {
  order_id: string;
  order_number: string;
  payment_status: string;
  order_status: string;
  already_confirmed: boolean;
}

interface TossConfirmResponse {
  status?: string;
  method?: string;
  approvedAt?: string;
  totalAmount?: number;
  message?: string;
}

export async function confirmPaymentSecure(raw: unknown): Promise<ConfirmPaymentResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("결제 기능을 사용할 수 없습니다.");
  }

  const secretKey = process.env.TOSS_SECRET_KEY ?? "";
  if (!secretKey) {
    throw new Error("결제 기능을 사용할 수 없습니다.");
  }

  // ── 입력 검증 (신뢰할 수 없는 리다이렉트 파라미터) ──
  if (typeof raw !== "object" || raw === null) {
    throw new Error("결제 정보가 올바르지 않습니다.");
  }
  const { paymentKey, orderId, amount, meta } = raw as Record<string, unknown>;

  if (typeof paymentKey !== "string" || !PAYMENT_KEY_REGEX.test(paymentKey)) {
    throw new Error("결제 정보가 올바르지 않습니다.");
  }
  if (typeof orderId !== "string" || !ORDER_NUMBER_REGEX.test(orderId)) {
    throw new Error("주문 정보가 올바르지 않습니다.");
  }
  const amountNum = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isInteger(amountNum) || amountNum < 0) {
    throw new Error("결제 금액이 올바르지 않습니다.");
  }

  // ── 1) Toss 승인 API 호출 (시크릿 키 — 서버 전용) ──
  let tossData: TossConfirmResponse;
  try {
    const res = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount: amountNum }),
    });
    tossData = (await res.json()) as TossConfirmResponse;
    if (!res.ok || tossData.status !== "DONE") {
      throw new Error(tossData.message ?? "결제 승인에 실패했습니다.");
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error("결제 승인 중 오류가 발생했습니다.");
  }

  // Toss가 실제로 승인한 금액을 신뢰의 기준으로 사용한다(요청 금액과 동일해야 정상).
  const approvedAmount =
    typeof tossData.totalAmount === "number" ? tossData.totalAmount : amountNum;

  // ── 2) 승인 결과를 주문에 반영 (금액 대조·상태 전환은 RPC 내부에서 원자적으로) ──
  const supabase = createServerSideClient();
  const { data, error } = await supabase.rpc("confirm_order_payment", {
    p_order_number: orderId,
    p_payment_key: paymentKey,
    p_amount: approvedAmount,
    p_method: tossData.method ?? null,
    p_approved_at: tossData.approvedAt ?? null,
  });

  if (error || !data) {
    logSupabaseError("confirmOrderPayment", error);
    // 이 시점엔 Toss 승인이 이미 성공했을 수 있다 —
    // 운영에서는 금액 불일치/반영 실패 시 별도 결제취소(정산) 처리가 필요하다(후속 단계).
    throw new Error("결제는 승인되었으나 주문 반영에 실패했습니다. 고객센터로 문의해주세요.");
  }

  const result = data as ConfirmPaymentRpcResponse;

  // Meta 전환 API: Purchase (최초 승인 시 1회). 금액은 Toss 승인 금액 기준.
  // 브라우저 픽셀과 같은 event_id(purchase_<주문번호>)로 보내 중복 제거된다.
  if (!result.already_confirmed) {
    const m = parsePurchaseMeta(meta);
    let externalId: string | null = null;
    let userEmail: string | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      externalId = auth.user?.id ?? null;
      userEmail = auth.user?.email ?? null;
    } catch {}
    await sendCapiEvent({
      eventName: "Purchase",
      eventId: `purchase_${result.order_number}`,
      customData: {
        value: approvedAmount,
        currency: "KRW",
        content_type: "product",
        content_ids: m.contents.map((c) => c.id),
        contents: m.contents,
        order_id: result.order_number,
      },
      user: { email: m.email ?? userEmail, phone: m.phone, externalId },
    });

    // 운영진 카카오워크 알림 — 새 주문 접수(결제 완료 최초 1회)
    try {
      const { data: ord } = await supabase
        .from("orders")
        .select("buyer_name, total_amount, order_items(product_name, quantity)")
        .eq("order_number", result.order_number)
        .maybeSingle();
      const items =
        (ord?.order_items as { product_name?: string; quantity?: number }[] | undefined) ?? [];
      const first = items[0]?.product_name ?? "상품";
      const itemText = items.length > 1 ? `${first} 외 ${items.length - 1}건` : first;
      const buyer = ord?.buyer_name ? String(ord.buyer_name) : "비회원";
      await notifyKakaoWork(
        `🛍️ 새 주문 접수\n주문번호: ${result.order_number}\n주문자: ${buyer}\n상품: ${itemText}\n결제금액: ${won(Number(ord?.total_amount ?? approvedAmount))}`
      );
    } catch {}
  }

  return {
    orderNumber: result.order_number,
    amount: approvedAmount,
    paymentStatus: result.payment_status,
    orderStatus: result.order_status,
    alreadyConfirmed: result.already_confirmed,
  };
}

// 완료 페이지가 넘겨주는 Meta 매칭용 정보(신뢰 불가 입력 — 해시 매칭에만 사용, 형식만 검증)
function parsePurchaseMeta(raw: unknown): {
  email: string | null;
  phone: string | null;
  contents: { id: string; quantity: number; item_price?: number }[];
} {
  const out = { email: null as string | null, phone: null as string | null, contents: [] as { id: string; quantity: number; item_price?: number }[] };
  if (typeof raw !== "object" || raw === null) return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.email === "string" && r.email.length <= 254 && r.email.includes("@")) out.email = r.email;
  if (typeof r.phone === "string" && r.phone.length <= 30) out.phone = r.phone;
  if (Array.isArray(r.contents)) {
    for (const c of r.contents.slice(0, 50)) {
      if (typeof c !== "object" || c === null) continue;
      const { id, quantity, item_price } = c as Record<string, unknown>;
      if (typeof id !== "string" || id.length > 64 || typeof quantity !== "number") continue;
      out.contents.push({
        id,
        quantity: Math.max(1, Math.min(999, Math.round(quantity))),
        ...(typeof item_price === "number" ? { item_price: Math.round(item_price) } : {}),
      });
    }
  }
  return out;
}
