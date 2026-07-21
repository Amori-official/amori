import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateShippingFee, calculateOrderAmount } from "./shipping-policy";

test("49,999원 일반 지역 → 3,000원", () => {
  const fee = calculateShippingFee({ subtotalAmount: 49999, discountAmount: 0, remoteArea: false });
  assert.equal(fee, 3000);
});

test("50,000원 일반 지역 → 무료", () => {
  const fee = calculateShippingFee({ subtotalAmount: 50000, discountAmount: 0, remoteArea: false });
  assert.equal(fee, 0);
});

test("49,999원 제주·도서산간 → 6,000원", () => {
  const fee = calculateShippingFee({ subtotalAmount: 49999, discountAmount: 0, remoteArea: true });
  assert.equal(fee, 6000);
});

test("50,000원 제주·도서산간 → 무료", () => {
  const fee = calculateShippingFee({ subtotalAmount: 50000, discountAmount: 0, remoteArea: true });
  assert.equal(fee, 0);
});

test("할인 전 50,000원, 할인 후 49,000원 일반 지역 → 3,000원", () => {
  const fee = calculateShippingFee({ subtotalAmount: 50000, discountAmount: 1000, remoteArea: false });
  assert.equal(fee, 3000);
});

test("할인금액이 상품 소계보다 큰 비정상 입력 차단", () => {
  assert.throws(() => calculateShippingFee({ subtotalAmount: 10000, discountAmount: 20000, remoteArea: false }));
});

test("음수 소계 차단", () => {
  assert.throws(() => calculateShippingFee({ subtotalAmount: -1, discountAmount: 0, remoteArea: false }));
});

test("소수 금액 차단", () => {
  assert.throws(() => calculateShippingFee({ subtotalAmount: 49999.5, discountAmount: 0, remoteArea: false }));
});

test("음수 할인 차단", () => {
  assert.throws(() => calculateShippingFee({ subtotalAmount: 10000, discountAmount: -1, remoteArea: false }));
});

test("calculateOrderAmount: 최종 결제금액 = 소계 - 할인 + 배송비", () => {
  const result = calculateOrderAmount({ subtotalAmount: 30000, discountAmount: 5000, remoteArea: false });
  assert.deepEqual(result, {
    subtotalAmount: 30000,
    discountAmount: 5000,
    shippingFee: 3000,
    totalAmount: 28000,
  });
});

test("calculateOrderAmount: 무료배송 구간에서는 배송비 0원", () => {
  const result = calculateOrderAmount({ subtotalAmount: 60000, discountAmount: 0, remoteArea: true });
  assert.equal(result.shippingFee, 0);
  assert.equal(result.totalAmount, 60000);
});
