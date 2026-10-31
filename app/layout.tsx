import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import "./globals.css";
import { createServerSideClient } from "@/lib/supabase-server";
import AuthProvider from "@/components/providers/auth-provider";
import AuthModalController from "@/components/auth-modal-controller";
import CompNav from "@/components/comp-nav";
import CompFooter from "@/components/comp-footer";
import SectionMarquee from "@/components/sections/section-marquee";
import CompToast from "@/components/comp-toast";
import CompSitePopup from "@/components/comp-site-popup";
import CompKakaoFab from "@/components/comp-kakao-fab";
import CompVisitTracker from "@/components/comp-visit-tracker";
import { getSiteSettings } from "@/app/actions/site";
import { isPopupActive } from "@/lib/site";
import MetaPixel from "@/components/meta-pixel";

// 클라이언트 전용 무거운 컴포넌트는 dynamic import로 코드 분할
const CompCartDrawer = dynamic(() => import("@/components/comp-cart-drawer"), { ssr: false });
const CompAuthModal = dynamic(() => import("@/components/comp-auth-modal"), { ssr: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amori.kr";

// 검증 코드만 추출 — 사용자가 <meta …> 태그 전체나 'google-site-verification=' 접두사째
// 붙여넣어도 content의 '코드'만 뽑아낸다(흔한 실수 방어).
function verificationToken(raw?: string): string | undefined {
  if (!raw) return undefined;
  let v = raw.trim();
  const m = v.match(/content=["']([^"']+)["']/i);
  if (m) v = m[1].trim();
  v = v.replace(/^(google|naver)-site-verification[=:]\s*/i, "").trim();
  return v || undefined;
}

const GOOGLE_VERIFICATION = verificationToken(process.env.GOOGLE_SITE_VERIFICATION);
const NAVER_VERIFICATION = verificationToken(process.env.NAVER_SITE_VERIFICATION);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "아모리 AMORI — 아기를 위한 패브릭 브랜드",
    template: "%s | 아모리 AMORI",
  },
  description:
    "아모리(AMORI) — 국내산 면 100% 거즈로 만든 아기 패브릭 브랜드. 어린이제품 안전기준 시험을 완료했습니다.",
  keywords: ["아모리", "AMORI", "amori", "아모리 거즈", "아모리 빕", "아기 패브릭", "거즈", "유아 의류", "아기 침구"],
  authors: [{ name: "아모리 AMORI" }],
  alternates: { canonical: SITE_URL },
  verification: {
    google: GOOGLE_VERIFICATION,
    other: NAVER_VERIFICATION ? { "naver-site-verification": NAVER_VERIFICATION } : {},
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "AMORI",
    title: "AMORI — 아기를 위한 패브릭 브랜드",
    description: "국내산 면 100% 거즈로 만든 아기 패브릭 브랜드.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "AMORI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AMORI — 아기를 위한 패브릭 브랜드",
    description: "국내산 면 100% 거즈로 만든 아기 패브릭 브랜드.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    const supabase = createServerSideClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase 미설정 시 비로그인 상태로 진행
  }

  const site = await getSiteSettings();
  const popupActive = isPopupActive(site);

  // 브랜드 인식용 구조화 데이터(Organization + WebSite) — '아모리' 검색 시 브랜드/사이트링크 노출에 도움.
  const brandJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "아모리",
        alternateName: "AMORI",
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description: "국내산 면 100% 거즈로 만든 아기 패브릭 브랜드 아모리(AMORI).",
        sameAs: ["https://www.instagram.com/amori_atelier", "https://pf.kakao.com/_dDmTX"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "아모리 AMORI",
        alternateName: "아모리",
        url: SITE_URL,
        inLanguage: "ko-KR",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(brandJsonLd) }}
        />
        <AuthProvider initialUser={user}>
          <div className="sticky top-0 z-50">
            <SectionMarquee items={site.marqueeItems} />
            <CompNav />
          </div>
          <main className="flex-1">{children}</main>
          <CompFooter />
          <CompCartDrawer />
          <CompAuthModal />
          <CompToast />
          <CompKakaoFab />
          {popupActive && (
            <CompSitePopup
              title={site.popupTitle}
              body={site.popupBody}
              imageUrl={site.popupImageUrl}
              linkUrl={site.popupLinkUrl}
              linkLabel={site.popupLinkLabel}
            />
          )}
          <Suspense fallback={null}>
            <AuthModalController />
          </Suspense>
          <Suspense fallback={null}>
            <MetaPixel />
          </Suspense>
          <Suspense fallback={null}>
            <CompVisitTracker />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
