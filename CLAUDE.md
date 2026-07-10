# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Amori — 아기를 위한 패브릭 브랜드 쇼핑몰. Next.js 14 App Router 기반.

## Tech Stack

- **Framework**: Next.js 14 (App Router) — `next.config.mjs` 사용 (`.ts` 불가)
- **Styling**: Tailwind CSS v4 + `@tailwindcss/postcss`
- **UI Components**: shadcn/ui (components in `components/ui/`)
- **Animation**: Framer Motion
- **State**: Zustand (`store/cart.ts`, `store/ui.ts`)
- **Backend**: Supabase (STEP 3에서 연결 예정)
- **Language**: TypeScript

## Commands

```bash
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
```

## Architecture

### 상태 관리
- `store/cart.ts` — 장바구니 (localStorage에 persist). `useCartStore()` 훅으로 접근
- `store/ui.ts` — 전역 UI 상태 (cartOpen, authModalOpen, toastMessage). `useUIStore()` 훅으로 접근
- Toast 표시: `useUIStore().showToast("메시지")` 호출 → 3초 후 자동 해제

### 라우트 구조
- `app/(shop)/shop/` — Route Group. 레이아웃을 공유하되 URL에는 `(shop)`이 포함되지 않음
- `app/layout.tsx` — CompNav(fixed), main, CompFooter, CompCartDrawer, CompToast 포함

### 컴포넌트 네이밍
공통 컴포넌트는 `comp-` 접두사 사용 (`components/comp-*.tsx`). shadcn 컴포넌트는 `components/ui/`에 위치.

### 디자인 토큰
브랜드 색상은 `brand-*` 접두사로 접근:
- `bg-brand-black` (#111111), `bg-brand-gray-light` (#F5F5F5), `text-brand-gray-mid` (#888888), `border-brand-border` (#DDDDDD)
- 자간: `tracking-widest` (0.25em, 메뉴/라벨), `tracking-wide` (0.1em, 본문)
- 폰트: `font-sans` = Apple SD Gothic Neo → Helvetica Neue → sans-serif

### Tailwind v4 주의사항
- 테마 커스텀은 `globals.css`의 `@theme inline` 블록과 `tailwind.config.ts` 양쪽에서 관리
- `darkMode: ["class"]` 배열 형태는 v4에서 타입 오류 발생 — `tailwind.config.ts`에서 `darkMode` 항목 제거
- Dark 모드 variant는 `globals.css`의 `@custom-variant dark` 정의 사용

### Supabase
`lib/supabase.ts`는 현재 stub 상태. STEP 3에서 `@supabase/supabase-js` 설치 후 활성화.
필요 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
