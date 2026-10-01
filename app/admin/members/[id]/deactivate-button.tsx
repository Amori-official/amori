"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSetMemberDeactivated } from "@/app/actions/admin";

export default function DeactivateButton({
  userId,
  deactivated,
}: {
  userId: string;
  deactivated: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const msg = deactivated
      ? "이 회원의 탈퇴를 해제(복구)하시겠습니까?"
      : "이 회원을 탈퇴 처리하시겠습니까?\n로그인이 차단되며, 주문 기록은 보존됩니다.";
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await adminSetMemberDeactivated(userId, !deactivated);
      if (res.error) alert(res.error);
      else router.refresh();
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`h-9 px-4 border text-[13px] tracking-widest disabled:opacity-50 transition-colors ${
        deactivated
          ? "border-brand-black text-brand-black hover:bg-brand-gray-light"
          : "border-red-300 text-red-500 hover:bg-red-50"
      }`}
    >
      {pending ? "처리 중..." : deactivated ? "탈퇴 해제" : "회원 탈퇴 처리"}
    </button>
  );
}
