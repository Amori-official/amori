"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/products", label: "상품 관리" },
  { href: "/admin/orders", label: "주문 관리" },
  { href: "/admin/coupons", label: "쿠폰 관리" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="bg-white p-2 lg:p-3">
      <ul className="flex lg:flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-4 py-2.5 text-[14px] tracking-widest transition-colors ${
                  active
                    ? "bg-brand-black text-white"
                    : "text-brand-gray-mid hover:bg-brand-gray-light hover:text-brand-black"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
