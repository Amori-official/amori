-- 015_rename_kakao_coupon.sql
--
-- 카카오톡 채널 추가 쿠폰의 코드를 KAKAO3000 → AMORIKKO 로 변경한다.
-- 할인 규칙(3,000원 정액, 최소주문 10,000원, 30일, code_redeemable)은 그대로 유지.

update public.coupons
set code = 'AMORIKKO'
where code = 'KAKAO3000';

-- Rollback(검토용): update public.coupons set code = 'KAKAO3000' where code = 'AMORIKKO';
