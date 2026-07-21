// 주문 생성 입력값 검증 — 순수 함수, DB 호출 없음.
//
// 여기서 검증하는 필드는 "클라이언트가 보낼 수 있는 값의 전부"다.
// 상품명/가격/배송비/최종금액/주문상태/결제상태 등은 절대 여기서 받지 않는다
// (서버가 DB에서 재조회/재계산한다 — supabase/migrations/006_create_order_rpc.sql 참고).
//
// 이 모듈은 1차 방어선(빠른 실패, 명확한 오류 메시지)일 뿐이며, 실제 보안 경계는
// create_order() SQL 함수의 검증이다 — 여기 검증을 통과했다고 해서 SQL 쪽 검증을
// 생략하지 않는다.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHAR_REGEX = new RegExp("[\\x00-\\x1F\\x7F]");

const MAX_ITEMS = 30;
const MAX_DISTINCT_LINES = 20;
const MAX_QUANTITY = 99;

export interface CreateOrderItemInput {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface CreateOrderInput {
  items: CreateOrderItemInput[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string | null;
  deliveryRequest: string | null;
}

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "items",
  "buyerName",
  "buyerEmail",
  "buyerPhone",
  "recipientName",
  "recipientPhone",
  "postalCode",
  "addressLine1",
  "addressLine2",
  "deliveryRequest",
]);

const ALLOWED_ITEM_KEYS = new Set(["productId", "variantId", "quantity"]);

class OrderInputError extends Error {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoUnknownKeys(obj: Record<string, unknown>, allowed: Set<string>): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new OrderInputError("허용되지 않은 입력값이 포함되어 있습니다.");
    }
  }
}

function requireText(value: unknown, maxLength: number, fieldLabel: string): string {
  if (typeof value !== "string") {
    throw new OrderInputError(`${fieldLabel}을(를) 확인해주세요.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || value.length > maxLength || CONTROL_CHAR_REGEX.test(value)) {
    throw new OrderInputError(`${fieldLabel}을(를) 확인해주세요.`);
  }
  return value;
}

function optionalText(value: unknown, maxLength: number, fieldLabel: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > maxLength || CONTROL_CHAR_REGEX.test(value)) {
    throw new OrderInputError(`${fieldLabel}을(를) 확인해주세요.`);
  }
  return value;
}

function requireUuid(value: unknown, fieldLabel: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new OrderInputError(`${fieldLabel} 형식이 올바르지 않습니다.`);
  }
  return value;
}

function parseItem(raw: unknown): CreateOrderItemInput {
  if (!isPlainObject(raw)) {
    throw new OrderInputError("주문 항목 정보가 올바르지 않습니다.");
  }
  assertNoUnknownKeys(raw, ALLOWED_ITEM_KEYS);

  const productId = requireUuid(raw.productId, "상품 정보");
  const variantId = raw.variantId === undefined || raw.variantId === null ? null : requireUuid(raw.variantId, "옵션 정보");

  if (typeof raw.quantity !== "number" || !Number.isInteger(raw.quantity)) {
    throw new OrderInputError("주문 수량이 올바르지 않습니다.");
  }
  if (raw.quantity < 1 || raw.quantity > MAX_QUANTITY) {
    throw new OrderInputError("주문 수량이 올바르지 않습니다.");
  }

  return { productId, variantId, quantity: raw.quantity };
}

/** 신뢰할 수 없는 입력(raw)을 검증하고 정규화된 CreateOrderInput으로 변환한다. 실패 시 throw. */
export function parseCreateOrderInput(raw: unknown): CreateOrderInput {
  if (!isPlainObject(raw)) {
    throw new OrderInputError("요청 형식이 올바르지 않습니다.");
  }
  assertNoUnknownKeys(raw, ALLOWED_TOP_LEVEL_KEYS);

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw new OrderInputError("주문 항목이 비어 있습니다.");
  }
  if (raw.items.length > MAX_ITEMS) {
    throw new OrderInputError("한 번에 주문할 수 있는 항목 수를 초과했습니다.");
  }

  const items = raw.items.map(parseItem);

  const distinctLines = new Set(items.map((item) => `${item.productId}:${item.variantId ?? ""}`));
  if (distinctLines.size > MAX_DISTINCT_LINES) {
    throw new OrderInputError("한 번에 주문할 수 있는 항목 수를 초과했습니다.");
  }

  const buyerEmail = requireText(raw.buyerEmail, 255, "주문자 이메일");
  if (!EMAIL_REGEX.test(buyerEmail)) {
    throw new OrderInputError("주문자 이메일을 확인해주세요.");
  }

  return {
    items,
    buyerName: requireText(raw.buyerName, 100, "주문자 이름"),
    buyerEmail,
    buyerPhone: requireText(raw.buyerPhone, 30, "주문자 연락처"),
    recipientName: requireText(raw.recipientName, 100, "받는 분 이름"),
    recipientPhone: requireText(raw.recipientPhone, 30, "받는 분 연락처"),
    postalCode: requireText(raw.postalCode, 10, "우편번호"),
    addressLine1: requireText(raw.addressLine1, 255, "배송지 주소"),
    addressLine2: optionalText(raw.addressLine2, 255, "배송지 상세주소"),
    deliveryRequest: optionalText(raw.deliveryRequest, 500, "배송 요청사항"),
  };
}
