-- ============================================================
-- AMORI DB 초기 마이그레이션
-- ============================================================

-- ── 확장 기능 ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 테이블 생성 ──────────────────────────────────────────────

-- 1. 사용자 프로필 (auth.users와 1:1)
CREATE TABLE public.profiles (
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name          text,
  phone         text,
  marketing_agreed boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- 2. 배송지
CREATE TABLE public.addresses (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label       text,                          -- 예) 집, 회사
  address     text NOT NULL,
  detail      text,
  zipcode     text NOT NULL,
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- 3. 상품
CREATE TABLE public.products (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug           text UNIQUE NOT NULL,
  name           text NOT NULL,
  description    text,
  price          integer NOT NULL,
  stock          integer DEFAULT 0,
  category       text,
  images         text[] DEFAULT '{}',
  is_coming_soon boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

-- 4. 주문
CREATE TABLE public.orders (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status           text DEFAULT 'pending'
    CHECK (status IN ('pending','paid','preparing','shipped','delivered','cancelled')),
  total            integer NOT NULL,
  shipping_address jsonb NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- 5. 주문 항목
CREATE TABLE public.order_items (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id    uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  qty         integer NOT NULL,
  price       integer NOT NULL              -- 구매 시점 단가 스냅샷
);

-- 6. 상품 리뷰
CREATE TABLE public.reviews (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id  uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  rating      integer CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  body        text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)              -- 1인 1리뷰
);

-- 7. 위시리스트
CREATE TABLE public.wishlist (
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

-- 8. 뉴스레터
CREATE TABLE public.newsletters (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  source        text DEFAULT 'website',
  subscribed_at timestamptz DEFAULT now()
);

-- ── RLS 활성화 ───────────────────────────────────────────────
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters   ENABLE ROW LEVEL SECURITY;

-- ── RLS 정책 ─────────────────────────────────────────────────

-- profiles: 본인만 read/write
CREATE POLICY "profiles: 본인 조회"   ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles: 본인 수정"   ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles: 본인 생성"   ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- addresses: 본인만 CRUD
CREATE POLICY "addresses: 본인 전체"  ON public.addresses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- products: 전체 read, admin만 write
CREATE POLICY "products: 전체 조회"   ON public.products FOR SELECT USING (true);
CREATE POLICY "products: admin 쓰기"  ON public.products FOR ALL
  USING ((auth.jwt() ->> 'role') = 'admin');

-- orders: 본인 read + insert
CREATE POLICY "orders: 본인 조회"     ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders: 본인 생성"     ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders: admin 전체"    ON public.orders FOR ALL
  USING ((auth.jwt() ->> 'role') = 'admin');

-- order_items: 본인 주문 항목만
CREATE POLICY "order_items: 본인 조회" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  )
);
CREATE POLICY "order_items: 본인 생성" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  )
);

-- reviews: 전체 read, 본인 write
CREATE POLICY "reviews: 전체 조회"    ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews: 본인 작성"    ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews: 본인 수정"    ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reviews: 본인 삭제"    ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- wishlist: 본인만 CRUD
CREATE POLICY "wishlist: 본인 전체"   ON public.wishlist FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- newsletters: insert only (공개)
CREATE POLICY "newsletters: 구독 허용" ON public.newsletters FOR INSERT WITH CHECK (true);

-- ── 신규 가입 시 프로필 자동 생성 트리거 ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, marketing_agreed)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    COALESCE((NEW.raw_user_meta_data ->> 'marketing_agreed')::boolean, false)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
