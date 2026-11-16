import 'server-only';

import { dispatchBookingNotification } from '@/lib/notifications/dispatch';
import { PaymentError, needsCompensation, toPaymentError } from '@/lib/payments/errors';
import { getTossClient, type TossClient } from '@/lib/payments/toss';
import type { ConfirmPaymentInput, TossPaymentResult } from '@/lib/payments/types';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * 결제 승인 재검증 → 확정 (grill-booking confirm.ts 구조).
 *   1) 사전 조회: 이미 확정 = 멱등 / pending 아님 = 확정 불가(토스 미캡처라 보상 불필요)
 *   2) 금액: 클라이언트 amount 가 아니라 DB amount 와 비교 — 다르면 토스 승인 자체를 하지 않는다
 *   3) 토스 승인(캡처) → confirm_booking_tx(금액 재검증 + payments + confirmed, 단일 트랜잭션)
 *   4) tx 거부(만료 회수·재시도 대체·금액 불일치)면 캡처분 토스 취소(보상)
 *   5) 확정 문자(best-effort)
 */

export interface ConfirmResult {
  orderId: string;
  lookupCode: string | null;
  outcome: 'CONFIRMED' | 'ALREADY_CONFIRMED';
}

export async function confirmBooking(
  input: ConfirmPaymentInput,
  toss: TossClient = getTossClient(),
): Promise<ConfirmResult> {
  const supabase = createAdminClient();

  const { data: pre } = await supabase
    .from('bookings')
    .select('id, status, amount, lookup_code')
    .eq('order_id', input.orderId)
    .maybeSingle();

  if (!pre) throw new PaymentError('BOOKING_NOT_FOUND');
  if (['confirmed', 'checked_in', 'checked_out'].includes(pre.status)) {
    return { orderId: input.orderId, lookupCode: pre.lookup_code, outcome: 'ALREADY_CONFIRMED' };
  }
  if (pre.status !== 'pending_payment') throw new PaymentError('BOOKING_NOT_PENDING');
  if (input.amount !== pre.amount) throw new PaymentError('AMOUNT_MISMATCH'); // 위변조 — 캡처 전 차단

  const tossResult = await toss.confirm({ ...input, amount: pre.amount });

  const { data, error } = await supabase.rpc('confirm_booking_tx', {
    p_order_id: input.orderId,
    p_payment_key: tossResult.paymentKey,
    p_amount: tossResult.totalAmount,
    p_method: (tossResult.method ?? null) as string,
    p_approved_at: (tossResult.approvedAt ?? null) as string,
    p_raw: tossResult.raw as Json,
  });

  if (error) {
    const perr = toPaymentError(error);
    if (needsCompensation(perr.code)) await compensate(supabase, toss, tossResult, perr.code);
    throw perr;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PaymentError('UNKNOWN', 'confirm 결과가 비어 있습니다.');

  if (row.outcome === 'CONFIRMED') {
    await dispatchBookingNotification(supabase, row.booking_id, 'confirm');
  }
  return {
    orderId: input.orderId,
    lookupCode: row.lookup_code,
    outcome: row.outcome === 'CONFIRMED' ? 'CONFIRMED' : 'ALREADY_CONFIRMED',
  };
}

/** 캡처분 토스 전액 취소 + 감사용 payments(cancelled) 기록. */
async function compensate(
  supabase: AdminClient,
  toss: TossClient,
  tossResult: TossPaymentResult,
  reason: string,
): Promise<void> {
  let raw: Json = { compensated: true, reason } as Json;
  try {
    const res = await toss.cancel({ paymentKey: tossResult.paymentKey, cancelReason: `자동 취소(${reason})` });
    raw = { compensated: true, reason, toss: res.raw } as Json;
  } catch (e) {
    raw = { compensated: false, reason, error: String(e) } as Json; // 관리자 확인 대상
  }
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('order_id', tossResult.orderId)
    .maybeSingle();
  if (booking) {
    await supabase.from('payments').insert({
      booking_id: booking.id,
      toss_payment_key: tossResult.paymentKey,
      toss_order_id: tossResult.orderId, // confirm_tx 가 롤백돼 같은 orderId 행이 없음
      amount: tossResult.totalAmount,
      status: 'cancelled',
      method: tossResult.method,
      cancelled_at: new Date().toISOString(),
      raw_response: raw,
    });
  }
}
