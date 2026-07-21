-- 회귀 테스트: create_order() 임시 테이블 재사용 수정 (007) 검증
--
-- 이 파일은 초안 상태이며 아직 실행하지 않았다. 007_fix_create_order_temp_table_reuse.sql이
-- amori-staging에 승인·적용된 뒤에만 SQL Editor에서 실행한다.
-- 실행 시 반드시 명백한 테스트 정보만 사용하고("AMORI RPC TEST" 표식 유지),
-- 기존 상품/variant 데이터를 수정하지 않는다. 이 스크립트는 새 테스트 주문을
-- 생성한다 — 실행 전 반드시 별도 승인을 받을 것.
--
-- product_id/variant_id는 amori-staging의 실제 카탈로그 값으로 채워 넣어야 한다
-- (16-3 통합 테스트에서 사용한 것과 동일한 값을 재사용 가능).

create temporary table regression_results (
  seq serial primary key,
  test_name text,
  result text,
  detail text
);

-- ============================================================
-- 검증 1 + 2: 같은 트랜잭션에서 연속 2회 호출 시
--   (a) "relation already exists" 오류가 발생하지 않아야 하고
--   (b) 두 번째 주문의 order_items에 첫 번째 주문의 항목이 섞이지 않아야 한다
-- ============================================================
do $$
declare
  v_result_1 jsonb;
  v_result_2 jsonb;
  v_order_id_1 uuid;
  v_order_id_2 uuid;
  v_cross_contamination_count integer;
begin
  -- 첫 번째 호출: flower-pouch Pink 1개만 주문
  v_result_1 := public.create_order(
    '[{"product_id":"<flower-pouch-id>","variant_id":"<pink-variant-id>","quantity":1}]'::jsonb,
    'AMORI RPC TEST', 'amori-rpc-test@example.com', '010-0000-0000',
    'AMORI TEST RECIPIENT', '010-0000-0000', '00000',
    'TEST ADDRESS - NOT FOR DELIVERY', 'TEST ONLY', 'AUTOMATED RPC TEST - DO NOT FULFILL'
  );
  v_order_id_1 := (v_result_1->>'order_id')::uuid;

  -- 두 번째 호출: 같은 트랜잭션 안에서 곧바로, 다른 상품(spread) 1개 주문.
  -- 007 적용 전에는 이 두 번째 호출에서 "relation _order_lines already exists"
  -- 오류가 발생했다. 007 적용 후에는 정상 성공해야 한다.
  v_result_2 := public.create_order(
    '[{"product_id":"<spread-id>","variant_id":"<spread-cream-variant-id>","quantity":1}]'::jsonb,
    'AMORI RPC TEST', 'amori-rpc-test@example.com', '010-0000-0000',
    'AMORI TEST RECIPIENT', '010-0000-0000', '00000',
    'TEST ADDRESS - NOT FOR DELIVERY', 'TEST ONLY', 'AUTOMATED RPC TEST - DO NOT FULFILL'
  );
  v_order_id_2 := (v_result_2->>'order_id')::uuid;

  insert into regression_results(test_name, result, detail)
  values ('R1_back_to_back_calls_no_error', 'PASS', v_result_1::text || ' | ' || v_result_2::text);

  -- 검증 2: 두 주문의 order_items가 서로 섞이지 않았는지 확인.
  -- 주문1의 order_items에는 spread가, 주문2의 order_items에는 flower-pouch가
  -- 하나도 없어야 한다(교차 오염 = 0건).
  select count(*) into v_cross_contamination_count
  from public.order_items
  where (order_id = v_order_id_1 and product_id = '<spread-id>')
     or (order_id = v_order_id_2 and product_id = '<flower-pouch-id>');

  if v_cross_contamination_count = 0 then
    insert into regression_results(test_name, result, detail)
    values ('R2_no_cross_contamination', 'PASS', 'cross_contamination_count=0');
  else
    insert into regression_results(test_name, result, detail)
    values ('R2_no_cross_contamination', 'FAIL', 'cross_contamination_count=' || v_cross_contamination_count::text);
  end if;
exception when others then
  insert into regression_results(test_name, result, detail)
  values ('R1_R2_back_to_back_calls', 'FAIL (unexpected error)', sqlerrm);
end $$;

-- ============================================================
-- 검증 3: "첫 호출 실패 후 같은 트랜잭션에서 재호출"의 PostgreSQL 트랜잭션 특성
--   (이 항목은 실행 가능한 단정문이 아니라 설명이다 — 아래 주석 참고)
-- ============================================================
-- PL/pgSQL의 BEGIN ... EXCEPTION ... END 블록은 내부적으로 SAVEPOINT를
-- 생성한다. 예외가 발생하면 그 SAVEPOINT까지 롤백되는데, 이 롤백은
-- 실패한 호출이 만든 임시 테이블 생성(DDL)까지 함께 되돌린다. 즉:
--
--   - 호출자가 실패를 SAVEPOINT로 감싸 잡아내는 경우(예: 아래 R4/R5처럼
--     `begin ... exception when others then ... end;`로 감싸는 경우):
--     실패한 호출이 만든 _order_lines/_order_lines_priced는 SAVEPOINT
--     롤백으로 이미 사라지므로, 바로 다음 호출은 애초에 테이블이
--     존재하지 않는 상태에서 시작한다 — 007의 수정 없이도 이 경로는
--     원래 안전했다.
--   - 호출자가 SAVEPOINT 없이 예외를 전파시키는 경우: PostgreSQL은
--     예외가 발생한 트랜잭션을 "aborted" 상태로 전환하며, 이 상태에서는
--     ROLLBACK(또는 트랜잭션 종료) 전까지 그 어떤 후속 명령도 실행할 수
--     없다("current transaction is aborted, commands ignored until end
--     of transaction block"). 따라서 "SAVEPOINT 없이 실패한 뒤 같은
--     트랜잭션에서 재호출"이라는 시나리오 자체가 PostgreSQL 구조상
--     발생할 수 없다 — 재호출을 시도하는 순간 트랜잭션이 이미 죽어있어
--     새 트랜잭션(즉 새로운 세션 상태)에서 다시 시작해야 하고, 그 경우
--     임시 테이블은 원래 세션이 끝나며 정리된다.
--
-- 결론: 007이 실제로 고치는 유일한 위험 구간은 "이전 호출이 성공해서
-- 트랜잭션이 계속 진행 중인 상태에서 같은 트랜잭션 안에 또 호출하는"
-- 경우이며, 위 R1/R2 테스트가 정확히 이 경로를 검증한다. "실패 후
-- SAVEPOINT 없이 재호출"은 PostgreSQL이 애초에 허용하지 않으므로 별도
-- 테스트가 불필요하다.

insert into regression_results(test_name, result, detail)
values ('R3_transaction_semantics_explanation', 'DOCUMENTED (no runnable assertion)',
  'SAVEPOINT 롤백은 실패한 호출의 임시 테이블 생성까지 되돌리므로 원래 안전했음. SAVEPOINT 없는 실패는 트랜잭션을 abort시켜 재호출 자체가 불가능함.');

-- ============================================================
-- 검증 4: 정상 주문금액·배송비 계산이 기존(006)과 동일한지
--   (16-3 통합 테스트의 A1 케이스를 그대로 재현 — 동일 입력 → 동일 출력이어야 함)
-- ============================================================
do $$
declare v_result jsonb;
begin
  v_result := public.create_order(
    '[{"product_id":"<flower-pouch-id>","variant_id":"<pink-variant-id>","quantity":1}]'::jsonb,
    'AMORI RPC TEST', 'amori-rpc-test@example.com', '010-0000-0000',
    'AMORI TEST RECIPIENT', '010-0000-0000', '00000',
    'TEST ADDRESS - NOT FOR DELIVERY', 'TEST ONLY', 'AUTOMATED RPC TEST - DO NOT FULFILL'
  );
  if (v_result->>'subtotal_amount')::int = 8000
     and (v_result->>'shipping_fee')::int = 3000
     and (v_result->>'total_amount')::int = 11000 then
    insert into regression_results(test_name, result, detail)
    values ('R4_amount_calculation_unchanged', 'PASS', v_result::text);
  else
    insert into regression_results(test_name, result, detail)
    values ('R4_amount_calculation_unchanged', 'FAIL (amounts differ from 006 baseline)', v_result::text);
  end if;
exception when others then
  insert into regression_results(test_name, result, detail)
  values ('R4_amount_calculation_unchanged', 'FAIL (unexpected error)', sqlerrm);
end $$;

-- ============================================================
-- 검증 5: 실패 요청은 부분 주문을 남기지 않는지 (거부되는 요청 전후 행 수 비교)
-- ============================================================
do $$
declare
  v_orders_before integer;
  v_order_items_before integer;
  v_orders_after integer;
  v_order_items_after integer;
begin
  select count(*) into v_orders_before from public.orders;
  select count(*) into v_order_items_before from public.order_items;

  begin
    perform public.create_order(
      '[{"product_id":"<flower-pouch-id>","variant_id":"<pink-variant-id>","quantity":-1}]'::jsonb,
      'AMORI RPC TEST', 'amori-rpc-test@example.com', '010-0000-0000',
      'AMORI TEST RECIPIENT', '010-0000-0000', '00000',
      'TEST ADDRESS - NOT FOR DELIVERY', 'TEST ONLY', 'AUTOMATED RPC TEST - DO NOT FULFILL'
    );
  exception when others then
    null; -- 예상된 거부, 무시하고 아래에서 행 수만 비교
  end;

  select count(*) into v_orders_after from public.orders;
  select count(*) into v_order_items_after from public.order_items;

  if v_orders_before = v_orders_after and v_order_items_before = v_order_items_after then
    insert into regression_results(test_name, result, detail)
    values ('R5_no_partial_order_on_failure', 'PASS',
      'orders ' || v_orders_before::text || '->' || v_orders_after::text ||
      ', order_items ' || v_order_items_before::text || '->' || v_order_items_after::text);
  else
    insert into regression_results(test_name, result, detail)
    values ('R5_no_partial_order_on_failure', 'FAIL (row count changed)',
      'orders ' || v_orders_before::text || '->' || v_orders_after::text ||
      ', order_items ' || v_order_items_before::text || '->' || v_order_items_after::text);
  end if;
end $$;

select seq, test_name, result, detail from regression_results order by seq;
