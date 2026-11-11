"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { lookupGuestOrder, type GuestOrder } from "@/app/actions/order-lookup";
import { trackingUrl } from "@/lib/tracking";

// 고객용 주문 상태(5단계) — 주문내역 화면과 동일한 라벨/색.
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "결제 대기", color: "bg-gray-100 text-gray-600" },
  confirmed: { label: "주문확인중", color: "bg-blue-50 text-blue-600" },
  preparing: { label: "배송준비중", color: "bg-indigo-50 text-indigo-600" },
  shipped: { label: "배송중", color: "bg-amber-50 text-amber-600" },
  delivered: { label: "배송완료", color: "bg-green-50 text-green-600" },
  completed: { label: "구매확정", color: "bg-brand-black text-white" },
  cancelled: { label: "주문취소", color: "bg-red-50 text-red-500" },
};

function displayStatus(o: GuestOrder): { label: string; color: string } {
  if (o.status === "cancelled") return STATUS_LABEL.cancelled;
  if (o.fulfillmentStatus === "returned") return { label: "반품", color: "bg-red-50 text-red-500" };
  return STATUS_LABEL[o.status] ?? STATUS_LABEL.pending;
}

const won = (n: number) => `₩${Number(n ?? 0).toLocaleString("ko-KR")}`;

export default function OrderLookupClient() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError("주문번호와 이메일을 입력해주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await lookupGuestOrder(orderNumber, email);
      if (res.ok) {
        setOrder(res.order);
        setError(null);
      } else {
        setOrder(null);
        setError(res.error);
      }
    });
  };

  const st = order ? displayStatus(order) : null;
  const canTrack =
    order &&
    (order.status === "shipped" || order.status === "delivered") &&
    order.trackingNumber;

  return (
    <div className="pt-[100px] pb-24 px-4 max-w-lg mx-auto">
      <h1 className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-2 text-center">
        비회원 주문조회
      </h1>
      <p className="text-center text-[13px] text-brand-gray-mid leading-6 mb-8">
        주문 시 입력한 <b>이메일</b>과 <b>주문번호</b>로 주문상태·배송추적을 확인할 수 있어요.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="주문번호 (예: ORD261110-A1B2C3D4)"
          className="w-full h-11 border border-brand-border px-3 text-[14px] focus:outline-none focus:border-brand-black"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="주문 시 입력한 이메일"
          inputMode="email"
          className="w-full h-11 border border-brand-border px-3 text-[14px] focus:outline-none focus:border-brand-black"
        />
        {error && <p className="text-[13px] text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full h-11 bg-brand-black text-white text-[14px] tracking-widest hover:bg-brand-gray-mid disabled:opacity-50"
        >
          {pending ? "조회 중..." : "주문조회"}
        </button>
      </form>

      {order && st && (
        <div className="mt-8 border border-brand-border">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
            <div className="text-[12px] tracking-wide text-brand-gray-mid">
              주문번호 <b className="text-brand-black">{order.orderNumber}</b>
            </div>
            <span className={`text-[11px] px-2 py-1 rounded-full ${st.color}`}>{st.label}</span>
          </div>

          <ul className="divide-y divide-brand-border">
            {order.items.map((it, idx) => (
              <li key={idx} className="flex gap-3 px-4 py-3">
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.imageUrl}
                    alt={it.productName}
                    className="w-14 h-14 object-cover bg-brand-gray-light shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-brand-gray-light shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-brand-black truncate">{it.productName}</p>
                  {it.variantLabel && (
                    <p className="text-[12px] text-brand-gray-mid">{it.variantLabel}</p>
                  )}
                  <p className="text-[12px] text-brand-gray-mid">
                    ×{it.quantity} · {won(it.price * it.quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 py-3 border-t border-brand-border space-y-1.5 text-[13px]">
            {order.recipientName && (
              <div className="flex justify-between text-brand-gray-mid">
                <span>받는 분</span>
                <span className="text-brand-black">{order.recipientName}</span>
              </div>
            )}
            <div className="flex justify-between text-brand-gray-mid">
              <span>결제금액</span>
              <span className="text-brand-black font-medium">{won(order.totalAmount)}</span>
            </div>
            {order.courier && order.trackingNumber && (
              <div className="flex justify-between text-brand-gray-mid">
                <span>운송장</span>
                <span className="text-brand-black">
                  {order.courier} {order.trackingNumber}
                </span>
              </div>
            )}
          </div>

          {canTrack && (
            <a
              href={trackingUrl(order.courier, order.trackingNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3 border-t border-brand-border bg-brand-gray-light text-[13px] tracking-widest text-brand-black hover:bg-brand-fill transition-colors"
            >
              배송 추적하기 →
            </a>
          )}
        </div>
      )}

      {/* 취소·반품은 고객센터(카카오톡) 안내 — 비회원 조회는 보기 전용 */}
      <p className="mt-8 text-center text-[12px] text-brand-gray-mid leading-6">
        주문 취소·반품은{" "}
        <a
          href="https://pf.kakao.com/_dDmTX/chat"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-brand-black"
        >
          카카오톡 1:1 문의
        </a>
        로 접수해주세요.
        <br />
        <Link href="/" className="underline underline-offset-2 hover:text-brand-black">
          홈으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
