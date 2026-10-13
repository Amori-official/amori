-- ============================================================
-- 045_review_media.sql — 사진/영상 리뷰 + 적립 차등(글 300P / 미디어 500P)
-- ============================================================
-- 변경:
--   1) Storage 버킷 'review-media' 생성(공개 읽기). 업로드는 본인 폴더({uid}/...)만.
--   2) reviews.image_urls text[] 추가(사진/영상 공개 URL 목록).
--   3) create_review(): 이미지 URL 인자 추가 + 적립 차등.
--        · 미디어 1개 이상 첨부: 500P
--        · 글만: 300P
--      반환 컬럼은 그대로(uuid)지만 인자(시그니처)가 바뀌므로 기존 함수를 DROP 후 재생성.
--
-- 롤백:
--   drop function if exists public.create_review(uuid,uuid,int,text,text[]);  → 030 재실행
--   alter table public.reviews drop column image_urls;
--   delete from storage.buckets where id='review-media'; (관련 정책도 drop)
-- ============================================================

begin;

-- 1) 리뷰 미디어 버킷 (공개 읽기)
insert into storage.buckets (id, name, public)
values ('review-media', 'review-media', true)
on conflict (id) do nothing;

-- 공개 읽기
drop policy if exists "review-media public read" on storage.objects;
create policy "review-media public read"
  on storage.objects for select
  using (bucket_id = 'review-media');

-- 본인 폴더({uid}/...)에만 업로드
drop policy if exists "review-media own insert" on storage.objects;
create policy "review-media own insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 본인 파일만 수정/삭제
drop policy if exists "review-media own update" on storage.objects;
create policy "review-media own update"
  on storage.objects for update to authenticated
  using (bucket_id = 'review-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'review-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "review-media own delete" on storage.objects;
create policy "review-media own delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'review-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2) 리뷰 미디어 컬럼
alter table public.reviews
  add column if not exists image_urls text[] not null default '{}';

-- 3) create_review: 미디어 인자 + 적립 차등
drop function if exists public.create_review(uuid, uuid, int, text);

create or replace function public.create_review(
  p_product_id uuid,
  p_order_id uuid,
  p_rating int,
  p_content text,
  p_image_urls text[] default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_review_id uuid;
  v_images text[];
  v_points int;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception '별점은 1~5 사이로 선택해주세요.';
  end if;
  if coalesce(btrim(p_content), '') = '' then
    raise exception '리뷰 내용을 입력해주세요.';
  end if;

  if exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.user_id = v_uid and o.order_status = 'cancelled'
  ) then
    raise exception '취소된 주문은 리뷰를 작성할 수 없습니다.';
  end if;

  if not exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.id = p_order_id
      and o.user_id = v_uid
      and o.order_status <> 'cancelled'
      and o.fulfillment_status = 'delivered'
      and oi.product_id = p_product_id
  ) then
    raise exception '배송 완료된 주문의 상품만 리뷰를 작성할 수 있습니다.';
  end if;

  if exists (
    select 1 from public.reviews where user_id = v_uid and product_id = p_product_id
  ) then
    raise exception '이미 이 상품에 리뷰를 작성하셨습니다.';
  end if;

  -- 미디어 URL 정리: 우리 review-media 버킷 URL만, 최대 5개, 각 500자 이하.
  if p_image_urls is not null then
    select array_agg(u) into v_images
    from (
      select u
      from unnest(p_image_urls) as u
      where u is not null
        and length(u) between 1 and 500
        and position('/review-media/' in u) > 0
      limit 5
    ) t;
  end if;
  v_images := coalesce(v_images, '{}');

  insert into public.reviews (user_id, product_id, order_id, rating, content, image_urls)
  values (v_uid, p_product_id, p_order_id, p_rating, btrim(p_content), v_images)
  returning id into v_review_id;

  update public.products p set
    review_count = (select count(*) from public.reviews r where r.product_id = p_product_id),
    rating       = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.product_id = p_product_id)
  where p.id = p_product_id;

  -- 적립 차등: 사진/영상 첨부 500P, 글만 300P
  v_points := case when array_length(v_images, 1) >= 1 then 500 else 300 end;
  perform public._apply_points(v_uid, v_points, 'earn_review', '리뷰 작성 적립', p_order_id, v_review_id);

  return v_review_id;
end $$;

grant execute on function public.create_review(uuid, uuid, int, text, text[]) to authenticated;

commit;
