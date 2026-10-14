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

  // 삭제 모달 상태
  const [target, setTarget] = useState<AdminReview | null>(null);
  const [reason, setReason] = useState("");
  const [recover, setRecover] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const go = (p: number) => router.push(`/admin/reviews${p > 1 ? `?page=${p}` : ""}`);

  const openDelete = (r: AdminReview) => {
    setTarget(r);
    setReason("");
    setRecover(false);
    setError(null);
  };

  const confirmDelete = () => {
    if (!target) return;
    if (reason.trim().length < 2) {
      setError("삭제 사유를 입력해주세요.");
      return;
    }
    setBusyId(target.id);
    setError(null);
    startTransition(async () => {
      const res = await adminDeleteReview(target.id, { reason: reason.trim(), recoverPoints: recover });
      setBusyId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      setTarget(null);
      router.refresh();
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
                      onClick={() => openDelete(r)}
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

      {/* 삭제 모달 — 사유 입력 + 포인트 회수 선택 */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !pending && setTarget(null)} />
          <div className="relative bg-white w-full max-w-md p-6 space-y-4">
            <h3 className="text-[14px] tracking-[0.3em]">리뷰 삭제</h3>
            <p className="text-[13px] text-brand-gray-mid break-words">
              [{target.productName}] {target.userName} · {target.rating}점
            </p>
            <div>
              <label className="text-[12px] text-brand-gray-mid">삭제 사유 (필수)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="예: 비방·욕설, 광고·스팸, 상품과 무관한 내용 등"
                className="mt-1 w-full border border-brand-border p-2 text-[13px] focus:outline-none focus:border-brand-black resize-none"
              />
            </div>
            <label className="flex items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={recover}
                onChange={(e) => setRecover(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-black"
              />
              <span>
                <b>적립 포인트 회수</b>
                <span className="block text-[12px] text-brand-gray-mid">
                  이 리뷰로 지급된 포인트(글 300P·미디어 500P)를 고객 잔액에서 차감합니다. (불합리한 리뷰용)
                </span>
              </span>
            </label>
            {error && <p className="text-[13px] text-red-500">{error}</p>}
            <p className="text-[12px] text-brand-gray-mid">
              삭제하면 상품 페이지에서 숨겨지고, 평점이 다시 계산돼요. 같은 상품 재작성은 차단됩니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setTarget(null)}
                disabled={pending}
                className="h-9 px-4 border border-brand-border text-[13px] tracking-wide hover:border-brand-black disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={pending}
                className="h-9 px-4 bg-red-500 text-white text-[13px] tracking-widest hover:bg-red-600 disabled:opacity-50"
              >
                {pending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
