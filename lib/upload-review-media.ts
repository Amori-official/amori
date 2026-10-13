import { createClient } from "@/lib/supabase";

const BUCKET = "review-media";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];

export function isVideo(file: File): boolean {
  return (file.type || "").startsWith("video/");
}

/**
 * 리뷰 사진/영상을 Storage(review-media 버킷)의 본인 폴더({uid}/...)에 업로드하고
 * 공개 URL을 반환한다. 업로드 권한은 스토리지 RLS로 본인 폴더만 허용된다.
 */
export async function uploadReviewMedia(file: File): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { error: "업로드를 사용할 수 없습니다." };

  const video = isVideo(file);
  if (video) {
    if (file.size > MAX_VIDEO_BYTES) return { error: "영상은 50MB 이하만 올릴 수 있어요." };
    if (file.type && !ALLOWED_VIDEO.includes(file.type))
      return { error: "MP4·MOV·WEBM 영상만 올릴 수 있어요." };
  } else {
    if (file.size > MAX_IMAGE_BYTES) return { error: "사진은 8MB 이하만 올릴 수 있어요." };
    if (file.type && !ALLOWED_IMAGE.includes(file.type))
      return { error: "PNG·JPG·WEBP·GIF 사진만 올릴 수 있어요." };
  }

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { error: "로그인이 필요합니다." };

  const ext = (file.name.split(".").pop() || (video ? "mp4" : "jpg"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${uid}/${crypto.randomUUID()}.${ext || (video ? "mp4" : "jpg")}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
