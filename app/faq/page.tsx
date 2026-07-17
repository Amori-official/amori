import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
};

interface QA {
  q: string;
  a: string;
}

const faqs: QA[] = [
  {
    q: "배송은 얼마나 걸리나요?",
    a: "결제 완료 후 평균 2~5영업일 이내에 출고됩니다.",
  },
  {
    q: "배송비는 얼마인가요?",
    a: "기본 배송비는 3,000원이며, 50,000원 이상 구매 시 무료배송입니다. 제주·도서산간 지역은 추가 배송비 6,000원이 부과됩니다.",
  },
  {
    q: "회원가입 혜택이 있나요?",
    a: "회원 가입 시 5% 할인 쿠폰이 즉시 지급됩니다.",
  },
];

/* TODO: 아래 항목은 확정 정보가 없어 노출하지 않음 — 확정 후 faqs 배열에 추가
  - 반품/교환 가능 기간 및 절차
  - 결제 수단 및 취소 방법
  - 사이즈 관련 문의
  - 재입고 알림 신청 방법
*/

export default function FaqPage() {
  return (
    <div className="pt-[100px] pb-24 px-4 sm:px-8 lg:px-16 max-w-3xl mx-auto">
      <h1 className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-12">
        FAQ
      </h1>

      <div className="flex flex-col">
        {faqs.map((item) => (
          <div key={item.q} className="border-b border-brand-border py-6 flex flex-col gap-3">
            <p className="text-sm font-medium tracking-wide text-brand-black">Q. {item.q}</p>
            <p className="text-sm text-brand-gray-mid tracking-wide leading-7">A. {item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
