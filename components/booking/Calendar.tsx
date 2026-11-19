'use client';

import { useState } from 'react';

/**
 * 예약 달력. open 선택 가능 / closed 휴장 / locked·sold_out 마감 / unavailable 흐리게.
 * 선택: 파란 면(둥근 칸). 오늘: 얇은 테. (주말 요금 표시는 하지 않음)
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
  const cells: (number | null)[] = [...Array<null>(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function move(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="rounded-3xl border border-black/[.08] bg-white p-3 md:p-5">
      <div className="flex items-center justify-between px-2 pb-3 pt-1">
        <span className="font-display text-[22px] font-extrabold tracking-[-0.03em] tabular-nums text-ink">
          {view.y}. {pad(view.m + 1)}
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[.08] text-ink transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-black/30 active:scale-[0.94] disabled:opacity-25"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                <path d={b.path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`pb-2 pt-1 text-[12px] font-medium ${i === 0 ? 'text-[#d4351c]' : i === 6 ? 'text-ice-600' : 'text-ink/45'}`}>
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
              className={`relative m-0.5 flex h-12 flex-col items-center justify-center rounded-2xl text-[16px] transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:h-14 ${
                selected
                  ? 'bg-glacier font-semibold text-white'
                  : selectable
                    ? `font-semibold text-ink hover:bg-ice-50 active:scale-[0.94] ${isToday ? 'ring-1 ring-inset ring-ice-400' : ''}`
                    : closedLike
                      ? 'cursor-default bg-black/[.03] text-ink/30'
                      : 'cursor-default text-ink/20'
              }`}
            >
              <span className="leading-none tabular-nums">{d}</span>
              {closedLike && <span className="mt-1 text-[10px] font-normal leading-none text-ink/45">{status === 'closed' ? '휴장' : '마감'}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-5 border-t border-black/[.06] px-2 pt-3 text-[12px] text-ink/50">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] bg-black/[.05]" /> 휴장·마감
        </span>
      </div>
    </div>
  );
}
