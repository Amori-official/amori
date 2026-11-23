"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/store/ui";
import type { MarqueeItem } from "@/lib/site";

// 설정이 비어 있을 때의 폴백(기존 기본 문구).
const FALLBACK: MarqueeItem[] = [
  { text: "회원 가입 시, 5% 할인 쿠폰 증정", href: "", action: "signup" },
  { text: "카카오톡 채널 추가 시, 3,000원 할인 쿠폰 증정", href: "https://pf.kakao.com/_dDmTX/friend", action: null },
];

const BASE_CLS =
  "text-[13px] font-semibold tracking-widest transition-colors underline-offset-2 hover:underline";
// 강조 체크 시 SALE 라벨과 같은 짙은 빨강으로.
const colorCls = (highlight?: boolean) =>
  highlight ? "text-[#9f2d2d] hover:text-[#7f2424]" : "text-brand-black hover:text-brand-gray-mid";

export default function SectionMarquee({ items }: { items?: MarqueeItem[] }) {
  const list = items && items.length > 0 ? items : FALLBACK;
  const [index, setIndex] = useState(0);
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % list.length), 5000);
    return () => clearInterval(timer);
  }, [list.length]);

  const item = list[index % list.length];
  if (!item) return null;

  const isExternal = /^https?:\/\//.test(item.href);
  const cls = `${BASE_CLS} ${colorCls(item.highlight)}`;

  return (
    <section id="marquee" className="bg-brand-gray-light py-1 overflow-hidden">
      <div className="flex items-center justify-center h-[1.5em]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            {item.action === "signup" ? (
              <button type="button" onClick={() => setAuthModalOpen(true, "signup")} className={cls}>
                {item.text}
              </button>
            ) : item.href && isExternal ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
                {item.text}
              </a>
            ) : item.href ? (
              <Link href={item.href} className={cls}>
                {item.text}
              </Link>
            ) : (
              <span className={cls}>{item.text}</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
