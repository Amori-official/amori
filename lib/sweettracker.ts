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
  const key = process.env.SWEETTRACKER_API_KEY?.trim();
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
    if ((data as { status?: unknown })?.status === false) return null;
    return isDeliveredPayload(data);
  } catch {
    return null;
  }
}

// 스마트택배 응답에서 '배송완료' 판정. 응답마다 필드가 조금씩 달라(complete/completeYN/level)
// 세 가지를 모두 본다. level 6 = 배송완료.
function isDeliveredPayload(data: unknown): boolean {
  const d = (data ?? {}) as { complete?: unknown; completeYN?: unknown; level?: unknown };
  if (d.complete === true) return true;
  if (d.completeYN === "Y") return true;
  if (typeof d.level === "number" && d.level >= 6) return true;
  return false;
}

export interface TrackingDiagnosis {
  keySet: boolean;
  carrierCode: string | null;
  invoice: string;
  /** 키 확인용 마스킹 미리보기(길이 + 앞3·뒤2글자). 전체 키는 노출하지 않음. */
  keyPreview?: string;
  httpOk?: boolean;
  apiStatus?: unknown;
  msg?: string;
  completeYN?: string;
  level?: number;
  delivered?: boolean;
  error?: string;
}

/** 진단용 — 실제 응답을 그대로 반환해 자동전환이 왜 안 되는지 눈으로 확인한다. */
export async function diagnoseTracking(
  courier: string | null | undefined,
  invoice: string | null | undefined
): Promise<TrackingDiagnosis> {
  const key = process.env.SWEETTRACKER_API_KEY?.trim();
  const code = trackerCode(courier ?? "");
  const no = (invoice ?? "").replace(/[^0-9A-Za-z]/g, "");
  const keyPreview = key
    ? `${key.length}자 (${key.slice(0, 3)}…${key.slice(-2)})`
    : undefined;
  const base: TrackingDiagnosis = { keySet: !!key, carrierCode: code, invoice: no, keyPreview };

  if (!key) return { ...base, error: "API 키가 설정되지 않았어요 (SWEETTRACKER_API_KEY)." };
  if (!code) return { ...base, error: "지원하지 않는 택배사예요 (CJ·우체국·한진·롯데·로젠만 자동조회)." };
  if (!no) return { ...base, error: "운송장 번호가 없어요." };

  try {
    const url =
      `https://info.sweettracker.co.kr/api/v1/trackingInfo` +
      `?t_key=${encodeURIComponent(key)}&t_code=${code}&t_invoice=${encodeURIComponent(no)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const level = typeof data.level === "number" ? (data.level as number) : undefined;
    const completeYN =
      typeof data.completeYN === "string"
        ? (data.completeYN as string)
        : data.complete === true
          ? "Y"
          : undefined;
    const delivered = isDeliveredPayload(data);
    return {
      ...base,
      httpOk: res.ok,
      apiStatus: data.status,
      msg: typeof data.msg === "string" ? data.msg : typeof data.message === "string" ? (data.message as string) : undefined,
      completeYN,
      level,
      delivered,
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "조회 실패" };
  }
}
