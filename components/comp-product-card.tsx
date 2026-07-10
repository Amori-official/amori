"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  comingSoon?: boolean;
}

export default function CompProductCard({ product, comingSoon }: Props) {
  const [notifyDone, setNotifyDone] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors?.[0]?.name
  );
  const { add } = useCartStore();
  const { setCartOpen, showToast } = useUIStore();

  const isSoldOut = product.stock === 0 && !product.isComingSoon;
  const isComingSoon = comingSoon || product.isComingSoon;

  const href = isComingSoon
    ? "#"
    : selectedColor
      ? `/shop/${product.slug}?color=${encodeURIComponent(selectedColor)}`
      : `/shop/${product.slug}`;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(product, 1, selectedColor);
    setCartOpen(true);
  };

  const handleSelectColor = (e: React.MouseEvent, colorName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColor(colorName);
  };

  const handleNotify = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotifyDone(true);
    showToast("출시 알림이 신청되었습니다!");
  };

  return (
    <Link
      href={href}
      className={`group block ${isComingSoon ? "opacity-50 cursor-default" : ""}`}
    >
      {/* 이미지 영역 */}
      <div className="aspect-[3/4] relative overflow-hidden bg-brand-gray-light">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        {/* SOLD OUT 오버레이 */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-[12px] tracking-[0.3em] text-brand-gray-mid">SOLD OUT</span>
          </div>
        )}

        {/* 빠른 담기 버튼 (일반 상품만) */}
        {!isSoldOut && !isComingSoon && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-0 inset-x-0 h-10 bg-brand-fill text-brand-black text-[9px] tracking-[0.2em]
              opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
              transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <span>+</span>
            <span>빠른 담기</span>
          </button>
        )}
      </div>

      {/* 정보 */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[12px] tracking-[0.2em] text-brand-black">{product.name}</p>
          {product.nameKo && (
            <p className="text-[11px] text-brand-gray-mid tracking-wide shrink-0">{product.nameKo}</p>
          )}
        </div>

        {/* 컬러 스와치 (선택 가능) */}
        {product.colors && product.colors.length > 0 && (
          <div className="flex gap-1.5 pt-0.5">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={selectedColor === c.name}
                onClick={(e) => handleSelectColor(e, c.name)}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  selectedColor === c.name
                    ? "border-brand-black ring-1 ring-brand-black ring-offset-1"
                    : "border-brand-border hover:border-brand-gray-mid"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-0.5">
          <p className="text-sm">₩{product.price.toLocaleString("ko-KR")}</p>
          {(product.reviewCount ?? 0) > 0 && (
            <p className="text-[12px] text-brand-gray-mid">
              ★ {product.rating?.toFixed(1)} ({product.reviewCount})
            </p>
          )}
        </div>

        {/* 출시 알림 신청 */}
        {isComingSoon && (
          <button
            onClick={handleNotify}
            className="text-[12px] tracking-wide underline text-brand-gray-mid pt-0.5 block"
          >
            {notifyDone ? "알림 신청 완료" : "출시 알림 신청"}
          </button>
        )}
      </div>
    </Link>
  );
}
