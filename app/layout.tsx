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

// 클라이언트 전용 무거운 컴포넌트는 dynamic import로 코드 분할
const CompCartDrawer = dynamic(() => import("@/components/comp-cart-drawer"), { ssr: false });
const CompAuthModal = dynamic(() => import("@/components/comp-auth-modal"), { ssr: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amori.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AMORI — 아기를 위한 패브릭 브랜드",
    template: "%s | AMORI",
  },
  description:
    "오가닉 코튼, 메리노 울, 뱀부 소재로 만든 아기 패브릭 브랜드. 수유, 침구, 패션, 외출 카테고리.",
  keywords: ["아기 패브릭", "오가닉 코튼", "유아 의류", "아기 침구", "AMORI"],
  authors: [{ name: "AMORI" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "AMORI",
    title: "AMORI — 아기를 위한 패브릭 브랜드",
    description: "오가닉 코튼, 메리노 울, 뱀부 소재로 만든 아기 패브릭 브랜드.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "AMORI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AMORI — 아기를 위한 패브릭 브랜드",
    description: "오가닉 코튼, 메리노 울, 뱀부 소재로 만든 아기 패브릭 브랜드.",
    images: ["/og-image.jpg"],
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

  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col antialiased">
        <AuthProvider initialUser={user}>
          <div className="sticky top-0 z-50">
            <SectionMarquee />
            <CompNav />
          </div>
          <main className="flex-1">{children}</main>
          <CompFooter />
          <CompCartDrawer />
          <CompAuthModal />
          <CompToast />
          <Suspense fallback={null}>
            <AuthModalController />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
