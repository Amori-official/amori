import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CARE",
};

interface Item {
  label: string;
  body: string;
}

const items: Item[] = [
  {
    label: "출고 안내",
    body: "결제 완료 후 평균 2~5영업일 이내에 출고됩니다.",
  },
  {
    label: "배송비 안내",
    body: "기본 배송비 3,000원, 50,000원 이상 구매 시 무료배송. 제주·도서산간 지역은 추가 배송비 6,000원.",
  },
  {
    label: "회원 혜택",
    body: "회원 가입 시 5% 할인 쿠폰이 즉시 지급됩니다.",
  },
];

/* TODO: 아래 항목은 확정 정보가 없어 노출하지 않음 — 확정 후 items 배열에 추가
  - 소재별 공통 세탁·관리 가이드 (제품 상세페이지의 개별 careInstructions와는 별개로,
    사이트 전체에 적용할 일반 세탁 가이드 문구 확정 필요)
  - 보관 방법
  - 다림질/드라이클리닝 가능 여부
*/

export default function CarePage() {
  return (
    <div className="pt-[100px] pb-24 px-4 sm:px-8 lg:px-16 max-w-3xl mx-auto">
      <h1 className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-12">
        CARE
      </h1>

      <div className="flex flex-col gap-10">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-3">
            <p className="text-[12px] tracking-widest text-brand-black">{item.label}</p>
            <p className="text-sm text-brand-gray-mid tracking-wide leading-7">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
