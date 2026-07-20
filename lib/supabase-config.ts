// Supabase 연결 여부를 판단하는 단일 기준.
// 여러 파일(lib/supabase.ts, lib/supabase-server.ts, middleware.ts, app/actions/*.ts)에서
// 각자 `.startsWith("http")`로 중복 판단하던 것을 여기 하나로 모은다.
//
// 기존 방식(URL 접두사만 확인)은 "http로 시작하는 아무 문자열"도 통과시켜
// 더미/오타 값을 걸러내지 못했다. 여기서는 실제 URL로 파싱 가능한지,
// anon key가 최소한의 JWT스러운 길이를 갖는지까지 함께 확인한다.

function isParsableHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// 실제 Supabase anon key는 수백 자 길이의 JWT이므로, 최소 길이만으로도
// ".env.local.example"의 더미값("your-anon-key" 등)을 충분히 걸러낼 수 있다.
const MIN_ANON_KEY_LENGTH = 20;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return isParsableHttpUrl(url) && anonKey.length >= MIN_ANON_KEY_LENGTH;
}

// 서버 전용 코드(서버 액션/API Route)에서 Supabase 호출이 실패했을 때
// 원인을 서버 로그에서 확인할 수 있도록 하되, 클라이언트로는 내부 오류
// 내용을 절대 전달하지 않기 위한 공통 로깅 헬퍼.
export function logSupabaseError(context: string, error: unknown): void {
  console.error(`[supabase] ${context} 실패:`, error);
}
