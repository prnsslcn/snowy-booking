'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import type { ActionResult } from '@/lib/admin/actions';
import { logAdminAction } from '@/lib/admin/audit';
import { getAdminUser } from '@/lib/admin/auth';
import { holidayRange } from '@/lib/admin/config';
import { adminErrorMessage } from '@/lib/admin/errors';
import { fetchHolidays } from '@/lib/admin/holidays';
import { SITE_SETTINGS_TAG } from '@/lib/site-settings';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/*
  3단계 서버 액션 — 유닛·점검 · 요금·성수기·공휴일 · 휴무/잠금 · 운영 설정.
  throw 금지, { ok, error } 반환. 모두 admin_actions 에 기록.
*/

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function guard(): Promise<{ email: string } | null> {
  const a = await getAdminUser();
  return a ? { email: a.email } : null;
}
const NEED_LOGIN = { ok: false as const, error: '로그인이 필요합니다.' };

// ── 유닛 ─────────────────────────────────────────────────────────────────────

export async function addUnitAction(type: string, label: string): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  const { error } = await createAdminClient().rpc('admin_add_unit', { p_type: type, p_label: label });
  if (error) return { ok: false, error: adminErrorMessage(error.message) };
  await logAdminAction(a.email, 'add_unit', null, { type, label });
  revalidatePath('/admin/units');
  revalidatePath('/admin/board');
  return { ok: true };
}

export async function setUnitActiveAction(unitId: string, active: boolean): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  const { error } = await createAdminClient().rpc('admin_set_unit_active', { p_unit_id: unitId, p_active: active });
  if (error) return { ok: false, error: adminErrorMessage(error.message) };
  await logAdminAction(a.email, active ? 'unit_on' : 'unit_off', null, { unitId });
  revalidatePath('/admin/units');
  revalidatePath('/admin/board');
  return { ok: true };
}

// ── 점검(운영 중지) — 경고 → 수동 이동 → 서버 확인 → 잠그기 ────────────────────

export interface Conflict {
  bookingId: string;
  date: string;
  guestName: string;
  status: string;
  source: string;
  freeUnits: { id: string; label: string }[];
}

/** 기간 안 이 유닛에 배정된 예약 + 같은 날 옮길 수 있는 빈 유닛 */
export async function blackoutConflictsAction(unitId: string, from: string, to: string): Promise<ActionResult<Conflict[]>> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  if (!DATE.test(from) || !DATE.test(to) || from > to) return { ok: false, error: adminErrorMessage('INVALID_RANGE') };
  const { data, error } = await createAdminClient().rpc('blackout_conflicts', { p_unit_id: unitId, p_from: from, p_to: to });
  if (error) return { ok: false, error: adminErrorMessage(error.message) };
  type R = { booking_id: string; date: string; guest_name: string; status: string; source: string; free_units: Json };
  return {
    ok: true,
    data: ((data ?? []) as unknown as R[]).map((r) => ({
      bookingId: r.booking_id,
      date: r.date,
      guestName: r.guest_name,
      status: r.status,
      source: r.source,
      freeUnits: (r.free_units as { id: string; label: string }[]) ?? [],
    })),
  };
}

export async function createBlackoutAction(unitId: string, from: string, to: string, reason: string): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  const { error } = await createAdminClient().rpc('admin_create_blackout', { p_unit_id: unitId, p_from: from, p_to: to, p_reason: reason });
  if (error) return { ok: false, error: adminErrorMessage(error.message) };
  await logAdminAction(a.email, 'blackout_create', null, { unitId, from, to, reason });
  revalidatePath('/admin/units');
  revalidatePath('/admin/board');
  return { ok: true };
}

export async function deleteBlackoutAction(id: string): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  const { error } = await createAdminClient().rpc('admin_delete_blackout', { p_blackout_id: id });
  if (error) return { ok: false, error: adminErrorMessage(error.message) };
  await logAdminAction(a.email, 'blackout_delete', null, { id });
  revalidatePath('/admin/units');
  revalidatePath('/admin/board');
  return { ok: true };
}

// ── 요금 · 성수기 · 공휴일 ─────────────────────────────────────────────────────

export async function updatePricesAction(type: string, weekday: number, weekend: number): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  if (![weekday, weekend].every((n) => Number.isInteger(n) && n > 0 && n < 10_000_000)) return { ok: false, error: '요금을 확인해 주세요.' };
  const { error } = await createAdminClient().from('product_types').update({ price_weekday: weekday, price_weekend: weekend }).eq('type', type);
  if (error) return { ok: false, error: error.message };
  await logAdminAction(a.email, 'price_update', null, { type, weekday, weekend });
  revalidatePath('/admin/pricing');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function addPeakAction(name: string, from: string, to: string): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  if (!name.trim() || !DATE.test(from) || !DATE.test(to) || from > to) return { ok: false, error: '이름과 기간을 확인해 주세요.' };
  const { error } = await createAdminClient().from('peak_periods').insert({ name: name.trim(), from_date: from, to_date: to });
  if (error) return { ok: false, error: error.message };
  await logAdminAction(a.email, 'peak_add', null, { name, from, to });
  revalidatePath('/admin/settings');
  revalidatePath('/admin/calendar');
  return { ok: true };
}

export async function deletePeakAction(id: string): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  const { error } = await createAdminClient().from('peak_periods').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await logAdminAction(a.email, 'peak_delete', null, { id });
  revalidatePath('/admin/settings');
  revalidatePath('/admin/calendar');
  return { ok: true };
}

export async function addHolidayAction(date: string, name: string): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  if (!DATE.test(date) || !name.trim()) return { ok: false, error: '날짜와 이름을 확인해 주세요.' };
  const { error } = await createAdminClient().from('holidays').upsert({ date, name: name.trim(), source: 'manual' });
  if (error) return { ok: false, error: error.message };
  await logAdminAction(a.email, 'holiday_add', null, { date, name });
  revalidatePath('/admin/settings');
  revalidatePath('/admin/calendar');
  return { ok: true };
}

export async function deleteHolidayAction(date: string): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  const { error } = await createAdminClient().from('holidays').delete().eq('date', date);
  if (error) return { ok: false, error: error.message };
  await logAdminAction(a.email, 'holiday_delete', null, { date });
  revalidatePath('/admin/settings');
  revalidatePath('/admin/calendar');
  return { ok: true };
}

/** 공공데이터포털 특일 정보(공휴일)로 관리 범위(오늘 ~ 다가오는 3월 1일) 불러오기 — 이미 있는 날짜(직접 입력 포함)는 그대로 둔다 */
export async function importHolidaysAction(): Promise<ActionResult<{ added: number; total: number }>> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  const { from, to } = holidayRange();
  const years = Array.from({ length: Number(to.slice(0, 4)) - Number(from.slice(0, 4)) + 1 }, (_, i) => Number(from.slice(0, 4)) + i);
  let list: { date: string; name: string }[];
  try {
    list = (await Promise.all(years.map((y) => fetchHolidays(y)))).flat().filter((h) => h.date >= from && h.date <= to);
  } catch (e) {
    return { ok: false, error: `공휴일을 불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}` };
  }
  const supabase = createAdminClient();
  const { data: existing } = await supabase.from('holidays').select('date').gte('date', from).lte('date', to);
  const have = new Set((existing ?? []).map((h) => h.date));
  const rows = list.filter((h) => !have.has(h.date)).map((h) => ({ date: h.date, name: h.name, source: 'api' }));
  if (rows.length) {
    const { error } = await supabase.from('holidays').insert(rows);
    if (error) return { ok: false, error: error.message };
  }
  await logAdminAction(a.email, 'holiday_import', null, { from, to, added: rows.length, total: list.length });
  revalidatePath('/admin/settings');
  revalidatePath('/admin/calendar');
  return { ok: true, data: { added: rows.length, total: list.length } };
}

// ── 휴무 · 예약 잠금 ─────────────────────────────────────────────────────────

export async function setDateFlagAction(date: string, kind: 'closed' | 'locked', on: boolean, note: string): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  if (!DATE.test(date)) return { ok: false, error: '날짜를 확인해 주세요.' };
  const table = kind === 'closed' ? 'closed_dates' : 'locked_dates';
  const supabase = createAdminClient();
  const { error } = on
    ? await supabase.from(table).upsert({ date, note: note.trim() || null })
    : await supabase.from(table).delete().eq('date', date);
  if (error) return { ok: false, error: error.message };
  await logAdminAction(a.email, `${kind}_${on ? 'on' : 'off'}`, null, { date, note });
  revalidatePath('/admin/calendar');
  revalidatePath('/admin/board');
  return { ok: true };
}

// ── 운영 설정 ────────────────────────────────────────────────────────────────

export interface SettingsInput {
  businessClosed: boolean;
  closedTitle: string;
  closedMessage: string;
  seasonFrom: string;
  seasonTo: string;
  notice: { enabled: boolean; title: string; body: string; from: string; to: string };
}

export async function saveSettingsAction(s: SettingsInput): Promise<ActionResult> {
  const a = await guard();
  if (!a) return NEED_LOGIN;
  const sf = s.seasonFrom || null;
  const st = s.seasonTo || null;
  if ((sf && !DATE.test(sf)) || (st && !DATE.test(st)) || (sf && st && sf > st)) return { ok: false, error: '시즌 기간을 확인해 주세요.' };
  const notice = {
    enabled: s.notice.enabled,
    ...(s.notice.title.trim() ? { title: s.notice.title.trim() } : {}),
    ...(s.notice.body.trim() ? { body: s.notice.body.trim() } : {}),
    ...(DATE.test(s.notice.from) ? { from: s.notice.from } : {}),
    ...(DATE.test(s.notice.to) ? { to: s.notice.to } : {}),
  };
  const { error } = await createAdminClient()
    .from('site_settings')
    .update({
      business_closed: s.businessClosed,
      closed_title: s.closedTitle.trim() || null,
      closed_message: s.closedMessage.trim() || null,
      season_from: sf,
      season_to: st,
      notice_popup: notice as { [key: string]: Json },
    })
    .eq('id', true);
  if (error) return { ok: false, error: error.message };
  await logAdminAction(a.email, 'settings_save', null, { businessClosed: s.businessClosed, seasonFrom: sf, seasonTo: st, notice: notice.enabled });
  revalidateTag(SITE_SETTINGS_TAG, 'max');
  revalidatePath('/', 'layout');
  return { ok: true };
}
