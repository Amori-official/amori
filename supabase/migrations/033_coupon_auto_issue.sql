-- ============================================================
-- 033_coupon_auto_issue.sql — 가입 시 자동발급 플래그(기간 내)
-- ============================================================
-- 요청: OPENING(오픈 이벤트) 쿠폰도 '회원가입 시 자동 발급', 단 이벤트 기간 내에만.
-- 방식: 쿠폰별 auto_issue_on_signup 플래그 추가 → 가입 트리거가 플래그 ON이고
--       아직 종료되지 않은(ends_at) 쿠폰을 신규 가입자에게 자동 발급한다.
--   · 기존 WELCOME5(항상 자동발급)는 플래그 ON으로 이관(동작 동일).
--   · MARKETING1000은 '마케팅 동의' 조건부라 플래그와 별개로 기존 로직 유지.
--   · 발급 만료일 = 유효일수 기준과 이벤트 종료일 중 이른 날짜.
-- 주의: 트리거는 '신규 가입(profiles insert)' 시에만 동작 — 기존 회원 소급 발급 아님.
-- ============================================================

alter table public.coupons add column if not exists auto_issue_on_signup boolean not null default false;

-- 기존 자동발급(WELCOME5)을 플래그로 이관 + 오픈 이벤트 쿠폰 자동발급 켜기.
update public.coupons set auto_issue_on_signup = true where code in ('WELCOME5', 'OPENING');

create or replace function public.issue_welcome_coupon()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon record;
  v_expires timestamptz;
begin
  -- 1) 가입 시 자동발급 쿠폰(기간 내) — auto_issue_on_signup 플래그 기준.
  for v_coupon in
    select id, valid_days, ends_at
    from public.coupons
    where auto_issue_on_signup = true
      and is_active = true
      and (ends_at is null or ends_at > now())
  loop
    v_expires := case when v_coupon.valid_days is null then null
                      else now() + make_interval(days => v_coupon.valid_days) end;
    if v_coupon.ends_at is not null then
      v_expires := case when v_expires is null then v_coupon.ends_at
                        else least(v_expires, v_coupon.ends_at) end;
    end if;
    insert into public.user_coupons (coupon_id, user_id, expires_at)
    values (v_coupon.id, new.id, v_expires)
    on conflict (coupon_id, user_id) do nothing;
  end loop;

  -- 2) 마케팅 수신 동의 시 마케팅 쿠폰 (조건부 — 플래그와 별개로 유지).
  if new.marketing_agreed is true then
    select id, valid_days into v_coupon
    from public.coupons where code = 'MARKETING1000' and is_active = true limit 1;
    if found then
      insert into public.user_coupons (coupon_id, user_id, expires_at)
      values (v_coupon.id, new.id,
        case when v_coupon.valid_days is null then null else now() + make_interval(days => v_coupon.valid_days) end)
      on conflict (coupon_id, user_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- (트리거 issue_welcome_coupon_trigger는 011에서 profiles AFTER INSERT에 연결됨 — 함수만 교체.)
