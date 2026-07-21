-- ============================================================
-- AMORI 상품 시드 (mock-data.ts의 5개 상품, 스테이징 전용)
-- ============================================================
-- lib/mock-data.ts의 mockProducts 배열에서 기계적으로(수기 전사 없이) 생성됨.
-- 임의의 값 추가 없음 — mock에 있는 필드만 그대로 옮긴다.
--
-- 재실행 안전성: products는 slug 기준 UPSERT(id 보존). product_variants/
-- product_images는 자연 키가 없어, 해당 product_id 범위만 DELETE 후 재삽입한다
-- (주문 데이터가 아닌 "상품 콘텐츠" 재시드이므로 표준적인 안전한 패턴).
--
-- SEO title/description, OG image는 mock-data.ts에 별도 저장된 값이 없고
-- (app/(shop)/shop/[slug]/page.tsx의 generateMetadata가 name/description/
-- imageUrl에서 런타임에 계산) NULL로 둔다. tagline/hardwareInfo/
-- certificationText/accordionItems도 5개 상품 전부 mock에 값이 없어 NULL/빈 배열.
-- rating은 전부 undefined(리뷰 미확보)라 NULL, is_published는 현재 실제 공개
-- 중인 상품이므로 true, sale_status는 전부 재고>0이라 'active'로 둔다.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- GAUZE BIB (gauze-bib)
-- ────────────────────────────────────────────────────────────
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
    'gauze-bib', 'GAUZE BIB', '거즈 빕', '국내산 면 100% 6겹 거즈로 만든 턱받이입니다. 겹겹이 쌓인 거즈 특유의 입체감이 흡수력과 부드러움을 동시에 갖추고 있어, 먹이고 닦고 받아내는 매일의 순간을 조금 더 편안하게 만들어줍니다. 신생아부터 사용할 수 있는 프리 사이즈로, 넉넉한 크기 덕분에 이유식 시기에도 유용하게 쓰입니다.', '포근한 3중 거즈를 양면으로 겹쳐 만든 데일리 턱받이', NULL, 16000,
    ARRAY['/products/bib34.png', '/products/bib10.png', '/products/bib19.png', '/products/bib35.png', '/products/bib39.png']::text[], 'small-things', 80, false, '국내산 면 100% 6겹 거즈

거즈는 실을 성기게 직조한 평직 원단으로, 겹칠수록 공기층이 생겨 한 장의 두꺼운 천보다 부드럽고 흡수력이 높습니다. Amori의 거즈 빕은 3중 거즈 원단을 두 겹 사용해 총 6겹 구조로 완성되어 침, 분유, 이유식 등을 효과적으로 흡수하며, 세탁을 반복할수록 섬유가 살짝 수축되며 더욱 촘촘하고 포근한 질감으로 변합니다.

· 소재: 면(cotton) 100%
· 원산지: 국내산
· KC 안전 인증 완료 (어린이제품 공통안전기준)', '프리 사이즈 (신생아 ~ 36개월)

· 가로 24cm × 세로 27.5cm
· 신생아부터 36개월까지, 착용 가능 시기는 아이의 체형에 따라 달라질 수 있으니 구매 전 상세 사이즈를 확인해 주세요.
· 이유식 시기(6개월~)에는 앞면 전체를 충분히 가려주어 옷이 젖는 것을 막아줍니다.', '· 세탁: 30°C 이하 찬물, 중성세제 사용
· 단독 또는 유사 색상끼리 세탁 권장
· 손세탁 또는 세탁기 약세탁(울 코스)
· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다
· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다
· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)',
    '매일 입히고 싶은, 부드러운 거즈빕

하루에도 몇 번씩 갈아주는 아기 턱받이. 피부에는 부드럽고, 침과 음식물은 충분히 받아주면서 어떤 옷에도 자연스럽게 어울리는 빕을 만들고 싶었어요.

아모리 거즈빕은 국내산 면 100% 거즈 원단을 사용해 가볍고 포근하게 완성했습니다. 넉넉한 앞면이 아기의 옷을 편안하게 감싸주어 수유부터 이유식 시기까지 매일 손이 가는 턱받이입니다.', '[{"label":"포근한 6겹 거즈","body":"국내산 면 100% 3중 거즈 원단을 두 겹으로 사용해 부드러우면서도 충분한 흡수력을 갖췄습니다."},{"label":"넉넉한 앞면","body":"침과 음식물이 묻기 쉬운 목 아래와 가슴 부분을 편안하게 감싸도록 넉넉한 크기로 만들었습니다."},{"label":"편안한 착용감","body":"가볍고 통기성이 좋은 거즈 소재로 계절에 관계없이 편안하게 착용할 수 있습니다."},{"label":"KC 안전기준 확인","body":"아기 피부에 직접 닿는 제품인 만큼 어린이제품 안전기준에 따른 시험을 완료했습니다. (인증번호: CB014H2463-6001)"}]'::jsonb, '아이가 먹고, 흘리고, 또 먹는 하루하루 — 그 작은 반복 속에서 곁을 지키는 것들은 단순하고 믿음직해야 한다고 생각합니다. Amori의 거즈 빕은 꾸밈보다 실용에, 세련됨보다 안전함에 집중했습니다. 아이의 피부에 가장 먼저 닿는 것이니까요.', '7 Colors', 'Cream, Mint, Rose Pink, Blush, Yellow Green, Royal Blue, Yellow — 아이의 옷과 공간에 자연스럽게 어우러지는 7가지 컬러로 준비했습니다.',
    'CB014H2463-6001', NULL, '[]'::jsonb, ARRAY['gauze-scarf-bib', 'spread']::text[],
    '아기 거즈빕', NULL, NULL, 0, 'active', true,
    NULL, NULL, NULL, '2025-04-01'
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, name_ko = EXCLUDED.name_ko, description = EXCLUDED.description,
    short_description = EXCLUDED.short_description, tagline = EXCLUDED.tagline, price = EXCLUDED.price,
    images = EXCLUDED.images, category = EXCLUDED.category, stock = EXCLUDED.stock,
    material = EXCLUDED.material, size_guide = EXCLUDED.size_guide, care_instructions = EXCLUDED.care_instructions,
    detail_intro = EXCLUDED.detail_intro, features = EXCLUDED.features, brand_story = EXCLUDED.brand_story,
    color_section_title = EXCLUDED.color_section_title, color_description = EXCLUDED.color_description,
    certification_number = EXCLUDED.certification_number, certification_text = EXCLUDED.certification_text,
    accordion_items = EXCLUDED.accordion_items, related_product_slugs = EXCLUDED.related_product_slugs,
    image_alt_subject = EXCLUDED.image_alt_subject, hardware_info = EXCLUDED.hardware_info,
    rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, sale_status = EXCLUDED.sale_status,
    is_published = EXCLUDED.is_published, updated_at = now()
  RETURNING id INTO v_product_id;

  -- 상품 콘텐츠 재시드: 이 상품의 옵션/이미지를 깨끗하게 다시 채운다 (주문 데이터 아님)
  DELETE FROM public.product_variants WHERE product_id = v_product_id;
  DELETE FROM public.product_images WHERE product_id = v_product_id;

  INSERT INTO public.product_variants (product_id, color_name, color_hex, option_name, image_url, price_override, is_active, display_order) VALUES
    (v_product_id, 'Cream', '#EFE4D4', NULL, '/products/bib12-cream.png', NULL, true, 0),
    (v_product_id, 'Mint', '#A8C4B4', NULL, '/products/bib14-mint.png', NULL, true, 1),
    (v_product_id, 'Rose Pink', '#E8C9C2', NULL, '/products/bib13-rosepink.png', NULL, true, 2),
    (v_product_id, 'Blush', '#CE9096', NULL, '/products/bib16-blush.png', NULL, true, 3),
    (v_product_id, 'Yellow Green', '#CDD678', NULL, '/products/bib15-yellowgreen.png', NULL, true, 4),
    (v_product_id, 'Royal Blue', '#4A5FA5', NULL, '/products/bib17-royalblue.png', NULL, true, 5),
    (v_product_id, 'Yellow', '#EAD98A', NULL, '/products/bib18-yello.png', NULL, true, 6);

  INSERT INTO public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) VALUES
    (v_product_id, 'hero', '/products/bib0.png', NULL, NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/bib34.png', '아모리 거즈빕 7가지 컬러 바구니에 담긴 모습', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/bib10.png', '아모리 거즈빕 7가지 컬러 플랫레이 전체 컷', NULL, NULL, NULL, 1),
    (v_product_id, 'gallery', '/products/bib19.png', '아모리 거즈빕 7가지 컬러 옷걸이에 걸어놓은 모습', NULL, NULL, NULL, 2),
    (v_product_id, 'gallery', '/products/bib35.png', '아모리 거즈빕 여러 컬러 바구니 클로즈업', NULL, NULL, NULL, 3),
    (v_product_id, 'gallery', '/products/bib39.png', '아모리 거즈빕 7가지 컬러 컬렉션 클로즈업', NULL, NULL, NULL, 4),
    (v_product_id, 'story', '/products/bib38.png', '아모리 거즈빕 두 아이 주방에서 함께 있는 모습', NULL, NULL, NULL, 0),
    (v_product_id, 'material_detail', '/products/bib4.png', '아모리 Cream 거즈빕 원단 텍스처 클로즈업', NULL, NULL, NULL, 0),
    (v_product_id, 'color_section', '/products/bib11.png', '아모리 거즈빕 7가지 컬러 전체 펼친 모습', NULL, NULL, NULL, 0),
    (v_product_id, 'detail', '/products/bib37.png', '아모리 Yellow 거즈빕 아기 침대에서 나무 블록 놀이', 'left', 2000, 3000, 0),
    (v_product_id, 'detail', '/products/bib2.png', '아모리 Mint 거즈빕 아기가 입에 물고 있는 모습', 'right', 2000, 3000, 1),
    (v_product_id, 'detail', '/products/bib1.png', '아모리 Mint 거즈빕 아기 실내에서 옆을 바라보는 모습', 'grid', 2000, 2000, 2),
    (v_product_id, 'detail', '/products/bib36.png', '아모리 Mint 거즈빕 아기 착용 정면 스튜디오', 'grid', 2000, 2000, 3),
    (v_product_id, 'detail', '/products/bib9.jpg', '아모리 거즈빕 여러 컬러 소파 위에 펼친 모습', 'full', 2000, 1333, 4),
    (v_product_id, 'detail', '/products/bib21.png', '아모리 Blush 거즈빕 침구 위 비스듬히 놓은 모습', 'grid', 2000, 2000, 5),
    (v_product_id, 'detail', '/products/bib22.png', '아모리 Yellow 거즈빕 침구 위 비스듬히 놓은 모습', 'grid', 2000, 2000, 6),
    (v_product_id, 'detail', '/products/bib23.png', '아모리 Cream 거즈빕 침구 위 비스듬히 놓은 모습', 'grid', 2000, 2000, 7),
    (v_product_id, 'detail', '/products/bib24.png', '아모리 Rose Pink 거즈빕 침구 위 비스듬히 놓은 모습', 'grid', 2000, 2000, 8),
    (v_product_id, 'detail', '/products/bib6.png', '아모리 거즈빕 여러 컬러 겹쳐 쌓아놓은 모습', 'full', 1459, 972, 9),
    (v_product_id, 'detail', '/products/bib25.png', '아모리 Yellow Green 거즈빕 침구 위 비스듬히 놓은 모습', 'grid', 2000, 2000, 10),
    (v_product_id, 'detail', '/products/bib26.png', '아모리 Mint 거즈빕 침구 위 비스듬히 놓은 모습', 'grid', 2000, 2000, 11),
    (v_product_id, 'detail', '/products/bib20.png', '아모리 Royal Blue 거즈빕 침구 위 비스듬히 놓은 모습', 'grid', 2000, 2000, 12),
    (v_product_id, 'detail', '/products/bib33.png', '아모리 Rose Pink 거즈빕 평면 촬영 정면', 'grid', 2000, 2000, 13),
    (v_product_id, 'detail', '/products/bib7.jpg', '아모리 거즈빕 스냅 버튼 클로즈업', 'full', 2000, 1333, 14),
    (v_product_id, 'detail', '/products/bib27.png', '아모리 Blush 거즈빕 평면 촬영', 'grid', 2000, 2000, 15),
    (v_product_id, 'detail', '/products/bib29.png', '아모리 Royal Blue 거즈빕 평면 촬영', 'grid', 2000, 2000, 16),
    (v_product_id, 'detail', '/products/bib30.png', '아모리 Yellow Green 거즈빕 평면 촬영', 'grid', 2000, 2000, 17),
    (v_product_id, 'detail', '/products/bib32.png', '아모리 Mint 거즈빕 평면 촬영', 'grid', 2000, 2000, 18),
    (v_product_id, 'detail', '/products/bib31.png', '아모리 Cream 거즈빕 평면 촬영 정면', 'grid', 2000, 2000, 19),
    (v_product_id, 'detail', '/products/bib28.png', '아모리 Yellow 거즈빕 평면 촬영 정면', 'grid', 2000, 2000, 20);
END $$;


-- ────────────────────────────────────────────────────────────
-- GAUZE SCARF BIB (gauze-scarf-bib)
-- ────────────────────────────────────────────────────────────
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
    'gauze-scarf-bib', 'GAUZE SCARF BIB', '거즈 스카프 빕', '국내산 면 100% 6겹 거즈로 만든 스카프형 턱받이입니다. 삼각형으로 재단된 넓은 앞판이 목부터 가슴까지 충분히 감싸주어, 이유식이나 수유 중 옷이 젖는 것을 효과적으로 막아줍니다. 스카프처럼 자연스럽게 연출되어 집에서도 외출 시에도 편안하게 착용할 수 있습니다.', '턱받이처럼 실용적이고 스카프처럼 자연스럽게', NULL, 13000,
    ARRAY['/products/scarfbib19.png', '/products/scarfbib1.png', '/products/scarfbib30.png', '/products/scarfbib9.png', '/products/scarfbib16.png', '/products/scarfbib28.png']::text[], 'small-things', 80, false, '국내산 면 100% 6겹 거즈

거즈 특유의 성긴 직조 방식이 겹칠수록 공기층을 형성해 부드럽고 흡수력이 뛰어납니다. Amori의 거즈 스카프 빕은 6겹 구조로 직조되어 침과 음식물을 빠르게 흡수하며, 세탁을 반복할수록 섬유가 수축되어 더욱 촘촘하고 포근한 질감으로 변합니다.

· 소재: 면(cotton) 100%
· 원산지: 국내산
· KC 안전 인증 완료 (어린이제품 공통안전기준)', '프리 사이즈 (신생아 ~ 36개월)

· 삼각 앞판 폭 약 37cm × 길이 약 11cm
· 스냅 단추로 간편하게 착용할 수 있습니다.
· 간절기 아기의 목을 보호해주며, 외출 시 스카프 아이템으로도 활용됩니다.', '· 세탁: 30°C 이하 찬물, 중성세제 사용
· 단독 또는 유사 색상끼리 세탁 권장
· 손세탁 또는 세탁기 약세탁(울 코스)
· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다
· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다
· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)',
    NULL, '[{"label":"포근한 6겹 거즈","body":"국내산 면 100% 3중 거즈 원단을 두 겹으로 사용해 부드러우면서도 충분한 흡수력을 갖췄습니다."},{"label":"넉넉한 앞면","body":"침과 음식물이 묻기 쉬운 목 아래와 가슴 부분을 편안하게 감싸도록 넉넉한 크기로 만들었습니다."},{"label":"편안한 착용감","body":"가볍고 통기성이 좋은 거즈 소재로 계절에 관계없이 편안하게 착용할 수 있습니다."},{"label":"KC 안전기준 확인","body":"아기 피부에 직접 닿는 제품인 만큼 어린이제품 안전기준에 따른 시험을 완료했습니다. (인증번호: CB014H2463-6001)"}]'::jsonb, '아이와 함께하는 매일의 식사 시간이 조금 더 여유롭기를 바랍니다. Amori의 거즈 스카프 빕은 잘 흡수하고 빨리 마르는 실용성에, 스카프처럼 자연스러운 모양새를 더했습니다. 부모와 아이 모두에게 편안한 하루를 위해.', '7 Colors', '옐로우그린, 민트, 로즈핑크, 크림, 블러쉬, 로열 블루, 옐로우 — 아이의 옷과 공간에 자연스럽게 어우러지는 7가지 컬러로 준비했습니다.',
    'CB014H2463-6001', NULL, '[]'::jsonb, ARRAY['gauze-bib', 'spread']::text[],
    '아기 거즈 스카프 빕', NULL, NULL, 0, 'active', true,
    NULL, NULL, NULL, '2025-04-01'
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, name_ko = EXCLUDED.name_ko, description = EXCLUDED.description,
    short_description = EXCLUDED.short_description, tagline = EXCLUDED.tagline, price = EXCLUDED.price,
    images = EXCLUDED.images, category = EXCLUDED.category, stock = EXCLUDED.stock,
    material = EXCLUDED.material, size_guide = EXCLUDED.size_guide, care_instructions = EXCLUDED.care_instructions,
    detail_intro = EXCLUDED.detail_intro, features = EXCLUDED.features, brand_story = EXCLUDED.brand_story,
    color_section_title = EXCLUDED.color_section_title, color_description = EXCLUDED.color_description,
    certification_number = EXCLUDED.certification_number, certification_text = EXCLUDED.certification_text,
    accordion_items = EXCLUDED.accordion_items, related_product_slugs = EXCLUDED.related_product_slugs,
    image_alt_subject = EXCLUDED.image_alt_subject, hardware_info = EXCLUDED.hardware_info,
    rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, sale_status = EXCLUDED.sale_status,
    is_published = EXCLUDED.is_published, updated_at = now()
  RETURNING id INTO v_product_id;

  -- 상품 콘텐츠 재시드: 이 상품의 옵션/이미지를 깨끗하게 다시 채운다 (주문 데이터 아님)
  DELETE FROM public.product_variants WHERE product_id = v_product_id;
  DELETE FROM public.product_images WHERE product_id = v_product_id;

  INSERT INTO public.product_variants (product_id, color_name, color_hex, option_name, image_url, price_override, is_active, display_order) VALUES
    (v_product_id, '옐로우그린', '#CDD678', NULL, '/products/scarfbib12-yellowgreen.png', NULL, true, 0),
    (v_product_id, '민트', '#A8C4B4', NULL, '/products/scarfbib14-mint.png', NULL, true, 1),
    (v_product_id, '로즈핑크', '#E8C9C2', NULL, '/products/scarfbib15-rosepink.png', NULL, true, 2),
    (v_product_id, '크림', '#EFE4D4', NULL, '/products/scarfbib13-cream.png', NULL, true, 3),
    (v_product_id, '블러쉬', '#CE9096', NULL, '/products/scarfbib11-blush.png', NULL, true, 4),
    (v_product_id, '로열 블루', '#4A5FA5', NULL, '/products/scarfbib10-royalblue.png', NULL, true, 5),
    (v_product_id, '옐로우', '#EAD98A', NULL, '/products/scarfbib12-yellow.png', NULL, true, 6);

  INSERT INTO public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) VALUES
    (v_product_id, 'hero', '/products/scarfbib0.png', NULL, NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/scarfbib19.png', '아모리 거즈 스카프 빕 컬러 플랫레이 그룹 컷', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/scarfbib1.png', '아모리 거즈 스카프 빕 착용 아기 남매 주방 놀이 장면', NULL, NULL, NULL, 1),
    (v_product_id, 'gallery', '/products/scarfbib30.png', '아모리 거즈 스카프 빕 여러 컬러 팬 스택 우드 테이블 컷', NULL, NULL, NULL, 2),
    (v_product_id, 'gallery', '/products/scarfbib9.png', '아모리 거즈 스카프 빕 착용 아기 남매 주방 전경', NULL, NULL, NULL, 3),
    (v_product_id, 'gallery', '/products/scarfbib16.png', '아모리 거즈 스카프 빕 여러 컬러 후크에 걸어놓은 모습', NULL, NULL, NULL, 4),
    (v_product_id, 'gallery', '/products/scarfbib28.png', '아모리 거즈 스카프 빕 여러 컬러 바구니에 담긴 모습', NULL, NULL, NULL, 5),
    (v_product_id, 'story', '/products/scarfbib2.png', '아모리 거즈 스카프 빕 착용 아기 남매 창가 놀이 장면', NULL, NULL, NULL, 0),
    (v_product_id, 'material_detail', '/products/scarfbib29.png', '아모리 거즈 스카프 빕 원단 겹겹이 쌓인 클로즈업', NULL, NULL, NULL, 0),
    (v_product_id, 'color_section', '/products/scarfbib17.png', '아모리 거즈 스카프 빕 7컬러 플랫레이 전체 컷', NULL, NULL, NULL, 0),
    (v_product_id, 'detail', '/products/scarfbib4.png', '아모리 거즈 스카프 빕 착용 아기 남매 거실 테이블 장면', 'left', 2000, 3000, 0),
    (v_product_id, 'detail', '/products/scarfbib5.png', '아모리 로즈핑크 거즈 스카프 빕 착용 아기 정면 클로즈업', 'right', 2000, 3000, 1),
    (v_product_id, 'detail', '/products/scarfbib8.png', '아모리 거즈 스카프 빕 착용 아기 뒷모습 태그 클로즈업', 'full', 2000, 1333, 2),
    (v_product_id, 'detail', '/products/scarfbib26.png', '아모리 거즈 스카프 빕 바구니 속 컬러 태그 클로즈업', 'grid', 2000, 2000, 3),
    (v_product_id, 'detail', '/products/scarfbib27.png', '아모리 거즈 스카프 빕 바구니 속 컬러 태그 클로즈업', 'grid', 2000, 2000, 4),
    (v_product_id, 'detail', '/products/scarfbib31.png', '아모리 크림 거즈 스카프 빕 착용 아기 장난감 놀이 클로즈업', 'full', 2000, 1333, 5),
    (v_product_id, 'detail', '/products/scarfbib24.png', '아모리 크림 거즈 스카프 빕 플랫레이', 'grid', 2000, 2000, 6),
    (v_product_id, 'detail', '/products/scarfbib20.png', '아모리 민트 거즈 스카프 빕 플랫레이', 'grid', 2000, 2000, 7),
    (v_product_id, 'detail', '/products/scarfbib3.png', '아모리 거즈 스카프 빕 착용 아기 소파 옆모습 클로즈업', 'full', 2000, 1333, 8),
    (v_product_id, 'detail', '/products/scarfbib21.png', '아모리 옐로우그린 거즈 스카프 빕 플랫레이', 'grid', 2000, 2000, 9),
    (v_product_id, 'detail', '/products/scarfbib25.png', '아모리 옐로우 거즈 스카프 빕 플랫레이', 'grid', 2000, 2000, 10),
    (v_product_id, 'detail', '/products/scarfbib18.png', '아모리 거즈 스카프 빕 컬러 후크 걸이 그룹 컷', 'right', 2000, 2000, 11),
    (v_product_id, 'detail', '/products/scarfbib7.png', '아모리 거즈 스카프 빕 착용 아기 원목 블록 놀이', 'full', 2000, 1333, 12),
    (v_product_id, 'detail', '/products/scarfbib23.png', '아모리 블러쉬 거즈 스카프 빕 플랫레이', 'grid', 2000, 2000, 13),
    (v_product_id, 'detail', '/products/scarfbib22.png', '아모리 로열 블루 거즈 스카프 빕 플랫레이', 'grid', 2000, 2000, 14),
    (v_product_id, 'detail', '/products/scarfbib33.png', '아모리 블러쉬 거즈 스카프 빕 착용 아기 창가 클로즈업', 'grid', 2000, 1333, 15),
    (v_product_id, 'detail', '/products/scarfbib34.png', '아모리 블러쉬 거즈 스카프 빕 착용 아기 옆모습 클로즈업', 'grid', 2000, 1333, 16),
    (v_product_id, 'detail', '/products/scarfbib35.png', '아모리 민트 거즈 스카프 빕 착용 아기 침대 기어가는 모습', 'grid', 2000, 1333, 17),
    (v_product_id, 'detail', '/products/scarfbib36.png', '아모리 크림 거즈 스카프 빕 착용 아기 침대 위 웃는 모습', 'grid', 2000, 1333, 18);
END $$;


-- ────────────────────────────────────────────────────────────
-- SPREAD (spread)
-- ────────────────────────────────────────────────────────────
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
    'spread', 'SPREAD', '스프레드', '국내산 면 100% 6겹 거즈로 만든 다용도 스프레드입니다. 신생아를 감싸는 속싸개부터 낮잠 이불, 수유 케이프, 외출 바람막이까지 — 한 장이 아이와 함께하는 다양한 순간에 맞게 펼쳐집니다. 부드럽고 통기성 좋은 거즈 소재로 사계절 내내 사용할 수 있습니다.', '아이의 다양한 순간에 함께하는 거즈 스프레드', NULL, 18000,
    ARRAY['/products/spread8.png', '/products/spread13.png', '/products/spread16.png', '/products/spread21.png', '/products/spread4.png']::text[], 'fabric-goods', 50, false, '국내산 면 100% 6겹 거즈

거즈는 성기게 직조된 평직 원단으로, 6겹 구조에서 형성되는 공기층이 온도 조절을 도와 여름에는 시원하고 겨울에는 따뜻합니다. Amori의 스프레드는 세탁을 반복할수록 섬유가 수축되어 더욱 포근하고 촘촘한 질감으로 변합니다.

· 소재: 면(cotton) 100%
· 원산지: 국내산
· KC 안전 인증 완료 (어린이제품 공통안전기준)', '· 가로 40cm × 세로 26cm', '· 세탁: 30°C 이하 찬물, 중성세제 사용
· 단독 또는 유사 색상끼리 세탁 권장
· 손세탁 또는 세탁기 약세탁(울 코스)
· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다
· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다
· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)',
    NULL, '[{"label":"포근한 6겹 거즈","body":"국내산 면 100% 3중 거즈 원단을 두 겹으로 사용해 부드러우면서도 충분한 흡수력을 갖췄습니다."},{"label":"KC 안전기준 확인","body":"아기 피부에 직접 닿는 제품인 만큼 어린이제품 안전기준에 따른 시험을 완료했습니다. (인증번호: CB014H2463-6001)"},{"label":"다용도 활용","body":"아기를 안을 때, 어깨나 팔에 걸쳐 아기들의 피부를 보호하고. 터미타임 때, 가슴 밑에 깔아주셔도 좋아요. 아기가 많이 크고 나서는 주방 테이블 매트, 먼지가 쉽게 쌓이는 가전들 위에 덮개로도 쓸 수 있답니다."}]'::jsonb, '아이가 처음 세상 밖 공기를 마주하는 순간부터, Amori의 스프레드가 함께합니다. 예민한 아기의 피부가 닿는 모든 곳에 보드라운 스프레드를 깔고 사용해주세요.', '2 Colors', 'Cream, Oat — 아이의 공간 어디에나 자연스럽게 어우러지는 2가지 컬러로 준비했습니다.',
    'CB014H2463-6001', NULL, '[]'::jsonb, ARRAY['gauze-bib', 'gauze-scarf-bib']::text[],
    '거즈 스프레드', NULL, NULL, 0, 'active', true,
    NULL, NULL, NULL, '2025-04-01'
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, name_ko = EXCLUDED.name_ko, description = EXCLUDED.description,
    short_description = EXCLUDED.short_description, tagline = EXCLUDED.tagline, price = EXCLUDED.price,
    images = EXCLUDED.images, category = EXCLUDED.category, stock = EXCLUDED.stock,
    material = EXCLUDED.material, size_guide = EXCLUDED.size_guide, care_instructions = EXCLUDED.care_instructions,
    detail_intro = EXCLUDED.detail_intro, features = EXCLUDED.features, brand_story = EXCLUDED.brand_story,
    color_section_title = EXCLUDED.color_section_title, color_description = EXCLUDED.color_description,
    certification_number = EXCLUDED.certification_number, certification_text = EXCLUDED.certification_text,
    accordion_items = EXCLUDED.accordion_items, related_product_slugs = EXCLUDED.related_product_slugs,
    image_alt_subject = EXCLUDED.image_alt_subject, hardware_info = EXCLUDED.hardware_info,
    rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, sale_status = EXCLUDED.sale_status,
    is_published = EXCLUDED.is_published, updated_at = now()
  RETURNING id INTO v_product_id;

  -- 상품 콘텐츠 재시드: 이 상품의 옵션/이미지를 깨끗하게 다시 채운다 (주문 데이터 아님)
  DELETE FROM public.product_variants WHERE product_id = v_product_id;
  DELETE FROM public.product_images WHERE product_id = v_product_id;

  INSERT INTO public.product_variants (product_id, color_name, color_hex, option_name, image_url, price_override, is_active, display_order) VALUES
    (v_product_id, '크림', '#EFE4D4', NULL, '/products/spread17-white.png', NULL, true, 0),
    (v_product_id, '오트', '#C8B89A', NULL, '/products/spread7-oat.png', NULL, true, 1);

  INSERT INTO public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) VALUES
    (v_product_id, 'hero', '/products/spread0.png', NULL, NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/spread8.png', '아모리 스프레드 크림·오트 컬러 침대 위 연출', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/spread13.png', '아모리 스프레드 식탁 매트·냅킨 세팅 연출', NULL, NULL, NULL, 1),
    (v_product_id, 'gallery', '/products/spread16.png', '아모리 스프레드 주방 바구니와 파스타 병 연출', NULL, NULL, NULL, 2),
    (v_product_id, 'gallery', '/products/spread21.png', '아모리 스프레드 플로럴 소품과 함께한 연출컷', NULL, NULL, NULL, 3),
    (v_product_id, 'gallery', '/products/spread4.png', '아모리 스프레드 창가 원형 테이블 연출컷', NULL, NULL, NULL, 4),
    (v_product_id, 'story', '/products/spread1.png', '아모리 스프레드 주방 선반 연출컷', NULL, NULL, NULL, 0),
    (v_product_id, 'material_detail', '/products/spread20.png', '아모리 스프레드 거즈 원단 텍스처 클로즈업', NULL, NULL, NULL, 0),
    (v_product_id, 'color_section', '/products/spread25.png', '아모리 스프레드 크림·오트 컬러 나란히 비교', NULL, NULL, NULL, 0),
    (v_product_id, 'detail', '/products/spread9.png', '아모리 스프레드 아기와 함께한 침대 연출컷', 'left', 2000, 2500, 0),
    (v_product_id, 'detail', '/products/spread18.png', '아모리 스프레드 침구 위 접힌 모습', 'right', 2000, 3001, 1),
    (v_product_id, 'detail', '/products/spread11.png', '아모리 스프레드 화이트 배경 단독 컷', 'full', 2000, 1333, 2),
    (v_product_id, 'detail', '/products/spread2.png', '아모리 스프레드 서랍 속 크림·오트 컬러 비교', 'grid', 2000, 1333, 3),
    (v_product_id, 'detail', '/products/spread6.png', '아모리 스프레드 아기 손 디테일', 'grid', 2000, 1333, 4),
    (v_product_id, 'detail', '/products/spread12.png', '아모리 스프레드 테이블 매트 활용 연출', 'grid', 2000, 2000, 5),
    (v_product_id, 'detail', '/products/spread24.png', '아모리 스프레드 접힌 단독 디테일', 'grid', 2000, 2000, 6),
    (v_product_id, 'detail', '/products/spread3.png', '아모리 스프레드 서랍 연출 크림·오트 컬러', 'left', 1947, 2920, 7),
    (v_product_id, 'detail', '/products/spread14.png', '아모리 스프레드 식탁 세팅 디테일', 'right', 1265, 1897, 8),
    (v_product_id, 'detail', '/products/spread10.png', '아모리 스프레드 소파 위 접힌 모습', 'full', 2000, 1333, 9),
    (v_product_id, 'detail', '/products/spread15.png', '아모리 스프레드 식탁 위 유리컵과 커트러리 연출', 'grid', 2000, 1333, 10),
    (v_product_id, 'detail', '/products/spread26.png', '아모리 스프레드 그릇 위에 걸친 연출컷', 'grid', 2000, 1333, 11),
    (v_product_id, 'detail', '/products/spread19.png', '아모리 스프레드 스티치 디테일 클로즈업', 'full', 1851, 1234, 12),
    (v_product_id, 'detail', '/products/spread27.png', '아모리 스프레드 찻잔 세트와 연출컷', 'left', 2000, 3000, 13),
    (v_product_id, 'detail', '/products/spread28.png', '아모리 스프레드 그릇 스택 위 연출컷', 'right', 2000, 3000, 14);
END $$;


-- ────────────────────────────────────────────────────────────
-- FLOWER POUCH (flower-pouch)
-- ────────────────────────────────────────────────────────────
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
    'flower-pouch', 'FLOWER POUCH', '플라워 파우치', '아기와의 외출에 필요한 것들을 사랑스럽게 담아주는 플라워 파우치입니다. 기저귀, 물티슈, 손수건까지 넉넉하게 수납할 수 있는 큰 사이즈로, 가로로 긴 형태라 물건을 넣고 꺼내기 편합니다. 겉감은 부드러운 거즈로, 안감에는 옥스퍼드 원단을 덧대어 적당히 도톰하고 안정적인 형태를 유지합니다. 아이가 자란 뒤에도 여행용, 다용도 파우치로 오래 활용할 수 있습니다.', '아기와의 외출을 사랑스럽게 담는 플라워 파우치', NULL, 8000,
    ARRAY['/products/pouch14.jpg', '/products/pouch2.png']::text[], 'small-things', 50, false, '겉감: 거즈(면)
안감: 옥스퍼드 원단

겉면은 부드러운 거즈로, 안감에는 옥스퍼드 원단을 덧대어 적당히 도톰하고 안정적인 형태를 유지합니다.', '· S — 가로 15.5cm × 세로 15cm
· L — 가로 25.5cm × 세로 20cm
· 스트링(끈) 수납 공간 2cm를 포함한 실측 사이즈입니다.', '· 세탁: 30°C 이하 찬물, 중성세제 사용
· 단독 또는 유사 색상끼리 세탁 권장
· 손세탁 또는 세탁기 약세탁(울 코스)
· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다
· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다
· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)',
    '아기와 외출할 때는 챙길 것들이 참 많습니다. 기저귀, 물티슈, 손수건까지 — 여러 개의 작은 물건을 한곳에 정리해서 담을 수 있는 파우치를 만들고 싶었어요.

큰 블랭킷도 들어가는 넉넉한 크기에 가로로 긴 형태를 더해 물건을 넣고 꺼내기 편하게 만들었습니다. 겉감 거즈에 옥스퍼드 안감을 덧대어 적당히 도톰하게 완성해 내용물이 적어도 쉽게 흐물거리지 않습니다. 아이가 자란 뒤에도 여행용, 다용도 파우치로 오래 곁에 둘 수 있는 아이템입니다.', '[{"label":"넉넉한 수납","body":"큰 블랭킷도 들어가는 넉넉한 크기로, 기저귀와 물티슈, 손수건 같은 외출용품을 한 번에 담을 수 있습니다."},{"label":"편리한 가로형 디자인","body":"가로 폭이 넉넉한 형태로 만들어 물건을 넣고 꺼내기 편합니다."},{"label":"도톰하고 안정적인 형태","body":"겉감 거즈에 옥스퍼드 안감을 덧대어 내용물이 적어도 쉽게 흐물거리지 않습니다."},{"label":"오래 활용하는 다용도 파우치","body":"아이가 자란 뒤에도 여행용, 다용도 파우치로 오래 활용할 수 있습니다."}]'::jsonb, '아모리의 미니 파우치는 처음엔 작은 증정품으로 시작했습니다. 아기를 위한 작은 물건들을 담아드리고 싶은 마음으로 만들었던 그 파우치가, 이제는 기저귀와 물티슈까지 넉넉하게 담을 수 있는 더 큰 사이즈의 플라워 파우치로 자라났습니다. 작은 것에서 시작해 실용적인 곁으로 — 아모리의 파우치는 그렇게 함께 커가고 있습니다.', '2 Colors', 'Pink, Blue — 아이의 외출용품에 자연스럽게 어우러지는 2가지 컬러로 준비했습니다.',
    NULL, NULL, '[]'::jsonb, ARRAY['hand-towel', 'spread']::text[],
    '플라워 파우치', NULL, NULL, 0, 'active', true,
    NULL, NULL, NULL, '2026-07-20'
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, name_ko = EXCLUDED.name_ko, description = EXCLUDED.description,
    short_description = EXCLUDED.short_description, tagline = EXCLUDED.tagline, price = EXCLUDED.price,
    images = EXCLUDED.images, category = EXCLUDED.category, stock = EXCLUDED.stock,
    material = EXCLUDED.material, size_guide = EXCLUDED.size_guide, care_instructions = EXCLUDED.care_instructions,
    detail_intro = EXCLUDED.detail_intro, features = EXCLUDED.features, brand_story = EXCLUDED.brand_story,
    color_section_title = EXCLUDED.color_section_title, color_description = EXCLUDED.color_description,
    certification_number = EXCLUDED.certification_number, certification_text = EXCLUDED.certification_text,
    accordion_items = EXCLUDED.accordion_items, related_product_slugs = EXCLUDED.related_product_slugs,
    image_alt_subject = EXCLUDED.image_alt_subject, hardware_info = EXCLUDED.hardware_info,
    rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, sale_status = EXCLUDED.sale_status,
    is_published = EXCLUDED.is_published, updated_at = now()
  RETURNING id INTO v_product_id;

  -- 상품 콘텐츠 재시드: 이 상품의 옵션/이미지를 깨끗하게 다시 채운다 (주문 데이터 아님)
  DELETE FROM public.product_variants WHERE product_id = v_product_id;
  DELETE FROM public.product_images WHERE product_id = v_product_id;

  INSERT INTO public.product_variants (product_id, color_name, color_hex, option_name, image_url, price_override, is_active, display_order) VALUES
    (v_product_id, 'Pink', '#D9AFAE', NULL, NULL, NULL, true, 0),
    (v_product_id, 'Blue', '#A9BBCE', NULL, NULL, NULL, true, 1),
    (v_product_id, NULL, NULL, 'S', NULL, NULL, true, 0),
    (v_product_id, NULL, NULL, 'L', NULL, 13000, true, 1);

  INSERT INTO public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) VALUES
    (v_product_id, 'hero', '/products/pouch0.png', NULL, NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/pouch14.jpg', '아모리 플라워 파우치 Pink Blue 컬러 문에 걸린 모습 (측면 각도)', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/pouch2.png', '아모리 플라워 파우치 북스택 위 감성 연출 컷', NULL, NULL, NULL, 1),
    (v_product_id, 'story', '/products/pouch1.png', '아모리 플라워 파우치에 담긴 아기 장난감과 손수건', NULL, NULL, NULL, 0),
    (v_product_id, 'material_detail', '/products/pouch12.png', '아모리 플라워 파우치 원단 패턴과 끈 디테일 클로즈업', NULL, NULL, NULL, 0),
    (v_product_id, 'color_section', '/products/pouch15.png', '아모리 플라워 파우치 Pink Blue 컬러 여러 개 모아둔 침구 위 컷', NULL, NULL, NULL, 0),
    (v_product_id, 'detail', '/products/pouch11.png', '아모리 Pink 플라워 파우치 우드 플로어 위 연출', 'left', 2000, 3000, 0),
    (v_product_id, 'detail', '/products/pouch4.png', '아모리 Blue 플라워 파우치 안에 담긴 아기 장난감과 인형', 'right', 2000, 3000, 1),
    (v_product_id, 'detail', '/products/pouch9.png', '아모리 플라워 파우치 침실 조명 옆에 놓인 모습', 'grid', 2000, 3000, 2),
    (v_product_id, 'detail', '/products/pouch10.png', '아모리 플라워 파우치 침실 조명 옆 클로즈업 컷', 'grid', 2000, 3001, 3),
    (v_product_id, 'detail', '/products/pouch16.png', '아모리 플라워 파우치 여러 개 침구 위에 펼쳐놓은 모습', 'full', 2000, 1333, 4),
    (v_product_id, 'detail', '/products/pouch3.png', '아모리 플라워 파우치 테이블 위 연출', 'left', 2000, 2999, 5),
    (v_product_id, 'detail', '/products/pouch5.jpg', '아모리 플라워 파우치 테이블 위 연출 (와이드 컷)', 'grid', 2000, 3000, 6),
    (v_product_id, 'detail', '/products/pouch6.png', '아모리 플라워 파우치 소파 위에 놓인 모습', 'grid', 2000, 3000, 7),
    (v_product_id, 'detail', '/products/pouch7.png', '아모리 플라워 파우치 소파 위 연출 (와이드 컷)', 'grid', 2000, 1333, 8),
    (v_product_id, 'detail', '/products/pouch8.png', '아모리 플라워 파우치 소파 위 클로즈업', 'grid', 2000, 1333, 9);
END $$;


-- ────────────────────────────────────────────────────────────
-- HAND TOWEL (hand-towel)
-- ────────────────────────────────────────────────────────────
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
    'hand-towel', 'HAND TOWEL', '핸드타월', '작은 손과 얼굴에 매일 닿는 부드러운 거즈 핸드타월입니다. 3중 거즈 원단을 양면으로 덧대 총 6겹으로 완성해 가볍고 흡수가 빠르며, 헤링본 끈으로 만든 고리가 있어 걸어두고 사용하기 편합니다. 집에서도 어린이집에서도 부담 없이 매일 쓸 수 있습니다.', '작은 손과 얼굴에 매일 닿는 부드러운 거즈 핸드타월', NULL, 9000,
    ARRAY['/products/handtowel3.png', '/products/handtowel11.png', '/products/handtowel1.png', '/products/handtowel12.png', '/products/handtowel13.png']::text[], 'small-things', 50, false, '면 100% 거즈

3중 거즈 원단을 양면으로 덧대어 총 6겹으로 완성했습니다.', '· 가로 25cm × 세로 25cm', '· 세탁: 30°C 이하 찬물, 중성세제 사용
· 단독 또는 유사 색상끼리 세탁 권장
· 손세탁 또는 세탁기 약세탁(울 코스)
· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다
· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다
· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)',
    '아기 얼굴과 손, 엉덩이까지 부담 없이 닦을 수 있는 크기로 만들었습니다. 너무 작지도 크지도 않은 사이즈에, 얇지도 두껍지도 않은 적당한 두께를 더했습니다.

가볍고 부드러운 거즈 원단이라 빠르게 흡수되고, 헤링본 끈으로 만든 고리가 있어 집에서도 어린이집에서도 편하게 걸어두고 사용할 수 있습니다.', '[{"label":"부드러운 거즈 원단","body":"3중 거즈를 양면으로 덧대 총 6겹으로 완성해 부드러우면서도 도톰합니다."},{"label":"가볍고 빠른 흡수","body":"가벼운 거즈 소재로 빠르게 물기를 흡수합니다."},{"label":"부담스럽지 않은 크기","body":"휴대하기 부담스럽지 않은 크기로, 아기 얼굴과 손을 닦기에 알맞습니다."},{"label":"고리형 디자인","body":"헤링본 끈으로 만든 고리가 있어 집과 어린이집 어디서나 걸어두고 사용할 수 있습니다."}]'::jsonb, '아모리는 거즈 소재를 중심으로 아기를 위한 패브릭을 만들어왔습니다. 그 부드러운 소재로 매일 곁에 두고 쓸 수 있는 것을 고민하다, 아기 얼굴과 손을 닦아주는 작은 핸드타월을 만들게 되었습니다. 매일 아기 피부에 닿는 것이니만큼, 부드럽고 가벼운 거즈 그대로의 촉감을 담았습니다.', '4 Colors', 'Baby Pink, Green Apple, Lavender, Sky — 아이의 공간 어디에나 자연스럽게 어우러지는 4가지 컬러로 준비했습니다.',
    'CB014H2463-6001', NULL, '[]'::jsonb, ARRAY['spread', 'gauze-bib', 'gauze-scarf-bib']::text[],
    '핸드타월', NULL, NULL, 0, 'active', true,
    NULL, NULL, NULL, '2026-07-20'
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name, name_ko = EXCLUDED.name_ko, description = EXCLUDED.description,
    short_description = EXCLUDED.short_description, tagline = EXCLUDED.tagline, price = EXCLUDED.price,
    images = EXCLUDED.images, category = EXCLUDED.category, stock = EXCLUDED.stock,
    material = EXCLUDED.material, size_guide = EXCLUDED.size_guide, care_instructions = EXCLUDED.care_instructions,
    detail_intro = EXCLUDED.detail_intro, features = EXCLUDED.features, brand_story = EXCLUDED.brand_story,
    color_section_title = EXCLUDED.color_section_title, color_description = EXCLUDED.color_description,
    certification_number = EXCLUDED.certification_number, certification_text = EXCLUDED.certification_text,
    accordion_items = EXCLUDED.accordion_items, related_product_slugs = EXCLUDED.related_product_slugs,
    image_alt_subject = EXCLUDED.image_alt_subject, hardware_info = EXCLUDED.hardware_info,
    rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, sale_status = EXCLUDED.sale_status,
    is_published = EXCLUDED.is_published, updated_at = now()
  RETURNING id INTO v_product_id;

  -- 상품 콘텐츠 재시드: 이 상품의 옵션/이미지를 깨끗하게 다시 채운다 (주문 데이터 아님)
  DELETE FROM public.product_variants WHERE product_id = v_product_id;
  DELETE FROM public.product_images WHERE product_id = v_product_id;

  INSERT INTO public.product_variants (product_id, color_name, color_hex, option_name, image_url, price_override, is_active, display_order) VALUES
    (v_product_id, 'Baby Pink', '#F3B6C4', NULL, '/products/handtowel15-babypink.png', NULL, true, 0),
    (v_product_id, 'Green Apple', '#B7C97A', NULL, '/products/handtowel16-greenapple.png', NULL, true, 1),
    (v_product_id, 'Lavender', '#B9A0C9', NULL, '/products/handtowel14-lavendar.png', NULL, true, 2),
    (v_product_id, 'Sky', '#AFCBE0', NULL, '/products/handtowel17-sky.png', NULL, true, 3);

  INSERT INTO public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) VALUES
    (v_product_id, 'hero', '/products/handtowel0.png', NULL, NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/handtowel3.png', '아모리 핸드타월 네 컬러를 겹쳐 놓은 플랫레이', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/handtowel11.png', '아모리 핸드타월 여러 장을 부채꼴로 세운 스타일컷', NULL, NULL, NULL, 1),
    (v_product_id, 'gallery', '/products/handtowel1.png', '아모리 핸드타월 두 쌍이 주방 고리에 걸린 모습', NULL, NULL, NULL, 2),
    (v_product_id, 'gallery', '/products/handtowel12.png', '아모리 핸드타월 스택이 타일 창턱에 놓인 모습', NULL, NULL, NULL, 3),
    (v_product_id, 'gallery', '/products/handtowel13.png', '아모리 핸드타월 스택이 놓인 창가 세로 컷', NULL, NULL, NULL, 4),
    (v_product_id, 'story', '/products/handtowel5.png', '아모리 그린애플 핸드타월이 볕 드는 주방 철제 바구니에 걸쳐진 모습', NULL, NULL, NULL, 0),
    (v_product_id, 'material_detail', '/products/handtowel4.png', '아모리 핸드타월 거즈 원단의 자잘한 조직이 클로즈업된 모습', NULL, NULL, NULL, 0),
    (v_product_id, 'color_section', '/products/handtowel2.png', '아모리 핑크·라벤더·그린애플·스카이 네 컬러 핸드타월이 나란히 걸린 클로즈업', NULL, NULL, NULL, 0),
    (v_product_id, 'detail', '/products/handtowel8.png', '아모리 핸드타월 거는 고리 디테일 클로즈업', 'left', 1333, 1333, 0),
    (v_product_id, 'detail', '/products/handtowel6.png', '아모리 핸드타월이 와이어 바구니에 걸쳐진 모습', 'full', 2000, 1333, 1),
    (v_product_id, 'detail', '/products/handtowel9.png', '아모리 핸드타월 스택 모서리와 라벨 디테일', 'right', 2000, 1333, 2),
    (v_product_id, 'detail', '/products/handtowel10.png', '아모리 핸드타월 스택 모서리 라벨 클로즈업', 'full', 1848, 1232, 3),
    (v_product_id, 'detail', '/products/handtowel7.png', '아모리 핸드타월 라벨과 마감선이 나열된 디테일', 'left', 1915, 1277, 4);
END $$;

