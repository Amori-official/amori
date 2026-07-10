"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function SectionNewsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage" }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.error) { setErrorMsg(data.error); return; }
      setSubmitted(true);
      setEmail("");
    } catch {
      setErrorMsg("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

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

        {/* 우: 설명 + 폼 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6"
        >
          <p className="text-sm text-brand-gray-mid tracking-wide leading-8">
            신제품 출시 소식, 시즌 룩북, 육아 팁까지.
            <br />
            뉴스레터를 구독하고 첫 주문 10% 할인 코드를 받으세요.
          </p>

          {submitted ? (
            <p className="text-sm tracking-wide text-brand-black border border-brand-border px-6 py-4">
              구독해주셔서 감사합니다. 할인 코드를 이메일로 보내드렸습니다.
            </p>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  required
                  disabled={loading}
                  className="flex-1 min-w-0 bg-white border border-brand-border text-brand-black text-sm px-4 py-3.5 placeholder:text-brand-gray-mid focus:outline-none focus:border-brand-black transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="shrink-0 bg-brand-fill text-brand-black text-[12px] tracking-widest px-6 py-3.5 hover:bg-brand-fill-hover transition-colors disabled:opacity-50"
                >
                  {loading ? "..." : "SUBSCRIBE"}
                </button>
              </form>
              {errorMsg && (
                <p className="text-xs text-red-500 tracking-wide mt-2">{errorMsg}</p>
              )}
            </>
          )}

          <p className="text-[12px] text-brand-gray-mid tracking-wide">
            구독 취소는 언제든 가능합니다.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
