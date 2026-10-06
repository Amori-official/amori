-- ============================================================
-- 041_visit_stats.sql — 방문자 수 집계(운영진 전용)
-- ============================================================
-- 목적: 일 방문자수 / 총 방문자수를 관리자 통계에서 볼 수 있게 한다.
--   · site_visits: (날짜, 방문자ID) 1행 — 같은 방문자가 하루에 여러 번 봐도 1명으로 집계,
--     페이지뷰(views)는 누적. 방문자ID는 브라우저 localStorage의 익명 uuid(개인정보 아님).
--   · log_visit(uuid): 페이지 조회 시 호출(비회원 포함). 하루 단위로 upsert.
--   · admin_visit_stats(): 오늘/누적 방문자·페이지뷰 + 최근 7일. is_admin()만.
--
-- 날짜 기준: 한국시간(Asia/Seoul)의 날짜로 집계한다.
-- RLS: site_visits는 공개 읽기 없음(정책 없음) → SECURITY DEFINER 함수로만 접근.
-- 롤백: drop function admin_visit_stats(); drop function log_visit(uuid); drop table site_visits;
-- ============================================================

begin;

create table if not exists public.site_visits (
  day        date        not null,
  visitor_id uuid        not null,
  views      integer     not null default 0,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  primary key (day, visitor_id)
);

-- 조회 성능(날짜별 집계)용 인덱스.
create index if not exists site_visits_day_idx on public.site_visits (day);

alter table public.site_visits enable row level security;
-- 정책을 두지 않음 → anon/authenticated의 직접 접근 차단. 아래 함수(SECURITY DEFINER)로만 읽고 쓴다.

-- ── 방문 기록(비회원 포함) ──
create or replace function public.log_visit(p_visitor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Seoul')::date;
begin
  if p_visitor_id is null then
    return; -- 조용히 무시(잘못된 호출이 흐름을 막지 않음)
  end if;

  insert into public.site_visits (day, visitor_id, views)
  values (v_day, p_visitor_id, 1)
  on conflict (day, visitor_id)
  do update set views = site_visits.views + 1,
                last_at = now();
end;
$$;

revoke all on function public.log_visit(uuid) from public;
grant execute on function public.log_visit(uuid) to anon, authenticated;

-- ── 방문 통계(관리자) ──
create or replace function public.admin_visit_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_result jsonb;
  v_daily jsonb;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;

  -- 최근 7일(오늘 포함) 일자별 방문자/페이지뷰
  select coalesce(jsonb_agg(rec order by rec->>'day'), '[]'::jsonb) into v_daily
  from (
    select jsonb_build_object(
             'day', to_char(d.day, 'YYYY-MM-DD'),
             'unique', coalesce(s.u, 0),
             'views',  coalesce(s.v, 0)
           ) as rec
    from generate_series(v_today - 6, v_today, interval '1 day') as d(day)
    left join (
      select day, count(*) as u, sum(views) as v
      from public.site_visits
      group by day
    ) s on s.day = d.day::date
  ) t;

  select jsonb_build_object(
    'today_unique',  (select count(*) from public.site_visits where day = v_today),
    'today_views',   (select coalesce(sum(views), 0) from public.site_visits where day = v_today),
    'total_unique',  (select count(distinct visitor_id) from public.site_visits),
    'total_views',   (select coalesce(sum(views), 0) from public.site_visits),
    'daily', v_daily
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_visit_stats() from public;
grant execute on function public.admin_visit_stats() to authenticated;

commit;
