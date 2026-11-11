-- ============================================================
-- 050_guest_order_lookup.sql — 비회원 주문조회(주문번호 + 이메일)
-- ============================================================
-- 배경: 비회원 주문(user_id IS NULL)은 로그인이 없어 주문내역/배송추적을
--       확인할 방법이 없었다. 로그인 없이 "주문번호 + 주문 시 이메일"로
--       본인 주문을 조회할 수 있는 읽기 전용 RPC를 추가한다.
--
-- 보안:
--   · 주문번호와 이메일이 "모두" 일치해야만 조회된다(둘 다 없으면 못 봄).
--     주문번호는 ORD+날짜+8자리 hex(고엔트로피)라 이메일과 함께면 열거 불가.
--   · 주문번호 오류/이메일 오류를 구분하지 않는 단일 메시지로 오라클 방지.
--   · SECURITY DEFINER(RLS 우회)지만 조회 전용이며, 상태·배송추적·주문항목만 반환.
--   · anon/authenticated 실행 허용(비회원 포함). 취소/반품 등 변경은 불가.
-- ============================================================

begin;

create or replace function public.lookup_guest_order(
  p_order_number text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_items jsonb;
begin
  if p_order_number is null or length(trim(p_order_number)) = 0
     or p_email is null or length(trim(p_email)) = 0 then
    raise exception '주문번호와 이메일을 입력해주세요.';
  end if;
  if length(p_order_number) > 40 or length(p_email) > 255 then
    raise exception '입력값을 확인해주세요.';
  end if;

  -- 주문번호+이메일이 모두 일치하는 주문 1건(대소문자 무시).
  select id, order_number, order_status, payment_status, fulfillment_status,
         return_status, courier, tracking_number, total_amount, created_at,
         recipient_name
    into v_order
    from public.orders
   where upper(order_number) = upper(trim(p_order_number))
     and lower(buyer_email) = lower(trim(p_email))
   limit 1;

  if not found then
    -- 주문번호/이메일 어느 쪽이 틀렸는지 구분하지 않는다(열거 방지).
    raise exception '일치하는 주문이 없어요. 주문번호와 이메일을 다시 확인해주세요.';
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'product_name', oi.product_name,
               'variant_label', oi.variant_label,
               'quantity', oi.quantity,
               'price', oi.price,
               'image_url', oi.image_url_snapshot
             ) order by oi.id
           ),
           '[]'::jsonb
         )
    into v_items
    from public.order_items oi
   where oi.order_id = v_order.id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'order_status', v_order.order_status,
    'payment_status', v_order.payment_status,
    'fulfillment_status', v_order.fulfillment_status,
    'return_status', v_order.return_status,
    'courier', v_order.courier,
    'tracking_number', v_order.tracking_number,
    'total_amount', v_order.total_amount,
    'created_at', v_order.created_at,
    'recipient_name', v_order.recipient_name,
    'items', v_items
  );
end;
$$;

revoke all on function public.lookup_guest_order(text, text) from public;
grant execute on function public.lookup_guest_order(text, text) to anon, authenticated;

commit;
