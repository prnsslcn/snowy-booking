import { NextResponse } from 'next/server';

import { syncPaymentFromWebhook } from '@/lib/booking/webhook';

/**
 * 토스 웹훅 수신(안전망). 본문은 트리거로만 쓰고 토스 원천 재조회로 검증한다.
 * 항상 200 — 처리는 멱등이라 일시 실패는 재전송·수동 대응으로 커버.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { eventType?: string; data?: { paymentKey?: string; orderId?: string } };
    if (body.eventType === 'PAYMENT_STATUS_CHANGED' && typeof body.data?.paymentKey === 'string') {
      await syncPaymentFromWebhook(body.data.paymentKey, typeof body.data.orderId === 'string' ? body.data.orderId : null);
    }
  } catch {
    // 삼킴(200 유지)
  }
  return NextResponse.json({ received: true });
}
