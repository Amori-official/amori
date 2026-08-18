-- 014_coupon_code_redeem.sql
--
-- (1) WELCOME5 유효기간 30일 → 7일 (이후 발급분부터 적용. 이미 발급된 쿠폰의
--     expires_at은 변경하지 않는다.)
-- (2) 쿠폰 코드 등록 기능: 사용자가 코드를 입력해 쿠폰을 자기 계정으로 받는다.
--     아무 쿠폰이나 코드로 받지 못하도록 code_redeemable 플래그를 두고,
--     자동발급 쿠폰(WELCOME5/MARKETING1000)은 false로 둔다.
--     발급은 redeem_coupon() SECURITY DEFINER RPC로만(사용자 직접 INSERT 불가, RLS 유지).

-- (1) WELCOME5 유효기간 변경 ------------------------------------------------
update public.coupons set valid_days = 7 where code = 'WELCOME5';

-- (2) code_redeemable 플래그 ------------------------------------------------
alter table public.coupons add column if not exists code_redeemable boolean not null default false;

-- 자동발급 쿠폰은 코드 등록 불가로 명시(기본값 false지만 재확인)
update public.coupons set code_redeemable = false where code in ('WELCOME5', 'MARKETING1000');

-- 예시: 카카오톡 채널 추가 3,000원 쿠폰 (코드 등록 방식) — 규칙은 추후 조정 가능
insert into public.coupons (code, name, discount_type, discount_value, min_order_amount, max_discount_amount, valid_days, is_active, code_redeemable)
values ('KAKAO3000', '카카오톡 채널 추가 3,000원 할인', 'amount', 3000, 10000, null, 30, true, true)
on conflict (code) do nothing;

-- (3) 코드로 쿠폰 등록 RPC --------------------------------------------------
create or replace function public.redeem_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_coupon record;
begin
  if v_user_id is null then
    raise exception '로그인 후 이용해주세요.';
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    raise exception '쿠폰 코드를 입력해주세요.';
  end if;

  select id, name, valid_days, is_active, code_redeemable
  into v_coupon
  from public.coupons
  where upper(code) = upper(trim(p_code));

  if not found or v_coupon.is_active is not true or v_coupon.code_redeemable is not true then
    raise exception '유효하지 않은 쿠폰 코드입니다.';
  end if;

  if exists (
    select 1 from public.user_coupons where coupon_id = v_coupon.id and user_id = v_user_id
  ) then
    raise exception '이미 등록된 쿠폰입니다.';
  end if;

  insert into public.user_coupons (coupon_id, user_id, expires_at)
  values (
    v_coupon.id,
    v_user_id,
    case when v_coupon.valid_days is null then null else now() + make_interval(days => v_coupon.valid_days) end
  );

  return jsonb_build_object('name', v_coupon.name);
end;
$$;

revoke all on function public.redeem_coupon(text) from public;
grant execute on function public.redeem_coupon(text) to authenticated;

-- Rollback(검토용): drop function if exists public.redeem_coupon(text);
--   alter table public.coupons drop column if exists code_redeemable;
--   update public.coupons set valid_days = 30 where code = 'WELCOME5';
