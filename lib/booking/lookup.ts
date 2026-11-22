import 'server-only';

import { isIP } from 'node:net';

import { kstToday } from '@/lib/policy/booking-window';
import { refundAmount, refundRate } from '@/lib/policy/refund';
import { parseMobilePhone } from '@/lib/policy/phone';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 예약 조회 — 휴대폰번호 + 4자리 예약번호가 둘 다 일치해야 한다(휴대폰만으로 조회 금지).
 * 4자리는 추측 범위가 작아 시도 횟수를 제한한다: 번호당 15분 실패 5회, IP당 15분 실패 20회.
 * 어느 값이 틀렸는지는 알려주지 않는다(불일치·미존재 모두 NOT_FOUND).
 */

export const LOOKUP_WINDOW_MINUTES = 15;
export const LOOKUP_MAX_FAILS_PER_PHONE = 5;
export const LOOKUP_MAX_FAILS_PER_IP = 20;

export interface LookupResult {
  orderId: string;
  lookupCode: string;
  status: string;
  type: string;
  guestName: string;
  guestCount: number | null;
  typeName: string;
  date: string;
  amount: number;
  refundAmount: number | null;
  refundMethod: string | null;
  createdAt: string;
  /** 지금 취소 시 예상 환불(취소 가능한 경우만) */
  refundPreview: { rate: number; amount: number } | null;
}

export type LookupOutcome =
  | { ok: true; booking: LookupResult }
  | { ok: false; error: 'NOT_FOUND' | 'TOO_MANY_ATTEMPTS' | 'VALIDATION_FAILED' };

export async function lookupBooking(
  params: { phone: string; code: string; ip: string | null },
  now: Date = new Date(),
): Promise<LookupOutcome> {
  const phone = parseMobilePhone(params.phone);
  const code = params.code.replace(/\D/g, '');
  if (!phone || code.length !== 4) return { ok: false, error: 'VALIDATION_FAILED' };

  const supabase = createAdminClient();

  // 시도 제한: 세기 + 실패로 먼저 기록을 DB 한 번에(번호·IP 잠금) — 동시 요청으로 제한을 넘지 못하게(0014)
  const { data: attemptId, error: limitError } = await supabase.rpc('lookup_attempt_begin', {
    p_phone: phone,
    p_ip: (params.ip ?? null) as string,
    p_window_minutes: LOOKUP_WINDOW_MINUTES,
    p_max_phone: LOOKUP_MAX_FAILS_PER_PHONE,
    p_max_ip: LOOKUP_MAX_FAILS_PER_IP,
  });
  if (limitError) {
    return { ok: false, error: limitError.message.includes('TOO_MANY_ATTEMPTS') ? 'TOO_MANY_ATTEMPTS' : 'NOT_FOUND' };
  }

  const { data } = await supabase
    .from('bookings')
    .select(
      'order_id, lookup_code, status, type, guest_name, guest_count, date, amount, refund_amount, refund_method, created_at, price_snapshot',
    )
    .eq('source', 'online')
    .eq('guest_phone', phone)
    .eq('lookup_code', code)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) await supabase.from('lookup_attempts').update({ success: true }).eq('id', attemptId as number);
  if (!data) return { ok: false, error: 'NOT_FOUND' };

  // 지난 이용일은 취소 불가(DB request_cancel_tx 도 거절, 0014)
  const cancellable = (data.status === 'confirmed' && data.date >= kstToday(now)) || data.status === 'cancel_requested';
  const snapshot = (data.price_snapshot ?? {}) as { type_name?: string };

  return {
    ok: true,
    booking: {
      orderId: data.order_id,
      lookupCode: data.lookup_code ?? code,
      status: data.status,
      type: data.type,
      guestName: data.guest_name,
      guestCount: data.guest_count,
      typeName: snapshot.type_name ?? '',
      date: data.date,
      amount: data.amount,
      refundAmount: data.refund_amount,
      refundMethod: data.refund_method,
      createdAt: data.created_at,
      refundPreview: cancellable
        ? { rate: refundRate(data.date, now), amount: refundAmount(data.amount, data.date, now) }
        : null,
    },
  };
}

/** 프록시 헤더에서 클라이언트 IP 추출(Vercel: x-forwarded-for 첫 값). */
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = fwd || headers.get('x-real-ip')?.trim() || null;
  // DB inet 으로 넘기므로 올바른 IP 만(아니면 IP 제한 없이 번호 제한만)
  return ip && isIP(ip) ? ip : null;
}
