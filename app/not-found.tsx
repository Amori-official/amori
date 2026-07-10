import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-[60px] min-h-screen flex flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="space-y-3">
        <p className="text-[12px] tracking-[0.5em] text-brand-gray-mid">404</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-[0.1em]">Page Not Found</h1>
        <p className="text-sm text-brand-gray-mid tracking-wide max-w-sm mx-auto leading-relaxed">
          찾으시는 페이지가 없거나 이동되었습니다.
        </p>
      </div>

      {/* 장식선 */}
      <div className="flex items-center gap-4 w-32">
        <div className="flex-1 h-px bg-brand-border" />
        <span className="text-[12px] tracking-widest text-brand-border">✦</span>
        <div className="flex-1 h-px bg-brand-border" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/shop"
          className="px-8 h-11 bg-brand-fill text-brand-black text-[12px] tracking-widest
            flex items-center justify-center hover:bg-brand-gray-mid transition-colors"
        >
          SHOP 보러가기
        </Link>
        <Link
          href="/"
          className="px-8 h-11 border border-brand-border text-brand-gray-mid text-[12px] tracking-widest
            flex items-center justify-center hover:border-brand-black hover:text-brand-black transition-colors"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
