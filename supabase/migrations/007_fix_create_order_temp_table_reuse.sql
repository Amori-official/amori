-- 16-3 통합 테스트에서 발견된 문제 수정: create_order() 임시 테이블 재사용 오류
--
-- 문제:
--   006_create_order_rpc.sql의 create_order()는 내부에서 다음과 같이
--   ON COMMIT DROP 임시 테이블을 사용한다.
--     create temporary table _order_lines (...) on commit drop;
--     create temporary table _order_lines_priced (...) on commit drop;
--   ON COMMIT DROP은 "실제 트랜잭션이 끝날 때" 테이블을 제거한다. 그런데
--   PostgREST를 통한 일반적인 단일 RPC 호출(요청마다 별도 트랜잭션)에서는
--   문제가 없지만, 같은 트랜잭션 안에서 create_order()를 두 번 이상
--   호출하면(예: 배치 처리, 재시도 로직, 이번 16-3 통합 테스트처럼 여러
--   호출을 한 트랜잭션에 묶어 실행하는 경우) 첫 호출이 성공한 뒤에도
--   해당 트랜잭션이 아직 끝나지 않았으므로 임시 테이블이 남아있고,
--   두 번째 호출의 "create temporary table _order_lines (...)"가
--   "relation \"_order_lines\" already exists" 오류로 실패한다.
--   16-3 실제 통합 테스트에서 이 문제로 다수 테스트가 잘못된 오류로
--   실패하는 것을 확인했다(테스트 스크립트에서는 사전 DROP으로 우회해
--   나머지 테스트를 정상 진행했으며, 이 migration이 실제 함수를 고친다).
--
-- 원인 재확인:
--   - 이미 성공한 호출 뒤에 남는 케이스: ON COMMIT DROP은 "함수 호출 종료"가
--     아니라 "트랜잭션 종료" 시점에 동작하므로, 함수가 정상적으로 return한
--     뒤에도 같은 트랜잭션이 계속되면 임시 테이블이 살아있다.
--   - 오류 발생 후 재호출하는 케이스: 호출자가 이전 실패를 SAVEPOINT(예:
--     PL/pgSQL의 BEGIN ... EXCEPTION ... END 블록)로 감싸 잡아냈다면, 그
--     SAVEPOINT 롤백이 임시 테이블 생성까지 함께 되돌리므로 이 경우는
--     이미 안전하다. 문제는 오직 "이전 호출이 성공했거나, 호출자가
--     SAVEPOINT 없이 예외를 삼킨 뒤 같은 트랜잭션을 계속 사용하는" 경우에
--     한정된다. 아래 수정은 이런 구분 없이 모든 경우를 동일하게, 그리고
--     안전하게 처리한다.
--
-- 수정 방식 비교:
--   (A) 함수 시작 시 DROP TABLE IF EXISTS 후 재생성 — 채택
--       가장 단순하고 검증된 방식. "왜 이미 존재하는지"를 따지지 않고
--       호출 시작 시점에 무조건 빈 상태로 만든 뒤 사용하므로, 이전 호출이
--       성공했든 실패했든, 몇 번을 반복 호출하든 항상 동일하게 안전하다.
--       가격/판매상태 검증, 배송비, 주문번호 로직은 전혀 건드리지 않는다.
--   (B) 세션/호출마다 고유한 임시 테이블 이름 사용 — 기각
--       충돌은 피하지만 테이블명을 동적으로 만들어야 해서 CREATE/INSERT/
--       SELECT 전체를 동적 SQL(EXECUTE format(...))로 바꿔야 한다. 이미
--       검증된 가격·검증 로직을 동적 SQL로 재작성하는 것은 이번 수정
--       범위를 벗어나는 큰 변경이고, 동적 SQL은 실수로 인한 SQL 인젝션
--       위험을 늘리므로 이 함수의 보안 원칙(동적 SQL 금지)에도 어긋난다.
--   (C) 임시 테이블 대신 CTE·배열·JSON만으로 처리 — 기각
--       가장 "정석적인" 구조이긴 하나, 현재 함수는 각 라인마다 상품/옵션을
--       조회하며 즉시 구체적인 오류를 raise하는 절차적 루프로 짜여 있다.
--       이를 순수 집합 연산(CTE)으로 바꾸려면 검증 로직 자체를 다시
--       설계해야 하고, 이는 사용자가 명시적으로 금지한 "가격/판매상태/
--       개인정보 검증/배송비 로직 변경"에 해당할 위험이 크다.
--
--   따라서 (A)를 선택한다: 두 임시 테이블 생성 직전에
--   DROP TABLE IF EXISTS pg_temp._order_lines, pg_temp._order_lines_priced;
--   를 추가한다. pg_temp를 명시적으로 지정해 search_path=''에서도
--   스키마 하이재킹 우려 없이 세션의 임시 스키마만을 정확히 가리키게 한다.
--   ON COMMIT DROP은 그대로 유지한다 — 일반적인 단일 호출 트랜잭션에서는
--   기존과 동일하게 안전한 정리 수단으로 계속 동작한다.
--
-- 이 migration이 변경하는 것은 오직 "임시 테이블을 만들기 직전에 먼저
-- 비운다"는 두 줄뿐이다. 입력값 검증, 가격 조회(COALESCE(price_override,
-- price)), 판매가능 여부 검증, 배송비 계산(3,000/6,000/50,000, 제주
-- 우편번호 판정), 주문번호 생성, 트랜잭션 처리, 반환값, RLS, 권한 부여는
-- 006과 완전히 동일하다. 006_create_order_rpc.sql 파일 자체는 수정하지
-- 않는다 — 이 파일은 CREATE OR REPLACE FUNCTION으로 같은 함수를
-- 교체하는 새 migration이다.
--
-- 원자성: 이 스크립트 전체(함수 교체 + 권한 재설정)는 Supabase
-- SQL 실행기에서 하나의 트랜잭션으로 처리된다. 중간에 오류가 나면
-- 전체가 롤백되어 기존 006의 함수가 그대로 유지된다.
--
-- 함수 시그니처는 006과 완전히 동일하므로 CREATE OR REPLACE FUNCTION은
-- 기존 함수의 OID·소유자(owner)·기존 GRANT를 그대로 보존한다. 다만 이를
-- 암묵적으로 신뢰하지 않고, 아래에서 REVOKE/GRANT를 다시 명시적으로
-- 실행해 PUBLIC 실행 금지와 anon/authenticated 실행 허용을 재확인한다.

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
  -- (16-3 통합 테스트에서 발견된 수정 지점)
  -- 같은 트랜잭션에서 create_order()가 반복 호출되는 경우를 대비해,
  -- 임시 테이블을 만들기 전에 먼저 비워둔다. ON COMMIT DROP은 트랜잭션이
  -- 끝날 때만 동작하므로, 이전 호출이 성공했든(트랜잭션이 아직 진행 중)
  -- 실패 후 호출자가 SAVEPOINT 없이 예외를 삼켰든, 이 한 줄이 두 경우
  -- 모두를 동일하게 안전한 상태로 만든다. pg_temp를 명시해 세션의 임시
  -- 스키마만 정확히 가리킨다(search_path=''에서도 안전).
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

-- CREATE OR REPLACE FUNCTION은 같은 시그니처일 때 기존 OID·owner·GRANT를
-- 보존하지만, PUBLIC 실행 금지와 anon/authenticated 실행 허용을 암묵적
-- 보존에 맡기지 않고 다시 명시적으로 선언해 재확인한다.
revoke all on function public.create_order(jsonb, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_order(jsonb, text, text, text, text, text, text, text, text, text) to authenticated, anon;

-- Rollback (검토용으로만 제시 — 이번 단계에서 실행하지 않음):
--   006_create_order_rpc.sql의 create_order() 함수 본문 전체(맨 위
--   "create or replace function public.create_order(" 부터 맨 아래
--   "grant execute ..." 줄까지)를 그대로 다시 실행하면 이 007의 변경
--   이전 상태(임시 테이블 사전 정리 없음)로 정확히 되돌아간다.
--   함수 시그니처가 동일하므로 별도의 DROP FUNCTION 없이 다시
--   CREATE OR REPLACE FUNCTION만으로 원복 가능하다.
