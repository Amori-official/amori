"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useUIStore } from "@/store/ui";

export default function ResetPage() {
  const router = useRouter();
  const { showToast } = useUIStore();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 재설정 링크(이메일) → /auth/callback에서 세션 교환 후 여기로 옴.
  // 유효한 세션이 있어야 비밀번호를 바꿀 수 있다.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setReady("invalid");
      return;
    }
    supabase.auth
      .getUser()
      .then(({ data }) => setReady(data.user ? "ok" : "invalid"))
      .catch(() => setReady("invalid"));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError("잠시 후 다시 시도해주세요.");
      setLoading(false);
      return;
    }
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError("변경에 실패했어요. 링크가 만료됐을 수 있어요. 다시 요청해주세요.");
      return;
    }
    showToast("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.");
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="pt-[100px] pb-24 px-4 max-w-md mx-auto">
      <h1 className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-8 text-center">
        새 비밀번호 설정
      </h1>

      {ready === "checking" && (
        <p className="text-center text-[14px] text-brand-gray-mid tracking-wide">확인 중...</p>
      )}

      {ready === "invalid" && (
        <div className="space-y-4 text-center">
          <p className="text-[14px] text-brand-gray-mid leading-6">
            링크가 만료되었거나 유효하지 않아요.
            <br />
            비밀번호 재설정을 다시 요청해주세요.
          </p>
          <Link
            href="/auth/forgot"
            className="inline-flex items-center justify-center w-full h-11 bg-brand-black text-white text-[14px] tracking-widest"
          >
            재설정 다시 요청하기
          </Link>
        </div>
      )}

      {ready === "ok" && (
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)"
            className="w-full h-11 border border-brand-border px-3 text-[14px] focus:outline-none focus:border-brand-black"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="새 비밀번호 확인"
            className="w-full h-11 border border-brand-border px-3 text-[14px] focus:outline-none focus:border-brand-black"
          />
          {error && <p className="text-[13px] text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-brand-black text-white text-[14px] tracking-widest hover:bg-brand-gray-mid disabled:opacity-50"
          >
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      )}
    </div>
  );
}
