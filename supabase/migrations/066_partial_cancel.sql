-- ============================================================================
-- 066_partial_cancel.sql — 관리자 부분 취소(일부 상품만 취소 + 비례 환불)
-- ----------------------------------------------------------------------------
-- 고객 변심 등으로 주문의 '일부 상품만' 취소하는 기능(관리자 전용).
--   · 현금: 취소 상품 몫만큼 비례 환불(쿠폰/포인트로 싸게 산 만큼만) → 과다환불 방지
--   · 포인트: 취소 상품 몫만큼 반환(고객 자산)
--   · 쿠폰: 복원하지 않음(판촉·부분 되돌리기 불가·악용 방지)
--   · 무료배송 기준 미달 시 배송비 차감(환불액에서, 절대 마이너스 없음)
--   · 전체 취소 방지: 최소 1개 활성 상품이 남아야 함(전부 취소는 기존 '주문 취소' 사용)
--
-- 환불 '금액' 계산은 서버(TS, lib/partial-refund.ts)에서 하고(토스 cancelAmount와
-- 일치시키기 위해), 이 RPC는 수량 검증 + DB 반영(취소수량·재고·포인트·상태)만 원자 처리.
--
-- 이중 처리 방지(부분취소 후 전체취소 시):
--   · 재고 복원 트리거 → '활성 수량만' 복원하도록 수정(이미 부분취소분은 제외)
--   · 포인트 복원(restore_order_points) → 이미 부분 반환한 포인트(points_refunded) 차감
-- ============================================================================

-- 1) 컬럼 추가 ---------------------------------------------------------------
alter table public.order_items
  add column if not exists cancelled_quantity integer not null default 0;

alter table public.orders
  add column if not exists refunded_amount integer not null default 0;   -- 부분취소 누적 현금 환불
alter table public.orders
  add column if not exists points_refunded integer not null default 0;   -- 부분취소 누적 포인트 반환
alter table public.orders
  add column if not exists shipping_reclaimed boolean not null default false; -- 무료배송 미달로 배송비 1회 차감 여부

-- 2) 재고 복원 트리거 — '활성 수량(quantity - cancelled_quantity)'만 복원 --------
-- 부분취소에서 이미 복원한 수량은 제외하여, 이후 전체취소 시 이중 복원을 막는다.
create or replace function public.restore_cancelled_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_status = 'cancelled'
     and coalesce(old.order_status, '') <> 'cancelled'
     and coalesce(new.stock_restored, false) = false then
    update public.product_variants pv
       set stock = pv.stock + oi.qty
      from (
        select variant_id, sum(quantity - coalesce(cancelled_quantity, 0)) as qty
        from public.order_items
        where order_id = new.id and variant_id is not null
        group by variant_id
        having sum(quantity - coalesce(cancelled_quantity, 0)) > 0
      ) oi
     where pv.id = oi.variant_id and pv.stock is not null;
    new.stock_restored := true;
  end if;
  return new;
end $$;

-- 3) 포인트 복원 — 이미 부분 반환한 포인트(points_refunded)를 뺀 '남은 포인트'만 복원 ----
create or replace function public.restore_order_points(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user_id uuid;
  v_points_used integer;
  v_points_refunded integer;
  v_remaining integer;
begin
  select user_id, points_used, coalesce(points_refunded, 0)
    into v_user_id, v_points_used, v_points_refunded
  from public.orders where id = p_order_id;
  if not found then return; end if;

  if not (public.is_admin() or v_user_id = v_uid) then
    raise exception '권한이 없습니다.';
  end if;

  if v_user_id is null then
    return;
  end if;
  -- 이미 전체복원됐으면 스킵.
  if exists (
    select 1 from public.point_transactions
    where order_id = p_order_id and type = 'refund_order'
  ) then
    return;
  end if;

  -- 전체 사용량에서 이미 부분취소로 반환한 포인트를 뺀 나머지만 복원.
  v_remaining := coalesce(v_points_used, 0) - coalesce(v_points_refunded, 0);
  if v_remaining <= 0 then
    return;
  end if;

  perform public._apply_points(v_user_id, v_remaining, 'refund_order', '주문 취소 포인트 복원', p_order_id, null);
end $$;
grant execute on function public.restore_order_points(uuid) to authenticated;

-- 4) 고객 전체취소(cancel_my_order)도 동일하게 '남은 포인트'만 복원(방어적) ---------
-- (현재 부분취소된 주문은 payment_status='partially_refunded'라 이 함수의 'paid' 게이트에
--  걸려 실행되지 않지만, 정합성을 위해 포인트 복원식을 동일하게 맞춘다.)
create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_remaining integer;
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

  -- 사용된 포인트 복원(이미 부분 반환한 몫 제외)
  v_remaining := coalesce(v_order.points_used, 0) - coalesce(v_order.points_refunded, 0);
  if v_remaining > 0
     and not exists (select 1 from public.point_transactions where order_id = p_order_id and type = 'refund_order') then
    perform public._apply_points(v_order.user_id, v_remaining, 'refund_order', '주문 취소 포인트 복원', p_order_id, null);
  end if;
end $$;

-- 5) 부분취소 RPC ------------------------------------------------------------
-- 수량 검증 + 취소수량 반영 + 재고 복원 + 금액/상태 갱신 + 포인트 반환을 원자 처리.
-- 금액(p_card_refund 등)은 서버에서 계산해 토스 환불까지 끝낸 뒤 전달한다(기록 역할).
create or replace function public.partial_cancel_order(
  p_order_id uuid,
  p_lines jsonb,              -- [{"item_id": uuid, "qty": int}, ...]
  p_card_refund integer,      -- 카드 환불액(토스에서 이미 처리됨)
  p_points_return integer,    -- 반환 포인트
  p_shipping_reclaim integer  -- 무료배송 미달 배송비 차감액(기록용)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_line jsonb;
  v_item_id uuid;
  v_qty integer;
  v_oi public.order_items%rowtype;
  v_active_remaining integer;
  v_total_active_after integer;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception '주문을 찾을 수 없습니다.'; end if;
  if v_order.order_status = 'cancelled' then raise exception '이미 취소된 주문입니다.'; end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception '취소할 상품이 선택되지 않았습니다.';
  end if;

  -- 각 줄: 수량 검증 → 취소수량 누적 → 옵션 재고 복원
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_item_id := (v_line->>'item_id')::uuid;
    v_qty := (v_line->>'qty')::integer;
    if v_qty is null or v_qty <= 0 then
      continue;
    end if;

    select * into v_oi from public.order_items
      where id = v_item_id and order_id = p_order_id for update;
    if not found then raise exception '주문 상품을 찾을 수 없습니다.'; end if;

    v_active_remaining := v_oi.quantity - coalesce(v_oi.cancelled_quantity, 0);
    if v_qty > v_active_remaining then
      raise exception '취소 수량이 남은 수량을 초과합니다.';
    end if;

    update public.order_items
      set cancelled_quantity = coalesce(cancelled_quantity, 0) + v_qty
      where id = v_item_id;

    -- 옵션 재고 복원(재고 추적 상품만).
    if v_oi.variant_id is not null then
      update public.product_variants
        set stock = stock + v_qty
        where id = v_oi.variant_id and stock is not null;
    end if;
  end loop;

  -- 전부 취소 방지: 최소 1개 활성 상품이 남아야 한다.
  select coalesce(sum(quantity - coalesce(cancelled_quantity, 0)), 0)
    into v_total_active_after
    from public.order_items where order_id = p_order_id;
  if v_total_active_after <= 0 then
    raise exception '마지막 상품은 부분취소할 수 없습니다. 전체 주문 취소를 사용하세요.';
  end if;

  -- 주문 금액/상태 갱신.
  update public.orders
    set refunded_amount    = coalesce(refunded_amount, 0) + greatest(coalesce(p_card_refund, 0), 0),
        points_refunded    = coalesce(points_refunded, 0) + greatest(coalesce(p_points_return, 0), 0),
        shipping_reclaimed = shipping_reclaimed or (coalesce(p_shipping_reclaim, 0) > 0),
        payment_status     = 'partially_refunded'
    where id = p_order_id;

  -- 포인트 반환(회원 주문만).
  if coalesce(p_points_return, 0) > 0 and v_order.user_id is not null then
    perform public._apply_points(v_order.user_id, p_points_return, 'refund_partial', '부분취소 포인트 반환', p_order_id, null);
  end if;

  return jsonb_build_object('ok', true, 'active_remaining', v_total_active_after);
end $$;

revoke all on function public.partial_cancel_order(uuid, jsonb, integer, integer, integer) from public;
grant execute on function public.partial_cancel_order(uuid, jsonb, integer, integer, integer) to authenticated;
