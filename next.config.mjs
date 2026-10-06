/** @type {import('next').NextConfig} */
const nextConfig = {
  // 채널별 짧은 링크 → UTM이 붙은 주소로 이동 (주문 유입 경로 추적, lib/attribution.ts)
  // 인스타 프로필·카카오 채널 등에 긴 UTM 주소 대신 짧은 주소를 노출하기 위함.
  // 임시 리다이렉트(307)로 두어 나중에 목적지를 바꿔도 브라우저 캐시에 남지 않게 한다.
  async redirects() {
    return [
      { source: "/ig", destination: "/?utm_source=instagram&utm_medium=profile", permanent: false },
      { source: "/kakao", destination: "/?utm_source=kakao&utm_medium=channel_home", permanent: false },
    ];
  },
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
