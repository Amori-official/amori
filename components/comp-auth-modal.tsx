"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui";
import { signIn, signUp, getKakaoOAuthUrl } from "@/app/actions/auth";

const EMPTY_LOGIN = { email: "", password: "" };
const EMPTY_SIGNUP = { name: "", email: "", password: "", marketingAgreed: false };

export default function CompAuthModal() {
  const { authModalOpen, authTab, setAuthModalOpen, showToast } = useUIStore();

  const [tab, setTab] = useState<"login" | "signup">(authTab);
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setTab(authTab); }, [authTab]);

  const handleOpenChange = (open: boolean) => {
    setAuthModalOpen(open);
    if (!open) {
      setError(null);
      setLoginForm(EMPTY_LOGIN);
      setSignupForm(EMPTY_SIGNUP);
    }
  };

  const switchTab = (t: "login" | "signup") => {
    setTab(t);
    setError(null);
  };

  // ── 로그인 ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(loginForm);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    handleOpenChange(false);
    showToast("로그인되었습니다.");
  };

  // ── 회원가입 ───────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (signupForm.password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    const result = await signUp(signupForm);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    handleOpenChange(false);
    showToast("가입을 환영해요! 쿠폰이 발급됐어요 🎉", 5000);
  };

  // ── 카카오 OAuth ────────────────────────────────────────────
  const handleKakao = async () => {
    setLoading(true);
    const result = await getKakaoOAuthUrl();
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.url) window.location.href = result.url;
  };

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-none border-brand-border p-0 gap-0 overflow-hidden">

        {/* 헤더 — 브랜드명 */}
        <DialogHeader className="px-8 pt-8 pb-0">
          <DialogTitle className="text-base font-light tracking-[0.25em] text-brand-black">
            AMORI
          </DialogTitle>
        </DialogHeader>

        {/* 커스텀 탭 헤더 */}
        <div className="flex px-8 border-b border-brand-border mt-4">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={[
                "text-[14px] tracking-widest mr-7 pb-3 pt-1 border-b-[1.5px] -mb-px transition-colors",
                tab === t
                  ? "border-brand-black text-brand-black"
                  : "border-transparent text-brand-gray-mid hover:text-brand-black",
              ].join(" ")}
            >
              {t === "login" ? "LOGIN" : "SIGN UP"}
            </button>
          ))}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="mx-8 mt-5 text-xs text-red-500 tracking-wide">{error}</p>
        )}

        {/* ── 로그인 폼 ───────────────────────────────────────── */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4 px-8 pb-8 pt-6">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] tracking-widest">EMAIL</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-none border-brand-border text-sm h-11 focus-visible:ring-0 focus-visible:border-brand-black"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] tracking-widest">PASSWORD</Label>
              <Input
                type="password"
                placeholder="••••••••"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                className="rounded-none border-brand-border text-sm h-11 focus-visible:ring-0 focus-visible:border-brand-black"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="rounded-none bg-brand-fill text-brand-black h-11 text-[14px] tracking-widest hover:bg-brand-fill-hover mt-1"
            >
              {loading ? "처리 중..." : "LOGIN"}
            </Button>

            <Divider />

            <KakaoButton onClick={handleKakao} disabled={loading} />

            <p className="text-center text-[14px] text-brand-gray-mid tracking-wide pt-1">
              계정이 없으신가요?{" "}
              <button
                type="button"
                onClick={() => switchTab("signup")}
                className="underline text-brand-black"
              >
                SIGN UP
              </button>
            </p>
          </form>
        )}

        {/* ── 회원가입 폼 ─────────────────────────────────────── */}
        {tab === "signup" && (
          <form onSubmit={handleSignup} className="flex flex-col gap-4 px-8 pb-8 pt-6">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] tracking-widest">NAME</Label>
              <Input
                type="text"
                placeholder="홍길동"
                required
                value={signupForm.name}
                onChange={(e) => setSignupForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-none border-brand-border text-sm h-11 focus-visible:ring-0 focus-visible:border-brand-black"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] tracking-widest">EMAIL</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                required
                value={signupForm.email}
                onChange={(e) => setSignupForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-none border-brand-border text-sm h-11 focus-visible:ring-0 focus-visible:border-brand-black"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] tracking-widest">PASSWORD</Label>
              <Input
                type="password"
                placeholder="6자 이상"
                required
                minLength={6}
                value={signupForm.password}
                onChange={(e) => setSignupForm((f) => ({ ...f, password: e.target.value }))}
                className="rounded-none border-brand-border text-sm h-11 focus-visible:ring-0 focus-visible:border-brand-black"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="marketing"
                checked={signupForm.marketingAgreed}
                onCheckedChange={(v) =>
                  setSignupForm((f) => ({ ...f, marketingAgreed: !!v }))
                }
                className="rounded-none mt-0.5 border-brand-border"
              />
              <label
                htmlFor="marketing"
                className="text-xs text-brand-gray-mid tracking-wide leading-5 cursor-pointer"
              >
                마케팅 수신 동의 (선택)
                <br />
                <span className="text-[14px]">
                  신제품 출시 및 프로모션 정보를 받아봅니다.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="rounded-none bg-brand-fill text-brand-black h-11 text-[14px] tracking-widest hover:bg-brand-fill-hover mt-1"
            >
              {loading ? "처리 중..." : "CREATE ACCOUNT"}
            </Button>

            <Divider />

            <KakaoButton onClick={handleKakao} disabled={loading} />

            <p className="text-center text-[14px] text-brand-gray-mid tracking-wide pt-1">
              이미 계정이 있으신가요?{" "}
              <button
                type="button"
                onClick={() => switchTab("login")}
                className="underline text-brand-black"
              >
                LOGIN
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Divider() {
  return (
    <div className="relative flex items-center gap-3">
      <div className="flex-1 h-px bg-brand-border" />
      <span className="text-[14px] tracking-widest text-brand-gray-mid shrink-0">OR</span>
      <div className="flex-1 h-px bg-brand-border" />
    </div>
  );
}

function KakaoButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-11 flex items-center justify-center gap-2 bg-[#FEE500] text-[#191919] text-[14px] tracking-widest border border-[#FEE500] hover:bg-[#F0D800] transition-colors disabled:opacity-50"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M9 1.5C4.86 1.5 1.5 4.17 1.5 7.44c0 2.09 1.35 3.93 3.39 4.98L4.08 15l3.33-2.19c.51.07 1.04.1 1.59.1 4.14 0 7.5-2.67 7.5-5.94C16.5 4.17 13.14 1.5 9 1.5z"
          fill="#191919"
        />
      </svg>
      카카오로 계속하기
    </button>
  );
}
