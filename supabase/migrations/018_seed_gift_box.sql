-- ============================================================
-- 018_seed_gift_box.sql — GIFT BOX(선물 포장 패키지) 상품 시드
-- ============================================================
-- 독립 상품(category='gift', 옵션 없음, ₩3,000)으로 등록한다.
-- 옵션(variant)이 없으므로 장바구니에는 variant_id=null로 담기고, create_order RPC의
-- 무-variant 경로(007: not v_has_variants → 기본 price 사용)로 정상 결제된다.
-- 이미지는 이미 repo public/products/에 있는 gift*.png를 참조한다.
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
    'Amori의 제품을 특별한 선물로 완성하는 기프트 패키지입니다. 화이트 기프트 박스에 크림빛 티슈페이퍼로 정성스럽게 감싸고, 브랜드 카드와 쇼핑백까지 함께 담아 받는 분께 그대로 전할 수 있도록 준비했습니다. 출산 선물, 백일·돌 선물, 집들이 선물처럼 마음을 전하는 순간에 어울립니다.',
    '화이트 박스 · 티슈페이퍼 · 카드 · 쇼핑백까지, 그대로 전하는 선물 포장',
    NULL, 3000,
    ARRAY['/products/gift1.png', '/products/gift10.png', '/products/gift4.png', '/products/gift2.png', '/products/gift7.png']::text[],
    'gift', 500, false,
    '구성: 화이트 기프트 박스 1 + 크림 티슈페이퍼 + Amori 카드 + 쇼핑백 1

· 박스 색상: 화이트(무광)
· 쇼핑백: 화이트 / 블랙 리본 손잡이
※ 사진 속 빕 등 제품은 연출용이며, 기프트 박스에는 포장재만 포함됩니다.',
    '기프트 박스 (프리 사이즈)

· 제품 1~2점을 담기 좋은 크기입니다.
· 함께 구매하신 Amori 제품을 정성껏 포장해 발송해 드립니다.',
    NULL,
    '마음을 담아, 그대로 전할 수 있도록

좋은 물건을 고르는 일만큼, 그것을 건네는 순간도 소중하다고 생각했어요. Amori 기프트 박스는 따로 포장할 필요 없이 받는 분께 그대로 전할 수 있도록 준비한 선물 패키지입니다. 화이트 박스와 크림빛 티슈페이퍼, 그리고 Things, with great love 가 적힌 카드가 함께 담깁니다.',
    '[{"label":"화이트 기프트 박스","body":"제품을 단정하게 담는 무광 화이트 박스로, 어떤 제품과도 잘 어울립니다."},{"label":"크림빛 티슈페이퍼","body":"박스 안쪽을 감싸는 부드러운 티슈페이퍼로 포장의 완성도를 더했습니다."},{"label":"브랜드 카드 동봉","body":"Things, with great love 문구가 담긴 Amori 카드가 함께 들어갑니다."},{"label":"쇼핑백 포함","body":"검정 리본 손잡이의 화이트 쇼핑백까지 제공되어 손에 들고 그대로 전달할 수 있습니다."}]'::jsonb,
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
    (v_product_id, 'hero',    '/products/gift1.png',  '아모리 기프트 박스와 쇼핑백', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/gift1.png',  '아모리 기프트 박스와 쇼핑백', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/gift10.png', '기프트 박스에 담긴 아모리 빕 선물 구성(연출)', NULL, NULL, NULL, 1),
    (v_product_id, 'gallery', '/products/gift4.png',  '열린 기프트 박스와 카드, 쇼핑백', NULL, NULL, NULL, 2),
    (v_product_id, 'gallery', '/products/gift2.png',  '기프트 박스와 쇼핑백 플랫레이', NULL, NULL, NULL, 3),
    (v_product_id, 'gallery', '/products/gift7.png',  'Things, with great love 쇼핑백 디테일', NULL, NULL, NULL, 4);
END $$;
