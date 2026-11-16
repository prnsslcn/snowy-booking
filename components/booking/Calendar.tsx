'use client';

import { useState } from 'react';

/**
 * 예약 달력(직각 칸). open 선택 가능 / closed 휴장 / locked·sold_out 마감 / unavailable 흐리게.
 * 선택: 파란 면. 오늘: 1px 선. 주말 요금일: 칸 아래 작은 점.
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
    <div className="border border-hairline">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
        <span className="tabular text-[18px] font-bold text-ink">
          {view.y}년 {view.m + 1}월
        </span>
        <div className="flex">
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
              className="pressable flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-surface-soft disabled:opacity-25"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                <path d={b.path} stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 p-2 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`pb-2 pt-1 text-[12px] tracking-[0.5px] ${i === 0 ? 'text-error' : i === 6 ? 'text-primary' : 'text-muted'}`}>
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
            <button
              key={iso}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(iso)}
              aria-pressed={selected}
              aria-label={`${view.m + 1}월 ${d}일${closedLike ? (status === 'closed' ? ' 휴장' : ' 마감') : ''}`}
              className={`pressable relative m-0.5 flex h-12 flex-col items-center justify-center text-[16px] ${
                selected
                  ? 'bg-primary font-bold text-white'
                  : selectable
                    ? `font-bold text-ink hover:bg-surface-soft ${isToday ? 'outline outline-1 -outline-offset-1 outline-ink' : ''}`
                    : closedLike
                      ? 'cursor-default bg-surface-soft text-muted-soft'
                      : 'cursor-default font-light text-muted-soft/60'
              }`}
            >
              <span className="tabular leading-none">{d}</span>
              {closedLike && (
                <span className="mt-1 text-[10px] font-normal leading-none text-muted">{status === 'closed' ? '휴장' : '마감'}</span>
              )}
              {selectable && info?.weekendRate && (
                <span className={`absolute bottom-1.5 h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-primary'}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-5 border-t border-hairline px-4 py-3 text-[12px] tracking-[0.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-primary" /> 주말 요금
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 bg-surface-soft" /> 휴장·마감
        </span>
      </div>
    </div>
  );
}
