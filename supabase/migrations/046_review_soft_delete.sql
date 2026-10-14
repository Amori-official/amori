-- ============================================================
-- 046_review_soft_delete.sql — 리뷰 삭제 개선(사유 + 포인트 회수 + 재작성 차단)
-- ============================================================
-- 문제:
--   · 기존 admin_delete_review는 리뷰를 '하드 삭제' → 고객이 같은 상품을 다시 리뷰 가능
--     → 포인트 이중 지급. 또 삭제해도 적립 포인트가 회수되지 않았다.
-- 해결:
--   1) reviews에 deleted_at / deleted_reason 추가(소프트 삭제).
--      소프트 삭제된 행은 남아있어 '이미 작성함' 검사가 유지됨 → 재작성·재적립 차단.
--   2) admin_delete_review(review_id, reason, recover_points):
--        · deleted_at/deleted_reason 기록(하드 삭제 대신)
--        · 평점/리뷰수 재계산(삭제 제외)
--        · recover_points=true면 그 리뷰로 적립된 포인트를 회수(잔액 한도 내).
--   (공개/관리자 리뷰 목록은 코드에서 deleted_at is null만 노출)
--
-- 롤백: drop function admin_delete_review(uuid,text,boolean); 029 재실행;
--       alter table reviews drop column deleted_at, drop column deleted_reason;
-- ============================================================

begin;

alter table public.reviews
  add column if not exists deleted_at     timestamptz,
  add column if not exists deleted_reason text;

drop function if exists public.admin_delete_review(uuid);

create or replace function public.admin_delete_review(
  p_review_id uuid,
  p_reason text,
  p_recover_points boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
  v_user_id uuid;
  v_deleted timestamptz;
  v_earned int;
  v_balance int;
  v_deduct int;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  select product_id, user_id, deleted_at
    into v_product_id, v_user_id, v_deleted
    from public.reviews where id = p_review_id;
  if not found then return; end if;
  if v_deleted is not null then return; end if; -- 이미 삭제됨(중복 회수 방지)

  update public.reviews
    set deleted_at = now(),
        deleted_reason = nullif(left(coalesce(p_reason, ''), 300), '')
    where id = p_review_id;

  -- 평점/리뷰수 재계산(삭제된 리뷰 제외)
  update public.products p set
    review_count = (select count(*) from public.reviews r
                     where r.product_id = v_product_id and r.deleted_at is null),
    rating       = (select round(avg(r.rating)::numeric, 1) from public.reviews r
                     where r.product_id = v_product_id and r.deleted_at is null)
  where p.id = v_product_id;

  -- 포인트 회수(옵션): 이 리뷰로 적립된 만큼 차감(보유 잔액 한도 내, 음수 방지).
  if p_recover_points then
    select coalesce(sum(amount), 0) into v_earned
      from public.point_transactions
      where review_id = p_review_id and type = 'earn_review';
    if v_earned > 0 then
      select coalesce(points, 0) into v_balance from public.profiles where id = v_user_id;
      v_deduct := least(v_earned, v_balance);
      if v_deduct > 0 then
        perform public._apply_points(
          v_user_id, -v_deduct, 'admin_adjust',
          '리뷰 삭제 포인트 회수' ||
            case when coalesce(p_reason, '') <> '' then ' (' || left(p_reason, 80) || ')' else '' end,
          null, p_review_id
        );
      end if;
    end if;
  end if;
end $$;

grant execute on function public.admin_delete_review(uuid, text, boolean) to authenticated;

commit;
