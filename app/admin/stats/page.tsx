import Link from "next/link";
import { getSalesStats, type SalesGranularity } from "@/app/actions/admin";
import { getVisitStats } from "@/app/actions/visits";

export const dynamic = "force-dynamic";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
const num = (n: number) => n.toLocaleString("ko-KR");

const GRANS: { key: SalesGranularity; label: string }[] = [
  { key: "day", label: "일간" },
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
];

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams?: { g?: string };
}) {
  const g: SalesGranularity =
    searchParams?.g === "week" || searchParams?.g === "month" ? searchParams.g : "day";
  const [stats, visits] = await Promise.all([getSalesStats(g), getVisitStats()]);

  const maxBucket = Math.max(1, ...stats.buckets.map((b) => b.sales));
  const maxQty = Math.max(1, ...stats.productOptions.map((p) => p.qty));
  const maxSrc = Math.max(1, ...stats.sources.map((s) => s.sales));
  const maxVisit = Math.max(1, ...visits.daily.map((d) => d.unique));
  // 버킷이 적으면(주/월) 모든 라벨 노출, 많으면(일) 처음·중간·끝만.
  const fewBuckets = stats.buckets.length <= 12;

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-[14px] tracking-[0.3em]">통계</h2>
        <div className="flex gap-1">
          {GRANS.map((x) => (
            <Link
              key={x.key}
              href={`/admin/stats?g=${x.key}`}
              className={`px-4 h-9 flex items-center text-[13px] tracking-widest transition-colors ${
                g === x.key
                  ? "bg-brand-black text-white"
                  : "border border-brand-border text-brand-gray-mid hover:text-brand-black"
              }`}
            >
              {x.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 방문자 (오늘/누적) */}
      <section className="mb-8">
        <p className="text-[13px] tracking-widest text-brand-gray-mid mb-3">방문자</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="오늘 방문자" value={`${num(visits.todayUnique)}명`} />
          <StatCard label="오늘 페이지뷰" value={`${num(visits.todayViews)}회`} />
          <StatCard label="누적 방문자" value={`${num(visits.totalUnique)}명`} />
          <StatCard label="누적 페이지뷰" value={`${num(visits.totalViews)}회`} />
        </div>
        {visits.daily.length > 0 && visits.totalViews > 0 && (
          <div className="border border-brand-border p-4 mt-3">
            <p className="text-[12px] text-brand-gray-mid mb-3">최근 7일 방문자(순 방문자)</p>
            <div className="flex items-end gap-2 h-28">
              {visits.daily.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <span className="text-[11px] text-brand-gray-mid">{d.unique}</span>
                  <div
                    className="w-full bg-brand-black/80 rounded-t"
                    style={{ height: `${(d.unique / maxVisit) * 100}%` }}
                    title={`${d.day} · 방문자 ${d.unique}명 · 페이지뷰 ${d.views}회`}
                  />
                  <span className="text-[10px] text-brand-gray-mid">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-[12px] text-brand-gray-mid mt-2">
          · 순 방문자는 브라우저 기준(같은 사람이 하루에 여러 번 봐도 1명). 관리자 페이지 방문은 제외됩니다.
        </p>
      </section>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label={`${stats.rangeLabel} 매출`} value={won(stats.totalSales)} />
        <StatCard label="주문 수" value={`${num(stats.orderCount)}건`} />
        <StatCard label="평균 주문액" value={won(stats.avgOrder)} />
        <StatCard label="신규 회원" value={`${num(stats.newMembers)}명`} />
      </div>

      {/* 매출 추이(단위별) */}
      <section className="mb-8">
        <p className="text-[13px] tracking-widest text-brand-gray-mid mb-3">
          매출 추이 · {stats.rangeLabel}
        </p>
        {stats.totalSales === 0 ? (
          <Empty>해당 기간 매출이 없습니다.</Empty>
        ) : (
          <div className="border border-brand-border p-4 overflow-x-auto">
            <div
              className="flex items-end gap-1 h-48 min-w-full"
              style={{ minWidth: stats.buckets.length * (fewBuckets ? 44 : 18) }}
            >
              {stats.buckets.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div
                    className="w-full bg-brand-black/80 hover:bg-brand-black transition-colors rounded-t"
                    style={{ height: `${(b.sales / maxBucket) * 100}%` }}
                    title={`${b.label} · ${won(b.sales)} · ${b.orders}건`}
                  />
                  {fewBuckets && (
                    <span className="text-[10px] text-brand-gray-mid mt-1 whitespace-nowrap">
                      {b.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {!fewBuckets && (
              <div className="flex justify-between mt-2 text-[11px] text-brand-gray-mid">
                <span>{stats.buckets[0]?.label}</span>
                <span>{stats.buckets[Math.floor(stats.buckets.length / 2)]?.label}</span>
                <span>{stats.buckets[stats.buckets.length - 1]?.label}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 상품별 · 옵션별 판매량 */}
      <section className="mb-8">
        <p className="text-[13px] tracking-widest text-brand-gray-mid mb-3">
          상품별 · 옵션별 판매량 (수량 기준)
        </p>
        {stats.productOptions.length === 0 ? (
          <Empty>해당 기간 판매된 상품이 없습니다.</Empty>
        ) : (
          <ul className="space-y-2">
            {stats.productOptions.map((p, i) => (
              <li key={i} className="border border-brand-border px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-sm tracking-wide text-brand-black min-w-0 truncate">
                    <span className="text-brand-gray-mid mr-2">{i + 1}</span>
                    {p.product}
                    {p.option && (
                      <span className="ml-1.5 text-[12px] text-brand-gray-mid">· {p.option}</span>
                    )}
                  </span>
                  <span className="text-[13px] text-brand-gray-mid shrink-0">
                    {num(p.qty)}개 · {won(p.revenue)}
                  </span>
                </div>
                <div className="h-1.5 bg-brand-gray-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-black/80 rounded-full"
                    style={{ width: `${(p.qty / maxQty) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[12px] text-brand-gray-mid mt-3">
          · 결제 완료 기준. 매출은 정가 기준(쿠폰·적립금 할인 반영 전)입니다.
        </p>
      </section>

      {/* 유입 경로 */}
      <section>
        <p className="text-[13px] tracking-widest text-brand-gray-mid mb-3">
          유입 경로 (매출 기준)
        </p>
        {stats.sources.length === 0 ? (
          <Empty>해당 기간 유입 경로 데이터가 없습니다.</Empty>
        ) : (
          <ul className="space-y-2">
            {stats.sources.map((s, i) => (
              <li key={i} className="border border-brand-border px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-sm tracking-wide text-brand-black min-w-0 truncate">
                    {s.source}
                  </span>
                  <span className="text-[13px] text-brand-gray-mid shrink-0">
                    {num(s.orders)}건 · {won(s.sales)}
                  </span>
                </div>
                <div className="h-1.5 bg-brand-gray-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-black/80 rounded-full"
                    style={{ width: `${(s.sales / maxSrc) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[12px] text-brand-gray-mid mt-3">
          · 유입원은 광고 UTM(utm_source) 또는 외부 유입 도메인 기준. 광고 링크 없이 들어온 주문은
          “직접/미상”으로 집계됩니다.
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-brand-border p-4">
      <p className="text-[12px] text-brand-gray-mid tracking-wide mb-1">{label}</p>
      <p className="text-xl font-light tracking-tight">{value}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-12 text-center text-brand-gray-mid text-sm tracking-wide border border-brand-border">
      {children}
    </div>
  );
}
