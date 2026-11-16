'use client';

import { useState } from 'react';

/**
 * 예약 달력 — 날짜별 상태 맵.
 * open(선택 가능) / closed('휴장') / locked·sold_out('마감') / unavailable·미포함(흐리게)
 * 선택은 자주 일어나는 동작이라 배경색만 짧게(150ms) 바뀌고, 누름 피드백만 준다.
 */

export type CalendarDayStatus = 'open' | 'closed' | 'locked' | 'sold_out' | 'unavailable';

export interface CalendarDay {
  status: CalendarDayStatus;
  weekendRate: boolean;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function Calendar({
  value,
  onSelect,
  days,
  today,
  minDate,
  maxDate,
}: {
  value: string;
  onSelect: (iso: string) => void;
  days: Record<string, CalendarDay>;
  today: string;
  minDate: string;
  maxDate: string;
}) {
  const [y0, m0] = (value || minDate).split('-').map(Number);
  const [view, setView] = useState({ y: y0, m: m0 - 1 });

  const [minY, minM] = minDate.split('-').map(Number);
  const [maxY, maxM] = maxDate.split('-').map(Number);
  const canPrev = view.y > minY || (view.y === minY && view.m > minM - 1);
  const canNext = view.y < maxY || (view.y === maxY && view.m < maxM - 1);

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function move(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="rounded-[22px] border border-line-soft bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="tabular text-[17px] font-bold">
          {view.y}년 {view.m + 1}월
        </span>
        <div className="flex gap-1">
          {[
            { d: -1, ok: canPrev, label: '이전 달', path: 'M10 4 6 8l4 4' },
            { d: 1, ok: canNext, label: '다음 달', path: 'M6 4l4 4-4 4' },
          ].map((b) => (
            <button
              key={b.d}
              type="button"
              onClick={() => move(b.d)}
              disabled={!b.ok}
              aria-label={b.label}
              className="pressable flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-line-soft disabled:opacity-25"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                <path d={b.path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`pb-2 text-[12px] font-medium ${i === 0 ? 'text-danger/70' : i === 6 ? 'text-accent/80' : 'text-subtle'}`}>
            {w}
          </div>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const iso = toIso(view.y, view.m, d);
          const info = days[iso];
          const status: CalendarDayStatus = info?.status ?? 'unavailable';
          const selectable = status === 'open';
          const closedLike = status === 'closed' || status === 'locked' || status === 'sold_out';
          const selected = iso === value;
          const isToday = iso === today;

          return (
            <div key={iso} className="flex justify-center py-0.5">
              <button
                type="button"
                disabled={!selectable}
                onClick={() => onSelect(iso)}
                aria-pressed={selected}
                aria-label={`${view.m + 1}월 ${d}일${closedLike ? (status === 'closed' ? ' 휴장' : ' 마감') : ''}`}
                className={`pressable relative flex h-12 w-full max-w-12 flex-col items-center justify-center rounded-[14px] text-[15px] ${
                  selected
                    ? 'bg-accent font-bold text-white'
                    : selectable
                      ? `font-semibold text-ink hover:bg-accent-soft ${isToday ? 'ring-1 ring-inset ring-accent/40' : ''}`
                      : 'cursor-default text-subtle/45'
                }`}
              >
                <span className="tabular leading-none">{d}</span>
                {closedLike && (
                  <span className="mt-1 text-[10px] font-medium leading-none text-danger/75">
                    {status === 'closed' ? '휴장' : '마감'}
                  </span>
                )}
                {selectable && info?.weekendRate && (
                  <span className={`absolute bottom-1.5 h-1 w-1 rounded-full ${selected ? 'bg-white/90' : 'bg-accent'}`} />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 border-t border-line-soft pt-3 text-[12px] text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-accent" /> 주말 요금
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-danger/75">마감</span> 예약 불가
        </span>
      </div>
    </div>
  );
}
