import { createClient } from "@/lib/supabase";

const BUCKET = "review-media";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_HEIC_INPUT_BYTES = 40 * 1024 * 1024; // 변환 전 원본 HEIC 상한
const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];

export function isVideo(file: File): boolean {
  return (file.type || "").startsWith("video/");
}

function isHeic(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t === "image/heic" || t === "image/heif") return true;
  // 아이폰 HEIC는 브라우저가 빈 type을 주는 경우가 많아 확장자로도 판별한다.
  return /\.(heic|heif)$/i.test(file.name);
}

// HEIC/HEIF는 대부분 브라우저가 화면에 표시하지 못하므로 업로드 전에 JPEG로 변환한다.
async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default as (opts: {
    blob: Blob;
    toType?: string;
    quality?: number;
  }) => Promise<Blob | Blob[]>;
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  const blob = Array.isArray(out) ? out[0] : out;
  const name = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

/**
 * 리뷰 사진/영상을 Storage(review-media 버킷)의 본인 폴더({uid}/...)에 업로드하고
 * 공개 URL을 반환한다. HEIC 사진은 JPEG로 자동 변환한다.
 */
export async function uploadReviewMedia(file: File): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { error: "업로드를 사용할 수 없습니다." };

  let uploadFile = file;

  // HEIC → JPEG 변환(사진만 해당)
  if (!isVideo(file) && isHeic(file)) {
    if (file.size > MAX_HEIC_INPUT_BYTES) return { error: "사진 용량이 너무 커요. (40MB 이하)" };
    try {
      uploadFile = await convertHeicToJpeg(file);
    } catch {
      return { error: "이 사진을 처리하지 못했어요. 다른 사진으로 올려주세요." };
    }
  }

  const video = isVideo(uploadFile);
  if (video) {
    if (uploadFile.size > MAX_VIDEO_BYTES) return { error: "영상은 50MB 이하만 올릴 수 있어요." };
    if (uploadFile.type && !ALLOWED_VIDEO.includes(uploadFile.type))
      return { error: "MP4·MOV·WEBM 영상만 올릴 수 있어요." };
  } else {
    if (uploadFile.size > MAX_IMAGE_BYTES) return { error: "사진은 8MB 이하만 올릴 수 있어요." };
    if (uploadFile.type && !ALLOWED_IMAGE.includes(uploadFile.type))
      return { error: "PNG·JPG·WEBP·GIF·HEIC 사진만 올릴 수 있어요." };
  }

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { error: "로그인이 필요합니다." };

  const ext = (uploadFile.name.split(".").pop() || (video ? "mp4" : "jpg"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${uid}/${crypto.randomUUID()}.${ext || (video ? "mp4" : "jpg")}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, uploadFile, {
    cacheControl: "3600",
    upsert: false,
    contentType: uploadFile.type || undefined,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
