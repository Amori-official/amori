"use client";

// 루트 레이아웃(app/layout.tsx) 레벨에서 발생한 오류를 잡는 최상위 에러 바운더리.
// app/error.tsx는 루트 레이아웃 '아래' 세그먼트만 담당하므로, 레이아웃 자체나
// 배포 롤아웃 중 순간적 불일치로 생긴 오류는 이 global-error가 받는다.
// (이 컴포넌트는 루트 레이아웃을 대체하므로 자체 <html>/<body>가 필요하다.)

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2rem",
          padding: "1rem",
          textAlign: "center",
          fontFamily:
            '"Apple SD Gothic Neo", "Helvetica Neue", sans-serif',
          color: "#1B1A19",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p style={{ fontSize: 14, letterSpacing: "0.4em", color: "#68625F", margin: 0 }}>
            ERROR
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "0.15em", margin: 0 }}>
            문제가 발생했습니다
          </h1>
          <p style={{ fontSize: 14, letterSpacing: "0.05em", color: "#68625F", marginTop: 8 }}>
            일시적인 오류입니다. 잠시 후 다시 시도해주세요.
          </p>
          {error?.digest && (
            <p style={{ fontSize: 11, letterSpacing: "0.05em", color: "#B0ACA8", marginTop: 4 }}>
              오류 코드: {error.digest}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              height: 44,
              padding: "0 2rem",
              background: "#E7E5E3",
              color: "#1B1A19",
              fontSize: 14,
              letterSpacing: "0.2em",
              border: "none",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
          <a
            href="/"
            style={{
              height: 44,
              padding: "0 2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #DCDAD8",
              color: "#68625F",
              fontSize: 14,
              letterSpacing: "0.2em",
              textDecoration: "none",
            }}
          >
            홈으로
          </a>
        </div>
      </body>
    </html>
  );
}
