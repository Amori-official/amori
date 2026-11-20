-- ============================================================
-- 059_second_lineup_copy.sql — SECOND 구성상품 사진/링크 + 문구 수정
-- ============================================================
-- · 세컨드 소개(detail_intro) 문구 교체
-- · lineup: 거즈빕·거즈스카프빕을 "전 색상" 컷으로 교체 + 각 항목 상세 링크(href) 추가
--   (나머지 종류 사진은 그대로)
-- · 상단 갤러리 서브썸네일도 거즈빕·거즈스카프빕을 전 색상 컷으로 교체
-- 멱등: 덮어쓰기 / gallery는 지우고 다시 넣는다. 'second' 없으면 건너뜀.
-- ============================================================

begin;

do $$
declare
  v_pid uuid;
begin
  select id into v_pid from public.products where slug = 'second';
  if v_pid is null then
    raise notice 'second 없음';
    return;
  end if;

  update public.products
     set detail_intro = '사용하는 데에는 전혀 지장 없는, 작은 흠이 있어 그냥 보내기엔 아쉬운 제품들이에요. 그래서 블랙프라이데이를 맞아 더 특별한 가격으로 준비했어요. 좋은 원단과 마감은 그대로, 한정 수량이에요.',
         lineup = '[
           {"image":"/products/terry-bib-hero.webp","title":"테리빕","desc":"도톰한 테리 원단으로 흡수력이 좋은 라운드 빕","href":"/shop/terry-bib"},
           {"image":"/products/terry-scarf-bib-main.webp","title":"테리스카프빕","desc":"포인트가 되는 스카프형 테리 빕","href":"/shop/terry-scarf-bib"},
           {"image":"/products/bib11.webp","title":"거즈빕","desc":"6중 거즈로 부드럽고 가벼운 라운드 빕","href":"/shop/gauze-bib"},
           {"image":"/products/scarfbib17.webp","title":"거즈스카프빕","desc":"데일리로 좋은 삼각 스카프형 거즈 빕","href":"/shop/gauze-scarf-bib"},
           {"image":"/products/pouch0.webp","title":"파우치","desc":"끈으로 여미는 데일리 파우치","href":"/shop/flower-pouch"},
           {"image":"/products/handtowel0.webp","title":"핸드타월 (구버전)","desc":"보송한 거즈 핸드타월, 리뉴얼 이전 버전","href":"/shop/hand-towel"}
         ]'::jsonb,
         updated_at = now()
   where id = v_pid;

  delete from public.product_images where product_id = v_pid and role = 'gallery';
  insert into public.product_images (product_id, role, image_url, alt_text, layout, display_order) values
    (v_pid, 'gallery', '/products/terry-bib-hero.webp',       '아모리 테리빕',       'full', 0),
    (v_pid, 'gallery', '/products/terry-scarf-bib-main.webp', '아모리 테리스카프빕', 'full', 1),
    (v_pid, 'gallery', '/products/bib11.webp',                '아모리 거즈빕 전 색상',       'full', 2),
    (v_pid, 'gallery', '/products/scarfbib17.webp',           '아모리 거즈스카프빕 전 색상', 'full', 3),
    (v_pid, 'gallery', '/products/pouch0.webp',               '아모리 파우치',       'full', 4),
    (v_pid, 'gallery', '/products/handtowel0.webp',           '아모리 핸드타월',     'full', 5);
end $$;

commit;
