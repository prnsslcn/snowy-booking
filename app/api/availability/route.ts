import { NextResponse } from 'next/server';

import { getAvailabilityCached } from '@/lib/booking/availability';

/**
 * 예약 가능 기간 전체의 날짜별·유형별 잔여·요금. 표시용(실제 차단은 reserve).
 *
 * 오픈 몰림 대비 2단 캐시:
 * 1) Vercel CDN — 5초 동안 같은 응답을 CDN 이 바로 준다(서버·DB 까지 오지 않음). 그 뒤 5초까지는 옛 응답을 주면서
 *    뒤에서 새로 받아 둔다 → 손님이 보는 현황은 최대 약 10초 전. 브라우저에는 저장하지 않는다(Cache-Control no-store).
 * 2) 서버 메모리 — CDN 이 새로 받으러 올 때 같은 서버의 동시 요청은 DB 조회 하나를 나눠 씀(getAvailabilityCached).
 * 매진·휴장 등은 reserve_booking 이 DB 에서 다시 판정하므로 몇 초 늦은 표시는 안전하다.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getAvailabilityCached();
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
        'CDN-Cache-Control': 'public, max-age=5, stale-while-revalidate=5',
      },
    });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
