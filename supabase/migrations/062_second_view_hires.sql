-- ============================================================
-- 062_second_view_hires.sql — SECOND 연출컷 고화질 교체
-- ============================================================
-- 061의 연출컷이 축소(1600px)+저품질로 뭉개져, 원본 해상도(2000px)+고품질 webp
-- (second-view-*.webp)로 교체한다. 새 파일명으로 Vercel 이미지 최적화 캐시도 리셋.
-- layout 리듬: full → grid → grid → right → left (동일).
-- 멱등: role='detail' 전체 삭제 후 삽입 → 061 적용 여부와 무관하게 동작.
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
    (v_pid, 'detail', '/products/second-view-1.webp', '아모리 빕을 착용한 아이들',    'full',  2000, 1333, 0),
    (v_pid, 'detail', '/products/second-view-2.webp', '아모리 빕 전 색상',            'grid',  2000, 1333, 1),
    (v_pid, 'detail', '/products/second-view-3.webp', '아모리 테리 스카프빕 전 색상', 'grid',  2000, 1333, 2),
    (v_pid, 'detail', '/products/second-view-4.webp', '아모리 플라워 파우치',         'right', 2000, 1333, 3),
    (v_pid, 'detail', '/products/second-view-5.webp', '아모리 핸드타월',             'left',  1333, 2000, 4);
end $$;

commit;
