import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "배송·반품 안내",
};

const SHOW_RETURN_POLICY = true;

const deliveryItems = [
  "결제 완료 후 2~5영업일 이내 출고됩니다.",
  "기본 배송비: 3,000원",
  "무료배송: 50,000원 이상 구매 시",
  "제주·도서산간 지역: 추가 배송비 6,000원",
];

const returnSections: { title: string; items: string[] }[] = [
  {
    title: "신청 기간",
    items: [
      "단순 변심: 상품을 받은 날로부터 7일 이내",
      "상품 하자: 상품을 받은 날로부터 48시간 이내",
    ],
  },
  {
    title: "핸드메이드 제품 안내",
    items: [
      "아모리의 모든 제품은 손으로 하나하나 만드는 핸드메이드입니다. 박음질이나 부자재 위치에 약간의 오차나 비대칭이 있을 수 있으며, 이는 제품의 결함이 아닙니다.",
      "하자가 의심되는 경우 상품을 받은 날로부터 48시간 이내에 제품 사진과 함께 아모리 고객센터로 문의해 주세요. 확인 후 동일한 색상·사이즈로 교환해 드립니다.",
    ],
  },
  {
    title: "반품 배송비",
    items: ["단순 변심: 구매자 부담 (반품 편도 3,000원 / 교환 시 왕복 6,000원)"],
  },
  {
    title: "반품·교환이 어려운 경우",
    items: [
      "세탁하거나 사용하여 상품 가치가 훼손된 경우",
      "상품의 택(tag)·라벨을 제거했거나 포장을 훼손한 경우",
      "시간이 지나 재판매가 어려울 만큼 상품 가치가 떨어진 경우",
      "아기 위생과 직접 관련되어 개봉·사용 시 재판매가 어려운 상품",
    ],
  },
  {
    title: "반품·교환 신청 방법",
    items: [
      "고객센터(카카오 채널톡)로 주문번호와 사유를 남겨 반품·교환을 접수해 주세요.",
      "접수가 완료되면 아모리가 계약한 택배사(한진택배)가 제품을 수거합니다.",
      "수거된 제품이 도착해 검수가 끝나면 환불 또는 교환을 진행해 드립니다.",
      "반품 주소: 경기도 부천시 소향로 131, 워크리움 중동점 7층 777호",
    ],
  },
];

export default function ShippingPage() {
  return (
    <div className="pt-[100px] pb-24 px-4 sm:px-8 lg:px-16 max-w-3xl mx-auto">
      <h1 className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-12">
        배송·반품 안내
      </h1>

      <div className="flex flex-col gap-12">
        {/* 배송 안내 */}
        <section className="flex flex-col gap-4">
          <BracketHeading>배송 안내</BracketHeading>
          <ul className="flex flex-col gap-2">
            {deliveryItems.map((item) => (
              <DashItem key={item}>{item}</DashItem>
            ))}
          </ul>
        </section>

        {/* 반품·교환 안내 */}
        {SHOW_RETURN_POLICY && (
          <section className="flex flex-col gap-6">
            <BracketHeading>반품·교환 안내</BracketHeading>
            <ol className="flex flex-col gap-6">
              {returnSections.map((section, idx) => (
                <li key={section.title} className="flex flex-col gap-2">
                  <p className="text-sm tracking-wide text-brand-black">
                    {idx + 1}. {section.title}
                  </p>
                  <ul className="flex flex-col gap-1.5 pl-3">
                    {section.items.map((item) => (
                      <DashItem key={item}>{item}</DashItem>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

function BracketHeading({ children }: { children: string }) {
  return (
    <p className="text-[14px] tracking-widest text-brand-black">[ {children} ]</p>
  );
}

function DashItem({ children }: { children: string }) {
  return (
    <li className="flex gap-2 text-sm text-brand-gray-mid tracking-wide leading-7">
      <span className="shrink-0">-</span>
      <span>{children}</span>
    </li>
  );
}
