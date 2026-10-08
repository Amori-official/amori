-- ============================================================
-- 044_cancel_actor.sql — 주문 취소 '주체' 기록 (판매자/구매자/자동)
-- ============================================================
-- 목적: 주문이 어떤 경로로 취소됐는지 관리자 화면에서 구분한다.
--   cancelled_by: 'admin'(판매자) | 'customer'(구매자) | 'system'(자동)
--   cancel_reason: 사람이 읽는 짧은 사유 라벨
--
-- 취소가 일어나는 지점과 주체:
--   · 관리자 주문취소/일괄취소 ............ admin  (cancelOrderCore, JS에서 기록)
--   · 반품 승인 ........................... admin  (approveReturn, JS에서 기록)
--   · 고객 직접취소(결제완료 건) ........... customer (cancel_my_order RPC)
--   · 고객 결제 미완료 해제(이탈/재시도) ... customer (release_pending_order RPC)
--   · 방치 미결제 자동해제(본인/전체) ...... system  (release_*_stale_pending_orders RPC)
--
-- 이 마이그레이션은 위 RPC들을 CREATE OR REPLACE 로 교체해 취소 시 두 컬럼을 채운다.
-- (admin 경로는 서버 액션 JS에서 직접 기록 — 별도 코드 커밋)
-- 롤백: alter table orders drop column cancel_reason, drop column cancelled_by;
--       028/037/043 의 해당 함수 재실행.
-- ============================================================

begin;

alter table public.orders
  add column if not exists cancelled_by  text,
  add column if not exists cancel_reason text;

-- ── 고객 직접 취소(결제완료 건) ──
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
    set order_status = 'cancelled', payment_status = 'refunded',
        cancelled_by = 'customer', cancel_reason = '고객 직접 취소'
    where id = p_order_id;

  update public.user_coupons
    set status = 'active', used_at = null, used_order_id = null
    where used_order_id = p_order_id;

  if coalesce(v_order.points_used, 0) > 0
     and not exists (select 1 from public.point_transactions where order_id = p_order_id and type = 'refund_order') then
    perform public._apply_points(v_order.user_id, v_order.points_used, 'refund_order', '주문 취소 포인트 복원', p_order_id, null);
  end if;
end $$;

-- ── 고객: 결제 미완료 주문 해제(이탈/재시도) ──
create or replace function public.release_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order record;
begin
  if v_uid is null then return; end if;

  select user_id, order_status, payment_status, points_used
  into v_order
  from public.orders where id = p_order_id;
  if not found then return; end if;

  if v_order.user_id is distinct from v_uid then
    raise exception '본인 주문만 해제할 수 있습니다.';
  end if;
  if v_order.order_status = 'cancelled' then return; end if;
  if v_order.payment_status = 'paid' then return; end if;

  update public.orders
    set order_status = 'cancelled', payment_status = 'cancelled',
        cancelled_by = 'customer', cancel_reason = '결제 미완료(고객 이탈) 해제'
    where id = p_order_id;

  update public.user_coupons
    set status = 'active', used_at = null, used_order_id = null
    where used_order_id = p_order_id;

  if coalesce(v_order.points_used, 0) > 0
     and not exists (select 1 from public.point_transactions where order_id = p_order_id and type = 'refund_order') then
    perform public._apply_points(v_order.user_id, v_order.points_used, 'refund_order', '결제 미완료 주문 해제 복원', p_order_id, null);
  end if;
end $$;

-- ── 시스템: 본인 방치 미결제 자동 해제 ──
create or replace function public.release_my_stale_pending_orders(p_minutes int default 2)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order record;
  v_count int := 0;
begin
  if v_uid is null then return 0; end if;

  for v_order in
    select id, points_used
    from public.orders
    where user_id = v_uid
      and order_status <> 'cancelled'
      and payment_status in ('ready', 'pending')
      and created_at < now() - make_interval(mins => greatest(0, coalesce(p_minutes, 2)))
  loop
    update public.orders
      set order_status = 'cancelled', payment_status = 'cancelled',
          cancelled_by = 'system', cancel_reason = '방치 미결제 자동 해제'
      where id = v_order.id;

    update public.user_coupons
      set status = 'active', used_at = null, used_order_id = null
      where used_order_id = v_order.id;

    if coalesce(v_order.points_used, 0) > 0
       and not exists (select 1 from public.point_transactions
                        where order_id = v_order.id and type = 'refund_order') then
      perform public._apply_points(v_uid, v_order.points_used, 'refund_order',
                                   '결제 미완료 주문 자동 해제 복원', v_order.id, null);
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ── 시스템: 전체 방치 미결제 자동 해제(관리자) ──
create or replace function public.release_all_stale_pending_orders(p_minutes int default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_count int := 0;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  for v_order in
    select id, user_id, points_used
    from public.orders
    where order_status <> 'cancelled'
      and payment_status in ('ready', 'pending')
      and created_at < now() - make_interval(mins => greatest(0, coalesce(p_minutes, 30)))
  loop
    update public.orders
      set order_status = 'cancelled', payment_status = 'cancelled',
          cancelled_by = 'system', cancel_reason = '방치 미결제 자동 해제'
      where id = v_order.id;

    update public.user_coupons
      set status = 'active', used_at = null, used_order_id = null
      where used_order_id = v_order.id;

    if v_order.user_id is not null
       and coalesce(v_order.points_used, 0) > 0
       and not exists (select 1 from public.point_transactions
                        where order_id = v_order.id and type = 'refund_order') then
      perform public._apply_points(v_order.user_id, v_order.points_used, 'refund_order',
                                   '결제 미완료 주문 자동 해제(관리자 정리)', v_order.id, null);
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

commit;
