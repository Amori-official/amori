"use client";

import { useState } from "react";
import { updateProfile, changePassword } from "@/app/actions/account";
import { useUIStore } from "@/store/ui";

interface Props {
  name: string;
  phone: string;
  marketingAgreed: boolean;
  email: string;
}

export default function ProfileClient(initial: Props) {
  const { showToast } = useUIStore();

  // 기본 정보
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [marketing, setMarketing] = useState(initial.marketingAgreed);
  const [profileLoading, setProfileLoading] = useState(false);

  // 비밀번호
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    const result = await updateProfile({ name, phone, marketingAgreed: marketing });
    setProfileLoading(false);
    if (result.error) showToast(result.error);
    else showToast("회원 정보가 수정되었습니다.");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 6) {
      showToast("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setPwLoading(true);
    const result = await changePassword({ newPassword });
    setPwLoading(false);
    if (result.error) showToast(result.error);
    else {
      showToast("비밀번호가 변경되었습니다.");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div id="account-profile" className="p-6 sm:p-8 space-y-8">
      <h2 className="text-[14px] tracking-[0.3em] border-b border-brand-border pb-4">회원 정보 수정</h2>

      {/* 기본 정보 */}
      <form onSubmit={handleProfileSave} className="space-y-4 max-w-sm">
        <h3 className="text-[14px] tracking-widest text-brand-gray-mid">기본 정보</h3>

        <FormField label="이메일">
          <input
            type="email"
            value={initial.email}
            disabled
            className="w-full h-10 border border-brand-border px-3 text-sm bg-brand-gray-light text-brand-gray-mid"
          />
        </FormField>

        <FormField label="이름">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
          />
        </FormField>

        <FormField label="전화번호">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full h-10 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
          />
        </FormField>

        <label className="flex items-center gap-3 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="w-4 h-4 accent-brand-black"
          />
          <span className="text-xs tracking-wide">마케팅 수신 동의</span>
        </label>

        <button
          type="submit"
          disabled={profileLoading}
          className="h-10 px-6 bg-brand-fill text-brand-black text-[14px] tracking-widest hover:bg-brand-fill-hover transition-colors disabled:opacity-50"
        >
          {profileLoading ? "저장 중..." : "저장"}
        </button>
      </form>

      {/* 비밀번호 변경 */}
      <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm pt-4 border-t border-brand-border">
        <h3 className="text-[14px] tracking-widest text-brand-gray-mid">비밀번호 변경</h3>

        <FormField label="새 비밀번호">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="6자 이상"
            minLength={6}
            className="w-full h-10 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
          />
        </FormField>

        <FormField label="비밀번호 확인">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="비밀번호 재입력"
            className="w-full h-10 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
          />
        </FormField>

        <button
          type="submit"
          disabled={pwLoading || !newPassword}
          className="h-10 px-6 border border-brand-black text-brand-black text-[14px] tracking-widest hover:bg-brand-fill hover:text-brand-black transition-colors disabled:opacity-40"
        >
          {pwLoading ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[14px] tracking-widest">{label}</label>
      {children}
    </div>
  );
}
