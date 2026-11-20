-- ============================================================
-- 057_second_flaw_grid.sql — SECOND 하자 예시 사진 교체(그리드용, 캡션 내장)
-- ============================================================
-- 캡션이 이미지에 포함된 새 하자 예시 사진 7장(정사각 1000x1000)으로 교체한다.
-- 상세페이지 RenewalNotice는 이미지가 3장 이상이면 2단 그리드(캡션 없이)로 렌더.
-- 안내 문구는 그리드가 설명을 대신하므로 간결하게 줄인다.
--
-- 멱등: 기존 role='renewal' 이미지를 지우고 새로 넣는다. 'second' 없으면 건너뜀.
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
     set renewal_notice = E'사용엔 문제없어요 — 작은 흠이 있는 세컨드·구버전입니다\n제작 과정에서 생긴 아주 작은 흠이 있는 제품이에요. 아래 사진에서 어떤 흠이 있을 수 있는지 꼭 확인하신 뒤 구매해주세요. 색상·옵션은 선택하신 대로 발송되며, 흠의 종류·위치는 지정하실 수 없습니다.\n\n*단순변심에 의한 교환·환불은 불가합니다.*',
         updated_at = now()
   where id = v_pid;

  delete from public.product_images where product_id = v_pid and role = 'renewal';

  insert into public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) values
    (v_pid, 'renewal', '/products/second-flaw-1.webp', '원단이 조금 밀린 예시',      'grid', 1000, 1000, 0),
    (v_pid, 'renewal', '/products/second-flaw-2.webp', '박음질이 깔끔하지 않은 예시', 'grid', 1000, 1000, 1),
    (v_pid, 'renewal', '/products/second-flaw-3.webp', '끝부분이 조금 틀어진 예시',   'grid', 1000, 1000, 2),
    (v_pid, 'renewal', '/products/second-flaw-4.webp', '크기 차이가 나는 예시',       'grid', 1000, 1000, 3),
    (v_pid, 'renewal', '/products/second-flaw-5.webp', '원단 결이 살짝 기울어진 예시', 'grid', 1000, 1000, 4),
    (v_pid, 'renewal', '/products/second-flaw-6.webp', '창구멍이 보이는 예시',        'grid', 1000, 1000, 5),
    (v_pid, 'renewal', '/products/second-flaw-7.webp', '약간의 얼룩이 있는 예시',      'grid', 1000, 1000, 6);
end $$;

commit;
