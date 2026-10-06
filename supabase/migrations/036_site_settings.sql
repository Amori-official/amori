-- ============================================================
-- 036_site_settings.sql — 사이트 콘텐츠(팝업 공지 + 상단 공지바) 관리
-- ============================================================
-- 관리자가 코드 수정 없이 (1) 사이트 공지 팝업, (2) 상단 공지바(마퀴) 문구를
-- 직접 올리고 내릴 수 있게 한다. 단일 행(id='default') 설정 테이블.
-- 공개 읽기(사이트 렌더용) + 관리자만 쓰기.
-- ============================================================

create table if not exists public.site_settings (
  id              text primary key default 'default',
  -- 상단 공지바(마퀴) 항목: [{ "text": "...", "href": "", "action": "signup"|null }]
  marquee_items   jsonb not null default '[]'::jsonb,
  -- 팝업 공지
  popup_enabled    boolean not null default false,
  popup_title      text,
  popup_body       text,
  popup_image_url  text,
  popup_link_url   text,
  popup_link_label text,
  popup_starts_at  timestamptz,
  popup_ends_at    timestamptz,
  updated_at       timestamptz not null default now(),
  constraint site_settings_singleton check (id = 'default')
);

-- 현재 하드코딩 문구를 그대로 초기값으로 시드(동작 유지).
insert into public.site_settings (id, marquee_items)
values (
  'default',
  '[{"text":"회원 가입 시, 5% 할인 쿠폰 증정","href":"","action":"signup"},
    {"text":"카카오톡 채널 추가 시, 3,000원 할인 쿠폰 증정","href":"https://pf.kakao.com/_dDmTX/friend","action":null}]'::jsonb
)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "site_settings public read" on public.site_settings;
create policy "site_settings public read" on public.site_settings
  for select using (true);

drop policy if exists "site_settings admin write" on public.site_settings;
create policy "site_settings admin write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- updated_at 자동 갱신(공용 트리거 함수 set_updated_at 재사용).
drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();
