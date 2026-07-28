"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { confirmPaymentSecure } from "@/app/actions/confirm-payment";

// 16-4(3단계) 주문 완료 화면.
//
// 두 경로로 진입한다:
//   A. 결제 성공 리다이렉트(Toss) — ?paymentKey&orderId&amount
//      → confirmPaymentSecure()로 승인을 확정하고 주문을 paid로 전환한 뒤 표시.
//   B. 결제 비활성(로컬 기본) — ?order=<주문번호>
//      → 이미 생성된 pending 주문번호를 확인만 표시.

type Status = "loading" | "success" | "error";

function CompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState("");
  const clear = useCartStore((s) => s.clear);
  // React 18 StrictMode/재실행에서 결제 확인이 두 번 트리거되지 않도록 가드.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const orderParam = searchParams.get("order");

    // 경로 B: 결제 비활성 — 주문번호만 확인 표시
    if (!paymentKey && orderParam) {
      setOrderNumber(orderParam);
      setStatus("success");
      return;
    }

    // 경로 A: 결제 성공 리다이렉트 — 서버에서 승인 확정
    if (paymentKey && orderId && amount) {
      confirmPaymentSecure({ paymentKey, orderId, amount: Number(amount) })
        .then((result) => {
          clear();
          setOrderNumber(result.orderNumber);
          setStatus("success");
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "결제 확인 중 오류가 발생했습니다.");
          setStatus("error");
        });
      return;
    }

    // 유효한 파라미터가 없으면 확인할 주문이 없으므로 쇼핑으로 돌려보낸다.
    router.replace("/shop");
  }, [searchParams, router, clear]);

  if (status === "loading") {
    return (
      <div className="pt-[60px] min-h-screen flex items-center justify-center">
        <p className="text-sm text-brand-gray-mid tracking-widest animate-pulse">
          결제를 확인하는 중...
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="pt-[60px] min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="space-y-2">
          <p className="text-[14px] tracking-[0.4em] text-red-400">PAYMENT ERROR</p>
          <p className="text-sm text-red-500 tracking-wide">{error}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/checkout"
            className="px-8 h-11 bg-brand-fill text-brand-black text-[14px] tracking-widest
              flex items-center justify-center hover:bg-brand-gray-mid transition-colors"
          >
            다시 시도하기
          </Link>
          <Link
            href="/shop"
            className="px-8 h-11 border border-brand-border text-brand-gray-mid text-[14px] tracking-widest
              flex items-center justify-center hover:border-brand-black hover:text-brand-black transition-colors"
          >
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[60px] min-h-screen flex flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="space-y-2">
        <p className="text-[14px] tracking-[0.4em] text-brand-gray-mid">ORDER CONFIRMED</p>
        <h1 className="text-3xl font-light tracking-[0.15em]">감사합니다</h1>
        <p className="text-sm text-brand-gray-mid tracking-wide mt-2 leading-relaxed">
          주문이 정상적으로 완료되었습니다.
          <br />
          배송 준비가 되면 알려드릴게요.
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
