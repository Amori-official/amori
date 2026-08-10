import { createClient } from "@/lib/supabase";

const BUCKET = "product-images";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * 상품 이미지를 Supabase Storage(product-images 버킷)에 업로드하고 공개 URL을 반환한다.
 * 업로드 권한은 스토리지 RLS(is_admin())로 강제되므로 관리자 세션에서만 성공한다.
 * (클라이언트에서 브라우저 Supabase 클라이언트로 직접 업로드)
 */
export async function uploadProductImage(file: File): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { error: "이미지 업로드를 사용할 수 없습니다." };

  if (file.size > MAX_BYTES) return { error: "이미지는 8MB 이하만 업로드할 수 있습니다." };
  if (file.type && !ALLOWED.includes(file.type)) {
    return { error: "PNG·JPG·WEBP·GIF 이미지만 업로드할 수 있습니다." };
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${crypto.randomUUID()}.${ext || "png"}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
