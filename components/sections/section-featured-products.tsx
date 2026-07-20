"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { mockProducts, CARD_DEFAULT_IMAGE } from "@/lib/mock-data";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import type { Product } from "@/lib/types";

// TODO: 실제 판매 데이터가 쌓이면 베스트 상품 로직(판매량/리뷰 등 기준)으로 교체
// 현재는 구매 데이터가 없어 임의로 GAUZE BIB을 최상단에 고정
const BEST_SLUG = "gauze-bib";

function ProductCard({
  product,
  index,
}: {
  product: Product;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const { add } = useCartStore();
  const { showToast } = useUIStore();

  const displayImage =
    hoveredImage ?? CARD_DEFAULT_IMAGE[product.slug] ?? product.imageUrl;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    add(product, 1, product.colors?.[0]?.name, product.sizes?.[0]?.name);
    showToast(`${product.name} 장바구니에 추가됨`);
  };

  const handleColorHover = (image?: string) => {
    setHoveredImage(image ?? null);
  };

  const handleColorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`relative transition-colors duration-300 ${
        hovered ? "bg-brand-gray-light" : "bg-white"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={`/shop/${product.slug}`} className="block p-5">
        {/* 이미지 */}
        <div className="relative aspect-[3/4] bg-brand-gray-light mb-5 overflow-hidden">
          {displayImage ? (
            <Image
              src={displayImage}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-end p-4">
              <span className="text-[11px] tracking-widest text-brand-border">
                {product.category.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <p className="text-[14px] tracking-widest uppercase mb-1.5">
          {product.name}
        </p>
        <p className="text-[15px] text-brand-gray-mid tracking-wide mb-3">
          {product.shortDescription ?? product.description}
        </p>
        {product.colors && product.colors.length > 0 && (
          <div className="flex gap-1.5 mb-2">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-label={c.name}
                onMouseEnter={() => handleColorHover(c.image)}
                onMouseLeave={() => handleColorHover(undefined)}
                onClick={handleColorClick}
                className="w-3.5 h-3.5 rounded-full border border-brand-border hover:border-brand-gray-mid transition-colors"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}
        <p className="text-sm font-light">
          {product.sizes && product.sizes.length > 0
            ? `₩${Math.min(...product.sizes.map((s) => s.price)).toLocaleString("ko-KR")}~`
            : `₩${product.price.toLocaleString("ko-KR")}`}
        </p>
      </Link>

      {/* hover 시 Add 버튼 */}
      <motion.button
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 4 }}
        transition={{ duration: 0.2 }}
        onClick={handleAdd}
        className="absolute bottom-5 right-5 border border-brand-border-soft bg-white text-[11px] tracking-widest px-3 py-1.5 hover:bg-brand-fill hover:text-brand-black transition-colors"
      >
        ADD →
      </motion.button>
    </motion.div>
  );
}

export default function SectionFeaturedProducts() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const bestProduct = mockProducts.find((p) => p.slug === BEST_SLUG);
  const featuredProducts = bestProduct
    ? [bestProduct, ...mockProducts.filter((p) => p.slug !== BEST_SLUG)]
    : mockProducts;

  return (
    <section id="featured-products" className="bg-white">
      <div className="max-w-screen-xl mx-auto px-6 py-20">
        {/* 헤더 */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-baseline justify-between pb-4"
        >
          <Link
            href="/shop"
            className="text-[14px] tracking-widest hover:text-brand-gray-mid transition-colors"
          >
            SHOP ALL
          </Link>
          <span className="text-[14px] text-brand-gray-mid tracking-wide">
            {featuredProducts.length} Products
          </span>
        </motion.div>

        {/* 제품 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4">
          {featuredProducts.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>

        {/* 하단 링크 */}
        <div className="pt-7 text-right">
          <Link
            href="/shop"
            className="text-[14px] tracking-widest hover:text-brand-gray-mid transition-colors"
          >
            VIEW ALL PRODUCTS →
          </Link>
        </div>
      </div>
    </section>
  );
}
