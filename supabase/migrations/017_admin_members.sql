-- 017_admin_members.sql
--
-- 회원 관리(P1-C): 관리자용 회원 목록/상세 조회 함수.
-- 이메일은 auth.users에만 있어 PostgREST로 직접 못 읽으므로 SECURITY DEFINER 함수로 노출.
-- 두 함수 모두 내부에서 is_admin()을 검사한다(관리자만 호출 가능).

-- ── 회원 목록(검색: 이름·이메일·전화) + 주문 집계 ──────────
create or replace function public.admin_list_members(p_q text default null)
returns table (
  id               uuid,
  email            text,
  name             text,
  phone            text,
  marketing_agreed boolean,
  role             text,
  created_at       timestamptz,
  order_count      bigint,
  total_spent      bigint
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
         p.marketing_agreed,
         p.role,
         p.created_at,
         coalesce(o.cnt, 0)::bigint   as order_count,
         coalesce(o.spent, 0)::bigint as total_spent
  from public.profiles p
  join auth.users u on u.id = p.id
  left join (
    select user_id, count(*) as cnt, sum(total_amount) as spent
    from public.orders
    where payment_status = 'paid'
    group by user_id
  ) o on o.user_id = p.id
  where p_q is null or btrim(p_q) = ''
     or p.name  ilike '%' || p_q || '%'
     or u.email ilike '%' || p_q || '%'
     or p.phone ilike '%' || p_q || '%'
  order by p.created_at desc;
end;
$$;

-- ── 회원 단건(상세용) ──────────────────────────────────────
create or replace function public.admin_get_member(p_id uuid)
returns table (
  id               uuid,
  email            text,
  name             text,
  phone            text,
  birthday         date,
  marketing_agreed boolean,
  role             text,
  created_at       timestamptz
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
         p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_id;
end;
$$;

revoke all on function public.admin_list_members(text) from public;
revoke all on function public.admin_get_member(uuid) from public;
grant execute on function public.admin_list_members(text) to authenticated;
grant execute on function public.admin_get_member(uuid)  to authenticated;

-- Rollback:
--   drop function if exists public.admin_list_members(text);
--   drop function if exists public.admin_get_member(uuid);
