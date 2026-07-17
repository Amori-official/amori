import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "배송·반품 안내",
};

// TODO: 반품 가능 기간, 반품/교환 배송비 부담 기준, 단순변심 vs 불량 구분 기준 확정 필요
// 확정 전까지 아래 반품·교환 섹션은 화면에 노출하지 않음 (SHOW_RETURN_POLICY = true 로 전환)
const SHOW_RETURN_POLICY = false;

export default function ShippingPage() {
  return (
    <div className="pt-[100px] pb-24 px-4 sm:px-8 lg:px-16 max-w-3xl mx-auto">
      <h1 className="text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-12">
        배송·반품 안내
      </h1>

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <p className="text-[12px] tracking-widest text-brand-black">배송 안내</p>
          <p className="text-sm text-brand-gray-mid tracking-wide leading-8 whitespace-pre-line">
            {`· 결제 완료 후 2~5영업일 이내 출고됩니다.\n· 기본 배송비: 3,000원\n· 무료배송: 50,000원 이상 구매 시\n· 제주·도서산간 지역: 추가 배송비 6,000원`}
          </p>
        </div>

        {SHOW_RETURN_POLICY && (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] tracking-widest text-brand-black">반품·교환 안내</p>
            <p className="text-sm text-brand-gray-mid tracking-wide leading-8 whitespace-pre-line">
              {/* TODO: 반품 가능 기간, 반품 배송비 부담 기준 확정 후 작성 */}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
