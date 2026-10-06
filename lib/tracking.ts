// 배송조회 링크 — 택배사별 실제 조회 결과 화면으로 바로 연결한다.
// 통합 조회(tracker.delivery)를 사용해 택배사 코드 + 운송장번호로 실시간 결과를 보여준다.
// 매칭되지 않는 택배사(직접 입력 등)는 네이버 통합검색으로 폴백한다.

function carrierId(courier: string): string | null {
  const c = courier || "";
  if (c.includes("CJ") || c.includes("대한통운")) return "kr.cjlogistics";
  if (c.includes("우체국")) return "kr.epost";
  if (c.includes("한진")) return "kr.hanjin";
  if (c.includes("롯데")) return "kr.lotte";
  if (c.includes("로젠")) return "kr.logen";
  return null;
}

export function trackingUrl(courier: string | null | undefined, trackingNumber: string | null | undefined): string {
  const no = (trackingNumber ?? "").trim();
  const id = carrierId(courier ?? "");
  if (id && no) {
    return `https://tracker.delivery/#/${id}/${encodeURIComponent(no)}`;
  }
  // 알 수 없는 택배사 또는 번호 없음: 네이버 검색 폴백
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(
    `${courier ?? ""} 택배조회 ${no}`.trim()
  )}`;
}
