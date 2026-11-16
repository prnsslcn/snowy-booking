import type { NextConfig } from "next";

/**
 * Supabase 공개 설정(URL·anon 키) 빌드 시 주입.
 *
 * Vercel 이 Production 변수를 Sensitive 로 강제하는데, NEXT_PUBLIC_ 접두사 변수는 Sensitive 로
 * 저장할 수 없어 대시보드에서 추가가 거부된다. → Vercel 에는 접두사 없는 SUPABASE_URL /
 * SUPABASE_ANON_KEY 로 넣고, 여기서 NEXT_PUBLIC_ 이름으로 매핑해 클라이언트 번들에 인라인한다.
 * 로컬(.env.local)의 NEXT_PUBLIC_ 이름도 그대로 우선 사용된다.
 * (둘 다 원래 브라우저에 공개되는 값 — service role 키는 절대 여기 넣지 않는다.)
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const nextConfig: NextConfig = {
  // 개발 중 좌측 하단 Next.js 인디케이터 숨김
  devIndicators: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  },
};

export default nextConfig;
