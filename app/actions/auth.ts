"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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
  return msg;
}

// ── 회원가입 ─────────────────────────────────────────────────
export async function signUp(data: {
  name: string;
  email: string;
  password: string;
  marketingAgreed: boolean;
}): Promise<{ error?: string; success?: boolean }> {
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
}

// ── 로그인 ───────────────────────────────────────────────────
export async function signIn(data: {
  email: string;
  password: string;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = createActionClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) return { error: toKoreanError(error.message) };

  revalidatePath("/", "layout");
  return { success: true };
}

// ── 로그아웃 ─────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const supabase = createActionClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

// ── 카카오 OAuth — URL 반환 (클라이언트에서 redirect) ─────────
export async function getKakaoOAuthUrl(): Promise<{
  url?: string;
  error?: string;
}> {
  const supabase = createActionClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: error.message };
  return { url: data.url };
}
