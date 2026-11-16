/**
 * 예약 가능 기간 — 단일 출처 (docs/booking-flow.md §0).
 *
 * - 오늘(KST)부터 1개월 이내 날짜까지 예약 가능 (예: 11/16 → 12/15까지 = 오늘 + 1개월 − 1일)
 * - 당일 예약은 KST 16시 전까지
 * - 시즌 범위(site_settings.season_from/to)는 DB 설정이라 여기서는 인자로 받는다(null = 제한 없음)
 *
 * 서버에서 KST로 계산한다(클라이언트 시간 불신). 클라이언트 달력은 UX 보조.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 예약 가능 기간(개월). 정책 변경 시 이 값만 수정. */
export const BOOKING_WINDOW_MONTHS = 1;

/** 당일 예약 마감 시각(KST, 시). 이 시각 이후 당일 예약 불가. */
export const SAME_DAY_CUTOFF_HOUR = 16;

/** 결제 대기(pending_payment) 선점 유지 시간(분). DB pending_payment_timeout()과 일치시킨다. */
export const PENDING_PAYMENT_MINUTES = 10;

export interface SeasonRange {
  from: string | null;
  to: string | null;
}

function toKst(now: Date): Date {
  return new Date(now.getTime() + KST_OFFSET_MS);
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** KST 기준 오늘 날짜(YYYY-MM-DD). */
export function kstToday(now: Date = new Date()): string {
  return iso(toKst(now));
}

/** 예약 가능한 마지막 날짜 = 오늘(KST) + N개월 − 1일. */
export function bookingMaxDate(now: Date = new Date()): string {
  const d = toKst(now);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + BOOKING_WINDOW_MONTHS);
  // 월말 넘침 방지: 1/31 + 1개월 → 2/28(29)로 맞춘 뒤 −1일
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  d.setUTCDate(d.getUTCDate() - 1);
  return iso(d);
}

/** 당일 예약 마감 시각이 지났는지(KST). */
export function isSameDayCutoffPassed(now: Date = new Date()): boolean {
  return toKst(now).getUTCHours() >= SAME_DAY_CUTOFF_HOUR;
}

function inSeason(date: string, season?: SeasonRange): boolean {
  if (!season) return true;
  if (season.from && date < season.from) return false;
  if (season.to && date > season.to) return false;
  return true;
}

/** date(YYYY-MM-DD)가 예약 가능 기간 안인지. 휴장·잠금·매진은 별도(DB) 판정. */
export function isWithinBookingWindow(
  date: string,
  now: Date = new Date(),
  season?: SeasonRange,
): boolean {
  const today = kstToday(now);
  if (date < today || date > bookingMaxDate(now)) return false;
  if (date === today && isSameDayCutoffPassed(now)) return false;
  return inSeason(date, season);
}

/** 달력에서 선택 가능한 가장 이른 날짜. 당일 마감이면 내일. */
export function firstBookableDate(now: Date = new Date()): string {
  const d = toKst(now);
  if (isSameDayCutoffPassed(now)) d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}
