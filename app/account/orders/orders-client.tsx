"use client";

import { useState } from "react";
import type { Order } from "@/lib/types";

const STATUS_MAP: Record<Order["status"], { label: string; color: string }> = {
  pending:   { label: "결제 대기", color: "bg-gray-100 text-gray-600" },
  paid:      { label: "결제 완료", color: "bg-blue-50 text-blue-600" },
  shipped:   { label: "배송 중",   color: "bg-amber-50 text-amber-600" },
  delivered: { label: "배송 완료", color: "bg-green-50 text-green-600" },
  cancelled: { label: "취소",      color: "bg-red-50 text-red-500" },
};

export default function OrdersClient({ orders }: { orders: Order[] }) {
  const [selected, setSelected] = useState<Order | null>(null);

  return (
    <div id="account-orders" className="p-6 sm:p-8">
      <h2 className="text-[12px] tracking-[0.3em] mb-6">주문 내역</h2>

      {orders.length === 0 ? (
        <div className="py-20 text-center text-brand-gray-mid text-sm tracking-wide">
          아직 주문 내역이 없습니다.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const s = STATUS_MAP[order.status];
            return (
              <li
                key={order.id}
                onClick={() => setSelected(order)}
                className="border border-brand-border p-4 sm:p-5 cursor-pointer hover:border-brand-black transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[12px] tracking-wide text-brand-gray-mid">
                      {new Date(order.createdAt).toLocaleDateString("ko-KR", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                    <p className="text-[12px] tracking-widest text-brand-gray-mid">{order.id}</p>
                    <p className="text-sm font-medium mt-1">
                      {order.items[0]?.productName}
                      {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[12px] tracking-wide px-2.5 py-1 rounded-full ${s.color}`}>
                      {s.label}
                    </span>
                    <span className="text-sm font-medium">
                      ₩{order.totalAmount.toLocaleString("ko-KR")}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 주문 상세 모달 */}
      {selected && (
        <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const s = STATUS_MAP[order.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[12px] tracking-[0.3em]">주문 상세</h3>
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
            <span className={`text-[12px] px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
          </div>
        </div>

        {/* 주문 상품 */}
        <div className="py-4 border-b border-brand-border space-y-2">
          <p className="text-[12px] tracking-widest mb-3">주문 상품</p>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-brand-black">{item.productName} × {item.quantity}</span>
              <span className="text-brand-gray-mid">
                ₩{(item.price * item.quantity).toLocaleString("ko-KR")}
              </span>
            </div>
          ))}
        </div>

        {/* 배송지 */}
        <div className="py-4 border-b border-brand-border space-y-1 text-xs text-brand-gray-mid tracking-wide">
          <p className="text-[12px] tracking-widest mb-2 text-brand-black">배송지</p>
          <p>{order.shippingAddress.name} · {order.shippingAddress.phone}</p>
          <p>[{order.shippingAddress.zipCode}] {order.shippingAddress.address}</p>
          {order.shippingAddress.addressDetail && <p>{order.shippingAddress.addressDetail}</p>}
        </div>

        {/* 결제 금액 */}
        <div className="pt-4 flex justify-between font-medium">
          <span className="text-sm tracking-wide">결제 금액</span>
          <span>₩{order.totalAmount.toLocaleString("ko-KR")}</span>
        </div>

        {/* 리뷰 작성 버튼 */}
        {order.status === "delivered" && (
          <button className="mt-5 w-full h-10 border border-brand-black text-brand-black text-[12px] tracking-widest hover:bg-brand-fill hover:text-brand-black transition-colors">
            리뷰 작성
          </button>
        )}
      </div>
    </div>
  );
}
