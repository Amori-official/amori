"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { isCartItemOrderable } from "@/lib/resolve-variant";
import { createOrderSecure } from "@/app/actions/create-order";
import {
  getUserCoupons,
  getCheckoutPrefill,
  getMyPoints,
  type UserCoupon,
  type CheckoutPrefill,
} from "@/app/actions/account";

const MIN_POINTS_USE = 1000; // 포인트 최소 사용 단위(정책)

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

// 쿠폰 할인 추정(표시용). 서버(create_order RPC)가 동일 규칙으로 최종 계산·검증한다.
// 여러 쿠폰 순차(복리) 할인 합계. 정률(%)→정액(원) 순으로 '남은 금액'에 적용.
// (서버 create_order와 동일 규칙 — 최소주문 판정은 원래 주문금액 기준)
function computeStackedDiscount(coupons: UserCoupon[], subtotal: number): number {
  const sorted = [...coupons].sort((a, b) => {
    const ap = a.discountType === "percent" ? 0 : 1;
    const bp = b.discountType === "percent" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return b.discountValue - a.discountValue;
  });
  let remaining = subtotal;
  let total = 0;
  for (const c of sorted) {
    if (subtotal < c.minOrderAmount) continue;
    let d =
      c.discountType === "percent"
        ? Math.floor((remaining * c.discountValue) / 100)
        : Math.min(c.discountValue, remaining);
    if (c.maxDiscountAmount != null && d > c.maxDiscountAmount) d = c.maxDiscountAmount;
    if (d < 0) d = 0;
    if (d > remaining) d = remaining;
    total += d;
    remaining -= d;
  }
  return total;
}

declare global {
  interface Window {
    daum: {
      Postcode: new (opts: {
        oncomplete: (data: { address: string; zonecode: string }) => void;
        onclose?: () => void;
        width?: string | number;
        height?: string | number;
      }) => {
        open: () => void;
        embed: (el: HTMLElement) => void;
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
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);
  const [deliveryRequest, setDeliveryRequest] = useState("");

  // "주문자 정보와 동일" 체크 해제 상태에서 사용자가 직접 입력한 recipient 값을 보관.
  // 체크 해제 시 이 값으로 복원한다 (이전 입력이 없었다면 빈 값 그대로).
  const [recipientDraft, setRecipientDraft] = useState({ name: "", phone: "" });
  const [sameAsBuyer, setSameAsBuyer] = useState(false);

  const [giftWrapping, setGiftWrapping] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  // 쿠폰 (로그인 사용자만)
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsInput, setPointsInput] = useState("");

  // 회원 정보 자동입력 (로그인 사용자)
  const [prefill, setPrefill] = useState<CheckoutPrefill | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tossReady, setTossReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetsRef = useRef<any>(null);
  // 주문 생성 성공 후 clear()로 카트를 비우면 items.length가 0이 되는데,
  // 이때 아래 "빈 장바구니 → /shop" 가드가 발동해 완료 페이지 대신 /shop으로
  // 튕기는 경쟁이 발생한다. 주문 완료 중임을 이 ref로 표시해 가드를 건너뛴다.
  const orderPlacedRef = useRef(false);

  const { items, total, clear } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // 빈 장바구니 처리 (로그인 여부와 무관 — 비회원 주문 지원).
  // 단, 주문 완료로 인해 비워진 경우는 제외한다(완료 페이지로 이동 중).
  useEffect(() => {
    if (mounted && items.length === 0 && !orderPlacedRef.current) {
      router.push("/shop");
    }
  }, [mounted, items.length, router]);

  // 로그인 사용자의 사용 가능한 쿠폰을 불러온다(비회원은 쿠폰 없음).
  useEffect(() => {
    if (!mounted || !user) {
      setCoupons([]);
      setSelectedCouponIds([]);
      setPrefill(null);
      setPointsBalance(0);
      setPointsInput("");
      return;
    }
    let cancelled = false;
    getUserCoupons()
      .then((list) => {
        if (!cancelled) setCoupons(list.filter((c) => c.status === "active"));
      })
      .catch(() => {});
    getMyPoints()
      .then((p) => {
        if (!cancelled) setPointsBalance(p);
      })
      .catch(() => {});
    getCheckoutPrefill()
      .then((p) => {
        if (!cancelled) setPrefill(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mounted, user]);

  // 회원 정보로 주문자·배송지 자동 채우기
  const applyPrefill = () => {
    if (!prefill) return;
    setBuyerName(prefill.name);
    setBuyerEmail(prefill.email);
    setBuyerPhone(prefill.phone);
    if (prefill.address) {
      setSameAsBuyer(false);
      setRecipientName(prefill.address.name);
      setRecipientPhone(prefill.address.phone);
      setPostalCode(prefill.address.zip);
      setAddressLine1(prefill.address.address);
      setAddressLine2(prefill.address.addressDetail);
    }
  };

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
      .then(async ({ loadTossPayments, ANONYMOUS }) => {
        if (cancelled) return;
        const tossPayments = await loadTossPayments(clientKey);
        // 비회원은 반드시 SDK의 ANONYMOUS 상수(실제 값 '@@ANONYMOUS')를 써야 한다.
        // 문자열 "ANONYMOUS"를 넘기면 InvalidCustomerKeyError로 위젯 초기화가 실패한다.
        const widgets = tossPayments.widgets({ customerKey: user?.id ?? ANONYMOUS });
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
      .catch((err) => {
        if (cancelled) return;
        console.error("[toss] 결제 위젯 초기화 실패:", err);
        setFormError("결제 수단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      });

    return () => { cancelled = true; };
  }, [mounted, user, items.length, total]);

  // 모바일에서 팝업(.open())이 차단되거나 페이지를 리로드해 입력값이 초기화되는 문제를 피하기 위해
  // 화면 내 오버레이에 임베드(.embed())하는 방식으로 띄운다.
  const handleAddressSearch = () => {
    if (!window.daum) return;
    setPostcodeOpen(true);
  };

  useEffect(() => {
    if (!postcodeOpen || !window.daum || !postcodeRef.current) return;
    postcodeRef.current.innerHTML = "";
    new window.daum.Postcode({
      oncomplete: (data) => {
        setPostalCode(data.zonecode);
        setAddressLine1(data.address);
        setAddressLine2("");
        setPostcodeOpen(false);
        setTimeout(() => document.getElementById("addressLine2")?.focus(), 0);
      },
      onclose: () => setPostcodeOpen(false),
      width: "100%",
      height: "100%",
    }).embed(postcodeRef.current);
  }, [postcodeOpen]);

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

    // 결제창을 켠 경우, 결제창이 준비돼 있어야 진행한다.
    if (PAYMENT_INTEGRATION_ENABLED && !widgetsRef.current) {
      setFormError("결제 수단을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setSubmitting(true);

    // ① 먼저 서버에 pending 주문을 생성한다. 가격/배송비/상품정보는 전부 서버가
    //    DB에서 재계산하므로 여기서는 items(productId/variantId/quantity)와
    //    주문자·배송지 정보만 전달한다.
    let order;
    try {
      order = await createOrderSecure({
        items: items.map((i) => ({
          productId: i.product.id,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        buyerName,
        buyerEmail,
        buyerPhone,
        recipientName,
        recipientPhone,
        postalCode,
        addressLine1,
        addressLine2: addressLine2 || null,
        deliveryRequest: deliveryRequest || null,
        userCouponId: null,
        userCouponIds: selectedCouponIds.length > 0 ? selectedCouponIds : null,
        pointsToUse,
      });
    } catch (err) {
      setSubmitting(false);
      setFormError(
        err instanceof Error ? err.message : "주문을 생성하지 못했습니다. 다시 시도해주세요."
      );
      return;
    }

    // ② 결제 비활성(로컬 기본): 주문만 생성하고 완료 페이지로 이동한다.
    if (!PAYMENT_INTEGRATION_ENABLED) {
      orderPlacedRef.current = true;
      clear();
      router.push(`/checkout/complete?order=${encodeURIComponent(order.orderNumber)}`);
      return;
    }

    // ③ 결제 활성: Toss 결제창을 호출한다. orderId는 서버가 발급한 주문번호,
    //    금액은 서버가 계산한 총액을 사용한다(클라이언트 추정치와 다를 수 있으므로
    //    결제창 금액을 서버 총액으로 맞춘 뒤 결제를 요청한다).
    //    카트 비우기·완료 처리는 결제 성공 후 /checkout/complete에서 수행한다.
    try {
      await widgetsRef.current.setAmount({ currency: "KRW", value: order.totalAmount });
      await widgetsRef.current.requestPayment({
        orderId: order.orderNumber,
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
      // requestPayment 성공 시 페이지가 Toss로 리다이렉트되므로 이후 코드는 실행되지 않는다.
    } catch {
      // 사용자가 결제창을 닫거나 실패한 경우 — 방금 만든 주문은 pending으로 남는다.
      setSubmitting(false);
      setFormError("결제가 취소되었습니다. 다시 시도해주세요.");
    }
  };

  if (!mounted) return null;

  const cartTotal = total();
  const selectedCoupons = coupons.filter((c) => selectedCouponIds.includes(c.id));
  // 여러 쿠폰은 순차(복리)로 적용. (서버 create_order가 최종 재계산)
  const couponDiscount = Math.min(cartTotal, computeStackedDiscount(selectedCoupons, cartTotal));
  // 배송비 무료 기준은 할인 적용 후 금액 기준(create_order RPC와 동일).
  const shipping = cartTotal - couponDiscount >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  // 포인트: 1,000P 이상·잔액 이내·결제액 한도 내에서만 적용(서버 create_order와 동일 규칙).
  const maxPointsUsable = Math.max(0, cartTotal - couponDiscount + shipping);
  const parsedPoints = parseInt(pointsInput, 10) || 0;
  const pointsToUse =
    user && parsedPoints >= MIN_POINTS_USE
      ? Math.min(parsedPoints, pointsBalance, maxPointsUsable)
      : 0;
  const pointsInputInvalid = parsedPoints > 0 && parsedPoints < MIN_POINTS_USE;
  const grandTotal = cartTotal - couponDiscount - pointsToUse + shipping;

  // 쿠폰 선택 토글. 규칙: 중복가능 쿠폰끼리만 함께 사용. 단독 쿠폰은 혼자만 사용.
  const toggleCoupon = (c: UserCoupon) => {
    setSelectedCouponIds((prev) => {
      if (prev.includes(c.id)) return prev.filter((id) => id !== c.id);
      // 단독(중복불가) 쿠폰을 고르면 다른 모든 쿠폰 해제 → 혼자만.
      if (!c.stackable) return [c.id];
      // 중복가능 쿠폰을 고르면 기존 단독 쿠폰은 해제하고 중복가능 쿠폰들만 유지 + 추가.
      const keptStackable = prev.filter((id) => coupons.find((x) => x.id === id)?.stackable);
      return [...keptStackable, c.id];
    });
  };

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />

      {/* 주소 검색 오버레이 (모바일 안정성을 위해 임베드 방식) */}
      {postcodeOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setPostcodeOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md h-[520px] max-h-[85vh] rounded overflow-hidden flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-brand-border shrink-0">
              <span className="text-[14px] tracking-widest">주소 검색</span>
              <button
                type="button"
                onClick={() => setPostcodeOpen(false)}
                aria-label="닫기"
                className="w-8 h-8 grid place-items-center text-brand-gray-mid hover:text-brand-black text-lg"
              >
                ✕
              </button>
            </div>
            <div ref={postcodeRef} className="flex-1 min-h-0" />
          </div>
        </div>
      )}

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
                <div className="flex items-center justify-between border-b border-brand-border pb-1">
                  <h2 className="text-[14px] tracking-[0.25em]">주문자 정보</h2>
                  {user && prefill && (
                    <button
                      type="button"
                      onClick={applyPrefill}
                      className="text-[12px] tracking-widest text-brand-black border border-brand-border px-3 h-8 hover:bg-brand-gray-light transition-colors"
                    >
                      회원 정보로 자동 입력
                    </button>
                  )}
                </div>

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
                    <div className="w-28 shrink-0">
                      <Input
                        placeholder="우편번호"
                        value={postalCode}
                        onChange={setPostalCode}
                        readOnly
                      />
                    </div>
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

                {user && coupons.length > 0 && (
                  <div className="border-t border-brand-border pt-3">
                    <label className="text-xs tracking-wide text-brand-gray-mid block mb-1.5">
                      쿠폰 {selectedCouponIds.length > 0 && `(${selectedCouponIds.length}장 적용)`}
                    </label>
                    <div className="space-y-1.5">
                      {coupons.map((c) => {
                        const eligible = cartTotal >= c.minOrderAmount;
                        const checked = selectedCouponIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2 text-sm px-2 py-1.5 border transition-colors ${
                              checked ? "border-brand-black bg-brand-gray-light" : "border-brand-border"
                            } ${eligible ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!eligible && !checked}
                              onChange={() => toggleCoupon(c)}
                              className="w-4 h-4 accent-brand-black shrink-0"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="font-medium">{c.discountLabel}</span>
                              <span className="text-brand-gray-mid"> · {c.name}</span>
                              {c.stackable && <span className="text-purple-600 text-[12px]"> · 중복가능</span>}
                              {!eligible && (
                                <span className="text-[12px] text-brand-gray-mid">
                                  {" "}({c.minOrderAmount.toLocaleString("ko-KR")}원 이상)
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-brand-gray-mid mt-1.5">
                      ‘중복가능’ 쿠폰끼리는 함께 적용돼요. 일반 쿠폰은 다른 쿠폰과 함께 쓸 수 없어요(혼자만).
                    </p>
                  </div>
                )}

                {user && pointsBalance >= MIN_POINTS_USE && (
                  <div className="border-t border-brand-border pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs tracking-wide text-brand-gray-mid">적립금 사용</label>
                      <span className="text-[11px] text-brand-gray-mid">
                        보유 {pointsBalance.toLocaleString("ko-KR")}P
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={pointsInput}
                        onChange={(e) => setPointsInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder={`${MIN_POINTS_USE.toLocaleString("ko-KR")}P 이상`}
                        className="h-10 flex-1 border border-brand-border px-2 text-sm focus:outline-none focus:border-brand-black"
                      />
                      <button
                        type="button"
                        onClick={() => setPointsInput(String(Math.min(pointsBalance, maxPointsUsable)))}
                        className="h-10 px-3 border border-brand-border text-xs tracking-wide text-brand-gray-mid hover:text-brand-black shrink-0"
                      >
                        전액 사용
                      </button>
                    </div>
                    {pointsInputInvalid ? (
                      <p className="text-[11px] text-red-500 mt-1">
                        {MIN_POINTS_USE.toLocaleString("ko-KR")}P 이상부터 사용할 수 있어요.
                      </p>
                    ) : (
                      <p className="text-[11px] text-brand-gray-mid mt-1">
                        1P = 1원 · 최소 {MIN_POINTS_USE.toLocaleString("ko-KR")}P
                      </p>
                    )}
                  </div>
                )}

                <div className="border-t border-brand-border pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-brand-gray-mid">
                    <span className="tracking-wide">상품 합계</span>
                    <span>₩{cartTotal.toLocaleString("ko-KR")}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-brand-black">
                      <span className="tracking-wide">쿠폰 할인</span>
                      <span>-₩{couponDiscount.toLocaleString("ko-KR")}</span>
                    </div>
                  )}
                  {pointsToUse > 0 && (
                    <div className="flex justify-between text-brand-black">
                      <span className="tracking-wide">적립금 사용</span>
                      <span>-₩{pointsToUse.toLocaleString("ko-KR")}</span>
                    </div>
                  )}
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
