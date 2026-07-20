"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { useWishlistStore } from "@/store/wishlist";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  initialColor?: string;
  /** 상품명 아래에 노출할 한 줄 소개 */
  tagline?: string;
  /** 한 줄 소개 바로 아래에 삽입할 콘텐츠 (예: SIZE/SAFETY/CARE 아코디언) */
  belowTagline?: React.ReactNode;
  /** 선택 컬러가 바뀔 때마다 호출 (갤러리 등 외부 컴포넌트와 동기화용) */
  onColorChange?: (colorName: string) => void;
}

export default function CompProductInfo({ product, initialColor, tagline, belowTagline, onColorChange }: Props) {
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    initialColor ?? product.colors?.[0]?.name
  );
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes?.[0]?.name
  );

  useEffect(() => {
    if (selectedColor) onColorChange?.(selectedColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor]);
  const { add } = useCartStore();
  const { setCartOpen, setAuthModalOpen, showToast } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const { toggle: toggleWishlist, has: inWishlist } = useWishlistStore();
  const router = useRouter();

  const isSoldOut = product.stock === 0;

  const displayPrice = selectedSize
    ? (product.sizes?.find((s) => s.name === selectedSize)?.price ?? product.price)
    : product.price;

  const stockLabel = () => {
    if (isSoldOut) return { text: "품절", color: "text-red-400" };
    if (product.stock <= 5) return { text: `${product.stock}개 남음`, color: "text-amber-500" };
    return { text: "재고 있음", color: "text-green-600" };
  };

  const handleAddToCart = () => {
    add(product, qty, selectedColor, selectedSize);
    setCartOpen(true);
    showToast(`${product.name}이(가) 장바구니에 담겼습니다.`);
  };

  const handleBuyNow = () => {
    if (!user) {
      setAuthModalOpen(true, "login");
      return;
    }
    add(product, qty, selectedColor, selectedSize);
    router.push("/checkout?direct=true");
  };

  const stockInfo = stockLabel();

  return (
    <div id="product-info" className="flex flex-col gap-5 px-0 lg:px-12 py-4 lg:py-10">
      {/* 카테고리 */}
      <p className="text-[14px] tracking-[0.3em] text-brand-gray-mid uppercase">
        {product.category}
      </p>

      {/* 제품명 */}
      <h1 className="text-2xl sm:text-3xl font-light tracking-[0.15em] text-brand-black uppercase">
        {product.name}
      </h1>

      {/* 한 줄 소개 */}
      {tagline && (
        <p className="text-xs text-brand-gray-mid tracking-wide">{tagline}</p>
      )}

      {belowTagline}

      {/* 가격 */}
      <p className="text-xl tracking-wide">
        ₩{displayPrice.toLocaleString("ko-KR")}
      </p>

      {/* 사이즈 선택 (사이즈별 가격이 다른 상품만) */}
      {product.sizes && product.sizes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] tracking-widest text-brand-gray-mid">
            SIZE{selectedSize ? ` · ${selectedSize}` : ""}
          </p>
          <div className="flex gap-2">
            {product.sizes.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSelectedSize(s.name)}
                aria-pressed={selectedSize === s.name}
                className={`h-10 px-4 border text-[14px] tracking-widest transition-all ${
                  selectedSize === s.name
                    ? "border-brand-black bg-brand-black text-white"
                    : "border-brand-border text-brand-black hover:border-brand-gray-mid"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 평점 */}
      {(product.reviewCount ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-xs text-brand-gray-mid">
          <span className="text-amber-400">{"★".repeat(Math.round(product.rating ?? 0))}</span>
          <span>{product.rating?.toFixed(1)}</span>
          <span>({product.reviewCount}개 리뷰)</span>
        </div>
      )}

      {/* 컬러 선택 */}
      {product.colors && product.colors.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] tracking-widest text-brand-gray-mid">
            COLOR{selectedColor ? ` · ${selectedColor}` : ""}
          </p>
          <div className="flex gap-2">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedColor(c.name)}
                aria-label={c.name}
                aria-pressed={selectedColor === c.name}
                className={`w-8 h-8 rounded-full border transition-all ${
                  selectedColor === c.name
                    ? "border-brand-black ring-1 ring-brand-black ring-offset-2"
                    : "border-brand-border hover:border-brand-gray-mid"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 재고 */}
      <p className={`text-xs tracking-wide ${stockInfo.color}`}>{stockInfo.text}</p>

      {/* 수량 */}
      {!isSoldOut && (
        <div className="flex items-center gap-0 border border-brand-border w-fit">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-lg hover:bg-brand-gray-light transition-colors"
          >
            −
          </button>
          <span className="w-12 text-center text-sm tracking-widest">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            className="w-10 h-10 flex items-center justify-center text-lg hover:bg-brand-gray-light transition-colors"
          >
            +
          </button>
        </div>
      )}

      {/* CTA 버튼 */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          onClick={handleAddToCart}
          disabled={isSoldOut}
          className="flex-1 h-12 border border-brand-border-soft text-brand-black text-[14px] tracking-[0.2em]
            hover:bg-brand-fill hover:text-brand-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSoldOut ? "품절" : "장바구니 담기"}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={isSoldOut}
          className="flex-1 h-12 bg-brand-fill text-brand-black text-[14px] tracking-[0.2em]
            hover:bg-brand-gray-mid transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          바로 구매하기
        </button>
      </div>

      {/* 위시리스트 */}
      <button
        onClick={() => {
          toggleWishlist(product);
          showToast(inWishlist(product.id) ? "위시리스트에서 제거되었습니다." : "위시리스트에 추가되었습니다.");
        }}
        className="text-[14px] tracking-widest text-brand-gray-mid hover:text-brand-black transition-colors flex items-center gap-1.5"
      >
        <span>{inWishlist(product.id) ? "♥" : "♡"}</span>
        <span>{inWishlist(product.id) ? "위시리스트에서 제거" : "위시리스트에 추가"}</span>
      </button>

      {/* 무료배송 안내 */}
      <p className="text-[15px] text-brand-gray-mid tracking-wide">
        50,000원 이상 무료배송 · 제주/도서산간 추가 배송비 6,000원
      </p>
    </div>
  );
}
