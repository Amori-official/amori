-- 020_order_returns.sql
--
-- 고객 자가 취소/반품(PC3): 반품 상태 컬럼 + 고객용 SECURITY DEFINER RPC 2개.
-- · 취소(배송 준비 전, fulfillment='unfulfilled'): cancel_my_order() — 상태 전환 + 쿠폰 복원.
-- · 반품 신청(배송 준비 후): request_order_return() — 'requested'로 표시(관리자 승인 후 환불).
-- 실제 환불(Toss 결제취소 API)은 서버 액션(Node)에서 선 처리한 뒤 위 RPC/관리자 로직으로 DB 반영한다.

alter table public.orders add column if not exists return_status text;
alter table public.orders add column if not exists return_reason text;
alter table public.orders add column if not exists return_requested_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_return_status_check') then
    alter table public.orders add constraint orders_return_status_check
      check (return_status is null or return_status in ('requested', 'approved', 'rejected'));
  end if;
end $$;

-- ── 고객 본인 주문 취소 (배송 준비 전) ──────────────────────
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
    set order_status = 'cancelled', payment_status = 'refunded'
    where id = p_order_id;

  -- 사용된 쿠폰 복원
  update public.user_coupons
    set status = 'active', used_at = null, used_order_id = null
    where used_order_id = p_order_id;
end;
$$;

-- ── 고객 반품 신청 (배송 준비 후) ──────────────────────────
create or replace function public.request_order_return(p_order_id uuid, p_reason text)
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
  if v_order.user_id is distinct from v_uid then raise exception '본인 주문만 신청할 수 있습니다.'; end if;
  if v_order.order_status = 'cancelled' then raise exception '취소된 주문입니다.'; end if;
  if v_order.payment_status <> 'paid' then raise exception '반품할 수 없는 결제 상태입니다.'; end if;
  if v_order.fulfillment_status not in ('preparing', 'shipped', 'delivered') then
    raise exception '아직 반품 신청 단계가 아닙니다.';
  end if;
  if v_order.return_status = 'requested' then raise exception '이미 반품 신청된 주문입니다.'; end if;

  update public.orders
    set return_status = 'requested',
        return_reason = left(coalesce(p_reason, ''), 500),
        return_requested_at = now()
    where id = p_order_id;
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public;
revoke all on function public.request_order_return(uuid, text) from public;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.request_order_return(uuid, text) to authenticated;

-- Rollback:
--   drop function if exists public.cancel_my_order(uuid);
--   drop function if exists public.request_order_return(uuid, text);
--   alter table public.orders drop column if exists return_status, drop column if exists return_reason, drop column if exists return_requested_at;
