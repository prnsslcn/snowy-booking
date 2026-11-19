'use server';

import { revalidatePath } from 'next/cache';

import { getAdminUser } from '@/lib/admin/auth';
import { RefundError, refundBooking } from '@/lib/booking/refund';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/*
  관리자 서버 액션 — throw 금지, { ok, error } 로 반환(CLAUDE.md §13: 프로덕션은 throw 메시지를 digest 로 가림).
  모든 액션은 관리자 확인 → 서비스 롤로 DB 함수 → admin_actions 기록(무엇을·언제) → 화면 갱신.
*/

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function log(email: string, action: string, bookingId: string | null, detail: Record<string, unknown>) {
  await createAdminClient()
    .from('admin_actions')
    .insert({ admin_email: email, action, booking_id: bookingId, detail: detail as { [key: string]: Json } });
}

function refresh(bookingId: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/bookings/${bookingId}`);
}

const REFUND_MESSAGES: Record<string, string> = {
  BOOKING_NOT_FOUND: '예약을 찾을 수 없습니다.',
  NOT_CANCELLABLE: '지금 상태에서는 취소할 수 없습니다.',
  NOT_ONLINE: '온라인 결제 예약이 아닙니다.',
  NO_PAYMENT: '결제 정보가 없습니다.',
};

/**
 * 온라인 예약 취소·환불(재시도 포함).
 * mode 'policy' = 규정대로(이용일 기준 100/50/0%), 'full' = 전액(자연재해 등 예외, 입실 상태도 허용).
 * 토스 취소가 실패하면 예약은 '환불 처리 중'으로 남고 토스 오류 코드·사유가 상세 화면에 표시된다.
 */
export async function cancelBookingAction(bookingId: string, mode: 'policy' | 'full'): Promise<ActionResult<{ refunded: number }>> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: '로그인이 필요합니다.' };

  const supabase = createAdminClient();
  const { data: b } = await supabase.from('bookings').select('order_id, status').eq('id', bookingId).maybeSingle();
  if (!b) return { ok: false, error: REFUND_MESSAGES.BOOKING_NOT_FOUND };
  const retry = b.status === 'cancel_requested';

  try {
    const res = await refundBooking({
      orderId: b.order_id,
      reason: mode === 'full' ? '관리자 전액 환불' : '관리자 취소',
      fullRefund: mode === 'full',
    });
    await log(admin.email, retry ? 'refund_retry' : mode === 'full' ? 'cancel_full_refund' : 'cancel_policy', bookingId, {
      mode,
      refunded: res.refundedAmount,
      outcome: res.outcome,
    });
    refresh(bookingId);
    return { ok: true, data: { refunded: res.refundedAmount } };
  } catch (error) {
    refresh(bookingId);
    if (error instanceof RefundError) {
      if (error.code === 'TOSS_CANCEL_FAILED') {
        await log(admin.email, 'refund_failed', bookingId, { mode, tossCode: error.tossCode, message: error.message });
        return { ok: false, error: `토스 취소 실패${error.tossCode ? ` [${error.tossCode}]` : ''}: ${error.message}` };
      }
      return { ok: false, error: REFUND_MESSAGES[error.code] ?? error.message };
    }
    return { ok: false, error: error instanceof Error ? error.message : '알 수 없는 오류' };
  }
}

/**
 * 계좌 직접 환불 기록 — 토스 취소가 안 될 때(EXCEED_CANCEL_LIMIT 등) 운영자가 계좌이체로 돌려준 뒤 기록만.
 * 토스 API 호출 없음. 예약은 '환불 완료(계좌 환불)'.
 */
export async function manualRefundAction(bookingId: string, amount: number, note: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: '로그인이 필요합니다.' };
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: '환불 금액을 확인해 주세요.' };

  const { error } = await createAdminClient().rpc('admin_manual_refund_tx', { p_booking_id: bookingId, p_amount: amount, p_note: note });
  if (error) {
    const msg = error.message.includes('INVALID_AMOUNT')
      ? '환불 금액은 1원 이상, 결제 금액 이하여야 합니다.'
      : (Object.entries(REFUND_MESSAGES).find(([k]) => error.message.includes(k))?.[1] ?? error.message);
    return { ok: false, error: msg };
  }
  await log(admin.email, 'manual_refund', bookingId, { amount, note });
  refresh(bookingId);
  return { ok: true };
}
