import Link from "next/link";
import Image from "next/image";

const menuLinks = [
  { href: "/shop", label: "Shop All" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/care", label: "Care Guide" },
];

const policyLinks = [
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/terms", label: "이용약관" },
  { href: "/shipping", label: "배송·반품 안내" },
  { href: "/care", label: "세탁·관리법" },
];

export default function CompFooter() {
  return (
    <footer className="bg-white border-t border-brand-border">
      <div className="max-w-screen-xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-brand-border">
          {/* 브랜드 */}
          <div className="flex flex-col gap-4">
            <div style={{ position: "relative", width: "77px", height: "56px" }}>
              <Image src="/logo.png" alt="AMORI" fill className="object-contain" />
            </div>
            <p className="text-[13px] text-brand-gray-mid tracking-wide leading-6">
              아기를 위한 패브릭 브랜드.
              <br />
              KC 인증 소재만을 사용합니다.
            </p>
            <a
              href="mailto:contact@amori.kr"
              className="text-[13px] text-brand-gray-mid tracking-wide hover:text-brand-black transition-colors"
            >
              contact@amori.kr
            </a>
          </div>

          {/* 메뉴 */}
          <div className="flex flex-col gap-4">
            <p className="text-[12px] tracking-widest">MENU</p>
            <ul className="flex flex-col gap-3">
              {menuLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-brand-gray-mid tracking-wide hover:text-brand-black transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 정책 */}
          <div className="flex flex-col gap-4">
            <p className="text-[12px] tracking-widest">POLICY</p>
            <ul className="flex flex-col gap-3">
              {policyLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-brand-gray-mid tracking-wide hover:text-brand-black transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 사업자 정보 */}
        <div className="pt-8 text-[12px] text-brand-gray-mid tracking-wide leading-7">
          <p>
            상호명: 아모리 | 대표자: 홍길동 | 사업자등록번호: 000-00-00000
          </p>
          <p>
            통신판매업신고: 제2024-서울-0000호 | 주소: 서울특별시 강남구
          </p>
          <p className="mt-4">© 2025 AMORI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
