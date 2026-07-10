---
name: project-context
description: Amori brand overview, tech stack, current product catalog, and key file locations
metadata:
  type: project
---

**Brand**: Amori (아모리) — premium Korean baby fabric mall. Target: Korean mothers buying for infants/toddlers. Tone: quiet, warm, minimal, trustworthy.

**Stack**: Next.js 14 App Router, TypeScript, Tailwind CSS v4 (`@theme` block in globals.css), shadcn/ui, Framer Motion, Zustand.

**Key files**:
- Product type: `lib/types.ts`
- Mock data: `lib/mock-data.ts`
- Server actions: `app/actions/products.ts` — falls back to mockProducts when Supabase not configured
- Product detail page: `app/(shop)/shop/[slug]/page.tsx`
- Accordion: `app/(shop)/shop/[slug]/product-accordion.tsx`
- Product info panel: `components/comp-product-info.tsx`

**Current product catalog** (as of 2026-06-25):
- `gauze-bib` — GAUZE BIB (거즈 빕), ₩16,000, 4 colors, category: small-things
- `gauze-scarf-bib` — GAUZE SCARF BIB (거즈 스카프 빕), ₩13,000, 4 colors, category: small-things
- `spread` — SPREAD (스프레드), ₩18,000, 2 colors (크림/오트), category: fabric-goods

**Product type extended fields** (added 2026-06-25):
- `features?: { label: string; body: string }[]` — feature highlight items for FeatureGrid
- `brandStory?: string` — short brand narrative shown above accordion

**Why**: Supabase not yet connected (STEP 3). All product data served from mockProducts.
