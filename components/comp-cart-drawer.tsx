"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/ui";
import { useCartStore, type CartItem } from "@/store/cart";

const FREE_SHIPPING = 50000;

export default function CompCartDrawer() {
  const [mounted, setMounted] = useState(false);
  const { cartOpen, setCartOpen } = useUIStore();
  const { items, updateQty, remove, total } = useCartStore();

  useEffect(() => setMounted(true), []);

  const cartTotal = mounted ? total() : 0;
  const remaining = Math.max(0, FREE_SHIPPING - cartTotal);
  const progress = Math.min(100, (cartTotal / FREE_SHIPPING) * 100);
  const displayItems: CartItem[] = mounted ? items : [];

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* 오버레이 */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setCartOpen(false)}
          />

          {/* 드로어 */}
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-[400px] bg-white flex flex-col shadow-2xl"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-brand-border shrink-0">
              <h2 className="text-[12px] tracking-[0.3em]">
                CART ({displayItems.reduce((s, i) => s + i.quantity, 0)})
              </h2>
              <button
                onClick={() => setCartOpen(false)}
                className="text-2xl leading-none text-brand-gray-mid hover:text-brand-black transition-colors"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            {/* 무료배송 프로그레스 바 */}
            <div className="px-6 py-3 bg-brand-gray-light shrink-0">
              <p className="text-[12px] tracking-wide text-brand-gray-mid">
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

            {/* 아이템 목록 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {displayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-brand-gray-mid">
                  <p className="text-sm tracking-wide">장바구니가 비어있습니다.</p>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="text-[12px] tracking-widest underline hover:text-brand-black transition-colors"
                  >
                    쇼핑 계속하기
                  </button>
                </div>
              ) : (
                <ul className="space-y-5">
                  {displayItems.map((item) => (
                    <CartItemRow
                      key={`${item.product.id}-${item.selectedColor ?? "default"}`}
                      item={item}
                      onUpdateQty={updateQty}
                      onRemove={remove}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* 푸터: 합계 + 결제 버튼 */}
            {displayItems.length > 0 && (
              <div className="border-t border-brand-border px-6 py-5 space-y-4 shrink-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="tracking-wide text-brand-gray-mid">합계</span>
                  <span className="font-medium">
                    ₩{cartTotal.toLocaleString("ko-KR")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-brand-gray-mid tracking-wide pb-1">
                  <span>배송비</span>
                  <span>{remaining > 0 ? "₩3,000" : "무료"}</span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setCartOpen(false)}
                  className="block w-full h-12 bg-brand-fill text-brand-black text-[12px] tracking-[0.25em]
                    flex items-center justify-center hover:bg-brand-gray-mid transition-colors"
                >
                  결제하기
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem;
  onUpdateQty: (id: string, qty: number, selectedColor?: string) => void;
  onRemove: (id: string, selectedColor?: string) => void;
}) {
  const colorHex = item.product.colors?.find((c) => c.name === item.selectedColor)?.hex;

  return (
    <li className="flex gap-3">
      {/* 이미지 */}
      <div className="w-16 aspect-[3/4] bg-brand-gray-light shrink-0 relative overflow-hidden">
        {item.product.imageUrl && (
          <Image
            src={item.product.imageUrl}
            alt={item.product.name}
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <p className="text-[12px] tracking-widest truncate">{item.product.name}</p>
          <p className="text-[13px] text-brand-gray-mid mt-0.5 truncate">
            {item.product.description}
          </p>
          {item.selectedColor && (
            <div className="flex items-center gap-1.5 mt-1">
              {colorHex && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-brand-border"
                  style={{ backgroundColor: colorHex }}
                />
              )}
              <span className="text-[12px] text-brand-gray-mid">{item.selectedColor}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          {/* 수량 조절 */}
          <div className="flex items-center border border-brand-border">
            <button
              onClick={() => onUpdateQty(item.product.id, item.quantity - 1, item.selectedColor)}
              className="w-7 h-7 flex items-center justify-center text-sm hover:bg-brand-gray-light transition-colors"
            >
              −
            </button>
            <span className="w-7 text-center text-xs">{item.quantity}</span>
            <button
              onClick={() => onUpdateQty(item.product.id, item.quantity + 1, item.selectedColor)}
              className="w-7 h-7 flex items-center justify-center text-sm hover:bg-brand-gray-light transition-colors"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium">
              ₩{(item.product.price * item.quantity).toLocaleString("ko-KR")}
            </span>
            <button
              onClick={() => onRemove(item.product.id, item.selectedColor)}
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
