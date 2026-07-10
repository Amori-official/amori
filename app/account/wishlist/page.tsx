"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import type { Product } from "@/lib/types";

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const { items, remove } = useWishlistStore();
  const { add } = useCartStore();
  const { setCartOpen, showToast } = useUIStore();

  useEffect(() => setMounted(true), []);

  const displayItems: Product[] = mounted ? items : [];

  return (
    <div id="account-wishlist" className="p-6 sm:p-8">
      <h2 className="text-[12px] tracking-[0.3em] mb-6 border-b border-brand-border pb-4">
        위시리스트 ({displayItems.length})
      </h2>

      {displayItems.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <p className="text-brand-gray-mid text-sm tracking-wide">위시리스트가 비어있습니다.</p>
          <Link
            href="/shop"
            className="text-[12px] tracking-widest underline hover:text-brand-gray-mid transition-colors"
          >
            쇼핑 계속하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {displayItems.map((product) => (
            <div key={product.id} className="group">
              <Link href={`/shop/${product.slug}`} className="block">
                <div className="aspect-[3/4] bg-brand-gray-light relative overflow-hidden mb-2">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[12px] tracking-widest text-brand-gray-mid">
                      {product.name}
                    </span>
                  </div>
                </div>
                <p className="text-[12px] tracking-widest">{product.name}</p>
                <p className="text-xs text-brand-gray-mid mt-0.5 truncate">{product.description}</p>
                <p className="text-sm mt-1">₩{product.price.toLocaleString("ko-KR")}</p>
              </Link>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    add(product);
                    setCartOpen(true);
                    showToast(`${product.name}이(가) 장바구니에 담겼습니다.`);
                  }}
                  className="flex-1 h-8 bg-brand-fill text-brand-black text-[9px] tracking-widest hover:bg-brand-fill-hover transition-colors"
                >
                  장바구니 담기
                </button>
                <button
                  onClick={() => remove(product.id)}
                  className="w-8 h-8 border border-brand-border text-brand-gray-mid hover:border-brand-black hover:text-brand-black transition-colors flex items-center justify-center text-base"
                  aria-label="위시리스트에서 제거"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
