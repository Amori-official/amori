"use client";

import { useState } from "react";
import CompProductGallery from "@/components/comp-product-gallery";
import CompProductInfo from "@/components/comp-product-info";
import { AccordionItem, CareIconRow } from "./product-accordion";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  initialColor?: string;
}

const KC_CERT_NUMBER = "CB014H2463-6001";

// GAUZE BIB 전용 히어로: 좌측 이미지 + 우측 구매 정보 골격은 comp-product-gallery/comp-product-info를 그대로 쓰되,
// 선택한 컬러에 맞춰 대표 이미지가 바뀌도록 두 컴포넌트 사이에서 selectedColor를 중개한다.
export default function GauzeBibDetail({ product, initialColor }: Props) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    initialColor ?? product.colors?.[0]?.name
  );

  const colorImage = product.colors?.find((c) => c.name === selectedColor)?.image;

  return (
    <section className="px-4 sm:px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
      <CompProductGallery
        product={product}
        primaryImage={colorImage}
        primaryImageAlt={`아모리 ${selectedColor ?? ""} 컬러 아기 거즈빕`}
        imageAlts={[
          "아모리 거즈빕 아기 착용 정면",
          "아모리 거즈빕 아기 착용 옆면",
          "아모리 거즈빕 7가지 컬러",
          "아모리 거즈빕 스냅 디테일",
        ]}
      />
      <CompProductInfo
        product={product}
        initialColor={initialColor}
        tagline={product.tagline}
        belowTagline={
          <div className="border-t border-brand-border">
            {product.sizeGuide && <AccordionItem title="SIZE">{product.sizeGuide}</AccordionItem>}
            <AccordionItem title="SAFETY CERTIFICATION">
              {`어린이제품 안전기준에 따른 시험을 완료했습니다.\n\n인증구분: 어린이제품 공통안전기준(KC)\n인증번호: ${KC_CERT_NUMBER}`}
            </AccordionItem>
            {product.careInstructions && (
              <AccordionItem title="CARE">
                <CareIconRow />
                {product.careInstructions}
              </AccordionItem>
            )}
          </div>
        }
        onColorChange={setSelectedColor}
      />
    </section>
  );
}
