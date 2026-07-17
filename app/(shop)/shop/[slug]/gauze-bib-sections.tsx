import Image from "next/image";
import CompProductCard from "@/components/comp-product-card";
import { AccordionItem, CareIconRow } from "./product-accordion";
import ProductReviews from "./product-reviews";
import type { Product, Review } from "@/lib/types";

interface Props {
  product: Product;
  reviews: Review[];
  relatedProducts: Product[];
}

const KC_CERT_NUMBER = "CB014H2463-6001";

const SHIPPING_TEXT = `· 결제 완료 후 2~5영업일 이내 출고됩니다.\n· 50,000원 이상 무료배송 (기본 배송비 3,000원)\n· 제주·도서산간 추가 배송비 6,000원`;

const PRE_PURCHASE_NOTES = `· 모니터·조명 환경에 따라 실제 컬러와 다소 차이가 있을 수 있습니다.\n· 사이즈는 실측 기준이며, 측정 방법에 따라 1~2cm의 오차가 있을 수 있습니다.\n· 어린이제품 안전기준에 따른 시험을 완료했습니다. (인증번호: ${KC_CERT_NUMBER})`;

const sectionTitle = "text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-8";

export default function GauzeBibSections({ product, reviews, relatedProducts }: Props) {
  return (
    <div className="border-t border-brand-border bg-brand-gray-light">
      {/* 모바일 전용 아코디언: 제품 정보 / 사이즈 / 세탁 및 관리 / 배송 및 교환 / 구매 전 확인사항 */}
      <section className="lg:hidden px-4 sm:px-8 py-6 bg-white">
        {product.material && (
          <AccordionItem title="제품 정보">{product.material}</AccordionItem>
        )}
        {product.sizeGuide && (
          <AccordionItem title="사이즈">{product.sizeGuide}</AccordionItem>
        )}
        {product.careInstructions && (
          <AccordionItem title="세탁 및 관리">
            <CareIconRow />
            {product.careInstructions}
          </AccordionItem>
        )}
        {/* TODO: 교환 가능 기간·배송비 부담 기준 등 세부 정책 미확정 — 확정 후 보강, 우선 배송·반품 안내 페이지로 연결 */}
        <AccordionItem title="배송 및 교환">
          {SHIPPING_TEXT}
          {"\n\n"}
          자세한 배송·반품 정책은 배송·반품 안내 페이지를 확인해 주세요.
        </AccordionItem>
        <AccordionItem title="구매 전 확인사항">{PRE_PURCHASE_NOTES}</AccordionItem>
      </section>

      {/* More Information 도입부 (히어로 바로 아래 소개글) */}
      {product.detailIntro && (
        <section className="px-4 sm:px-8 lg:px-16 pt-16 lg:pt-20 pb-12">
          <p className={sectionTitle}>More Information</p>
          <p className="text-sm text-brand-gray-mid tracking-wide leading-9 max-w-3xl whitespace-pre-line">
            {product.detailIntro}
          </p>
        </section>
      )}

      {/* 1. 제품을 만든 이유 (TODO: 착용 이미지 없음 — 촬영 후 좌측 이미지 + 우측 텍스트 2단 구성으로 전환) */}
      {product.brandStory && (
        <section className="px-4 sm:px-8 lg:px-16 pb-16">
          <p className={sectionTitle}>Our Story</p>
          <p className="text-sm text-brand-gray-mid tracking-wide leading-9 max-w-2xl">
            {product.brandStory}
          </p>
        </section>
      )}

      {/* 2. 핵심 장점 4개 가로 배열 */}
      {product.features && product.features.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-16 pb-16">
          <p className={sectionTitle}>Features</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {product.features.map((f, i) => (
              <div key={f.label} className="flex flex-col gap-2.5">
                <p className="text-[11px] tracking-widest text-brand-gray-mid">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="text-[12px] tracking-widest text-brand-black">{f.label}</p>
                <p className="text-xs text-brand-gray-mid tracking-wide leading-7">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. 원단 확대 이미지 전체 폭 */}
      <section className="pb-16">
        <div className="relative w-full aspect-[16/9] lg:aspect-[21/9] bg-brand-gray-light">
          <Image
            src="/products/턱받이4.png"
            alt="아모리 거즈빕 원단 확대"
            fill
            className="object-cover"
          />
        </div>
      </section>

      {/* 5. 디테일 사진 (라벨/스냅) — TODO: 원단 단독 클로즈업 등 3번째 디테일 컷 추가 촬영 필요, 현재 2장만 배치 */}
      <section className="px-4 sm:px-8 lg:px-16 pb-16">
        <p className={sectionTitle}>Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative aspect-square bg-brand-gray-light">
            <Image src="/products/턱받이2.png" alt="아모리 거즈빕 라벨 디테일" fill className="object-cover" />
          </div>
          <div className="relative aspect-square bg-brand-gray-light">
            <Image src="/products/턱받이3.png" alt="아모리 거즈빕 목둘레 스냅 디테일" fill className="object-cover" />
          </div>
        </div>
      </section>

      {/* 6. 전체 컬러 이미지 + 컬러 설명 */}
      <section className="px-4 sm:px-8 lg:px-16 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="relative aspect-[4/5] bg-brand-gray-light">
          <Image src="/products/턱받이5.png" alt="아모리 거즈빕 7가지 컬러" fill className="object-cover" />
        </div>
        <div className="flex flex-col gap-4">
          <p className={sectionTitle + " mb-0"}>7 Colors</p>
          <p className="text-sm text-brand-gray-mid tracking-wide leading-8">
            Cream, Mint, Rose Pink, Blush, Yellow Green, Royal Blue, Yellow — 아이의 옷과 공간에 자연스럽게 어우러지는
            7가지 컬러로 준비했습니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {product.colors?.map((c) => (
              <span
                key={c.name}
                className="flex items-center gap-1.5 text-[11px] tracking-wide text-brand-gray-mid border border-brand-border px-2.5 py-1"
              >
                <span
                  className="w-3 h-3 rounded-full border border-brand-border"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 7. 착용 정면·옆면 — TODO: 아기 착용 사진 없음, 촬영 후 노출 */}

      {/* 8. 사이즈표 (TODO: 실측 이미지 없음 — 촬영 후 사이즈표 옆에 배치) */}
      {product.sizeGuide && (
        <section className="hidden lg:block px-4 sm:px-8 lg:px-16 pb-16">
          <p className={sectionTitle}>Size</p>
          <div className="max-w-xl border border-brand-border divide-y divide-brand-border text-sm">
            <div className="flex justify-between px-5 py-3">
              <span className="text-brand-gray-mid tracking-wide">사이즈</span>
              <span>가로 24cm × 세로 27.5cm</span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-brand-gray-mid tracking-wide">사용 연령</span>
              <span>신생아 ~ 36개월</span>
            </div>
            <div className="px-5 py-3 text-xs text-brand-gray-mid tracking-wide leading-6">
              착용 가능 시기는 아이의 체형에 따라 달라질 수 있으니 구매 전 상세 사이즈를 확인해 주세요.
            </div>
          </div>
        </section>
      )}

      {/* 9. KC 정보표 */}
      <section className="hidden lg:block px-4 sm:px-8 lg:px-16 pb-16">
        <p className={sectionTitle}>Safety Certification</p>
        <div className="max-w-xl border border-brand-border divide-y divide-brand-border text-sm">
          <div className="flex items-center gap-3 px-5 py-4">
            <Image src="/kc-mark.png" alt="KC 인증마크" width={28} height={28} />
            <span className="text-xs text-brand-gray-mid tracking-wide">
              어린이제품 안전기준에 따른 시험을 완료했습니다.
            </span>
          </div>
          <div className="flex justify-between px-5 py-3">
            <span className="text-brand-gray-mid tracking-wide">인증구분</span>
            <span>어린이제품 공통안전기준(KC)</span>
          </div>
          <div className="flex justify-between px-5 py-3">
            <span className="text-brand-gray-mid tracking-wide">인증번호</span>
            <span>{KC_CERT_NUMBER}</span>
          </div>
          {/* TODO: 시험기관·발급일 등 세부 정보 확인 후 추가 */}
        </div>
      </section>

      {/* 10. 세탁 방법 */}
      {product.careInstructions && (
        <section className="hidden lg:block px-4 sm:px-8 lg:px-16 pb-16">
          <p className={sectionTitle}>Care</p>
          <CareIconRow />
          <p className="text-sm text-brand-gray-mid tracking-wide leading-8 whitespace-pre-line max-w-xl">
            {product.careInstructions}
          </p>
        </section>
      )}

      {/* 11. 핸드메이드 및 원단 특성 — TODO: 확정된 카피(텍스트) 없음, 문구 확정 후 작성 (이미지 문제 아님) */}

      {/* 12. 함께 사용하기 좋은 상품 */}
      {relatedProducts.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-16 pb-16">
          <p className={sectionTitle}>You May Also Like</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-10">
            {relatedProducts.map((p) => (
              <CompProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 13. 리뷰 */}
      <section id="product-reviews" className="border-t border-brand-border px-4 sm:px-8 lg:px-16 py-16">
        <ProductReviews reviews={reviews} productId={product.id} />
      </section>
    </div>
  );
}
