"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackingUrl } from "@/lib/tracking";
import {
  updateOrderStatus,
  setOrderTracking,
  cancelOrder,
  approveReturn,
  rejectReturn,
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

// 취소 주체 라벨: 판매자(admin) / 구매자(customer) / 자동(system)
function cancelActorLabel(by: string | null): string {
  if (by === "admin") return "판매자";
  if (by === "customer") return "구매자";
  if (by === "system") return "자동";
  return "";
}

// 취소는 아래 '주문 취소' 버튼(쿠폰 복원 포함)으로만 처리한다 — 드롭다운에서는 제외.
const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "대기" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
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
    if (!confirm("이 주문을 취소하시겠습니까?\n결제 완료 건은 토스페이먼츠로 자동 환불되고, 사용된 쿠폰은 복원됩니다."))
      return;
    run(() => cancelOrder(order.id), "주문을 취소했습니다. (결제 완료 건은 환불 처리됨)");
  };

  const doApproveReturn = () => {
    if (!confirm("반품을 승인하시겠습니까?\n토스페이먼츠로 자동 환불되고, 주문이 취소/반품 처리됩니다."))
      return;
    run(() => approveReturn(order.id), "반품을 승인하고 환불했습니다.");
  };

  const doRejectReturn = () => {
    if (!confirm("반품 신청을 반려하시겠습니까?")) return;
    run(() => rejectReturn(order.id), "반품 신청을 반려했습니다.");
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
              주문 취소됨{cancelActorLabel(order.cancelledBy) ? ` · ${cancelActorLabel(order.cancelledBy)}` : ""}
            </span>
          )}
        </div>
        <p className="text-[13px] text-brand-gray-mid mt-1">
          {new Date(order.createdAt).toLocaleString("ko-KR")}
        </p>
        {cancelled && (order.cancelledBy || order.cancelReason) && (
          <p className="text-[13px] text-red-600 mt-2 border border-red-200 bg-red-50 px-3 py-2 rounded">
            취소 주체: <b>{cancelActorLabel(order.cancelledBy) || "알 수 없음"}</b>
            {order.cancelReason ? ` · 사유: ${order.cancelReason}` : ""}
          </p>
        )}
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

      {/* 반품 신청 */}
      {order.returnStatus && (
        <Section title="반품">
          {order.returnStatus === "requested" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">반품 신청됨</span>
                {order.returnRequestedAt && (
                  <span className="text-[12px] text-brand-gray-mid">
                    {new Date(order.returnRequestedAt).toLocaleString("ko-KR")}
                  </span>
                )}
              </div>
              {order.returnReason && (
                <p className="text-[13px] leading-6 border border-brand-border p-3 bg-brand-gray-light whitespace-pre-wrap">
                  사유: {order.returnReason}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={doApproveReturn}
                  disabled={pending}
                  className="h-10 px-4 bg-brand-black text-white text-[13px] tracking-widest disabled:opacity-50"
                >
                  반품 승인 (자동 환불)
                </button>
                <button
                  onClick={doRejectReturn}
                  disabled={pending}
                  className="h-10 px-4 border border-brand-border text-[13px] tracking-widest text-brand-gray-mid hover:text-brand-black disabled:opacity-50"
                >
                  반려
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-brand-gray-mid">
              반품 상태:{" "}
              <span className={order.returnStatus === "approved" ? "text-brand-black" : "text-red-500"}>
                {order.returnStatus === "approved" ? "승인 완료 (환불됨)" : "반려됨"}
              </span>
              {order.returnReason ? ` · 사유: ${order.returnReason}` : ""}
            </p>
          )}
        </Section>
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
            {cancelled ? (
              <span className="h-9 inline-flex items-center px-2 text-[13px] text-red-500">취소됨</span>
            ) : (
              <select
                value={order.orderStatus}
                disabled={pending}
                onChange={(e) => run(() => updateOrderStatus(order.id, { orderStatus: e.target.value }))}
                className="h-9 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black disabled:opacity-50"
              >
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
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
        {order.trackingNumber && (
          <a
            href={trackingUrl(order.courier, order.trackingNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-[13px] text-blue-600 underline underline-offset-4 hover:text-blue-700"
          >
            배송 조회하기 ({order.courier ? `${order.courier} ` : ""}
            {order.trackingNumber}) →
          </a>
        )}
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
          </dl>
          {order.shippingRequest && (
            <div className="mt-3 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 tracking-wide break-words">
              📝 배송메모: {order.shippingRequest}
            </div>
          )}
        </Section>
      </div>

      {/* 유입 경로 (광고 UTM 등) */}
      <Section title="유입 경로">
        {order.attribution ? (
          <dl className="space-y-1.5 text-[13px]">
            {order.attribution.utm_source && <Row label="소스" value={order.attribution.utm_source} />}
            {order.attribution.utm_medium && <Row label="매체" value={order.attribution.utm_medium} />}
            {order.attribution.utm_campaign && <Row label="캠페인" value={order.attribution.utm_campaign} />}
            {order.attribution.utm_content && <Row label="광고" value={order.attribution.utm_content} />}
            {order.attribution.utm_term && <Row label="키워드" value={order.attribution.utm_term} />}
            {order.attribution.referrer && <Row label="유입 사이트" value={order.attribution.referrer} />}
            {order.attribution.landing_path && <Row label="첫 방문 페이지" value={order.attribution.landing_path} />}
            {order.attribution.captured_at && (
              <Row label="유입 시각" value={new Date(order.attribution.captured_at).toLocaleString("ko-KR")} />
            )}
          </dl>
        ) : (
          <p className="text-[13px] text-brand-gray-mid">직접 방문 또는 기록 없음</p>
        )}
      </Section>

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
