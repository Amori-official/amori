import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getProductReviews } from "@/app/actions/products";
import CompProductGallery from "@/components/comp-product-gallery";
import CompProductInfo from "@/components/comp-product-info";
import ProductReviews from "./product-reviews";

// 30초마다 재검증
export const revalidate = 30;

interface Props {
  params: { slug: string };
  searchParams: { color?: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amori.kr";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Not Found" };

  const description = product.description.slice(0, 120);
  const images = product.imageUrl
    ? [{ url: product.imageUrl, width: 800, height: 1067, alt: product.name }]
    : [];

  return {
    title: `${product.name} — AMORI`,
    description,
    openGraph: {
      title: `${product.name} — AMORI`,
      description,
      images,
      type: "website",
    },
    twitter: { card: "summary_large_image", title: `${product.name} — AMORI`, description, images: images.map(i => i.url) },
  };
}

export default async function ProductDetailPage({ params, searchParams }: Props) {
  const [product, reviews] = await Promise.all([
    getProductBySlug(params.slug),
    getProductReviews(params.slug),
  ]);

  if (!product) notFound();

  const productReviews = reviews.filter(
    (r) => r.productId === product.id || r.productId === params.slug
  );

  // Product JSON-LD 구조화 데이터
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.imageUrl ? [product.imageUrl] : [],
    brand: { "@type": "Brand", name: "AMORI" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/shop/${product.slug}`,
      priceCurrency: "KRW",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "AMORI" },
    },
    ...(product.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviewCount ?? 0,
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pt-[60px] min-h-screen">

        {/* 브레드크럼 */}
        <nav className="px-4 sm:px-8 lg:px-16 py-4 text-[12px] tracking-widest text-brand-gray-mid flex gap-2">
          <a href="/shop" className="hover:text-brand-black transition-colors">SHOP</a>
          <span>/</span>
          <span className="text-brand-black">{product.name}</span>
        </nav>

        {/* ── 1. 갤러리 + 구매 패널 ── */}
        <section className="px-4 sm:px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
          <CompProductGallery product={product} />
          <CompProductInfo product={product} initialColor={searchParams.color} />
        </section>

        {/* ── 2·5·3·4. 통합 상세 블록 ── */}
        <div className="border-t border-brand-border bg-brand-gray-light">

          {/* 2. MORE INFORMATION */}
          {product.description && (
            <section className="px-4 sm:px-8 lg:px-16 pt-16 lg:pt-20 pb-12">
              <p className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-8">
                More Information
              </p>
              <p className="text-sm text-brand-gray-mid tracking-wide leading-9 max-w-3xl">
                {product.description}
              </p>
            </section>
          )}

          {/* 5. 스펙 — 2×2 그리드, 항상 표시 */}
          <section className="px-4 sm:px-8 lg:px-16 pb-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
              {product.material && (
                <div className="flex flex-col gap-3">
                  <p className="text-[12px] tracking-widest text-brand-black">소재 정보</p>
                  <p className="text-xs text-brand-gray-mid tracking-wide leading-7 whitespace-pre-line">{product.material}</p>
                </div>
              )}
              {product.sizeGuide && (
                <div className="flex flex-col gap-3">
                  <p className="text-[12px] tracking-widest text-brand-black">사이즈 가이드</p>
                  <p className="text-xs text-brand-gray-mid tracking-wide leading-7 whitespace-pre-line">{product.sizeGuide}</p>
                </div>
              )}
              {product.careInstructions && (
                <div className="flex flex-col gap-3">
                  <p className="text-[12px] tracking-widest text-brand-black">세탁 및 관리</p>
                  <p className="text-xs text-brand-gray-mid tracking-wide leading-7 whitespace-pre-line">{product.careInstructions}</p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <p className="text-[12px] tracking-widest text-brand-black">배송 안내</p>
                <p className="text-xs text-brand-gray-mid tracking-wide leading-7 whitespace-pre-line">
                  {`평일 오전 11시 이전 주문 시 당일 출고\n배송 기간: 1–3 영업일 (도서산간 제외)\n30,000원 이상 무료배송`}
                </p>
              </div>
            </div>
          </section>

          {/* 3. 제품 특징 */}
          {product.features && product.features.length > 0 && (
            <section className="px-4 sm:px-8 lg:px-16 py-12">
              <p className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-8">Features</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
                {product.features.map((f) => (
                  <div key={f.label} className="flex flex-col gap-2.5">
                    <p className="text-[12px] tracking-widest text-brand-black">{f.label}</p>
                    <p className="text-xs text-brand-gray-mid tracking-wide leading-7">{f.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. 브랜드 스토리 */}
          {product.brandStory && (
            <section className="px-4 sm:px-8 lg:px-16 py-14">
              <p className="text-sm text-brand-gray-mid tracking-wide leading-9 max-w-2xl">
                {product.brandStory}
              </p>
            </section>
          )}

        </div>

        {/* ── 6. 리뷰 ── */}
        <section
          id="product-reviews"
          className="border-t border-brand-border px-4 sm:px-8 lg:px-16 py-16"
        >
          <ProductReviews reviews={productReviews} productId={product.id} />
        </section>

      </div>
    </>
  );
}
