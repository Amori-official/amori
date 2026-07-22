-- FLOWER POUCH 조합형 variant DB 정비
--
-- 배경:
--   FLOWER POUCH(slug='flower-pouch')는 현재 색상(Pink/Blue)과 사이즈(S/L)가
--   각각 독립된 product_variants 행으로 저장된 "split-axis" 구조다. 이 구조는
--   variant_id 하나로 색상과 사이즈를 동시에 표현할 수 없어(create_order RPC는
--   variant_id 하나당 정확히 한 행만 참조), 주문 시 색상 또는 사이즈 중 하나가
--   order_items에 기록되지 않고 유실된다. lib/resolve-variant.ts의
--   isSplitAxisProduct()가 이 상태를 감지해 장바구니 담기 자체를 차단하고 있다
--   (store/cart.ts). 이 migration은 색상+사이즈를 모두 가진 조합형 variant
--   4개(Pink+S, Pink+L, Blue+S, Blue+L)를 새로 만들고, 기존 색상 전용·사이즈
--   전용 4개 행은 삭제하지 않고 is_active=false로 비활성화해 split-axis 상태를
--   해소한다.
--
-- 이 migration이 다루지 않는 것:
--   - create_order() RPC(006/007)는 전혀 수정하지 않는다. RPC의
--     v_variant_label := coalesce(color_name, option_name)는 조합형 행에서
--     사이즈가 라벨에서 유실되는 별도 문제가 있으나, 이는 product_variants
--     데이터가 아니라 RPC 함수 로직의 문제이므로 별도 후속 migration에서
--     다룬다(아래 "후속 과제" 참고).
--   - product_variants에는 stock/수량 컬럼이 없고 별도 inventory 테이블도
--     앱 코드에서 전혀 사용되지 않는다(재고는 is_active로만 판별). 이
--     migration은 재고 수량을 다루지 않으며 inventory 테이블도 변경하지 않는다.
--   - app/actions/products.ts의 색상/사이즈 파생 로직도 수정하지 않는다.
--
-- 상품 식별:
--   products.slug = 'flower-pouch'로 조회하되, 결과가 정확히 1개가 아니면
--   즉시 실패한다. 특정 환경의 product UUID를 이 파일에 하드코딩하지 않는다.
--
-- 재실행 안전성(3가지 상태를 엄격히 구분):
--   1) 최초 적용 상태 — split-axis 4행(Pink/Blue/S/L)만 활성, 조합형 0행.
--      → 정상 진행: 조합형 4행 생성 + 기존 4행 비활성화.
--   2) 이미 정상 적용된 상태 — split-axis 4행 비활성, 조합형 4행(Pink+S/
--      Pink+L/Blue+S/Blue+L) 활성. 단순히 개수만 맞는다고 통과시키지 않고,
--      조합형 각 행의 color_hex/image_url/price_override가 대응하는 기존
--      색상·사이즈 기준 행의 현재 값과 정확히 일치하는지까지 필드 단위로
--      재검증한다. → 모두 일치하면 아무 것도 바꾸지 않고 조용히 종료
--      (멱등 재실행, 004 시드 migration과 동일한 관례). 하나라도 다르면
--      "이미 적용된 정상 상태"로 보지 않고 비정상 상태로 처리한다.
--   3) 그 외 모든 상태(조합형 일부만 존재, 중복/누락 기준 행, 예상치 못한
--      활성 variant, 값 불일치 등) — 즉시 예외를 발생시켜 전체 트랜잭션을
--      롤백한다. 부분 적용 상태를 조용히 통과시키지 않는다.
--
-- 값 승계(하드코딩 없음):
--   - price_override: 조합형 S행은 기존 S행(색상전용이 아닌 사이즈전용 행)의
--     price_override를, 조합형 L행은 기존 L행의 price_override를 그대로
--     복사한다.
--   - color_hex/image_url: 조합형 Pink행(Pink+S, Pink+L) 둘 다 기존 Pink
--     색상 전용 행의 color_hex/image_url을, 조합형 Blue행(Blue+S, Blue+L)
--     둘 다 기존 Blue 색상 전용 행의 값을 그대로 복사한다. 같은 색상의
--     S/L 두 행은 항상 동일한 color_hex를 갖는다.
--   - 기준 행(Pink/Blue/S/L)은 활성 여부와 무관하게 정확히 1개씩 존재해야
--     승계 기준이 명확하다고 판단한다 — 없거나(0개) 중복되면(2개 이상)
--     즉시 실패한다. 또한 Pink/Blue 기준 행의 color_hex가 NULL이면 색상
--     승계 자체가 불가능하므로 이 역시 즉시 실패한다.
--   - 모든 값은 이 스크립트 실행 시점에 DB에서 직접 조회한 값이며, 이
--     파일에는 가격·이미지 URL·색상 HEX 리터럴이 전혀 포함되어 있지 않다.
--
-- 원자성: 이 스크립트 전체는 하나의 DO 블록(익명 코드 블록)으로, Supabase
--   SQL 실행기에서 단일 문(statement)으로 처리되어 하나의 트랜잭션을
--   이룬다. 중간에 raise exception이 발생하면 그 트랜잭션 전체가 롤백되어
--   product_variants에는 어떤 변경도 남지 않는다.
--
-- 영향 범위: WHERE product_id = v_product_id로 모든 쓰기를 한정하므로
--   flower-pouch 상품의 variant 행 외에는 어떤 상품·variant·다른 테이블도
--   건드리지 않는다.
--
-- 후속 과제(이 migration의 스코프 밖):
--   - create_order() RPC의 variant_label이 조합형 행에서 사이즈를 잃는
--     문제 수정 (coalesce(color_name, option_name) → 둘 다 있으면 결합).
--   - product_variants(product_id, color_name, option_name) 조합에 대한
--     unique constraint 추가 여부 검토(현재 스키마에는 없음).
--   - app/actions/products.ts의 colors/sizes 파생 로직이 is_active를
--     반영하도록 수정(이 migration 적용 후 별도 코드 변경으로 진행).

do $$
declare
  v_product_id             uuid;

  v_pink_id                uuid;
  v_pink_hex               text;
  v_pink_image             text;
  v_pink_active            boolean;
  v_pink_count             integer;

  v_blue_id                uuid;
  v_blue_hex               text;
  v_blue_image             text;
  v_blue_active            boolean;
  v_blue_count             integer;

  v_s_id                   uuid;
  v_s_price_override       integer;
  v_s_active               boolean;
  v_s_count                integer;

  v_l_id                   uuid;
  v_l_price_override       integer;
  v_l_active               boolean;
  v_l_count                integer;

  v_total_variant_count    integer;
  v_other_variant_count    integer;
  v_combo_active_count     integer;
  v_combo_expected_count   integer;

  v_check_hex              text;
  v_check_image            text;
  v_check_price            integer;
  v_check_active           boolean;
begin
  -- 1) 상품을 slug로 정확히 1개 식별 (UUID 하드코딩 없음)
  if (select count(*) from public.products where slug = 'flower-pouch') <> 1 then
    raise exception 'flower-pouch slug did not resolve to exactly one product — aborting, no changes made';
  end if;

  select id into v_product_id from public.products where slug = 'flower-pouch';

  -- 2) 이 상품의 variant 행이 알려진 패턴(색상전용/사이즈전용/조합형)
  --    밖에 있는 게 있으면 즉시 실패 — 예상치 못한 활성 variant를
  --    조용히 지나치지 않는다.
  select count(*) into v_total_variant_count
    from public.product_variants
    where product_id = v_product_id;

  select count(*) into v_other_variant_count
    from public.product_variants
    where product_id = v_product_id
      and not (
        (color_name in ('Pink', 'Blue') and option_name is null)
        or (option_name in ('S', 'L') and color_name is null)
        or (color_name in ('Pink', 'Blue') and option_name in ('S', 'L'))
      );

  if v_other_variant_count > 0 then
    raise exception 'flower-pouch has % variant row(s) outside the known Pink/Blue/S/L or combo patterns — aborting, no changes made', v_other_variant_count;
  end if;

  -- 3) 기준 행(색상전용 Pink/Blue, 사이즈전용 S/L)을 활성 여부와 무관하게
  --    조회한다 — 이미 정상 적용된 상태에서는 이 행들이 비활성이지만
  --    여전히 존재하므로, color_hex/image_url/price_override의 "현재
  --    기준값"으로 계속 사용할 수 있다. 각 슬롯은 정확히 1개여야 하며,
  --    0개(누락) 또는 2개 이상(중복)이면 승계 기준이 불명확하므로 실패.
  select count(*) into v_pink_count
    from public.product_variants
    where product_id = v_product_id and color_name = 'Pink' and option_name is null;
  select count(*) into v_blue_count
    from public.product_variants
    where product_id = v_product_id and color_name = 'Blue' and option_name is null;
  select count(*) into v_s_count
    from public.product_variants
    where product_id = v_product_id and option_name = 'S' and color_name is null;
  select count(*) into v_l_count
    from public.product_variants
    where product_id = v_product_id and option_name = 'L' and color_name is null;

  if v_pink_count <> 1 or v_blue_count <> 1 or v_s_count <> 1 or v_l_count <> 1 then
    raise exception 'flower-pouch split-axis base rows are missing or duplicated (Pink=%, Blue=%, S=%, L=%) — color_hex/price_override 승계 기준이 불명확해 aborting, no changes made', v_pink_count, v_blue_count, v_s_count, v_l_count;
  end if;

  select id, color_hex, image_url, is_active into v_pink_id, v_pink_hex, v_pink_image, v_pink_active
    from public.product_variants
    where product_id = v_product_id and color_name = 'Pink' and option_name is null;

  select id, color_hex, image_url, is_active into v_blue_id, v_blue_hex, v_blue_image, v_blue_active
    from public.product_variants
    where product_id = v_product_id and color_name = 'Blue' and option_name is null;

  select id, price_override, is_active into v_s_id, v_s_price_override, v_s_active
    from public.product_variants
    where product_id = v_product_id and option_name = 'S' and color_name is null;

  select id, price_override, is_active into v_l_id, v_l_price_override, v_l_active
    from public.product_variants
    where product_id = v_product_id and option_name = 'L' and color_name is null;

  -- 3-1) color_hex 승계 기준 자체가 NULL이면 임의로 진행하지 않고 실패
  if v_pink_hex is null then
    raise exception 'Pink 색상 전용 행의 color_hex가 NULL입니다 — 색상 승계 기준을 확정할 수 없어 aborting, no changes made';
  end if;
  if v_blue_hex is null then
    raise exception 'Blue 색상 전용 행의 color_hex가 NULL입니다 — 색상 승계 기준을 확정할 수 없어 aborting, no changes made';
  end if;

  -- 4) 조합형 행 현황 파악
  select count(*) into v_combo_active_count
    from public.product_variants
    where product_id = v_product_id
      and color_name is not null and option_name is not null
      and is_active = true;

  select count(*) into v_combo_expected_count
    from public.product_variants
    where product_id = v_product_id
      and is_active = true
      and (color_name, option_name) in (('Pink', 'S'), ('Pink', 'L'), ('Blue', 'S'), ('Blue', 'L'));

  -- ---- 상태 2 후보: 조합형 4개 존재 + 기존 4행 전부 비활성 ----
  if v_combo_active_count = 4 and v_combo_expected_count = 4
     and v_pink_active = false and v_blue_active = false and v_s_active = false and v_l_active = false
  then
    -- 단순히 개수만으로 "이미 정상 적용"으로 판단하지 않고, 조합형 4행
    -- 각각의 color_hex/image_url/price_override/is_active가 현재 기준
    -- 행 값과 정확히 일치하는지 필드 단위로 검증한다. IS DISTINCT FROM은
    -- NULL 값도 안전하게 비교한다(image_url이 NULL인 경우 등).

    select color_hex, image_url, price_override, is_active
      into v_check_hex, v_check_image, v_check_price, v_check_active
      from public.product_variants
      where product_id = v_product_id and color_name = 'Pink' and option_name = 'S';
    if v_check_hex is distinct from v_pink_hex
       or v_check_image is distinct from v_pink_image
       or v_check_price is distinct from v_s_price_override
       or v_check_active is not true
    then
      raise exception 'flower-pouch Pink+S combo row does not match the current Pink/S reference values — treating as abnormal state, aborting';
    end if;

    select color_hex, image_url, price_override, is_active
      into v_check_hex, v_check_image, v_check_price, v_check_active
      from public.product_variants
      where product_id = v_product_id and color_name = 'Pink' and option_name = 'L';
    if v_check_hex is distinct from v_pink_hex
       or v_check_image is distinct from v_pink_image
       or v_check_price is distinct from v_l_price_override
       or v_check_active is not true
    then
      raise exception 'flower-pouch Pink+L combo row does not match the current Pink/L reference values — treating as abnormal state, aborting';
    end if;

    select color_hex, image_url, price_override, is_active
      into v_check_hex, v_check_image, v_check_price, v_check_active
      from public.product_variants
      where product_id = v_product_id and color_name = 'Blue' and option_name = 'S';
    if v_check_hex is distinct from v_blue_hex
       or v_check_image is distinct from v_blue_image
       or v_check_price is distinct from v_s_price_override
       or v_check_active is not true
    then
      raise exception 'flower-pouch Blue+S combo row does not match the current Blue/S reference values — treating as abnormal state, aborting';
    end if;

    select color_hex, image_url, price_override, is_active
      into v_check_hex, v_check_image, v_check_price, v_check_active
      from public.product_variants
      where product_id = v_product_id and color_name = 'Blue' and option_name = 'L';
    if v_check_hex is distinct from v_blue_hex
       or v_check_image is distinct from v_blue_image
       or v_check_price is distinct from v_l_price_override
       or v_check_active is not true
    then
      raise exception 'flower-pouch Blue+L combo row does not match the current Blue/L reference values — treating as abnormal state, aborting';
    end if;

    raise notice 'flower-pouch combo variants already migrated and verified consistent (color_hex/image_url/price_override/is_active) — no changes made';
    return;
  end if;

  -- ---- 상태 3: 조합형이 일부만 존재하거나 기존 행 활성 상태가 혼재됨 ----
  if v_combo_active_count > 0 or v_combo_expected_count > 0 then
    raise exception 'flower-pouch combo variants are partially present or inconsistent with legacy row activation state (% of 4 expected active) — aborting, resolve manually before re-running', v_combo_active_count;
  end if;

  if not (v_pink_active and v_blue_active and v_s_active and v_l_active) then
    raise exception 'flower-pouch split-axis base rows are not uniformly active (Pink=%, Blue=%, S=%, L=%) while no combo variants exist — inconsistent state, aborting', v_pink_active, v_blue_active, v_s_active, v_l_active;
  end if;

  if v_total_variant_count <> 4 then
    raise exception 'flower-pouch has % variant row(s), expected exactly 4 before migration — aborting, no changes made', v_total_variant_count;
  end if;

  -- ---- 상태 1: 최초 적용 — 조합형 4개 생성. 가격은 사이즈 전용 행에서,
  --      색상 HEX/이미지는 색상 전용 행에서 그대로 복사(하드코딩 없음) ----
  insert into public.product_variants
    (product_id, color_name, color_hex, option_name, image_url, price_override, is_active, display_order)
  values
    (v_product_id, 'Pink', v_pink_hex, 'S', v_pink_image, v_s_price_override, true, 0),
    (v_product_id, 'Pink', v_pink_hex, 'L', v_pink_image, v_l_price_override, true, 1),
    (v_product_id, 'Blue', v_blue_hex, 'S', v_blue_image, v_s_price_override, true, 2),
    (v_product_id, 'Blue', v_blue_hex, 'L', v_blue_image, v_l_price_override, true, 3);

  if (
    select count(*) from public.product_variants
    where product_id = v_product_id
      and color_name is not null and option_name is not null
      and is_active = true
  ) <> 4 then
    raise exception 'combo variant creation did not result in exactly 4 active rows — aborting transaction';
  end if;

  -- color_hex 최종 검증: NULL 없음 + 색상별 기준값과 일치 + 동일 색상의
  -- S/L 두 행이 서로 같은 color_hex를 갖는지까지 확인한다.
  if exists (
    select 1 from public.product_variants
    where product_id = v_product_id
      and color_name is not null and option_name is not null
      and is_active = true
      and color_hex is null
  ) then
    raise exception 'newly created combo rows have NULL color_hex — aborting transaction';
  end if;

  if exists (
    select 1 from public.product_variants
    where product_id = v_product_id and color_name = 'Pink' and option_name in ('S', 'L')
      and is_active = true and color_hex is distinct from v_pink_hex
  ) then
    raise exception 'Pink combo rows do not match the source Pink color_hex — aborting transaction';
  end if;

  if exists (
    select 1 from public.product_variants
    where product_id = v_product_id and color_name = 'Blue' and option_name in ('S', 'L')
      and is_active = true and color_hex is distinct from v_blue_hex
  ) then
    raise exception 'Blue combo rows do not match the source Blue color_hex — aborting transaction';
  end if;

  if (
    select count(distinct color_hex) from public.product_variants
    where product_id = v_product_id and color_name = 'Pink' and option_name in ('S', 'L') and is_active = true
  ) <> 1
  or (
    select count(distinct color_hex) from public.product_variants
    where product_id = v_product_id and color_name = 'Blue' and option_name in ('S', 'L') and is_active = true
  ) <> 1
  then
    raise exception 'Pink or Blue combo rows have inconsistent color_hex between their S and L rows — aborting transaction';
  end if;

  -- 5) 기존 split-axis 4행 비활성화 (삭제하지 않음 — order_items.variant_id
  --    FK(ON DELETE SET NULL)와 과거 주문 조회에 영향 없음)
  update public.product_variants
    set is_active = false
    where id in (v_pink_id, v_blue_id, v_s_id, v_l_id);

  if exists (
    select 1 from public.product_variants
    where id in (v_pink_id, v_blue_id, v_s_id, v_l_id) and is_active = true
  ) then
    raise exception 'failed to deactivate legacy split-axis rows — aborting transaction';
  end if;

  raise notice 'flower-pouch: created 4 combo variants (color_hex/image_url/price_override carried over and verified) and deactivated 4 legacy split-axis rows';
end $$;
