"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore, type CartItem } from "@/store/cart";
import { isCartItemOrderable } from "@/lib/resolve-variant";

// 드로어(comp-cart-drawer)와 동일한 정책·디자인 토큰을 사용하되 전체 페이지로 구현한다.
const FREE_SHIPPING = 50000;
const SHIPPING_FEE = 3000;

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const { items, updateQty, remove, total } = useCartStore();

  useEffect(() => setMounted(true), []);

  // zustand persist 하이드레이션 전에는 빈 상태로 렌더해 SSR 불일치를 피한다.
  const displayItems: CartItem[] = mounted ? items : [];
  const cartTotal = mounted ? total() : 0;
  const remaining = Math.max(0, FREE_SHIPPING - cartTotal);
  const progress = Math.min(100, (cartTotal / FREE_SHIPPING) * 100);
  const shipping = cartTotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  const grandTotal = cartTotal + shipping;

  const hasInvalidItems = displayItems.some((i) => !isCartItemOrderable(i));

  return (
    <div className="pt-[60px] min-h-screen bg-brand-gray-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-[14px] tracking-[0.3em] mb-8">
          CART ({displayItems.reduce((s, i) => s + i.quantity, 0)})
        </h1>

        {displayItems.length === 0 ? (
          <div className="bg-white py-20 flex flex-col items-center justify-center gap-4">
            <p className="text-sm text-brand-gray-mid tracking-wide">장바구니가 비어있습니다.</p>
            <Link
              href="/shop"
              className="text-[14px] tracking-widest underline hover:text-brand-black transition-colors"
            >
              쇼핑 계속하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* ── 왼쪽: 상품 목록 ── */}
            <div className="bg-white p-6">
              <ul className="divide-y divide-brand-border">
                {displayItems.map((item) => (
                  <CartItemRow
                    key={`${item.product.id}-${item.selectedColor ?? "default"}-${item.selectedSize ?? "default"}`}
                    item={item}
                    onUpdateQty={updateQty}
                    onRemove={remove}
                  />
                ))}
              </ul>
            </div>

            {/* ── 오른쪽: 주문 요약 ── */}
            <div className="space-y-4 lg:sticky lg:top-20 self-start">
              <div className="bg-white p-6 space-y-4">
                <h2 className="text-[14px] tracking-[0.25em] pb-3 border-b border-brand-border">
                  주문 요약
                </h2>

                {/* 무료배송 프로그레스 */}
                <div>
                  <p className="text-[14px] tracking-wide text-brand-gray-mid">
                    {remaining > 0
                      ? `₩${remaining.toLocaleString("ko-KR")} 더 담으면 무료배송!`
                      : "무료배송 대상입니다 ✓"}
                  </p>
                  <div className="mt-1.5 h-0.5 bg-brand-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-gray-mid transition-all duration-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-brand-border pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-brand-gray-mid">
                    <span className="tracking-wide">상품 합계</span>
                    <span>₩{cartTotal.toLocaleString("ko-KR")}</span>
                  </div>
                  <div className="flex justify-between text-brand-gray-mid">
                    <span className="tracking-wide">배송비</span>
                    <span>{shipping === 0 ? "무료" : `₩${shipping.toLocaleString("ko-KR")}`}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t border-brand-border text-sm">
                    <span className="tracking-wide">최종 결제금액</span>
                    <span>₩{grandTotal.toLocaleString("ko-KR")}</span>
                  </div>
                </div>
              </div>

              {hasInvalidItems && (
                <p className="text-[13px] text-red-500 tracking-wide px-1">
                  옵션 확인이 필요한 상품이 있습니다. 해당 상품을 정리한 뒤 주문해주세요.
                </p>
              )}

              {hasInvalidItems ? (
                <button
                  disabled
                  className="w-full h-12 bg-brand-fill text-brand-black text-[14px] tracking-[0.25em]
                    opacity-50 cursor-not-allowed"
                >
                  주문하기
                </button>
              ) : (
                <Link
                  href="/checkout"
                  className="block w-full h-12 bg-brand-fill text-brand-black text-[14px] tracking-[0.25em]
                    flex items-center justify-center hover:bg-brand-gray-mid transition-colors"
                >
                  주문하기
                </Link>
              )}

              <Link
                href="/shop"
                className="block text-center text-[14px] tracking-widest text-brand-gray-mid underline hover:text-brand-black transition-colors"
              >
                쇼핑 계속하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem;
  onUpdateQty: (id: string, qty: number, selectedColor?: string, selectedSize?: string) => void;
  onRemove: (id: string, selectedColor?: string, selectedSize?: string) => void;
}) {
  const colorHex = item.product.colors?.find((c) => c.name === item.selectedColor)?.hex;
  const variantLabel = [item.selectedSize, item.selectedColor].filter(Boolean).join(" · ");
  const orderable = isCartItemOrderable(item);

  return (
    <li className="flex gap-4 py-5 first:pt-0 last:pb-0">
      {/* 이미지 */}
      <div className="w-20 aspect-[3/4] bg-brand-gray-light shrink-0 relative overflow-hidden">
        {item.product.imageUrl && (
          <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" />
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <p className="text-[14px] tracking-widest truncate">{item.product.name}</p>
          <p className="text-[15px] text-brand-gray-mid mt-0.5 truncate">{item.product.description}</p>
          {variantLabel && (
            <div className="flex items-center gap-1.5 mt-1">
              {colorHex && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-brand-border"
                  style={{ backgroundColor: colorHex }}
                />
              )}
              <span className="text-[14px] text-brand-gray-mid">{variantLabel}</span>
            </div>
          )}
          {!orderable && (
            <div className="mt-1.5 flex flex-col items-start gap-0.5">
              <p className="text-[13px] text-red-500 tracking-wide">
                상품 정보가 변경되었습니다. 해당 상품을 삭제하고 상품 페이지에서 다시 담아주세요.
              </p>
              <Link
                href={`/shop/${item.product.slug}`}
                className="text-[13px] text-brand-gray-mid underline hover:text-brand-black transition-colors"
              >
                상품 상세로 이동
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          {/* 수량 조절 */}
          <div className="flex items-center border border-brand-border">
            <button
              onClick={() => onUpdateQty(item.product.id, item.quantity - 1, item.selectedColor, item.selectedSize)}
              className="w-8 h-8 flex items-center justify-center text-sm hover:bg-brand-gray-light transition-colors"
              aria-label="수량 감소"
            >
              −
            </button>
            <span className="w-8 text-center text-xs">{item.quantity}</span>
            <button
              onClick={() => onUpdateQty(item.product.id, item.quantity + 1, item.selectedColor, item.selectedSize)}
              className="w-8 h-8 flex items-center justify-center text-sm hover:bg-brand-gray-light transition-colors"
              aria-label="수량 증가"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium">
              ₩{(item.unitPrice * item.quantity).toLocaleString("ko-KR")}
            </span>
            <button
              onClick={() => onRemove(item.product.id, item.selectedColor, item.selectedSize)}
              className="text-brand-gray-mid hover:text-brand-black transition-colors text-base leading-none"
              aria-label="삭제"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
