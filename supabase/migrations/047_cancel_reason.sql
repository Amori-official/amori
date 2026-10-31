-- ============================================================
-- 047_cancel_reason.sql — 고객 주문 취소 시 '취소 사유' 저장
-- ============================================================
-- cancel_my_order / release_pending_order에 p_reason 인자를 추가해,
-- 고객이 선택한 취소 사유를 orders.cancel_reason에 저장한다.
-- 사유가 비어 있으면 기존 기본 라벨을 유지한다.
-- 인자(시그니처)가 바뀌므로 기존 1-인자 함수는 drop 후 재생성한다.
--
-- 롤백: 044_cancel_actor.sql 의 두 함수 재실행(+ 2-인자 버전 drop).
-- ============================================================

begin;

-- ── 고객 직접 취소(결제완료 건) + 사유 ──
drop function if exists public.cancel_my_order(uuid);

create or replace function public.cancel_my_order(p_order_id uuid, p_reason text default null)
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
        cancelled_by = 'customer',
        cancel_reason = coalesce(nullif(btrim(p_reason), ''), '고객 직접 취소')
    where id = p_order_id;

  update public.user_coupons
    set status = 'active', used_at = null, used_order_id = null
    where used_order_id = p_order_id;

  if coalesce(v_order.points_used, 0) > 0
     and not exists (select 1 from public.point_transactions where order_id = p_order_id and type = 'refund_order') then
    perform public._apply_points(v_order.user_id, v_order.points_used, 'refund_order', '주문 취소 포인트 복원', p_order_id, null);
  end if;
end $$;

grant execute on function public.cancel_my_order(uuid, text) to authenticated;

-- ── 고객: 결제 미완료 주문 해제 + 사유 ──
drop function if exists public.release_pending_order(uuid);

create or replace function public.release_pending_order(p_order_id uuid, p_reason text default null)
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
        cancelled_by = 'customer',
        cancel_reason = coalesce(nullif(btrim(p_reason), ''), '결제 미완료(고객 이탈) 해제')
    where id = p_order_id;

  update public.user_coupons
    set status = 'active', used_at = null, used_order_id = null
    where used_order_id = p_order_id;

  if coalesce(v_order.points_used, 0) > 0
     and not exists (select 1 from public.point_transactions where order_id = p_order_id and type = 'refund_order') then
    perform public._apply_points(v_order.user_id, v_order.points_used, 'refund_order', '결제 미완료 주문 해제 복원', p_order_id, null);
  end if;
end $$;

grant execute on function public.release_pending_order(uuid, text) to authenticated;

commit;
