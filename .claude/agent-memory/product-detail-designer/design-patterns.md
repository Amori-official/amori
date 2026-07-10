---
name: design-patterns
description: UI component patterns established for Amori product detail pages
metadata:
  type: feedback
---

## Accordion Component Pattern (`product-accordion.tsx`)

Structure (top to bottom):
1. **Brand story block** — always visible (not collapsible), `text-xs text-brand-gray-mid tracking-wide leading-8`, separated by `border-b border-brand-border`
2. **Feature grid accordion** — `defaultOpen={true}`, 2-col grid (`sm:grid-cols-2`), each feature: label in `text-[11px] tracking-[0.2em] text-brand-black font-medium` + body in `text-xs text-brand-gray-mid`
3. **Material info accordion** — `whitespace-pre-line` for multi-paragraph text
4. **Size guide accordion** — `whitespace-pre-line`
5. **Care instructions accordion** — leads with `CareIconRow` (icon + label pairs), then text
6. **Shipping info accordion** — hardcoded, always present

AccordionItem uses `border-b border-brand-border`, button `text-[12px] tracking-[0.25em]`, open indicator "−"/"+" in `text-base text-brand-gray-mid`.

**Why**: The brand story block is deliberately non-collapsible — it's the emotional hook and should always be read. Feature grid defaults open to surface key selling points immediately without requiring user interaction.

**How to apply**: Use this same structure for all product detail accordions. Pass `features` and `brandStory` through from mock-data via `page.tsx` → `ProductAccordion`.

## Page Layout Pattern (`[slug]/page.tsx`)

- Breadcrumb: `px-4 sm:px-8 lg:px-16 py-4 text-[12px] tracking-widest`
- Gallery + info: 2-col grid `lg:grid-cols-2 gap-8 pb-16`
- Accordion section: `px-4 sm:px-8 lg:px-16 py-8 max-w-2xl` — NO `border-t` on the section wrapper (border is now inside accordion component)
- Reviews: `px-4 sm:px-8 lg:px-16 py-12 border-t border-brand-border`
