// 배송비 정책 — 서버(주문 생성 로직)와 클라이언트(주문서 화면 표시)가
// 동일한 계산 결과를 내야 하므로 숫자를 여러 컴포넌트에 각자 하드코딩하지 않고
// 이 모듈 하나로만 관리한다.
//
// 확정된 운영정책(2026-07-21):
//   - 일반 배송비 3,000원
//   - 제주·도서산간 배송비 6,000원
//   - 상품금액(할인 적용 후) 50,000원 이상 무료배송, 제주·도서산간도 동일 기준 적용
//   - 여러 상품은 한 주문에서 묶음배송 1회로 계산(주문 단위 1회 계산, 상품별 배송비 없음)
//   - 반품·교환 배송비는 아직 사업자 정책 미확정 — 이 모듈에서 다루지 않는다
//
// remoteArea(제주·도서산간 여부) 판정에 대한 중요한 제약:
//   우편번호만으로 제주·도서산간 전체를 정확히 판정하기 어렵고, 이번 단계에서는
//   실제 주소 API·택배사 판정 데이터를 연동하지 않는다. 그래서 이 모듈은
//   remoteArea를 "이미 검증된 boolean"으로만 입력받고, 그 값을 어떻게 구할지는
//   호출하는 쪽(다음 단계의 서버 주문 생성 로직)의 책임으로 남긴다.
//   클라이언트가 보낸 remoteArea를 그대로 신뢰해서는 안 되며, 정확한 자동판정
//   로직(우편번호 정책 테이블, 주소 API 연동 등)은 다음 단계의 과제다.

// 기본값(관리자가 설정을 바꾸기 전, 그리고 설정을 못 읽을 때의 폴백).
// create_order RPC·site_settings 기본값과 반드시 동일하게 유지한다.
export const DEFAULT_SHIPPING_FEE = 3000;
export const REMOTE_AREA_SHIPPING_FEE = 6000;
export const FREE_SHIPPING_THRESHOLD = 50000;

export interface ShippingPolicy {
  /** 무료배송 기준금액(할인 적용 후) */
  threshold: number;
  /** 기본 배송비 */
  baseFee: number;
  /** 제주·도서산간 추가 배송비 */
  remoteFee: number;
}

export const DEFAULT_SHIPPING_POLICY: ShippingPolicy = {
  threshold: FREE_SHIPPING_THRESHOLD,
  baseFee: DEFAULT_SHIPPING_FEE,
  remoteFee: REMOTE_AREA_SHIPPING_FEE,
};

const krw = (n: number) => `${Number(n ?? 0).toLocaleString("ko-KR")}원`;

/** 안내 문구용 — 정책값을 사람이 읽는 3줄로. (FAQ·배송안내·상품상세 공용) */
export function shippingPolicyLines(p: ShippingPolicy = DEFAULT_SHIPPING_POLICY): {
  baseFee: string;
  freeShipping: string;
  remote: string;
} {
  return {
    baseFee: `기본 배송비: ${krw(p.baseFee)}`,
    freeShipping: `무료배송: ${krw(p.threshold)} 이상 구매 시`,
    remote: `제주·도서산간 지역: 추가 배송비 ${krw(p.remoteFee)}`,
  };
}

export interface ShippingFeeInput {
  /** 상품 소계 (할인 적용 전, 원 단위 정수) */
  subtotalAmount: number;
  /** 할인 금액 (원 단위 정수, 상품 소계를 넘을 수 없음) */
  discountAmount: number;
  /** 제주·도서산간 여부 — 호출하는 쪽이 서버에서 검증한 값만 전달해야 한다 */
  remoteArea: boolean;
}

export interface OrderAmountBreakdown {
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
}

function assertValidMoneyInputs(subtotalAmount: number, discountAmount: number): void {
  if (!Number.isInteger(subtotalAmount) || !Number.isInteger(discountAmount)) {
    throw new Error("금액은 원 단위 정수여야 합니다.");
  }
  if (subtotalAmount < 0) {
    throw new Error("상품 소계는 0 이상이어야 합니다.");
  }
  if (discountAmount < 0) {
    throw new Error("할인 금액은 0 이상이어야 합니다.");
  }
  if (discountAmount > subtotalAmount) {
    throw new Error("할인 금액이 상품 소계보다 클 수 없습니다.");
  }
}

/** 할인 적용 후 상품금액과 지역 여부만으로 배송비를 계산한다. */
export function calculateShippingFee(
  { subtotalAmount, discountAmount, remoteArea }: ShippingFeeInput,
  policy: ShippingPolicy = DEFAULT_SHIPPING_POLICY
): number {
  assertValidMoneyInputs(subtotalAmount, discountAmount);

  const amountAfterDiscount = subtotalAmount - discountAmount;
  if (amountAfterDiscount >= policy.threshold) {
    return 0;
  }
  return remoteArea ? policy.remoteFee : policy.baseFee;
}

/** 배송비를 포함한 최종 결제금액까지 함께 계산한다. */
export function calculateOrderAmount(
  input: ShippingFeeInput,
  policy: ShippingPolicy = DEFAULT_SHIPPING_POLICY
): OrderAmountBreakdown {
  const shippingFee = calculateShippingFee(input, policy);
  return {
    subtotalAmount: input.subtotalAmount,
    discountAmount: input.discountAmount,
    shippingFee,
    totalAmount: input.subtotalAmount - input.discountAmount + shippingFee,
  };
}
