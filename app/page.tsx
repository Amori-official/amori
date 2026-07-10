import SectionHero from "@/components/sections/section-hero";
import SectionFeaturedProducts from "@/components/sections/section-featured-products";
import SectionBrandStory from "@/components/sections/section-brand-story";
import SectionWhyAmori from "@/components/sections/section-why-amori";
import SectionReviews from "@/components/sections/section-reviews";
import SectionNewsletter from "@/components/sections/section-newsletter";

export default function HomePage() {
  return (
    <>
      <SectionHero />
      <SectionFeaturedProducts />
      <SectionBrandStory />
      <SectionWhyAmori />
      <SectionReviews />
      <SectionNewsletter />
    </>
  );
}
