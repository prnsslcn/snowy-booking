import { NextResponse } from 'next/server';

import { releasePendingBooking } from '@/lib/booking/reserve';
import { readJson, str } from '@/lib/http';

/**
 * 결제창 이탈·실패(/booking/fail) 시 선점 즉시 반환. pending_payment 만 취소하므로
 * orderId 를 아는 누구든 호출해도 확정 예약에는 영향이 없다(멱등).
 */
export async function POST(request: Request) {
  const body = await readJson<{ orderId: unknown }>(request);
  const orderId = str(body?.orderId);
  if (!orderId) return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  const released = await releasePendingBooking(orderId);
  return NextResponse.json({ released });
}
