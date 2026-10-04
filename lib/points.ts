// 적립금(포인트) 공용 타입/라벨 — 서버 액션 파일이 아니므로 동기 함수/상수 export 가능.

export interface PointTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  reason: string | null;
  createdAt: string;
}

const POINT_TYPE_LABEL: Record<string, string> = {
  earn_review: "리뷰 작성 적립",
  spend_order: "주문 사용",
  refund_order: "주문 취소 복원",
  admin_adjust: "관리자 조정",
};

export function pointTypeLabel(type: string, reason: string | null): string {
  return POINT_TYPE_LABEL[type] ?? reason ?? type;
}
