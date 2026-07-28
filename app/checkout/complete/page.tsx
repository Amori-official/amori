"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

// 16-4C: 주문은 checkout 제출 시 create_order RPC로 이미 생성된다.
// 이 페이지는 그 결과(주문번호)를 확인만 하는 화면이다.
// 결제(TossPayments 승인) 연동은 3단계에서 이 흐름 위에 얹는다 — 그 전까지
// 이 페이지에는 결제 승인 로직이 없다.

function CompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    const order = searchParams.get("order") ?? "";
    if (!order) {
      // 주문번호 없이 직접 진입한 경우 — 확인할 주문이 없으므로 쇼핑으로 돌려보낸다.
      router.replace("/shop");
      return;
    }
    setOrderNumber(order);
  }, [searchParams, router]);

  if (!orderNumber) {
    return (
      <div className="pt-[60px] min-h-screen flex items-center justify-center">
        <p className="text-sm text-brand-gray-mid tracking-widest animate-pulse">
          주문을 확인하는 중...
        </p>
      </div>
    );
  }

  return (
    <div className="pt-[60px] min-h-screen flex flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="space-y-2">
        <p className="text-[14px] tracking-[0.4em] text-brand-gray-mid">ORDER CONFIRMED</p>
        <h1 className="text-3xl font-light tracking-[0.15em]">감사합니다</h1>
        <p className="text-sm text-brand-gray-mid tracking-wide mt-2 leading-relaxed">
          주문이 정상적으로 접수되었습니다.
          <br />
          결제 및 배송 안내를 순차적으로 알려드릴게요.
        </p>
      </div>

      <div className="border border-brand-border px-8 py-4 text-xs tracking-wide text-brand-gray-mid">
        주문번호: {orderNumber}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/shop"
          className="px-8 h-11 border border-brand-black text-brand-black text-[14px] tracking-widest
            flex items-center justify-center hover:bg-brand-fill hover:text-brand-black transition-colors"
        >
          쇼핑 계속하기
        </Link>
        <Link
          href="/account"
          className="px-8 h-11 bg-brand-fill text-brand-black text-[14px] tracking-widest
            flex items-center justify-center hover:bg-brand-gray-mid transition-colors"
        >
          주문 내역 보기
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={null}>
      <CompleteContent />
    </Suspense>
  );
}
