-- ============================================================
-- 034_images_to_webp.sql — 상품 이미지 참조 PNG → WebP (로딩 속도 개선)
-- ============================================================
-- 배경: 상품 사진이 PNG(장당 11~13MB)라 로딩이 느렸다. 동일 이미지를 WebP로
--       변환(총 1065MB→80MB)하고, DB의 image_url 참조를 .webp로 바꾼다.
--       원본 .png 파일은 삭제하지 않는다(주문내역 스냅샷·안전망 보존).
-- 대상: product_images.image_url, product_variants.image_url 중 '/products/....png'.
-- 안전: 확장자 끝(.png$)만 치환. 재실행해도 이미 .webp면 영향 없음.
-- ============================================================

update public.product_images
set image_url = regexp_replace(image_url, '\.png$', '.webp')
where image_url like '/products/%.png';

update public.product_variants
set image_url = regexp_replace(image_url, '\.png$', '.webp')
where image_url like '/products/%.png';
