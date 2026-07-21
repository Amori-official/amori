-- 16-3 서버 주문 생성 기반 구축
--
-- 배경:
--   현재 orders/order_items는 고객이 직접 INSERT할 수 없다(16-2 RLS 정책).
--   클라이언트가 상품명·가격·배송비·최종금액을 그대로 서버에 전달하고 서버가
--   이를 신뢰해 저장하는 구조는, 클라이언트가 개발자도구로 가격을 조작해
--   임의 금액의 주문을 만들 수 있다는 근본적인 문제가 있다(app/actions/orders.ts의
--   기존 createOrder()가 정확히 이 구조다. 참고: 이 함수는 이번 마이그레이션과
--   무관하게 그대로 둔다).
--
-- 목적:
--   클라이언트는 상품 식별자(product_id/variant_id)와 수량, 배송지 정보만
--   전달하고, 실제 가격·상품명·옵션명·이미지·판매가능여부·배송비·최종금액은
--   전부 서버(이 함수)가 DB에서 다시 조회/계산해서 저장한다.
--   서비스는 아직 실제 결제(PortOne/NICE/TossPayments)를 연동하지 않으므로,
--   이 함수는 "결제 전 주문"만 생성한다. 이 함수 호출의 성공은 결제 성공을
--   의미하지 않는다.
--
-- 안전 원칙:
--   1. service_role 키를 추가하지 않는다. 대신 SECURITY DEFINER 함수로
--      RLS를 우회하지 않고도 안전하게 orders/order_items에 INSERT한다
--      (migration 002에 이미 "향후 결제 구현 시 주문 생성은 반드시
--      service_role 키를 쓰는 서버 로직이나 SECURITY DEFINER RPC를 통해서만
--      이루어져야 한다"는 설계 의도가 명시되어 있다).
--   2. search_path를 빈 값으로 고정하고 모든 테이블/함수를 스키마 한정자와
--      함께 참조해 스키마 하이재킹을 차단한다(public.is_admin()과 동일한 패턴).
--   3. 함수 내부에서 auth.uid()로 로그인 사용자를 확인하고, 클라이언트가
--      user_id를 직접 지정할 수 있는 입력값은 아예 받지 않는다.
--   4. 가격/상품명/옵션명/이미지/배송비/주문상태/결제상태 등은 클라이언트
--      입력으로 받지 않고 전부 함수 내부에서 결정한다.
--   5. 이 함수는 orders/order_items 외의 테이블을 변경하지 않는다.
--      payments 테이블은 이 함수에서 전혀 다루지 않는다(결제 연동은 다음 단계).
--   6. PUBLIC 실행 권한을 제거하고 authenticated/anon에만 최소 권한을 부여한다
--      (비회원 주문도 허용해야 하므로 anon도 필요).
--
-- 가격 기준(app/actions/products.ts의 실제 UI 로직과 동일하게 맞춤):
--   실제 판매가 = COALESCE(product_variants.price_override, products.price)
--   products.price가 기본가, variant.price_override가 있으면 그 값으로 대체.
--
-- 배송비 계산(lib/shipping-policy.ts와 동일한 상수/로직을 SQL로 재구현):
--   일반 3,000원 / 제주 6,000원 / 할인 적용 후 상품금액 50,000원 이상 무료.
--   현재 쿠폰 시스템이 없으므로 discount_amount는 항상 0으로 고정한다.
--   remoteArea(제주·도서산간 여부) 판정은 이번 단계에서 "제주"만 서버에서
--   확인 가능한 범위로 판정한다. 우편번호 63000~63644는 우정사업본부가
--   제주특별자치도에 실제로 배정한 5자리 우편번호 범위이며, 임의로 만든
--   목록이 아니다. 제주를 제외한 도서산간(그 외 섬 지역)은 우편번호만으로
--   정확히 판정할 근거가 없어 이번 단계에서는 일반 지역(remoteArea=false)으로
--   처리한다 — 이는 다음 단계 과제로 남긴다(정확한 주소 API/택배사 판정
--   데이터 연동 필요).
--
-- 주문번호: 개인정보를 포함하지 않고, 날짜 + pgcrypto 랜덤 8자리 16진수로
--   생성한다. orders.order_number에는 이미 UNIQUE 인덱스(부분 인덱스,
--   migration 002)가 있으므로 충돌 시 재시도한다.

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
  p_delivery_request text
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
  -- int4 컬럼(orders.subtotal_amount/total_amount 등) 안전 범위 내에서
  -- 넉넉히 여유를 둔 상한. 이 값을 넘으면 실제 int4 오버플로가 나기 전에
  -- 먼저 차단해 raw 오류 대신 안전한 오류 메시지로 변환한다.
  v_max_safe_amount constant numeric := 2000000000;

  v_order_id uuid;
  v_order_number text;
  v_attempt integer := 0;
  v_max_attempts constant integer := 5;
  v_inserted boolean := false;

  v_shipping_address jsonb;
begin
  -- 1) 입력값 기본 검증 -----------------------------------------------------
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

  -- 2) 주문 항목 파싱 + 동일 상품/옵션 합산 ---------------------------------
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
    -- 항목 하나가 객체가 아니거나, 허용된 3개 키(product_id/variant_id/quantity)
    -- 외의 필드(가격/상품명/상태값 등)가 하나라도 섞여 있으면 전체 요청을 차단한다.
    -- 알 수 없는 필드를 조용히 무시하지 않는다.
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

  -- 3) 상품/옵션 재조회, 판매가능 검증, 금액 계산 ---------------------------
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

    -- 가격 데이터 자체의 무결성을 constraint 위반에 기대지 않고 여기서 직접 검증한다.
    -- (products.price에는 NOT NULL만 있고 >=0 제약은 없으므로 NULL/음수 가능성을 배제할 수 없다.)
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

      -- price_override는 nullable이므로 "값이 있는데 음수"인 경우만 별도로 차단하고,
      -- null이면 상품 기본가(products.price)를 그대로 사용한다.
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

    -- integer 곱셈 오버플로를 피하기 위해 numeric으로 먼저 계산하고,
    -- int4 안전범위를 넘으면 실제 오버플로 오류가 나기 전에 안전한 오류로 차단한다.
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

  -- 검증이 끝난 뒤에만 numeric → integer로 확정한다(여기까지 왔으면 안전범위 이내임이 보장됨).
  v_subtotal_amount := v_subtotal_numeric::integer;

  -- 4) 배송비/최종금액 계산 (lib/shipping-policy.ts와 동일 로직) ------------
  if p_postal_code ~ '^\d{5}$' and p_postal_code between '63000' and '63644' then
    v_remote_area := true;
  end if;

  if (v_subtotal_amount - v_discount_amount) >= 50000 then
    v_shipping_fee := 0;
  else
    v_shipping_fee := case when v_remote_area then 6000 else 3000 end;
  end if;

  v_total_amount := v_subtotal_amount - v_discount_amount + v_shipping_fee;
  if v_total_amount::numeric > v_max_safe_amount or v_total_amount < 0 then
    raise exception '주문 금액이 허용 범위를 초과했습니다.';
  end if;

  -- 5) 주문 저장 (주문번호 충돌 시 재시도) -----------------------------------
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
        subtotal_amount, discount_amount, shipping_fee, currency,
        order_status, payment_status, fulfillment_status
      ) values (
        v_user_id, v_order_number, v_total_amount, v_shipping_address,
        p_buyer_name, p_buyer_email, p_buyer_phone,
        p_recipient_name, p_recipient_phone, p_postal_code, p_address_line1, p_address_line2,
        p_delivery_request,
        v_subtotal_amount, v_discount_amount, v_shipping_fee, 'KRW',
        'pending', 'ready', 'unfulfilled'
      )
      returning id into v_order_id;

      v_inserted := true;
    exception
      when unique_violation then
        v_order_id := null;
      when others then
        -- 예상하지 못한 DB 오류(예: 검증을 통과했음에도 남아있는 제약조건 위반)는
        -- 테이블명·제약조건명·SQL 내용을 그대로 클라이언트에 노출하지 않고
        -- 서버 로그(Postgres 로그)에만 남긴 뒤 안전한 일반 오류로 변환한다.
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

  -- 6) 안전한 결과만 반환 ----------------------------------------------------
  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal_amount', v_subtotal_amount,
    'discount_amount', v_discount_amount,
    'shipping_fee', v_shipping_fee,
    'total_amount', v_total_amount,
    'currency', 'KRW',
    'order_status', 'pending',
    'payment_status', 'ready',
    'fulfillment_status', 'unfulfilled'
  );
end;
$$;

revoke all on function public.create_order(jsonb, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_order(jsonb, text, text, text, text, text, text, text, text, text) to authenticated, anon;
