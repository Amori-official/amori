-- ============================================================
-- 025_gift_box_new_photos.sql — GIFT BOX 감성 신규 컷 반영
-- ============================================================
-- 대표썸네일 = 새 감성컷(gift-box-new-1), 갤러리 서브썸네일도 새 감성컷으로 교체.
-- Details: 감성(신규) 그룹을 먼저, 사실적(기존 gift*.png) 그룹을 뒤에 배치해
-- 분위기가 오락가락하지 않도록 묶는다. (기존 사진 유지 + 신규 추가)
-- 재실행 안전: gift-box product_images 전체 DELETE 후 재삽입.
-- ============================================================

DO $$
DECLARE
  v_product_id uuid;
BEGIN
  SELECT id INTO v_product_id FROM public.products WHERE slug = 'gift-box';
  IF v_product_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) VALUES
    -- 대표(샵 목록 썸네일) = 새 감성컷
    (v_product_id, 'hero', '/products/gift-box-new-1.webp', '아모리 기프트 박스와 쇼핑백', NULL, NULL, NULL, 0),
    -- 상단 갤러리 서브 썸네일 (새 감성컷)
    (v_product_id, 'gallery', '/products/gift-box-new-2.webp', '기프트 박스 선물 연출', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/gift-box-new-7.webp', '기프트 박스 리본 포장 연출', NULL, NULL, NULL, 1),
    (v_product_id, 'gallery', '/products/gift-box-new-6.webp', '기프트 박스 선물 세트 연출', NULL, NULL, NULL, 2),
    (v_product_id, 'gallery', '/products/gift-box-new-9.webp', '열린 기프트 박스와 카드', NULL, NULL, NULL, 3),
    -- 전체 폭 배너 (감성)
    (v_product_id, 'material_detail', '/products/gift-box-new-3.webp', '기프트 박스 연출 컷', NULL, 2000, 1333, 0),
    -- Details — 감성(신규) 그룹 먼저
    (v_product_id, 'detail', '/products/gift-box-new-4.webp', '기프트 박스 쇼핑백 디테일', 'full',  2000, 1333, 0),
    (v_product_id, 'detail', '/products/gift-box-new-5.webp', '기프트 박스 리본 연출',     'grid',  2000, 1333, 1),
    (v_product_id, 'detail', '/products/gift-box-new-7.webp', '기프트 박스 선물 연출',     'grid',  2000, 1333, 2),
    (v_product_id, 'detail', '/products/gift-box-new-8.webp', '기프트 박스와 쇼핑백 연출', 'left',  1333, 2000, 3),
    (v_product_id, 'detail', '/products/gift-box-new-9.webp', '열린 기프트 박스와 카드',   'full',  2000, 1333, 4),
    -- Details — 사실적(기존) 그룹
    (v_product_id, 'detail', '/products/gift1.png',  '아모리 기프트 박스와 쇼핑백', 'full',  2000, 1333, 5),
    (v_product_id, 'detail', '/products/gift10.png', '기프트 박스에 담긴 구성(연출)', 'grid', 1592, 1062, 6),
    (v_product_id, 'detail', '/products/gift4.png',  '열린 기프트 박스와 카드, 쇼핑백', 'grid', 2000, 3000, 7),
    (v_product_id, 'detail', '/products/gift2.png',  '기프트 박스와 쇼핑백 플랫레이', 'grid', 2000, 1333, 8),
    (v_product_id, 'detail', '/products/gift3.png',  '기프트 박스와 쇼핑백',          'grid', 2000, 1333, 9),
    (v_product_id, 'detail', '/products/gift5.png',  '기프트 박스 디테일 1',          'grid', 2000, 1333, 10),
    (v_product_id, 'detail', '/products/gift6.png',  '기프트 박스 디테일 2',          'grid', 2000, 1333, 11),
    (v_product_id, 'detail', '/products/gift7.png',  '쇼핑백 디테일',                 'full', 2000, 1333, 12);
END $$;
