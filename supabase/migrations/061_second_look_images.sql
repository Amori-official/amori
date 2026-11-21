-- ============================================================
-- 061_second_look_images.sql — SECOND 제품 연출컷(자유 배치)
-- ============================================================
-- 제품의 온전한 모습을 보여주는 연출컷 5장을 상세 "Details" 섹션에 넣는다.
-- layout으로 리듬을 준다: full → grid(2단) → grid → right(우측정렬) → left(좌측정렬).
-- (product-detail-sections의 groupDetailImages가 연속 grid를 2단으로 묶음)
-- 멱등: 기존 role='detail' 제거 후 삽입. 'second' 없으면 건너뜀.
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

  delete from public.product_images where product_id = v_pid and role = 'detail';

  insert into public.product_images (product_id, role, image_url, alt_text, layout, width, height, display_order) values
    (v_pid, 'detail', '/products/second-look-1.webp', '아모리 빕을 착용한 아이들',    'full',  1600, 1066, 0),
    (v_pid, 'detail', '/products/second-look-2.webp', '아모리 빕 전 색상',            'grid',  1600, 1066, 1),
    (v_pid, 'detail', '/products/second-look-3.webp', '아모리 테리 스카프빕 전 색상', 'grid',  1600, 1066, 2),
    (v_pid, 'detail', '/products/second-look-4.webp', '아모리 플라워 파우치',         'right', 1600, 1066, 3),
    (v_pid, 'detail', '/products/second-look-5.webp', '아모리 핸드타월',             'left',  1066, 1600, 4);
end $$;

commit;
