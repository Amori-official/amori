-- ============================================================
-- 028_points_system.sql — 적립금(포인트) 시스템
-- ============================================================
-- 정책(사용자 확정):
--   · 적립: 리뷰 작성 시 500P (구매 적립 없음)
--   · 사용: 1P = 1원, 1,000P 이상부터 결제에 차감, 유효기간 없음
--   · 잔액은 profiles.points(비정규화) + point_transactions 원장으로 관리
--   · 모든 증감은 SECURITY DEFINER 함수에서 _apply_points()로 원자적 처리
-- 포함:
--   1) profiles.points, point_transactions(+RLS), _apply_points 내부 헬퍼
--   2) orders.points_used 컬럼
--   3) create_review: 리뷰 저장 후 500P 적립
--   4) create_order: 포인트 사용(차감) 추가
--   5) restore_order_points + cancel_my_order: 취소 시 사용 포인트 복원
-- ============================================================

-- 1) 잔액 컬럼 + 원장 테이블 -------------------------------------------------
alter table public.profiles add column if not exists points integer not null default 0;

create table if not exists public.point_transactions (
  id            uuid primary key default extensions.uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  amount        integer not null,               -- 양수=적립, 음수=사용
  balance_after integer not null,
  type          text not null,                  -- earn_review / spend_order / refund_order / admin_adjust
  reason        text,
  order_id      uuid references public.orders(id) on delete set null,
  review_id     uuid references public.reviews(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists point_transactions_user_idx on public.point_transactions(user_id, created_at desc);
create index if not exists point_transactions_order_idx on public.point_transactions(order_id);

alter table public.point_transactions enable row level security;
-- 본인 내역만 조회. 삽입/수정은 SECURITY DEFINER 함수(소유자 권한)로만 → 직접 쓰기 정책 없음.
drop policy if exists "point_transactions: 본인 조회" on public.point_transactions;
create policy "point_transactions: 본인 조회" on public.point_transactions
  for select using (auth.uid() = user_id);

-- 2) 내부 헬퍼: 포인트 증감 + 원장 기록(음수 잔액 방지) -----------------------
-- SECURITY DEFINER 함수들만 호출한다(공개 실행권한 없음).
create or replace function public._apply_points(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reason text,
  p_order_id uuid,
  p_review_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  if p_user_id is null then
    raise exception '포인트 대상 사용자가 없습니다.';
  end if;
  if p_amount = 0 then
    select points into v_new from public.profiles where id = p_user_id;
    return coalesce(v_new, 0);
  end if;

  update public.profiles
    set points = points + p_amount
    where id = p_user_id and (p_amount > 0 or points + p_amount >= 0)
    returning points into v_new;
  if not found then
    raise exception '포인트 처리에 실패했습니다.';
  end if;

  insert into public.point_transactions (user_id, amount, balance_after, type, reason, order_id, review_id)
    values (p_user_id, p_amount, v_new, p_type, p_reason, p_order_id, p_review_id);

  return v_new;
end $$;
revoke all on function public._apply_points(uuid, integer, text, text, uuid, uuid) from public;

-- 3) orders.points_used ------------------------------------------------------
alter table public.orders add column if not exists points_used integer not null default 0;

-- 4) create_review: 리뷰 저장 후 500P 적립 -----------------------------------
create or replace function public.create_review(
  p_product_id uuid,
  p_order_id uuid,
  p_rating int,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_review_id uuid;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception '별점은 1~5 사이로 선택해주세요.';
  end if;
  if coalesce(btrim(p_content), '') = '' then
    raise exception '리뷰 내용을 입력해주세요.';
  end if;

  if not exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.id = p_order_id
      and o.user_id = v_uid
      and o.fulfillment_status = 'delivered'
      and oi.product_id = p_product_id
  ) then
    raise exception '배송 완료된 주문의 상품만 리뷰를 작성할 수 있습니다.';
  end if;

  if exists (
    select 1 from public.reviews where user_id = v_uid and product_id = p_product_id
  ) then
    raise exception '이미 이 상품에 리뷰를 작성하셨습니다.';
  end if;

  insert into public.reviews (user_id, product_id, order_id, rating, content)
  values (v_uid, p_product_id, p_order_id, p_rating, btrim(p_content))
  returning id into v_review_id;

  update public.products p set
    review_count = (select count(*) from public.reviews r where r.product_id = p_product_id),
    rating       = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.product_id = p_product_id)
  where p.id = p_product_id;

  -- 리뷰 적립금 500P 지급(원장 기록 포함).
  perform public._apply_points(v_uid, 500, 'earn_review', '리뷰 작성 적립', p_order_id, v_review_id);

  return v_review_id;
end $$;

grant execute on function public.create_review(uuid, uuid, int, text) to authenticated;

-- 5) 취소 시 사용 포인트 복원 ------------------------------------------------
-- 주문의 points_used 만큼 되돌린다. 본인 또는 관리자만, 이중 복원 방지.
create or replace function public.restore_order_points(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user_id uuid;
  v_points_used integer;
begin
  select user_id, points_used into v_user_id, v_points_used
  from public.orders where id = p_order_id;
  if not found then return; end if;

  if not (public.is_admin() or v_user_id = v_uid) then
    raise exception '권한이 없습니다.';
  end if;

  if v_user_id is null or coalesce(v_points_used, 0) <= 0 then
    return;
  end if;
  -- 이미 복원됐으면 스킵.
  if exists (
    select 1 from public.point_transactions
    where order_id = p_order_id and type = 'refund_order'
  ) then
    return;
  end if;

  perform public._apply_points(v_user_id, v_points_used, 'refund_order', '주문 취소 포인트 복원', p_order_id, null);
end $$;
grant execute on function public.restore_order_points(uuid) to authenticated;

-- cancel_my_order: 기존 로직 + 사용 포인트 복원
create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception '주문을 찾을 수 없습니다.'; end if;
  if v_order.user_id is distinct from v_uid then raise exception '본인 주문만 취소할 수 있습니다.'; end if;
  if v_order.order_status = 'cancelled' then raise exception '이미 취소된 주문입니다.'; end if;
  if v_order.payment_status <> 'paid' then raise exception '취소할 수 없는 결제 상태입니다.'; end if;
  if v_order.fulfillment_status <> 'unfulfilled' then
    raise exception '이미 배송 준비가 시작되어 직접 취소할 수 없습니다. 반품 신청을 이용해 주세요.';
  end if;

  update public.orders
    set order_status = 'cancelled', payment_status = 'refunded'
    where id = p_order_id;

  -- 사용된 쿠폰 복원
  update public.user_coupons
    set status = 'active', used_at = null, used_order_id = null
    where used_order_id = p_order_id;

  -- 사용된 포인트 복원
  if coalesce(v_order.points_used, 0) > 0
     and not exists (select 1 from public.point_transactions where order_id = p_order_id and type = 'refund_order') then
    perform public._apply_points(v_order.user_id, v_order.points_used, 'refund_order', '주문 취소 포인트 복원', p_order_id, null);
  end if;
end $$;

-- 6) create_order: 포인트 사용(차감) 추가 (012 기반, 포인트 로직만 추가) -------
drop function if exists public.create_order(jsonb, text, text, text, text, text, text, text, text, text);
drop function if exists public.create_order(jsonb, text, text, text, text, text, text, text, text, text, uuid);

create or replace function public.create_order(
  p_items jsonb,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text,
  p_recipient_name text,
  p_recipient_phone text,
  p_postal_code text,
  p_address_line1 text,
  p_address_line2 text,
  p_delivery_request text,
  p_user_coupon_id uuid default null,
  p_points_to_use integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();

  v_raw_item jsonb;
  v_raw_count integer;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;

  v_line record;
  v_product record;
  v_variant record;
  v_has_variants boolean;
  v_unit_price integer;
  v_variant_label text;
  v_image_url text;
  v_line_total_numeric numeric;

  v_subtotal_numeric numeric := 0;
  v_subtotal_amount integer := 0;
  v_discount_amount integer := 0;
  v_shipping_fee integer;
  v_total_amount integer;
  v_remote_area boolean := false;
  v_max_safe_amount constant numeric := 2000000000;

  v_coupon record;

  v_points_used integer := 0;
  v_point_balance integer;
  v_max_points integer;

  v_order_id uuid;
  v_order_number text;
  v_attempt integer := 0;
  v_max_attempts constant integer := 5;
  v_inserted boolean := false;

  v_shipping_address jsonb;
begin
  -- 1) 입력값 기본 검증
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception '주문 항목이 올바르지 않습니다.';
  end if;

  v_raw_count := jsonb_array_length(p_items);
  if v_raw_count < 1 then
    raise exception '주문 항목이 비어 있습니다.';
  end if;
  if v_raw_count > 30 then
    raise exception '한 번에 주문할 수 있는 항목 수를 초과했습니다.';
  end if;

  if p_buyer_name is null or length(trim(p_buyer_name)) = 0 or length(p_buyer_name) > 100
     or p_buyer_name ~ '[[:cntrl:]]' then
    raise exception '주문자 정보를 확인해주세요.';
  end if;
  if p_buyer_email is null or length(p_buyer_email) > 255
     or p_buyer_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception '주문자 정보를 확인해주세요.';
  end if;
  if p_buyer_phone is null or length(trim(p_buyer_phone)) = 0 or length(p_buyer_phone) > 30
     or p_buyer_phone ~ '[[:cntrl:]]' then
    raise exception '주문자 정보를 확인해주세요.';
  end if;
  if p_recipient_name is null or length(trim(p_recipient_name)) = 0 or length(p_recipient_name) > 100
     or p_recipient_name ~ '[[:cntrl:]]' then
    raise exception '배송지 정보를 확인해주세요.';
  end if;
  if p_recipient_phone is null or length(trim(p_recipient_phone)) = 0 or length(p_recipient_phone) > 30
     or p_recipient_phone ~ '[[:cntrl:]]' then
    raise exception '배송지 정보를 확인해주세요.';
  end if;
  if p_postal_code is null or length(trim(p_postal_code)) = 0 or length(p_postal_code) > 10
     or p_postal_code ~ '[[:cntrl:]]' then
    raise exception '배송지 정보를 확인해주세요.';
  end if;
  if p_address_line1 is null or length(trim(p_address_line1)) = 0 or length(p_address_line1) > 255
     or p_address_line1 ~ '[[:cntrl:]]' then
    raise exception '배송지 정보를 확인해주세요.';
  end if;
  if p_address_line2 is not null and (length(p_address_line2) > 255 or p_address_line2 ~ '[[:cntrl:]]') then
    raise exception '배송지 정보를 확인해주세요.';
  end if;
  if p_delivery_request is not null and (length(p_delivery_request) > 500 or p_delivery_request ~ '[[:cntrl:]]') then
    raise exception '배송 요청사항을 확인해주세요.';
  end if;

  -- 2) 주문 항목 파싱
  drop table if exists pg_temp._order_lines, pg_temp._order_lines_priced;

  create temporary table _order_lines (
    product_id uuid not null,
    variant_id uuid,
    quantity integer not null
  ) on commit drop;

  create temporary table _order_lines_priced (
    product_id uuid not null,
    variant_id uuid,
    quantity integer not null,
    unit_price integer not null,
    product_name text not null,
    variant_label text,
    image_url text
  ) on commit drop;

  for v_raw_item in select * from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_raw_item) <> 'object' then
      raise exception '주문 항목 정보가 올바르지 않습니다.';
    end if;

    if exists (
      select 1 from jsonb_object_keys(v_raw_item) as key
      where key not in ('product_id', 'variant_id', 'quantity')
    ) then
      raise exception '허용되지 않은 입력값이 포함되어 있습니다.';
    end if;

    begin
      v_product_id := (v_raw_item->>'product_id')::uuid;
    exception when others then
      raise exception '주문 항목 정보가 올바르지 않습니다.';
    end;
    if v_product_id is null then
      raise exception '주문 항목 정보가 올바르지 않습니다.';
    end if;

    if v_raw_item->>'variant_id' is null then
      v_variant_id := null;
    else
      begin
        v_variant_id := (v_raw_item->>'variant_id')::uuid;
      exception when others then
        raise exception '주문 항목 정보가 올바르지 않습니다.';
      end;
    end if;

    begin
      v_quantity := (v_raw_item->>'quantity')::integer;
    exception when others then
      raise exception '주문 수량이 올바르지 않습니다.';
    end;

    if v_quantity is null or v_quantity < 1 or v_quantity > 99 then
      raise exception '주문 수량이 올바르지 않습니다.';
    end if;

    insert into _order_lines (product_id, variant_id, quantity)
    values (v_product_id, v_variant_id, v_quantity);
  end loop;

  if (select count(*) from (select distinct product_id, variant_id from _order_lines) d) > 20 then
    raise exception '한 번에 주문할 수 있는 항목 수를 초과했습니다.';
  end if;

  -- 3) 상품 재조회·검증·금액 계산
  for v_line in
    select product_id, variant_id, sum(quantity)::integer as quantity
    from _order_lines
    group by product_id, variant_id
  loop
    select id, name, price, sale_status, is_published
    into v_product
    from public.products
    where id = v_line.product_id;

    if not found or v_product.sale_status <> 'active' or v_product.is_published is not true then
      raise exception '주문할 수 없는 상품이 포함되어 있습니다.';
    end if;

    if v_product.price is null or v_product.price < 0 then
      raise exception '주문할 수 없는 상품이 포함되어 있습니다.';
    end if;

    select exists(
      select 1 from public.product_variants where product_id = v_line.product_id
    ) into v_has_variants;

    if v_has_variants and v_line.variant_id is null then
      raise exception '옵션을 선택해야 하는 상품이 있습니다.';
    end if;
    if not v_has_variants and v_line.variant_id is not null then
      raise exception '주문할 수 없는 상품이 포함되어 있습니다.';
    end if;

    if v_line.variant_id is not null then
      select id, product_id, color_name, option_name, image_url, price_override, is_active
      into v_variant
      from public.product_variants
      where id = v_line.variant_id;

      if not found or v_variant.product_id <> v_line.product_id or v_variant.is_active is not true then
        raise exception '주문할 수 없는 옵션이 포함되어 있습니다.';
      end if;

      if v_variant.price_override is not null and v_variant.price_override < 0 then
        raise exception '주문할 수 없는 옵션이 포함되어 있습니다.';
      end if;

      v_unit_price := coalesce(v_variant.price_override, v_product.price);
      v_variant_label := coalesce(v_variant.color_name, v_variant.option_name);
      v_image_url := v_variant.image_url;
    else
      v_unit_price := v_product.price;
      v_variant_label := null;
      v_image_url := null;
    end if;

    if v_image_url is null then
      select image_url into v_image_url
      from public.product_images
      where product_id = v_line.product_id and role = 'hero'
      order by display_order
      limit 1;
    end if;

    v_line_total_numeric := v_unit_price::numeric * v_line.quantity::numeric;
    if v_line_total_numeric > v_max_safe_amount then
      raise exception '주문 금액이 허용 범위를 초과했습니다.';
    end if;

    v_subtotal_numeric := v_subtotal_numeric + v_line_total_numeric;
    if v_subtotal_numeric > v_max_safe_amount then
      raise exception '주문 금액이 허용 범위를 초과했습니다.';
    end if;

    insert into _order_lines_priced (product_id, variant_id, quantity, unit_price, product_name, variant_label, image_url)
    values (v_line.product_id, v_line.variant_id, v_line.quantity, v_unit_price, v_product.name, v_variant_label, v_image_url);
  end loop;

  v_subtotal_amount := v_subtotal_numeric::integer;

  -- 3.5) 쿠폰 적용
  if p_user_coupon_id is not null then
    if v_user_id is null then
      raise exception '쿠폰은 로그인 후 사용할 수 있습니다.';
    end if;

    select uc.id as uc_id, uc.status as uc_status, uc.expires_at as uc_expires_at,
           c.discount_type, c.discount_value, c.min_order_amount, c.max_discount_amount, c.is_active
    into v_coupon
    from public.user_coupons uc
    join public.coupons c on c.id = uc.coupon_id
    where uc.id = p_user_coupon_id and uc.user_id = v_user_id;

    if not found then
      raise exception '사용할 수 없는 쿠폰입니다.';
    end if;
    if v_coupon.uc_status <> 'active' then
      raise exception '이미 사용했거나 사용할 수 없는 쿠폰입니다.';
    end if;
    if v_coupon.is_active is not true then
      raise exception '사용할 수 없는 쿠폰입니다.';
    end if;
    if v_coupon.uc_expires_at is not null and v_coupon.uc_expires_at < now() then
      raise exception '유효기간이 지난 쿠폰입니다.';
    end if;
    if v_subtotal_amount < coalesce(v_coupon.min_order_amount, 0) then
      raise exception '최소 주문금액을 충족하지 않아 쿠폰을 사용할 수 없습니다.';
    end if;

    if v_coupon.discount_type = 'percent' then
      v_discount_amount := floor(v_subtotal_amount::numeric * v_coupon.discount_value / 100)::integer;
    else
      v_discount_amount := least(v_coupon.discount_value, v_subtotal_amount);
    end if;

    if v_coupon.max_discount_amount is not null and v_discount_amount > v_coupon.max_discount_amount then
      v_discount_amount := v_coupon.max_discount_amount;
    end if;
    if v_discount_amount < 0 then
      v_discount_amount := 0;
    end if;
    if v_discount_amount > v_subtotal_amount then
      v_discount_amount := v_subtotal_amount;
    end if;
  end if;

  -- 3.6) 포인트 사용 검증 (1P=1원, 1,000P 이상, 잔액 범위)
  if p_points_to_use is not null and p_points_to_use > 0 then
    if v_user_id is null then
      raise exception '포인트는 로그인 후 사용할 수 있습니다.';
    end if;
    if p_points_to_use < 1000 then
      raise exception '포인트는 1,000P 이상부터 사용할 수 있습니다.';
    end if;
    select points into v_point_balance from public.profiles where id = v_user_id;
    if coalesce(v_point_balance, 0) < p_points_to_use then
      raise exception '보유 포인트가 부족합니다.';
    end if;
    v_points_used := p_points_to_use;
  end if;

  -- 4) 배송비/최종금액 계산
  if p_postal_code ~ '^\d{5}$' and p_postal_code between '63000' and '63644' then
    v_remote_area := true;
  end if;

  if (v_subtotal_amount - v_discount_amount) >= 50000 then
    v_shipping_fee := 0;
  else
    v_shipping_fee := case when v_remote_area then 6000 else 3000 end;
  end if;

  -- 포인트는 (상품-쿠폰+배송비)를 넘지 못하게 캡(결제액 0원 하한).
  v_max_points := v_subtotal_amount - v_discount_amount + v_shipping_fee;
  if v_points_used > v_max_points then
    v_points_used := v_max_points;
  end if;
  if v_points_used < 0 then
    v_points_used := 0;
  end if;

  v_total_amount := v_subtotal_amount - v_discount_amount - v_points_used + v_shipping_fee;
  if v_total_amount::numeric > v_max_safe_amount or v_total_amount < 0 then
    raise exception '주문 금액이 허용 범위를 초과했습니다.';
  end if;

  -- 5) 주문 저장
  v_shipping_address := jsonb_build_object(
    'name', p_recipient_name,
    'phone', p_recipient_phone,
    'zipCode', p_postal_code,
    'address', p_address_line1,
    'addressDetail', coalesce(p_address_line2, '')
  );

  while not v_inserted and v_attempt < v_max_attempts loop
    v_attempt := v_attempt + 1;
    v_order_number := 'ORD' || to_char(now(), 'YYMMDD') || '-' ||
      upper(encode(extensions.gen_random_bytes(4), 'hex'));

    begin
      insert into public.orders (
        user_id, order_number, total_amount, shipping_address,
        buyer_name, buyer_email, buyer_phone,
        recipient_name, recipient_phone, postal_code, address_line1, address_line2,
        shipping_request,
        subtotal_amount, discount_amount, points_used, shipping_fee, currency,
        order_status, payment_status, fulfillment_status
      ) values (
        v_user_id, v_order_number, v_total_amount, v_shipping_address,
        p_buyer_name, p_buyer_email, p_buyer_phone,
        p_recipient_name, p_recipient_phone, p_postal_code, p_address_line1, p_address_line2,
        p_delivery_request,
        v_subtotal_amount, v_discount_amount, v_points_used, v_shipping_fee, 'KRW',
        'pending', 'ready', 'unfulfilled'
      )
      returning id into v_order_id;

      v_inserted := true;
    exception
      when unique_violation then
        v_order_id := null;
      when others then
        raise warning 'create_order: orders insert 실패 - %', sqlerrm;
        raise exception '일시적인 오류로 주문 생성에 실패했습니다. 다시 시도해주세요.';
    end;
  end loop;

  if not v_inserted then
    raise exception '일시적인 오류로 주문 생성에 실패했습니다. 다시 시도해주세요.';
  end if;

  begin
    insert into public.order_items (order_id, product_id, variant_id, quantity, price, product_name, variant_label, image_url_snapshot)
    select v_order_id, product_id, variant_id, quantity, unit_price, product_name, variant_label, image_url
    from _order_lines_priced;
  exception when others then
    raise warning 'create_order: order_items insert 실패 - %', sqlerrm;
    raise exception '일시적인 오류로 주문 생성에 실패했습니다. 다시 시도해주세요.';
  end;

  -- 5.5) 쿠폰 사용 처리
  if p_user_coupon_id is not null then
    update public.user_coupons
    set status = 'used', used_at = now(), used_order_id = v_order_id
    where id = p_user_coupon_id and user_id = v_user_id and status = 'active';
    if not found then
      raise exception '쿠폰이 이미 사용되었습니다. 다시 시도해주세요.';
    end if;
  end if;

  -- 5.6) 포인트 차감 + 원장 기록(음수 잔액 방지는 _apply_points가 보장)
  if v_points_used > 0 then
    perform public._apply_points(v_user_id, -v_points_used, 'spend_order', '주문 사용', v_order_id, null);
  end if;

  -- 6) 결과 반환
  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal_amount', v_subtotal_amount,
    'discount_amount', v_discount_amount,
    'points_used', v_points_used,
    'shipping_fee', v_shipping_fee,
    'total_amount', v_total_amount,
    'currency', 'KRW',
    'order_status', 'pending',
    'payment_status', 'ready',
    'fulfillment_status', 'unfulfilled'
  );
end;
$$;

revoke all on function public.create_order(jsonb, text, text, text, text, text, text, text, text, text, uuid, integer) from public;
grant execute on function public.create_order(jsonb, text, text, text, text, text, text, text, text, text, uuid, integer) to authenticated, anon;
