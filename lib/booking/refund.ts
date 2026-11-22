import 'server-only';

import { dispatchBookingNotification } from '@/lib/notifications/dispatch';
import { PaymentError } from '@/lib/payments/errors';
import { getTossClient, type TossClient } from '@/lib/payments/toss';
import { refundAmount } from '@/lib/policy/refund';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/**
 * 환불: 토스 취소 성공 → DB 확정 (순서 엄수, docs/booking-flow.md §3).
 *   1. request_cancel_tx — 잠금 + cancel_requested + 결제키·금액·이용일
 *   2. 환불액 계산(lib/policy/refund.ts, KST) — 관리자 전액 환불이면 100%
 *   3. 토스 사전 조회 — 이미 취소돼 있으면 다시 취소하지 않음(재시도 이중 취소 방지)
 *   4. 토스 취소 — 실패 시 cancel_requested 유지 + record_cancel_error(토스 코드·사유 원문)
 *   5. finalize_refund_tx — payments 취소 반영 + refunded(유닛 자동 해제)
 *   6. 취소 문자(best-effort)
 * 고객 취소·관리자 취소·재시도가 모두 이 함수를 쓴다.
 */

export type RefundErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'NOT_CANCELLABLE'
  | 'NOT_ONLINE'
  | 'NO_PAYMENT'
  | 'CANCEL_IN_PROGRESS'
  | 'TOSS_CANCEL_FAILED'
  | 'UNKNOWN';

const KNOWN: RefundErrorCode[] = ['BOOKING_NOT_FOUND', 'NOT_CANCELLABLE', 'NOT_ONLINE', 'NO_PAYMENT', 'CANCEL_IN_PROGRESS'];

export class RefundError extends Error {
  readonly code: RefundErrorCode;
  readonly tossCode: string | null;
  constructor(code: RefundErrorCode, message?: string, tossCode: string | null = null) {
    super(message ?? code);
    this.name = 'RefundError';
    this.code = code;
    this.tossCode = tossCode;
  }
}

function toRefundError(error: unknown): RefundError {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return new RefundError(KNOWN.find((c) => message.includes(c)) ?? 'UNKNOWN', message);
}

export function refundHttpStatus(code: RefundErrorCode): number {
  switch (code) {
    case 'BOOKING_NOT_FOUND':
      return 404;
    case 'NOT_CANCELLABLE':
    case 'NOT_ONLINE':
    case 'NO_PAYMENT':
    case 'CANCEL_IN_PROGRESS':
      return 409;
    case 'TOSS_CANCEL_FAILED':
      return 502;
    default:
      return 500;
  }
}

export interface RefundInput {
  orderId: string;
  reason: string;
  /** 관리자 전액 환불(규정 무시, 자연재해 등). 입실 상태도 허용. 고객 경로에서는 절대 넘기지 않는다. */
  fullRefund?: boolean;
}

export interface RefundResult {
  bookingId: string;
  refundedAmount: number;
  outcome: 'REFUNDED' | 'ALREADY_REFUNDED';
}

export async function refundBooking(
  input: RefundInput,
  toss: TossClient = getTossClient(),
  now: Date = new Date(),
): Promise<RefundResult> {
  const supabase = createAdminClient();

  // 1) 취소 요청
  const { data: reqData, error: reqError } = await supabase.rpc('request_cancel_tx', {
    p_order_id: input.orderId,
    p_admin_override: input.fullRefund === true,
  });
  if (reqError) throw toRefundError(reqError);
  const req = Array.isArray(reqData) ? reqData[0] : reqData;
  if (!req) throw new RefundError('UNKNOWN', '취소 요청 결과가 비어 있습니다.');
  if (req.outcome === 'ALREADY_REFUNDED') {
    return { bookingId: req.booking_id, refundedAmount: 0, outcome: 'ALREADY_REFUNDED' };
  }

  // 2) 환불액 — 처음 취소를 요청한 시각 기준(실패 후 다음 날 재시도해도 환불율이 바뀌지 않게, 0014)
  const paid = req.paid_amount ?? 0;
  const basis = req.requested_at ? new Date(req.requested_at) : now;
  let refund = input.fullRefund ? paid : refundAmount(paid, req.usage_date, basis);
  let isPartial = refund > 0 && refund < paid;
  let method: 'toss' | 'none' = refund > 0 ? 'toss' : 'none';
  let raw: Json = { refunded: 0 } as Json;

  if (refund > 0) {
    if (!req.payment_key) throw new RefundError('NO_PAYMENT', '취소할 결제 키가 없습니다.');

    // 3) 사전 조회 — 이전 시도에서 토스 취소는 됐는데 DB 확정만 실패한 경우
    let alreadyCanceled = false;
    try {
      const current = await toss.get(req.payment_key);
      const canceledSoFar = current.totalAmount - current.balanceAmount;
      if (current.status === 'CANCELED' || (current.status === 'PARTIAL_CANCELED' && canceledSoFar >= refund)) {
        alreadyCanceled = true;
        refund = canceledSoFar;
        isPartial = current.status === 'PARTIAL_CANCELED';
        raw = current.raw as Json;
      }
    } catch {
      // 조회 실패는 무시하고 취소 시도(취소 실패 시 아래에서 사유 보고)
    }

    // 4) 토스 취소
    if (!alreadyCanceled) {
      try {
        const res = await toss.cancel({
          paymentKey: req.payment_key,
          cancelReason: input.reason,
          ...(isPartial ? { cancelAmount: refund } : {}),
        });
        raw = res.raw as Json;
      } catch (error) {
        const tossCode = error instanceof PaymentError ? error.tossCode : null;
        const message = error instanceof Error ? error.message : String(error);
        await supabase.rpc('record_cancel_error', {
          p_booking_id: req.booking_id,
          p_code: tossCode ?? 'UNKNOWN',
          p_message: message,
        });
        throw new RefundError('TOSS_CANCEL_FAILED', message, tossCode);
      }
    }
    method = 'toss';
  }

  // 5) 확정
  const { data: finData, error: finError } = await supabase.rpc('finalize_refund_tx', {
    p_booking_id: req.booking_id,
    p_refund_amount: refund,
    p_refund_method: method,
    p_is_partial: isPartial,
    p_raw: raw,
  });
  if (finError) throw toRefundError(finError);
  const fin = Array.isArray(finData) ? finData[0] : finData;
  const refundedAmount = fin?.refunded_amount ?? refund;

  // 6) 문자
  await dispatchBookingNotification(supabase, req.booking_id, 'cancel', { refundedAmount });

  return { bookingId: req.booking_id, refundedAmount, outcome: 'REFUNDED' };
}
