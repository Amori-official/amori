"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminDeleteReview, type AdminReview } from "@/app/actions/admin";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="tracking-tight" aria-label={`${rating}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "text-amber-400" : "text-brand-border"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ReviewsAdminClient({
  reviews,
  total,
  page,
  pageSize,
}: {
  reviews: AdminReview[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const go = (p: number) => router.push(`/admin/reviews${p > 1 ? `?page=${p}` : ""}`);

  const handleDelete = (r: AdminReview) => {
    if (!confirm(`이 리뷰를 삭제하시겠습니까?\n[${r.productName}] ${r.userName}\n삭제 후 상품 평점이 다시 계산됩니다.`)) return;
    setBusyId(r.id);
    setError(null);
    startTransition(async () => {
      const res = await adminDeleteReview(r.id);
      setBusyId(null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[14px] tracking-[0.3em]">리뷰 관리</h2>
        <span className="text-[13px] text-brand-gray-mid tracking-wide">총 {total}건</span>
      </div>

      {error && (
        <p className="mb-4 text-[13px] text-red-500 tracking-wide border border-red-200 bg-red-50 px-3 py-2">
          {error}
        </p>
      )}

      {reviews.length === 0 ? (
        <div className="py-20 text-center text-brand-gray-mid text-sm tracking-wide">
          작성된 리뷰가 없습니다.
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {reviews.map((r) => {
              const busy = pending && busyId === r.id;
              return (
                <li key={r.id} className="border border-brand-border p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Stars rating={r.rating} />
                        {r.productSlug ? (
                          <Link
                            href={`/shop/${r.productSlug}`}
                            target="_blank"
                            className="text-sm font-medium tracking-wide underline decoration-brand-border underline-offset-4 hover:decoration-brand-black"
                          >
                            {r.productName}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium tracking-wide">{r.productName}</span>
                        )}
                      </div>
                      <p className="text-[13px] text-brand-gray-mid mt-1">
                        {r.userName} · {new Date(r.createdAt).toLocaleString("ko-KR")}
                      </p>
                      <p className="text-[14px] text-brand-black mt-2 whitespace-pre-line break-words">
                        {r.content}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={busy}
                      className="h-9 px-3 border border-red-300 text-red-500 text-[13px] tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {busy ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => go(page - 1)}
                disabled={page <= 1}
                className="h-9 px-4 border border-brand-border text-[13px] tracking-wide disabled:opacity-40 hover:border-brand-black"
              >
                이전
              </button>
              <span className="text-[13px] text-brand-gray-mid">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => go(page + 1)}
                disabled={page >= totalPages}
                className="h-9 px-4 border border-brand-border text-[13px] tracking-wide disabled:opacity-40 hover:border-brand-black"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
