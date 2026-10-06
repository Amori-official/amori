-- ============================================================
-- 035_coupon_sequential_discount.sql — 중복 쿠폰 순차(복리) 할인
-- ============================================================
-- 변경: 여러 쿠폰을 겹쳐 쓸 때, 각 쿠폰을 '원래 금액'이 아니라
--       '앞 쿠폰 적용 후 남은 금액'에 순차 적용한다.
--       예) 5% 적용 → 남은 95%에서 10% 할인 (= 총 14.5% 할인)
--   · 적용 순서: 정률(%) 먼저, 그다음 정액(원). (정률끼리는 순서 무관)
--   · 최소주문 충족 판정은 기존처럼 원래 주문금액 기준.
-- create_order의 쿠폰 계산부만 바꾼다(동일 시그니처 → CREATE OR REPLACE).
-- ============================================================

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
  p_points_to_use integer default 0,
  p_user_coupon_ids uuid[] default null
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
  v_coupon_ids uuid[];
  v_uc_id uuid;
  v_nonstackable_count integer := 0;
  v_one_discount integer;
  v_remaining integer;
  v_matched integer := 0;

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

  -- 3.5) 쿠폰 적용 (여러 장: 중복가능끼리 순차 복리 적용. 정률→정액 순) ------
  if p_user_coupon_ids is not null and array_length(p_user_coupon_ids, 1) >= 1 then
    v_coupon_ids := p_user_coupon_ids;
  elsif p_user_coupon_id is not null then
    v_coupon_ids := array[p_user_coupon_id];
  else
    v_coupon_ids := array[]::uuid[];
  end if;

  if array_length(v_coupon_ids, 1) >= 1 then
    if v_user_id is null then
      raise exception '쿠폰은 로그인 후 사용할 수 있습니다.';
    end if;
    select array_agg(distinct x) into v_coupon_ids from unnest(v_coupon_ids) as x;
    if array_length(v_coupon_ids, 1) > 10 then
      raise exception '한 번에 사용할 수 있는 쿠폰 수를 초과했습니다.';
    end if;

    v_remaining := v_subtotal_amount;  -- 순차 할인을 위한 남은 금액

    for v_coupon in
      select uc.status as uc_status, uc.expires_at as uc_expires_at,
             c.discount_type, c.discount_value, c.min_order_amount, c.max_discount_amount,
             c.is_active, c.stackable, c.ends_at
      from public.user_coupons uc
      join public.coupons c on c.id = uc.coupon_id
      where uc.id = any(v_coupon_ids) and uc.user_id = v_user_id
      order by case when c.discount_type = 'percent' then 0 else 1 end, c.discount_value desc
    loop
      v_matched := v_matched + 1;

      if v_coupon.uc_status <> 'active' then raise exception '이미 사용했거나 사용할 수 없는 쿠폰입니다.'; end if;
      if v_coupon.is_active is not true then raise exception '사용할 수 없는 쿠폰입니다.'; end if;
      if v_coupon.uc_expires_at is not null and v_coupon.uc_expires_at < now() then
        raise exception '유효기간이 지난 쿠폰입니다.';
      end if;
      if v_coupon.ends_at is not null and v_coupon.ends_at < now() then
        raise exception '이벤트가 종료된 쿠폰입니다.';
      end if;
      -- 최소주문 충족은 원래 주문금액 기준
      if v_subtotal_amount < coalesce(v_coupon.min_order_amount, 0) then
        raise exception '최소 주문금액을 충족하지 않아 쿠폰을 사용할 수 없습니다.';
      end if;

      if v_coupon.stackable is not true then
        v_nonstackable_count := v_nonstackable_count + 1;
      end if;

      -- 순차(복리) 적용: 남은 금액 기준으로 계산
      if v_coupon.discount_type = 'percent' then
        v_one_discount := floor(v_remaining::numeric * v_coupon.discount_value / 100)::integer;
      else
        v_one_discount := least(v_coupon.discount_value, v_remaining);
      end if;
      if v_coupon.max_discount_amount is not null and v_one_discount > v_coupon.max_discount_amount then
        v_one_discount := v_coupon.max_discount_amount;
      end if;
      if v_one_discount < 0 then v_one_discount := 0; end if;
      if v_one_discount > v_remaining then v_one_discount := v_remaining; end if;

      v_discount_amount := v_discount_amount + v_one_discount;
      v_remaining := v_remaining - v_one_discount;
    end loop;

    -- 요청한 쿠폰이 모두 조회돼야 함(소유/존재 확인)
    if v_matched <> array_length(v_coupon_ids, 1) then
      raise exception '사용할 수 없는 쿠폰이 포함되어 있습니다.';
    end if;

    -- 단독(중복불가) 쿠폰은 다른 쿠폰과 함께 사용 불가
    if array_length(v_coupon_ids, 1) > 1 and v_nonstackable_count >= 1 then
      raise exception '단독 사용 쿠폰은 다른 쿠폰과 함께 사용할 수 없습니다.';
    end if;

    if v_discount_amount > v_subtotal_amount then
      v_discount_amount := v_subtotal_amount;
    end if;
  end if;

  -- 3.6) 포인트 사용 검증
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

  -- 5.5) 쿠폰 사용 처리 (여러 장, active일 때만)
  if array_length(v_coupon_ids, 1) >= 1 then
    foreach v_uc_id in array v_coupon_ids loop
      update public.user_coupons
      set status = 'used', used_at = now(), used_order_id = v_order_id
      where id = v_uc_id and user_id = v_user_id and status = 'active';
      if not found then
        raise exception '쿠폰이 이미 사용되었습니다. 다시 시도해주세요.';
      end if;
    end loop;
  end if;

  -- 5.6) 포인트 차감 + 원장 기록
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

grant execute on function public.create_order(jsonb, text, text, text, text, text, text, text, text, text, uuid, integer, uuid[]) to authenticated, anon;
