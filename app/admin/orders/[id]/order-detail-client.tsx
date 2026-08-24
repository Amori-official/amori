"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateOrderStatus,
  setOrderTracking,
  cancelOrder,
  type AdminOrderDetail,
} from "@/app/actions/admin";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

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

const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "대기" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

const COURIERS = ["CJ대한통운", "우체국택배", "한진택배", "롯데택배", "로젠택배", "직접 입력"];

export default function OrderDetailClient({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const initCourierKnown = !order.courier || COURIERS.includes(order.courier);
  const [courierSel, setCourierSel] = useState(
    order.courier ? (initCourierKnown ? order.courier : "직접 입력") : ""
  );
  const [courierCustom, setCourierCustom] = useState(initCourierKnown ? "" : order.courier);
  const [tracking, setTracking] = useState(order.trackingNumber);

  const cancelled = order.orderStatus === "cancelled";
  const pay = PAYMENT_LABEL[order.paymentStatus] ?? PAYMENT_LABEL.ready;

  const run = (fn: () => Promise<{ error?: string }>, okMsg?: string) => {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        if (okMsg) setMsg(okMsg);
        router.refresh();
      }
    });
  };

  const saveTracking = () => {
    const courier = courierSel === "직접 입력" ? courierCustom : courierSel;
    run(() => setOrderTracking(order.id, courier, tracking), "송장 정보를 저장했습니다.");
  };

  const doCancel = () => {
    if (!confirm("이 주문을 취소하시겠습니까? 사용된 쿠폰이 있으면 복원됩니다.\n(실제 결제 취소·환불은 PG사에서 별도 처리해야 합니다.)"))
      return;
    run(() => cancelOrder(order.id), "주문을 취소했습니다.");
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl space-y-6">
      {/* 헤더 */}
      <div>
        <Link href="/admin/orders" className="text-[13px] text-brand-gray-mid hover:text-brand-black">
          ← 주문 목록
        </Link>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <h2 className="text-[15px] tracking-[0.2em] font-medium">{order.orderNumber}</h2>
          <span className={`text-[12px] px-2 py-0.5 rounded-full ${pay.color}`}>{pay.label}</span>
          {cancelled && (
            <span className="text-[12px] px-2 py-0.5 rounded-full bg-red-50 text-red-500">
              주문 취소됨
            </span>
          )}
        </div>
        <p className="text-[13px] text-brand-gray-mid mt-1">
          {new Date(order.createdAt).toLocaleString("ko-KR")}
        </p>
      </div>

      {error && (
        <p className="text-[13px] text-red-500 tracking-wide border border-red-200 bg-red-50 px-3 py-2">
          {error}
        </p>
      )}
      {msg && (
        <p className="text-[13px] text-blue-600 tracking-wide border border-blue-200 bg-blue-50 px-3 py-2">
          {msg}
        </p>
      )}

      {/* 상태 변경 */}
      <Section title="상태">
        <div className="flex gap-4 flex-wrap">
          <label className="text-[12px] text-brand-gray-mid tracking-wide flex items-center gap-2">
            배송
            <select
              value={order.fulfillmentStatus}
              disabled={pending || cancelled}
              onChange={(e) => run(() => updateOrderStatus(order.id, { fulfillmentStatus: e.target.value }))}
              className="h-9 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black disabled:opacity-50"
            >
              {FULFILLMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="text-[12px] text-brand-gray-mid tracking-wide flex items-center gap-2">
            주문
            <select
              value={order.orderStatus}
              disabled={pending || cancelled}
              onChange={(e) => run(() => updateOrderStatus(order.id, { orderStatus: e.target.value }))}
              className="h-9 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black disabled:opacity-50"
            >
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      {/* 송장 */}
      <Section title="배송 · 송장">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={courierSel}
            disabled={pending || cancelled}
            onChange={(e) => setCourierSel(e.target.value)}
            className="h-10 border border-brand-border px-2 text-[13px] bg-white focus:outline-none focus:border-brand-black disabled:opacity-50"
          >
            <option value="">택배사 선택</option>
            {COURIERS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {courierSel === "직접 입력" && (
            <input
              value={courierCustom}
              onChange={(e) => setCourierCustom(e.target.value)}
              placeholder="택배사명"
              disabled={pending || cancelled}
              className="h-10 border border-brand-border px-3 text-[13px] focus:outline-none focus:border-brand-black disabled:opacity-50 sm:w-36"
            />
          )}
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="운송장 번호"
            disabled={pending || cancelled}
            className="h-10 flex-1 border border-brand-border px-3 text-[13px] focus:outline-none focus:border-brand-black disabled:opacity-50"
          />
          <button
            onClick={saveTracking}
            disabled={pending || cancelled}
            className="h-10 px-4 bg-brand-black text-white text-[13px] tracking-widest shrink-0 disabled:opacity-50"
          >
            저장
          </button>
        </div>
        <p className="text-[12px] text-brand-gray-mid mt-2">
          송장 번호를 저장하면 배송 상태가 자동으로 &lsquo;배송 중&rsquo;으로 변경됩니다.
        </p>
      </Section>

      {/* 주문 상품 */}
      <Section title="주문 상품">
        <ul className="divide-y divide-brand-border border-y border-brand-border">
          {order.items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[14px]">{it.productName}</p>
                {it.variantLabel && (
                  <p className="text-[12px] text-brand-gray-mid mt-0.5">{it.variantLabel}</p>
                )}
              </div>
              <div className="text-right shrink-0 text-[13px]">
                <p>{won(it.price)} × {it.quantity}</p>
                <p className="font-medium">{won(it.price * it.quantity)}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 text-[13px]">
          <Row label="상품 금액" value={won(order.subtotalAmount)} />
          {order.discountAmount > 0 && (
            <Row
              label={`할인${order.couponName ? ` (${order.couponName})` : ""}`}
              value={`- ${won(order.discountAmount)}`}
            />
          )}
          <Row label="배송비" value={order.shippingFee > 0 ? won(order.shippingFee) : "무료"} />
          <div className="flex justify-between pt-2 border-t border-brand-border mt-2">
            <dt className="font-medium">총 결제금액</dt>
            <dd className="font-medium text-[15px]">{won(order.totalAmount)}</dd>
          </div>
        </dl>
      </Section>

      {/* 주문자 · 배송지 */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Section title="주문자">
          <dl className="space-y-1.5 text-[13px]">
            <Row label="이름" value={order.buyerName || "-"} />
            <Row label="이메일" value={order.buyerEmail || "-"} />
            <Row label="연락처" value={order.buyerPhone || "-"} />
          </dl>
        </Section>
        <Section title="배송지">
          <dl className="space-y-1.5 text-[13px]">
            <Row label="받는분" value={order.recipientName || "-"} />
            <Row label="연락처" value={order.recipientPhone || "-"} />
            <Row
              label="주소"
              value={
                [order.postalCode && `(${order.postalCode})`, order.addressLine1, order.addressLine2]
                  .filter(Boolean)
                  .join(" ") || "-"
              }
            />
            {order.shippingRequest && <Row label="요청사항" value={order.shippingRequest} />}
          </dl>
        </Section>
      </div>

      {/* 취소 */}
      {!cancelled && (
        <div className="pt-2">
          <button
            onClick={doCancel}
            disabled={pending}
            className="h-10 px-4 border border-red-300 text-red-500 text-[13px] tracking-widest hover:bg-red-50 disabled:opacity-50"
          >
            주문 취소
          </button>
          <p className="text-[12px] text-brand-gray-mid mt-2">
            취소 시 사용된 쿠폰은 복원됩니다. 실제 결제 취소·환불은 PG사(토스페이먼츠)에서 별도로 처리하세요.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-brand-border p-4 sm:p-5">
      <h3 className="text-[12px] tracking-widest text-brand-gray-mid mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-brand-gray-mid shrink-0">{label}</dt>
      <dd className="text-right break-all">{value}</dd>
    </div>
  );
}
