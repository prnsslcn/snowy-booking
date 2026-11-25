import { type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16: 'middleware' 컨벤션이 'proxy'로 변경됨.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 정적 자산·이미지 제외, 그 외 요청에서 세션 갱신.
  // 예약 현황(api/availability)도 제외 — 로그인과 무관하고, 오픈 몰림 때 CDN 캐시로 바로 나가야 해서
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/availability|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
