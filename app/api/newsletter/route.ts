import { NextRequest, NextResponse } from "next/server";

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http");

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { email, source = "homepage" } = body as { email?: string; source?: string };

  // 이메일 유효성 검사
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "유효한 이메일 주소를 입력해주세요." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (IS_CONFIGURED) {
    const { createServerSideClient } = await import("@/lib/supabase-server");

    try {
      const supabase = createServerSideClient();

      // 중복 확인 + upsert
      const { error } = await supabase.from("newsletters").upsert(
        { email: normalizedEmail, source, subscribed_at: new Date().toISOString() },
        { onConflict: "email", ignoreDuplicates: true }
      );

      if (error && !error.message.includes("duplicate")) {
        return NextResponse.json({ error: "구독 중 오류가 발생했습니다." }, { status: 500 });
      }
    } catch {
      return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
  }

  // Resend 웰컴 이메일 발송
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { Resend } = await import("resend");
      const { render } = await import("@react-email/render");
      const { WelcomeEmail } = await import("@/emails/welcome");

      const resend = new Resend(resendKey);
      const html = await render(WelcomeEmail({ name: normalizedEmail.split("@")[0] }));

      await resend.emails.send({
        from: "AMORI <hello@amori.kr>",
        to: normalizedEmail,
        subject: "AMORI에 오신 것을 환영합니다 🌿",
        html,
      });
    } catch {
      // 이메일 발송 실패는 구독 자체를 막지 않음
    }
  }

  return NextResponse.json({ success: true });
}
