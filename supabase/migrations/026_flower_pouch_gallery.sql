-- ============================================================
-- 026_flower_pouch_gallery.sql — FLOWER POUCH 갤러리 썸네일 정리
-- ============================================================
-- 문제: 상세페이지 상단 썸네일이 hero(pouch0, 창가 역광) + gallery(pouch14, pouch2)
--      3장인데, hero와 pouch14가 둘 다 "창가에 걸린 파우치"라 거의 중복.
-- 수정: 중복인 pouch14 제거하고, 상세(Details)에 이미 쓰인 컷들을 gallery로
--      추가해 썸네일을 총 6장(hero + gallery 5장)으로 구성. 다양한 장면으로 선별.
--      (이미 존재하는 이미지 파일만 사용 — 새 업로드 없음. detail 역할에도 그대로
--       남겨두므로 상단 썸네일과 하단 Details에 중복 노출되는 건 의도된 동작.)
-- 재실행 안전: flower-pouch의 gallery 역할 행만 DELETE 후 재삽입.
-- ============================================================

do $$
declare v_id uuid;
begin
  select id into v_id from public.products where slug = 'flower-pouch';
  if v_id is null then return; end if;

  delete from public.product_images
    where product_id = v_id and role = 'gallery';

  insert into public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) values
    (v_id, 'gallery', '/products/pouch11.png', '아모리 Pink 플라워 파우치 우드 플로어 위 연출', null, null, null, 0),
    (v_id, 'gallery', '/products/pouch4.png',  '아모리 Blue 플라워 파우치 안에 담긴 아기 장난감과 인형', null, null, null, 1),
    (v_id, 'gallery', '/products/pouch2.png',  '아모리 플라워 파우치 북스택 위 감성 연출 컷', null, null, null, 2),
    (v_id, 'gallery', '/products/pouch9.png',  '아모리 플라워 파우치 침실 조명 옆에 놓인 모습', null, null, null, 3),
    (v_id, 'gallery', '/products/pouch6.png',  '아모리 플라워 파우치 소파 위에 놓인 모습', null, null, null, 4);
end $$;
