"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { createOrder } from "@/app/actions/orders";
import type { ShippingAddress } from "@/lib/types";

type Status = "loading" | "success" | "error";

function CompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const { items, clear } = useCartStore();

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey") ?? "";
    const rawOrderId = searchParams.get("orderId") ?? "";
    const amount = Number(searchParams.get("amount") ?? 0);

    if (!paymentKey || !rawOrderId) {
      router.replace("/shop");
      return;
    }

    const confirm = async () => {
      try {
        // sessionStorage에서 주문 데이터 복원
        const rawAddress = sessionStorage.getItem("pending-address");
        const rawGift = sessionStorage.getItem("pending-gift");

        const shippingAddress: ShippingAddress = rawAddress
          ? (JSON.parse(rawAddress) as ShippingAddress)
          : { name: "", phone: "", zipCode: "", address: "", addressDetail: "" };

        const gift = rawGift
          ? (JSON.parse(rawGift) as { giftWrapping: boolean; giftMessage: string })
          : { giftWrapping: false, giftMessage: "" };

        const result = await createOrder({
          items,
          shippingAddress,
          paymentKey,
          orderId: rawOrderId,
          amount,
          giftWrapping: gift.giftWrapping,
          giftMessage: gift.giftMessage || undefined,
        });

        if (result.error) {
          setError(result.error);
          setStatus("error");
          return;
        }

        // 성공: 카트 비우고, sessionStorage 정리
        clear();
        sessionStorage.removeItem("pending-address");
        sessionStorage.removeItem("pending-gift");
        sessionStorage.removeItem("pending-items");

        setOrderId(result.orderId ?? rawOrderId);
        setStatus("success");
      } catch {
        setError("주문 처리 중 오류가 발생했습니다.");
        setStatus("error");
      }
    };

    confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="pt-[60px] min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <p className="text-sm text-red-500 tracking-wide">{error}</p>
        <Link
          href="/checkout"
          className="text-[14px] tracking-widest underline hover:text-brand-gray-mid"
        >
          결제 다시 시도
        </Link>
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

      {orderId && (
        <div className="border border-brand-border px-8 py-4 text-xs tracking-wide text-brand-gray-mid">
          주문번호: {orderId}
        </div>
      )}

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
