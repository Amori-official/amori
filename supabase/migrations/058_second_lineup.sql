-- ============================================================
-- 058_second_lineup.sql — SECOND 구성 상품 소개 + 서브썸네일
-- ============================================================
-- 세컨드는 여러 제품을 한 상품으로 팔기 때문에, 각 제품의 정상 사진+설명을
-- "구성 상품" 섹션(products.lineup)으로 보여주고, 상단 갤러리에도 제품 전체컷을
-- 서브썸네일로 추가한다. 기존 정식 상품 사진을 그대로 재활용한다.
--   · products.lineup(jsonb): [{image,title,desc}, ...]
--   · 상단 갤러리: 대표썸네일(hero=블랙프라이데이 배너)은 유지, gallery 행을
--     제품 6종 대표컷으로 교체(중복 배너 행 제거).
-- 멱등: lineup은 덮어쓰기, gallery는 지우고 다시 넣는다.
-- ============================================================

begin;

alter table public.products add column if not exists lineup jsonb;

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
     set lineup = '[
       {"image":"/products/terry-bib-hero.webp","title":"테리빕","desc":"도톰한 테리 원단으로 흡수력이 좋은 라운드 빕"},
       {"image":"/products/terry-scarf-bib-main.webp","title":"테리스카프빕","desc":"포인트가 되는 스카프형 테리 빕"},
       {"image":"/products/bib0.webp","title":"거즈빕","desc":"6중 거즈로 부드럽고 가벼운 라운드 빕"},
       {"image":"/products/scarfbib0.webp","title":"거즈스카프빕","desc":"데일리로 좋은 삼각 스카프형 거즈 빕"},
       {"image":"/products/pouch0.webp","title":"파우치","desc":"끈으로 여미는 데일리 파우치"},
       {"image":"/products/handtowel0.webp","title":"핸드타월 (구버전)","desc":"보송한 거즈 핸드타월, 리뉴얼 이전 버전"}
     ]'::jsonb,
         updated_at = now()
   where id = v_pid;

  -- 상단 갤러리: 기존 gallery 행 제거 후 제품 6종 대표컷을 서브썸네일로.
  delete from public.product_images where product_id = v_pid and role = 'gallery';

  insert into public.product_images (product_id, role, image_url, alt_text, layout, display_order) values
    (v_pid, 'gallery', '/products/terry-bib-hero.webp',       '아모리 테리빕',       'full', 0),
    (v_pid, 'gallery', '/products/terry-scarf-bib-main.webp', '아모리 테리스카프빕', 'full', 1),
    (v_pid, 'gallery', '/products/bib0.webp',                 '아모리 거즈빕',       'full', 2),
    (v_pid, 'gallery', '/products/scarfbib0.webp',            '아모리 거즈스카프빕', 'full', 3),
    (v_pid, 'gallery', '/products/pouch0.webp',               '아모리 파우치',       'full', 4),
    (v_pid, 'gallery', '/products/handtowel0.webp',           '아모리 핸드타월',     'full', 5);
end $$;

commit;
