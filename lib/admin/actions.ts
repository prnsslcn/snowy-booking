'use server';

import { revalidatePath } from 'next/cache';

import { getAdminUser } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { adminErrorMessage } from '@/lib/admin/errors';
import { RefundError, refundBooking } from '@/lib/booking/refund';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/*
  관리자 서버 액션 — throw 금지, { ok, error } 로 반환(CLAUDE.md §13: 프로덕션은 throw 메시지를 digest 로 가림).
  모든 액션은 관리자 확인 → 서비스 롤로 DB 함수 → admin_actions 기록(무엇을·언제) → 화면 갱신.
*/

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const log = logAdminAction;

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

// ── 2단계: 현장 배정 · 입실/퇴실 · 유선/무상 예약 ─────────────────────────────

async function rpcAction(
  action: string,
  bookingId: string | null,
  call: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>,
  detail: Record<string, unknown> = {},
): Promise<ActionResult<unknown>> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: '로그인이 필요합니다.' };
  const { error, data } = await call();
  if (error) return { ok: false, error: adminErrorMessage(error.message) };
  await log(admin.email, action, bookingId, detail);
  if (bookingId) refresh(bookingId);
  revalidatePath('/admin/board');
  return { ok: true, data };
}

export async function checkInAction(bookingId: string) {
  return rpcAction('check_in', bookingId, () => createAdminClient().rpc('admin_check_in', { p_booking_id: bookingId }));
}

export async function checkOutAction(bookingId: string) {
  return rpcAction('check_out', bookingId, () => createAdminClient().rpc('admin_check_out', { p_booking_id: bookingId }));
}

export async function undoCheckAction(bookingId: string) {
  return rpcAction('undo_check', bookingId, () => createAdminClient().rpc('admin_undo_check', { p_booking_id: bookingId }));
}

/** 같은 상품·같은 날짜의 다른 유닛으로 — 비어 있으면 옮기고, 예약이 있으면 서로 맞바꾼다 */
export async function moveUnitAction(bookingId: string, unitId: string, swapWithBookingId: string | null) {
  if (swapWithBookingId) {
    return rpcAction('swap_units', bookingId, async () => {
      const res = await createAdminClient().rpc('admin_swap_units', { p_booking_a: bookingId, p_booking_b: swapWithBookingId });
      if (!res.error) refresh(swapWithBookingId);
      return res;
    }, { with: swapWithBookingId });
  }
  return rpcAction('reassign_unit', bookingId, () => createAdminClient().rpc('admin_reassign_unit', { p_booking_id: bookingId, p_new_unit_id: unitId }), { unitId });
}

export interface OfflineInput {
  type: string;
  date: string;
  source: 'offline' | 'comp';
  guestName: string;
  guestPhone: string;
  guestCount: number;
  /** null = 정상가 */
  amount: number | null;
  paymentMethod: 'cash' | 'card' | 'transfer' | null;
  note: string;
}

/** 유선·무상 예약 등록 — 즉시 확정, 빈 유닛 자동 가배정. 문자 발송 없음(CLAUDE.md §14) */
export async function createOfflineAction(input: OfflineInput): Promise<ActionResult<{ id: string }>> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: '로그인이 필요합니다.' };
  const { data, error } = await createAdminClient().rpc('admin_create_booking', {
    p_type: input.type,
    p_date: input.date,
    p_source: input.source,
    p_guest_name: input.guestName,
    p_guest_phone: input.guestPhone,
    p_guest_count: input.guestCount,
    ...(input.amount !== null && input.source === 'offline' ? { p_amount: input.amount } : {}),
    ...(input.source === 'offline' && input.paymentMethod ? { p_payment_method: input.paymentMethod } : {}),
    ...(input.note.trim() ? { p_note: input.note } : {}),
  });
  if (error) return { ok: false, error: adminErrorMessage(error.message) };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: '예약 결과가 비어 있습니다.' };
  await log(admin.email, input.source === 'comp' ? 'create_comp' : 'create_offline', row.booking_id, {
    type: input.type,
    date: input.date,
    amount: row.amount,
    unit: row.unit_label,
  });
  refresh(row.booking_id);
  revalidatePath('/admin/board');
  return { ok: true, data: { id: row.booking_id } };
}

export interface OfflineUpdate {
  baseAmount: number;
  extras: { label: string; amount: number }[];
  paymentMethod: 'cash' | 'card' | 'transfer';
  guestName: string;
  guestPhone: string;
  guestCount: number;
  note: string;
}

/** 유선 예약 내용 변경 — 최종 금액 = 기본 금액 + 현장 조정 합계 */
export async function updateOfflineAction(bookingId: string, u: OfflineUpdate) {
  return rpcAction(
    'update_offline',
    bookingId,
    () =>
      createAdminClient().rpc('admin_update_offline_booking', {
        p_booking_id: bookingId,
        p_base_amount: u.baseAmount,
        p_extras: u.extras as unknown as Json,
        p_payment_method: u.paymentMethod,
        p_guest_name: u.guestName,
        p_guest_phone: u.guestPhone,
        p_guest_count: u.guestCount,
        p_note: u.note,
      }),
    { baseAmount: u.baseAmount, extras: u.extras },
  );
}

/** 유선·무상 취소(토스 없음) */
export async function cancelOfflineAction(bookingId: string) {
  return rpcAction('cancel_offline', bookingId, () => createAdminClient().rpc('admin_cancel_offline_booking', { p_booking_id: bookingId }));
}

/** 정상가 조회(유선 예약 화면 미리보기) — DB price_for(주중/주말 판정 포함) */
export async function quotePriceAction(type: string, date: string): Promise<ActionResult<{ price: number; rateKind: string }>> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: '로그인이 필요합니다.' };
  const { data, error } = await createAdminClient().rpc('price_for', { p_type: type, p_date: date });
  if (error) return { ok: false, error: adminErrorMessage(error.message) };
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { ok: true, data: { price: row.unit_price, rateKind: row.rate_kind } } : { ok: false, error: '요금을 찾을 수 없습니다.' };
}
