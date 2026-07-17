"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import type { ShippingAddress } from "@/lib/types";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
const FREE_SHIPPING = 50000;
const SHIPPING_FEE = 3000;

const EMPTY_ADDRESS: ShippingAddress = {
  name: "",
  phone: "",
  zipCode: "",
  address: "",
  addressDetail: "",
};

declare global {
  interface Window {
    daum: {
      Postcode: new (opts: { oncomplete: (data: { address: string; zonecode: string }) => void }) => {
        open: () => void;
      };
    };
  }
}

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [giftWrapping, setGiftWrapping] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tossReady, setTossReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetsRef = useRef<any>(null);

  const { items, total, clear } = useCartStore();
  const { setAuthModalOpen } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // 비로그인 처리
  useEffect(() => {
    if (mounted && !user) {
      setAuthModalOpen(true, "login");
      router.push("/");
    }
  }, [mounted, user, setAuthModalOpen, router]);

  // 빈 장바구니 처리
  useEffect(() => {
    if (mounted && items.length === 0) {
      router.push("/shop");
    }
  }, [mounted, items.length, router]);

  // Toss Payments 위젯 초기화
  useEffect(() => {
    if (!mounted || !user || items.length === 0) return;
    const clientKey = TOSS_CLIENT_KEY;
    if (!clientKey) return;

    let cancelled = false;
    const cartTotal = total();
    const amount = cartTotal >= FREE_SHIPPING ? cartTotal : cartTotal + SHIPPING_FEE;

    import("@tosspayments/tosspayments-sdk")
      .then(async ({ loadTossPayments }) => {
        if (cancelled) return;
        const tossPayments = await loadTossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey: user.id });
        await widgets.setAmount({ currency: "KRW", value: amount });
        await Promise.all([
          widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
          widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
        ]);
        if (!cancelled) {
          widgetsRef.current = widgets;
          setTossReady(true);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [mounted, user, items.length, total]);

  const handleAddressSearch = () => {
    if (!window.daum) return;
    new window.daum.Postcode({
      oncomplete: (data) => {
        setAddress((prev) => ({
          ...prev,
          zipCode: data.zonecode,
          address: data.address,
          addressDetail: "",
        }));
        document.getElementById("addressDetail")?.focus();
      },
    }).open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.name || !address.phone || !address.zipCode || !address.address) {
      alert("배송지를 모두 입력해주세요.");
      return;
    }

    if (!widgetsRef.current) {
      alert("결제 수단을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    const cartTotal = total();
    const amount = cartTotal >= FREE_SHIPPING ? cartTotal : cartTotal + SHIPPING_FEE;
    const orderId = `amori-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // 결제 완료 페이지로 전달할 데이터 저장
    sessionStorage.setItem("pending-address", JSON.stringify(address));
    sessionStorage.setItem("pending-gift", JSON.stringify({ giftWrapping, giftMessage }));
    sessionStorage.setItem(
      "pending-items",
      JSON.stringify(items.map((i) => ({ productId: i.product.id, name: i.product.name, qty: i.quantity, price: i.product.price })))
    );

    try {
      await widgetsRef.current.requestPayment({
        orderId,
        orderName:
          items.length === 1
            ? items[0].product.name
            : `${items[0].product.name} 외 ${items.length - 1}건`,
        successUrl: `${window.location.origin}/checkout/complete`,
        failUrl: `${window.location.origin}/checkout/fail`,
        customerEmail: user?.email ?? "",
        customerName: address.name,
        customerMobilePhone: address.phone.replace(/-/g, ""),
      });
    } catch {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  const cartTotal = total();
  const shipping = cartTotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  const grandTotal = cartTotal + shipping;

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />

      <div className="pt-[60px] min-h-screen bg-brand-gray-light">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-[12px] tracking-[0.3em] mb-8">CHECKOUT</h1>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* ── 왼쪽: 폼 영역 ──────────────────────────────── */}
            <div className="space-y-4">
              {/* 배송지 */}
              <div id="checkout-form" className="bg-white p-6 space-y-4">
                <h2 className="text-[12px] tracking-[0.25em] pb-1 border-b border-brand-border">
                  배송지
                </h2>

                <Field label="받는 분">
                  <Input
                    placeholder="홍길동"
                    value={address.name}
                    onChange={(v) => setAddress((a) => ({ ...a, name: v }))}
                    required
                  />
                </Field>

                <Field label="연락처">
                  <Input
                    placeholder="010-0000-0000"
                    value={address.phone}
                    onChange={(v) => setAddress((a) => ({ ...a, phone: v }))}
                    required
                  />
                </Field>

                <Field label="주소">
                  <div className="flex gap-2">
                    <Input
                      placeholder="우편번호"
                      value={address.zipCode}
                      onChange={(v) => setAddress((a) => ({ ...a, zipCode: v }))}
                      className="w-28 shrink-0"
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={handleAddressSearch}
                      className="shrink-0 px-4 h-11 border border-brand-border text-[12px] tracking-widest
                        hover:bg-brand-gray-light transition-colors whitespace-nowrap"
                    >
                      주소 찾기
                    </button>
                  </div>
                  <Input
                    placeholder="기본 주소"
                    value={address.address}
                    onChange={(v) => setAddress((a) => ({ ...a, address: v }))}
                    readOnly
                    className="mt-2"
                  />
                  <input
                    id="addressDetail"
                    type="text"
                    placeholder="상세 주소 (동/호수 등)"
                    value={address.addressDetail}
                    onChange={(e) => setAddress((a) => ({ ...a, addressDetail: e.target.value }))}
                    className="mt-2 w-full h-11 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
                  />
                </Field>
              </div>

              {/* 선물 포장 */}
              <div id="checkout-options" className="bg-white p-6 space-y-3">
                <h2 className="text-[12px] tracking-[0.25em] pb-1 border-b border-brand-border">
                  선물 포장
                </h2>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={giftWrapping}
                    onChange={(e) => setGiftWrapping(e.target.checked)}
                    className="w-4 h-4 border-brand-border accent-brand-black"
                  />
                  <span className="text-xs tracking-wide">
                    선물 포장 (+0원, 무료)
                  </span>
                </label>

                {giftWrapping && (
                  <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="메시지 카드에 들어갈 내용을 입력해주세요. (최대 100자)"
                    maxLength={100}
                    rows={3}
                    className="w-full border border-brand-border p-3 text-xs tracking-wide resize-none
                      focus:outline-none focus:border-brand-black placeholder:text-brand-gray-mid"
                  />
                )}
              </div>

              {/* 결제 수단 */}
              <div id="checkout-payment" className="bg-white p-6 space-y-4">
                <h2 className="text-[12px] tracking-[0.25em] pb-1 border-b border-brand-border">
                  결제 수단
                </h2>

                {TOSS_CLIENT_KEY ? (
                  <>
                    <div id="payment-method" />
                    <div id="agreement" />
                  </>
                ) : (
                  <div className="py-6 text-center text-xs text-brand-gray-mid tracking-wide border border-brand-border">
                    <p>NEXT_PUBLIC_TOSS_CLIENT_KEY를 설정하면</p>
                    <p className="mt-1">카드 / 카카오페이 / 네이버페이 결제가 활성화됩니다.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── 오른쪽: 주문 요약 ────────────────────────────── */}
            <div className="space-y-4 lg:sticky lg:top-20 self-start">
              <div className="bg-white p-6 space-y-4">
                <h2 className="text-[12px] tracking-[0.25em] pb-1 border-b border-brand-border">
                  주문 상품
                </h2>

                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={`${item.product.id}-${item.selectedColor ?? "default"}`}
                      className="flex gap-3"
                    >
                      <div className="w-14 aspect-[3/4] bg-brand-gray-light shrink-0 relative overflow-hidden">
                        {item.product.imageUrl && (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] tracking-widest truncate">{item.product.name}</p>
                        <p className="text-[12px] text-brand-gray-mid mt-0.5 truncate">
                          {item.selectedColor ?? item.product.description}
                        </p>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[12px] text-brand-gray-mid">×{item.quantity}</span>
                          <span className="text-xs">
                            ₩{(item.product.price * item.quantity).toLocaleString("ko-KR")}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-brand-border pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-brand-gray-mid">
                    <span className="tracking-wide">상품 합계</span>
                    <span>₩{cartTotal.toLocaleString("ko-KR")}</span>
                  </div>
                  <div className="flex justify-between text-brand-gray-mid">
                    <span className="tracking-wide">배송비</span>
                    <span>{shipping === 0 ? "무료" : `₩${shipping.toLocaleString("ko-KR")}`}</span>
                  </div>
                  {giftWrapping && (
                    <div className="flex justify-between text-brand-gray-mid">
                      <span className="tracking-wide">선물 포장</span>
                      <span>무료</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t border-brand-border text-sm">
                    <span className="tracking-wide">최종 결제금액</span>
                    <span>₩{grandTotal.toLocaleString("ko-KR")}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || (!!TOSS_CLIENT_KEY && !tossReady)}
                className="w-full h-12 bg-brand-fill text-brand-black text-[12px] tracking-[0.25em]
                  hover:bg-brand-gray-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "처리 중..." : `₩${grandTotal.toLocaleString("ko-KR")} 결제하기`}
              </button>

              {TOSS_CLIENT_KEY && !tossReady && (
                <p className="text-[12px] text-center text-brand-gray-mid tracking-wide">
                  결제 수단 로딩 중...
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// 폼 헬퍼 컴포넌트
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  required,
  readOnly,
  className = "",
}: {
  placeholder?: string;
  value: string;
  onChange?: (v: string) => void;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      required={required}
      readOnly={readOnly}
      className={`w-full h-11 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black
        read-only:bg-brand-gray-light read-only:text-brand-gray-mid ${className}`}
    />
  );
}
