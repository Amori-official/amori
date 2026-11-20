-- ============================================================
-- 055_second_coming_soon.sql — SECOND를 출시예정(coming soon)으로
-- ============================================================
-- 블랙프라이데이(11/23) 전까지 SECOND를 목록에는 노출하되 상세 열람·구매는
-- 막는다. is_coming_soon=true면:
--   · 목록 카드는 보이되 상세로 링크하지 않고 "출시 알림 신청"만 노출(코드)
--   · 상세 URL 직접 접근 시 404 (코드: product.isComingSoon → notFound)
-- 11/23에는 관리자 상품관리의 "출시하기" 버튼으로 끄면 정상 판매 시작.
-- ============================================================

begin;

update public.products
   set is_coming_soon = true,
       updated_at = now()
 where slug = 'second';

commit;
