import Image from "next/image";
import CompProductCard from "@/components/comp-product-card";
import { AccordionItem } from "./product-accordion";
import ProductReviews from "./product-reviews";
import type { Product, Review } from "@/lib/types";

interface Props {
  product: Product;
  reviews: Review[];
  relatedProducts: Product[];
}

type DetailImage = NonNullable<Product["detailImages"]>[number];
type DetailRow = { type: "full" | "left" | "right" | "grid"; items: DetailImage[] };

// 연속된 "grid" 항목은 2단으로 짝지어 묶고, 나머지는 각자 한 행을 차지한다.
function groupDetailImages(images: DetailImage[]): DetailRow[] {
  const rows: DetailRow[] = [];
  let i = 0;
  while (i < images.length) {
    const img = images[i];
    const layout = img.layout ?? "full";
    if (layout === "grid") {
      const next = images[i + 1];
      if (next && (next.layout ?? "full") === "grid") {
        rows.push({ type: "grid", items: [img, next] });
        i += 2;
        continue;
      }
      rows.push({ type: "grid", items: [img] });
      i += 1;
      continue;
    }
    rows.push({ type: layout, items: [img] });
    i += 1;
  }
  return rows;
}

const SHIPPING_TEXT = `· 결제 완료 후 2~5영업일 이내 출고됩니다.\n· 50,000원 이상 무료배송 (기본 배송비 3,000원)\n· 제주·도서산간 추가 배송비 6,000원`;

const PRE_PURCHASE_NOTES = `· 모니터·조명 환경에 따라 실제 컬러와 다소 차이가 있을 수 있습니다.\n· 사이즈는 실측 기준이며, 측정 방법에 따라 1~2cm의 오차가 있을 수 있습니다.`;

const sectionTitle = "text-base font-bold tracking-[0.25em] text-brand-black uppercase mb-8";

// GAUZE BIB의 상세페이지 레이아웃을 상품 데이터 기반으로 일반화한 공통 섹션 모음.
// 각 섹션은 해당 데이터가 없으면 렌더링되지 않는다 — 빈 영역이나 안내 문구를 고객 화면에 노출하지 않기 위함.
export default function ProductDetailSections({ product, reviews, relatedProducts }: Props) {
  return (
    <div className="border-t border-brand-border bg-brand-gray-light">
      {/* 리뉴얼/변경 공지 (상세 본문 최상단) */}
      {product.renewalNotice && (
        <RenewalNotice text={product.renewalNotice} images={product.renewalImages} />
      )}

      {/* More Information 도입부 */}
      {product.detailIntro && (
        <section className="px-4 sm:px-8 lg:px-16 pt-16 lg:pt-20 pb-12">
          <p className={sectionTitle}>More Information</p>
          <p className="text-sm text-brand-gray-mid tracking-wide leading-9 max-w-3xl whitespace-pre-line">
            {product.detailIntro}
          </p>
        </section>
      )}

      {/* Our Story */}
      {product.brandStory && (
        <section className="px-4 sm:px-8 lg:px-16 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {product.storyImage && (
            <div className="relative aspect-[4/5] bg-brand-gray-light">
              <Image
                src={product.storyImage}
                alt={product.storyImageAlt ?? product.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-4">
            <p className={sectionTitle + " mb-0"}>Our Story</p>
            <p className="text-sm text-brand-gray-mid tracking-wide leading-9 max-w-2xl">
              {product.brandStory}
            </p>
          </div>
        </section>
      )}

      {/* Features */}
      {product.features && product.features.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-16 pb-16">
          <p className={sectionTitle}>Features</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {product.features.map((f, i) => (
              <div key={f.label} className="flex flex-col gap-2.5">
                <p className="text-[13px] tracking-widest text-brand-gray-mid">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="text-[14px] tracking-widest text-brand-black">{f.label}</p>
                <p className="text-xs text-brand-gray-mid tracking-wide leading-7">
                  {product.certificationNumber && f.body.includes(product.certificationNumber) ? (
                    <>
                      {f.body.split(`(인증번호: ${product.certificationNumber})`)[0]}
                      <span className="font-bold text-brand-black">
                        (인증번호: {product.certificationNumber})
                      </span>
                    </>
                  ) : (
                    f.body
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 원단/대표 확대 이미지 (전체 폭) */}
      {product.materialDetailImage && (
        <section className="pb-16">
          <div className="relative w-full aspect-[16/9] lg:aspect-[21/9] bg-brand-gray-light">
            <Image
              src={product.materialDetailImage}
              alt={product.materialDetailImageAlt ?? `${product.name} 원단 확대`}
              fill
              className="object-cover"
            />
          </div>
        </section>
      )}

      {/* Details — 이미지별 layout(full/grid/left/right)에 따라 리듬감 있게 배치 */}
      {product.detailImages && product.detailImages.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-16 pb-16">
          <p className={sectionTitle}>Details</p>
          <div className="flex flex-col gap-6 lg:gap-10">
            {groupDetailImages(product.detailImages).map((row, i) => {
              if (row.type === "grid") {
                return (
                  <div key={i} className="grid grid-cols-2 gap-4 sm:gap-6">
                    {row.items.map((img) => (
                      <div key={img.src} className="relative w-full bg-brand-gray-light">
                        <Image
                          src={img.src}
                          alt={img.alt}
                          width={img.width}
                          height={img.height}
                          className="w-full h-auto"
                          sizes="(min-width: 1024px) 40vw, 50vw"
                        />
                      </div>
                    ))}
                  </div>
                );
              }

              const img = row.items[0];

              if (row.type === "left" || row.type === "right") {
                return (
                  <div key={i} className={`flex ${row.type === "right" ? "justify-end" : "justify-start"}`}>
                    <div className="relative w-full sm:w-[68%] lg:w-[60%] bg-brand-gray-light">
                      <Image
                        src={img.src}
                        alt={img.alt}
                        width={img.width}
                        height={img.height}
                        className="w-full h-auto"
                        sizes="(min-width: 1024px) 60vw, 68vw"
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="relative w-full bg-brand-gray-light">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={img.width}
                    height={img.height}
                    className="w-full h-auto"
                    sizes="100vw"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 컬러 소개 + 색상별 단독 컷 (한 줄 3장, 마지막 1장은 우측 정렬) */}
      {product.colors && product.colors.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-16 pb-16">
          <p className={sectionTitle}>{product.colorSectionTitle ?? "Colors"}</p>
          {product.colorDescription && (
            <p className="text-sm text-brand-gray-mid tracking-wide leading-8 max-w-3xl mb-6">
              {product.colorDescription}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-8">
            {product.colors.map((c) => (
              <span
                key={c.name}
                className="flex items-center gap-1.5 text-[13px] tracking-wide text-brand-gray-mid border border-brand-border px-2.5 py-1"
              >
                <span
                  className="w-3 h-3 rounded-full border border-brand-border"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
              </span>
            ))}
          </div>
          {(() => {
            const withImg = product.colors.filter((c) => c.image);
            if (withImg.length === 0) return null;
            const lastAlone = withImg.length % 3 === 1;
            return (
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {withImg.map((c, i) => (
                  <figure
                    key={c.name}
                    className={lastAlone && i === withImg.length - 1 ? "col-start-3" : ""}
                  >
                    <div className="relative aspect-[4/3] bg-brand-gray-light overflow-hidden">
                      <Image
                        src={c.image as string}
                        alt={`${product.name} ${c.name}`}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 30vw, 33vw"
                      />
                    </div>
                    <figcaption className="mt-1.5 text-[11px] sm:text-[12px] tracking-wide text-brand-gray-mid text-center">
                      {c.name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      {/* 모바일 전용 아코디언: 제품 정보 / 배송 및 교환 / 구매 전 확인사항
          (사이즈·세탁 및 관리는 히어로 영역의 SIZE/CARE 아코디언과 중복되어 제외) */}
      <section className="lg:hidden px-4 sm:px-8 py-6 bg-white">
        {product.material && <AccordionItem title="제품 정보">{product.material}</AccordionItem>}
        {/* TODO: 교환 가능 기간·배송비 부담 기준 등 세부 정책 미확정 — 확정 후 보강, 우선 배송·반품 안내 페이지로 연결 */}
        <AccordionItem title="배송 및 교환">
          {SHIPPING_TEXT}
          {"\n\n"}
          자세한 배송·반품 정책은 배송·반품 안내 페이지를 확인해 주세요.
        </AccordionItem>
        <AccordionItem title="구매 전 확인사항">{PRE_PURCHASE_NOTES}</AccordionItem>
      </section>

      {/* You May Also Like */}
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

      {/* Reviews */}
      <section id="product-reviews" className="border-t border-brand-border px-4 sm:px-8 lg:px-16 py-16">
        <ProductReviews reviews={reviews} productId={product.id} />
      </section>
    </div>
  );
}

// 강조 마크업: *...* → 짙은 빨강. 리뉴얼 등 강조 부분에 사용.
function renderEmphasis(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
      <span key={i} className="text-red-800 font-semibold">
        {part.slice(1, -1)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// 상세 본문 최상단 리뉴얼/변경 공지 — 세련된 가운데 정렬 박스(반투명 배경) + 비교 이미지.
function RenewalNotice({
  text,
  images,
}: {
  text: string;
  images?: { src: string; alt: string }[];
}) {
  const nl = text.indexOf("\n");
  const heading = (nl === -1 ? text : text.slice(0, nl)).trim();
  const body = (nl === -1 ? "" : text.slice(nl + 1)).trim();

  return (
    <section className="px-4 sm:px-8 lg:px-16 pt-16 lg:pt-20 pb-4">
      <div className="max-w-2xl mx-auto bg-white/45 border border-white/60 shadow-sm px-6 sm:px-12 py-10 text-center backdrop-blur-[2px]">
        <p className="text-[11px] tracking-[0.4em] text-brand-gray-mid uppercase mb-5">
          Renewal Notice
        </p>
        {heading && (
          <h3 className="text-lg sm:text-xl tracking-wide text-brand-black mb-5">
            {renderEmphasis(heading)}
          </h3>
        )}
        <div className="w-10 h-px bg-brand-border mx-auto mb-6" />
        {body && (
          <p className="text-sm text-brand-gray-mid tracking-wide leading-8 whitespace-pre-line">
            {renderEmphasis(body)}
          </p>
        )}
        {images && images.length > 0 && (
          <div className="mt-8 flex flex-col gap-6">
            {images.map((img) => (
              <figure key={img.src}>
                <div className="relative w-full bg-brand-gray-light">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={1500}
                    height={1000}
                    className="w-full h-auto"
                    sizes="(min-width: 768px) 640px, 100vw"
                  />
                </div>
                {img.alt && (
                  <figcaption className="mt-2.5 text-[12px] sm:text-[13px] text-brand-gray-mid tracking-wide">
                    {img.alt}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
