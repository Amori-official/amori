"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="pt-[60px] min-h-screen flex flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="space-y-2">
        <p className="text-[14px] tracking-[0.4em] text-brand-gray-mid">ERROR</p>
        <h1 className="text-3xl font-light tracking-[0.15em]">문제가 발생했습니다</h1>
        <p className="text-sm text-brand-gray-mid tracking-wide mt-2">
          일시적인 오류입니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-8 h-11 bg-brand-fill text-brand-black text-[14px] tracking-widest
            hover:bg-brand-gray-mid transition-colors"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="px-8 h-11 border border-brand-border text-brand-gray-mid text-[14px] tracking-widest
            flex items-center justify-center hover:border-brand-black hover:text-brand-black transition-colors"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
