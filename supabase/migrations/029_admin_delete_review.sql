-- ============================================================
-- 029_admin_delete_review.sql — 관리자 리뷰 삭제 (Phase 2-A)
-- ============================================================
-- 부적절한 리뷰를 관리자가 삭제할 수 있게 한다.
--  · reviews의 SELECT는 공개(전체 조회)라 목록은 별도 RPC 없이 조회 가능.
--  · DELETE는 '본인만' 정책이라, 관리자가 임의 리뷰를 지우려면 이 RPC 사용.
--  · 삭제 후 해당 상품의 평점/리뷰수 집계를 재계산한다.
-- 참고(정책): 삭제해도 작성 시 지급된 500P는 회수하지 않는다(이미 지급된 적립).
-- ============================================================

create or replace function public.admin_delete_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  select product_id into v_product_id from public.reviews where id = p_review_id;
  if not found then
    return;
  end if;

  delete from public.reviews where id = p_review_id;

  update public.products p set
    review_count = (select count(*) from public.reviews r where r.product_id = v_product_id),
    rating       = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.product_id = v_product_id)
  where p.id = v_product_id;
end $$;

grant execute on function public.admin_delete_review(uuid) to authenticated;
