"use client";

import { useState } from "react";

// ─── AccordionItem ───────────────────────────────────────────────────────────

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-brand-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-[12px] tracking-[0.25em] text-left"
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="text-base leading-none text-brand-gray-mid select-none">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="pb-6 text-xs text-brand-gray-mid tracking-wide leading-8 whitespace-pre-line">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── FeatureGrid (핵심 특징) ─────────────────────────────────────────────────

interface Feature {
  label: string;
  body: string;
}

function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pb-6">
      {features.map((f) => (
        <div key={f.label} className="flex flex-col gap-1.5">
          <p className="text-[11px] tracking-[0.2em] text-brand-black font-medium">
            {f.label}
          </p>
          <p className="text-xs text-brand-gray-mid tracking-wide leading-6">
            {f.body}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── CareIcons ───────────────────────────────────────────────────────────────

const CARE_ICONS: { icon: string; label: string }[] = [
  { icon: "〜", label: "30°C 이하" },
  { icon: "✕", label: "건조기 불가" },
  { icon: "☀", label: "그늘 건조" },
  { icon: "◎", label: "약세탁" },
];

function CareIconRow() {
  return (
    <div className="flex gap-6 pb-3">
      {CARE_ICONS.map(({ icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <span className="text-base text-brand-gray-mid">{icon}</span>
          <span className="text-[10px] tracking-wide text-brand-gray-mid">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  material?: string;
  sizeGuide?: string;
  careInstructions?: string;
}

// ─── ProductAccordion ────────────────────────────────────────────────────────

export default function ProductAccordion({ material, sizeGuide, careInstructions }: Props) {
  return (
    <div>
      {material && (
        <AccordionItem title="소재 정보">{material}</AccordionItem>
      )}
      {sizeGuide && (
        <AccordionItem title="사이즈 가이드">{sizeGuide}</AccordionItem>
      )}
      {careInstructions && (
        <AccordionItem title="세탁 및 관리">
          <CareIconRow />
          {careInstructions}
        </AccordionItem>
      )}
      <AccordionItem title="배송 안내">
        {`· 결제 완료 후 2~5영업일 이내 출고됩니다.\n· 50,000원 이상 무료배송 (기본 배송비 3,000원)\n· 제주·도서산간 추가 배송비 6,000원`}
      </AccordionItem>
    </div>
  );
}
