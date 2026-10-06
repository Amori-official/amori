-- ============================================================
-- 040_member_purge.sql — 탈퇴회원 표시 + 영구삭제
-- ============================================================
-- 목적:
--   1) 회원 목록에서 '탈퇴(비활성)' 여부를 보이게 한다.
--      → admin_list_members가 deactivated_at을 함께 반환(반환 컬럼 변경 → drop 후 재생성).
--   2) 테스트로 가입한 계정을 '영구삭제'할 수 있게 한다.
--      → admin_purge_member(p_user_id): auth.users 행 삭제.
--         · profiles / cart / reviews / wishlist / user_coupons / point_transactions
--           는 auth.users FK가 ON DELETE CASCADE → 함께 삭제.
--         · orders.user_id 는 ON DELETE SET NULL → 주문 기록은 보존(연결만 해제).
--         · auth.users 행이 사라지므로 같은 이메일로 재가입이 가능해진다.
--      안전장치: 관리자(role='admin')·본인 계정은 삭제 불가. is_admin()만 실행 가능.
--
-- RLS: 신규 테이블 없음. 함수 권한만 부여.
-- 롤백:
--   drop function if exists public.admin_purge_member(uuid);
--   019_admin_members_pagination.sql 의 admin_list_members 재실행(= deactivated_at 제거).
-- ============================================================

begin;

-- ── 1) admin_list_members: deactivated_at 포함해 재생성 ──
drop function if exists public.admin_list_members(text, int, int);

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
  deactivated_at   timestamptz,
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
           p.deactivated_at,
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
         b.deactivated_at, b.order_count, b.total_spent,
         count(*) over()::bigint as total_count
  from base b
  order by b.created_at desc
  limit p_limit offset coalesce(p_offset, 0);
end;
$$;

revoke all on function public.admin_list_members(text, int, int) from public;
grant execute on function public.admin_list_members(text, int, int) to authenticated;

-- ── 2) admin_purge_member: 회원 영구삭제(auth.users 행 삭제) ──
create or replace function public.admin_purge_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다.';
  end if;
  if p_user_id is null then
    raise exception '대상이 올바르지 않습니다.';
  end if;
  if p_user_id = auth.uid() then
    raise exception '본인 계정은 삭제할 수 없습니다.';
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  if v_role = 'admin' then
    raise exception '관리자 계정은 삭제할 수 없습니다.';
  end if;

  -- auth.users 삭제 → profiles 등 CASCADE 삭제, orders는 user_id SET NULL(기록 보존).
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception '대상 회원을 찾을 수 없습니다.';
  end if;
end;
$$;

revoke all on function public.admin_purge_member(uuid) from public;
grant execute on function public.admin_purge_member(uuid) to authenticated;

commit;
