"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProduct } from "@/app/actions/admin";

export default function NewProductPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nameKo: "", slug: "", category: "", price: "" });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createProduct({
        name: form.name,
        nameKo: form.nameKo,
        slug: form.slug,
        category: form.category,
        price: Number(form.price),
      });
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/admin/products/${res.id}`);
    });
  };

  return (
    <div className="p-6 sm:p-8 max-w-lg">
      <Link href="/admin/products" className="text-[13px] text-brand-gray-mid underline hover:text-brand-black">
        ← 상품 목록
      </Link>
      <h2 className="text-[14px] tracking-[0.3em] mt-2 mb-2">새 상품 등록</h2>
      <p className="text-[13px] text-brand-gray-mid mb-6">
        기본 정보만 먼저 입력하면 상품이 <b>미게시</b> 상태로 생성됩니다. 이어지는 수정 페이지에서 상세 정보·이미지·옵션을 채운 뒤 게시하세요.
      </p>

      {error && (
        <p className="mb-4 text-[13px] text-red-500 tracking-wide border border-red-200 bg-red-50 px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <F label="상품명 (영문, 필수)"><I value={form.name} onChange={(v) => set("name", v)} placeholder="HAND TOWEL" /></F>
        <F label="상품명 (한글)"><I value={form.nameKo} onChange={(v) => set("nameKo", v)} placeholder="핸드타월" /></F>
        <F label="슬러그 / URL (필수)">
          <I value={form.slug} onChange={(v) => set("slug", v)} placeholder="hand-towel" />
          <p className="text-[12px] text-brand-gray-mid mt-1">영문 소문자·숫자·하이픈만. 상품 주소가 됩니다: /shop/슬러그</p>
        </F>
        <F label="카테고리"><I value={form.category} onChange={(v) => set("category", v)} placeholder="small-things" /></F>
        <F label="가격 (원, 필수)"><I type="number" value={form.price} onChange={(v) => set("price", v)} placeholder="9000" /></F>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-6 px-8 h-12 bg-brand-black text-white text-[14px] tracking-[0.25em] hover:bg-brand-gray-mid transition-colors disabled:opacity-50"
      >
        {pending ? "생성 중..." : "생성하고 상세 편집"}
      </button>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] tracking-wide text-brand-gray-mid">{label}</label>
      {children}
    </div>
  );
}
function I({
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
