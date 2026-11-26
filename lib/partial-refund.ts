// 관리자 부분 취소 — 환불 금액 계산(순수 함수). 서버 액션과 관리자 UI 미리보기가 공유한다.
//
// 돈 3종류를 각각 공정하게 처리:
//   · 현금  : 취소 상품이 '전체 상품정가'에서 차지하는 비율만큼, '상품 실결제액'을 비례 환불
//             (쿠폰/포인트로 싸게 산 만큼만 돌려줘서 과다환불 방지)
//   · 포인트: 같은 비율로 반환(고객 자산) — 누적이 사용액을 넘지 않도록 clamp
//   · 쿠폰  : 복원하지 않음(판촉·부분 되돌리기 불가)
//   · 배송비: 취소 후 남은 상품금액이 무료배송 기준 미달이면 배송비를 환불액에서 1회 차감
//             (환불액이 배송비보다 작으면 가능한 만큼만 — 절대 마이너스 없음)

export interface PartialRefundItem {
  /** order_items.id */
  id: string;
  price: number;
  quantity: number;
  /** 이미 취소된 수량 */
  cancelledQuantity: number;
}

export interface PartialRefundOrderCtx {
  subtotalAmount: number;
  discountAmount: number; // 쿠폰 할인
  pointsUsed: number;
  pointsRefunded: number; // 이미 부분취소로 반환한 포인트 누적
  shippingFee: number; // 주문 당시 배송비(0이면 무료배송 적용된 주문)
  shippingReclaimed: boolean; // 이미 배송비를 차감했는지
  freeShippingThreshold: number;
  shippingBaseFee: number;
}

export interface PartialRefundLine {
  itemId: string;
  qty: number; // 이번에 취소할 수량
}

export interface PartialRefundResult {
  /** 취소 상품 정가 합계 (price × qty) */
  cancelledSubtotal: number;
  /** 상품분 현금(배송비 차감 전) */
  cashFromItems: number;
  /** 실제 차감된 배송비 */
  shippingReclaim: number;
  /** 반환 포인트 */
  pointsReturn: number;
  /** 카드로 실제 환불되는 금액 = cashFromItems - shippingReclaim (≥ 0) */
  cardRefund: number;
  /** 취소 후 남는 활성 상품 금액 */
  activeSubtotalAfter: number;
  /** 계산 불가/무효 사유(있으면 실행 금지) */
  error?: string;
}

const round = (n: number) => Math.round(n);

export function computePartialRefund(
  order: PartialRefundOrderCtx,
  items: PartialRefundItem[],
  lines: PartialRefundLine[]
): PartialRefundResult {
  const byId = new Map(items.map((it) => [it.id, it]));

  let cancelledSubtotal = 0;
  for (const ln of lines) {
    const it = byId.get(ln.itemId);
    if (!it) return empty("취소할 상품을 찾을 수 없습니다.");
    const active = it.quantity - it.cancelledQuantity;
    if (ln.qty < 0 || ln.qty > active) return empty("취소 수량이 올바르지 않습니다.");
    cancelledSubtotal += it.price * ln.qty;
  }
  if (cancelledSubtotal <= 0) return empty("취소할 상품/수량을 선택해주세요.");

  // 취소 후 남는 활성 상품 금액.
  let activeBefore = 0;
  for (const it of items) activeBefore += it.price * (it.quantity - it.cancelledQuantity);
  const activeSubtotalAfter = activeBefore - cancelledSubtotal;
  if (activeSubtotalAfter <= 0) {
    return empty("마지막 상품은 부분취소할 수 없습니다. '주문 취소'를 사용하세요.");
  }

  const subtotal = order.subtotalAmount;
  if (subtotal <= 0) return empty("주문 금액 정보가 올바르지 않습니다.");

  const ratio = cancelledSubtotal / subtotal;
  const goodsPaid = Math.max(0, subtotal - order.discountAmount - order.pointsUsed); // 배송비 제외 상품 실결제액
  const cashFromItems = round(goodsPaid * ratio);

  // 포인트 반환(누적이 사용액을 넘지 않도록 clamp).
  const pointsRemaining = Math.max(0, order.pointsUsed - order.pointsRefunded);
  const pointsReturn = Math.min(round(order.pointsUsed * ratio), pointsRemaining);

  // 무료배송 미달 → 배송비 차감(아직 차감 안 했고, 원래 무료배송이었던 주문만).
  const wasFreeShipping = order.shippingFee === 0;
  const crossesBelow =
    wasFreeShipping && !order.shippingReclaimed && activeSubtotalAfter < order.freeShippingThreshold;
  const wantReclaim = crossesBelow ? Math.max(0, order.shippingBaseFee) : 0;
  // 환불액보다 배송비가 크면 가능한 만큼만(마이너스 금지).
  const shippingReclaim = Math.min(wantReclaim, cashFromItems);

  const cardRefund = Math.max(0, cashFromItems - shippingReclaim);

  return {
    cancelledSubtotal,
    cashFromItems,
    shippingReclaim,
    pointsReturn,
    cardRefund,
    activeSubtotalAfter,
  };
}

function empty(error: string): PartialRefundResult {
  return {
    cancelledSubtotal: 0,
    cashFromItems: 0,
    shippingReclaim: 0,
    pointsReturn: 0,
    cardRefund: 0,
    activeSubtotalAfter: 0,
    error,
  };
}
