"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { updateProfile, changePassword, upsertAddress, deactivateMyAccount } from "@/app/actions/account";
import { useUIStore } from "@/store/ui";

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  isDefault: boolean;
}

interface Props {
  name: string;
  phone: string;
  marketingAgreed: boolean;
  email: string;
  address: SavedAddress | null;
}

interface DaumPostcode {
  open: () => void;
  embed: (el: HTMLElement) => void;
}
interface DaumNS {
  Postcode: new (opts: {
    oncomplete: (data: { address: string; zonecode: string }) => void;
    onclose?: () => void;
    width?: string | number;
    height?: string | number;
  }) => DaumPostcode;
}
const getDaum = () => (window as unknown as { daum?: DaumNS }).daum;

export default function ProfileClient(initial: Props) {
  const { showToast } = useUIStore();
  const router = useRouter();

  const handleWithdraw = async () => {
    if (
      !confirm(
        "정말 탈퇴하시겠어요?\n탈퇴 후에는 로그인하실 수 없으며, 같은 메일주소로 재가입은 불가합니다. 동일한 메일주소로 가입을 원한다면 카카오톡 채널로 문의주세요."
      )
    )
      return;
    const res = await deactivateMyAccount();
    if (res.error) {
      showToast(res.error);
      return;
    }
    showToast("탈퇴 처리되었습니다. 그동안 이용해 주셔서 감사합니다.");
    router.push("/");
    router.refresh();
  };

  // 기본 정보
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [marketing, setMarketing] = useState(initial.marketingAgreed);
  const [profileLoading, setProfileLoading] = useState(false);

  // 기본 배송지
  const [addrId] = useState(initial.address?.id);
  const [recipient, setRecipient] = useState(initial.address?.name ?? initial.name);
  const [recipientPhone, setRecipientPhone] = useState(initial.address?.phone ?? initial.phone);
  const [zip, setZip] = useState(initial.address?.zipCode ?? "");
  const [addr1, setAddr1] = useState(initial.address?.address ?? "");
  const [addr2, setAddr2] = useState(initial.address?.addressDetail ?? "");
  const [addrLoading, setAddrLoading] = useState(false);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const daum = getDaum();
    if (!postcodeOpen || !daum || !postcodeRef.current) return;
    postcodeRef.current.innerHTML = "";
    new daum.Postcode({
      oncomplete: (data) => {
        setZip(data.zonecode);
        setAddr1(data.address);
        setAddr2("");
        setPostcodeOpen(false);
        setTimeout(() => document.getElementById("profile-addr2")?.focus(), 0);
      },
      onclose: () => setPostcodeOpen(false),
      width: "100%",
      height: "100%",
    }).embed(postcodeRef.current);
  }, [postcodeOpen]);

  const handleAddressSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zip.trim() || !addr1.trim()) {
      showToast("주소를 입력해주세요.");
      return;
    }
    setAddrLoading(true);
    const res = await upsertAddress({
      id: addrId,
      name: recipient.trim() || name,
      phone: recipientPhone.trim() || phone,
      zipCode: zip,
      address: addr1,
      addressDetail: addr2,
      isDefault: true,
    });
    setAddrLoading(false);
    if (res.error) showToast(res.error);
    else showToast("기본 배송지가 저장되었습니다. 주문 시 자동으로 입력돼요.");
  };

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
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />

      {/* 주소 검색 오버레이 */}
      {postcodeOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setPostcodeOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md h-[520px] max-h-[85vh] rounded overflow-hidden flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-brand-border shrink-0">
              <span className="text-[14px] tracking-widest">주소 검색</span>
              <button
                type="button"
                onClick={() => setPostcodeOpen(false)}
                aria-label="닫기"
                className="w-8 h-8 grid place-items-center text-brand-gray-mid hover:text-brand-black text-lg"
              >
                ✕
              </button>
            </div>
            <div ref={postcodeRef} className="flex-1 min-h-0" />
          </div>
        </div>
      )}

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

      {/* 기본 배송지 */}
      <form onSubmit={handleAddressSave} className="space-y-4 max-w-sm pt-4 border-t border-brand-border">
        <div>
          <h3 className="text-[14px] tracking-widest text-brand-gray-mid">기본 배송지</h3>
          <p className="text-[12px] text-brand-gray-mid mt-1">저장해두면 주문할 때 배송지가 자동으로 입력돼요.</p>
        </div>

        <FormField label="받는 분">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="이름"
            className="w-full h-10 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
          />
        </FormField>

        <FormField label="연락처">
          <input
            type="tel"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full h-10 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
          />
        </FormField>

        <FormField label="주소">
          <div className="flex gap-2">
            <input
              value={zip}
              readOnly
              placeholder="우편번호"
              className="w-28 shrink-0 h-10 border border-brand-border px-3 text-sm bg-brand-gray-light"
            />
            <button
              type="button"
              onClick={() => setPostcodeOpen(true)}
              className="shrink-0 px-4 h-10 border border-brand-border text-[14px] tracking-widest hover:bg-brand-gray-light transition-colors whitespace-nowrap"
            >
              주소 찾기
            </button>
          </div>
          <input
            value={addr1}
            readOnly
            placeholder="기본 주소"
            className="w-full h-10 border border-brand-border px-3 text-sm bg-brand-gray-light mt-2"
          />
          <input
            id="profile-addr2"
            type="text"
            value={addr2}
            onChange={(e) => setAddr2(e.target.value)}
            placeholder="상세 주소 (동/호수 등)"
            className="w-full h-10 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black mt-2"
          />
        </FormField>

        <button
          type="submit"
          disabled={addrLoading}
          className="h-10 px-6 bg-brand-fill text-brand-black text-[14px] tracking-widest hover:bg-brand-fill-hover transition-colors disabled:opacity-50"
        >
          {addrLoading ? "저장 중..." : "배송지 저장"}
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

      {/* 회원 탈퇴 (눈에 띄지 않게 하단 배치) */}
      <div className="pt-6 border-t border-brand-border">
        <button
          type="button"
          onClick={handleWithdraw}
          className="text-[12px] text-brand-gray-mid underline underline-offset-4 hover:text-red-500 transition-colors"
        >
          회원 탈퇴
        </button>
      </div>
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
