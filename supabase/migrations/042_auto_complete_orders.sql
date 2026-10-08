-- ============================================================
-- 042_auto_complete_orders.sql — 환불 기간 종료 시 주문 자동 '완료'
-- ============================================================
-- 목적: 배송완료 후 단순변심 환불 가능 기간(7일)이 지나면 주문 상태를 자동으로
--       'completed'(완료)로 바꾼다. 환불이 더 이상 불가능해진 '마무리된 주문'을
--       운영진이 한눈에 구분할 수 있게 한다.
--
-- 구성:
--   1) orders.delivered_at — 배송완료 처리된 시각. 트리거로 자동 기록.
--   2) 트리거 set_delivered_at — fulfillment_status가 'delivered'로 바뀌는 순간 기록(최초 1회).
--   3) auto_complete_orders() — 조건을 만족하는 주문을 completed로 일괄 전환, 전환 건수 반환.
--        조건: 결제완료 + 배송완료 + 주문상태 confirmed(=결제확정, 아직 완료/취소 아님)
--              + 반품신청 중 아님 + 배송완료 후 7일 경과
--
-- 자동 실행: 관리자 주문목록을 열 때마다 서버가 auto_complete_orders()를 호출(별도 서버 불필요).
--           (원하면 추후 pg_cron으로 매일 자동 실행도 가능)
--
-- 롤백: drop function auto_complete_orders(); drop trigger orders_set_delivered_at on orders;
--       drop function set_delivered_at(); alter table orders drop column delivered_at;
-- ============================================================

begin;

-- 1) 배송완료 시각 컬럼
alter table public.orders
  add column if not exists delivered_at timestamptz;

-- 기존에 이미 배송완료인 주문은 지금 시각 기준으로 7일 창을 새로 부여(즉시 완료 방지).
update public.orders
   set delivered_at = now()
 where fulfillment_status = 'delivered' and delivered_at is null;

-- 2) fulfillment_status가 delivered로 바뀌면 delivered_at 자동 기록(최초 1회만).
create or replace function public.set_delivered_at()
returns trigger
language plpgsql
as $$
begin
  if new.fulfillment_status = 'delivered'
     and new.fulfillment_status is distinct from old.fulfillment_status
     and new.delivered_at is null then
    new.delivered_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_delivered_at on public.orders;
create trigger orders_set_delivered_at
  before update on public.orders
  for each row execute function public.set_delivered_at();

-- 3) 환불 기간(배송완료 +7일)이 지난 주문을 자동 완료 처리.
create or replace function public.auto_complete_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  update public.orders
     set order_status = 'completed'
   where order_status = 'confirmed'          -- 결제확정 상태만(완료/취소/대기 제외)
     and payment_status = 'paid'
     and fulfillment_status = 'delivered'
     and coalesce(return_status, '') <> 'requested'  -- 반품신청 중이면 제외
     and delivered_at is not null
     and delivered_at < now() - interval '7 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.auto_complete_orders() from public;
grant execute on function public.auto_complete_orders() to authenticated;

commit;
