"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const reasons = [
  {
    num: "01",
    title: "KC CERTIFIED",
    desc: "국내 KC 안전 인증 통과. 유해 물질 없는 소재만 사용합니다.",
  },
  {
    num: "02",
    title: "ORGANIC COTTON",
    desc: "100% 오가닉 코튼. 농약·화학물질 없이 재배된 면을 사용합니다.",
  },
  {
    num: "03",
    title: "MACHINE WASHABLE",
    desc: "세탁기 사용 가능한 내구성. 바쁜 육아 생활을 배려했습니다.",
  },
  {
    num: "04",
    title: "GIFT WRAPPING",
    desc: "선물 포장 무료 제공. 소중한 아기를 위한 특별한 첫 선물에.",
  },
];

export default function SectionWhyAmori() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="why-amori" className="bg-white">
      <div className="max-w-screen-xl mx-auto px-6 py-20">
        {/* 헤더 */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="pb-4"
        >
          <p className="text-[12px] tracking-widest text-brand-gray-mid">
            WHY AMORI
          </p>
        </motion.div>

        {/* 4열 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {reasons.map((r, i) => (
            <motion.div
              key={r.num}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="p-8"
            >
              {/* 대형 연한 번호 */}
              <p className="text-7xl font-light text-brand-border mb-6 leading-none">
                {r.num}
              </p>
              <p className="text-[12px] tracking-widest mb-3">{r.title}</p>
              <p className="text-xs text-brand-gray-mid tracking-wide leading-6">
                {r.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
