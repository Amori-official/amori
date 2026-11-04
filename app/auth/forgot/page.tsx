"use client";

import { useState } from "react";
import Link from "next/link";
import { findMyEmail } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase";

export default function ForgotPage() {
  const [tab, setTab] = useState<"email" | "password">("email");

  return (
    <div className="pt-[100px] pb-24 px-4 max-w-md mx-auto">
      <h1 className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-8 text-center">
        아이디 · 비밀번호 찾기
      </h1>

      <div className="flex border border-brand-border mb-6">
        <button
          onClick={() => setTab("email")}
          className={`flex-1 h-11 text-[13px] tracking-widest ${
            tab === "email" ? "bg-brand-black text-white" : "text-brand-gray-mid"
          }`}
        >
          이메일(아이디) 찾기
        </button>
        <button
          onClick={() => setTab("password")}
          className={`flex-1 h-11 text-[13px] tracking-widest ${
            tab === "password" ? "bg-brand-black text-white" : "text-brand-gray-mid"
          }`}
        >
          비밀번호 재설정
        </button>
      </div>

      {tab === "email" ? <FindEmail /> : <ResetPassword />}

      <p className="text-center text-[13px] text-brand-gray-mid mt-8">
        <Link href="/" className="underline underline-offset-2 hover:text-brand-black">
          홈으로 돌아가기
        </Link>
      </p>
    </div>
  );
}

function FindEmail() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("이름과 연락처를 입력해주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await findMyEmail(name, phone);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(res.email ?? null);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[13px] text-brand-gray-mid leading-6">
        가입 시 입력한 <b>이름</b>과 <b>연락처</b>로 가입 이메일(아이디)을 찾아드려요.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름"
        className="w-full h-11 border border-brand-border px-3 text-[14px] focus:outline-none focus:border-brand-black"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="연락처 (010-0000-0000)"
        inputMode="tel"
        className="w-full h-11 border border-brand-border px-3 text-[14px] focus:outline-none focus:border-brand-black"
      />
      {error && <p className="text-[13px] text-red-500">{error}</p>}

      {result !== undefined &&
        (result ? (
          <div className="border border-brand-border bg-brand-gray-light px-4 py-3 text-[14px]">
            가입 이메일: <b className="tracking-wide">{result}</b>
            <p className="text-[12px] text-brand-gray-mid mt-1">
              보안을 위해 일부가 가려져 있어요. 전체가 기억나지 않으면 비밀번호 재설정을 이용해주세요.
            </p>
          </div>
        ) : (
          <div className="border border-brand-border px-4 py-3 text-[14px] text-brand-gray-mid">
            일치하는 계정을 찾지 못했어요. 입력 정보를 확인하거나, 카카오로 가입하셨는지 확인해주세요.
          </div>
        ))}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-brand-black text-white text-[14px] tracking-widest hover:bg-brand-gray-mid disabled:opacity-50"
      >
        {loading ? "조회 중..." : "이메일 찾기"}
      </button>
    </form>
  );
}

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("올바른 이메일을 입력해주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
        });
      }
    } catch {
      /* 계정 존재 여부를 드러내지 않도록 성공 처리 */
    }
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="border border-brand-border bg-brand-gray-light px-4 py-4 text-[14px] leading-6">
          <b>{email}</b> 주소로 비밀번호 재설정 메일을 보냈어요.
          <p className="text-[13px] text-brand-gray-mid mt-2">
            메일의 링크를 <b>같은 브라우저에서</b> 열어 새 비밀번호를 설정해주세요. (메일이 안 보이면
            스팸함도 확인해주세요)
          </p>
        </div>
        <button
          onClick={() => setSent(false)}
          className="w-full h-11 border border-brand-border text-[14px] tracking-widest text-brand-gray-mid hover:text-brand-black"
        >
          다시 보내기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[13px] text-brand-gray-mid leading-6">
        가입한 <b>이메일</b>로 재설정 링크를 보내드려요.
      </p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        inputMode="email"
        className="w-full h-11 border border-brand-border px-3 text-[14px] focus:outline-none focus:border-brand-black"
      />
      {error && <p className="text-[13px] text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-brand-black text-white text-[14px] tracking-widest hover:bg-brand-gray-mid disabled:opacity-50"
      >
        {loading ? "전송 중..." : "재설정 메일 보내기"}
      </button>
    </form>
  );
}
