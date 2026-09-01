import Link from "next/link";
import { getDashboardStats } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

const PAY_LABEL: Record<string, { label: string; color: string }> = {
  ready: { label: "결제 대기", color: "text-gray-500" },
  pending: { label: "결제 대기", color: "text-gray-500" },
  paid: { label: "결제 완료", color: "text-blue-600" },
  failed: { label: "결제 실패", color: "text-red-500" },
  cancelled: { label: "취소", color: "text-red-500" },
};

export default async function AdminDashboardPage() {
  const s = await getDashboardStats();

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <h2 className="text-[14px] tracking-[0.3em]">대시보드</h2>

      {/* 오늘 요약 */}
      <div>
        <p className="text-[12px] tracking-widest text-brand-gray-mid mb-2">오늘</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="오늘 매출" value={won(s.todaySales)} highlight />
          <Stat label="오늘 주문" value={`${s.todayOrders}건`} />
          <Link href="/admin/orders?fulfillment=unfulfilled" className="block">
            <Stat label="처리 대기 배송" value={`${s.unfulfilledCount}건`} accent={s.unfulfilledCount > 0} />
          </Link>
          <Stat label="오늘 신규 회원" value={`${s.todayMemberCount}명`} />
        </div>
      </div>

      {/* 전체 요약 */}
      <div>
        <p className="text-[12px] tracking-widest text-brand-gray-mid mb-2">전체</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="누적 매출(결제완료)" value={won(s.totalSales)} />
          <Stat label="누적 주문" value={`${s.totalOrders}건`} />
          <Stat label="회원 수" value={`${s.memberCount}명`} />
          <Stat label="상품(게시/미게시)" value={`${s.publishedCount} / ${s.unpublishedCount}`} />
        </div>
      </div>

      {/* 최근 주문 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] tracking-widest text-brand-gray-mid">최근 주문</p>
          <Link href="/admin/orders" className="text-[13px] text-brand-gray-mid underline hover:text-brand-black">
            주문 전체 보기 →
          </Link>
        </div>
        {s.recentOrders.length === 0 ? (
          <p className="text-[13px] text-brand-gray-mid py-8 text-center border border-brand-border">
            주문이 없습니다.
          </p>
        ) : (
          <ul className="border border-brand-border divide-y divide-brand-border">
            {s.recentOrders.map((o) => {
              const pay = PAY_LABEL[o.paymentStatus] ?? PAY_LABEL.ready;
              return (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm tracking-widest">{o.orderNumber}</p>
                    <p className="text-[12px] text-brand-gray-mid mt-0.5">
                      {new Date(o.createdAt).toLocaleString("ko-KR")} · {o.buyerName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{won(o.totalAmount)}</p>
                    <p className={`text-[12px] ${pay.color}`}>{pay.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`border p-4 ${accent ? "border-red-200 bg-red-50" : "border-brand-border"}`}>
      <p className="text-[12px] text-brand-gray-mid tracking-wide">{label}</p>
      <p className={`mt-1.5 font-medium ${highlight ? "text-xl" : "text-lg"} ${accent ? "text-red-500" : "text-brand-black"}`}>
        {value}
      </p>
    </div>
  );
}
