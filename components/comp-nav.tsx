"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/store/ui";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { signOut } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

// TODO: ABOUT, LOOKBOOK 콘텐츠 준비되면 메뉴에 복원 (라우트/컴포넌트는 유지됨: app/about, app/lookbook)
const navLinks = [
  { href: "/", label: "HOME" },
  { href: "/shop", label: "SHOP" },
  { href: "/faq", label: "FAQ" },
  { href: "/care", label: "CARE" },
];

export default function CompNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { setCartOpen, setAuthModalOpen } = useUIStore();
  const items = useCartStore((s) => s.items);
  const cartCount = mounted ? items.reduce((sum, i) => sum + i.quantity, 0) : 0;
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const displayName = user?.user_metadata?.name
    ? (user.user_metadata.name as string).split(" ")[0].toUpperCase()
    : null;

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={`h-20 bg-white transition-all duration-300 ${
          scrolled ? "shadow-[0_1px_8px_0_rgba(0,0,0,0.06)]" : ""
        }`}
      >
        <div className="max-w-screen-xl mx-auto h-full px-6 grid grid-cols-3 items-center">
          {/* 로고 */}
          <Link href="/" className="flex items-center">
            <div style={{ position: "relative", width: "97px", height: "28px" }}>
              <Image src="/logo-text.png" alt="AMORI" fill className="object-contain" priority />
            </div>
          </Link>

          {/* 센터 내비 */}
          <ul className="hidden md:flex items-center justify-center gap-7">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[12px] tracking-widest text-brand-black hover:text-brand-gray-mid transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* 우측 아이콘 (모바일에서 센터 내비가 hidden으로 그리드에서 빠지므로 3번째 컬럼에 명시적으로 고정) */}
          <div className="col-start-3 flex items-center justify-end gap-4">
            <button
              aria-label="검색"
              className="hidden md:block text-brand-black hover:text-brand-gray-mid transition-colors"
            >
              <Search size={17} strokeWidth={1.5} />
            </button>
            {mounted && user ? (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/account"
                  className="text-[12px] tracking-widest text-brand-black hover:text-brand-gray-mid transition-colors"
                >
                  {displayName ?? "MY PAGE"}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-[12px] tracking-widest text-brand-gray-mid hover:text-brand-black transition-colors"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <button
                aria-label="로그인"
                onClick={() => setAuthModalOpen(true, "login")}
                className="hidden md:block text-brand-black hover:text-brand-gray-mid transition-colors"
              >
                <User size={17} strokeWidth={1.5} />
              </button>
            )}
            <button
              aria-label="장바구니"
              onClick={() => setCartOpen(true)}
              className="relative text-brand-black hover:text-brand-gray-mid transition-colors"
            >
              <ShoppingBag size={17} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-fill text-brand-black text-[9px] w-4 h-4 flex items-center justify-center rounded-full leading-none">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              aria-label="메뉴 열기"
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-brand-black"
            >
              <Menu size={19} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </nav>

      {/* 모바일 풀스크린 오버레이 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-white flex flex-col"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between h-20 px-6 border-b border-brand-border">
              <div style={{ position: "relative", width: "97px", height: "28px" }}>
                <Image src="/logo-text.png" alt="AMORI" fill className="object-contain" />
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="메뉴 닫기"
              >
                <X size={19} strokeWidth={1.5} />
              </button>
            </div>

            <ul className="flex-1 flex flex-col justify-center px-8 gap-7">
              {navLinks.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                >
                  <Link
                    href={l.href}
                    className="text-2xl font-light tracking-widest"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </Link>
                </motion.li>
              ))}
            </ul>

            <div className="px-8 pb-12 flex gap-6 border-t border-brand-border pt-6">
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="text-[12px] tracking-widest text-brand-gray-mid"
                    onClick={() => setMobileOpen(false)}
                  >
                    {displayName ?? "MY PAGE"}
                  </Link>
                  <button
                    onClick={() => { handleSignOut(); setMobileOpen(false); }}
                    className="text-[12px] tracking-widest text-brand-gray-mid"
                  >
                    LOGOUT
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setAuthModalOpen(true, "login"); setMobileOpen(false); }}
                  className="text-[12px] tracking-widest text-brand-gray-mid"
                >
                  LOGIN
                </button>
              )}
              <button
                onClick={() => { setCartOpen(true); setMobileOpen(false); }}
                className="text-[12px] tracking-widest text-brand-gray-mid"
              >
                CART {cartCount > 0 && `(${cartCount})`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
