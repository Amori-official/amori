"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
const EMPTY_SIGNUP = {
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  phone: "",
  zip: "",
  address: "",
  addressDetail: "",
  birthday: "",
  marketingAgreed: false,
};

// 다음 우편번호 검색 (동적 로드)
type DaumNS = {
  Postcode: new (o: {
    oncomplete: (d: { address: string; zonecode: string }) => void;
  }) => { open: () => void };
};
function getDaum(): DaumNS | undefined {
  return (window as unknown as { daum?: DaumNS }).daum;
}

// 카카오 로그인은 Supabase가 account_email 스코프를 강제하는데, 카카오 이메일 동의항목은
// 비즈앱 전환 + '추가 기능 신청' 검수를 통과해야 사용할 수 있어 현재 KOE205로 실패한다.
// 검수 통과 전까지 버튼을 숨긴다(코드/핸들러는 유지 — 승인 후 true로만 바꾸면 복원).
const KAKAO_LOGIN_ENABLED = false;

export default function CompAuthModal() {
  const { authModalOpen, authTab, setAuthModalOpen, showToast } = useUIStore();

  const [tab, setTab] = useState<"login" | "signup">(authTab);
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => { setTab(authTab); }, [authTab]);

  // 비회원 구매: 로그인 없이 바로 체크아웃으로 이동한다(게스트 체크아웃 지원).
  const handleGuestCheckout = () => {
    handleOpenChange(false);
    router.push("/checkout");
  };

  const handleOpenChange = (open: boolean) => {
    setAuthModalOpen(open);
    if (!open) {
      setError(null);
      setNotice(null);
      setLoginForm(EMPTY_LOGIN);
      setSignupForm(EMPTY_SIGNUP);
    }
  };

  const switchTab = (t: "login" | "signup") => {
    setTab(t);
    setError(null);
    setNotice(null);
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
  const openSignupPostcode = () => {
    const open = () => {
      const daum = getDaum();
      if (!daum) return;
      new daum.Postcode({
        oncomplete: (data) => {
          setSignupForm((f) => ({ ...f, zip: data.zonecode, address: data.address, addressDetail: "" }));
        },
      }).open();
    };
    if (getDaum()) return open();
    const id = "daum-postcode-script";
    const existing = document.getElementById(id);
    if (existing) {
      existing.addEventListener("load", open, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = open;
    document.body.appendChild(script);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (signupForm.password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (signupForm.password !== signupForm.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!signupForm.phone.trim()) {
      setError("핸드폰 번호를 입력해주세요.");
      return;
    }
    if (!signupForm.zip.trim() || !signupForm.address.trim()) {
      setError("주소를 입력해주세요.");
      return;
    }
    setLoading(true);
    const result = await signUp({
      name: signupForm.name,
      email: signupForm.email,
      password: signupForm.password,
      phone: signupForm.phone,
      birthday: signupForm.birthday || undefined,
      addressZip: signupForm.zip || undefined,
      addressLine1: signupForm.address || undefined,
      addressLine2: signupForm.addressDetail || undefined,
      marketingAgreed: signupForm.marketingAgreed,
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    // 이메일 인증(A) 유지: 가입 즉시 로그인은 불가하므로, 로그인 탭으로 전환하고
    // 인증 안내를 명확히 보여준다.
    setSignupForm(EMPTY_SIGNUP);
    setError(null);
    setTab("login");
    setNotice("가입 확인 이메일을 보냈어요. 메일의 링크로 인증을 완료한 뒤 로그인해주세요. (가입 축하 쿠폰이 지급됐어요 🎉)");
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

        {/* 가입 후 이메일 인증 안내 (로그인 탭에서 노출) */}
        {notice && tab === "login" && (
          <p className="mx-8 mt-5 text-[13px] text-green-700 tracking-wide leading-6 border border-green-200 bg-green-50 px-3 py-2.5">
            {notice}
          </p>
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

            <button
              type="button"
              onClick={handleGuestCheckout}
              className="rounded-none border border-brand-border h-11 text-[14px] tracking-widest text-brand-black hover:bg-brand-gray-light transition-colors"
            >
              비회원으로 구매하기
            </button>
            <p className="text-center text-[13px] text-brand-gray-mid tracking-wide -mt-2">
              회원가입 없이 바로 주문할 수 있어요.
            </p>

            {KAKAO_LOGIN_ENABLED && (
              <>
                <Divider />
                <KakaoButton onClick={handleKakao} disabled={loading} />
              </>
            )}

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
          <form onSubmit={handleSignup} className="flex flex-col gap-4 px-8 pb-8 pt-6 max-h-[62vh] overflow-y-auto">
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
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] tracking-widest">PASSWORD 확인</Label>
              <Input
                type="password"
                placeholder="비밀번호 재입력"
                required
                value={signupForm.passwordConfirm}
                onChange={(e) => setSignupForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
                className="rounded-none border-brand-border text-sm h-11 focus-visible:ring-0 focus-visible:border-brand-black"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] tracking-widest">핸드폰 번호</Label>
              <Input
                type="tel"
                placeholder="010-0000-0000"
                required
                value={signupForm.phone}
                onChange={(e) => setSignupForm((f) => ({ ...f, phone: e.target.value }))}
                className="rounded-none border-brand-border text-sm h-11 focus-visible:ring-0 focus-visible:border-brand-black"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] tracking-widest">주소</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="우편번호"
                  readOnly
                  value={signupForm.zip}
                  className="rounded-none border-brand-border text-sm h-11 w-28 shrink-0 bg-brand-gray-light read-only:text-brand-gray-mid focus-visible:ring-0"
                />
                <button
                  type="button"
                  onClick={openSignupPostcode}
                  className="shrink-0 px-4 h-11 border border-brand-border text-[13px] tracking-widest hover:bg-brand-gray-light transition-colors whitespace-nowrap"
                >
                  주소 찾기
                </button>
              </div>
              <Input
                type="text"
                placeholder="기본 주소"
                readOnly
                value={signupForm.address}
                className="rounded-none border-brand-border text-sm h-11 bg-brand-gray-light read-only:text-brand-gray-mid focus-visible:ring-0"
              />
              <Input
                type="text"
                placeholder="상세 주소 (동/호수 등)"
                value={signupForm.addressDetail}
                onChange={(e) => setSignupForm((f) => ({ ...f, addressDetail: e.target.value }))}
                className="rounded-none border-brand-border text-sm h-11 focus-visible:ring-0 focus-visible:border-brand-black"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] tracking-widest">생일 (선택)</Label>
              <Input
                type="date"
                value={signupForm.birthday}
                onChange={(e) => setSignupForm((f) => ({ ...f, birthday: e.target.value }))}
                className="rounded-none border-brand-border text-sm h-11 focus-visible:ring-0 focus-visible:border-brand-black"
              />
              <p className="text-[12px] text-brand-gray-mid">생일에 맞춰 생일 쿠폰을 보내드려요.</p>
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
                  동의하시면 <b className="text-brand-black">1,000원 할인 쿠폰</b>을 즉시 드려요. (신제품·프로모션 소식 발송)
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

            {KAKAO_LOGIN_ENABLED && (
              <>
                <Divider />
                <KakaoButton onClick={handleKakao} disabled={loading} />
              </>
            )}

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
