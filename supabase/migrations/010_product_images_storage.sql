-- 010_product_images_storage.sql
--
-- 관리자 페이지에서 상품 이미지를 파일로 업로드하기 위한 Supabase Storage 버킷과 정책.
--
-- 버킷: product-images (공개 읽기 — 상품 이미지는 쇼핑몰에 공개 노출되므로 public)
-- 쓰기(업로드/수정/삭제): 관리자(is_admin())만. 읽기(SELECT): 누구나(public 버킷).

-- 1) 버킷 생성 (이미 있으면 무시)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 2) 정책 (storage.objects) -----------------------------------------------
-- 공개 읽기
drop policy if exists "product-images public read" on storage.objects;
create policy "product-images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- 관리자 업로드
drop policy if exists "product-images admin insert" on storage.objects;
create policy "product-images admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

-- 관리자 수정
drop policy if exists "product-images admin update" on storage.objects;
create policy "product-images admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- 관리자 삭제
drop policy if exists "product-images admin delete" on storage.objects;
create policy "product-images admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Rollback (검토용 — 실행하지 않음):
--   drop policy if exists "product-images public read" on storage.objects;
--   drop policy if exists "product-images admin insert" on storage.objects;
--   drop policy if exists "product-images admin update" on storage.objects;
--   drop policy if exists "product-images admin delete" on storage.objects;
--   delete from storage.buckets where id = 'product-images';
