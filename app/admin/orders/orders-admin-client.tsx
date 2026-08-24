"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateOrderStatus, type AdminOrder } from "@/app/actions/admin";

const PAYMENT_LABEL: Record<string, { label: string; color: string }> = {
  ready: { label: "결제 대기", color: "bg-gray-100 text-gray-600" },
  pending: { label: "결제 대기", color: "bg-gray-100 text-gray-600" },
  paid: { label: "결제 완료", color: "bg-blue-50 text-blue-600" },
  failed: { label: "결제 실패", color: "bg-red-50 text-red-500" },
  cancelled: { label: "결제 취소", color: "bg-red-50 text-red-500" },
  refunded: { label: "환불", color: "bg-amber-50 text-amber-600" },
  partially_refunded: { label: "부분 환불", color: "bg-amber-50 text-amber-600" },
};

const FULFILLMENT_OPTIONS = [
  { value: "unfulfilled", label: "미처리" },
  { value: "preparing", label: "준비 중" },
  { value: "shipped", label: "배송 중" },
  { value: "delivered", label: "배송 완료" },
  { value: "returned", label: "반품" },
];

const FULFILLMENT_FILTERS = [{ value: "", label: "전체 배송상태" }, ...FULFILLMENT_OPTIONS];

const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "대기" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

export default function OrdersAdminClient({
  orders,
  initialQuery = "",
  initialFulfillment = "",
}: {
  orders: AdminOrder[];
  initialQuery?: string;
  initialFulfillment?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(initialQuery);

  const applyFilters = (nextQ: string, nextFulfillment: string) => {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextFulfillment) params.set("fulfillment", nextFulfillment);
    const qs = params.toString();
    router.push(`/admin/orders${qs ? `?${qs}` : ""}`);
  };

  const change = (
    orderId: string,
    patch: { fulfillmentStatus?: string; orderStatus?: string }
  ) => {
    setBusyId(orderId);
    setError(null);
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, patch);
      setBusyId(null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[14px] tracking-[0.3em]">주문 관리</h2>
        <span className="text-[13px] text-brand-gray-mid tracking-wide">
          총 {orders.length}건
        </span>
      </div>

      {/* 검색 · 필터 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters(q, initialFulfillment);
          }}
          className="flex gap-2 flex-1"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="주문번호 · 주문자 · 받는분 검색"
            className="h-10 flex-1 border border-brand-border px-3 text-[13px] tracking-wide focus:outline-none focus:border-brand-black"
          />
          <button
            type="submit"
            className="h-10 px-4 bg-brand-black text-white text-[13px] tracking-widest shrink-0"
          >
            검색
          </button>
        </form>
        <select
          value={initialFulfillment}
          onChange={(e) => applyFilters(q, e.target.value)}
          className="h-10 border border-brand-border px-3 text-[13px] tracking-wide bg-white focus:outline-none focus:border-brand-black"
        >
          {FULFILLMENT_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {(initialQuery || initialFulfillment) && (
          <button
            onClick={() => {
              setQ("");
              router.push("/admin/orders");
            }}
            className="h-10 px-4 border border-brand-border text-[13px] tracking-wide text-brand-gray-mid shrink-0 hover:text-brand-black"
          >
            초기화
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 text-[13px] text-red-500 tracking-wide border border-red-200 bg-red-50 px-3 py-2">
          {error}
        </p>
      )}

      {orders.length === 0 ? (
        <div className="py-20 text-center text-brand-gray-mid text-sm tracking-wide">
          {initialQuery || initialFulfillment ? "조건에 맞는 주문이 없습니다." : "주문이 없습니다."}
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const pay = PAYMENT_LABEL[o.paymentStatus] ?? PAYMENT_LABEL.ready;
            const busy = pending && busyId === o.id;
            return (
              <li key={o.id} className="border border-brand-border p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-sm font-medium tracking-widest underline decoration-brand-border underline-offset-4 hover:decoration-brand-black"
                      >
                        {o.orderNumber}
                      </Link>
                      <span className={`text-[12px] px-2 py-0.5 rounded-full ${pay.color}`}>
                        {pay.label}
                      </span>
                    </div>
                    <p className="text-[13px] text-brand-gray-mid mt-1">
                      {new Date(o.createdAt).toLocaleString("ko-KR")} · 주문자 {o.buyerName ?? "-"}
                      {o.recipientName && o.recipientName !== o.buyerName
                        ? ` · 받는분 ${o.recipientName}`
                        : ""}
                    </p>
                    <p className="text-[13px] mt-1">
                      {o.items[0]?.productName}
                      {o.items.length > 1 && ` 외 ${o.items.length - 1}건`} ·{" "}
                      <span className="font-medium">₩{o.totalAmount.toLocaleString("ko-KR")}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <label className="text-[12px] text-brand-gray-mid tracking-wide flex items-center gap-2">
                      배송
                      <select
                        value={o.fulfillmentStatus}
                        disabled={busy}
                        onChange={(e) => change(o.id, { fulfillmentStatus: e.target.value })}
                        className="h-9 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black disabled:opacity-50"
                      >
                        {FULFILLMENT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[12px] text-brand-gray-mid tracking-wide flex items-center gap-2">
                      주문
                      <select
                        value={o.orderStatus}
                        disabled={busy}
                        onChange={(e) => change(o.id, { orderStatus: e.target.value })}
                        className="h-9 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black disabled:opacity-50"
                      >
                        {ORDER_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
