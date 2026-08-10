-- 011_coupons.sql
--
-- 쿠폰 시스템 (C1: 정의 테이블 + 사용자 발급 + 가입 시 자동 발급 + WELCOME5 seed).
-- 결제 시 할인 적용(create_order RPC 수정)은 C2에서 진행한다.
--
-- 규칙(웰컴 쿠폰): 5% 정률, 최소주문 10,000원, 최대할인 상한 없음, 발급 후 30일,
-- 신규 가입자에게만 자동 발급(기존 가입자 소급 없음), 주문당 1장.

-- 1) coupons: 쿠폰 정의 -----------------------------------------------------
create table if not exists public.coupons (
  id                  uuid default uuid_generate_v4() primary key,
  code                text unique not null,
  name                text not null,
  discount_type       text not null check (discount_type in ('percent', 'amount')),
  discount_value      integer not null check (discount_value >= 0),   -- percent: 0~100, amount: 원
  min_order_amount    integer not null default 0 check (min_order_amount >= 0),
  max_discount_amount integer check (max_discount_amount is null or max_discount_amount >= 0),
  valid_days          integer,   -- 발급일로부터 유효일수. null이면 무기한
  is_active           boolean not null default true,
  created_at          timestamptz default now()
);

-- 2) user_coupons: 사용자별 발급/사용 ---------------------------------------
create table if not exists public.user_coupons (
  id            uuid default uuid_generate_v4() primary key,
  coupon_id     uuid references public.coupons(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  status        text not null default 'active' check (status in ('active', 'used', 'expired')),
  issued_at     timestamptz not null default now(),
  expires_at    timestamptz,
  used_at       timestamptz,
  used_order_id uuid references public.orders(id) on delete set null,
  created_at    timestamptz default now(),
  unique (coupon_id, user_id)   -- 같은 쿠폰은 유저당 1장 (중복 발급 방지)
);

create index if not exists user_coupons_user_id_idx on public.user_coupons (user_id);

-- 3) RLS -------------------------------------------------------------------
alter table public.coupons enable row level security;
alter table public.user_coupons enable row level security;

drop policy if exists "coupons public read" on public.coupons;
create policy "coupons public read" on public.coupons for select
  using (is_active = true or public.is_admin());

drop policy if exists "coupons admin write" on public.coupons;
create policy "coupons admin write" on public.coupons for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "user_coupons own read" on public.user_coupons;
create policy "user_coupons own read" on public.user_coupons for select
  using (user_id = auth.uid() or public.is_admin());

-- 발급은 트리거(SECURITY DEFINER)로, 사용 처리는 create_order RPC(SECURITY DEFINER)로만.
-- 사용자 직접 INSERT/UPDATE는 막고, 관리자만 수동 관리 가능.
drop policy if exists "user_coupons admin write" on public.user_coupons;
create policy "user_coupons admin write" on public.user_coupons for all
  using (public.is_admin()) with check (public.is_admin());

-- 4) WELCOME5 쿠폰 seed -----------------------------------------------------
insert into public.coupons (code, name, discount_type, discount_value, min_order_amount, max_discount_amount, valid_days, is_active)
values ('WELCOME5', '신규 가입 5% 할인', 'percent', 5, 10000, null, 30, true)
on conflict (code) do nothing;

-- 5) 가입 시 자동 발급 트리거 (신규 profiles insert 시) -----------------------
-- 기존 가입자는 이미 profiles가 있으므로 이 트리거가 발동하지 않는다(소급 발급 없음).
create or replace function public.issue_welcome_coupon()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon record;
begin
  select id, valid_days into v_coupon
  from public.coupons
  where code = 'WELCOME5' and is_active = true
  limit 1;

  if found then
    insert into public.user_coupons (coupon_id, user_id, expires_at)
    values (
      v_coupon.id,
      new.id,
      case
        when v_coupon.valid_days is null then null
        else now() + make_interval(days => v_coupon.valid_days)
      end
    )
    on conflict (coupon_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists issue_welcome_coupon_trigger on public.profiles;
create trigger issue_welcome_coupon_trigger
  after insert on public.profiles
  for each row execute function public.issue_welcome_coupon();

-- Rollback (검토용 — 실행하지 않음):
--   drop trigger if exists issue_welcome_coupon_trigger on public.profiles;
--   drop function if exists public.issue_welcome_coupon();
--   drop table if exists public.user_coupons;
--   drop table if exists public.coupons;
