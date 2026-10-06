// Meta(Facebook/Instagram) 광고 전환 추적 — 브라우저 측.
//
// 하나의 이벤트를 두 경로로 보낸다:
//   1) 브라우저 픽셀(fbq)
//   2) 서버 전환 API(CAPI) — /api/meta/events 경유 (광고차단/iOS 누락 보완)
// 두 경로에 같은 eventID를 넣어 Meta가 중복 제거하도록 한다.
//
// Purchase는 금액 신뢰성 때문에 서버 CAPI를 여기서 보내지 않는다.
// 결제 승인 서버 액션(confirmPaymentSecure)이 Toss 승인 금액으로 직접 전송한다.
//
// NEXT_PUBLIC_META_PIXEL_ID가 없으면 전부 no-op.

import type { Product } from "@/lib/types";

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

export type MetaEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "CompleteRegistration"
  | "Purchase";

export interface MetaCustomData {
  value?: number;
  currency?: "KRW";
  content_ids?: string[];
  content_name?: string;
  content_type?: "product";
  contents?: { id: string; quantity: number; item_price?: number }[];
  num_items?: number;
  order_id?: string;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function newEventId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${rand}`;
}

export function trackMeta(
  eventName: MetaEventName,
  customData: MetaCustomData = {},
  options: { eventId?: string; serverSide?: boolean } = {}
): void {
  if (!META_PIXEL_ID || typeof window === "undefined") return;

  const eventId = options.eventId ?? newEventId(eventName);

  try {
    window.fbq?.("track", eventName, customData, { eventID: eventId });
  } catch {
    // 추적 실패가 쇼핑 흐름을 막지 않도록 무시
  }

  if (options.serverSide === false || eventName === "Purchase") return;

  try {
    void fetch("/api/meta/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: window.location.href,
        customData,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 무시
  }
}

/** 상품 → content 파라미터 */
export function productContent(product: Product, unitPrice: number, quantity = 1): MetaCustomData {
  return {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    contents: [{ id: product.id, quantity, item_price: unitPrice }],
    value: unitPrice * quantity,
    currency: "KRW",
  };
}

// ── Purchase 보조: 결제창 이동 전 주문 정보를 보관 → 완료 페이지에서 사용 ──

export interface PendingPurchase {
  orderNumber: string;
  email?: string;
  phone?: string;
  contents: { id: string; quantity: number; item_price?: number }[];
}

const PENDING_PURCHASE_KEY = "amori-meta-pending-purchase";

export function savePendingPurchase(data: PendingPurchase): void {
  try {
    sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(data));
  } catch {}
}

/** 해당 주문번호의 보관 정보를 꺼내고 삭제한다. 다른 주문이면 null. */
export function takePendingPurchase(orderNumber: string): PendingPurchase | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PURCHASE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingPurchase;
    if (data.orderNumber !== orderNumber) return null;
    sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    return data;
  } catch {
    return null;
  }
}

/** Purchase 이벤트 ID — 브라우저 픽셀과 서버 CAPI가 동일 값을 써야 중복 제거됨 */
export function purchaseEventId(orderNumber: string): string {
  return `purchase_${orderNumber}`;
}
