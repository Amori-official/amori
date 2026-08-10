import { getUserCoupons } from "@/app/actions/account";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: "사용 가능", color: "bg-green-50 text-green-600" },
  used: { label: "사용 완료", color: "bg-gray-100 text-gray-500" },
  expired: { label: "기간 만료", color: "bg-red-50 text-red-500" },
};

export default async function CouponsPage() {
  const coupons = await getUserCoupons();

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-[14px] tracking-[0.3em] mb-6 border-b border-brand-border pb-4">
        보유 쿠폰
      </h2>

      {coupons.length === 0 ? (
        <div className="py-16 text-center text-brand-gray-mid text-sm tracking-wide">
          보유 중인 쿠폰이 없습니다.
        </div>
      ) : (
        <ul className="space-y-3 max-w-sm">
          {coupons.map((c) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.active;
            const dim = c.status !== "active";
            return (
              <li
                key={c.id}
                className={`border border-brand-border p-5 space-y-2 ${dim ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium tracking-wide">{c.discountLabel}</p>
                  <span className={`text-[12px] px-2 py-0.5 rounded-full ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-[14px] text-brand-gray-mid tracking-wide">{c.name}</p>
                <p className="text-[13px] text-brand-gray-mid tracking-wide">
                  {c.minOrderAmount > 0
                    ? `${c.minOrderAmount.toLocaleString("ko-KR")}원 이상 구매 시`
                    : "최소 주문금액 없음"}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[12px] tracking-widest bg-brand-fill text-brand-black px-2 py-0.5">
                    {c.code}
                  </span>
                  <span className="text-[13px] text-brand-gray-mid tracking-wide">
                    {c.expiresAt
                      ? `~ ${new Date(c.expiresAt).toLocaleDateString("ko-KR")}`
                      : "무기한"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[12px] text-brand-gray-mid mt-6 leading-relaxed">
        · 쿠폰은 결제 단계에서 적용됩니다.
        <br />· 신규 가입 쿠폰은 가입 시 자동 지급되며, 발급일로부터 30일간 유효합니다.
      </p>
    </div>
  );
}
