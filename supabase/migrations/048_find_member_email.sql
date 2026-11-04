-- ============================================================
-- 048_find_member_email.sql — 이름 + 연락처로 가입 이메일(아이디) 찾기
-- ============================================================
-- 로그인 아이디 = 이메일. 비밀번호 찾기 전에 "내가 어떤 이메일로 가입했지?"를
-- 이름 + 연락처(숫자만 비교)로 조회한다.
-- 개인정보 보호: 함수가 '마스킹된' 이메일만 반환한다(ab****@gmail.com).
--   → REST로 직접 호출해도 전체 이메일은 노출되지 않는다.
-- 탈퇴(비활성) 계정은 제외.
-- ============================================================

begin;

create or replace function public.find_member_email(p_name text, p_phone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_local text;
  v_domain text;
begin
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_phone), '') = '' then
    return null;
  end if;

  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where btrim(p.name) = btrim(p_name)
    and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g')
        = regexp_replace(p_phone, '[^0-9]', '', 'g')
    and p.deactivated_at is null
    and u.email is not null
  order by p.created_at
  limit 1;

  if v_email is null then return null; end if;

  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);

  -- 로컬파트 마스킹(도메인은 그대로 — 제공업체 식별용).
  return case
    when length(v_local) <= 2 then left(v_local, 1) || '****' || '@' || v_domain
    else left(v_local, 2) || repeat('*', length(v_local) - 2) || '@' || v_domain
  end;
end $$;

revoke all on function public.find_member_email(text, text) from public;
grant execute on function public.find_member_email(text, text) to anon, authenticated;

commit;
