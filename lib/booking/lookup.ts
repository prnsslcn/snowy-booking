import 'server-only';

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
  guestCount: number;
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
  const since = new Date(now.getTime() - LOOKUP_WINDOW_MINUTES * 60_000).toISOString();

  // 시도 제한(실패 횟수 기준)
  const [byPhone, byIp] = await Promise.all([
    supabase
      .from('lookup_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .eq('success', false)
      .gte('attempted_at', since),
    params.ip
      ? supabase
          .from('lookup_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('ip', params.ip)
          .eq('success', false)
          .gte('attempted_at', since)
      : Promise.resolve({ count: 0 }),
  ]);
  if ((byPhone.count ?? 0) >= LOOKUP_MAX_FAILS_PER_PHONE || (byIp.count ?? 0) >= LOOKUP_MAX_FAILS_PER_IP) {
    return { ok: false, error: 'TOO_MANY_ATTEMPTS' };
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

  await supabase.from('lookup_attempts').insert({ phone, ip: params.ip, success: !!data });
  if (!data) return { ok: false, error: 'NOT_FOUND' };

  const cancellable = data.status === 'confirmed' || data.status === 'cancel_requested';
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
  return ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
}
