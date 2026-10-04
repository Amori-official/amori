-- ============================================================
-- 030_review_block_cancelled.sql — 취소/환불 주문 리뷰 차단
-- ============================================================
-- 문제: 배송완료 후 주문이 취소/환불되어도 fulfillment_status는 'delivered'로
--       남아 있어, create_review가 리뷰 작성을 허용했다.
-- 수정: order_status = 'cancelled' 주문은 리뷰 작성 불가(명확한 메시지 포함).
-- (028의 create_review에 취소 주문 제외 조건만 추가.)
-- ============================================================

create or replace function public.create_review(
  p_product_id uuid,
  p_order_id uuid,
  p_rating int,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_review_id uuid;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception '별점은 1~5 사이로 선택해주세요.';
  end if;
  if coalesce(btrim(p_content), '') = '' then
    raise exception '리뷰 내용을 입력해주세요.';
  end if;

  -- 취소된 주문은 리뷰 작성 불가(명확한 안내).
  if exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.user_id = v_uid and o.order_status = 'cancelled'
  ) then
    raise exception '취소된 주문은 리뷰를 작성할 수 없습니다.';
  end if;

  -- 구매 검증: 본인의 '배송 완료' + 취소되지 않은 주문에 해당 상품이 포함돼 있어야 한다.
  if not exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.id = p_order_id
      and o.user_id = v_uid
      and o.order_status <> 'cancelled'
      and o.fulfillment_status = 'delivered'
      and oi.product_id = p_product_id
  ) then
    raise exception '배송 완료된 주문의 상품만 리뷰를 작성할 수 있습니다.';
  end if;

  if exists (
    select 1 from public.reviews where user_id = v_uid and product_id = p_product_id
  ) then
    raise exception '이미 이 상품에 리뷰를 작성하셨습니다.';
  end if;

  insert into public.reviews (user_id, product_id, order_id, rating, content)
  values (v_uid, p_product_id, p_order_id, p_rating, btrim(p_content))
  returning id into v_review_id;

  update public.products p set
    review_count = (select count(*) from public.reviews r where r.product_id = p_product_id),
    rating       = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.product_id = p_product_id)
  where p.id = p_product_id;

  perform public._apply_points(v_uid, 500, 'earn_review', '리뷰 작성 적립', p_order_id, v_review_id);

  return v_review_id;
end $$;

grant execute on function public.create_review(uuid, uuid, int, text) to authenticated;
