-- ============================================================
-- 024_hand_towel_renewal.sql — HAND TOWEL 리뉴얼 반영
-- ============================================================
-- 사진을 새로 다 찍지 않고, 상세페이지는 그대로 두되:
--  1) 상세 본문 최상단 공지(renewal_notice) 추가
--  2) 비교 사진(구버전 vs 리뉴얼) 갤러리 앞쪽에 추가(기존 이미지 유지)
--  3) 변경된 사이즈·상품정보 수정 (소재는 그대로)
-- renewal_notice 컬럼은 다른 상품에도 재사용 가능.
-- ============================================================

alter table public.products add column if not exists renewal_notice text;

update public.products set
  short_description = '조금 더 넉넉해진, 작은 손과 얼굴을 위한 부드러운 거즈 핸드타월',
  description = '작은 손과 얼굴에 매일 닿는 부드러운 거즈 핸드타월입니다. 3중 거즈 원단을 양면으로 덧대 총 6겹으로 완성해 가볍고 흡수가 빠르며, 헤링본 끈으로 만든 고리가 있어 걸어두고 사용하기 편합니다. 리뉴얼을 거치며 크기를 더 넉넉하게, 걸이 고리도 조금 더 길게 다듬었고, 앞뒤 같은 색의 깔끔한 단색으로 바뀌었습니다. 집에서도 어린이집에서도 부담 없이 매일 쓸 수 있습니다.',
  size_guide = '· 가로 30cm × 세로 30cm
· 걸이 고리를 조금 더 길게 만들어 걸어두기 편합니다.
※ 리뉴얼로 기존(25×25cm) 대비 가로·세로 각 5cm씩 커졌습니다.',
  color_description = 'Baby Pink, Green Apple, Lavender, Sky — 앞뒤 같은 색의 단색으로, 아이의 공간 어디에나 자연스럽게 어우러지는 4가지 컬러로 준비했습니다.',
  renewal_notice = '거즈 손수건이 *리뉴얼* 됐습니다.

상세페이지에는 *구버전의 손수건 이미지*가 포함되어 있으니, 사이즈와 색상을 확인하시고 주문해 주세요. 주문 시 *리뉴얼된 버전*으로 발송되오니 구매에 착오 없도록 해 주세요.

[이렇게 바뀌었어요]
· 가로·세로 각각 *5cm씩* 길어졌어요 (25×25 → *30×30cm*).
· 양면 배색에서 *앞뒤 동일한 색상*으로 변경되었어요.
· 수건 고리가 조금 더 길어졌어요.

※ 상단 이미지 비교 컷(왼쪽 리뉴얼 버전, 오른쪽 구버전)을 참고해주세요.'
where slug = 'hand-towel';

-- 비교 사진은 공지 박스 전용 role 'renewal'로 넣는다(썸네일/갤러리/Details에는 노출 안 됨).
-- role 체크 제약에 'renewal' 추가.
alter table public.product_images drop constraint if exists product_images_role_check;
alter table public.product_images add constraint product_images_role_check
  check (role in ('hero', 'gallery', 'detail', 'story', 'material_detail', 'color_section', 'renewal'));

-- 비교 사진 추가 (재실행 안전: renewal 이미지만 교체, 기존 이미지는 유지)
do $$
declare v_id uuid;
begin
  select id into v_id from public.products where slug = 'hand-towel';
  if v_id is null then return; end if;

  delete from public.product_images
    where product_id = v_id and image_url like '/products/hand-towel-renewal-%';

  insert into public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) values
    (v_id, 'renewal', '/products/hand-towel-renewal-1.webp', '핸드타월 리뉴얼 비교 (좌 리뉴얼 / 우 구버전)', null, null, null, 0),
    (v_id, 'renewal', '/products/hand-towel-renewal-2.webp', '핸드타월 리뉴얼 비교 (좌 리뉴얼 / 우 구버전)', null, null, null, 1);
end $$;
