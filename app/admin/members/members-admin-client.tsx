"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminMember } from "@/app/actions/admin";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

export default function MembersAdminClient({
  members,
  total,
  page,
  pageSize,
  initialQuery = "",
}: {
  members: AdminMember[];
  total: number;
  page: number;
  pageSize: number;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildUrl = (nextQ: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/admin/members${qs ? `?${qs}` : ""}`;
  };

  // 검색 시 1페이지로 리셋
  const search = () => router.push(buildUrl(q, 1));

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[14px] tracking-[0.3em]">회원 관리</h2>
        <span className="text-[13px] text-brand-gray-mid tracking-wide">총 {total}명</span>
      </div>

      {/* 검색 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex gap-2 mb-5"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 · 이메일 · 전화번호 검색"
          className="h-10 flex-1 border border-brand-border px-3 text-[13px] tracking-wide focus:outline-none focus:border-brand-black"
        />
        <button type="submit" className="h-10 px-4 bg-brand-black text-white text-[13px] tracking-widest shrink-0">
          검색
        </button>
        {initialQuery && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              router.push("/admin/members");
            }}
            className="h-10 px-4 border border-brand-border text-[13px] tracking-wide text-brand-gray-mid shrink-0 hover:text-brand-black"
          >
            초기화
          </button>
        )}
      </form>

      {members.length === 0 ? (
        <div className="py-20 text-center text-brand-gray-mid text-sm tracking-wide">
          {initialQuery ? "조건에 맞는 회원이 없습니다." : "회원이 없습니다."}
        </div>
      ) : (
        <div className="border border-brand-border divide-y divide-brand-border">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/admin/members/${m.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-brand-gray-light transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-medium truncate">{m.name || "(이름 없음)"}</p>
                  {m.role === "admin" && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-brand-black text-white tracking-wide">
                      관리자
                    </span>
                  )}
                  {m.marketingAgreed && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 tracking-wide">
                      마케팅 동의
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-brand-gray-mid mt-0.5 truncate">
                  {m.email}
                  {m.phone ? ` · ${m.phone}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px]">
                  주문 {m.orderCount}건
                </p>
                <p className="text-[12px] text-brand-gray-mid mt-0.5">{won(m.totalSpent)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => router.push(buildUrl(initialQuery, page - 1))}
            disabled={page <= 1}
            className="h-9 px-4 border border-brand-border text-[13px] tracking-wide disabled:opacity-40 hover:border-brand-black"
          >
            이전
          </button>
          <span className="text-[13px] text-brand-gray-mid">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => router.push(buildUrl(initialQuery, page + 1))}
            disabled={page >= totalPages}
            className="h-9 px-4 border border-brand-border text-[13px] tracking-wide disabled:opacity-40 hover:border-brand-black"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
