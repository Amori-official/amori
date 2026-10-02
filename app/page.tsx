// 60초마다 재검증 — 상품 업로드/수정이 홈 추천상품에도 반영된다.
export const revalidate = 60;

import SectionHero from "@/components/sections/section-hero";
import SectionFeaturedProducts from "@/components/sections/section-featured-products";
import SectionWhyAmori from "@/components/sections/section-why-amori";
import SectionReviews from "@/components/sections/section-reviews";

export default function HomePage() {
  return (
    <>
      <SectionHero />
      <SectionFeaturedProducts />
      <SectionWhyAmori />
      <SectionReviews />
    </>
  );
}
