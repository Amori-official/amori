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
            아모리의 유아용 섬유제품은 어린이제품 안전기준에 따른 시험을 완료했습니다.
            (인증번호: CB014H2463-6001)
          </p>
          <p className="text-sm text-brand-gray-mid tracking-wide leading-8">
            부드럽고 흡수력이 뛰어난 면 100% 소재로 만든 AMORI의 제품들은
            아기의 첫 번째 피부 접촉부터 매일의 생활까지 안전하게 함께합니다.
          </p>
          {/* TODO: 실제 창립 연도 확인 필요 — 확정 전까지 SINCE 문구 노출하지 않음 */}
        </motion.div>
      </div>
    </section>
  );
}
