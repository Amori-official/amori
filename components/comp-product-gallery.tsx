"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export default function CompProductGallery({ product }: Props) {
  const allImages = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...product.images,
  ];
  const hasImages = allImages.length > 0;
  const [current, setCurrent] = useState(0);

  return (
    <div id="product-gallery" className="flex flex-col gap-3 lg:sticky lg:top-[60px]">
      {/* 메인 이미지 */}
      <div className="aspect-[3/4] lg:aspect-auto lg:h-[calc(100vh-160px)] relative overflow-hidden bg-brand-gray-light">
        {hasImages ? (
          <Image
            src={allImages[current]}
            alt={product.name}
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
              <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
