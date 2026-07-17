import Link from "next/link";
import Image from "next/image";

// TODO: About, Lookbook 콘텐츠 준비되면 메뉴에 복원 (라우트/컴포넌트는 유지됨: app/about, app/lookbook)
const menuLinks = [
  { href: "/shop", label: "Shop All" },
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
              어린이제품 안전기준 시험 완료 (인증번호: CB014H2463-6001)
            </p>
            <a
              href="mailto:amori_official@naver.com"
              className="text-[13px] text-brand-gray-mid tracking-wide hover:text-brand-black transition-colors"
            >
              amori_official@naver.com
            </a>
            <p className="text-[12px] text-brand-gray-mid tracking-wide">
              고객센터 운영시간: 10:00-18:00 (주말 및 공휴일 휴무)
            </p>
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
            상호명: 아모리 | 대표자: 양은옥 | 사업자등록번호: 54321-02-174
          </p>
          <p>
            통신판매업신고: 2026-부천원미-0519 | 주소: 경기도 부천시 원미구 도약로 56 (진달래마을) 2202동 602호
          </p>
          <p className="mt-4">© 2025 AMORI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
