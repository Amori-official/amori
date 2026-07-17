"use client";

import { useEffect, useState } from "react";
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

  // 선택 컬러가 바뀌어 대표 이미지가 교체되면 첫 장으로 되돌림
  useEffect(() => {
    setCurrent(0);
  }, [primaryImage]);

  return (
    <div id="product-gallery" className="flex flex-col gap-3 lg:sticky lg:top-[60px]">
      {/* 메인 이미지 */}
      <div className="aspect-[3/4] lg:aspect-auto lg:h-[calc(100vh-160px)] relative overflow-hidden bg-brand-gray-light">
        {hasImages ? (
          <Image
            src={allImages[current]}
            alt={allAlts[current]}
            fill
            className="object-cover object-bottom"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-[12px] tracking-[0.3em] text-brand-gray-mid">
              {product.category.toUpperCase()}
            </span>
            <span className="text-[12px] tracking-widest text-brand-border">
              {product.name}
            </span>
          </div>
        )}

        {/* 모바일: 이미지 인덱스 표시 */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5 md:hidden">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === current ? "bg-brand-gray-mid" : "bg-brand-border"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 썸네일 리스트 (이미지가 여러 장일 때) */}
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
