"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadProductImage } from "@/lib/upload-image";
import {
  updateProduct,
  updateVariant,
  createVariant,
  deleteVariant,
  type AdminProductDetail,
  type ProductUpdateInput,
  type AdminVariantDetail,
  type VariantInput,
  type Feature,
  type AccordionItem,
} from "@/app/actions/admin";

const EMPTY_VARIANT: VariantInput = {
  colorName: "",
  colorHex: "",
  optionName: "",
  sku: "",
  imageUrl: "",
  priceOverride: null,
  isActive: true,
  displayOrder: 0,
};

export default function ProductEditClient({ product }: { product: AdminProductDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 상품 필드 폼
  const [form, setForm] = useState<ProductUpdateInput>({
    slug: product.slug,
    name: product.name,
    nameKo: product.nameKo,
    category: product.category,
    price: product.price,
    tagline: product.tagline,
    shortDescription: product.shortDescription,
    description: product.description,
    detailIntro: product.detailIntro,
    brandStory: product.brandStory,
    material: product.material,
    sizeGuide: product.sizeGuide,
    careInstructions: product.careInstructions,
    hardwareInfo: product.hardwareInfo,
    certificationNumber: product.certificationNumber,
    certificationText: product.certificationText,
    colorSectionTitle: product.colorSectionTitle,
    colorDescription: product.colorDescription,
    imageAltSubject: product.imageAltSubject,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    saleStatus: product.saleStatus,
    isPublished: product.isPublished,
    images: product.images,
    relatedProductSlugs: product.relatedProductSlugs,
    features: product.features,
    accordionItems: product.accordionItems,
  });

  const set = <K extends keyof ProductUpdateInput>(k: K, v: ProductUpdateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saveProduct = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await updateProduct(product.id, form);
      if (res.error) setMsg({ type: "err", text: res.error });
      else {
        setMsg({ type: "ok", text: "저장되었습니다." });
        router.refresh();
      }
    });
  };

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/products" className="text-[13px] text-brand-gray-mid underline hover:text-brand-black">
            ← 상품 목록
          </Link>
          <h2 className="text-[14px] tracking-[0.3em] mt-2">상품 수정</h2>
        </div>
        <Link
          href={`/shop/${product.slug}`}
          target="_blank"
          className="text-[13px] text-brand-gray-mid underline hover:text-brand-black"
        >
          상품 페이지 보기 ↗
        </Link>
      </div>

      {msg && (
        <p
          className={`text-[13px] tracking-wide px-3 py-2 border ${
            msg.type === "ok"
              ? "text-green-600 border-green-200 bg-green-50"
              : "text-red-500 border-red-200 bg-red-50"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* 기본 정보 */}
      <Section title="기본 정보">
        <Row>
          <Field label="상품명 (영문)"><Input value={form.name} onChange={(v) => set("name", v)} /></Field>
          <Field label="상품명 (한글)"><Input value={form.nameKo} onChange={(v) => set("nameKo", v)} /></Field>
        </Row>
        <Row>
          <Field label="카테고리"><Input value={form.category} onChange={(v) => set("category", v)} /></Field>
          <Field label="슬러그 (URL) ⚠ 변경 시 주소 바뀜"><Input value={form.slug} onChange={(v) => set("slug", v)} /></Field>
        </Row>
        <Row>
          <Field label="가격 (원)">
            <Input type="number" value={String(form.price)} onChange={(v) => set("price", Number(v))} />
          </Field>
          <Field label="판매 상태 (sale_status)"><Input value={form.saleStatus} onChange={(v) => set("saleStatus", v)} /></Field>
        </Row>
        <label className="flex items-center gap-2.5 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => set("isPublished", e.target.checked)}
            className="w-4 h-4 accent-brand-black"
          />
          <span className="text-[13px] tracking-wide">게시하기 (체크 시 쇼핑몰에 노출)</span>
        </label>
      </Section>

      {/* 소개 · 카피 */}
      <Section title="소개 · 설명">
        <Field label="태그라인"><Input value={form.tagline} onChange={(v) => set("tagline", v)} /></Field>
        <Field label="짧은 설명 (short_description)"><Input value={form.shortDescription} onChange={(v) => set("shortDescription", v)} /></Field>
        <Field label="설명 (description)"><Textarea value={form.description} onChange={(v) => set("description", v)} /></Field>
        <Field label="상세 인트로 (detail_intro)"><Textarea value={form.detailIntro} onChange={(v) => set("detailIntro", v)} /></Field>
        <Field label="브랜드 스토리"><Textarea value={form.brandStory} onChange={(v) => set("brandStory", v)} /></Field>
      </Section>

      {/* 소재 · 관리 */}
      <Section title="소재 · 관리 정보">
        <Field label="소재 (material)"><Textarea value={form.material} onChange={(v) => set("material", v)} rows={2} /></Field>
        <Field label="사이즈 가이드"><Textarea value={form.sizeGuide} onChange={(v) => set("sizeGuide", v)} rows={2} /></Field>
        <Field label="세탁·관리 방법"><Textarea value={form.careInstructions} onChange={(v) => set("careInstructions", v)} rows={2} /></Field>
        <Field label="부자재 정보 (hardware_info)"><Input value={form.hardwareInfo} onChange={(v) => set("hardwareInfo", v)} /></Field>
      </Section>

      {/* 인증 · 컬러 섹션 */}
      <Section title="인증 · 컬러 섹션">
        <Row>
          <Field label="인증번호"><Input value={form.certificationNumber} onChange={(v) => set("certificationNumber", v)} /></Field>
          <Field label="컬러 섹션 제목"><Input value={form.colorSectionTitle} onChange={(v) => set("colorSectionTitle", v)} /></Field>
        </Row>
        <Field label="인증 문구"><Textarea value={form.certificationText} onChange={(v) => set("certificationText", v)} rows={2} /></Field>
        <Field label="컬러 설명"><Textarea value={form.colorDescription} onChange={(v) => set("colorDescription", v)} rows={2} /></Field>
        <Field label="이미지 alt 주제 (image_alt_subject)"><Input value={form.imageAltSubject} onChange={(v) => set("imageAltSubject", v)} /></Field>
      </Section>

      {/* Features */}
      <Section title="특징 (Features)">
        <RepeatList
          items={form.features}
          onChange={(items) => set("features", items as Feature[])}
          empty={{ label: "", body: "" }}
          render={(item, upd) => (
            <>
              <Input value={(item as Feature).label} onChange={(v) => upd({ ...(item as Feature), label: v })} placeholder="제목" />
              <Textarea value={(item as Feature).body} onChange={(v) => upd({ ...(item as Feature), body: v })} rows={2} placeholder="내용" />
            </>
          )}
        />
      </Section>

      {/* Accordion */}
      <Section title="아코디언 (제품정보/배송 등)">
        <RepeatList
          items={form.accordionItems}
          onChange={(items) => set("accordionItems", items as AccordionItem[])}
          empty={{ title: "", content: "" }}
          render={(item, upd) => (
            <>
              <Input value={(item as AccordionItem).title} onChange={(v) => upd({ ...(item as AccordionItem), title: v })} placeholder="제목" />
              <Textarea value={(item as AccordionItem).content} onChange={(v) => upd({ ...(item as AccordionItem), content: v })} rows={2} placeholder="내용" />
            </>
          )}
        />
      </Section>

      {/* 이미지 · 연관상품 */}
      <Section title="이미지 · 연관 상품">
        <Field label="상품 이미지 (파일 업로드 또는 URL) · 첫 번째가 대표 이미지">
          <ImageManager images={form.images} onChange={(imgs) => set("images", imgs)} />
        </Field>
        <Field label="연관 상품 슬러그 (한 줄에 하나)">
          <Textarea value={form.relatedProductSlugs.join("\n")} onChange={(v) => set("relatedProductSlugs", v.split("\n"))} rows={2} placeholder="hand-towel" />
        </Field>
      </Section>

      {/* SEO */}
      <Section title="SEO">
        <Field label="SEO 제목"><Input value={form.seoTitle} onChange={(v) => set("seoTitle", v)} /></Field>
        <Field label="SEO 설명"><Textarea value={form.seoDescription} onChange={(v) => set("seoDescription", v)} rows={2} /></Field>
      </Section>

      {/* 저장 */}
      <div className="sticky bottom-0 bg-white border-t border-brand-border py-4 flex justify-end">
        <button
          type="button"
          onClick={saveProduct}
          disabled={pending}
          className="px-8 h-12 bg-brand-black text-white text-[14px] tracking-[0.25em] hover:bg-brand-gray-mid transition-colors disabled:opacity-50"
        >
          {pending ? "저장 중..." : "상품 정보 저장"}
        </button>
      </div>

      {/* 옵션(변형) — 개별 저장 */}
      <VariantsSection productId={product.id} variants={product.variants} onDone={() => router.refresh()} />
    </div>
  );
}

// ── 옵션 섹션 (각 옵션 개별 저장/삭제) ──────────────────
function VariantsSection({
  productId,
  variants,
  onDone,
}: {
  productId: string;
  variants: AdminVariantDetail[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [adding, setAdding] = useState<VariantInput>(EMPTY_VARIANT);

  const run = (fn: () => Promise<{ error?: string }>) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setMsg(res.error);
      else onDone();
    });
  };

  return (
    <Section title={`옵션 (${variants.length})`}>
      {msg && <p className="text-[13px] text-red-500 mb-2">{msg}</p>}
      <p className="text-[12px] text-brand-gray-mid mb-3">
        각 옵션은 개별 저장됩니다. 색상·사이즈, 색상칩(hex), 옵션가격(기본가와 다를 때만), 판매여부, 노출순서를 관리하세요.
      </p>

      <div className="space-y-3">
        {variants.map((v) => (
          <VariantRow
            key={v.id}
            initial={v}
            pending={pending}
            onSave={(input) => run(() => updateVariant(v.id, input))}
            onDelete={() => run(() => deleteVariant(v.id))}
          />
        ))}
      </div>

      {/* 새 옵션 추가 */}
      <div className="mt-5 pt-4 border-t border-brand-border">
        <p className="text-[13px] tracking-widest mb-2">새 옵션 추가</p>
        <VariantFields value={adding} onChange={setAdding} />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = await createVariant(productId, adding);
              if (!res.error) setAdding(EMPTY_VARIANT);
              return res;
            })
          }
          className="mt-2 px-5 h-10 border border-brand-black text-[13px] tracking-widest hover:bg-brand-gray-light transition-colors disabled:opacity-50"
        >
          옵션 추가
        </button>
      </div>
    </Section>
  );
}

function VariantRow({
  initial,
  pending,
  onSave,
  onDelete,
}: {
  initial: AdminVariantDetail;
  pending: boolean;
  onSave: (v: VariantInput) => void;
  onDelete: () => void;
}) {
  const [v, setV] = useState<VariantInput>({ ...initial });
  return (
    <div className="border border-brand-border p-3">
      <VariantFields value={v} onChange={setV} />
      <div className="flex gap-2 mt-2">
        <button type="button" disabled={pending} onClick={() => onSave(v)} className="px-4 h-9 bg-brand-black text-white text-[12px] tracking-widest disabled:opacity-50">저장</button>
        <button type="button" disabled={pending} onClick={onDelete} className="px-4 h-9 border border-red-300 text-red-500 text-[12px] tracking-widest hover:bg-red-50 disabled:opacity-50">삭제</button>
      </div>
    </div>
  );
}

function VariantFields({ value, onChange }: { value: VariantInput; onChange: (v: VariantInput) => void }) {
  const u = (patch: Partial<VariantInput>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Mini label="색상명"><Input value={value.colorName} onChange={(x) => u({ colorName: x })} /></Mini>
      <Mini label="색상 hex"><Input value={value.colorHex} onChange={(x) => u({ colorHex: x })} placeholder="#EFE4D4" /></Mini>
      <Mini label="옵션(사이즈)"><Input value={value.optionName} onChange={(x) => u({ optionName: x })} placeholder="S / L" /></Mini>
      <Mini label="노출순서"><Input type="number" value={String(value.displayOrder)} onChange={(x) => u({ displayOrder: Number(x) })} /></Mini>
      <Mini label="옵션가격(선택)"><Input type="number" value={value.priceOverride == null ? "" : String(value.priceOverride)} onChange={(x) => u({ priceOverride: x === "" ? null : Number(x) })} placeholder="기본가와 다를 때만" /></Mini>
      <Mini label="SKU"><Input value={value.sku} onChange={(x) => u({ sku: x })} /></Mini>
      <Mini label="옵션 이미지 (URL 또는 업로드)">
        <div className="flex items-center gap-1.5">
          <Input value={value.imageUrl} onChange={(x) => u({ imageUrl: x })} />
          <UploadButton label="업로드" onUploaded={(urls) => urls[0] && u({ imageUrl: urls[0] })} />
        </div>
      </Mini>
      <Mini label="판매">
        <label className="flex items-center gap-2 h-11">
          <input type="checkbox" checked={value.isActive} onChange={(e) => u({ isActive: e.target.checked })} className="w-4 h-4 accent-brand-black" />
          <span className="text-[13px]">{value.isActive ? "판매중" : "품절"}</span>
        </label>
      </Mini>
    </div>
  );
}

// ── 공용 UI ─────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-brand-border p-5 space-y-3">
      <h3 className="text-[13px] tracking-[0.25em] text-brand-black pb-2 border-b border-brand-border">{title}</h3>
      {children}
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] tracking-wide text-brand-gray-mid">{label}</label>
      {children}
    </div>
  );
}
function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] tracking-wide text-brand-gray-mid">{label}</label>
      {children}
    </div>
  );
}
function Input({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 border border-brand-border px-3 text-sm focus:outline-none focus:border-brand-black"
    />
  );
}
function Textarea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-brand-border p-3 text-sm resize-y focus:outline-none focus:border-brand-black"
    />
  );
}

// 파일 업로드 버튼 (Supabase Storage)
function UploadButton({
  onUploaded,
  label = "이미지 업로드",
  multiple = false,
}: {
  onUploaded: (urls: string[]) => void;
  label?: string;
  multiple?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const res = await uploadProductImage(file);
      if (res.error) {
        setErr(res.error);
        break;
      }
      if (res.url) urls.push(res.url);
    }
    setBusy(false);
    if (ref.current) ref.current.value = "";
    if (urls.length) onUploaded(urls);
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="px-3 h-9 border border-brand-black text-[12px] tracking-widest hover:bg-brand-gray-light transition-colors disabled:opacity-50"
      >
        {busy ? "업로드 중..." : label}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple={multiple}
        onChange={(e) => onFiles(e.target.files)}
        className="hidden"
      />
      {err && <span className="text-[11px] text-red-500">{err}</span>}
    </span>
  );
}

// 상품 이미지 관리 (썸네일 + 업로드 + URL 추가 + 순서/삭제)
function ImageManager({
  images,
  onChange,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [url, setUrl] = useState("");
  const clean = images.filter((x) => x.trim());

  return (
    <div className="space-y-3">
      {clean.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {clean.map((src, i) => (
            <li key={`${src}-${i}`} className="w-24">
              <div className="w-24 h-24 bg-brand-gray-light border border-brand-border overflow-hidden relative">
                {/* 관리용 미리보기 — next/image 대신 img 사용 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`이미지 ${i + 1}`} className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-0 left-0 bg-brand-black text-white text-[10px] px-1.5 py-0.5">대표</span>
                )}
              </div>
              <div className="flex justify-between mt-1">
                {i !== 0 ? (
                  <button
                    type="button"
                    onClick={() => onChange([clean[i], ...clean.filter((_, idx) => idx !== i)])}
                    className="text-[11px] text-brand-gray-mid underline"
                  >
                    대표로
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => onChange(clean.filter((_, idx) => idx !== i))}
                  className="text-[11px] text-red-500 underline"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <UploadButton multiple onUploaded={(urls) => onChange([...clean, ...urls])} />
        <span className="text-[12px] text-brand-gray-mid">또는 URL 직접 추가:</span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/products/example.png"
          className="h-9 border border-brand-border px-2 text-sm w-56 focus:outline-none focus:border-brand-black"
        />
        <button
          type="button"
          onClick={() => {
            if (url.trim()) {
              onChange([...clean, url.trim()]);
              setUrl("");
            }
          }}
          className="px-3 h-9 border border-brand-border text-[12px] tracking-widest hover:bg-brand-gray-light"
        >
          추가
        </button>
      </div>
    </div>
  );
}

// 반복 항목 (features / accordion)
function RepeatList<T>({
  items,
  onChange,
  empty,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  empty: T;
  render: (item: T, update: (v: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-brand-border p-3 space-y-2">
          {render(item, (v) => onChange(items.map((it, idx) => (idx === i ? v : it))))}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-[12px] text-red-500 underline"
          >
            이 항목 삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, empty])}
        className="px-4 h-9 border border-brand-border text-[13px] tracking-widest hover:bg-brand-gray-light transition-colors"
      >
        + 항목 추가
      </button>
    </div>
  );
}
