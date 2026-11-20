-- ============================================================
-- 054_second_defect_images.sql — SECOND 결함 예시 안내(사진+캡션)
-- ============================================================
-- 053에서 만든 'second' 상품에 "이런 흠이 있을 수 있어요" 안내를 추가한다.
--   · renewal_notice: 세컨드/구버전 설명 + 결함 유형 목록(상세페이지 상단 Renewal Notice
--     블록에 공지 텍스트로 렌더됨).
--   · product_images(role='renewal'): 결함 예시 사진 7장 + 캡션(alt_text)으로 렌더.
--     (RenewalNotice 컴포넌트가 이미지마다 figcaption으로 캡션을 노출)
--
-- 멱등: 기존 role='renewal' 이미지를 지우고 다시 넣는다. 'second'가 없으면 건너뜀.
-- 롤백: delete from product_images where role='renewal' and product_id=(second).
-- ============================================================

begin;

do $$
declare
  v_pid uuid;
begin
  select id into v_pid from public.products where slug = 'second';
  if v_pid is null then
    raise notice 'second 상품이 없음 — 053을 먼저 적용하세요';
    return;
  end if;

  update public.products
     set renewal_notice = E'사용엔 문제없어요 — 작은 흠이 있는 세컨드·구버전입니다\n제작 과정에서 생긴 아주 작은 흠이 있는 제품이에요. 아래는 *예시 사진*이며, 실제 받으시는 제품의 흠 종류·위치는 다를 수 있고 지정하실 수 없어요. 색상은 선택하신 색으로 발송됩니다.\n\n[이런 흠이 있을 수 있어요]\n· 라벨을 달며 창구멍을 다른 위치에 낸 경우\n· 스냅 옆 미세한 얼룩\n· 제작 중 원단이 밀려 크기가 미세하게 다름\n· 슬럽(원단 결)이 살짝 기울어짐\n· 박음질이 매끄럽지 않음\n· 모서리 부분 약간의 튿어짐\n· 원단이 밀린 자국\n· 원단 결 방향이 반대로 되어, 위에서 아래로 쓸면 약간 까슬한 경우\n\n*단순변심에 의한 교환·환불은 불가합니다.*',
         updated_at = now()
   where id = v_pid;

  delete from public.product_images where product_id = v_pid and role = 'renewal';

  insert into public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) values
    (v_pid, 'renewal', '/products/second-defect-1.webp', '① 라벨을 달며 창구멍을 다른 위치에 낸 경우', 'full', 1400, 933, 0),
    (v_pid, 'renewal', '/products/second-defect-2.webp', '② 스냅 옆 미세한 얼룩',                   'full', 1400, 933, 1),
    (v_pid, 'renewal', '/products/second-defect-3.webp', '③ 제작 중 원단이 밀려 크기가 미세하게 다름', 'full', 1400, 933, 2),
    (v_pid, 'renewal', '/products/second-defect-4.webp', '④ 슬럽(원단 결)이 살짝 기울어짐',          'full', 1400, 933, 3),
    (v_pid, 'renewal', '/products/second-defect-5.webp', '⑤ 박음질이 매끄럽지 않음',                 'full', 1400, 933, 4),
    (v_pid, 'renewal', '/products/second-defect-6.webp', '⑥ 모서리 부분 약간의 튿어짐',              'full', 1400, 933, 5),
    (v_pid, 'renewal', '/products/second-defect-7.webp', '⑦ 원단이 밀린 자국',                     'full', 1400, 933, 6);
end $$;

commit;
