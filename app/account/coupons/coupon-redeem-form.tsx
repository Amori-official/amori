"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemCouponByCode } from "@/app/actions/account";

export default function CouponRedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setMsg(null);
    startTransition(async () => {
      const res = await redeemCouponByCode(code.trim());
      if (res.error) {
        setMsg({ type: "err", text: res.error });
      } else {
        setMsg({ type: "ok", text: `'${res.name}' 쿠폰이 등록되었어요.` });
        setCode("");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="mb-6 max-w-sm">
      <label className="text-[13px] tracking-wide text-brand-gray-mid block mb-1.5">
        쿠폰 코드 등록
      </label>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="쿠폰 코드 입력 (예: AMORIKKO)"
          className="flex-1 h-11 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-5 h-11 bg-brand-black text-white text-[13px] tracking-widest hover:bg-brand-gray-mid transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {pending ? "등록 중..." : "등록"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-[13px] tracking-wide ${msg.type === "ok" ? "text-green-600" : "text-red-500"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
