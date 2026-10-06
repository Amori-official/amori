// 운영진 알림 — 카카오워크 Incoming Webhook. 서버 전용.
// KAKAOWORK_WEBHOOK_URL 환경변수가 있을 때만 발송하며, 실패해도 본 흐름(주문/가입)을
// 절대 막지 않는다(try/catch로 삼킴).

export async function notifyKakaoWork(text: string): Promise<void> {
  const url = process.env.KAKAOWORK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 카카오워크·슬랙은 "text", 디스코드는 "content"를 사용한다. 둘 다 보내
      // 어떤 웹훅 URL이든(카카오워크/디스코드/슬랙) 그대로 동작하게 한다.
      body: JSON.stringify({ text, content: text }),
      // 알림이 결제 흐름을 오래 붙잡지 않도록 타임아웃(5초).
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // 알림 실패는 무시한다.
  }
}

export const won = (n: number) => `₩${Number(n ?? 0).toLocaleString("ko-KR")}`;
