"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function SectionBrandStory() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="brand-story" className="bg-white">
      <div
        ref={ref}
        className="max-w-screen-xl mx-auto px-6 py-28 grid grid-cols-1 md:grid-cols-2 gap-16 items-center"
      >
        {/* 좌: 대형 슬로건 */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-5xl md:text-7xl font-light leading-[1.15] tracking-tight text-brand-black">
            Made with
            <br />
            <span className="italic">Love &amp;</span>
            <br />
            Intention
          </h2>
        </motion.div>

        {/* 우: 브랜드 설명 */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6"
        >
          <p className="text-sm text-brand-gray-mid tracking-wide leading-8">
            AMORI는 아기를 처음 맞이하는 부모의 설렘과 걱정을 함께합니다.
            우리가 만드는 모든 패브릭은 KC 안전 인증을 통과한 소재만을 사용하며,
            형광증백제·독성 염료 없이 제작됩니다.
          </p>
          <p className="text-sm text-brand-gray-mid tracking-wide leading-8">
            부드럽고 흡수력이 뛰어난 오가닉 코튼으로 만든 AMORI의 제품들은
            아기의 첫 번째 피부 접촉부터 매일의 생활까지 안전하게 함께합니다.
          </p>
          <div className="border-t border-brand-border pt-6">
            <p className="text-[12px] tracking-widest text-brand-gray-mid">
              SINCE 2023 · SEOUL, KOREA
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
