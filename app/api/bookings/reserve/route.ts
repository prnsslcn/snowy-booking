import { NextResponse } from 'next/server';

import { BookingError, bookingHttpStatus } from '@/lib/booking/errors';
import { reserveBooking } from '@/lib/booking/reserve';
import { ISO_DATE_RE, int, readJson, str } from '@/lib/http';

/**
 * 선점 → pending_payment. 성공 시 orderId·amount(DB 계산) 반환 → 클라이언트가 토스 결제창 호출.
 * 금액은 클라이언트에서 받지 않는다(DB price_for 가 권위).
 */

interface Body {
  type: unknown;
  date: unknown;
  guestName: unknown;
  guestPhone: unknown;
  guestCount: unknown;
  agreed: unknown;
}

export async function POST(request: Request) {
  const body = await readJson<Body>(request);
  if (!body) return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });

  const type = str(body.type);
  const date = str(body.date);
  const guestCount = int(body.guestCount);
  if (!type || !ISO_DATE_RE.test(date) || guestCount === null) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }
  if (body.agreed !== true) {
    return NextResponse.json({ error: 'AGREEMENT_REQUIRED' }, { status: 400 });
  }

  try {
    const result = await reserveBooking({
      type,
      date,
      guestName: str(body.guestName),
      guestPhone: str(body.guestPhone),
      guestCount,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.code }, { status: bookingHttpStatus(error.code) });
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
