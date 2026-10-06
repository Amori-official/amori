"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminAdjustPoints } from "@/app/actions/admin";

export default function PointsAdjust({ userId, balance }: { userId: string; balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (sign: 1 | -1) => {
    const n = parseInt(amount, 10) || 0;
    if (n <= 0) {
      setMsg({ ok: false, text: "0보다 큰 포인트를 입력해주세요." });
      return;
    }
    const delta = sign * n;
    const label = sign > 0 ? "지급" : "차감";
    if (!confirm(`${n.toLocaleString("ko-KR")}P를 ${label}하시겠습니까?`)) return;
    setMsg(null);
    start(async () => {
      const res = await adminAdjustPoints(userId, delta, reason);
      if (res.error) {
        setMsg({ ok: false, text: res.error });
      } else {
        setMsg({ ok: true, text: `${label} 완료 · 현재 잔액 ${(res.balance ?? 0).toLocaleString("ko-KR")}P` });
        setAmount("");
        setReason("");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm">
        현재 잔액 <span className="font-medium">{balance.toLocaleString("ko-KR")}P</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="포인트"
          className="h-10 w-full sm:w-32 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="사유 (예: 이벤트 보상, 오류 보정)"
          className="h-10 flex-1 border border-brand-border px-2 text-[13px] focus:outline-none focus:border-brand-black"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => submit(1)}
          disabled={pending}
          className="h-9 px-4 bg-brand-black text-white text-[13px] tracking-widest hover:bg-brand-gray-mid transition-colors disabled:opacity-50"
        >
          지급 (+)
        </button>
        <button
          type="button"
          onClick={() => submit(-1)}
          disabled={pending}
          className="h-9 px-4 border border-red-300 text-red-500 text-[13px] tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          차감 (−)
        </button>
        {msg && (
          <span className={`self-center text-[12px] ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</span>
        )}
      </div>
      <p className="text-[12px] text-brand-gray-mid">조정 내역은 회원의 적립금 내역에 기록됩니다.</p>
    </div>
  );
}
