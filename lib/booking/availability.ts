import 'server-only';

import { BookingError, toBookingError } from '@/lib/booking/errors';
import {
  bookingMaxDate,
  firstBookableDate,
  isWithinBookingWindow,
  kstToday,
} from '@/lib/policy/booking-window';
import { fetchSiteSettings } from '@/lib/site-settings';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 달력·상품 선택용 잔여 현황. DB availability()(잔여·요금·휴장/잠금) + TS 정책(1개월·16시·시즌).
 * 표시용일 뿐, 실제 차단은 reserve_booking 이 다시 판정한다.
 */

export type DayStatus = 'open' | 'closed' | 'locked' | 'sold_out' | 'unavailable';

export interface TypeAvailability {
  type: string;
  name: string;
  slug: string;
  maxCapacity: number;
  remaining: number;
  price: number;
  rateKind: 'weekday' | 'weekend';
}

export interface DayAvailability {
  date: string;
  status: DayStatus;
  weekendRate: boolean;
  types: TypeAvailability[];
}

export interface AvailabilityResponse {
  today: string;
  minDate: string;
  maxDate: string;
  days: DayAvailability[];
}

/** 예약 가능 기간 전체(오늘 ~ 오늘+1개월−1일)의 현황. */
export async function getAvailability(now: Date = new Date()): Promise<AvailabilityResponse> {
  const supabase = createAdminClient();
  const today = kstToday(now);
  const maxDate = bookingMaxDate(now);
  const settings = await fetchSiteSettings();
  const season = { from: settings.seasonFrom, to: settings.seasonTo };

  const [{ data: rows, error }, { data: products }] = await Promise.all([
    supabase.rpc('availability', { p_from: today, p_to: maxDate }),
    supabase
      .from('product_types')
      .select('type, name, slug, max_capacity, sort')
      .eq('is_active', true)
      .order('sort'),
  ]);
  if (error) throw toBookingError(error);
  if (!rows) throw new BookingError('UNKNOWN', 'availability 결과가 비어 있습니다.');

  const productMap = new Map((products ?? []).map((p) => [p.type, p]));
  const byDate = new Map<string, DayAvailability>();

  for (const r of rows) {
    const p = productMap.get(r.type);
    if (!p) continue;
    let day = byDate.get(r.date);
    if (!day) {
      const inWindow = isWithinBookingWindow(r.date, now, season);
      const status: DayStatus = settings.businessClosed
        ? 'unavailable'
        : r.day_status === 'closed'
          ? 'closed'
          : !inWindow || r.day_status === 'out_of_season'
            ? 'unavailable'
            : r.day_status === 'locked'
              ? 'locked'
              : 'open';
      day = { date: r.date, status, weekendRate: r.rate_kind === 'weekend', types: [] };
      byDate.set(r.date, day);
    }
    day.types.push({
      type: r.type,
      name: p.name,
      slug: p.slug,
      maxCapacity: p.max_capacity,
      remaining: day.status === 'open' ? r.remaining : 0,
      price: r.unit_price,
      rateKind: r.rate_kind === 'weekend' ? 'weekend' : 'weekday',
    });
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  for (const d of days) {
    if (d.status === 'open' && d.types.every((t) => t.remaining === 0)) d.status = 'sold_out';
  }

  return { today, minDate: firstBookableDate(now), maxDate, days };
}
