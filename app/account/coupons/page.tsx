export default function CouponsPage() {
  const coupons = [
    { code: "WELCOME5", discount: "5% 할인", expiry: "2026-12-31", desc: "신규 가입 쿠폰" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-[12px] tracking-[0.3em] mb-6 border-b border-brand-border pb-4">
        보유 쿠폰
      </h2>

      <ul className="space-y-3 max-w-sm">
        {coupons.map((c) => (
          <li key={c.code} className="border border-brand-border p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium tracking-wide">{c.discount}</p>
              <span className="text-[12px] tracking-widest bg-brand-fill text-brand-black px-2 py-0.5">
                {c.code}
              </span>
            </div>
            <p className="text-[12px] text-brand-gray-mid tracking-wide">{c.desc}</p>
            <p className="text-[12px] text-brand-gray-mid tracking-wide">
              유효기간: {c.expiry}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
