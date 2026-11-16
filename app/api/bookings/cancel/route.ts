import { NextResponse } from 'next/server';

import { clientIp, lookupBooking } from '@/lib/booking/lookup';
import { RefundError, refundBooking, refundHttpStatus } from '@/lib/booking/refund';
import { readJson, str } from '@/lib/http';

/**
 * 고객 취소 — 조회와 같은 소유 검증(휴대폰 + 4자리, 시도 제한 포함) 후 규정대로 자동 환불.
 * 당일 취소도 입실 전까지 허용(환불 0원, 자리는 재판매 가능해짐 — 운영자 결정 A안).
 */
export async function POST(request: Request) {
  const body = await readJson<{ phone: unknown; code: unknown }>(request);
  if (!body) return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });

  const found = await lookupBooking({
    phone: str(body.phone),
    code: str(body.code),
    ip: clientIp(request.headers),
  });
  if (!found.ok) {
    const status = found.error === 'TOO_MANY_ATTEMPTS' ? 429 : found.error === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: found.error }, { status });
  }
  if (!found.booking.refundPreview) {
    return NextResponse.json({ error: 'NOT_CANCELLABLE' }, { status: 409 });
  }

  try {
    const result = await refundBooking({ orderId: found.booking.orderId, reason: '고객 취소' });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RefundError) {
      return NextResponse.json({ error: error.code }, { status: refundHttpStatus(error.code) });
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
