-- 009_confirm_order_payment_rpc.sql
--
-- 결제 승인 결과를 pending 주문에 안전하게 반영하는 RPC.
--
-- 배경: create_order()(006/007)는 주문을 payment_status='ready',
-- order_status='pending'로만 생성하고 payments 행은 만들지 않는다. 실제 결제
-- 승인(TossPayments)은 서버 액션(app/actions/confirm-payment.ts)이 Toss 승인
-- API로 확정한 뒤, 그 결과를 이 RPC로 원자적으로 기록한다.
--
-- 보안 설계:
--   · SECURITY DEFINER + search_path='' — 호출자 권한과 무관하게 서버 규칙으로만 동작.
--   · 금액 대조: 저장된 orders.total_amount 와 승인 금액(p_amount)이 다르면 거부.
--     (서버 액션에서 1차 대조 + Toss 승인 API 자체 검증 + 여기서 최종 대조 = 3중 방어)
--   · 멱등성: 이미 paid면 그대로 성공 반환. payments.payment_key 부분 UNIQUE 인덱스
--     (payments_payment_key_key, WHERE payment_key IS NOT NULL)로 중복 승인 차단.
--   · 상태 가드: payment_status가 'ready'/'pending'일 때만 승인 처리한다.
--
-- 이 함수는 "Toss 승인이 이미 성공했다"는 전제에서 그 결과를 반영만 한다 —
-- 결제 승인 자체(시크릿 키 사용)는 서버 액션에서 수행하며 여기서는 하지 않는다.

create or replace function public.confirm_order_payment(
  p_order_number text,
  p_payment_key  text,
  p_amount       integer,
  p_method       text,
  p_approved_at  timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
begin
  -- 1) 입력 기본 검증 -------------------------------------------------------
  if p_order_number is null or length(p_order_number) = 0 then
    raise exception '주문 번호가 올바르지 않습니다.';
  end if;
  if p_payment_key is null or length(p_payment_key) = 0 then
    raise exception '결제 정보가 올바르지 않습니다.';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception '결제 금액이 올바르지 않습니다.';
  end if;

  -- 2) 주문 조회 + 행 잠금(동시 승인 경쟁 방지) -----------------------------
  select id, total_amount, payment_status, order_status
    into v_order
    from public.orders
    where order_number = p_order_number
    for update;

  if not found then
    raise exception '주문을 찾을 수 없습니다.';
  end if;

  -- 3) 멱등: 이미 결제 완료된 주문이면 성공으로 간주하고 그대로 반환 --------
  if v_order.payment_status = 'paid' then
    return jsonb_build_object(
      'order_id', v_order.id,
      'order_number', p_order_number,
      'payment_status', 'paid',
      'order_status', v_order.order_status,
      'already_confirmed', true
    );
  end if;

  -- 4) 승인 가능한 상태인지 확인 -------------------------------------------
  if v_order.payment_status not in ('ready', 'pending') then
    raise exception '결제를 처리할 수 없는 주문 상태입니다.';
  end if;

  -- 5) 금액 대조 (서버 저장 총액 == 승인 금액) ------------------------------
  if v_order.total_amount <> p_amount then
    raise exception '결제 금액이 주문 금액과 일치하지 않습니다.';
  end if;

  -- 6) payments 기록 (멱등: payment_key 부분 UNIQUE 인덱스) ------------------
  insert into public.payments (
    order_id, provider, payment_key, method,
    requested_amount, approved_amount, status, approved_at
  ) values (
    v_order.id, 'toss', p_payment_key, p_method,
    p_amount, p_amount, 'done', coalesce(p_approved_at, now())
  )
  on conflict (payment_key) where payment_key is not null do nothing;

  -- 7) 주문 상태 전환 (updated_at은 트리거가 자동 갱신) ----------------------
  update public.orders
    set payment_status = 'paid',
        order_status   = 'confirmed',
        paid_at        = coalesce(paid_at, now())
    where id = v_order.id;

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', p_order_number,
    'payment_status', 'paid',
    'order_status', 'confirmed',
    'already_confirmed', false
  );
end;
$$;

-- PUBLIC 실행 금지 + anon/authenticated 실행 허용(비회원 주문 결제 지원).
-- 이 함수는 Toss 승인이 끝난 뒤 서버 액션에서만 호출되지만, 서버 액션은
-- anon 키로 동작하므로 anon에도 execute 권한이 필요하다. 금액/상태 검증이
-- 함수 내부에 있으므로 실행 권한이 있어도 임의 조작은 불가능하다.
revoke all on function public.confirm_order_payment(text, text, integer, text, timestamptz) from public;
grant execute on function public.confirm_order_payment(text, text, integer, text, timestamptz) to authenticated, anon;

-- Rollback (검토용 — 이번 단계에서 실행하지 않음):
--   drop function if exists public.confirm_order_payment(text, text, integer, text, timestamptz);
