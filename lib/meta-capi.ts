// 서버 전용 — 클라이언트 컴포넌트에서 import 금지 (액세스 토큰 사용).
// Meta 전환 API(Conversions API) — 서버 측 전송.
//
// 필요 환경변수 (없으면 전부 no-op):
//   NEXT_PUBLIC_META_PIXEL_ID  — 픽셀 ID (브라우저와 공용)
//   META_CAPI_ACCESS_TOKEN     — 이벤트 관리자 > 설정 > 전환 API > 액세스 토큰 생성 (서버 전용)
//   META_TEST_EVENT_CODE       — (선택) 이벤트 관리자 '이벤트 테스트' 탭의 코드. 검증 끝나면 제거
//
// 개인정보(이메일/전화번호/회원 ID)는 Meta 규격대로 SHA-256 해시 후에만 전송한다.

import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import type { MetaCustomData, MetaEventName } from "@/lib/meta-pixel";

const GRAPH_API_VERSION = "v23.0";

export interface CapiResult {
  ok: boolean;
  status?: number;
  /** Meta 응답의 오류 메시지(진단용, 비밀값 미포함) */
  error?: string;
}

export interface CapiUserInput {
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // 한국 번호 010-1234-5678 → 821012345678 (국가코드 포함, 선행 0 제거)
  if (digits.startsWith("0")) digits = `82${digits.slice(1)}`;
  return digits;
}

export function isCapiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN);
}

/**
 * 서버에서 CAPI 이벤트 1건 전송. 요청 컨텍스트(서버 액션/Route Handler) 안에서 호출해야
 * 쿠키(_fbp/_fbc)·IP·User-Agent를 읽을 수 있다. 실패해도 throw하지 않는다.
 */
export async function sendCapiEvent(params: {
  eventName: MetaEventName;
  eventId: string;
  eventSourceUrl?: string;
  customData?: MetaCustomData;
  user?: CapiUserInput;
}): Promise<CapiResult> {
  if (!isCapiConfigured()) return { ok: false, error: "not_configured" };

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID!;
  const token = process.env.META_CAPI_ACCESS_TOKEN!;

  try {
    const cookieStore = cookies();
    const headerStore = headers();

    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      undefined;
    const ua = headerStore.get("user-agent") ?? undefined;
    const referer = headerStore.get("referer") ?? undefined;

    const userData: Record<string, unknown> = {
      client_ip_address: ip,
      client_user_agent: ua,
      fbp: cookieStore.get("_fbp")?.value,
      fbc: cookieStore.get("_fbc")?.value,
    };

    const email = params.user?.email?.trim().toLowerCase();
    if (email) userData.em = [sha256(email)];
    const phone = params.user?.phone ? normalizePhone(params.user.phone) : null;
    if (phone) userData.ph = [sha256(phone)];
    if (params.user?.externalId) userData.external_id = [sha256(params.user.externalId)];

    const body: Record<string, unknown> = {
      data: [
        {
          event_name: params.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: params.eventId,
          action_source: "website",
          event_source_url: params.eventSourceUrl ?? referer,
          user_data: userData,
          custom_data: params.customData ?? {},
        },
      ],
    };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[meta-capi]", params.eventName, res.status, text);
      let message = text;
      try {
        message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? text;
      } catch {}
      return { ok: false, status: res.status, error: message.slice(0, 300) };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error("[meta-capi]", params.eventName, err);
    return { ok: false, error: "network_error" };
  }
}
