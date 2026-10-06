"use client";

import { motion, type MotionProps } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const fadeUp = (delay = 0): MotionProps => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
});

// 히어로 배경 슬라이드 이미지들. 여기에 파일명을 추가하면 자동으로 슬라이드에 포함된다.
// (public/ 폴더 기준 경로. 가로가 넓은 풀블리드 이미지 권장)
// imgClassName으로 이미지별 보정(밝기/대비)을 다르게 줄 수 있다.
const BASE_IMG = "object-cover object-center";
const HERO_IMAGES: { src: string; alt: string; imgClassName?: string }[] = [
  { src: "/hero-cream.webp", alt: "Amori", imgClassName: `${BASE_IMG} brightness-125 contrast-90` },
  { src: "/hero-2.webp", alt: "Amori 아기", imgClassName: BASE_IMG },
  { src: "/hero-3.webp", alt: "Amori 거즈빕", imgClassName: BASE_IMG },
];

const SLIDE_INTERVAL = 5000; // 5초마다 전환

export default function SectionHero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (HERO_IMAGES.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero" className="relative h-[100vw] md:h-screen overflow-hidden">
      {/* 배경 이미지 슬라이드 (크로스페이드) */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        {HERO_IMAGES.map((img, i) => (
          <motion.div
            key={img.src}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: i === index ? 1 : 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className={img.imgClassName ?? BASE_IMG}
              priority={i === 0}
              sizes="100vw"
            />
          </motion.div>
        ))}
      </motion.div>

      {/* 텍스트 레이어 (누끼: mix-blend-multiply) */}
      <div className="relative h-full flex flex-col">
        <div className="flex-1 max-w-screen-xl mx-auto w-full px-6 pt-20 pb-16 flex items-end justify-end">
          <div className="flex flex-col gap-5 sm:gap-8 mix-blend-multiply items-end text-right">
            <motion.h1
              {...fadeUp(0.15)}
              className="text-[2.75rem] sm:text-6xl md:text-8xl leading-[0.95] tracking-tight font-[family-name:var(--font-katibeh)] text-brand-black"
            >
              Things,
              <br />
              with great love
            </motion.h1>

            <motion.p
              {...fadeUp(0.3)}
              className="text-[13px] sm:text-sm text-brand-black tracking-wide leading-6 sm:leading-7 max-w-[15rem] sm:max-w-xs opacity-70"
            >
              사랑하는 마음을 담아,
              <br />
              작은 것부터 천천히 만들어가겠습니다.
            </motion.p>

            {/* TODO: LOOKBOOK 콘텐츠 준비되면 버튼 복원 */}
            <motion.div {...fadeUp(0.4)} className="flex">
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
