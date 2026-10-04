import { getMyPoints, getPointHistory } from "@/app/actions/account";
import { pointTypeLabel } from "@/lib/points";

export const dynamic = "force-dynamic";

export default async function PointsPage() {
  const [balance, history] = await Promise.all([getMyPoints(), getPointHistory()]);

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-[14px] tracking-[0.3em] mb-6 border-b border-brand-border pb-4">
        적립금
      </h2>

      {/* 잔액 */}
      <div className="border border-brand-border p-6 mb-6">
        <p className="text-[13px] text-brand-gray-mid tracking-wide mb-1">보유 적립금</p>
        <p className="text-3xl font-light tracking-tight">
          {balance.toLocaleString("ko-KR")}
          <span className="text-base font-normal text-brand-gray-mid ml-1">P</span>
        </p>
        <p className="text-[12px] text-brand-gray-mid tracking-wide mt-3 leading-5">
          · 1P = 1원으로 결제 시 사용할 수 있어요 (1,000P 이상부터).<br />
          · 리뷰를 작성하면 500P가 적립됩니다.
        </p>
      </div>

      {/* 내역 */}
      <p className="text-[13px] tracking-widest text-brand-gray-mid mb-3">적립·사용 내역</p>
      {history.length === 0 ? (
        <div className="py-12 text-center text-brand-gray-mid text-sm tracking-wide border border-brand-border">
          적립금 내역이 없습니다.
        </div>
      ) : (
        <ul className="divide-y divide-brand-border border border-brand-border">
          {history.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[14px] text-brand-black tracking-wide">
                  {pointTypeLabel(t.type, t.reason)}
                </p>
                <p className="text-[12px] text-brand-gray-mid tracking-wide mt-0.5">
                  {new Date(t.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-medium ${t.amount >= 0 ? "text-green-600" : "text-brand-black"}`}>
                  {t.amount >= 0 ? "+" : ""}
                  {t.amount.toLocaleString("ko-KR")}P
                </p>
                <p className="text-[12px] text-brand-gray-mid">
                  잔액 {t.balanceAfter.toLocaleString("ko-KR")}P
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
