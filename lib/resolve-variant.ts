// variant 결정 로직 — 반드시 product.variants(DB에서 내려온 실제 variant 목록)만을
// 근거로 판단한다. 색상/사이즈를 각각 독립적으로 조합해 임의의 variant_id를
// 추측하거나 새로 만들어내지 않는다.

import type { Product, ProductVariant } from "@/lib/types";

/**
 * 선택된 색상/사이즈 조합에 대응하는 실제 DB variant 1개를 찾는다. 없으면 null.
 *
 * 실제 카탈로그 데이터(예: FLOWER POUCH)는 색상과 사이즈가 "하나의 행에 함께 존재하는
 * 조합형"이 아니라, 색상 전용 행(option_name 없음)과 사이즈 전용 행(color_name 없음)이
 * 서로 완전히 독립된 별도 행으로 저장되어 있다. create_order() RPC(006/007)도 variant_id
 * 하나당 정확히 한 행만 참조하며, 가격은 그 행의 price_override(없으면 상품 기본가)로
 * 결정한다 — 즉 이 스키마에서 실제로 "판매 단위(가격을 결정하는 행)"는 사이즈 행이고,
 * 색상은 화면 표시(이미지 등)용 속성일 뿐 별도의 variant_id로 표현되지 않는다.
 *
 * 우선순위:
 *   1) 색상+사이즈를 모두 가진 진짜 조합형 행이 있으면 그 행을 그대로 사용한다
 *      (향후 그런 상품이 추가되더라도 정확히 대응).
 *   2) 사이즈 전용 행이 존재하는 상품(사이즈별 가격 차이가 있는 상품)은 선택된 사이즈에
 *      대응하는 행을 사용한다 — 색상은 판단에 관여하지 않는다.
 *   3) 사이즈 축이 아예 없는 색상 전용 상품은 선택된 색상에 대응하는 행을 사용한다.
 *   4) 위 어느 것도 대응하지 않으면 null (추측해서 만들어내지 않는다).
 */
export function resolveVariant(
  variants: ProductVariant[] | undefined,
  selectedColor?: string,
  selectedSize?: string
): ProductVariant | null {
  if (!variants || variants.length === 0) return null;

  if (selectedColor !== undefined && selectedSize !== undefined) {
    const combo = variants.find((v) => v.colorName === selectedColor && v.optionName === selectedSize);
    if (combo) return combo;
  }

  const hasSizeAxis = variants.some((v) => v.optionName && !v.colorName);
  if (hasSizeAxis) {
    if (selectedSize === undefined) return null;
    return variants.find((v) => v.optionName === selectedSize && !v.colorName) ?? null;
  }

  if (selectedColor === undefined) return null;
  return variants.find((v) => v.colorName === selectedColor && !v.optionName) ?? null;
}

/**
 * "split-axis" 상품 판정: 색상 전용 활성 variant와 사이즈 전용 활성 variant가
 * 각각 존재하는데, 색상+사이즈를 모두 가진 조합형 활성 variant가 하나도 없는 경우.
 *
 * 이런 상품은 하나의 variant_id로는 색상과 사이즈를 동시에 표현할 수 없어
 * (create_order RPC는 variant_id 하나당 정확히 한 행만 참조), 주문 시 선택한
 * 색상 또는 사이즈 중 하나가 order_items에 기록되지 않고 유실된다. DB에 실제
 * 조합형 variant 행이 정비되기 전까지는 이런 상품을 아예 주문할 수 없게 막아야
 * 한다. 상품 slug/이름을 하드코딩하지 않고 실제 variant 구조만으로 판정한다.
 */
export function isSplitAxisProduct(variants: ProductVariant[] | undefined): boolean {
  if (!variants || variants.length === 0) return false;

  const hasColorOnlyActive = variants.some((v) => v.isActive && v.colorName && !v.optionName);
  const hasSizeOnlyActive = variants.some((v) => v.isActive && v.optionName && !v.colorName);
  const hasComboActive = variants.some((v) => v.isActive && v.colorName && v.optionName);

  return hasColorOnlyActive && hasSizeOnlyActive && !hasComboActive;
}

interface OrderableCheckItem {
  product: Product;
  variantId: string | null;
}

/**
 * 장바구니 항목이 실제 주문 가능한 상태인지 확인한다 (담을 당시 저장된 product 스냅샷 기준).
 * variantId가 없는 기존(레거시) 항목은 상품명/색상명/사이즈명으로 추측하지 않고
 * 무조건 주문 불가로 처리한다. split-axis 상품은 저장된 variantId가 우연히
 * 유효하더라도(예: 예전에 정상적으로 담겼던 항목) DB 정비가 끝날 때까지 무조건
 * 주문 불가로 처리한다 — 색상 유실 위험이 있는 주문을 허용하지 않는다.
 */
export function isCartItemOrderable(item: OrderableCheckItem): boolean {
  if (isSplitAxisProduct(item.product.variants)) return false;

  const variants = item.product.variants;
  const hasVariants = !!variants && variants.length > 0;

  if (!hasVariants) {
    return item.variantId === null;
  }
  if (!item.variantId) return false;

  const match = variants.find((v) => v.id === item.variantId);
  return !!match && match.isActive;
}
