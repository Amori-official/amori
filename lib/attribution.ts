// 주문 유입 경로(UTM) 기억 — 브라우저 측.
//
// 광고 링크(?utm_source=meta…)로 들어온 방문을 localStorage에 30일간 기억했다가
// 주문 생성 시 함께 보낸다(create_order의 p_attribution → orders.attribution).
// 마지막 유입 기준(last-touch): 새 UTM 링크로 다시 들어오면 덮어쓴다.
// UTM 없이 외부 사이트에서 들어온 경우엔, 기억된 값이 없을 때만 referrer 도메인을 남긴다.

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_path?: string;
  referrer?: string;
  captured_at?: string;
}

const STORAGE_KEY = "amori-attribution";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const MAX_LEN = 200;

function clip(value: string): string {
  return value.slice(0, MAX_LEN);
}

function read(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Attribution;
    const at = data.captured_at ? Date.parse(data.captured_at) : NaN;
    if (!Number.isFinite(at) || Date.now() - at > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function write(data: Attribution): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/** 페이지 진입 시 호출 — 현재 URL/referrer에서 유입 정보를 기억한다. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const landingPath = clip(window.location.pathname);
    const now = new Date().toISOString();

    const utm: Attribution = {};
    for (const key of UTM_KEYS) {
      const v = params.get(key);
      if (v) utm[key] = clip(v);
    }

    if (Object.keys(utm).length > 0) {
      write({ ...utm, landing_path: landingPath, captured_at: now });
      return;
    }

    // UTM 없는 외부 유입: 기존 기억값이 없을 때만 referrer 도메인 기록
    // (결제창 복귀 등 /checkout 경로는 제외 — 토스 도메인이 유입처로 잡히지 않게)
    if (document.referrer && !read() && !landingPath.startsWith("/checkout")) {
      const ref = new URL(document.referrer);
      if (ref.host !== window.location.host) {
        write({ referrer: clip(ref.host), landing_path: landingPath, captured_at: now });
      }
    }
  } catch {}
}

/** 주문 생성 시 함께 보낼 유입 정보. 없으면 null. */
export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  return read();
}

/** orders.attribution(jsonb) → 정규화. 관리자 화면 표시용. */
export function toAttribution(value: unknown): Attribution | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const out: Attribution = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") (out as Record<string, string>)[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** 목록 배지용 짧은 라벨. 예) "meta", "instagram.com". 정보 없으면 null. */
export function attributionLabel(a: Attribution | null): string | null {
  if (!a) return null;
  return a.utm_source ?? a.referrer ?? null;
}
