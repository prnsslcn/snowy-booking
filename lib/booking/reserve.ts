import 'server-only';

import { BookingError, toBookingError } from '@/lib/booking/errors';
import { isWithinBookingWindow } from '@/lib/policy/booking-window';
import { parseMobilePhone } from '@/lib/policy/phone';
import { fetchSiteSettings } from '@/lib/site-settings';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 온라인 선점(pending_payment). 정합성은 DB reserve_booking(0008)이 단일 트랜잭션으로 보장:
 * 휴대폰·날짜 → 유형·날짜 advisory lock → 지연 회수 → 1인1일 확인 → 빈 유닛 가배정 → 금액(DB) → 삽입.
 * 여기서는 DB가 모르는 정책(1개월·당일 16시 마감)만 먼저 거른다.
 */

export interface ReserveInput {
  type: string;
  date: string;
  guestName: string;
  guestPhone: string;
  /** 이용 인원(선택). 고객 화면에서는 받지 않아 null */
  guestCount: number | null;
}

export interface ReserveResult {
  orderId: string;
  amount: number;
  orderName: string;
  expiresAt: string;
}

export async function reserveBooking(input: ReserveInput, now: Date = new Date()): Promise<ReserveResult> {
  const settings = await fetchSiteSettings(); // 캐시 없이 원본
  if (settings.businessClosed) throw new BookingError('BUSINESS_CLOSED');

  const phone = parseMobilePhone(input.guestPhone);
  if (!phone) throw new BookingError('INVALID_PHONE');
  if (!input.guestName.trim()) throw new BookingError('NAME_REQUIRED');

  if (!isWithinBookingWindow(input.date, now, { from: settings.seasonFrom, to: settings.seasonTo })) {
    throw new BookingError('OUT_OF_WINDOW');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('reserve_booking', {
    p_type: input.type,
    p_date: input.date,
    p_guest_name: input.guestName.trim(),
    p_guest_phone: phone,
    // 0011 부터 null 허용(생성 타입은 int 인자를 number 로만 표기)
    p_guest_count: input.guestCount as number,
  });
  if (error) throw toBookingError(error);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new BookingError('UNKNOWN', '예약 결과가 비어 있습니다.');

  return {
    orderId: row.order_id,
    amount: row.amount,
    orderName: row.order_name,
    expiresAt: row.expires_at,
  };
}

/** 결제창 이탈·실패 시 즉시 자리 반환(멱등). */
export async function releasePendingBooking(orderId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('release_pending_booking', { p_order_id: orderId });
  if (error) return false;
  return data === true;
}
