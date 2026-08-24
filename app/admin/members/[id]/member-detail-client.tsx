import Link from "next/link";
import type { AdminMemberDetail } from "@/app/actions/admin";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

const PAY_LABEL: Record<string, { label: string; color: string }> = {
  ready: { label: "결제 대기", color: "text-gray-500" },
  pending: { label: "결제 대기", color: "text-gray-500" },
  paid: { label: "결제 완료", color: "text-blue-600" },
  failed: { label: "결제 실패", color: "text-red-500" },
  cancelled: { label: "결제 취소", color: "text-red-500" },
  refunded: { label: "환불", color: "text-amber-600" },
};

const COUPON_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: "사용 가능", color: "bg-blue-50 text-blue-600" },
  used: { label: "사용 완료", color: "bg-gray-100 text-gray-500" },
  expired: { label: "만료", color: "bg-gray-100 text-gray-400" },
};

export default function MemberDetailClient({ member }: { member: AdminMemberDetail }) {
  const totalPaid = member.orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="p-6 sm:p-8 max-w-4xl space-y-6">
      <div>
        <Link href="/admin/members" className="text-[13px] text-brand-gray-mid hover:text-brand-black">
          ← 회원 목록
        </Link>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <h2 className="text-[15px] tracking-[0.2em] font-medium">{member.name || "(이름 없음)"}</h2>
          {member.role === "admin" && (
            <span className="text-[12px] px-2 py-0.5 rounded-full bg-brand-black text-white">관리자</span>
          )}
          {member.marketingAgreed && (
            <span className="text-[12px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">마케팅 동의</span>
          )}
        </div>
        <p className="text-[13px] text-brand-gray-mid mt-1">
          가입일 {new Date(member.createdAt).toLocaleDateString("ko-KR")}
        </p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="누적 주문" value={`${member.orders.length}건`} />
        <Stat label="결제 완료 금액" value={won(totalPaid)} />
        <Stat label="보유 쿠폰" value={`${member.coupons.filter((c) => c.status === "active").length}장`} />
      </div>

      {/* 회원 정보 */}
      <Section title="회원 정보">
        <dl className="space-y-1.5 text-[13px]">
          <Row label="이메일" value={member.email || "-"} />
          <Row label="연락처" value={member.phone || "-"} />
          <Row
            label="생일"
            value={member.birthday ? new Date(member.birthday).toLocaleDateString("ko-KR") : "-"}
          />
          <Row label="마케팅 수신" value={member.marketingAgreed ? "동의" : "미동의"} />
        </dl>
      </Section>

      {/* 주문 내역 */}
      <Section title={`주문 내역 (${member.orders.length})`}>
        {member.orders.length === 0 ? (
          <p className="text-[13px] text-brand-gray-mid py-4 text-center">주문 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-brand-border border-y border-brand-border">
            {member.orders.map((o) => {
              const pay = PAY_LABEL[o.paymentStatus] ?? PAY_LABEL.ready;
              return (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-[13px] tracking-widest underline decoration-brand-border underline-offset-4 hover:decoration-brand-black"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="text-[12px] text-brand-gray-mid mt-0.5">
                      {new Date(o.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-medium">{won(o.totalAmount)}</p>
                    <p className={`text-[12px] ${pay.color}`}>{pay.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* 보유 쿠폰 */}
      <Section title={`보유 쿠폰 (${member.coupons.length})`}>
        {member.coupons.length === 0 ? (
          <p className="text-[13px] text-brand-gray-mid py-4 text-center">보유한 쿠폰이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-brand-border border-y border-brand-border">
            {member.coupons.map((c) => {
              const st = COUPON_STATUS[c.status] ?? COUPON_STATUS.active;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px]">{c.name}</p>
                    {c.expiresAt && (
                      <p className="text-[12px] text-brand-gray-mid mt-0.5">
                        ~{new Date(c.expiresAt).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                  <span className={`text-[12px] px-2 py-0.5 rounded-full shrink-0 ${st.color}`}>
                    {st.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-brand-border p-4">
      <p className="text-[12px] text-brand-gray-mid tracking-wide">{label}</p>
      <p className="mt-1.5 text-lg font-medium">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-brand-border p-4 sm:p-5">
      <h3 className="text-[12px] tracking-widest text-brand-gray-mid mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-brand-gray-mid shrink-0">{label}</dt>
      <dd className="text-right break-all">{value}</dd>
    </div>
  );
}
