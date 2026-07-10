# AMORI

아기를 위한 패브릭 브랜드 쇼핑몰. Next.js 14 App Router 기반.

## 기술 스택

| 분류 | 라이브러리 |
|------|-----------|
| 프레임워크 | Next.js 14.2 (App Router) |
| 스타일링 | Tailwind CSS v4 + postcss |
| UI 컴포넌트 | shadcn/ui v4.8 (@base-ui/react) |
| 애니메이션 | Framer Motion v12 |
| 상태 관리 | Zustand v5 |
| 백엔드 | Supabase (Auth + DB + Storage) |
| 결제 | 토스페이먼츠 SDK v2 |
| 이메일 | Resend + React Email |

## 로컬 개발

```bash
npm install
cp .env.local.example .env.local
# .env.local 환경변수 설정 후:
npm run dev
```

> 환경변수 없이도 mock 데이터로 전체 UI를 개발·확인할 수 있습니다.

## 환경변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

### Supabase

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. `supabase/migrations/001_init.sql`을 SQL Editor에서 실행
3. Authentication > Providers > Kakao 활성화
4. Project Settings > API에서 URL과 anon key 복사

### 토스페이먼츠

1. [developers.tosspayments.com](https://developers.tosspayments.com) 가입 후 테스트 키 발급
2. 테스트: `test_ck_*` / `test_sk_*` → 운영: `live_ck_*` / `live_sk_*`

### Resend (이메일)

1. [resend.com](https://resend.com) 가입 후 도메인 인증
2. API Key 발급 → `RESEND_API_KEY` 설정
3. `emails/welcome.tsx`, `emails/order-confirm.tsx`의 `from` 주소를 인증된 도메인으로 교체

## Vercel 배포

```bash
vercel --prod
```

**필수 환경변수** (Vercel > Settings > Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_TOSS_CLIENT_KEY
TOSS_SECRET_KEY
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL=https://amori.kr
```

## 폴더 구조

```
app/
  (shop)/shop/          # 제품 목록 + 상세 (ISR revalidate)
  account/              # 마이페이지 (주문/프로필/위시리스트/쿠폰)
  checkout/             # 결제 → 완료 → 실패
  api/newsletter/       # 뉴스레터 구독 (POST)
  api/orders/confirm/   # 주문 확인 이메일 (POST)
  auth/callback/        # Kakao OAuth 콜백
components/
  comp-*.tsx            # 전역 레이아웃 컴포넌트
  sections/             # 홈페이지 섹션
  ui/                   # shadcn/ui 기본 컴포넌트
emails/                 # React Email 템플릿 (welcome, order-confirm)
store/                  # Zustand: cart, ui, auth, wishlist
lib/                    # Supabase 클라이언트, 타입 정의, mock 데이터
supabase/migrations/    # DB 마이그레이션 SQL
```

## 커머스 플로우

```
홈 → /shop → /shop/[slug] → 장바구니 드로어 → /checkout → /checkout/complete
                                                              │
                                                    orders + order_items 저장
                                                    주문 확인 이메일 발송 (Resend)
```
