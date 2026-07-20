"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// TODO: 인스타그램 계정 주소(@amori_atelier)가 확정값인지 확인 후 실제 URL로 교체
const INSTAGRAM_URL = "https://instagram.com/amori_atelier";

export default function SectionNewsletter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="newsletter" className="bg-white">
      <div
        ref={ref}
        className="max-w-screen-xl mx-auto px-6 py-28 grid grid-cols-1 md:grid-cols-2 gap-16 items-center"
      >
        {/* 좌: 대형 타이포 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-5xl md:text-6xl font-light leading-[1.2] tracking-tight text-brand-black">
            Stay in the
            <br />
            <span className="italic">loop</span> with
            <br />
            AMORI
          </h2>
        </motion.div>

        {/* 우: 인스타그램 안내 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6"
        >
          <p className="text-sm text-brand-gray-mid tracking-wide leading-8">
            아모리의 새로운 소식을 가장 먼저 만나보세요.
            <br />
            신상품과 제작 이야기는 인스타그램에서 전해드립니다.
          </p>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-fit border border-brand-border text-brand-black text-[14px] tracking-widest px-6 py-3.5 hover:bg-brand-fill transition-colors"
          >
            @amori_atelier
          </a>
        </motion.div>
      </div>
    </section>
  );
}
