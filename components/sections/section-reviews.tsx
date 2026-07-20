"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// TODO: 실제 구매 후기 확보 후 채워넣기 (가상 후기 데이터 삭제됨)
const reviews: { stars: number; text: string; name: string; product: string }[] = [];

export default function SectionReviews() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  if (reviews.length === 0) return null;

  return (
    <section id="reviews" className="bg-brand-gray-light">
      <div className="max-w-screen-xl mx-auto px-6 py-20">
        {/* 헤더 */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-baseline justify-between pb-4"
        >
          <p className="text-[14px] tracking-widest">CUSTOMER REVIEWS</p>
          <span className="text-[14px] text-brand-gray-mid">★★★★★ 4.9</span>
        </motion.div>

        {/* 3열 후기 */}
        <div className="grid grid-cols-1 md:grid-cols-3">
          {reviews.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="p-8"
            >
              <p className="text-brand-gray-mid text-sm mb-4">
                {"★".repeat(r.stars)}
              </p>
              <p className="text-sm tracking-wide leading-8 mb-7">{r.text}</p>
              <div className="border-t border-brand-border pt-4">
                <p className="text-[14px] tracking-widest">{r.name}</p>
                <p className="text-[14px] text-brand-gray-mid mt-0.5">
                  {r.product}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
