"use client";

import { usePathname } from "next/navigation";

// 카카오톡 채널 1:1 문의 바로가기. 채널 홈(_dDmTX)의 채팅 진입 URL.
const KAKAO_CHAT_URL = "https://pf.kakao.com/_dDmTX/chat";

// 전 페이지 우측 하단 고정 바로가기. 단, 관리자/결제 화면에서는 숨긴다
// (관리자에는 불필요, 결제 화면에선 하단 '결제하기' 버튼과 겹칠 수 있어 제외).
export default function CompKakaoFab() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;

  return (
    <a
      href={KAKAO_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="카카오톡 1:1 문의"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 h-12 pl-3 pr-4
        rounded-full bg-[#FEE500] text-[#3C1E1E] shadow-lg hover:brightness-95
        transition-[filter] active:scale-95"
    >
      {/* 카카오톡 말풍선 아이콘 */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3C6.98 3 3 6.2 3 10.1c0 2.5 1.67 4.7 4.19 5.96-.14.5-.9 3.1-.93 3.3 0 0-.02.17.09.23.11.07.24.02.24.02.32-.04 3.7-2.42 4.28-2.83.37.05.75.08 1.14.08 5.02 0 9-3.2 9-7.09S17.02 3 12 3z" />
      </svg>
      <span className="text-[13px] font-medium tracking-wide">문의</span>
    </a>
  );
}
