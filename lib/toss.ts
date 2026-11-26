// 토스페이먼츠 결제취소(환불) API 헬퍼 — 서버 전용(TOSS_SECRET_KEY 사용).
// 전체 취소(cancelAmount 생략) + 부분 취소(cancelAmount 지정) 모두 지원.
// 성공 시 void, 실패 시 throw.

export async function cancelTossPayment(
  paymentKey: string,
  cancelReason: string,
  // 지정하면 '부분 취소'(그 금액만 환불). 생략하면 '전체 취소'(잔액 전액 환불).
  cancelAmount?: number
): Promise<void> {
  const secret = process.env.TOSS_SECRET_KEY ?? "";
  if (!secret) throw new Error("환불 설정이 없습니다. 고객센터로 문의해주세요.");

  const body: { cancelReason: string; cancelAmount?: number } = {
    cancelReason: (cancelReason || "고객 요청").slice(0, 200),
  };
  if (typeof cancelAmount === "number" && cancelAmount > 0) {
    body.cancelAmount = Math.round(cancelAmount);
  }

  const res = await fetch(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json().catch(() => ({}))) as { message?: string; status?: string };
  if (!res.ok) {
    throw new Error(data.message ?? "환불 처리에 실패했습니다.");
  }
}
