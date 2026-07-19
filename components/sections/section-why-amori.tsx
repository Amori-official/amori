"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const reasons = [
  {
    num: "01",
    title: "KC SAFETY TESTED",
    desc: "아이가 사용하는 제품인 만큼 어린이제품 안전기준을 꼼꼼하게 확인합니다.",
  },
  {
    num: "02",
    title: "HANDMADE",
    desc: "재단부터 봉제까지 과정 하나하나 빠짐없이 직접 합니다. 아이에 대한 사랑을 담아 두 엄마가 정성스럽게 만들고 있습니다.",
  },
  {
    num: "03",
    title: "FOR OUR BABY",
    desc: "불필요한 포장을 줄이고 생분해 소재 포장재를 사용합니다. 앞으로도 아모리는 아이들이 살아갈 미래를 위한 방향으로 걸어가기 위한 지속적인 노력을 하겠습니다.",
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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
