-- 019_admin_members_pagination.sql
--
-- 회원 관리 페이지네이션(Phase 1 재점검): admin_list_members에 p_limit/p_offset 추가하고
-- 전체 건수(total_count)를 윈도우 함수로 함께 반환한다.
-- 반환 컬럼이 바뀌므로 기존 (text) 시그니처 함수를 drop 후 재생성한다.

drop function if exists public.admin_list_members(text);

create or replace function public.admin_list_members(
  p_q      text default null,
  p_limit  int  default null,
  p_offset int  default 0
)
returns table (
  id               uuid,
  email            text,
  name             text,
  phone            text,
  marketing_agreed boolean,
  role             text,
  created_at       timestamptz,
  order_count      bigint,
  total_spent      bigint,
  total_count      bigint
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
  with base as (
    select p.id,
           u.email::text as email,
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
  )
  select b.id, b.email, b.name, b.phone, b.marketing_agreed, b.role, b.created_at,
         b.order_count, b.total_spent,
         count(*) over()::bigint as total_count
  from base b
  order by b.created_at desc
  limit p_limit offset coalesce(p_offset, 0);
end;
$$;

revoke all on function public.admin_list_members(text, int, int) from public;
grant execute on function public.admin_list_members(text, int, int) to authenticated;

-- Rollback: drop function if exists public.admin_list_members(text, int, int);
