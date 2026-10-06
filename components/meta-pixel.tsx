"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { META_PIXEL_ID, trackMeta } from "@/lib/meta-pixel";
import { captureAttribution } from "@/lib/attribution";

// Meta 픽셀 기본 코드(fbq 큐 스텁 + fbevents.js 로드 + init)를 설치한다.
// 큐 스텁이 즉시 생기므로 스크립트 로드 전에 호출된 track도 유실되지 않는다.
function installPixel(pixelId: string) {
  if (window.fbq) return;
  type Fbq = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[];
    push: Fbq;
    loaded: boolean;
    version: string;
  };
  const n = function (...args: unknown[]) {
    // fbevents.js의 callMethod는 this(=fbq)에 의존하므로 반드시 apply로 호출한다.
    if (n.callMethod) n.callMethod.apply(n, args);
    else n.queue.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  window.fbq = n;
  (window as unknown as { _fbq: Fbq })._fbq = n;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  n("init", pixelId);
}

// App Router는 클라이언트 내비게이션 시 페이지를 새로 로드하지 않으므로
// 경로 변경을 감지해 PageView를 직접 보낸다. 관리자 페이지는 추적하지 않는다.
// 같은 경로 감지로 광고 유입(UTM)도 기억한다(lib/attribution.ts).
export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string | null>(null);

  // 주문 유입 경로(UTM) 기억 — 픽셀 설정 여부와 무관하게 동작
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    captureAttribution();
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!META_PIXEL_ID || pathname.startsWith("/admin")) return;
    installPixel(META_PIXEL_ID);
    const key = `${pathname}?${searchParams.toString()}`;
    if (lastTracked.current === key) return;
    lastTracked.current = key;
    trackMeta("PageView", {}, { serverSide: false });
  }, [pathname, searchParams]);

  return null;
}
