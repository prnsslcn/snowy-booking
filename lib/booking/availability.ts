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
 * 달력·상품 선택용 잔여 현황. DB availability()(잔여·요금·휴장/잠금) + TS 정책(예약 가능 기간·16시·시즌).
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

/** DB availability() 는 한 번에 92일까지(RANGE_TOO_LONG) → 90일씩 나눠 동시에 부른다. */
const CHUNK_DAYS = 90;
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
async function fetchDays(supabase: ReturnType<typeof createAdminClient>, from: string, to: string) {
  const ranges: [string, string][] = [];
  for (let s = from; s <= to; s = addDays(s, CHUNK_DAYS)) {
    const e = addDays(s, CHUNK_DAYS - 1);
    ranges.push([s, e < to ? e : to]);
  }
  const results = await Promise.all(ranges.map(([p_from, p_to]) => supabase.rpc('availability', { p_from, p_to })));
  return results.flatMap(({ data, error }) => {
    if (error) throw toBookingError(error);
    if (!data) throw new BookingError('UNKNOWN', 'availability 결과가 비어 있습니다.');
    return data;
  });
}

/** 예약 가능 기간 전체(오늘 ~ 오늘+N개월−1일)의 현황. */
export async function getAvailability(now: Date = new Date()): Promise<AvailabilityResponse> {
  const supabase = createAdminClient();
  const today = kstToday(now);
  const maxDate = bookingMaxDate(now);
  const settings = await fetchSiteSettings();
  const season = { from: settings.seasonFrom, to: settings.seasonTo };

  const [rows, { data: products }] = await Promise.all([
    fetchDays(supabase, today, maxDate),
    supabase
      .from('product_types')
      .select('type, name, slug, max_capacity, sort')
      .eq('is_active', true)
      .order('sort'),
  ]);

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

/*
  오픈 몰림 대비 — 같은 서버 안에서 잠깐(AVAILABILITY_TTL_MS) 같은 결과를 나눠 쓴다.
  - 그사이 동시에 들어온 요청은 진행 중인 조회 하나를 함께 기다린다(DB 에 한 번만 묻기).
  - 표시용이라 몇 초 늦어도 안전: 실제 예약은 reserve_booking 이 DB 에서 다시 판정하고,
    매진이면 SOLD_OUT 으로 거절 → 예약 화면이 현황을 다시 불러온다.
  - 서버 메모리라 시간이 지나면 저절로 사라지고, 오래된 값이 남지 않는다(데이터 캐시와 달리 '한참 지난 값'을 주지 않음).
*/
const AVAILABILITY_TTL_MS = 2000;
let cached: { at: number; value: Promise<AvailabilityResponse> } | null = null;

export function getAvailabilityCached(): Promise<AvailabilityResponse> {
  const now = Date.now();
  if (cached && now - cached.at < AVAILABILITY_TTL_MS) return cached.value;
  const value = getAvailability(new Date(now));
  const entry = { at: now, value };
  cached = entry;
  // 실패한 조회는 나눠 쓰지 않는다(다음 요청이 다시 시도)
  value.catch(() => {
    if (cached === entry) cached = null;
  });
  return value;
}
