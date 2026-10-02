-- ============================================================
-- 023_seed_terry_scarf_bib.sql — TERRY SCARF BIB(테리 스카프 빕) 신규 상품 시드
-- ============================================================
-- 면 100% 테리 스카프형 턱받이. 7색 옵션. 대표 썸네일 = 7색 부채꼴 겹침 컷(g8).
-- 재실행 안전: products slug UPSERT, variants/images는 해당 product 범위 DELETE 후 재삽입.
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
    'terry-scarf-bib', 'TERRY SCARF BIB', '테리 스카프 빕',
    '국내산 면 100% 테리 원단으로 만든 스카프형 턱받이입니다. 도톰한 테리 원단이 침과 물기를 빠르게 흡수해 침이 많은 아기도 보송하게, 포근하고 따뜻하게 사용할 수 있습니다. 스냅 단추로 간편하게 채우고, 간절기에는 아기의 목을 포근하게 보호해주며 외출 시 스카프 아이템으로도 잘 어울립니다. 앞뒤 양면을 모두 사용할 수 있고, 쨍하지 않은 은은한 색감으로 어떤 코디에도 자연스럽게 어우러집니다.',
    '턱받이처럼 실용적이고 스카프처럼 자연스러운 도톰한 테리 스카프빕',
    NULL, 13000,
    ARRAY['/products/terry-scarf-bib-g8.webp', '/products/terry-scarf-bib-g4.webp', '/products/terry-scarf-bib-g7.webp', '/products/terry-scarf-bib-g5.webp']::text[],
    'small-things', 100, false,
    '국내산 면 100% 테리 원단

테리 원단은 도톰하면서도 부드러운 감촉이 특징으로, 수분을 빠르게 흡수해 흡수력이 뛰어납니다. Amori의 테리 스카프 빕은 도톰한 테리 원단을 사용해 침이 많은 아기도 보송하게, 포근하고 따뜻하게 사용할 수 있습니다. 앞뒤 양면을 모두 사용할 수 있어 하루에도 여러 번 뒤집어 쓰기 좋습니다.

· 소재: 면(cotton) 100%
· 원산지: 국내산
· KC 안전 인증 완료 (어린이제품 공통안전기준)',
    '프리 사이즈 (신생아 ~ 36개월)

· 가로 약 39cm × 세로 약 14cm
· 스냅 단추로 간편하게 착용할 수 있습니다.
· 간절기 아기의 목을 포근하게 보호해주며, 외출 시 스카프로도 활용됩니다.',
    '· 세탁: 30°C 이하 찬물, 중성세제 사용
· 첫 세탁 시 단독으로 세탁해 주세요 (이염 방지)
· 손세탁 또는 세탁기 약세탁(울 코스) 권장
· 건조기 사용 자제 — 수축·변형의 원인이 될 수 있습니다
· 테리 원단 특성상 세탁 후 표면 결이 살짝 눌릴 수 있으나, 툭툭 털어 말리면 자연스럽게 살아납니다
· 직사광선 장시간 노출 시 색이 바랠 수 있습니다',
    '목을 포근하게, 스타일은 자연스럽게

간절기 아기의 목은 더 챙겨주고 싶어요. 테리 스카프 빕은 도톰한 테리 원단이 침과 물기를 빠르게 흡수해 보송하게 지켜주면서, 스카프처럼 목을 포근하게 감싸줍니다. 스냅 단추로 간편하게 채우고, 외출할 때는 자연스러운 스카프 아이템으로도 잘 어울려요.',
    '[{"label":"도톰한 흡수력","body":"도톰한 테리 원단이 침과 물기를 빠르게 흡수해, 침이 많은 아기도 보송하게 지켜줍니다."},{"label":"목을 포근하게","body":"스카프처럼 목을 감싸 간절기 아기의 목을 포근하게 보호해 줍니다."},{"label":"스카프처럼 활용·양면","body":"앞뒤 모두 사용할 수 있고, 외출 시 자연스러운 스카프 아이템으로도 잘 어울립니다."},{"label":"KC 안전기준 확인","body":"아기 피부에 직접 닿는 제품인 만큼 어린이제품 안전기준에 따른 시험을 완료했습니다. (인증번호: CB014H2463-6001)"}]'::jsonb,
    '아이의 피부에 가장 먼저 닿는 것들은 단순하고 믿음직해야 한다고 생각합니다. Amori의 테리 스카프 빕은 꾸밈보다 실용에, 화려함보다 편안함에 집중했습니다. 쨍하지 않은 은은한 색으로, 아이의 옷과 공간 어디에나 자연스럽게 스며들도록 준비했습니다.',
    '7 Colors',
    'Burgundy, Charcoal, Dust, Lilac, Yellow, Stone Blue, Yellow Green — 쨍하지 않고 어디에나 자연스럽게 어울리는 7가지 컬러로 준비했습니다.',
    'CB014H2463-6001', NULL, '[]'::jsonb,
    ARRAY['terry-bib', 'gauze-scarf-bib']::text[],
    '아모리 테리 스카프 빕', NULL, NULL, 0, 'active', true,
    NULL, NULL, NULL, '2026-10-02'
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
    SELECT id INTO v_product_id FROM public.products WHERE slug = 'terry-scarf-bib';
  END IF;

  -- 색상 옵션(7색) — 색상 선택 시 해당 색 단독 컷으로 전환 + Colors 3열 그리드 자동 노출
  DELETE FROM public.product_variants WHERE product_id = v_product_id;
  INSERT INTO public.product_variants (product_id, color_name, color_hex, option_name, image_url, price_override, is_active, display_order) VALUES
    (v_product_id, 'Burgundy',     '#8E4B4E', NULL, '/products/terry-scarf-bib-burgundy.webp',    NULL, true, 0),
    (v_product_id, 'Charcoal',     '#574B4E', NULL, '/products/terry-scarf-bib-charcoal.webp',    NULL, true, 1),
    (v_product_id, 'Dust',         '#CBB7A2', NULL, '/products/terry-scarf-bib-dust.webp',        NULL, true, 2),
    (v_product_id, 'Lilac',        '#C49AA6', NULL, '/products/terry-scarf-bib-lilac.webp',       NULL, true, 3),
    (v_product_id, 'Yellow',       '#E8CE8E', NULL, '/products/terry-scarf-bib-yellow.webp',      NULL, true, 4),
    (v_product_id, 'Stone Blue',   '#8C9BB0', NULL, '/products/terry-scarf-bib-stoneblue.webp',   NULL, true, 5),
    (v_product_id, 'Yellow Green', '#AFB07A', NULL, '/products/terry-scarf-bib-yellowgreen.webp', NULL, true, 6);

  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) VALUES
    -- 대표(샵 목록 썸네일) = 7색 부채꼴 겹침
    (v_product_id, 'hero', '/products/terry-scarf-bib-g8.webp', '아모리 테리 스카프 빕 7가지 컬러', NULL, NULL, NULL, 0),
    -- 상단 갤러리 캐러셀
    (v_product_id, 'gallery', '/products/terry-scarf-bib-g8.webp', '테리 스카프 빕 7가지 컬러', NULL, NULL, NULL, 0),
    (v_product_id, 'gallery', '/products/terry-scarf-bib-g4.webp', '테리 스카프 빕 7색 라인업', NULL, NULL, NULL, 1),
    (v_product_id, 'gallery', '/products/terry-scarf-bib-g7.webp', '테리 스카프 빕 7색 플랫 연출', NULL, NULL, NULL, 2),
    (v_product_id, 'gallery', '/products/terry-scarf-bib-g5.webp', '테리 스카프 빕 7색 연출', NULL, NULL, NULL, 3),
    -- 전체 폭 배너
    (v_product_id, 'material_detail', '/products/terry-scarf-bib-g6.webp', '테리 스카프 빕 7색 원형 연출', NULL, 2000, 1219, 0),
    -- Details 섹션 — 단체(연출) 컷 전부 (중복 OK: 상세페이지를 풍부하게)
    (v_product_id, 'detail', '/products/terry-scarf-bib-g8.webp',  '테리 스카프 빕 7색 부채꼴', 'full', 2000, 1333, 0),
    (v_product_id, 'detail', '/products/terry-scarf-bib-g4.webp',  '테리 스카프 빕 7색 라인업', 'grid', 2000, 1333, 1),
    (v_product_id, 'detail', '/products/terry-scarf-bib-g5.webp',  '테리 스카프 빕 7색 연출',   'grid', 2000, 1333, 2),
    (v_product_id, 'detail', '/products/terry-scarf-bib-g7.webp',  '테리 스카프 빕 7색 플랫',   'grid', 2000, 1333, 3),
    (v_product_id, 'detail', '/products/terry-scarf-bib-g1.webp',  '테리 스카프 빕 연출 1',     'grid', 2000, 1333, 4),
    (v_product_id, 'detail', '/products/terry-scarf-bib-g2.webp',  '테리 스카프 빕 연출 2',     'grid', 2000, 1333, 5),
    (v_product_id, 'detail', '/products/terry-scarf-bib-g3.webp',  '테리 스카프 빕 연출 3',     'grid', 2000, 1333, 6),
    (v_product_id, 'detail', '/products/terry-scarf-bib-g9.webp',  '테리 스카프 빕 컬러 디테일 1', 'grid', 2000, 1333, 7),
    (v_product_id, 'detail', '/products/terry-scarf-bib-g10.webp', '테리 스카프 빕 컬러 디테일 2', 'grid', 2000, 1333, 8),
    (v_product_id, 'detail', '/products/terry-scarf-bib-g11.webp', '테리 스카프 빕 컬러 디테일 3', 'full', 2000, 1333, 9);
END $$;
