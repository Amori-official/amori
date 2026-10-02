import { getProducts } from "@/app/actions/products";
import FeaturedProductsClient from "./section-featured-products-client";

// TODO: 실제 판매 데이터가 쌓이면 베스트 상품 로직(판매량/리뷰 등 기준)으로 교체
// 현재는 구매 데이터가 없어 임의로 GAUZE BIB을 최상단에 고정
const BEST_SLUG = "gauze-bib";

// 홈 추천상품은 DB(getProducts)에서 불러온다 — 상품을 업로드하면 홈에도 자동 연동된다.
// 판매 중단/품절이 아닌 게시 상품(Coming Soon 제외)만 노출.
export default async function SectionFeaturedProducts() {
  const all = await getProducts();
  const sellable = all.filter((p) => !p.isComingSoon);

  const best = sellable.find((p) => p.slug === BEST_SLUG);
  const products = best
    ? [best, ...sellable.filter((p) => p.slug !== BEST_SLUG)]
    : sellable;

  return <FeaturedProductsClient products={products} />;
}
