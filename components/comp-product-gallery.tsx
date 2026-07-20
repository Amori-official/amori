"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  /** 대표 이미지를 덮어쓸 때 사용 (예: 선택된 컬러의 단독 컷) */
  primaryImage?: string;
  primaryImageAlt?: string;
  /** product.images와 같은 순서의 alt 텍스트 */
  imageAlts?: string[];
}

export default function CompProductGallery({ product, primaryImage, primaryImageAlt, imageAlts }: Props) {
  const resolvedPrimary = primaryImage ?? product.imageUrl ?? undefined;
  const allImages = [
    ...(resolvedPrimary ? [resolvedPrimary] : []),
    ...product.images,
  ];
  const allAlts = [
    ...(resolvedPrimary ? [primaryImageAlt ?? product.name] : []),
    ...product.images.map((_, i) => imageAlts?.[i] ?? `${product.name} ${i + 2}`),
  ];
  const hasImages = allImages.length > 0;
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 선택 컬러가 바뀌어 대표 이미지가 교체되면 첫 장으로 되돌림
  useEffect(() => {
    setCurrent(0);
    scrollRef.current?.scrollTo({ left: 0 });
  }, [primaryImage]);

  const goTo = (i: number) => {
    setCurrent(i);
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  };

  const emptyState = (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <span className="text-[12px] tracking-[0.3em] text-brand-gray-mid">
        {product.category.toUpperCase()}
      </span>
      <span className="text-[12px] tracking-widest text-brand-border">
        {product.name}
      </span>
    </div>
  );

  return (
    <div id="product-gallery" className="flex flex-col gap-3 lg:sticky lg:top-[60px]">
      <div className="relative">
        {/* 모바일: 스와이프로 넘기는 가로 스크롤 캐러셀 */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="md:hidden flex overflow-x-auto snap-x snap-mandatory scroll-smooth aspect-[3/4] bg-brand-gray-light [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {hasImages ? (
            allImages.map((img, i) => (
              <div key={i} className="relative w-full flex-shrink-0 snap-center">
                <Image
                  src={img}
                  alt={allAlts[i]}
                  fill
                  className="object-cover object-bottom"
                  priority={i === 0}
                />
              </div>
            ))
          ) : (
            <div className="relative w-full flex-shrink-0">{emptyState}</div>
          )}
        </div>

        {/* 데스크톱: 고정 대표 이미지 + 썸네일 클릭 (3:4 비율 고정) */}
        <div className="hidden md:block aspect-[3/4] relative overflow-hidden bg-brand-gray-light">
          {hasImages ? (
            <Image
              src={allImages[current]}
              alt={allAlts[current]}
              fill
              className="object-cover object-bottom"
              priority
            />
          ) : (
            emptyState
          )}
        </div>

        {/* 모바일: 이미지 인덱스 표시 */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5 md:hidden">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`${i + 1}번째 이미지로 이동`}
                className="p-2 -m-2"
              >
                <span
                  className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                    i === current ? "bg-brand-gray-mid" : "bg-brand-border"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 썸네일 리스트 (데스크톱, 이미지가 여러 장일 때) */}
      {allImages.length > 1 && (
        <div className="hidden md:flex gap-2 overflow-x-auto">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-16 aspect-[3/4] relative overflow-hidden bg-brand-gray-light border-[1.5px] transition-colors ${
                i === current ? "border-brand-black" : "border-transparent"
              }`}
            >
              <Image src={img} alt={allAlts[i]} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
