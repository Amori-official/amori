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
