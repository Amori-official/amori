"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUIStore } from "@/store/ui";

// URL ?openModal=auth 파라미터를 감지해 auth 모달을 자동으로 엽니다.
// 보호 라우트에서 리다이렉트될 때 사용됩니다.
export default function AuthModalController() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuthModalOpen } = useUIStore();

  useEffect(() => {
    if (searchParams.get("openModal") === "auth") {
      setAuthModalOpen(true, "login");
      // URL 파라미터 제거 (히스토리 교체)
      const url = new URL(window.location.href);
      url.searchParams.delete("openModal");
      url.searchParams.delete("callbackUrl");
      router.replace(url.pathname);
    }
  }, [searchParams, setAuthModalOpen, router]);

  return null;
}
