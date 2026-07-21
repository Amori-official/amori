-- ============================================================
-- AMORI: 주문·결제 DB 기반 및 보안 정책 구축 (16-2)
-- ============================================================
-- 배경:
--   구매 퍼널 분석(직전 단계)에서 실측으로 확인된 사실:
--     · orders/order_items/payments는 이미 존재하며 RLS가 켜져 있다.
--     · orders/order_items/payments에 대한 일반 사용자(authenticated)
--       INSERT/UPDATE 정책은 이미 없다 — 002_align_schema_with_application.sql이
--       "가격·금액은 서버만 검증할 수 있어야 한다"는 이유로 의도적으로
--       admin(is_admin())만 쓰기 가능하게 설계했고, 그 주석에 "향후 주문 생성은
--       service_role 서버 로직이나 SECURITY DEFINER RPC로만 가능해야 한다"고
--       명시돼 있다. 이번 단계는 그 설계를 그대로 계승한다.
--     · orders/order_items/payments 세 테이블 모두 현재 행이 0건이다(실측 확인,
--       2026-07-21 기준). 따라서 이 마이그레이션의 모든 CHECK 제약은 기존 데이터
--       충돌 위험 없이 즉시 적용해도 안전하다.
--     · payments.payment_key, orders.order_number에는 이미 부분 UNIQUE 인덱스가
--       있다(payments_payment_key_key, orders_order_number_key) — 중복 결제
--       방지 요구사항은 이미 충족되어 있으므로 이번 마이그레이션에서 다시
--       추가하지 않는다.
--     · products.sale_status / is_published, product_variants.is_active가
--       이미 "판매 가능 여부"를 표현하고 있으므로, 재고 관련 신규 컬럼은
--       추가하지 않는다(요청사항: stock_quantity 차감·reserved_quantity 없음).
--
-- 이번 마이그레이션이 하는 일 (전부 추가적 변경, 기존 컬럼 삭제·rename 없음):
--   1) orders — 주문자/수령인 스냅샷 컬럼, order_status/fulfillment_status
--      분리, 통화, 결제/취소 시각 추가 + 금액·상태 CHECK 제약
--   2) order_items — 상품 이미지 스냅샷 컬럼 + 수량/단가 CHECK 제약 +
--      order_id 조회 성능 인덱스(RLS 서브쿼리가 매번 사용)
--   3) payments — 결제 금액 음수 방지 CHECK 제약(구조만, 실제 결제 없음)
--   4) RLS 정책 — 이번 마이그레이션에서 정책을 하나도 만들거나 바꾸지 않는다.
--      기존 정책이 이미 "고객은 자기 주문만 조회, INSERT는 admin/서버 전용,
--      anon은 아무것도 조회 불가"를 실측으로 충족하고 있음을 문서로 남긴다
--      (근거는 파일 하단 검증 섹션 참고).
--
-- 안전 원칙: DROP TABLE 없음. 컬럼 삭제·rename 없음. 전부 IF NOT EXISTS /
--   IF NOT EXISTS(pg_constraint) 로 재실행 안전하게 작성.
--
-- 이번 마이그레이션은 amori-staging에만 적용한다. Production과 기존 중지된
-- amori 프로젝트에는 적용하지 않는다.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. orders — 주문자/수령인 스냅샷 컬럼
-- ────────────────────────────────────────────────────────────
-- profile.name/phone은 나중에 바뀔 수 있으므로, 주문 시점 값을 별도로
-- 스냅샷해 과거 주문의 표시가 바뀌지 않게 한다. 회원(user_id 有)·비회원
-- (guest_name/email/phone 有) 모두 이 스냅샷 컬럼을 공통으로 사용한다.
-- shipping_address(jsonb)는 그대로 두고 삭제하지 않는다 — 이번 컬럼과
-- 일부 중복되더라도 기존 코드가 계속 읽을 수 있어야 하므로 데이터 이관은
-- 하지 않는다. 신규 주문 생성 로직(다음 단계)이 새 컬럼을 채우기 시작한다.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recipient_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address_line1 text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address_line2 text;

-- shipping_request(text)가 이미 002에서 "배송 요청사항"으로 존재한다.
-- delivery_request라는 이름으로 중복 컬럼을 새로 만들지 않고 기존 컬럼을 그대로 쓴다.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'KRW';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;


-- ────────────────────────────────────────────────────────────
-- 2. orders — order_status / fulfillment_status 분리 (기존 status 컬럼은 그대로 유지)
-- ────────────────────────────────────────────────────────────
-- 결정: 기존 `status` 컬럼(001_init.sql, CHECK IN pending/paid/preparing/
-- shipped/delivered/cancelled)을 rename하거나 삭제하지 않는다.
-- 이유: app/actions/account.ts의 getOrders(), app/account/orders/orders-client.tsx의
-- STATUS_MAP, lib/types.ts의 Order.status 세 곳이 지금도 이 컬럼을 그대로
-- 읽고 있고, 이번 단계의 허용 변경 범위(migration/배송비 모듈/테스트)에는
-- 이 파일들이 포함되지 않는다. 기존 컬럼을 건드리면 이번 단계 밖의 코드를
-- 깨뜨리게 되므로, 대신 새 컬럼 order_status/fulfillment_status를 별도로
-- 추가해 두 체계가 당분간 공존하게 한다. 다음 단계에서 서버 주문 생성/조회
-- 로직이 새 컬럼을 채우기 시작하고, 화면 코드가 새 컬럼을 읽도록 옮겨간
-- 뒤에 기존 status 컬럼을 정리하는 별도 마이그레이션을 진행하는 것을 권장한다.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'unfulfilled';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check
      CHECK (order_status IN ('pending', 'confirmed', 'cancelled', 'completed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_check
      CHECK (fulfillment_status IN ('unfulfilled', 'preparing', 'shipped', 'delivered', 'returned'));
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 3. orders — payment_status 값 목록 확장
-- ────────────────────────────────────────────────────────────
-- 기존 orders_payment_status_check(002)는 ('pending','paid','failed','cancelled',
-- 'partially_cancelled')였다. 확정된 상태값 목록(ready/pending/paid/failed/
-- cancelled/partially_refunded/refunded)에 맞춰 교체한다.
-- 실측 확인: orders 테이블 행 수 0건(2026-07-21) — 기존 값과 충돌할 데이터가
-- 없으므로 즉시 교체해도 안전하다. 행이 있었다면 먼저 실제 값을 확인하고
-- 호환되지 않는 값을 정리한 뒤에만 CHECK를 바꿔야 한다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check') THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_payment_status_check;
  END IF;
  ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('ready', 'pending', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded'));
END $$;


-- ────────────────────────────────────────────────────────────
-- 4. orders — 금액 무결성 CHECK
-- ────────────────────────────────────────────────────────────
-- subtotal_amount는 nullable로 남아 있으므로(기존 주문 호환), 값이 있을 때만
-- "총액 = 소계 - 할인 + 배송비" 등식을 강제한다. NULL이면 CHECK는 통과한다
-- (Postgres CHECK는 NULL 평가 시 위반으로 보지 않음) — 값이 채워진 이후부터는
-- 정확히 검증된다. INSERT/UPDATE 자체가 admin 또는 향후 서버 RPC로만
-- 가능하므로, 이 제약은 "서버 계산 로직이 실수로 값을 어긋나게 넣는 것"을
-- 막는 최후 방어선 역할을 한다.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_subtotal_amount_nonneg') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_subtotal_amount_nonneg CHECK (subtotal_amount IS NULL OR subtotal_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_amount_nonneg') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_discount_amount_nonneg CHECK (discount_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_shipping_fee_nonneg') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_fee_nonneg CHECK (shipping_fee >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_amount_nonneg') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_total_amount_nonneg CHECK (total_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_amount_consistent') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_total_amount_consistent
      CHECK (subtotal_amount IS NULL OR total_amount = subtotal_amount - discount_amount + shipping_fee);
  END IF;
END $$;

-- 참고: order_number UNIQUE는 이미 orders_order_number_key(002, 부분 UNIQUE
-- 인덱스, WHERE order_number IS NOT NULL)로 존재한다 — 다시 추가하지 않는다.


-- ────────────────────────────────────────────────────────────
-- 5. order_items — 이미지 스냅샷 컬럼 + 수량/단가 CHECK + 인덱스
-- ────────────────────────────────────────────────────────────
-- product_name/variant_label/price/line_total은 002에서 이미 스냅샷 구조로
-- 설계돼 있어 그대로 재사용한다(요청한 product_name_snapshot·
-- option_name_snapshot·unit_price는 각각 기존 product_name/variant_label/price와
-- 같은 목적이므로 중복 컬럼을 만들지 않는다).
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS image_url_snapshot text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_positive') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_price_nonneg') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_price_nonneg CHECK (price >= 0);
  END IF;
END $$;

-- order_id는 FK지만 Postgres가 FK 컬럼에 자동으로 인덱스를 만들어주지 않는다.
-- RLS의 "본인 조회" 정책(order_items/payments 모두)이 매 조회마다
-- `orders.id = order_items.order_id` 상관 서브쿼리를 실행하므로 인덱스가
-- 성능에 직접 영향을 준다.
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);

-- product_id/variant_id는 001/002에서 이미 ON DELETE SET NULL로 설정돼 있어
-- 상품·옵션이 나중에 삭제되어도 주문 내역의 스냅샷(product_name/variant_label/
-- price/image_url_snapshot)은 그대로 남는다 — 이번 마이그레이션에서 FK
-- 정책을 바꾸지 않는다.


-- ────────────────────────────────────────────────────────────
-- 6. payments — 결제 금액 음수 방지
-- ────────────────────────────────────────────────────────────
-- payment_key UNIQUE는 이미 payments_payment_key_key(002, 부분 UNIQUE 인덱스,
-- WHERE payment_key IS NOT NULL)로 존재한다 — 중복 승인 방지 요구사항은
-- 이미 충족되어 있으므로 다시 추가하지 않는다. provider 컬럼은 자유 텍스트라
-- 'portone_nice'/'nice_direct' 값을 저장하는 데 스키마 변경이 필요 없다.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_requested_amount_nonneg') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_requested_amount_nonneg CHECK (requested_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_approved_amount_nonneg') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_approved_amount_nonneg CHECK (approved_amount IS NULL OR approved_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_cancelled_amount_nonneg') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_cancelled_amount_nonneg CHECK (cancelled_amount >= 0);
  END IF;
END $$;


-- ============================================================
-- 7. RLS — 이번 마이그레이션은 정책을 만들거나 바꾸지 않는다 (검증 결과만 기록)
-- ============================================================
-- 002_align_schema_with_application.sql이 만든 아래 정책들을 실측(pg_policies
-- 원문 조회)으로 재확인했고, 요청받은 보안 원칙을 이미 전부 충족한다:
--
--   · orders: 본인 조회        (SELECT, auth.uid()=user_id OR is_admin())
--       → 회원은 자기 주문만, anon/다른 회원은 조회 불가. 비회원(guest) 주문은
--         user_id가 NULL이라 auth.uid()=NULL 비교가 항상 거짓이 되어 어떤
--         로그인 세션으로도 SELECT되지 않는다 — "주문번호만 알아도 조회 불가"
--         요구사항도 이 정책만으로 충족된다(비회원 주문 조회 기능 자체를
--         이번 단계에서 만들지 않으므로 추가 정책도 없다).
--   · orders: admin 생성        (INSERT, WITH CHECK is_admin())
--   · orders: admin 수정        (UPDATE, USING/CHECK is_admin())
--       → 일반 로그인 사용자는 orders에 INSERT/UPDATE 자체가 불가능하다.
--         브라우저에서 주문금액을 임의로 지정해 주문을 만들 수 없고, 고객이
--         결제·배송 상태를 직접 바꿀 수도 없다.
--   · order_items: 본인 조회 / admin 생성  → orders와 동일한 논리로 안전.
--   · payments: 본인 조회 (SELECT, 본인 주문에 속한 결제만)
--   · payments: admin 쓰기 (ALL, is_admin())
--       → 고객은 payments를 직접 INSERT/UPDATE할 수 없다.
--   · addresses: 본인 전체 (ALL, auth.uid()=user_id OR is_admin())
--       → 본인 주소만 관리 가능.
--
-- 이번 단계에서 "회원이 자신의 주문을 직접 생성"할 수 있는 INSERT 정책을
-- 새로 추가하지 않았다. 이유(요청받은 비교 결과):
--   (A) RLS INSERT 정책으로 직접 허용 — WITH CHECK로 아무리 정교하게 조건을
--       걸어도 "지금 이 순간 실제 상품가 기준으로 계산한 총액과 일치하는가"는
--       RLS 조건식(단순 비교/서브쿼리) 안에서 안전하게 재계산할 수 없다.
--       클라이언트가 보낸 총액이 그 시점 실제가와 일치하는지 검증하려면
--       사실상 서버 로직과 동등한 계산이 필요한데, 이를 RLS 정책 안에 넣는
--       것은 신뢰 경계를 흐리고 유지보수도 어렵다.
--   (B) SECURITY DEFINER RPC 함수 — 클라이언트는 상품/옵션/수량만 전달하고,
--       함수 내부에서 products/product_variants 최신가를 재조회하고
--       lib/shipping-policy.ts와 동일한 배송비 로직으로 서버가 직접
--       금액을 계산해 orders/order_items를 생성한다. service_role 키를
--       코드에 추가하지 않고도(이번 단계 제약 준수) is_admin()과 동등한
--       수준으로 안전하게 쓰기 경로를 열 수 있다.
--   → (B)를 채택한다. service_role을 쓰지 않는 이번 제약 안에서 유일하게
--     안전한 방식이며, 002가 이미 이 방향으로 설계돼 있었다.
--
-- 이번 마이그레이션은 스키마·제약조건 기반까지만 구축한다. 실제 주문 생성
-- SECURITY DEFINER 함수(가격 재조회, 배송비 서버 계산, 판매 상태 재검증,
-- allowlist 처리 등)는 다음 단계(16-3)에서 별도로 설계·구현한다 — 이번
-- 단계에서 미완성 상태로 만들지 않는다.


-- ============================================================
-- 끝. 이 마이그레이션은 amori-staging에만 적용되어야 한다.
-- ============================================================
