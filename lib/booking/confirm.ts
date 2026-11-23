import 'server-only';

import { dispatchBookingNotification } from '@/lib/notifications/dispatch';
import { PaymentError, needsCompensation, toPaymentError } from '@/lib/payments/errors';
import { getTossClient, type TossClient } from '@/lib/payments/toss';
import type { ConfirmPaymentInput, TossPaymentResult } from '@/lib/payments/types';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/** 받는 결제수단(토스 승인 응답의 method 값). 카드 결제창(method: 'CARD')과 같은 범위. */
const ALLOWED_PAYMENT_METHODS = ['카드', '간편결제'];

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

  // 토스 승인(캡처). 응답 유실·시간 초과·'이미 승인됨'이면 토스 원천 조회로 실제 상태를 확인해 이어 간다.
  let tossResult: TossPaymentResult;
  try {
    tossResult = await toss.confirm({ ...input, amount: pre.amount });
  } catch (e) {
    let current: TossPaymentResult | null = null;
    try {
      current = await toss.get(input.paymentKey);
    } catch {
      // 조회도 실패 — 원래 오류를 돌려준다(웹훅이 나중에 맞춘다)
    }
    if (!current || current.status !== 'DONE' || current.orderId !== input.orderId) {
      throw e instanceof PaymentError ? e : toPaymentError(e);
    }
    tossResult = current;
  }

  return settlePayment(supabase, toss, input.orderId, tossResult);
}

/**
 * 토스에서 결제가 된 뒤 우리 쪽 확정 — 결제 승인 화면과 웹훅(DONE) 둘 다 쓴다.
 *  - 결제 완료(DONE)·주문번호 일치만 확정. 가상계좌 입금 대기 등은 확정하지 않고 취소(보상).
 *  - confirm_booking_tx 가 확정 불가(만료·금액 불일치)면 보상 취소.
 *  - 알 수 없는 DB 오류면 예약 상태를 다시 보고: 이미 확정이면 그대로, 아직 대기면 한 번 더, 아니면 보상.
 */
export async function settlePayment(
  supabase: AdminClient,
  toss: TossClient,
  orderId: string,
  tossResult: TossPaymentResult,
): Promise<ConfirmResult> {
  if (tossResult.status !== 'DONE' || tossResult.orderId !== orderId) {
    await compensate(supabase, toss, tossResult, 'PAYMENT_NOT_COMPLETED');
    throw new PaymentError('PAYMENT_NOT_COMPLETED');
  }
  // 결제수단은 grill-booking 과 같게 카드 결제창 범위(카드·간편결제)만. 위젯 화면에서 먼저 막지만 서버에서 한 번 더
  if (!ALLOWED_PAYMENT_METHODS.includes(tossResult.method ?? '')) {
    await compensate(supabase, toss, tossResult, 'METHOD_NOT_ALLOWED');
    throw new PaymentError('METHOD_NOT_ALLOWED', `허용되지 않은 결제수단: ${tossResult.method ?? '(없음)'}`);
  }

  const runTx = () =>
    supabase.rpc('confirm_booking_tx', {
      p_order_id: orderId,
      p_payment_key: tossResult.paymentKey,
      p_amount: tossResult.totalAmount,
      p_method: (tossResult.method ?? null) as string,
      p_approved_at: (tossResult.approvedAt ?? null) as string,
      p_raw: tossResult.raw as Json,
    });

  let { data, error } = await runTx();

  if (error) {
    let perr = toPaymentError(error);
    if (perr.code === 'UNKNOWN') {
      const { data: now } = await supabase.from('bookings').select('status, lookup_code').eq('order_id', orderId).maybeSingle();
      if (now && ['confirmed', 'checked_in', 'checked_out'].includes(now.status)) {
        return { orderId, lookupCode: now.lookup_code, outcome: 'ALREADY_CONFIRMED' };
      }
      if (now?.status === 'pending_payment') {
        ({ data, error } = await runTx());
        if (!error) return finish(supabase, orderId, data);
        perr = toPaymentError(error);
      }
      // 확정할 수 없는 상태(만료·취소) — 결제된 돈은 돌려준다
      if (perr.code === 'UNKNOWN' && now && now.status !== 'pending_payment') perr = new PaymentError('BOOKING_NOT_PENDING', perr.message);
    }
    if (needsCompensation(perr.code)) await compensate(supabase, toss, tossResult, perr.code);
    throw perr;
  }

  return finish(supabase, orderId, data);
}

async function finish(supabase: AdminClient, orderId: string, data: unknown): Promise<ConfirmResult> {
  const row = (Array.isArray(data) ? data[0] : data) as { booking_id: string; lookup_code: string | null; outcome: string } | null;
  if (!row) throw new PaymentError('UNKNOWN', 'confirm 결과가 비어 있습니다.');

  if (row.outcome === 'CONFIRMED') {
    await dispatchBookingNotification(supabase, row.booking_id, 'confirm');
  }
  return {
    orderId,
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
