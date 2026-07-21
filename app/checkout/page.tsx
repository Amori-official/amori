"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { isCartItemOrderable } from "@/lib/resolve-variant";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
const FREE_SHIPPING = 50000;
const SHIPPING_FEE = 3000;

// 16-4A: 아모리의 결제사는 NICE Payments로 결정되었다. 기존 TossPayments 연동 코드는
// 레거시로 남겨두되(삭제/수정하지 않음) 이 플래그로 실행/화면 노출만 차단한다.
// 향후 NICE Payments 연동 단계에서 이 플래그 자리는 새로운 결제 연동으로 교체된다.
// 실제 배포 환경 어디에도 NEXT_PUBLIC_ENABLE_PAYMENT_INTEGRATION을 설정하지 않으므로
// 항상 false로 평가된다.
const PAYMENT_INTEGRATION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PAYMENT_INTEGRATION === "true";

// 16-4A: 선물포장 관련 DB 컬럼/로직은 유지하되, delivery_request와 혼용하지 않는 별도
// 설계가 확정되기 전까지 UI만 일시적으로 숨긴다.
const GIFT_WRAPPING_ENABLED = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 11;
}

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

  // 주문자(buyer) 정보
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  // 받는 사람(recipient) 정보
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [deliveryRequest, setDeliveryRequest] = useState("");

  // "주문자 정보와 동일" 체크 해제 상태에서 사용자가 직접 입력한 recipient 값을 보관.
  // 체크 해제 시 이 값으로 복원한다 (이전 입력이 없었다면 빈 값 그대로).
  const [recipientDraft, setRecipientDraft] = useState({ name: "", phone: "" });
  const [sameAsBuyer, setSameAsBuyer] = useState(false);

  const [giftWrapping, setGiftWrapping] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tossReady, setTossReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetsRef = useRef<any>(null);

  const { items, total, clear } = useCartStore();
  const { setAuthModalOpen, showToast } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // 빈 장바구니 처리 (로그인 여부와 무관 — 비회원 주문 지원)
  useEffect(() => {
    if (mounted && items.length === 0) {
      router.push("/shop");
    }
  }, [mounted, items.length, router]);

  // "주문자 정보와 동일" 체크 상태에서는 buyer 정보가 바뀔 때마다 recipient에 실시간 반영한다.
  useEffect(() => {
    if (sameAsBuyer) {
      setRecipientName(buyerName);
      setRecipientPhone(buyerPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameAsBuyer, buyerName, buyerPhone]);

  const handleToggleSameAsBuyer = (checked: boolean) => {
    if (!checked) {
      // 체크 해제 시, 체크 전에 입력했던 recipient 값으로 복원 (없었다면 빈 값)
      setRecipientName(recipientDraft.name);
      setRecipientPhone(recipientDraft.phone);
    }
    setSameAsBuyer(checked);
  };

  const handleRecipientNameChange = (v: string) => {
    setRecipientName(v);
    if (!sameAsBuyer) setRecipientDraft((d) => ({ ...d, name: v }));
  };

  const handleRecipientPhoneChange = (v: string) => {
    setRecipientPhone(v);
    if (!sameAsBuyer) setRecipientDraft((d) => ({ ...d, phone: v }));
  };

  // 문제가 있는(variant_id 없음/무효/비활성) 장바구니 항목 — 담을 당시 저장된 스냅샷 기준 판단.
  // (실시간 재조회는 이번 단계 범위 밖: RPC 연결 시점(16-4C)에 서버가 다시 검증한다.)
  const invalidItems = useMemo(() => items.filter((i) => !isCartItemOrderable(i)), [items]);
  const hasInvalidItems = invalidItems.length > 0;

  // Toss Payments 위젯 초기화 — 16-4A~D 동안 실행되지 않음(PAYMENT_INTEGRATION_ENABLED=false).
  useEffect(() => {
    if (!PAYMENT_INTEGRATION_ENABLED) return;
    if (!mounted || items.length === 0) return;
    const clientKey = TOSS_CLIENT_KEY;
    if (!clientKey) return;

    let cancelled = false;
    const cartTotal = total();
    const amount = cartTotal >= FREE_SHIPPING ? cartTotal : cartTotal + SHIPPING_FEE;

    import("@tosspayments/tosspayments-sdk")
      .then(async ({ loadTossPayments }) => {
        if (cancelled) return;
        const tossPayments = await loadTossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey: user?.id ?? "ANONYMOUS" });
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
        setPostalCode(data.zonecode);
        setAddressLine1(data.address);
        setAddressLine2("");
        document.getElementById("addressLine2")?.focus();
      },
    }).open();
  };

  function validateForm(): string | null {
    if (!buyerName.trim()) return "주문자 이름을 입력해주세요.";
    if (!EMAIL_REGEX.test(buyerEmail)) return "주문자 이메일을 확인해주세요.";
    if (!isPlausiblePhone(buyerPhone)) return "주문자 연락처를 확인해주세요.";
    if (!recipientName.trim()) return "받는 분 이름을 입력해주세요.";
    if (!isPlausiblePhone(recipientPhone)) return "받는 분 연락처를 확인해주세요.";
    if (!postalCode.trim() || !addressLine1.trim()) return "배송지를 입력해주세요.";
    if (hasInvalidItems) return "장바구니에 확인이 필요한 상품이 있습니다. 아래 안내를 확인해주세요.";
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);

    if (PAYMENT_INTEGRATION_ENABLED) {
      // 기존 TossPayments 결제 요청 로직 (레거시, 삭제하지 않음).
      // 이번 단계(16-4A~D)에서는 PAYMENT_INTEGRATION_ENABLED가 항상 false이므로
      // 이 분기에는 도달하지 않는다.
      if (!widgetsRef.current) {
        alert("결제 수단을 선택해주세요.");
        return;
      }

      setSubmitting(true);
      const cartTotal = total();
      const amount = cartTotal >= FREE_SHIPPING ? cartTotal : cartTotal + SHIPPING_FEE;
      const orderId = `amori-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      sessionStorage.setItem(
        "pending-address",
        JSON.stringify({
          name: recipientName,
          phone: recipientPhone,
          zipCode: postalCode,
          address: addressLine1,
          addressDetail: addressLine2,
        })
      );
      sessionStorage.setItem("pending-gift", JSON.stringify({ giftWrapping, giftMessage }));
      sessionStorage.setItem(
        "pending-items",
        JSON.stringify(items.map((i) => ({ productId: i.product.id, name: i.product.name, qty: i.quantity, price: i.unitPrice })))
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
          customerEmail: buyerEmail,
          customerName: recipientName,
          customerMobilePhone: recipientPhone.replace(/-/g, ""),
        });
      } catch {
        setSubmitting(false);
      }
      return;
    }

    // 16-4A: 폼 검증까지만 수행. createOrderSecure() 연결은 16-4C에서 진행한다.
    showToast("입력 확인이 완료되었습니다. 주문 생성 연동은 다음 단계에서 진행됩니다.");
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
          <h1 className="text-[14px] tracking-[0.3em] mb-8">CHECKOUT</h1>

          {!user && (
            <p className="mb-4 text-[13px] text-brand-gray-mid tracking-wide">
              비회원으로도 주문하실 수 있습니다. 주문 조회를 위해 로그인을 권장합니다.
            </p>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* ── 왼쪽: 폼 영역 ──────────────────────────────── */}
            <div className="space-y-4">
              {/* 주문자 정보 */}
              <div id="checkout-buyer" className="bg-white p-6 space-y-4">
                <h2 className="text-[14px] tracking-[0.25em] pb-1 border-b border-brand-border">
                  주문자 정보
                </h2>

                <Field label="이름 (필수)">
                  <Input placeholder="홍길동" value={buyerName} onChange={setBuyerName} required />
                </Field>

                <Field label="이메일 (필수)">
                  <Input
                    placeholder="example@amori.com"
                    value={buyerEmail}
                    onChange={setBuyerEmail}
                    required
                  />
                </Field>

                <Field label="연락처 (필수)">
                  <Input placeholder="010-0000-0000" value={buyerPhone} onChange={setBuyerPhone} required />
                </Field>
              </div>

              {/* 배송지 (받는 사람) */}
              <div id="checkout-recipient" className="bg-white p-6 space-y-4">
                <h2 className="text-[14px] tracking-[0.25em] pb-1 border-b border-brand-border">
                  배송지
                </h2>

                <label className="flex items-center gap-2.5 cursor-pointer -mt-1">
                  <input
                    type="checkbox"
                    checked={sameAsBuyer}
                    onChange={(e) => handleToggleSameAsBuyer(e.target.checked)}
                    className="w-4 h-4 border-brand-border accent-brand-black"
                  />
                  <span className="text-xs tracking-wide text-brand-gray-mid">주문자 정보와 동일</span>
                </label>

                <Field label="받는 분 (필수)">
                  <Input
                    placeholder="홍길동"
                    value={recipientName}
                    onChange={handleRecipientNameChange}
                    required
                    readOnly={sameAsBuyer}
                  />
                </Field>

                <Field label="연락처 (필수)">
                  <Input
                    placeholder="010-0000-0000"
                    value={recipientPhone}
                    onChange={handleRecipientPhoneChange}
                    required
                    readOnly={sameAsBuyer}
                  />
                </Field>

                <Field label="주소 (필수)">
                  <div className="flex gap-2">
                    <Input
                      placeholder="우편번호"
                      value={postalCode}
                      onChange={setPostalCode}
                      className="w-28 shrink-0"
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={handleAddressSearch}
                      className="shrink-0 px-4 h-11 border border-brand-border text-[14px] tracking-widest
                        hover:bg-brand-gray-light transition-colors whitespace-nowrap"
                    >
                      주소 찾기
                    </button>
                  </div>
                  <Input
                    placeholder="기본 주소"
                    value={addressLine1}
                    onChange={setAddressLine1}
                    readOnly
                    className="mt-2"
                  />
                  <input
                    id="addressLine2"
                    type="text"
                    placeholder="상세 주소 (동/호수 등)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="mt-2 w-full h-11 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
                  />
                </Field>

                <Field label="배송 요청사항 (선택)">
                  <input
                    type="text"
                    placeholder="예: 부재 시 경비실에 맡겨주세요"
                    value={deliveryRequest}
                    onChange={(e) => setDeliveryRequest(e.target.value)}
                    className="w-full h-11 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
                  />
                </Field>
              </div>

              {/* 선물 포장 — 16-4A 범위에서 일시 비활성화 (관련 컬럼/로직 유지, UI만 숨김) */}
              {GIFT_WRAPPING_ENABLED && (
                <div id="checkout-options" className="bg-white p-6 space-y-3">
                  <h2 className="text-[14px] tracking-[0.25em] pb-1 border-b border-brand-border">
                    선물 포장
                  </h2>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={giftWrapping}
                      onChange={(e) => setGiftWrapping(e.target.checked)}
                      className="w-4 h-4 border-brand-border accent-brand-black"
                    />
                    <span className="text-xs tracking-wide">선물 포장 (+0원, 무료)</span>
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
              )}

              {/* 결제 수단 — 16-4A~D 범위에서는 화면에 노출/실행하지 않음 */}
              <div id="checkout-payment" className="bg-white p-6 space-y-4">
                <h2 className="text-[14px] tracking-[0.25em] pb-1 border-b border-brand-border">
                  결제 수단
                </h2>

                {PAYMENT_INTEGRATION_ENABLED ? (
                  TOSS_CLIENT_KEY ? (
                    <>
                      <div id="payment-method" />
                      <div id="agreement" />
                    </>
                  ) : (
                    <div className="py-6 text-center text-xs text-brand-gray-mid tracking-wide border border-brand-border">
                      <p>NEXT_PUBLIC_TOSS_CLIENT_KEY를 설정하면</p>
                      <p className="mt-1">카드 / 카카오페이 / 네이버페이 결제가 활성화됩니다.</p>
                    </div>
                  )
                ) : (
                  <div className="py-6 text-center text-xs text-brand-gray-mid tracking-wide border border-brand-border">
                    <p>결제 연동은 다음 단계(NICE Payments)에서 진행됩니다.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── 오른쪽: 주문 요약 ────────────────────────────── */}
            <div className="space-y-4 lg:sticky lg:top-20 self-start">
              <div className="bg-white p-6 space-y-4">
                <h2 className="text-[14px] tracking-[0.25em] pb-1 border-b border-brand-border">
                  주문 상품
                </h2>

                {hasInvalidItems && (
                  <p className="text-[13px] text-red-500 tracking-wide border border-red-200 bg-red-50 px-3 py-2">
                    옵션 확인이 필요한 상품이 있습니다. 아래 항목을 확인해주세요.
                  </p>
                )}

                <ul className="space-y-3">
                  {items.map((item) => {
                    const variantLabel = [item.selectedSize, item.selectedColor].filter(Boolean).join(" · ");
                    const orderable = isCartItemOrderable(item);
                    return (
                      <li
                        key={`${item.product.id}-${item.selectedColor ?? "default"}-${item.selectedSize ?? "default"}`}
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
                          <p className="text-[14px] tracking-widest truncate">{item.product.name}</p>
                          <p className="text-[14px] text-brand-gray-mid mt-0.5 truncate">
                            {variantLabel || item.product.description}
                          </p>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[14px] text-brand-gray-mid">×{item.quantity}</span>
                            <span className="text-xs">
                              ₩{(item.unitPrice * item.quantity).toLocaleString("ko-KR")}
                            </span>
                          </div>
                          {!orderable && (
                            <div className="mt-1.5 flex flex-col items-start gap-0.5">
                              <p className="text-[13px] text-red-500 tracking-wide">
                                상품 정보가 변경되었습니다. 해당 상품을 삭제하고 상품 페이지에서 다시 담아주세요.
                              </p>
                              <Link
                                href={`/shop/${item.product.slug}`}
                                className="text-[13px] text-brand-gray-mid underline hover:text-brand-black transition-colors"
                              >
                                상품 상세로 이동
                              </Link>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
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
                  {GIFT_WRAPPING_ENABLED && giftWrapping && (
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

              {formError && (
                <p className="text-[13px] text-red-500 tracking-wide px-1">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting || hasInvalidItems || (PAYMENT_INTEGRATION_ENABLED && !!TOSS_CLIENT_KEY && !tossReady)}
                className="w-full h-12 bg-brand-fill text-brand-black text-[14px] tracking-[0.25em]
                  hover:bg-brand-gray-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "처리 중..." : `₩${grandTotal.toLocaleString("ko-KR")} 주문하기`}
              </button>

              {PAYMENT_INTEGRATION_ENABLED && TOSS_CLIENT_KEY && !tossReady && (
                <p className="text-[14px] text-center text-brand-gray-mid tracking-wide">
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
      <label className="text-[14px] tracking-widest">{label}</label>
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
