"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/store/ui";

type MarqueeItem = {
  label: string;
  href?: string;
  external?: boolean;
  action?: "signup"; // 회원가입 모달 열기
};

const items: MarqueeItem[] = [
  {
    label: "회원 가입 시, 5% 할인 쿠폰 증정",
    action: "signup",
  },
  {
    label: "카카오톡 채널 추가 시, 3,000원 할인 쿠폰 증정",
    href: "https://pf.kakao.com/_dDmTX/friend",
    external: true,
  },
];

const cls =
  "text-[13px] font-semibold tracking-widest text-brand-black hover:text-brand-gray-mid transition-colors underline-offset-2 hover:underline";

export default function SectionMarquee() {
  const [index, setIndex] = useState(0);
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const item = items[index];

  return (
    <section
      id="marquee"
      className="bg-brand-gray-light py-1 overflow-hidden"
    >
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
                {item.label}
              </button>
            ) : item.external ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cls}
              >
                {item.label}
              </a>
            ) : (
              <Link href={item.href!} className={cls}>
                {item.label}
              </Link>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
