"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { useSale } from "@/components/providers/sale-provider";

const KAKAO_FRIEND_URL = "https://pf.kakao.com/_dDmTX/friend";

/**
 * 장바구니(드로어·페이지)의 결제 버튼 위에 첫 구매 혜택을 안내한다.
 * 광고 문구에서 약속한 혜택(가입 5% · 카톡 채널 3,000원)을 결제 직전에 다시 보여줘
 * "혜택은 어디서 받지?" 하는 망설임을 줄이는 목적.
 * - 비회원: 가입 쿠폰 + 카톡 쿠폰 안내(가입은 모달로 바로 열기)
 * - 회원: 보유 쿠폰은 결제 단계에서 적용된다는 안내 + 카톡 쿠폰
 */
export default function CompCartBenefits({
  onNavigate,
  tone = "gray",
}: {
  onNavigate?: () => void;
  /** 배경 톤 — 흰 배경(드로어)에선 gray, 회색 배경(장바구니 페이지)에선 white */
  tone?: "gray" | "white";
}) {
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((s) => s.user);
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);

  useEffect(() => setMounted(true), []);
  const isMember = mounted && !!user;
  const sale = useSale();

  // 세일 기간엔 쿠폰 중복 사용이 불가(결제에서 쿠폰 숨김)하므로 쿠폰 혜택 안내도 숨긴다.
  if (sale.active) return null;

  const linkCls =
    "underline underline-offset-2 text-brand-black hover:text-brand-gray-mid transition-colors";

  return (
    <div className={`${tone === "white" ? "bg-white" : "bg-brand-gray-light"} px-4 py-3 text-[13px] tracking-wide text-brand-gray-mid space-y-1`}>
      <p className="text-brand-black font-medium">🎁 첫 구매 혜택</p>
      {isMember ? (
        <p>· 보유하신 쿠폰은 결제 단계에서 적용할 수 있어요</p>
      ) : (
        <p>
          ·{" "}
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              setAuthModalOpen(true, "signup");
            }}
            className={linkCls}
          >
            회원가입
          </button>{" "}
          시 5% 할인 쿠폰 즉시 지급
        </p>
      )}
      <p>
        ·{" "}
        <a href={KAKAO_FRIEND_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
          카카오톡 채널 추가
        </a>{" "}
        시 3,000원 할인 쿠폰
      </p>
    </div>
  );
}
