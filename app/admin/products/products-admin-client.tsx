"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  setProductPublished,
  setVariantActive,
  type AdminProduct,
} from "@/app/actions/admin";

export default function ProductsAdminClient({ products }: { products: AdminProduct[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const togglePublished = (p: AdminProduct) => {
    setBusyId(p.id);
    setError(null);
    startTransition(async () => {
      const res = await setProductPublished(p.id, !p.isPublished);
      setBusyId(null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  const toggleVariant = (variantId: string, next: boolean) => {
    setBusyId(variantId);
    setError(null);
    startTransition(async () => {
      const res = await setVariantActive(variantId, next);
      setBusyId(null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[14px] tracking-[0.3em]">상품 관리</h2>
        <span className="text-[13px] text-brand-gray-mid tracking-wide">
          총 {products.length}개 상품
        </span>
      </div>

      {error && (
        <p className="mb-4 text-[13px] text-red-500 tracking-wide border border-red-200 bg-red-50 px-3 py-2">
          {error}
        </p>
      )}

      {products.length === 0 ? (
        <div className="py-20 text-center text-brand-gray-mid text-sm tracking-wide">
          등록된 상품이 없습니다.
        </div>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => (
            <li key={p.id} className="border border-brand-border p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium tracking-wide">{p.name}</p>
                    {p.nameKo && (
                      <span className="text-[13px] text-brand-gray-mid">{p.nameKo}</span>
                    )}
                    <StatusBadge published={p.isPublished} />
                  </div>
                  <p className="text-[13px] text-brand-gray-mid mt-1">
                    {p.category ?? "-"} · ₩{p.price.toLocaleString("ko-KR")} · /{p.slug}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="px-4 h-9 flex items-center border border-brand-border text-[13px] tracking-widest text-brand-black hover:bg-brand-gray-light transition-colors"
                  >
                    수정
                  </Link>
                  <button
                    type="button"
                    onClick={() => togglePublished(p)}
                    disabled={pending && busyId === p.id}
                    className={`px-4 h-9 text-[13px] tracking-widest transition-colors disabled:opacity-50 ${
                      p.isPublished
                        ? "border border-brand-border text-brand-gray-mid hover:border-brand-black hover:text-brand-black"
                        : "bg-brand-black text-white hover:bg-brand-gray-mid"
                    }`}
                  >
                    {p.isPublished ? "게시 내리기" : "게시하기"}
                  </button>
                </div>
              </div>

              {/* 옵션(변형) 품절 토글 */}
              {p.variants.length > 0 && (
                <div className="mt-3 pt-3 border-t border-brand-border">
                  <p className="text-[12px] tracking-widest text-brand-gray-mid mb-2">
                    옵션 ({p.variants.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {p.variants.map((v) => {
                      const label = [v.colorName, v.optionName].filter(Boolean).join(" · ") || "기본";
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVariant(v.id, !v.isActive)}
                          disabled={pending && busyId === v.id}
                          title={v.isActive ? "클릭 시 품절 처리" : "클릭 시 판매 재개"}
                          className={`px-3 h-8 text-[12px] tracking-wide border transition-colors disabled:opacity-50 ${
                            v.isActive
                              ? "border-brand-border text-brand-black hover:bg-brand-gray-light"
                              : "border-red-200 bg-red-50 text-red-500 line-through"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[12px] text-brand-gray-mid mt-2">
                    옵션을 클릭하면 판매/품절이 전환됩니다. (품절 = 빨간 취소선)
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`text-[12px] px-2 py-0.5 rounded-full ${
        published ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
      }`}
    >
      {published ? "게시 중" : "미게시"}
    </span>
  );
}
