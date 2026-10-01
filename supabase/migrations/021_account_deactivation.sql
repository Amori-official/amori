-- 021_account_deactivation.sql
--
-- 회원 소프트 탈퇴(PC5): profiles.deactivated_at 추가.
-- · 고객 본인 탈퇴 / 관리자 탈퇴 처리 모두 set_account_deactivated()로 수행(권한 내부 검증).
-- · 로그인 차단은 앱(signIn)에서 deactivated_at 확인 후 자동 로그아웃으로 처리(서버).
-- · 주문/정산 기록 보존을 위해 계정/데이터는 삭제하지 않고 비활성화만 한다.

alter table public.profiles add column if not exists deactivated_at timestamptz;

-- 본인(auth.uid()==p_user_id) 또는 관리자만 호출 가능.
create or replace function public.set_account_deactivated(p_user_id uuid, p_deactivated boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  if v_uid is distinct from p_user_id and not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;
  update public.profiles
    set deactivated_at = case when p_deactivated then now() else null end
    where id = p_user_id;
end;
$$;

revoke all on function public.set_account_deactivated(uuid, boolean) from public;
grant execute on function public.set_account_deactivated(uuid, boolean) to authenticated;

-- admin_get_member에 deactivated_at 추가 (반환 컬럼 변경 → drop 후 재생성)
drop function if exists public.admin_get_member(uuid);

create or replace function public.admin_get_member(p_id uuid)
returns table (
  id               uuid,
  email            text,
  name             text,
  phone            text,
  birthday         date,
  marketing_agreed boolean,
  role             text,
  created_at       timestamptz,
  deactivated_at   timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return query
  select p.id,
         u.email::text,
         p.name,
         p.phone,
         p.birthday,
         p.marketing_agreed,
         p.role,
         p.created_at,
         p.deactivated_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_id;
end;
$$;

revoke all on function public.admin_get_member(uuid) from public;
grant execute on function public.admin_get_member(uuid) to authenticated;

-- Rollback:
--   drop function if exists public.set_account_deactivated(uuid, boolean);
--   alter table public.profiles drop column if exists deactivated_at;
