import { NextResponse } from 'next/server';

import { getAvailability } from '@/lib/booking/availability';

/** 예약 가능 기간 전체의 날짜별·유형별 잔여·요금. 표시용(실제 차단은 reserve). */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getAvailability();
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
