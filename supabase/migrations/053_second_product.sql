-- ============================================================
-- 053_second_product.sql — SECOND(세컨드·구버전) 상품 등록
-- ============================================================
-- 블랙프라이데이용 세컨드(B급)·핸드타월 구버전 재고 소진 상품.
--   · 한 상품 'second'에 "종류·색상"을 단일축 옵션(option_name)으로 21개 등록.
--     (색상+사이즈 2축이 아니라 단일축이므로 split-axis 차단에 걸리지 않음)
--   · 종류별 세컨드가는 variant.price_override로 설정(B급=정가×0.4, 핸드타월=정가×0.5).
--   · 교환·환불 불가 등 안내는 description/renewal_notice/accordion_items에 담는다.
--   · 재고는 색상별 자동차감이 없으므로 product.stock은 표시용(총 97). 품절 옵션은
--     관리자 상품관리에서 수동 비활성(is_active=false) 처리.
--
-- 멱등: slug='second'가 이미 있으면 아무것도 하지 않는다.
-- 롤백: delete from products where slug='second' (variants/images는 FK로 정리).
-- ============================================================

begin;

do $$
declare
  v_pid uuid;
begin
  if exists (select 1 from public.products where slug = 'second') then
    raise notice 'second 상품이 이미 존재 — 건너뜀';
    return;
  end if;

  insert into public.products (
    slug, name, name_ko, description, short_description,
    price, stock, category, is_published, sale_status,
    detail_intro, renewal_notice, accordion_items, image_alt_subject, images
  ) values (
    'second',
    'SECOND',
    '세컨드',
    '흠이 있지만 사용에는 문제없는 세컨드(B급)·구버전 상품을 블랙프라이데이 특가로 준비했어요. 제작 중 생긴 미세한 흠집·얼룩·봉제 변형 등이 있을 수 있으며, 상태(흠의 종류·위치)는 지정하실 수 없습니다. 선택하신 색상으로 발송됩니다. 세컨드·구버전 특성상 단순변심에 의한 교환·환불은 불가합니다.',
    '사용엔 문제없는 세컨드·구버전 특가 — 수량 한정 (단순변심 교환·환불 불가)',
    3200, 97, 'small-things', true, 'active',
    '정상 사용에는 지장 없는 작은 흠 — 그래서 더 특별한 가격으로 드려요. 좋은 원단과 마감은 그대로, 제작 과정에서 생긴 아주 작은 흠이 있는 제품들이에요. 한정 수량으로 준비했어요.',
    '⚠️ 세컨드(B급)·구버전 상품입니다. 사용엔 문제없으나 제작 과정에서 생긴 미세한 흠/얼룩 등이 있을 수 있어요. 색상은 선택하신 것으로 발송되며, 흠의 종류·위치는 지정하실 수 없습니다. 단순변심에 의한 교환·환불은 불가합니다.',
    '[{"title":"세컨드·구버전 안내","content":"· B급(세컨드): 제작 중 생긴 미세한 흠집·얼룩·봉제 변형 등이 있을 수 있어요(사용엔 문제없음).\n· 구버전(핸드타월): 리뉴얼 이전 버전으로 상태는 정상이며, 특가로 드려요.\n· 선택하신 색상으로 발송되며, 흠의 종류·위치는 지정하실 수 없습니다."},{"title":"교환·환불 안내","content":"세컨드·구버전 상품 특성상 단순변심에 의한 교환·환불은 불가합니다. 다만 정상 사용이 불가능한 수준의 하자가 있는 경우에는 수령 후 7일 이내 카카오톡 문의로 알려주시면 도와드릴게요."},{"title":"배송 안내","content":"일반 배송 상품과 동일하게 출고됩니다. 수량이 한정되어 있어 조기 품절될 수 있어요."}]'::jsonb,
    '아모리 세컨드',
    array['/products/second-hero.webp']
  )
  returning id into v_pid;

  insert into public.product_variants (product_id, option_name, price_override, is_active, display_order) values
    (v_pid, '테리빕 · 차콜',        6400, true, 0),
    (v_pid, '테리빕 · 옐로우',      6400, true, 1),
    (v_pid, '테리빕 · 더스트',      6400, true, 2),
    (v_pid, '테리빕 · 라일락',      6400, true, 3),
    (v_pid, '테리빕 · 스톤블루',    6400, true, 4),
    (v_pid, '테리빕 · 옐로우그린',  6400, true, 5),
    (v_pid, '테리스카프빕 · 라일락',   5200, true, 6),
    (v_pid, '테리스카프빕 · 스톤블루', 5200, true, 7),
    (v_pid, '거즈빕 · 옐로우그린',  6400, true, 8),
    (v_pid, '거즈빕 · 블러쉬',      6400, true, 9),
    (v_pid, '거즈빕 · 로즈핑크',    6400, true, 10),
    (v_pid, '거즈빕 · 크림',        6400, true, 11),
    (v_pid, '거즈스카프빕 · 민트',      5200, true, 12),
    (v_pid, '거즈스카프빕 · 옐로우그린', 5200, true, 13),
    (v_pid, '거즈스카프빕 · 크림',      5200, true, 14),
    (v_pid, '거즈스카프빕 · 로즈핑크',   5200, true, 15),
    (v_pid, '파우치 · 블루 L',      3200, true, 16),
    (v_pid, '핸드타월(구버전) · 베이비핑크', 4500, true, 17),
    (v_pid, '핸드타월(구버전) · 라벤더',    4500, true, 18),
    (v_pid, '핸드타월(구버전) · 스카이',    4500, true, 19),
    (v_pid, '핸드타월(구버전) · 그린애플',  4500, true, 20);

  insert into public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) values
    (v_pid, 'hero',    '/products/second-hero.webp', '아모리 세컨드 블랙프라이데이 특가', 'full', 1080, 1350, 0),
    (v_pid, 'gallery', '/products/second-hero.webp', '아모리 세컨드 블랙프라이데이 특가', 'full', 1080, 1350, 0);
end $$;

commit;
