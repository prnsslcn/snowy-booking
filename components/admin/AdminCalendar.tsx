'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, buttonClass } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/Field';
import type { CalendarDayInfo } from '@/lib/admin/config';
import { setDateFlagAction } from '@/lib/admin/config-actions';

/*
  운영 달력 — 날짜를 눌러 휴무(휴장: 운영 안 함, 신규 예약 불가) / 예약 잠금(운영은 하되 신규 온라인 예약만 막음).
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

function DayPanel({ iso, info, onClose }: { iso: string; info: CalendarDayInfo; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [closedNote, setClosedNote] = useState(info.closed ?? '');
  const [lockedNote, setLockedNote] = useState(info.locked ?? '');
  const w = WEEK[new Date(`${iso}T00:00:00Z`).getUTCDay()];

  function run(kind: 'closed' | 'locked', on: boolean, note: string) {
    setError('');
    start(async () => {
      const r = await setDateFlagAction(iso, kind, on, note);
      if (!r.ok) return setError(r.error);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 md:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${iso} 설정`} className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] md:rounded-xl md:pb-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-[13px] font-medium text-ice-600">{info.holiday ?? (info.peak ? '성수기' : '날짜')}</p>
        <p className="mt-1 text-[22px] font-semibold tabular-nums">
          {iso} ({w})
        </p>
        <p className="mt-1 text-[13px] text-ink-2">확정 예약 {info.booked}건</p>

        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-line p-4">
            <p className="text-[15px] font-semibold">휴무 {info.closed !== null && <span className="ml-1 text-[12px] font-medium text-ink-2">설정됨</span>}</p>
            <p className="mt-0.5 text-[12px] text-ink-2">운영하지 않는 날. 손님 달력에 &lsquo;휴장&rsquo;. 이미 있는 예약은 따로 취소해야 합니다.</p>
            <input value={closedNote} onChange={(e) => setClosedNote(e.target.value)} placeholder="메모 (선택)" aria-label="휴무 메모" className={fieldClass('light', 'mt-3', 'cs')} />
            <div className="mt-2 flex gap-2">
              <Button size="cs" className="flex-1" disabled={pending} onClick={() => run('closed', true, closedNote)}>
                {info.closed !== null ? '메모 저장' : '휴무로 지정'}
              </Button>
              {info.closed !== null && (
                <Button size="cs" variant="tint" className="flex-1" disabled={pending} onClick={() => run('closed', false, '')}>
                  휴무 해제
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-line p-4">
            <p className="text-[15px] font-semibold">예약 잠금 {info.locked !== null && <span className="ml-1 text-[12px] font-medium text-ink-2">설정됨</span>}</p>
            <p className="mt-0.5 text-[12px] text-ink-2">운영은 하되 새 온라인 예약만 막습니다. 손님 달력에 &lsquo;마감&rsquo;. 관리자 유선 예약은 가능.</p>
            <input value={lockedNote} onChange={(e) => setLockedNote(e.target.value)} placeholder="메모 (선택)" aria-label="잠금 메모" className={fieldClass('light', 'mt-3', 'cs')} />
            <div className="mt-2 flex gap-2">
              <Button size="cs" className="flex-1" disabled={pending} onClick={() => run('locked', true, lockedNote)}>
                {info.locked !== null ? '메모 저장' : '잠금'}
              </Button>
              {info.locked !== null && (
                <Button size="cs" variant="tint" className="flex-1" disabled={pending} onClick={() => run('locked', false, '')}>
                  잠금 해제
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg border border-[#d4351c]/20 bg-[#d4351c]/[.05] px-4 py-3 text-[13px] text-[#b42d18]">{error}</p>}
        <div className="mt-5 flex gap-2">
          <Link href={`/admin/board?date=${iso}`} className={buttonClass('tint', 'cs', 'flex-1')}>
            그날 현장 배정
          </Link>
          <button type="button" onClick={onClose} className={buttonClass('tint', 'cs', 'flex-1')}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
