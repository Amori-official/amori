"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Order, OrderItem } from "@/lib/types";
import { cancelMyOrder, requestReturn, createReview } from "@/app/actions/account";
import { useUIStore } from "@/store/ui";

const REVIEW_POINT = 500; // 리뷰 작성 적립 포인트(문구용 — 실제 적립은 추후)

// 고객에게 보여줄 배송/주문 상태. 핵심 규칙(요청): 결제 후 송장 입력 전에는
// '배송 준비중', 송장 입력 후에는 '배송 중'으로 표시한다(송장 유무 기준).
function getDisplayStatus(order: Order): { label: string; color: string } {
  if (order.status === "cancelled") return { label: "취소", color: "bg-red-50 text-red-500" };
  if (order.fulfillmentStatus === "returned") return { label: "반품", color: "bg-red-50 text-red-500" };
  if (order.fulfillmentStatus === "delivered") return { label: "배송 완료", color: "bg-green-50 text-green-600" };
  if (order.paymentStatus === "paid") {
    return order.trackingNumber
      ? { label: "배송 중", color: "bg-amber-50 text-amber-600" }
      : { label: "배송 준비중", color: "bg-blue-50 text-blue-600" };
  }
  return { label: "결제 대기", color: "bg-gray-100 text-gray-600" };
}

// 택배사 통합 조회(네이버) 링크 — 관리자 주문상세와 동일 방식.
function trackingUrl(order: Order): string {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(
    `${order.courier || ""} 택배조회 ${order.trackingNumber}`.trim()
  )}`;
}

export default function OrdersClient({
  orders,
  reviewedProductIds = [],
}: {
  orders: Order[];
  reviewedProductIds?: string[];
}) {
  const [selected, setSelected] = useState<Order | null>(null);
  const reviewedSet = new Set(reviewedProductIds);

  return (
    <div id="account-orders" className="p-6 sm:p-8">
      <h2 className="text-[14px] tracking-[0.3em] mb-6">주문 내역</h2>

      {orders.length === 0 ? (
        <div className="py-20 text-center text-brand-gray-mid text-sm tracking-wide">
          아직 주문 내역이 없습니다.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const s = getDisplayStatus(order);
            return (
              <li
                key={order.id}
                onClick={() => setSelected(order)}
                className="border border-brand-border p-4 sm:p-5 cursor-pointer hover:border-brand-black transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[14px] tracking-wide text-brand-gray-mid">
                      {new Date(order.createdAt).toLocaleDateString("ko-KR", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                    <p className="text-[14px] tracking-widest text-brand-gray-mid">{order.id}</p>
                    <p className="text-sm font-medium mt-1">
                      {order.items[0]?.productName}
                      {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                    </p>
                    {order.fulfillmentStatus === "delivered" &&
                      order.items.some((it) => !reviewedSet.has(it.productId)) && (
                        <p className="text-[13px] text-amber-700 tracking-wide mt-1">
                          ⭐ 리뷰 작성 시 {REVIEW_POINT}P 적립
                        </p>
                      )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[14px] tracking-wide px-2.5 py-1 rounded-full ${s.color}`}>
                      {s.label}
                    </span>
                    <span className="text-sm font-medium">
                      ₩{order.totalAmount.toLocaleString("ko-KR")}
                    </span>
                    {order.trackingNumber && (
                      <a
                        href={trackingUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[13px] tracking-wide text-blue-600 underline underline-offset-4 hover:text-blue-700"
                      >
                        배송조회 →
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 주문 상세 모달 */}
      {selected && (
        <OrderDetailModal
          order={selected}
          reviewedSet={reviewedSet}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

const FULFILLMENT_RETURNABLE = ["preparing", "shipped", "delivered"];

function OrderDetailModal({
  order,
  reviewedSet,
  onClose,
}: {
  order: Order;
  reviewedSet: Set<string>;
  onClose: () => void;
}) {
  const s = getDisplayStatus(order);
  const router = useRouter();
  const { showToast } = useUIStore();
  const [pending, startTransition] = useTransition();
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const isDelivered = order.fulfillmentStatus === "delivered";

  const isCancelled = order.status === "cancelled";
  const isPaid = order.paymentStatus === "paid";
  const canCancel = !isCancelled && isPaid && order.fulfillmentStatus === "unfulfilled";
  const canReturn =
    !isCancelled &&
    isPaid &&
    FULFILLMENT_RETURNABLE.includes(order.fulfillmentStatus) &&
    order.returnStatus !== "requested" &&
    order.returnStatus !== "approved";
  const returnPending = order.returnStatus === "requested";
  const returnApproved = order.returnStatus === "approved";
  const returnRejected = order.returnStatus === "rejected";

  const run = (fn: () => Promise<{ error?: string }>, okMsg: string) => {
    startTransition(async () => {
      const res = await fn();
      if (res.error) showToast(res.error);
      else {
        showToast(okMsg);
        onClose();
        router.refresh();
      }
    });
  };

  const handleCancel = () => {
    if (!confirm("주문을 취소하시겠습니까?\n결제하신 금액은 자동으로 환불됩니다.")) return;
    run(() => cancelMyOrder(order.orderId), "주문이 취소되고 환불이 접수되었습니다.");
  };

  const handleReturn = () => {
    const reason = prompt("반품 사유를 입력해주세요. (관리자 확인 후 환불이 진행됩니다)");
    if (reason === null) return;
    run(() => requestReturn(order.orderId, reason), "반품 신청이 접수되었습니다. 확인 후 안내드릴게요.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[14px] tracking-[0.3em]">주문 상세</h3>
          <button
            onClick={onClose}
            className="text-xl leading-none text-brand-gray-mid hover:text-brand-black"
          >
            ×
          </button>
        </div>

        {/* 주문 정보 */}
        <div className="space-y-2 pb-4 border-b border-brand-border text-xs text-brand-gray-mid tracking-wide">
          <div className="flex justify-between">
            <span>주문번호</span>
            <span className="text-brand-black">{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span>주문일</span>
            <span className="text-brand-black">
              {new Date(order.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>상태</span>
            <span className={`text-[14px] px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
          </div>
        </div>

        {/* 주문 상품 */}
        <div className="py-4 border-b border-brand-border space-y-3">
          <p className="text-[14px] tracking-widest mb-3">주문 상품</p>
          {order.items.map((item, i) => {
            const reviewed = reviewedSet.has(item.productId);
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-brand-black">{item.productName} × {item.quantity}</span>
                  <span className="text-brand-gray-mid">
                    ₩{(item.price * item.quantity).toLocaleString("ko-KR")}
                  </span>
                </div>
                {isDelivered &&
                  (reviewed ? (
                    <p className="text-[12px] text-brand-gray-mid">✓ 리뷰 작성 완료</p>
                  ) : (
                    <div>
                      <button
                        onClick={() => setReviewItem(item)}
                        className="h-8 px-3 border border-amber-300 text-amber-700 text-[12px] tracking-widest hover:bg-amber-50 transition-colors"
                      >
                        리뷰 작성
                      </button>
                      <p className="text-[11px] text-amber-700 mt-1">
                        리뷰 작성 시 {REVIEW_POINT}P 적립
                      </p>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>

        {/* 배송지 */}
        <div className="py-4 border-b border-brand-border space-y-1 text-xs text-brand-gray-mid tracking-wide">
          <p className="text-[14px] tracking-widest mb-2 text-brand-black">배송지</p>
          <p>{order.shippingAddress.name} · {order.shippingAddress.phone}</p>
          <p>[{order.shippingAddress.zipCode}] {order.shippingAddress.address}</p>
          {order.shippingAddress.addressDetail && <p>{order.shippingAddress.addressDetail}</p>}
        </div>

        {/* 배송 정보 (송장 입력 시) */}
        {order.trackingNumber && (
          <div className="py-4 border-b border-brand-border space-y-1 text-xs text-brand-gray-mid tracking-wide">
            <p className="text-[14px] tracking-widest mb-2 text-brand-black">배송 정보</p>
            {order.courier && (
              <div className="flex justify-between">
                <span>택배사</span>
                <span className="text-brand-black">{order.courier}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>운송장번호</span>
              <span className="text-brand-black">{order.trackingNumber}</span>
            </div>
            <a
              href={trackingUrl(order)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block w-full h-10 leading-10 text-center border border-brand-black text-brand-black text-[14px] tracking-widest hover:bg-brand-fill transition-colors"
            >
              배송 조회하기 →
            </a>
          </div>
        )}

        {/* 결제 금액 */}
        <div className="pt-4 flex justify-between font-medium">
          <span className="text-sm tracking-wide">결제 금액</span>
          <span>₩{order.totalAmount.toLocaleString("ko-KR")}</span>
        </div>

        {/* 취소 / 반품 */}
        <div className="mt-5 space-y-2">
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={pending}
              className="w-full h-10 border border-red-300 text-red-500 text-[14px] tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {pending ? "처리 중..." : "주문 취소 (자동 환불)"}
            </button>
          )}
          {canReturn && (
            <button
              onClick={handleReturn}
              disabled={pending}
              className="w-full h-10 border border-brand-black text-brand-black text-[14px] tracking-widest hover:bg-brand-fill transition-colors disabled:opacity-50"
            >
              {pending ? "처리 중..." : "반품 신청"}
            </button>
          )}
          {returnPending && (
            <p className="text-[13px] text-amber-600 text-center border border-amber-200 bg-amber-50 py-2.5 tracking-wide">
              반품 신청됨 · 관리자 승인 대기 중
            </p>
          )}
          {returnApproved && (
            <p className="text-[13px] text-brand-gray-mid text-center border border-brand-border py-2.5 tracking-wide">
              반품 완료 (환불 처리됨)
            </p>
          )}
          {returnRejected && (
            <p className="text-[13px] text-red-500 text-center border border-red-200 bg-red-50 py-2.5 tracking-wide">
              반품 신청이 반려되었습니다. 자세한 내용은 카카오톡 채널로 문의해주세요.
            </p>
          )}
          <p className="text-[12px] text-brand-gray-mid leading-6 pt-1">
            · 배송 준비 전에는 바로 취소(자동 환불)됩니다.<br />
            · 배송 준비 후에는 반품 신청 → 관리자 확인 후 환불됩니다.
          </p>
        </div>
      </div>

      {reviewItem && (
        <ReviewForm
          item={reviewItem}
          orderId={order.orderId}
          onClose={() => setReviewItem(null)}
          onDone={() => {
            setReviewItem(null);
            onClose();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// 리뷰 작성 폼(별점 + 내용). 성공 시 onDone.
function ReviewForm({
  item,
  orderId,
  onClose,
  onDone,
}: {
  item: OrderItem;
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { showToast } = useUIStore();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (content.trim().length < 5) {
      setError("리뷰 내용을 5자 이상 입력해주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createReview({
        productId: item.productId,
        orderId,
        rating,
        content: content.trim(),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      showToast(`리뷰가 등록되었습니다. ${REVIEW_POINT}P 적립 완료!`);
      onDone();
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] tracking-[0.3em]">리뷰 작성</h3>
          <button onClick={onClose} className="text-xl leading-none text-brand-gray-mid hover:text-brand-black">
            ×
          </button>
        </div>

        <p className="text-sm font-medium mb-4">{item.productName}</p>

        {/* 별점 */}
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n}점`}
              className="text-2xl leading-none p-0.5"
            >
              <span className={(hover || rating) >= n ? "text-amber-400" : "text-brand-border"}>★</span>
            </button>
          ))}
          <span className="ml-2 text-[13px] text-brand-gray-mid">{rating}점</span>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="상품은 어떠셨나요? 솔직한 후기를 남겨주세요. (5자 이상)"
          className="w-full border border-brand-border p-3 text-[14px] tracking-wide focus:outline-none focus:border-brand-black resize-none"
        />

        {error && <p className="mt-2 text-[13px] text-red-500 tracking-wide">{error}</p>}

        <p className="mt-2 text-[12px] text-amber-700">리뷰 작성 시 {REVIEW_POINT}P 적립</p>

        <button
          onClick={submit}
          disabled={pending}
          className="mt-4 w-full h-11 bg-brand-black text-white text-[14px] tracking-widest hover:bg-brand-gray-mid transition-colors disabled:opacity-50"
        >
          {pending ? "등록 중..." : "리뷰 등록"}
        </button>
      </div>
    </div>
  );
}
