import { NextResponse } from 'next/server';

import { confirmBooking } from '@/lib/booking/confirm';
import { int, readJson, str } from '@/lib/http';
import { PaymentError, paymentHttpStatus } from '@/lib/payments/errors';

/** 토스 결제 성공 콜백 → 서버 승인 재검증 → 확정. 클라이언트 결과만 믿고 확정하지 않는다. */

interface Body {
  paymentKey: unknown;
  orderId: unknown;
  amount: unknown;
}

export async function POST(request: Request) {
  const body = await readJson<Body>(request);
  const paymentKey = str(body?.paymentKey);
  const orderId = str(body?.orderId);
  const amount = int(body?.amount);
  if (!paymentKey || !orderId || amount === null || amount <= 0) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  try {
    const result = await confirmBooking({ paymentKey, orderId, amount });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.code }, { status: paymentHttpStatus(error.code) });
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
