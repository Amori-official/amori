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

// 상단 갤러리 + 구매 정보 히어로. comp-product-gallery/comp-product-info를 그대로 쓰되,
// 선택한 컬러에 맞춰 대표 이미지가 바뀌도록 두 컴포넌트 사이에서 selectedColor를 중개한다.
// SIZE/SAFETY CERTIFICATION/CARE 아코디언은 상품 데이터(sizeGuide/certificationNumber/careInstructions)가
// 있을 때만 노출되며, 인증번호가 없는 상품은 SAFETY CERTIFICATION 자체가 렌더링되지 않는다.
export default function ProductDetailHero({ product, initialColor }: Props) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    initialColor ?? product.colors?.[0]?.name
  );

  const colorImage = product.colors?.find((c) => c.name === selectedColor)?.image;
  const subject = product.imageAltSubject ?? product.name;
  const primaryImageAlt = selectedColor ? `아모리 ${selectedColor} 컬러 ${subject}` : `아모리 ${subject}`;

  // sizeGuide는 빈 문자열("")이면 SIZE 아코디언은 노출하되 내용은 비워둔다(예: 사이즈 미확정 상품).
  // undefined일 때만 SIZE 아코디언 자체를 숨긴다.
  const hasAccordion =
    product.sizeGuide !== undefined ||
    Boolean(product.certificationNumber) ||
    Boolean(product.careInstructions) ||
    Boolean(product.accordionItems?.length);

  return (
    <section className="px-4 sm:px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
      <CompProductGallery
        product={product}
        primaryImage={colorImage}
        primaryImageAlt={primaryImageAlt}
        imageAlts={product.imageAlts}
      />
      <CompProductInfo
        product={product}
        initialColor={initialColor}
        tagline={product.tagline}
        belowTagline={
          hasAccordion && (
            <div className="border-t border-brand-border">
              {product.sizeGuide !== undefined && (
                <AccordionItem title="SIZE">{product.sizeGuide}</AccordionItem>
              )}
              {product.certificationNumber && (
                <AccordionItem title="SAFETY CERTIFICATION">
                  {product.certificationText ??
                    `어린이제품 안전기준에 따른 시험을 완료했습니다.\n\n인증구분: 어린이제품 공통안전기준(KC)\n인증번호: ${product.certificationNumber}`}
                </AccordionItem>
              )}
              {product.careInstructions && (
                <AccordionItem title="CARE">
                  <CareIconRow />
                  {product.careInstructions}
                </AccordionItem>
              )}
              {product.accordionItems?.map((item) => (
                <AccordionItem key={item.title} title={item.title}>
                  {item.content}
                </AccordionItem>
              ))}
            </div>
          )
        }
        onColorChange={setSelectedColor}
      />
    </section>
  );
}
