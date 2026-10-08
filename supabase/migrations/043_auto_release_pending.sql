-- ============================================================
-- 043_auto_release_pending.sql — 방치된 미결제 주문 자동 해제(쿠폰·포인트 복원)
-- ============================================================
-- 배경: 토스 결제창에서 '뒤로가기' 등으로 결제를 중단하면, 생성된 pending 주문이
--       남아 쿠폰이 '사용됨'으로 묶이고 적립금도 차감된 채로 유지된다. 기존
--       release_pending_order()는 주문 ID를 넘겨야만 동작해서, 그 경로를 안 타고
--       이탈한 경우를 복구하지 못했다.
--
-- 해결: 일정 시간(분) 넘게 결제가 안 된 pending 주문을 자동으로 해제한다.
--   1) release_my_stale_pending_orders(p_minutes)  — 로그인 사용자 '본인' 것.
--        고객이 쿠폰함/체크아웃을 열 때 호출 → 쿠폰이 바로 되살아남.
--   2) release_all_stale_pending_orders(p_minutes)  — 전체(관리자 전용).
--        관리자 주문목록을 열 때 호출 → 방치 주문 정리 + 쿠폰/포인트 복원.
--   해제 로직은 release_pending_order()와 동일(주문 취소 + 쿠폰 복원 + 포인트 복원).
--
-- 안전: 'paid'(결제완료) 건은 절대 건드리지 않음(ready/pending 만 대상).
--       p_minutes 유예(기본 본인 2분 / 전체 30분)로 '결제 진행 중'을 보호.
-- 롤백: drop function release_my_stale_pending_orders(int);
--       drop function release_all_stale_pending_orders(int);
-- ============================================================

begin;

-- 1) 본인 미결제 주문 자동 해제
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
      set order_status = 'cancelled', payment_status = 'cancelled'
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

revoke all on function public.release_my_stale_pending_orders(int) from public;
grant execute on function public.release_my_stale_pending_orders(int) to authenticated;

-- 2) 전체 미결제 주문 자동 해제(관리자 전용)
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
      set order_status = 'cancelled', payment_status = 'cancelled'
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

revoke all on function public.release_all_stale_pending_orders(int) from public;
grant execute on function public.release_all_stale_pending_orders(int) to authenticated;

commit;
