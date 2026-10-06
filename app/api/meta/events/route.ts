import { NextRequest, NextResponse } from "next/server";
import { sendCapiEvent, isCapiConfigured } from "@/lib/meta-capi";
import { createServerSideClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import type { MetaCustomData, MetaEventName } from "@/lib/meta-pixel";

// 브라우저 픽셀 이벤트를 서버 CAPI로 복제 전송하는 엔드포인트.
// 공개 엔드포인트이므로 허용 이벤트를 제한한다 — Purchase는 여기서 받지 않는다
// (결제 승인 서버 액션에서 승인 금액으로만 전송).
const ALLOWED_EVENTS = new Set<MetaEventName>([
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "CompleteRegistration",
]);
const EVENT_ID_REGEX = /^[A-Za-z0-9_-]{1,100}$/;
const MAX_VALUE = 10_000_000;

function sanitizeCustomData(raw: unknown): MetaCustomData {
  if (typeof raw !== "object" || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const out: MetaCustomData = {};
  if (typeof r.value === "number" && r.value >= 0 && r.value <= MAX_VALUE) {
    out.value = Math.round(r.value);
    out.currency = "KRW";
  }
  if (Array.isArray(r.content_ids)) {
    out.content_ids = r.content_ids.filter((v): v is string => typeof v === "string").slice(0, 50);
  }
  if (typeof r.content_name === "string") out.content_name = r.content_name.slice(0, 200);
  if (r.content_type === "product") out.content_type = "product";
  if (Array.isArray(r.contents)) {
    out.contents = r.contents
      .filter(
        (c): c is { id: string; quantity: number; item_price?: number } =>
          typeof c === "object" && c !== null && typeof (c as { id: unknown }).id === "string" &&
          typeof (c as { quantity: unknown }).quantity === "number"
      )
      .slice(0, 50)
      .map((c) => ({
        id: c.id,
        quantity: Math.max(1, Math.min(999, Math.round(c.quantity))),
        ...(typeof c.item_price === "number" ? { item_price: Math.round(c.item_price) } : {}),
      }));
  }
  if (typeof r.num_items === "number") out.num_items = Math.max(0, Math.min(999, Math.round(r.num_items)));
  return out;
}

export async function POST(request: NextRequest) {
  if (!isCapiConfigured()) return NextResponse.json({ ok: true, skipped: true });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const eventName = body.eventName as MetaEventName;
  const eventId = body.eventId;
  if (!ALLOWED_EVENTS.has(eventName) || typeof eventId !== "string" || !EVENT_ID_REGEX.test(eventId)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  // 같은 사이트에서 온 요청만 의미가 있다 — event_source_url은 우리 도메인일 때만 사용
  let eventSourceUrl: string | undefined;
  if (typeof body.eventSourceUrl === "string") {
    try {
      const u = new URL(body.eventSourceUrl);
      if (u.host === request.nextUrl.host) eventSourceUrl = u.toString();
    } catch {}
  }

  // 로그인 회원이면 이메일/전화번호(해시)로 매칭 품질을 높인다
  let user: { email?: string | null; phone?: string | null; externalId?: string | null } | undefined;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSideClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        user = {
          email: data.user.email,
          phone: (data.user.user_metadata?.phone as string | undefined) ?? null,
          externalId: data.user.id,
        };
      }
    } catch {}
  }

  const result = await sendCapiEvent({
    eventName,
    eventId,
    eventSourceUrl,
    customData: sanitizeCustomData(body.customData),
    user,
  });

  // 진단용: Meta 응답 상태를 그대로 돌려준다(토큰 등 비밀값은 포함되지 않음)
  return NextResponse.json({ ok: result.ok, metaStatus: result.status, metaError: result.error });
}
