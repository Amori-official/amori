"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function FailContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") ?? "결제에 실패했습니다.";

  return (
    <div className="pt-[60px] min-h-screen flex flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="space-y-2">
        <p className="text-[12px] tracking-[0.4em] text-red-400">PAYMENT FAILED</p>
        <h1 className="text-3xl font-light tracking-[0.15em]">결제 실패</h1>
        <p className="text-sm text-brand-gray-mid tracking-wide mt-2">{message}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/checkout"
          className="px-8 h-11 bg-brand-fill text-brand-black text-[12px] tracking-widest
            flex items-center justify-center hover:bg-brand-gray-mid transition-colors"
        >
          다시 시도하기
        </Link>
        <Link
          href="/shop"
          className="px-8 h-11 border border-brand-border text-brand-gray-mid text-[12px] tracking-widest
            flex items-center justify-center hover:border-brand-black hover:text-brand-black transition-colors"
        >
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutFailPage() {
  return (
    <Suspense fallback={null}>
      <FailContent />
    </Suspense>
  );
}
