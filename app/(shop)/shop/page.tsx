// 60초마다 재검증
export const revalidate = 60;

import { Suspense } from "react";
import { getProducts } from "@/app/actions/products";
import CompShopFilters from "@/components/comp-shop-filters";
import CompProductCard from "@/components/comp-product-card";

interface SearchParams {
  category?: string | string[];
  sort?: string | string[];
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const category =
    typeof searchParams.category === "string" ? searchParams.category : undefined;
  const sort =
    typeof searchParams.sort === "string" ? searchParams.sort : undefined;

  // 전체 게시 상품을 먼저 불러와 "상품이 있는 카테고리"만 탭에 노출한다
  // (빈 카테고리 숨김 — 카드사 심사 요구사항).
  const everything = await getProducts({ sort });
  const availableCategories = Array.from(
    new Set(everything.map((p) => p.category).filter((c): c is string => !!c))
  );

  const inCategory =
    category && category !== "all"
      ? everything.filter((p) => p.category === category)
      : everything;
  const products = inCategory.filter((p) => !p.isComingSoon);
  const comingSoon = inCategory.filter((p) => p.isComingSoon);

  return (
    <div className="pt-[60px] min-h-screen">
      {/* ── 헤더 ──────────────────────────────────────────── */}
      <section id="shop-header" className="px-4 sm:px-8 lg:px-16 pt-14 pb-2">
        <div className="flex items-end justify-between">
          <h1 className="text-4xl sm:text-5xl font-light tracking-[0.15em]">SHOP</h1>
          <p className="text-[14px] tracking-widest text-brand-gray-mid pb-1">
            {products.length}개 제품
          </p>
        </div>

        <Suspense fallback={null}>
          <CompShopFilters category={category} sort={sort} availableCategories={availableCategories} />
        </Suspense>
      </section>

      {/* ── 제품 그리드 ─────────────────────────────────────── */}
      <section
        id="shop-grid"
        className="px-4 sm:px-8 lg:px-16 py-10"
      >
        {products.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-brand-gray-mid text-sm tracking-wide">
            해당 카테고리에 제품이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
            {products.map((product) => (
              <CompProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── Coming Soon ──────────────────────────────────────── */}
      {comingSoon.length > 0 && (
        <section
          id="shop-coming-soon"
          className="px-4 sm:px-8 lg:px-16 py-14 border-t border-brand-border"
        >
          <div className="mb-8">
            <h2 className="text-[14px] tracking-[0.3em] text-brand-gray-mid">COMING SOON</h2>
            <p className="text-xs text-brand-gray-mid tracking-wide mt-1">
              곧 출시될 새로운 제품들입니다
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
            {comingSoon.map((product) => (
              <CompProductCard key={product.id} product={product} comingSoon />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
