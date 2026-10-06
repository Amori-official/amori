"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { purgeMember } from "@/app/actions/admin";

// 회원 영구삭제 — 되돌릴 수 없는 작업이라 이메일을 직접 입력해야 실행된다.
export default function PurgeButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = () => {
    const typed = window.prompt(
      `정말 이 회원을 영구삭제하시겠습니까? 되돌릴 수 없습니다.\n\n` +
        `· 프로필/장바구니/리뷰/찜/쿠폰/적립금 내역이 함께 삭제됩니다.\n` +
        `· 주문 기록은 보존되지만 회원 연결은 해제됩니다.\n` +
        `· 같은 이메일로 재가입이 가능해집니다.\n\n` +
        `확인을 위해 아래에 이메일을 그대로 입력하세요:\n${email}`
    );
    if (typed === null) return; // 취소
    if (typed.trim().toLowerCase() !== email.trim().toLowerCase()) {
      alert("이메일이 일치하지 않아 취소되었습니다.");
      return;
    }
    startTransition(async () => {
      const res = await purgeMember(userId);
      if (res.error) {
        alert(res.error);
        return;
      }
      alert("영구삭제되었습니다.");
      router.push("/admin/members");
    });
  };

  return (
    <button
      onClick={run}
      disabled={pending}
      className="h-9 px-4 border border-red-400 text-red-600 text-[13px] tracking-widest hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {pending ? "삭제 중..." : "회원 영구삭제"}
    </button>
  );
}
