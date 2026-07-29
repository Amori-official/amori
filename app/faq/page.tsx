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
    a: "결제 완료 후 2~5영업일 이내 출고됩니다.",
  },
  {
    q: "배송비는 얼마인가요?",
    a: "기본 배송비는 3,000원이며, 50,000원 이상 구매 시 무료배송입니다. 제주·도서산간 지역은 추가 배송비 6,000원이 부과됩니다.",
  },
  {
    q: "회원가입 혜택이 있나요?",
    a: "회원 가입 시 5% 할인 쿠폰이 즉시 지급됩니다.",
  },
  {
    q: "반품·교환은 어떻게 하나요?",
    a: "단순 변심은 상품을 받은 날로부터 7일 이내에 신청할 수 있으며, 반품 배송비(편도 3,000원, 교환 시 왕복 6,000원)는 구매자 부담입니다. 고객센터로 주문번호와 사유를 남겨 접수해 주시면 한진택배가 제품을 수거하고, 검수 후 환불 또는 교환을 진행해 드립니다. 자세한 내용은 배송·반품 안내 페이지를 참고해 주세요.",
  },
  {
    q: "핸드메이드 제품인데 박음질이 조금 다른 것 같아요.",
    a: "아모리의 모든 제품은 손으로 하나하나 만드는 핸드메이드입니다. 박음질이나 부자재 위치에 약간의 오차나 비대칭이 있을 수 있으며 이는 제품의 결함이 아닙니다. 다만 하자가 의심되는 경우 상품을 받은 날로부터 48시간 이내에 제품 사진과 함께 고객센터로 문의해 주시면 확인 후 동일 색상·사이즈로 교환해 드립니다.",
  },
];

/* TODO: 확정 후 faqs 배열에 추가
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
