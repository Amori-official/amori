"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logVisit } from "@/app/actions/visits";

const VID_KEY = "amori_vid";

// 브라우저별 익명 방문자 ID(개인정보 아님). 없으면 생성해 localStorage에 보관.
function getVisitorId(): string | null {
  try {
    let id = localStorage.getItem(VID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(VID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// 페이지 이동(경로 변경)마다 방문을 기록한다. 관리자 화면은 집계에서 제외.
export default function CompVisitTracker() {
  const pathname = usePathname() || "";

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const id = getVisitorId();
    if (!id) return;
    logVisit(id).catch(() => {});
  }, [pathname]);

  return null;
}
