"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCoupon,
  updateCoupon,
  type AdminCoupon,
  type CouponInput,
} from "@/app/actions/admin";

const EMPTY: CouponInput = {
  code: "",
  name: "",
  discountType: "amount",
  discountValue: 0,
  minOrderAmount: 10000,
  maxDiscountAmount: null,
  validDays: 30,
  isActive: true,
  codeRedeemable: true,
};

export default function CouponsAdminClient({ coupons }: { coupons: AdminCoupon[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [creating, setCreating] = useState<CouponInput>(EMPTY);

  const run = (fn: () => Promise<{ error?: string }>, okText: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setMsg({ type: "err", text: res.error });
      else {
        setMsg({ type: "ok", text: okText });
        router.refresh();
      }
    });
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] tracking-[0.3em]">쿠폰 관리</h2>
        <span className="text-[13px] text-brand-gray-mid tracking-wide">총 {coupons.length}종</span>
      </div>

      {msg && (
        <p
          className={`text-[13px] tracking-wide px-3 py-2 border ${
            msg.type === "ok" ? "text-green-600 border-green-200 bg-green-50" : "text-red-500 border-red-200 bg-red-50"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* 기존 쿠폰 */}
      <ul className="space-y-3">
        {coupons.map((c) => (
          <CouponCard
            key={c.id}
            coupon={c}
            pending={pending}
            onSave={(input) => run(() => updateCoupon(c.id, input), "저장되었습니다.")}
          />
        ))}
      </ul>

      {/* 새 쿠폰 */}
      <div className="border border-brand-black p-5">
        <p className="text-[13px] tracking-widest mb-3">새 쿠폰 만들기</p>
        <CouponFields value={creating} onChange={setCreating} />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = await createCoupon(creating);
              if (!res.error) setCreating(EMPTY);
              return res;
            }, "쿠폰이 생성되었습니다.")
          }
          className="mt-3 px-6 h-11 bg-brand-black text-white text-[13px] tracking-widest hover:bg-brand-gray-mid transition-colors disabled:opacity-50"
        >
          쿠폰 만들기
        </button>
      </div>
    </div>
  );
}

function CouponCard({
  coupon,
  pending,
  onSave,
}: {
  coupon: AdminCoupon;
  pending: boolean;
  onSave: (v: CouponInput) => void;
}) {
  const [v, setV] = useState<CouponInput>({ ...coupon });
  return (
    <li className="border border-brand-border p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tracking-widest">{coupon.code}</span>
          {!coupon.isActive && (
            <span className="text-[12px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">비활성</span>
          )}
          {coupon.codeRedeemable && (
            <span className="text-[12px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">코드 등록</span>
          )}
        </div>
        <span className="text-[12px] text-brand-gray-mid">발급 {coupon.issuedCount}건</span>
      </div>
      <CouponFields value={v} onChange={setV} />
      <button
        type="button"
        disabled={pending}
        onClick={() => onSave(v)}
        className="mt-3 px-5 h-10 bg-brand-black text-white text-[12px] tracking-widest hover:bg-brand-gray-mid transition-colors disabled:opacity-50"
      >
        저장
      </button>
    </li>
  );
}

function CouponFields({ value, onChange }: { value: CouponInput; onChange: (v: CouponInput) => void }) {
  const u = (patch: Partial<CouponInput>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <F label="코드 (영문 대문자·숫자)">
        <Input value={value.code} onChange={(x) => u({ code: x.toUpperCase() })} placeholder="AMORIKKO" />
      </F>
      <F label="이름">
        <Input value={value.name} onChange={(x) => u({ name: x })} placeholder="신규 가입 할인" />
      </F>
      <F label="할인 방식">
        <select
          value={value.discountType}
          onChange={(e) => u({ discountType: e.target.value })}
          className="w-full h-11 border border-brand-border px-2 text-sm focus:outline-none focus:border-brand-black"
        >
          <option value="amount">정액 (원)</option>
          <option value="percent">정률 (%)</option>
        </select>
      </F>
      <F label={value.discountType === "percent" ? "할인율 (%)" : "할인액 (원)"}>
        <Input type="number" value={String(value.discountValue)} onChange={(x) => u({ discountValue: Number(x) })} />
      </F>
      <F label="최소 주문금액 (원)">
        <Input type="number" value={String(value.minOrderAmount)} onChange={(x) => u({ minOrderAmount: Number(x) })} />
      </F>
      <F label="최대 할인액 (비우면 없음)">
        <Input
          type="number"
          value={value.maxDiscountAmount == null ? "" : String(value.maxDiscountAmount)}
          onChange={(x) => u({ maxDiscountAmount: x === "" ? null : Number(x) })}
          placeholder="상한 없음"
        />
      </F>
      <F label="유효일수 (비우면 무기한)">
        <Input
          type="number"
          value={value.validDays == null ? "" : String(value.validDays)}
          onChange={(x) => u({ validDays: x === "" ? null : Number(x) })}
          placeholder="무기한"
        />
      </F>
      <F label="활성">
        <label className="flex items-center gap-2 h-11">
          <input type="checkbox" checked={value.isActive} onChange={(e) => u({ isActive: e.target.checked })} className="w-4 h-4 accent-brand-black" />
          <span className="text-[13px]">{value.isActive ? "활성" : "비활성"}</span>
        </label>
      </F>
      <F label="코드 등록 허용">
        <label className="flex items-center gap-2 h-11">
          <input type="checkbox" checked={value.codeRedeemable} onChange={(e) => u({ codeRedeemable: e.target.checked })} className="w-4 h-4 accent-brand-black" />
          <span className="text-[13px]">{value.codeRedeemable ? "코드로 발급" : "자동/수동만"}</span>
        </label>
      </F>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] tracking-wide text-brand-gray-mid">{label}</label>
      {children}
    </div>
  );
}
function Input({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
    />
  );
}
