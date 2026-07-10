"use client";

import type { Review } from "@/lib/types";

interface Props {
  reviews: Review[];
  productId: string;
}

export default function ProductReviews({ reviews }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-base font-bold tracking-[0.25em] text-brand-black uppercase">
          Reviews{reviews.length > 0 && ` (${reviews.length})`}
        </h2>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-brand-gray-mid tracking-wide">
          아직 작성된 리뷰가 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {reviews.map((review) => (
            <div key={review.id} className="border border-brand-border p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-xs ${i < review.rating ? "text-amber-400" : "text-brand-border"}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-[12px] text-brand-gray-mid tracking-wide">
                  {review.userName}
                </span>
              </div>
              <p className="text-xs text-brand-gray-mid tracking-wide leading-relaxed">
                {review.content}
              </p>
              <p className="text-[12px] text-brand-border">
                {new Date(review.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
