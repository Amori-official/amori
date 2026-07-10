"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { mockProducts } from "@/lib/mock-data";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import type { Product } from "@/lib/types";

function ProductCard({
  product,
  index,
}: {
  product: Product;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const { add } = useCartStore();
  const { showToast } = useUIStore();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    add(product, 1, product.colors?.[0]?.name);
    showToast(`${product.name} 장바구니에 추가됨`);
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
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-end p-4">
              <span className="text-[9px] tracking-widest text-brand-border">
                {product.category.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <p className="text-[12px] tracking-widest uppercase mb-1.5">
          {product.name}
        </p>
        <p className="text-[13px] text-brand-gray-mid tracking-wide mb-3">
          {product.description}
        </p>
        <p className="text-sm font-light">
          ₩{product.price.toLocaleString("ko-KR")}
        </p>
      </Link>

      {/* hover 시 Add 버튼 */}
      <motion.button
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 4 }}
        transition={{ duration: 0.2 }}
        onClick={handleAdd}
        className="absolute bottom-5 right-5 border border-brand-border-soft bg-white text-[9px] tracking-widest px-3 py-1.5 hover:bg-brand-fill hover:text-brand-black transition-colors"
      >
        ADD →
      </motion.button>
    </motion.div>
  );
}

export default function SectionFeaturedProducts() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

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
            className="text-[12px] tracking-widest hover:text-brand-gray-mid transition-colors"
          >
            SHOP ALL
          </Link>
          <span className="text-[12px] text-brand-gray-mid tracking-wide">
            {mockProducts.length} Products
          </span>
        </motion.div>

        {/* 제품 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4">
          {mockProducts.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>

        {/* 하단 링크 */}
        <div className="pt-7 text-right">
          <Link
            href="/shop"
            className="text-[12px] tracking-widest hover:text-brand-gray-mid transition-colors"
          >
            VIEW ALL PRODUCTS →
          </Link>
        </div>
      </div>
    </section>
  );
}
