-- ============================================================
-- 038_admin_member_tools.sql — 회원 관리 강화 (Phase 3-B)
-- ============================================================
-- ① 관리자가 회원 적립금을 수동 지급/차감(사유 기록) — admin_adjust_points
-- ② 회원별 관리자 메모 — profiles.admin_note + admin_set_member_note
-- ③ admin_get_member가 points·admin_note도 함께 반환
-- 모두 is_admin() 확인. 적립금 증감은 _apply_points(원장 기록·음수 방지) 재사용.
-- ============================================================

alter table public.profiles add column if not exists admin_note text;

-- admin_get_member: points·admin_note 추가 반환
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
  deactivated_at   timestamptz,
  points           integer,
  admin_note       text
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
         p.deactivated_at,
         coalesce(p.points, 0),
         p.admin_note
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_id;
end;
$$;

-- 적립금 수동 조정(+지급 / -차감). 사유는 원장에 기록된다.
create or replace function public.admin_adjust_points(p_user_id uuid, p_amount integer, p_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;
  if p_amount is null or p_amount = 0 then
    raise exception '조정할 포인트를 입력해주세요.';
  end if;
  if abs(p_amount) > 10000000 then
    raise exception '한 번에 조정할 수 있는 범위를 초과했습니다.';
  end if;

  -- _apply_points가 음수 잔액을 막는다(차감이 잔액 초과면 예외).
  v_new := public._apply_points(
    p_user_id,
    p_amount,
    'admin_adjust',
    coalesce(nullif(btrim(p_reason), ''), '관리자 조정'),
    null,
    null
  );
  return v_new;
end;
$$;
grant execute on function public.admin_adjust_points(uuid, integer, text) to authenticated;

-- 회원별 관리자 메모 저장(빈 값이면 null).
create or replace function public.admin_set_member_note(p_user_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;
  update public.profiles
    set admin_note = nullif(btrim(p_note), '')
    where id = p_user_id;
end;
$$;
grant execute on function public.admin_set_member_note(uuid, text) to authenticated;
