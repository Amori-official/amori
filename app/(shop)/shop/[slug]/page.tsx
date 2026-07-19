import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getProductReviews } from "@/app/actions/products";
import ProductDetailHero from "./product-detail-hero";
import ProductDetailSections from "./product-detail-sections";
import type { Product } from "@/lib/types";

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
  const product = await getProductBySlug(params.slug);

  if (!product) notFound();

  const productReviews = await getProductReviews(product.id);

  const relatedProducts = product.relatedProductSlugs?.length
    ? (
        await Promise.all(product.relatedProductSlugs.map((slug) => getProductBySlug(slug)))
      ).filter((p): p is Product => p !== null)
    : [];

  // Product JSON-LD 구조화 데이터 (인증 정보는 제품마다 다를 수 있어 포함하지 않음)
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

        <ProductDetailHero product={product} initialColor={searchParams.color} />

        <ProductDetailSections
          product={product}
          reviews={productReviews}
          relatedProducts={relatedProducts}
        />

      </div>
    </>
  );
}
