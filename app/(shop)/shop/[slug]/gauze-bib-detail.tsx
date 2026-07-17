"use client";

import { useState } from "react";
import CompProductGallery from "@/components/comp-product-gallery";
import CompProductInfo from "@/components/comp-product-info";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  initialColor?: string;
}

// GAUZE BIB 전용 히어로: 좌측 이미지 + 우측 구매 정보 골격은 comp-product-gallery/comp-product-info를 그대로 쓰되,
// 선택한 컬러에 맞춰 대표 이미지가 바뀌도록 두 컴포넌트 사이에서 selectedColor를 중개한다.
export default function GauzeBibDetail({ product, initialColor }: Props) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    initialColor ?? product.colors?.[0]?.name
  );

  const colorImage = product.colors?.find((c) => c.name === selectedColor)?.image;

  return (
    <section className="px-4 sm:px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
      {/* TODO: 아기 착용 정면/옆면 사진 없음 — 촬영 후 갤러리 2번째 자리에 추가 */}
      <CompProductGallery
        product={product}
        primaryImage={colorImage}
        primaryImageAlt={`아모리 ${selectedColor ?? ""} 컬러 아기 거즈빕`}
        imageAlts={["아모리 거즈빕 7가지 컬러", "아모리 거즈빕 목둘레 스냅 디테일"]}
      />
      <CompProductInfo
        product={product}
        initialColor={initialColor}
        tagline={product.tagline}
        onColorChange={setSelectedColor}
      />
    </section>
  );
}
