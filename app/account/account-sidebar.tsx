"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/account/orders", label: "주문 내역" },
  { href: "/account/profile", label: "회원 정보 수정" },
  { href: "/account/wishlist", label: "위시리스트" },
  { href: "/account/coupons", label: "보유 쿠폰" },
];

export default function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside id="account-nav">
      {/* 모바일: 수평 스크롤 */}
      <nav className="flex lg:flex-col gap-0 overflow-x-auto lg:overflow-x-visible border-b lg:border-b-0 border-brand-border pb-1 lg:pb-0 mb-4 lg:mb-0">
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={[
                "shrink-0 text-[12px] tracking-widest px-4 lg:px-0 py-3 lg:py-3.5 border-b-2 lg:border-b-0 lg:border-l-[2px] transition-colors whitespace-nowrap",
                active
                  ? "border-brand-black text-brand-black"
                  : "border-transparent text-brand-gray-mid hover:text-brand-black",
              ].join(" ")}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 데스크톱 로그아웃 */}
      <button
        onClick={handleSignOut}
        className="hidden lg:block text-[12px] tracking-widest text-brand-gray-mid hover:text-brand-black transition-colors mt-6 px-0 py-2"
      >
        로그아웃
      </button>
    </aside>
  );
}
