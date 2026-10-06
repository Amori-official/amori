-- ============================================================
-- 037_release_pending_order.sql — 미결제(pending) 주문 해제 + 복원
-- ============================================================
-- 배경: 결제창에서 시간이 지나 결제가 실패/취소되면, 이미 생성된 pending 주문에
--       쿠폰·적립금이 '사용됨'으로 남아 재시도가 깨진다. 결제 실패 시 그 주문을
--       해제(취소)하고 쿠폰·적립금을 복원해 깔끔히 재시도할 수 있게 한다.
-- 안전: 본인 주문 + '미결제(ready/pending)' 상태만. 이미 결제(paid)된 건 건드리지 않음.
-- ============================================================

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
  if v_uid is null then return; end if;  -- 게스트: 복원할 쿠폰/포인트 없음

  select user_id, order_status, payment_status, points_used
  into v_order
  from public.orders where id = p_order_id;
  if not found then return; end if;

  if v_order.user_id is distinct from v_uid then
    raise exception '본인 주문만 해제할 수 있습니다.';
  end if;
  if v_order.order_status = 'cancelled' then return; end if;
  if v_order.payment_status = 'paid' then return; end if;  -- 이미 결제된 건 보호

  update public.orders
    set order_status = 'cancelled', payment_status = 'cancelled'
    where id = p_order_id;

  -- 사용된 쿠폰 복원
  update public.user_coupons
    set status = 'active', used_at = null, used_order_id = null
    where used_order_id = p_order_id;

  -- 사용된 적립금 복원(이중 복원 방지)
  if coalesce(v_order.points_used, 0) > 0
     and not exists (select 1 from public.point_transactions where order_id = p_order_id and type = 'refund_order') then
    perform public._apply_points(v_order.user_id, v_order.points_used, 'refund_order', '결제 미완료 주문 해제 복원', p_order_id, null);
  end if;
end $$;

grant execute on function public.release_pending_order(uuid) to authenticated;
