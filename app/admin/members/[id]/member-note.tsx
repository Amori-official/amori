"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSetMemberNote } from "@/app/actions/admin";

export default function MemberNote({ userId, initial }: { userId: string; initial: string }) {
  const router = useRouter();
  const [note, setNote] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const dirty = note !== initial;

  const save = () => {
    setMsg(null);
    start(async () => {
      const res = await adminSetMemberNote(userId, note);
      if (res.error) setMsg(res.error);
      else {
        setMsg("저장되었습니다.");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="이 회원에 대한 메모 (관리자만 볼 수 있어요)"
        className="w-full border border-brand-border p-2 text-[13px] focus:outline-none focus:border-brand-black resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="h-9 px-4 bg-brand-black text-white text-[13px] tracking-widest hover:bg-brand-gray-mid transition-colors disabled:opacity-40"
        >
          {pending ? "저장 중..." : "메모 저장"}
        </button>
        {msg && <span className="text-[12px] text-brand-gray-mid">{msg}</span>}
      </div>
    </div>
  );
}
