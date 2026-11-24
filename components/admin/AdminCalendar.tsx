'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Toggle } from '@/components/admin/Toggle';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/Field';
import { dayBookingsAction } from '@/lib/admin/actions';
import type { BookingListItem } from '@/lib/admin/bookings';
import type { CalendarDayInfo } from '@/lib/admin/config';
import { statusBadge } from '@/lib/admin/labels';
import { formatPhone, formatWon } from '@/lib/format';
import { setDateFlagAction } from '@/lib/admin/config-actions';

/*
  운영 달력 — 날짜를 누르면 그날 예약 목록 팝업(사이드에 휴무(휴장: 운영 안 함, 신규 예약 불가) / 예약 잠금(운영은 하되 신규 온라인 예약만 막음)).
  칸: 날짜 · 예약 수(확정·입실·퇴실) · 표시(휴무/잠금/공휴일). 주말 요금일은 칸 바탕이 옅은 파랑,
  성수기는 칸마다 위쪽에 막대.
*/

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function AdminCalendar({ ym, days, today }: { ym: string; days: Record<string, CalendarDayInfo>; today: string }) {
  const [sel, setSel] = useState<string | null>(null);
  const isos = Object.keys(days).sort();
  const lead = new Date(`${isos[0]}T00:00:00Z`).getUTCDay();
  const next = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  // 공휴일 전날 판정용(다음 달 1일이 공휴일인 경우는 표시만 생략)
  const weekendRate = (iso: string) => {
    const w = new Date(`${iso}T00:00:00Z`).getUTCDay();
    const d = days[iso];
    return d.peak || w === 0 || w === 5 || w === 6 || !!d.holiday || !!days[next(iso)]?.holiday;
  };
  const [y, m] = ym.split('-').map(Number);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-display text-[22px] font-semibold tabular-nums">
          {y}. {String(m).padStart(2, '0')}
        </p>
        <div className="flex gap-2">
          <Link href={`/admin/calendar?month=${shiftMonth(ym, -1)}`} className={buttonClass('tint', 'cs', 'w-11 px-0')} aria-label="이전 달">
            ‹
          </Link>
          {ym !== today.slice(0, 7) && (
            <Link href="/admin/calendar" className={buttonClass('tint', 'cs')}>
              이번 달
            </Link>
          )}
          <Link href={`/admin/calendar?month=${shiftMonth(ym, 1)}`} className={buttonClass('tint', 'cs', 'w-11 px-0')} aria-label="다음 달">
            ›
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-2 md:p-4">
        <div className="grid grid-cols-7 text-center text-[12px] font-medium text-ink-3">
          {WEEK.map((w, i) => (
            <div key={w} className={`py-2 ${i === 0 ? 'text-[#d4351c]' : i === 6 ? 'text-ice-600' : ''}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }, (_, i) => (
            <div key={`e${i}`} />
          ))}
          {isos.map((iso) => {
            const d = days[iso];
            const past = iso < today;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSel(iso)}
                className={`relative flex min-h-[64px] flex-col items-start rounded-xl border p-1.5 pt-4 text-left transition-colors md:min-h-[92px] md:p-2.5 md:pt-5 ${
                  d.closed !== null
                    ? 'border-ink/10 bg-ink/[.06]'
                    : d.locked !== null
                      ? 'border-amber-400/50 bg-amber-50'
                      : weekendRate(iso)
                        ? 'border-ice-200 bg-ice-100 hover:border-ice-400'
                        : 'border-line hover:border-ice-400'
                } ${iso === today ? 'ring-2 ring-ice-400' : ''} ${past ? 'opacity-50' : ''} ${sel === iso ? 'border-glacier' : ''}`}
              >
                {/* 위 막대: 성수기(파랑) · 공휴일(빨강). 둘 다면 두 줄 */}
                <span aria-hidden className="absolute inset-x-1.5 top-1 flex flex-col gap-0.5 md:top-1.5">
                  {d.peak && <span className="h-1 rounded-full bg-ice-500" />}
                  {d.holiday && <span className="h-1 rounded-full bg-[#d4351c]" />}
                </span>
                <span className="text-[13px] font-semibold tabular-nums md:text-[15px]">{Number(iso.slice(8))}</span>
                {d.booked > 0 && <span className="mt-0.5 text-[11px] tabular-nums text-ink-2 md:text-[12px]">예약 {d.booked}</span>}
                <span className="mt-auto flex flex-wrap gap-0.5">
                  {d.closed !== null && <span className="rounded bg-ink/70 px-1 text-[10px] font-medium text-white">휴무</span>}
                  {d.locked !== null && <span className="rounded bg-amber-500 px-1 text-[10px] font-medium text-white">잠금</span>}
                  {d.holiday && <span className="hidden truncate text-[10px] text-[#d4351c] md:inline">{d.holiday}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[12px] text-ink-2">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-4 rounded border border-ice-200 bg-ice-100" /> 주말 요금일
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded-full bg-ice-500" /> 성수기
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded-full bg-[#d4351c]" /> 공휴일
        </li>
        <li>휴무: 운영 안 함 · 잠금: 운영은 하되 새 온라인 예약만 막음</li>
      </ul>

      {sel && <DayPanel key={sel} iso={sel} info={days[sel]} onClose={() => setSel(null)} />}
    </>
  );
}

const LONG_WEEK = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const PRODUCT_ORDER = ['cabana', 'caravan', 'caravan_group'];
const CONFIRMED = ['confirmed', 'checked_in', 'checked_out'];

/** 사이드 — 휴무/예약 잠금 스위치(바로 적용) + 메모(칸을 벗어나면 저장) */
function FlagRow({
  title,
  desc,
  on,
  savedNote,
  pending,
  onToggle,
  onNote,
}: {
  title: string;
  desc: React.ReactNode;
  on: boolean;
  savedNote: string;
  pending: boolean;
  onToggle: (on: boolean, note: string) => void;
  onNote: (note: string) => void;
}) {
  const [note, setNote] = useState(savedNote);
  return (
    <div className="py-5 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{desc}</p>
        </div>
        <Toggle on={on} disabled={pending} onChange={(v) => onToggle(v, v ? note : '')} label={title} />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => on && note !== savedNote && onNote(note)}
        placeholder={on ? '메모 (선택)' : '메모 (켤 때 함께 저장)'}
        aria-label={`${title} 메모`}
        className={fieldClass('light', 'mt-3', 'cs')}
      />
    </div>
  );
}

function DayRow({ b }: { b: BookingListItem }) {
  const s = statusBadge({ status: b.status, cancel_error: b.cancelError, refund_method: b.refundMethod });
  const faded = !CONFIRMED.includes(b.status);
  return (
    <li>
      <Link
        href={`/admin/bookings/${b.id}`}
        className={`-mx-3 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 rounded-xl px-3 py-3 transition-colors hover:bg-canvas md:grid-cols-[88px_1fr_132px_56px_96px_88px] ${faded ? 'opacity-55' : ''}`}
      >
        <span className={`order-3 text-[13px] md:order-none md:text-[14px] ${b.unitLabel ? 'font-medium text-ink' : 'text-ink-3'}`}>{b.unitLabel ?? '입실 전'}</span>
        <span className="order-1 truncate text-[15px] font-medium md:order-none md:text-[14px]">{b.guestName}</span>
        <span className="order-4 col-span-2 text-[13px] tabular-nums text-ink-2 md:order-none md:col-span-1">
          {b.guestPhone ? formatPhone(b.guestPhone) : '—'}
          <span className="font-mono md:hidden"> · #{b.lookupCode ?? '—'}</span>
        </span>
        <span className="hidden font-mono text-[13px] tabular-nums text-ink-2 md:block">{b.lookupCode ?? '—'}</span>
        <span className="hidden text-right text-[14px] tabular-nums md:block">{formatWon(b.amount)}</span>
        <span className="order-2 justify-self-end md:order-none">
          <Badge tone={s.tone}>{s.label}</Badge>
        </span>
      </Link>
    </li>
  );
}

function DayPanel({ iso, info, onClose }: { iso: string; info: CalendarDayInfo; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [rows, setRows] = useState<BookingListItem[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  const [yy, mm, dd] = iso.split('-').map(Number);

  useEffect(() => {
    let alive = true;
    dayBookingsAction(iso).then((r) => {
      if (!alive) return;
      if (r.ok) setRows(r.data ?? []);
      else setLoadError(r.error);
    });
    return () => {
      alive = false;
    };
  }, [iso]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function run(kind: 'closed' | 'locked', on: boolean, note: string) {
    setError('');
    start(async () => {
      const r = await setDateFlagAction(iso, kind, on, note);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  }

  // 상품별 묶음(카바나 → 카라반 → 단체카라반)
  const groups: { type: string; name: string; items: BookingListItem[] }[] = [];
  for (const b of rows ?? []) {
    let g = groups.find((x) => x.type === b.type);
    if (!g) groups.push((g = { type: b.type, name: b.typeName, items: [] }));
    g.items.push(b);
  }
  groups.sort((a, b) => (PRODUCT_ORDER.indexOf(a.type) + 1 || 99) - (PRODUCT_ORDER.indexOf(b.type) + 1 || 99));
  const confirmedCount = (items: BookingListItem[]) => items.filter((b) => CONFIRMED.includes(b.status)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 backdrop-blur-[2px] md:items-center md:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${iso} 예약`}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-y-auto rounded-t-[28px] bg-white shadow-[0_24px_80px_rgb(14_26_43/0.22)] md:max-h-[86vh] md:flex-row md:overflow-hidden md:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 그날 예약 */}
        <div className="flex flex-col px-6 pb-6 pt-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-9 md:pb-9 md:pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-medium tabular-nums text-ink-3">{yy}</span>
                {info.holiday && <span className="rounded-full bg-[#d4351c]/[.08] px-2 py-0.5 text-[11px] font-semibold text-[#b42d18]">{info.holiday}</span>}
                {info.peak && <span className="rounded-full bg-ice-500/[.12] px-2 py-0.5 text-[11px] font-semibold text-ice-700">성수기</span>}
                {info.closed !== null && <span className="rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">휴무</span>}
                {info.locked !== null && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">잠금</span>}
              </div>
              <h2 className="mt-1 font-display text-[28px] font-semibold tracking-[-0.02em] md:text-[32px]">
                {mm}월 {dd}일 <span className={`font-medium ${dow === 0 ? 'text-[#d4351c]' : dow === 6 ? 'text-ice-600' : 'text-ink-3'}`}>{LONG_WEEK[dow]}</span>
              </h2>
            </div>
            <button type="button" onClick={onClose} aria-label="닫기" className="-mr-2 grid h-10 w-10 flex-none place-items-center rounded-full text-ink-2 transition-colors hover:bg-canvas md:hidden">
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </div>

          {/* 숫자 요약 */}
          <dl className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-2xl bg-glacier px-4 py-3.5 text-white">
              <dt className="text-[12px] text-white/70">확정 예약</dt>
              <dd className="mt-1 text-[24px] font-semibold tabular-nums leading-none">{info.booked}</dd>
            </div>
            {groups.map((g) => (
              <div key={g.type} className="rounded-2xl bg-canvas px-4 py-3.5">
                <dt className="text-[12px] text-ink-2">{g.name}</dt>
                <dd className="mt-1 text-[24px] font-semibold tabular-nums leading-none">{confirmedCount(g.items)}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7">
            {loadError ? (
              <p role="alert" className="text-[13px] text-[#b42d18]">{loadError}</p>
            ) : rows === null ? (
              <div className="space-y-2" aria-label="불러오는 중">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-canvas" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line py-12 text-center text-[14px] text-ink-3">이날 예약이 없습니다</p>
            ) : (
              <div className="space-y-7">
                {groups.map((g) => (
                  <section key={g.type}>
                    <h3 className="flex items-baseline gap-2 border-b border-line pb-2 text-[13px] font-semibold">
                      {g.name}
                      <span className="font-normal tabular-nums text-ink-3">{g.items.length}</span>
                    </h3>
                    <ul className="mt-1">
                      {g.items.map((b) => (
                        <DayRow key={b.id} b={b} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 사이드: 날짜 설정 */}
        <aside className="flex flex-none flex-col border-t border-line bg-canvas/70 px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6 md:w-[320px] md:overflow-y-auto md:border-l md:border-t-0 md:px-7 md:pb-7 md:pt-8">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">날짜 설정</p>
            <button type="button" onClick={onClose} aria-label="닫기" className="-mr-2 -mt-2 hidden h-10 w-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-white md:grid">
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="divide-y divide-line">
            <FlagRow
              key={`c${info.closed}`}
              title="휴무"
              desc={<>운영하지 않는 날. 손님 달력에 &lsquo;휴장&rsquo;. 이미 있는 예약은 따로 취소해야 합니다.</>}
              on={info.closed !== null}
              savedNote={info.closed ?? ''}
              pending={pending}
              onToggle={(on, note) => run('closed', on, note)}
              onNote={(note) => run('closed', true, note)}
            />
            <FlagRow
              key={`l${info.locked}`}
              title="예약 잠금"
              desc={<>운영은 하되 새 온라인 예약만 막습니다. 손님 달력에 &lsquo;마감&rsquo;.</>}
              on={info.locked !== null}
              savedNote={info.locked ?? ''}
              pending={pending}
              onToggle={(on, note) => run('locked', on, note)}
              onNote={(note) => run('locked', true, note)}
            />
          </div>
          {error && <p role="alert" className="mt-3 rounded-xl bg-[#d4351c]/[.06] px-4 py-3 text-[13px] text-[#b42d18]">{error}</p>}
          <Link href={`/admin/board?date=${iso}`} className={buttonClass('tint', 'cs', 'mt-6 w-full md:mt-auto')}>
            그날 현장 배정 →
          </Link>
        </aside>
      </div>
    </div>
  );
}
