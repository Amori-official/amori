"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { useWishlistStore } from "@/store/wishlist";
import { resolveVariant, isSplitAxisProduct } from "@/lib/resolve-variant";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  initialColor?: string;
  /** 선물포장 애드온용 GIFT BOX 상품(없으면 체크박스 미노출) */
  giftBox?: Product | null;
  /** 상품명 아래에 노출할 한 줄 소개 */
  tagline?: string;
  /** 한 줄 소개 바로 아래에 삽입할 콘텐츠 (예: SIZE/SAFETY/CARE 아코디언) */
  belowTagline?: React.ReactNode;
  /** 선택 컬러가 바뀔 때마다 호출 (갤러리 등 외부 컴포넌트와 동기화용) */
  onColorChange?: (colorName: string) => void;
}

export default function CompProductInfo({ product, initialColor, giftBox, tagline, belowTagline, onColorChange }: Props) {
  const [qty, setQty] = useState(1);
  const [giftWrap, setGiftWrap] = useState(false);
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

  // 색상/사이즈 조합에 실제로 대응하는 DB variant. 옵션 없는 상품은 항상 null.
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const resolvedVariant = resolveVariant(product.variants, selectedColor, selectedSize);
  // 색상 전용 variant와 사이즈 전용 variant만 있고 조합형 variant가 없는 상품은
  // 하나의 variant_id로 색상+사이즈를 동시에 표현할 수 없어 주문 시 한쪽이 유실된다.
  // DB에 조합형 variant가 정비될 때까지 이 상품은 담기/구매 자체를 차단한다.
  const isSplitAxis = isSplitAxisProduct(product.variants);
  // variant가 있는 상품은 "선택 조합이 존재하지 않음" 또는 "품절/판매중지"를 기준으로 판단하고,
  // variant가 없는 상품은 기존과 동일하게 레거시 stock 필드를 기준으로 판단한다.
  const isSoldOut = hasVariants ? !resolvedVariant || !resolvedVariant.isActive : product.stock === 0;
  const isBlocked = isSplitAxis || isSoldOut;

  const displayPrice = selectedSize
    ? (product.sizes?.find((s) => s.name === selectedSize)?.price ?? product.price)
    : product.price;

  const stockLabel = () => {
    if (isSplitAxis) {
      return { text: "상품 옵션을 정비 중입니다. 잠시 후 다시 이용해 주세요.", color: "text-amber-600" };
    }
    if (hasVariants && !resolvedVariant) {
      return { text: "선택하신 옵션 조합은 판매하지 않습니다", color: "text-red-400" };
    }
    if (isSoldOut) return { text: "품절", color: "text-red-400" };
    if (!hasVariants && product.stock <= 5) return { text: `${product.stock}개 남음`, color: "text-amber-500" };
    return { text: "재고 있음", color: "text-green-600" };
  };

  // 선물포장 애드온: 체크 시 GIFT BOX를 별도 라인으로 1개 담는다(옵션 없음 → variantId null).
  const addGiftWrapIfChecked = () => {
    if (giftWrap && giftBox) add(giftBox, 1);
  };

  const handleAddToCart = () => {
    if (isBlocked) return;
    add(product, qty, selectedColor, selectedSize);
    addGiftWrapIfChecked();
    setCartOpen(true);
    showToast(
      giftWrap && giftBox
        ? `${product.name} · 기프트박스 포장이 장바구니에 담겼습니다.`
        : `${product.name}이(가) 장바구니에 담겼습니다.`
    );
  };

  const handleBuyNow = () => {
    if (isBlocked) return;
    if (!user) {
      setAuthModalOpen(true, "login");
      return;
    }
    add(product, qty, selectedColor, selectedSize);
    addGiftWrapIfChecked();
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
      {!isBlocked && (
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

      {/* 선물포장 애드온 */}
      {giftBox && !isBlocked && (
        <label className="flex items-start gap-2.5 border border-brand-border px-3.5 py-3 cursor-pointer hover:border-brand-gray-mid transition-colors">
          <input
            type="checkbox"
            checked={giftWrap}
            onChange={(e) => setGiftWrap(e.target.checked)}
            className="mt-0.5 accent-brand-black w-4 h-4 shrink-0"
          />
          <span className="flex-1 text-[13px] tracking-wide leading-relaxed">
            <span className="text-brand-black">🎁 기프트박스 포장 추가</span>
            <span className="text-brand-gray-mid"> (+₩{giftBox.price.toLocaleString("ko-KR")})</span>
            <br />
            <span className="text-[12px] text-brand-gray-mid">
              기프트 박스와 쇼핑백에 정성껏 포장해 드립니다. 선물용 행택은 부착되며, 행택에 가격은 표기되지 않습니다.
            </span>
          </span>
        </label>
      )}

      {/* CTA 버튼 */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          onClick={handleAddToCart}
          disabled={isBlocked}
          className="flex-1 h-12 border border-brand-border-soft text-brand-black text-[14px] tracking-[0.2em]
            hover:bg-brand-fill hover:text-brand-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isBlocked ? "품절" : "장바구니 담기"}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={isBlocked}
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
