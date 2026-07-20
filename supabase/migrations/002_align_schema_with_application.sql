-- ============================================================
-- AMORI DB 스키마 정합화 (001_init.sql → 애플리케이션 코드 기준 정비)
-- ============================================================
-- 목적: app/actions/*.ts, lib/mock-data.ts, lib/types.ts가 실제로 사용하는
--       필드명/테이블 구조에 001_init.sql을 맞춘다.
--
-- 안전 원칙:
--   · DROP TABLE 없음
--   · 무조건적 컬럼 삭제(DROP COLUMN) 없음 — 이름이 바뀌는 컬럼은 RENAME만 사용
--     (RENAME은 기존 데이터를 그대로 보존한다)
--   · 신규 테이블/컬럼/정책은 전부 IF NOT EXISTS 계열로 재실행 안전하게 작성
--   · 001_init.sql이 아직 적용되지 않은 빈 프로젝트에도, 이미 적용된 프로젝트에도
--     동일하게 안전하게 동작하도록 조건부(DO $$ ... $$) 블록을 사용
--
-- 이 마이그레이션은 로컬 파일로만 준비되며, 이번 단계에서 실제 Supabase
-- 프로젝트에는 적용하지 않는다 (운영자가 검토 후 supabase db push 등으로 적용).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 0. 공통: updated_at 자동 갱신 트리거 함수
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 1. profiles — PK 컬럼명 정정 (user_id → id) + role 추가
-- ────────────────────────────────────────────────────────────
-- 근거: app/actions/account.ts의 updateProfile()이 `.eq("id", user.id)`를 사용하지만
--       001_init.sql은 PK를 `user_id`로 정의함.

CREATE TABLE IF NOT EXISTS public.profiles (
  id                uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name              text,
  phone             text,
  marketing_agreed  boolean DEFAULT false,
  role              text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 001_init.sql로 이미 생성된 테이블(PK=user_id)이 있다면 컬럼명만 안전하게 rename
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN user_id TO id;
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 일반 사용자가 자신의 role을 직접 UPDATE 할 수 없도록 컬럼 단위 권한 제거
-- (RLS와 별개로 Postgres 컬럼 권한 자체를 막아, 정책 우회 여지를 없앤다)
-- anon은 RLS(auth.uid() = id) 자체를 통과할 수 없어 사실상 불필요하지만,
-- 컬럼 권한을 RLS와 독립적으로 완전히 막아두기 위해 방어적으로 함께 제거한다.
REVOKE UPDATE (role) ON public.profiles FROM authenticated;
REVOKE UPDATE (role) ON public.profiles FROM anon;


-- ────────────────────────────────────────────────────────────
-- 2. addresses — 컬럼명 정정 + name/phone 추가
-- ────────────────────────────────────────────────────────────
-- 근거: app/actions/account.ts의 getAddresses/upsertAddress가
--       zip_code, address_detail, name, phone을 사용하지만
--       001_init.sql은 zipcode, detail만 있고 name/phone이 없음.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'zipcode'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE public.addresses RENAME COLUMN zipcode TO zip_code;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'detail'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'address_detail'
  ) THEN
    ALTER TABLE public.addresses RENAME COLUMN detail TO address_detail;
  END IF;
END $$;

ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS address_detail text;


-- ────────────────────────────────────────────────────────────
-- 3. products — 상세페이지/SEO/공개상태 필드 전체 보강
-- ────────────────────────────────────────────────────────────
-- 근거: app/actions/products.ts의 mapRow()가 기대하는 필드 대부분이
--       001_init.sql products 테이블에 없음 (기본 9개 컬럼만 존재).
--       컬러/사이즈/이미지는 별도 정규화 테이블(4~6번)로 분리하고,
--       products에는 텍스트/구조화 콘텐츠만 남긴다.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_ko text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_guide text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS care_instructions text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS detail_intro text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;         -- [{label, body}]
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_story text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color_section_title text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color_description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS certification_number text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS certification_text text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS accordion_items jsonb DEFAULT '[]'::jsonb;  -- [{title, content}]
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS related_product_slugs text[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_alt_subject text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hardware_info text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- SEO / OG
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS og_image_url text;

-- 판매 상태 / 공개 상태 (요청사항 6과 연동 — RLS가 is_published를 기준으로 조회 범위를 나눔)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sale_status_check') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_sale_status_check
      CHECK (sale_status IN ('draft', 'active', 'soldout', 'discontinued'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 001_init.sql에서 이미 만든 products.images(text[])는 그대로 둔다 (신규 detail 이미지는
-- 아래 product_images 테이블로 분리 관리 — images 컬럼 삭제는 하지 않음, 참고용으로 유지).


-- ────────────────────────────────────────────────────────────
-- 4. product_variants — 컬러/사이즈 옵션 (독립적으로 관리자 페이지에서 수정 가능)
-- ────────────────────────────────────────────────────────────
-- GAUZE BIB/SCARF BIB/SPREAD/HAND TOWEL의 컬러 옵션과
-- FLOWER POUCH의 S/L 사이즈(가격 차등)를 모두 이 한 테이블로 표현한다.

CREATE TABLE IF NOT EXISTS public.product_variants (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id     uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  color_name     text,               -- 예: "Cream", "옐로우그린"
  color_hex      text,               -- 예: "#EFE4D4"
  option_name    text,               -- 컬러 외 옵션명 (예: "S", "L")
  sku            text,               -- 재고관리 코드 (아직 미부여 상품 다수 → nullable)
  image_url      text,               -- 옵션 단독 컷 (컬러칩 hover 시 노출되는 이미지)
  price_override integer,            -- 옵션별 가격이 base price와 다를 때만 값 지정 (예: FLOWER POUCH L)
  is_active      boolean NOT NULL DEFAULT true,   -- 판매 가능 여부
  display_order  integer NOT NULL DEFAULT 0,      -- 노출 순서
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_key
  ON public.product_variants (sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx
  ON public.product_variants (product_id, display_order);

DROP TRIGGER IF EXISTS set_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER set_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 5. inventory — 옵션별 재고 (variant와 1:1, 별도 테이블로 분리)
-- ────────────────────────────────────────────────────────────
-- 재고는 변경 빈도가 높고 관리자 페이지에서 독립적으로 자주 수정되므로
-- 옵션 정의(product_variants)와 분리해 둔다. 이번 단계에서는 차감 로직은 연결하지 않는다.

CREATE TABLE IF NOT EXISTS public.inventory (
  variant_id      uuid PRIMARY KEY REFERENCES public.product_variants(id) ON DELETE CASCADE,
  stock_quantity  integer NOT NULL DEFAULT 0,
  updated_at      timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS set_inventory_updated_at ON public.inventory;
CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 6. product_images — 대표/갤러리/상세/스토리/원단/컬러소개 이미지 통합 관리
-- ────────────────────────────────────────────────────────────
-- imageUrl(대표), images[](상단 갤러리), detailImages[](Details 섹션),
-- storyImage, materialDetailImage, colorSectionImage를 role로 구분해 한 테이블에서 관리.
-- layout/width/height는 detail 롤에서만 의미를 가진다 (product-detail-sections.tsx의
-- full/grid/left/right 배치 로직과 대응).

CREATE TABLE IF NOT EXISTS public.product_images (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id     uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant_id     uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,  -- 컬러 단독 컷일 때만 사용
  role           text NOT NULL,
  image_url      text NOT NULL,
  alt_text       text,
  layout         text,             -- 'full' | 'grid' | 'left' | 'right' (role='detail'에서만 사용)
  width          integer,
  height         integer,
  display_order  integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_images_role_check') THEN
    ALTER TABLE public.product_images ADD CONSTRAINT product_images_role_check
      CHECK (role IN ('hero', 'gallery', 'detail', 'story', 'material_detail', 'color_section'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_images_layout_check') THEN
    ALTER TABLE public.product_images ADD CONSTRAINT product_images_layout_check
      CHECK (layout IS NULL OR layout IN ('full', 'grid', 'left', 'right'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS product_images_product_id_idx
  ON public.product_images (product_id, role, display_order);

-- 대표(hero)/스토리/원단확대/컬러소개 이미지는 상품당 정확히 1개만 존재해야 한다.
-- (갤러리·상세 이미지는 여러 장이 정상이라 제외 — role별 부분 unique index)
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_hero_per_product
  ON public.product_images (product_id) WHERE role = 'hero';
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_story_per_product
  ON public.product_images (product_id) WHERE role = 'story';
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_material_detail_per_product
  ON public.product_images (product_id) WHERE role = 'material_detail';
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_color_section_per_product
  ON public.product_images (product_id) WHERE role = 'color_section';


-- ────────────────────────────────────────────────────────────
-- 7. orders — 컬럼명 정정 + 비회원 주문, 결제/할인 금액 분리, order_number 추가
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN total TO total_amount;
  END IF;
END $$;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text;
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;  -- 비회원 주문 지원 (기존 제약이 없었다면 no-op)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal_amount integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_request text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_wrapping boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_message text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 기존 행에 order_number가 비어 있을 수 있으므로, NOT NULL + UNIQUE는
-- 값 채움 이후 별도 마이그레이션에서 강제하는 것을 권장 (여기서는 UNIQUE 인덱스만 준비)
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key
  ON public.orders (order_number) WHERE order_number IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'partially_cancelled'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 8. order_items — 컬럼명 정정 + 상품명/옵션 스냅샷, 옵션 FK, 합계
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'qty'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE public.order_items RENAME COLUMN qty TO quantity;
  END IF;
END $$;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_label text;  -- 주문 당시 옵션명 스냅샷 (예: "Cream", "L")

-- price(주문 당시 단가)는 001_init.sql에 이미 존재하고 app/actions/orders.ts·account.ts가
-- 그대로 사용 중이므로 이름을 바꾸지 않는다.
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price integer;

-- 합계는 price*quantity를 항상 일치시키기 위해 generated column으로 관리
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'line_total'
  ) THEN
    ALTER TABLE public.order_items
      ADD COLUMN line_total integer GENERATED ALWAYS AS (price * quantity) STORED;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 9. payments — 결제사(PG) 승인/취소 이력
-- ────────────────────────────────────────────────────────────
-- 하나의 주문에 여러 결제 시도(실패 후 재시도, 부분취소 등)가 있을 수 있어 1:N으로 설계.

CREATE TABLE IF NOT EXISTS public.payments (
  id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id          uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  provider          text NOT NULL DEFAULT 'toss',
  payment_key       text,
  method            text,             -- 카드 / 계좌이체 / 가상계좌 / 간편결제 등
  requested_amount  integer NOT NULL,
  approved_amount   integer,
  status            text NOT NULL DEFAULT 'ready',
  approved_at       timestamptz,
  cancelled_amount  integer NOT NULL DEFAULT 0,
  failure_code      text,
  failure_message   text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_key_key
  ON public.payments (payment_key) WHERE payment_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments (order_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
      CHECK (status IN ('ready', 'in_progress', 'done', 'cancelled', 'partial_cancelled', 'failed'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 10. reviews — 컬럼명 정정(body → content) + profiles FK 재연결
-- ────────────────────────────────────────────────────────────
-- 근거: app/actions/products.ts의 getProductReviews가 `.select("*, profiles(name)")`로
--       profiles를 embed 조회하는데, reviews.user_id가 auth.users를 직접 참조하고 있어
--       PostgREST가 관계를 못 찾을 수 있다. profiles(id)로 참조를 바꿔 embed가 되게 한다.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'body'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'content'
  ) THEN
    ALTER TABLE public.reviews RENAME COLUMN body TO content;
  END IF;
END $$;

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS content text;

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public' AND tc.table_name = 'reviews'
    AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'user_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.reviews DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.reviews
    ADD CONSTRAINT reviews_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END $$;


-- ────────────────────────────────────────────────────────────
-- 11. 관리자 권한 판별 함수 (profiles.role 기반)
-- ────────────────────────────────────────────────────────────
-- JWT custom claim 방식 대신 profiles.role + SECURITY DEFINER 함수를 선택한 이유는
-- 완료 보고서 6번 항목 참고. RLS 정책에서 재귀 없이 안전하게 사용하기 위해
-- SECURITY DEFINER로 profiles를 직접 조회한다.

-- search_path를 빈 값으로 고정해 스키마 하이재킹(같은 이름의 객체를 public 등에 미리 만들어
-- 이 함수가 엉뚱한 테이블/함수를 참조하게 만드는 공격)을 막는다. 함수 본문의 모든 참조가
-- public.profiles / auth.uid()처럼 이미 스키마로 완전히 한정되어 있어 search_path가 비어 있어도
-- 정상 동작한다.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- ────────────────────────────────────────────────────────────
-- 12. RLS 활성화 (신규 테이블)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments         ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 13. RLS 정책 — products (공개/비공개 상태 반영)
-- ────────────────────────────────────────────────────────────
-- 재실행 안전성: 이번 마이그레이션이 만드는 정책은 "이전 이름"뿐 아니라
-- "이번에 새로 붙이는 이름"도 매번 먼저 DROP IF EXISTS 해서, 002를 두 번 실행해도
-- "policy already exists" 오류가 나지 않도록 전부 자기 이름으로도 drop한다.
DROP POLICY IF EXISTS "products: 전체 조회" ON public.products;
DROP POLICY IF EXISTS "products: 공개 상품 조회" ON public.products;
DROP POLICY IF EXISTS "products: admin 쓰기" ON public.products;

CREATE POLICY "products: 공개 상품 조회" ON public.products FOR SELECT
  USING (is_published = true OR public.is_admin());

CREATE POLICY "products: admin 쓰기" ON public.products FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────
-- 14. RLS 정책 — product_variants / inventory / product_images
-- ────────────────────────────────────────────────────────────
-- 조회: 상위 상품이 공개 상태이거나 관리자일 때만. 쓰기: 관리자 전용.
DROP POLICY IF EXISTS "product_variants: 공개 상품 옵션 조회" ON public.product_variants;
DROP POLICY IF EXISTS "product_variants: admin 쓰기" ON public.product_variants;
DROP POLICY IF EXISTS "inventory: 공개 상품 재고 조회" ON public.inventory;
DROP POLICY IF EXISTS "inventory: admin 쓰기" ON public.inventory;
DROP POLICY IF EXISTS "product_images: 공개 상품 이미지 조회" ON public.product_images;
DROP POLICY IF EXISTS "product_images: admin 쓰기" ON public.product_images;

CREATE POLICY "product_variants: 공개 상품 옵션 조회" ON public.product_variants FOR SELECT
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_published = true
    )
  );
CREATE POLICY "product_variants: admin 쓰기" ON public.product_variants FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "inventory: 공개 상품 재고 조회" ON public.inventory FOR SELECT
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = inventory.variant_id AND p.is_published = true
    )
  );
CREATE POLICY "inventory: admin 쓰기" ON public.inventory FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "product_images: 공개 상품 이미지 조회" ON public.product_images FOR SELECT
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.is_published = true
    )
  );
CREATE POLICY "product_images: admin 쓰기" ON public.product_images FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────
-- 15. RLS 정책 — orders / order_items / payments
-- ────────────────────────────────────────────────────────────
-- 보안 강화 (재검토 반영): payment_status/status/금액 필드는 신뢰할 수 있는 서버
-- 로직만 기록할 수 있어야 한다는 요구사항에 따라, 일반 사용자(authenticated)의
-- orders/order_items 직접 INSERT를 전부 막는다. RLS를 아무리 WITH CHECK로 세밀하게
-- 짜도 "결제 전 최종금액이 실제 상품가와 일치하는지"는 클라이언트 요청 시점에는
-- 검증할 수 없으므로, INSERT 자체를 admin(또는 향후 service_role 기반 서버 로직)
-- 전용으로 제한하는 것이 유일하게 안전한 방법이다.
-- → 향후 결제 구현 시 주문 생성은 반드시 service_role 키를 쓰는 서버 로직이나
--   SECURITY DEFINER RPC를 통해서만 이루어져야 한다 (anon/authenticated 키로
--   클라이언트에서 직접 orders/order_items에 INSERT하는 경로는 이제 존재하지 않는다).
DROP POLICY IF EXISTS "orders: 본인 조회" ON public.orders;
DROP POLICY IF EXISTS "orders: 본인 생성" ON public.orders;
DROP POLICY IF EXISTS "orders: admin 전체" ON public.orders;
DROP POLICY IF EXISTS "orders: admin 생성" ON public.orders;
DROP POLICY IF EXISTS "orders: admin 수정" ON public.orders;

CREATE POLICY "orders: 본인 조회" ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "orders: admin 생성" ON public.orders FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "orders: admin 수정" ON public.orders FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "order_items: 본인 조회" ON public.order_items;
DROP POLICY IF EXISTS "order_items: 본인 생성" ON public.order_items;
DROP POLICY IF EXISTS "order_items: admin 생성" ON public.order_items;

CREATE POLICY "order_items: 본인 조회" ON public.order_items FOR SELECT
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );
CREATE POLICY "order_items: admin 생성" ON public.order_items FOR INSERT
  WITH CHECK (public.is_admin());

-- payments는 애초에 "본인 생성" 정책 자체가 없어(SELECT만 본인, 쓰기는 admin뿐)
-- 일반 사용자는 처음부터 결제 승인 이력을 직접 기록할 수 없었다 — 이 부분은
-- 재검토 결과 이미 안전하게 설계되어 있어 그대로 둔다.
DROP POLICY IF EXISTS "payments: 본인 조회" ON public.payments;
DROP POLICY IF EXISTS "payments: admin 쓰기" ON public.payments;

CREATE POLICY "payments: 본인 조회" ON public.payments FOR SELECT
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()
    )
  );
CREATE POLICY "payments: admin 쓰기" ON public.payments FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────
-- 16. RLS 정책 — addresses (admin 조회 권한 추가, 본인 CRUD는 유지)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "addresses: 본인 전체" ON public.addresses;

CREATE POLICY "addresses: 본인 전체" ON public.addresses FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());


-- ────────────────────────────────────────────────────────────
-- 17. RLS 정책 — profiles (본인 조회/수정 + admin 전체 조회)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: 본인 조회" ON public.profiles;
DROP POLICY IF EXISTS "profiles: 본인 또는 admin 조회" ON public.profiles;
DROP POLICY IF EXISTS "profiles: 본인 수정" ON public.profiles;
DROP POLICY IF EXISTS "profiles: 본인 생성" ON public.profiles;

CREATE POLICY "profiles: 본인 또는 admin 조회" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles: 본인 수정" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles: 본인 생성" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 주의: role 컬럼은 위 1번(REVOKE UPDATE)에서 이미 authenticated/anon 권한이
-- 제거되어 있으므로, 위 UPDATE 정책이 통과되더라도 role 값 자체는 일반 로그인
-- 세션으로 변경할 수 없다. role 변경은 service_role(서버 전용 키)로만 가능하다.
-- profiles 테이블 자체에는 "admin이 남의 프로필을 수정"하는 정책이 없으므로,
-- role 승격은 service_role 직접 UPDATE 외에는 방법이 없다 (요구사항보다 엄격).


-- ============================================================
-- 끝. 이 마이그레이션은 아직 실제 프로젝트에 적용되지 않았습니다.
-- ============================================================
