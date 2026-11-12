-- ============================================================
-- 051_visit_range.sql — 기간별 방문자 집계(관리자 통계용)
-- ============================================================
-- 배경: 통계 페이지를 "일/주/월 기간 선택" 방식으로 바꾸면서, 선택한 기간의
--       방문자수가 필요하다. site_visits는 RLS로 잠겨 있어 SECURITY DEFINER
--       함수로만 접근 가능하므로, 임의 기간[start, end) 집계 함수를 추가한다.
--
--   · admin_visit_range(p_start date, p_end date): [p_start, p_end) 구간(끝 미포함)의
--     순 방문자(기간 내 중복 제거)와 페이지뷰 합. is_admin()만 호출 가능.
--   · 날짜는 site_visits.day(KST 달력일)와 동일 기준.
--
-- RLS/권한: 기존과 동일(authenticated 실행, 내부 is_admin 체크). 롤백: drop function.
-- ============================================================

begin;

create or replace function public.admin_visit_range(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unique integer;
  v_views  integer;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  select count(distinct visitor_id), coalesce(sum(views), 0)
    into v_unique, v_views
    from public.site_visits
   where day >= p_start and day < p_end;  -- 끝 날짜 미포함

  return jsonb_build_object(
    'unique', coalesce(v_unique, 0),
    'views',  coalesce(v_views, 0)
  );
end;
$$;

revoke all on function public.admin_visit_range(date, date) from public;
grant execute on function public.admin_visit_range(date, date) to authenticated;

commit;
