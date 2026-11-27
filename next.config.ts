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

/**
 * CSP — 실제 차단(2026-11-28: Report-Only 로 올려 토스 라이브 결제·고객 취소·관리자 환불까지 경고 0건 확인 후 전환).
 * 새 외부 리소스(스크립트·글꼴·iframe 등)를 추가하면 여기에 허용해야 화면에서 막히지 않는다.
 *  - 토스는 공식 허용 목록이 없어 결제위젯(js.tosspayments.com → 결제수단·약관 iframe)과 토스 계열 도메인을 넓게 허용
 *  - script 'unsafe-inline': Next 가 RSC 데이터를 인라인 스크립트로 넣음(nonce 를 쓰면 모든 화면이 동적 렌더링이 돼 CDN 캐시를 잃음)
 *  - style 'unsafe-inline': framer-motion·인라인 style 속성
 *  - Supabase: 관리자 로그인·로그아웃이 브라우저에서 직접 호출
 */
const TOSS = 'https://*.tosspayments.com https://*.toss.im';
const isDev = process.env.NODE_ENV !== 'production';
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} ${TOSS}`,
  `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net ${TOSS}`,
  `font-src 'self' data: https://cdn.jsdelivr.net ${TOSS}`,
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseUrl} ${TOSS}${isDev ? ' ws: wss:' : ''}`,
  `frame-src ${TOSS}`,
  "frame-ancestors 'self'",
  `form-action 'self' ${TOSS}`,
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // 로컬에서 운영 DB용 dev 서버와 로컬 DB용 dev 서버를 함께 띄울 때 빌드 폴더를 나눈다(NEXT_DIST_DIR=.next-local)
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // 개발 중 좌측 하단 Next.js 인디케이터 숨김
  devIndicators: false,
  // 개발 서버: 같은 와이파이의 휴대폰에서 내부 IP(192.168.x.x:3000 등)로 열 때 JS·HMR 이 막히지 않게(운영 빌드와 무관)
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  },
  // 베타로 시험하던 주소 → 정식 주소(폰 홈·시설 안내로 이식됨, 2026-11-25)
  async redirects() {
    return [
      { source: '/beta', destination: '/', permanent: false },
      { source: '/beta1', destination: '/cabana', permanent: false },
      { source: '/beta2', destination: '/caravan', permanent: false },
      { source: '/beta3', destination: '/caravan-group', permanent: false },
    ];
  },
  // 기본 보안 헤더(HSTS 는 Vercel 이 붙임) + CSP(위)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
