-- ============================================================
-- 018_seed_gift_box.sql — GIFT BOX(선물 포장 패키지) 상품 시드
-- ============================================================
-- 독립 상품(category='gift', 옵션 없음, ₩3,000)으로 등록한다.
-- 옵션(variant)이 없으므로 장바구니에는 variant_id=null로 담기고, create_order RPC의
-- 무-variant 경로(007: not v_has_variants → 기본 price 사용)로 정상 결제된다.
-- 이미지는 이미 repo public/products/에 있는 gift1~gift11.png를 모두 사용한다
-- (hero/gallery/material_detail/detail 역할로 분배 → 다른 상품처럼 풍부한 상세페이지).
--
-- 재실행 안전: products는 slug 기준 UPSERT(id 보존), product_images는 해당 product_id
-- 범위만 DELETE 후 재삽입한다(004 시드와 동일 패턴).
-- ============================================================

DO $$
DECLARE
  v_product_id uuid;
BEGIN
  INSERT INTO public.products (
    slug, name, name_ko, description, short_description, tagline, price,
    images, category, stock, is_coming_soon, material, size_guide, care_instructions,
    detail_intro, features, brand_story, color_section_title, color_description,
    certification_number, certification_text, accordion_items, related_product_slugs,
    image_alt_subject, hardware_info, rating, review_count, sale_status, is_published,
    seo_title, seo_description, og_image_url, created_at
  ) VALUES (
    'gift-box', 'GIFT BOX', '기프트 박스',
    'Amori의 제품을 특별한 선물로 완성하는 기프트 패키지입니다. 기프트 박스와 쇼핑백을 함께 제공하며, 주문하신 상품을 저희가 직접 정성스럽게 포장해 그대로 전할 수 있도록 준비했습니다. 출산 선물, 백일·돌 선물, 집들이 선물처럼 마음을 전하는 순간에 어울립니다.',
    '기프트 박스와 쇼핑백에 정성껏 담아 그대로 전하는 선물 포장',
    NULL, 3000,
    ARRAY['/products/gift1.png', '/products/gift2.png', '/products/gift4.png', '/products/gift10.png', '/products/gift7.png']::text[],
    'gift', 500, false,
    '구성: 기프트 박스 + 쇼핑백

· 박스 하나에 어떤 상품이든 최대 4개까지 담을 수 있습니다.
· 선물용 상품에도 제품 행택은 부착되어 있으나, 행택에 가격은 표기되지 않습니다.
※ 사진 속 제품은 연출용이며, 기프트 박스에는 포장재(박스·쇼핑백)만 포함됩니다.',
    '기프트 박스 사이즈

· 가로 25cm × 세로 17cm × 높이 3cm
· 형태: 일체형
· 박스 하나에 어떤 상품이든 최대 4개까지 담을 수 있습니다.',
    NULL,
    '마음을 담아, 그대로 전할 수 있도록

Amori 기프트 박스는 따로 포장할 필요 없이 받는 분께 그대로 전할 수 있도록 준비한 선물 패키지입니다. 기프트 박스와 쇼핑백을 함께 제공하며, 주문하신 상품은 저희가 하나하나 직접 정성스럽게 포장해 드립니다. 어떤 상품이든 상관없이 박스 하나에 최대 4개까지 담을 수 있습니다.',
    '[{"label":"박스 + 쇼핑백 제공","body":"기프트 박스와 쇼핑백을 함께 제공해, 받는 분께 그대로 전할 수 있습니다."},{"label":"정성스러운 직접 포장","body":"주문하신 상품을 저희가 하나하나 직접 정성스럽게 포장해 발송해 드립니다."},{"label":"최대 4개까지","body":"어떤 상품이든 상관없이 박스 하나에 최대 4개까지 담을 수 있습니다."}]'::jsonb,
    NULL, NULL, NULL,
    NULL, NULL, '[]'::jsonb,
    ARRAY['gauze-bib', 'gauze-scarf-bib']::text[],
    '아모리 기프트 박스', NULL, NULL, 0, 'active', true,
    NULL, NULL, NULL, '2026-08-27'
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, name_ko = EXCLUDED.name_ko, description = EXCLUDED.description,
    short_description = EXCLUDED.short_description, tagline = EXCLUDED.tagline, price = EXCLUDED.price,
    images = EXCLUDED.images, category = EXCLUDED.category, stock = EXCLUDED.stock,
    is_coming_soon = EXCLUDED.is_coming_soon, material = EXCLUDED.material, size_guide = EXCLUDED.size_guide,
    care_instructions = EXCLUDED.care_instructions, detail_intro = EXCLUDED.detail_intro, features = EXCLUDED.features,
    brand_story = EXCLUDED.brand_story, color_section_title = EXCLUDED.color_section_title,
    color_description = EXCLUDED.color_description, certification_number = EXCLUDED.certification_number,
    certification_text = EXCLUDED.certification_text, accordion_items = EXCLUDED.accordion_items,
    related_product_slugs = EXCLUDED.related_product_slugs, image_alt_subject = EXCLUDED.image_alt_subject,
    hardware_info = EXCLUDED.hardware_info, rating = EXCLUDED.rating, review_count = EXCLUDED.review_count,
    sale_status = EXCLUDED.sale_status, is_published = EXCLUDED.is_published
  RETURNING id INTO v_product_id;

  IF v_product_id IS NULL THEN
    SELECT id INTO v_product_id FROM public.products WHERE slug = 'gift-box';
  END IF;

  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) VALUES
    -- 대표(hero)
    (v_product_id, 'hero',    '/products/gift1.png',  '아모리 기프트 박스와 쇼핑백', NULL, NULL, NULL, 0),
    -- 상단 갤러리 캐러셀
    (v_product_id, 'gallery', '/products/gift1.png',  '아모리 기프트 박스와 쇼핑백', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/gift2.png',  '기프트 박스와 쇼핑백 플랫레이', NULL, NULL, NULL, 1),
    (v_product_id, 'gallery', '/products/gift4.png',  '열린 기프트 박스와 카드, 쇼핑백', NULL, NULL, NULL, 2),
    (v_product_id, 'gallery', '/products/gift10.png', '기프트 박스에 담긴 아모리 빕 선물 구성(연출)', NULL, NULL, NULL, 3),
    (v_product_id, 'gallery', '/products/gift7.png',  '아모리 쇼핑백 디테일', NULL, NULL, NULL, 4),
    -- 전체 폭 배너(material_detail)
    (v_product_id, 'material_detail', '/products/gift11.png', '아모리 기프트 박스 연출 컷', NULL, 2000, 1333, 0),
    -- Details 섹션 (layout: full / grid / grid / left / right)
    (v_product_id, 'detail', '/products/gift3.png', '기프트 박스와 쇼핑백',            'full',  2000, 1333, 0),
    (v_product_id, 'detail', '/products/gift5.png', '기프트 박스 디테일 1',           'grid',  2000, 1333, 1),
    (v_product_id, 'detail', '/products/gift6.png', '기프트 박스 디테일 2',           'grid',  2000, 1333, 2),
    (v_product_id, 'detail', '/products/gift8.png', '기프트 박스 포장 연출 1',        'left',  2000, 1333, 3),
    (v_product_id, 'detail', '/products/gift9.png', '기프트 박스 포장 연출 2',        'right', 1877, 1252, 4);
END $$;
