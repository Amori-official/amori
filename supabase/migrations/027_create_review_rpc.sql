-- ============================================================
-- 027_create_review_rpc.sql — 구매 고객 리뷰 작성(1b)
-- ============================================================
-- 마이페이지 '배송 완료' 주문에서 리뷰를 작성할 수 있게 한다.
--  · reviews 테이블은 이미 존재(UNIQUE(user_id,product_id), 본인 INSERT RLS).
--  · 여기서는 (1) 어떤 주문에서 작성했는지 order_id 기록 컬럼 추가,
--    (2) '배송완료 + 본인 주문 + 해당 상품 포함' 을 검증하고 평점 집계까지
--       갱신하는 create_review() RPC(SECURITY DEFINER)를 추가한다.
-- 적립금(포인트)은 아직 미구현 — UI에는 문구만 노출하고 실제 지급은 Phase 3.
-- ============================================================

-- 어떤 주문에서 작성한 리뷰인지 기록(검증된 구매 연결). 상품당 1리뷰 제약은 그대로.
alter table public.reviews add column if not exists order_id uuid references public.orders(id) on delete set null;

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

  -- 구매 검증: 본인의 '배송 완료' 주문에 해당 상품이 포함돼 있어야 한다.
  if not exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.id = p_order_id
      and o.user_id = v_uid
      and o.fulfillment_status = 'delivered'
      and oi.product_id = p_product_id
  ) then
    raise exception '배송 완료된 주문의 상품만 리뷰를 작성할 수 있습니다.';
  end if;

  -- 중복 방지(상품당 1리뷰). UNIQUE 제약과 함께 친절한 메시지를 위해 선검사.
  if exists (
    select 1 from public.reviews where user_id = v_uid and product_id = p_product_id
  ) then
    raise exception '이미 이 상품에 리뷰를 작성하셨습니다.';
  end if;

  insert into public.reviews (user_id, product_id, order_id, rating, content)
  values (v_uid, p_product_id, p_order_id, p_rating, btrim(p_content))
  returning id into v_review_id;

  -- 상품 평점/리뷰수 집계 갱신(상품 카드·상세에 반영).
  update public.products p set
    review_count = (select count(*) from public.reviews r where r.product_id = p_product_id),
    rating       = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.product_id = p_product_id)
  where p.id = p_product_id;

  return v_review_id;
end $$;

grant execute on function public.create_review(uuid, uuid, int, text) to authenticated;
