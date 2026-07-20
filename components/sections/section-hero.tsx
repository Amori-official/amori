"use client";

import { motion, type MotionProps } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const fadeUp = (delay = 0): MotionProps => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function SectionHero() {
  return (
    <section id="hero" className="relative min-h-screen overflow-hidden">
      {/* 배경 이미지 */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        <Image
          src="/hero-cream.png"
          alt="Amori — CREAM"
          fill
          className="object-cover object-center brightness-125 contrast-90"
          priority
          sizes="100vw"
        />
      </motion.div>

      {/* 텍스트 레이어 (누끼: mix-blend-multiply) */}
      <div className="relative min-h-screen flex flex-col">
        <div className="flex-1 max-w-screen-xl mx-auto w-full px-6 pt-20 pb-16 flex items-end justify-end">
          <div className="flex flex-col gap-8 mix-blend-multiply items-end text-right">
            <motion.p
              {...fadeUp(0.1)}
              className="text-[14px] tracking-widest text-brand-black"
            >
              SS 2025 COLLECTION ·
            </motion.p>

            <motion.h1
              {...fadeUp(0.25)}
              className="text-6xl md:text-8xl leading-[0.95] tracking-tight font-[family-name:var(--font-katibeh)] text-brand-black"
            >
              Things,
              <br />
              with great love
            </motion.h1>

            <motion.p
              {...fadeUp(0.4)}
              className="text-sm text-brand-black tracking-wide leading-7 max-w-xs opacity-70"
            >
              사랑하는 마음을 담아,
              <br />
              작은 것부터 천천히 만들어가겠습니다.
            </motion.p>

            {/* TODO: LOOKBOOK 콘텐츠 준비되면 버튼 복원 */}
            <motion.div {...fadeUp(0.5)} className="flex">
              <Link
                href="/shop"
                className="bg-brand-fill text-brand-black px-8 py-3.5 text-[14px] tracking-widest hover:opacity-70 transition-opacity"
              >
                SHOP NOW
              </Link>
            </motion.div>
          </div>
        </div>

        {/* 스크롤 인디케이터 */}
        <motion.div
          className="pb-10 text-center mix-blend-multiply"
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[14px] tracking-widest text-brand-black opacity-60">
            ↓ SCROLL
          </span>
        </motion.div>
      </div>
    </section>
  );
}
