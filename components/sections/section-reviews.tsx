"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const reviews = [
  {
    stars: 5,
    text: "정말 부드러워서 아기가 편안해하는 게 느껴져요. 세탁 후에도 전혀 변형이 없어서 정말 만족합니다.",
    name: "KIM J.",
    product: "Organic Swaddle",
  },
  {
    stars: 5,
    text: "KC 인증이라 믿고 구매했어요. 선물 포장도 너무 예쁘게 와서 출산 선물로 딱이에요.",
    name: "PARK S.",
    product: "Muslin Bodysuit",
  },
  {
    stars: 5,
    text: "첫 아이 선물로 받았는데 질감이 정말 고급스럽고 흡수력도 뛰어나서 매일 사용하고 있어요.",
    name: "LEE H.",
    product: "Terry Bath Towel",
  },
];

export default function SectionReviews() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

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
          <p className="text-[12px] tracking-widest">CUSTOMER REVIEWS</p>
          <span className="text-[12px] text-brand-gray-mid">★★★★★ 4.9</span>
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
                <p className="text-[12px] tracking-widest">{r.name}</p>
                <p className="text-[12px] text-brand-gray-mid mt-0.5">
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
