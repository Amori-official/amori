"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured, logSupabaseError } from "@/lib/supabase-config";

const NOT_CONFIGURED_ERROR = "현재 로그인을 사용할 수 없습니다. 잠시 후 다시 시도해주세요.";
const GENERIC_AUTH_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";

function createActionClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// ── 에러 메시지 한국어 변환 ───────────────────────────────────
// 매핑되지 않은 원문(Supabase 내부 오류 등)은 절대 그대로 노출하지 않고
// 안전한 일반 메시지로 대체한다. 원문은 서버 로그로만 남긴다.
function toKoreanError(msg: string): string {
  if (msg.includes("User already registered") || msg.includes("already been registered"))
    return "이미 가입된 이메일 주소입니다.";
  if (msg.includes("Invalid login credentials"))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (msg.includes("Email not confirmed"))
    return "이메일 인증이 필요합니다. 받은편지함을 확인해주세요.";
  if (msg.includes("Password should be at least"))
    return "비밀번호는 6자 이상이어야 합니다.";
  if (msg.includes("rate limit"))
    return "잠시 후 다시 시도해주세요.";
  logSupabaseError("auth (미매핑 오류)", msg);
  return GENERIC_AUTH_ERROR;
}

// ── 회원가입 ─────────────────────────────────────────────────
export async function signUp(data: {
  name: string;
  email: string;
  password: string;
  marketingAgreed: boolean;
}): Promise<{ error?: string; success?: boolean }> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_ERROR };

  try {
    const supabase = createActionClient();

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          marketing_agreed: data.marketingAgreed,
        },
      },
    });

    if (error) return { error: toKoreanError(error.message) };

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    logSupabaseError("signUp", error);
    return { error: GENERIC_AUTH_ERROR };
  }
}

// ── 로그인 ───────────────────────────────────────────────────
export async function signIn(data: {
  email: string;
  password: string;
}): Promise<{ error?: string; success?: boolean }> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_ERROR };

  try {
    const supabase = createActionClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) return { error: toKoreanError(error.message) };

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    logSupabaseError("signIn", error);
    return { error: GENERIC_AUTH_ERROR };
  }
}

// ── 로그아웃 ─────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createActionClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
  } catch (error) {
    logSupabaseError("signOut", error);
  }
}

// ── 카카오 OAuth — URL 반환 (클라이언트에서 redirect) ─────────
export async function getKakaoOAuthUrl(): Promise<{
  url?: string;
  error?: string;
}> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_ERROR };

  try {
    const supabase = createActionClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { error: toKoreanError(error.message) };
    return { url: data.url };
  } catch (error) {
    logSupabaseError("getKakaoOAuthUrl", error);
    return { error: GENERIC_AUTH_ERROR };
  }
}
