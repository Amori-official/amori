/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 최적화된 이미지를 오래 캐시해 재최적화(콜드) 빈도를 줄인다(31일).
    minimumCacheTTL: 2678400,
    remotePatterns: [
      // Supabase Storage 공개 이미지(product-images 버킷 등) — 관리자 업로드 이미지 렌더용
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
