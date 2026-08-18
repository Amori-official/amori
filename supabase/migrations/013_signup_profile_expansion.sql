-- 013_signup_profile_expansion.sql
--
-- 회원가입 확장(M2): 생일 컬럼, 가입 시 핸드폰·생일·기본배송지 저장,
-- 마케팅 수신 동의 시 1,000원 쿠폰(MARKETING1000) 자동 발급.
--
-- 규칙(MARKETING1000): 1,000원 정액, 최소주문 10,000원, 발급 후 30일,
-- 신규 가입 시 마케팅 동의한 회원에게만 발급(소급 없음), 주문당 쿠폰 1장(중복 사용 불가).

-- 1) profiles.birthday 추가 (생일쿠폰용 — 지금은 수집만) -------------------
alter table public.profiles add column if not exists birthday date;

-- 2) MARKETING1000 쿠폰 seed ------------------------------------------------
insert into public.coupons (code, name, discount_type, discount_value, min_order_amount, max_discount_amount, valid_days, is_active)
values ('MARKETING1000', '마케팅 수신 동의 1,000원 할인', 'amount', 1000, 10000, null, 30, true)
on conflict (code) do nothing;

-- 3) handle_new_user 확장: 핸드폰·생일 저장 + 기본 배송지 저장 --------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_birthday date;
begin
  begin
    v_birthday := nullif(new.raw_user_meta_data ->> 'birthday', '')::date;
  exception when others then
    v_birthday := null;
  end;

  insert into public.profiles (id, name, phone, marketing_agreed, birthday)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'marketing_agreed')::boolean, false),
    v_birthday
  );

  -- 가입 시 입력한 기본 배송지 저장(주소·우편번호가 있을 때만)
  if coalesce(new.raw_user_meta_data ->> 'address_line1', '') <> ''
     and coalesce(new.raw_user_meta_data ->> 'address_zip', '') <> '' then
    insert into public.addresses (user_id, name, phone, zip_code, address, address_detail, is_default)
    values (
      new.id,
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'address_zip',
      new.raw_user_meta_data ->> 'address_line1',
      nullif(new.raw_user_meta_data ->> 'address_line2', ''),
      true
    );
  end if;

  return new;
end;
$function$;

-- 4) 가입 쿠폰 발급 트리거 확장: 웰컴 + (마케팅 동의 시) 마케팅 쿠폰 ---------
create or replace function public.issue_welcome_coupon()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon record;
begin
  -- 웰컴 쿠폰 (항상)
  select id, valid_days into v_coupon
  from public.coupons where code = 'WELCOME5' and is_active = true limit 1;
  if found then
    insert into public.user_coupons (coupon_id, user_id, expires_at)
    values (v_coupon.id, new.id,
      case when v_coupon.valid_days is null then null else now() + make_interval(days => v_coupon.valid_days) end)
    on conflict (coupon_id, user_id) do nothing;
  end if;

  -- 마케팅 수신 동의 시 마케팅 쿠폰
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

-- (트리거 issue_welcome_coupon_trigger는 011에서 이미 profiles AFTER INSERT에 연결됨 —
--  함수 본문만 교체되므로 트리거 재생성 불필요.)

-- Rollback(검토용): profiles.birthday 유지해도 무방. 트리거 원복은 011/003 본문 재실행.
