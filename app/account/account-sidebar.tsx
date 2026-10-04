"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/account/orders", label: "주문 내역" },
  { href: "/account/profile", label: "회원 정보 수정" },
  { href: "/account/wishlist", label: "위시리스트" },
  { href: "/account/coupons", label: "보유 쿠폰" },
  { href: "/account/points", label: "적립금" },
];

export default function AccountSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside id="account-nav">
      {/* 모바일: 2열 그리드로 한 화면에 모두 노출 / 데스크톱: 세로 목록 */}
      <nav className="grid grid-cols-2 lg:flex lg:flex-col gap-0 border lg:border-0 border-brand-border rounded lg:rounded-none overflow-hidden mb-4 lg:mb-0">
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={[
                "text-center lg:text-left text-[14px] tracking-widest px-3 lg:px-0 py-3 lg:py-3.5 border-b lg:border-b-0 lg:border-l-[2px] transition-colors",
                active
                  ? "lg:border-brand-black text-brand-black bg-brand-gray-light lg:bg-transparent font-medium"
                  : "lg:border-transparent text-brand-gray-mid hover:text-brand-black",
              ].join(" ")}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 관리자 전용 링크 */}
      {isAdmin && (
        <Link
          href="/admin"
          className="hidden lg:block text-[14px] tracking-widest text-brand-black underline underline-offset-4 hover:text-brand-gray-mid transition-colors mt-6 px-0 py-2"
        >
          관리자 페이지 →
        </Link>
      )}

      {/* 데스크톱 로그아웃 */}
      <button
        onClick={handleSignOut}
        className="hidden lg:block text-[14px] tracking-widest text-brand-gray-mid hover:text-brand-black transition-colors mt-2 px-0 py-2"
      >
        로그아웃
      </button>
    </aside>
  );
}
