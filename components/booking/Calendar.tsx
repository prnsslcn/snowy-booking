'use client';

import { useState } from 'react';

/**
 * 예약 달력 (grill-booking Calendar 기반, 날짜별 상태 맵 방식).
 * 상태: open(선택 가능) / closed('휴장') / locked·sold_out('예약마감') / unavailable·미포함(흐리게)
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
  minDate,
  maxDate,
  hint,
}: {
  value: string;
  onSelect: (iso: string) => void;
  days: Record<string, CalendarDay>;
  minDate: string;
  maxDate: string;
  hint?: string;
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
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={!canPrev} aria-label="이전 달"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-line-soft disabled:opacity-30">‹</button>
        <span className="text-sm font-bold text-ink">{view.y}년 {view.m + 1}월</span>
        <button type="button" onClick={() => move(1)} disabled={!canNext} aria-label="다음 달"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-line-soft disabled:opacity-30">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-1 text-xs font-medium ${i === 0 ? 'text-danger/80' : i === 6 ? 'text-accent' : 'text-subtle'}`}>
            {w}
          </div>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const iso = toIso(view.y, view.m, d);
          const info = days[iso];
          const status: CalendarDayStatus = info?.status ?? 'unavailable';
          const selectable = status === 'open';
          const blocked = status === 'closed' || status === 'locked' || status === 'sold_out';
          const selected = iso === value;

          return (
            <button
              key={iso}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(iso)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                selected
                  ? 'bg-accent font-bold text-white'
                  : blocked
                    ? 'cursor-default bg-line-soft text-subtle'
                    : !selectable
                      ? 'cursor-default text-subtle/40'
                      : 'font-medium text-ink hover:bg-accent-soft'
              }`}
            >
              <span className="leading-none">{d}</span>
              {status === 'closed' && <span className="mt-1 text-[9px] font-medium leading-none text-danger/80">휴장</span>}
              {(status === 'locked' || status === 'sold_out') && (
                <span className="mt-1 whitespace-nowrap text-[9px] font-medium leading-none text-danger/80">예약마감</span>
              )}
              {selectable && info?.weekendRate && (
                <span className={`mt-1 h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-accent'}`} aria-label="주말 요금" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-subtle">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" /> 주말 요금 적용일
      </p>
      {hint && <p className="mt-1 text-center text-xs text-subtle">{hint}</p>}
    </div>
  );
}
