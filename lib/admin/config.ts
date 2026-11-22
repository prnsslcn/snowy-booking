import 'server-only';

import { requireAdmin } from '@/lib/admin/auth';
import { REVENUE_STATUSES } from '@/lib/admin/labels';
import { kstToday } from '@/lib/policy/booking-window';
import { createAdminClient } from '@/lib/supabase/admin';

/*
  3단계 조회 — 유닛·점검 / 요금·성수기·공휴일 / 달력(휴무·잠금). 서비스 롤(호출 화면이 requireAdmin).
*/

export interface UnitRow {
  id: string;
  type: string;
  label: string;
  isActive: boolean;
}
export interface BlackoutRow {
  id: string;
  unitId: string;
  unitLabel: string;
  type: string;
  from: string;
  to: string;
  reason: string | null;
}

export async function getUnitsData() {
  await requireAdmin();
  const supabase = createAdminClient();
  const today = kstToday();
  const [types, units, blackouts] = await Promise.all([
    supabase.from('product_types').select('type, name, sort').order('sort'),
    supabase.from('units').select('id, type, label, sort, is_active').order('sort'),
    supabase.from('unit_blackouts').select('id, unit_id, from_date, to_date, reason, units(label, type)').gte('to_date', today).order('from_date'),
  ]);
  type B = { id: string; unit_id: string; from_date: string; to_date: string; reason: string | null; units: { label: string; type: string } | null };
  return {
    today,
    types: (types.data ?? []).map((t) => ({ type: t.type, name: t.name })),
    units: (units.data ?? []).map((u) => ({ id: u.id, type: u.type, label: u.label, isActive: u.is_active })) as UnitRow[],
    blackouts: ((blackouts.data ?? []) as unknown as B[]).map((b) => ({
      id: b.id,
      unitId: b.unit_id,
      unitLabel: b.units?.label ?? '',
      type: b.units?.type ?? '',
      from: b.from_date,
      to: b.to_date,
      reason: b.reason,
    })) as BlackoutRow[],
  };
}

export async function getPricingData(year: number) {
  await requireAdmin();
  const supabase = createAdminClient();
  const [types, peaks, holidays] = await Promise.all([
    // 요금은 판매 상품만(특수 S1·S2 는 요금 없음)
    supabase.from('product_types').select('type, name, price_weekday, price_weekend, sort').eq('is_active', true).order('sort'),
    supabase.from('peak_periods').select('id, name, from_date, to_date').order('from_date', { ascending: false }),
    supabase.from('holidays').select('date, name, source').gte('date', `${year}-01-01`).lte('date', `${year}-12-31`).order('date'),
  ]);
  return {
    products: (types.data ?? []).map((t) => ({ type: t.type, name: t.name, weekday: t.price_weekday, weekend: t.price_weekend })),
    peaks: (peaks.data ?? []).map((p) => ({ id: p.id, name: p.name, from: p.from_date, to: p.to_date })),
    holidays: (holidays.data ?? []).map((h) => ({ date: h.date, name: h.name, source: h.source })),
  };
}

export interface CalendarDayInfo {
  closed: string | null;
  locked: string | null;
  holiday: string | null;
  peak: boolean;
  booked: number;
}

/** 달력 한 달 — 휴무·잠금(메모)·공휴일·성수기·예약 수(확정·입실·퇴실) */
export async function getCalendarMonth(ym: string): Promise<Record<string, CalendarDayInfo>> {
  await requireAdmin();
  const supabase = createAdminClient();
  const [y, m] = ym.split('-').map(Number);
  const from = `${ym}-01`;
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const [closed, locked, holidays, peaks, bookings] = await Promise.all([
    supabase.from('closed_dates').select('date, note').gte('date', from).lte('date', to),
    supabase.from('locked_dates').select('date, note').gte('date', from).lte('date', to),
    supabase.from('holidays').select('date, name').gte('date', from).lte('date', to),
    supabase.from('peak_periods').select('from_date, to_date').lte('from_date', to).gte('to_date', from),
    supabase.from('bookings').select('date').gte('date', from).lte('date', to).in('status', [...REVENUE_STATUSES]),
  ]);

  const out: Record<string, CalendarDayInfo> = {};
  for (let d = 1; d <= Number(to.slice(8)); d++) {
    const iso = `${ym}-${String(d).padStart(2, '0')}`;
    out[iso] = {
      closed: null,
      locked: null,
      holiday: null,
      peak: (peaks.data ?? []).some((p) => p.from_date <= iso && iso <= p.to_date),
      booked: 0,
    };
  }
  for (const c of closed.data ?? []) out[c.date].closed = c.note ?? '';
  for (const l of locked.data ?? []) out[l.date].locked = l.note ?? '';
  for (const h of holidays.data ?? []) out[h.date].holiday = h.name;
  for (const b of bookings.data ?? []) out[b.date].booked += 1;
  return out;
}
