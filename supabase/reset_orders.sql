-- ============================================================
-- reset_orders.sql — 전체 초기화 (주문·결제 + 리뷰·포인트·쿠폰)  [완전 클린]
-- ============================================================
-- 실행 위치: Supabase → SQL Editor (postgres 권한이라 RLS 무시하고 전체 삭제됨)
--
-- 효과:
--   · orders 삭제 → order_items, payments 는 FK CASCADE 로 함께 삭제
--   · reviews 전체 삭제
--   · point_transactions(적립금 내역) 전체 삭제 + profiles.points 를 0 으로
--   · user_coupons 를 모두 '미사용(active)' 상태로 되돌림(사용기록 초기화)
--
-- ⚠️ 되돌릴 수 없습니다. 아래를 한 번에 Run 하면 1)확인 → 2)삭제/초기화 → 3)확인 순서로 실행됩니다.
-- 남는 것: 회원 계정 자체(auth.users/profiles), 상품, 사이트 설정, 발급된 쿠폰 목록(상태만 미사용으로).
--          (방문자 통계 site_visits 는 건드리지 않음 — 지우려면 맨 아래 한 줄 주석 해제)
-- ============================================================

-- 1) 초기화 전 현황
select
  (select count(*) from public.orders)                         as orders,
  (select count(*) from public.order_items)                    as order_items,
  (select count(*) from public.payments)                       as payments,
  (select count(*) from public.reviews)                        as reviews,
  (select count(*) from public.point_transactions)             as point_tx,
  (select count(*) from public.user_coupons where status = 'used') as used_coupons;

-- 2) 삭제 / 초기화
delete from public.orders;              -- order_items, payments 자동 삭제(CASCADE)
delete from public.reviews;
delete from public.point_transactions;  -- 적립금 내역 제거
update public.profiles set points = 0;  -- 적립금 잔액 0
update public.user_coupons              -- 발급 쿠폰을 모두 미사용으로 복원
   set status = 'active', used_at = null, used_order_id = null;

-- 3) 초기화 후 현황 (orders/order_items/payments/reviews/point_tx = 0, used_coupons = 0 이어야 정상)
select
  (select count(*) from public.orders)                         as orders,
  (select count(*) from public.order_items)                    as order_items,
  (select count(*) from public.payments)                       as payments,
  (select count(*) from public.reviews)                        as reviews,
  (select count(*) from public.point_transactions)             as point_tx,
  (select count(*) from public.user_coupons where status = 'used') as used_coupons,
  (select coalesce(sum(points),0) from public.profiles)        as total_points;

-- (선택) 방문자 통계까지 완전 초기화하려면 아래 주석 해제:
-- delete from public.site_visits;
