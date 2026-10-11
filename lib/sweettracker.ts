// 스마트택배(Sweet Tracker) 배송조회 API — 서버 전용.
// 송장(운송장) 기준으로 택배사 배송 상태를 조회해 '배송완료' 여부를 알려준다.
// SWEETTRACKER_API_KEY 환경변수가 있을 때만 동작하며, 어떤 오류에도 흐름을 막지 않는다
// (불확실하면 null을 반환 → 호출 측에서 상태를 바꾸지 않음).

// 우리 courier 표기 → 스마트택배 택배사 코드(t_code)
function trackerCode(courier: string): string | null {
  const c = courier || "";
  if (c.includes("CJ") || c.includes("대한통운")) return "04";
  if (c.includes("우체국")) return "01";
  if (c.includes("한진")) return "05";
  if (c.includes("롯데")) return "08";
  if (c.includes("로젠")) return "06";
  return null; // 직접 입력 등 매칭 불가 → 자동추적 제외
}

/**
 * 배송완료 여부.
 *  - true  : 택배사가 '배송완료'로 확인
 *  - false : 아직 배송 중(또는 조회됐지만 미완료)
 *  - null  : 조회 불가(키 없음/택배사 매칭 불가/네트워크·API 오류) → 상태 변경하지 않음
 */
export async function isDelivered(
  courier: string | null | undefined,
  invoice: string | null | undefined
): Promise<boolean | null> {
  const key = process.env.SWEETTRACKER_API_KEY;
  if (!key) return null;

  const code = trackerCode(courier ?? "");
  const no = (invoice ?? "").replace(/[^0-9A-Za-z]/g, "");
  if (!code || !no) return null;

  try {
    const url =
      `https://info.sweettracker.co.kr/api/v1/trackingInfo` +
      `?t_key=${encodeURIComponent(key)}&t_code=${code}&t_invoice=${encodeURIComponent(no)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: boolean;
      completeYN?: string;
      level?: number;
      message?: string;
    };
    // 조회 자체 실패(잘못된 송장 등)는 null로 두어 상태를 건드리지 않는다.
    if (data?.status === false) return null;
    if (data?.completeYN === "Y") return true;
    if (typeof data?.level === "number" && data.level >= 6) return true;
    return false;
  } catch {
    return null;
  }
}
