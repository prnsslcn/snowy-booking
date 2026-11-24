'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { fieldClass } from '@/components/ui/Field';

/*
  날짜 고르기 — 브라우저 기본 달력(input type=date) 대신 쓰는 팝업 달력. 값은 'YYYY-MM-DD'(빈 문자열 = 없음).
  - 칸을 누르면 PC 는 칸 아래(자리 없으면 위)에 작은 달력, 폰은 아래에서 올라오는 시트. 스크롤·창 크기가 바뀌면 닫힌다.
  - 팝업은 body 로 포털 — <label> 안에 있어도 달력 빈 곳 클릭이 칸을 다시 누르지 않고, 상자 밖으로 잘리지 않는다.
  - name 을 주면 숨은 input 으로 값이 폼(GET 조회 등)에 함께 실린다. value 없이 defaultValue 만 주면 스스로 값을 갖는다.
  - 날짜 계산은 'YYYY-MM-DD' 문자열 + UTC 로만(시간대 영향 없음).
*/

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const POP_W = 304;
const POP_H = 360;

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}
function weekday(iso: string) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}
function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}
function kstToday() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}
export function formatDate(iso: string) {
  const { y, m, d } = parts(iso);
  return `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')} (${WEEK[weekday(iso)]})`;
}

type Props = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  /** 폼에 실을 이름(숨은 input) */
  name?: string;
  placeholder?: string;
  /** '지우기' 버튼 — 비워 둘 수 있는 칸(제한 없음 등) */
  clearable?: boolean;
  'aria-label'?: string;
  className?: string;
};

export function DatePicker({
  value,
  defaultValue = '',
  onChange,
  min,
  max,
  name,
  placeholder = '날짜 선택',
  clearable,
  'aria-label': ariaLabel,
  className = '',
}: Props) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const pick = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(null);
    triggerRef.current?.focus();
  };

  return (
    <>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={!!open}
        onClick={(e) => setOpen(open ? null : placeFor(e.currentTarget))}
        className={fieldClass('light', `flex items-center justify-between gap-2 text-left tabular-nums ${open ? 'border-ice-600 ring-4 ring-ice-200/50' : ''} ${className}`, 'cs')}
      >
        <span className={`truncate ${current ? '' : 'text-black/30'}`}>
          {current ? (
            <>
              {formatDate(current).slice(0, 12)}
              {/* 요일은 폰 폭에서 잘리므로 넓은 화면에서만 */}
              <span className="hidden sm:inline">{formatDate(current).slice(12)}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0 text-ink-3">
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <Popup
          anchor={triggerRef}
          placement={open}
          value={current}
          min={min}
          max={max}
          clearable={clearable}
          onPick={pick}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

type Placement = { sheet: true } | { sheet: false; top?: number; bottom?: number; left: number };

function placeFor(el: HTMLElement): Placement {
  if (!window.matchMedia('(min-width: 768px)').matches) return { sheet: true };
  const r = el.getBoundingClientRect();
  const below = window.innerHeight - r.bottom;
  const left = Math.min(Math.max(8, r.left), window.innerWidth - POP_W - 8);
  // 아래 자리가 모자라면 칸 위로(팝업 아래 끝을 칸 위 6px 에 맞춤 — 달력 줄 수와 무관)
  if (below < POP_H + 12 && r.top > POP_H + 12) return { sheet: false, bottom: window.innerHeight - r.top + 6, left };
  return { sheet: false, top: r.bottom + 6, left };
}

function Popup({
  anchor,
  placement,
  value,
  min,
  max,
  clearable,
  onPick,
  onClose,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>;
  placement: Placement;
  value: string;
  min?: string;
  max?: string;
  clearable?: boolean;
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  const today = kstToday();
  const [ym, setYm] = useState((value || (min && min > today ? min : today)).slice(0, 7));
  const sheet = placement.sheet;
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        anchor.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    const onMove = (e: Event) => {
      if (e.type === 'scroll' && boxRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [anchor, onClose]);

  const [y, m] = ym.split('-').map(Number);
  const first = `${ym}-01`;
  const lead = weekday(first);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = Array.from({ length: count }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
  const disabled = (iso: string) => (!!min && iso < min) || (!!max && iso > max);
  const canPrev = !min || shiftMonth(ym, -1) >= min.slice(0, 7);
  const canNext = !max || shiftMonth(ym, 1) <= max.slice(0, 7);

  const body = (
    <div
      ref={boxRef}
      role="dialog"
      aria-label="날짜 선택"
      className={
        sheet
          ? 'fixed inset-x-0 bottom-0 z-[61] rounded-t-3xl bg-white px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)]'
          : 'fixed z-[61] rounded-2xl border border-line bg-white p-3 shadow-[0_12px_40px_rgb(14_26_43/0.14),0_2px_6px_rgb(14_26_43/0.06)]'
      }
      style={placement.sheet ? undefined : { top: placement.top, bottom: placement.bottom, left: placement.left, width: POP_W }}
    >
      <div className="flex items-center justify-between px-1">
        <p className="font-display text-[16px] font-semibold tabular-nums">
          {y}. {String(m).padStart(2, '0')}
        </p>
        <div className="flex gap-1">
          <button type="button" disabled={!canPrev} onClick={() => setYm(shiftMonth(ym, -1))} aria-label="이전 달" className="grid h-8 w-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-canvas disabled:opacity-30">
            ‹
          </button>
          <button type="button" disabled={!canNext} onClick={() => setYm(shiftMonth(ym, 1))} aria-label="다음 달" className="grid h-8 w-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-canvas disabled:opacity-30">
            ›
          </button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-medium text-ink-3">
        {WEEK.map((w, i) => (
          <div key={w} className={`py-1.5 ${i === 0 ? 'text-[#d4351c]' : i === 6 ? 'text-ice-600' : ''}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: lead }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {days.map((iso) => {
          const sel = iso === value;
          const off = disabled(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={off}
              onClick={() => onPick(iso)}
              aria-pressed={sel}
              aria-label={formatDate(iso)}
              className={`mx-auto grid aspect-square w-full max-w-10 place-items-center rounded-full text-[14px] tabular-nums transition-colors ${
                sel ? 'bg-glacier font-semibold text-white' : off ? 'text-ink/20' : 'hover:bg-ice-100'
              } ${iso === today && !sel ? 'font-semibold text-ice-600 ring-1 ring-inset ring-ice-400' : ''}`}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between border-t border-line px-1 pt-2 text-[13px] font-medium">
        <button type="button" disabled={disabled(today)} onClick={() => onPick(today)} className="rounded-full px-2 py-1 text-ice-600 hover:bg-ice-50 disabled:opacity-30">
          오늘
        </button>
        {clearable && value && (
          <button type="button" onClick={() => onPick('')} className="rounded-full px-2 py-1 text-ink-2 hover:bg-canvas">
            지우기
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(
    <>
      {sheet && <div className="fixed inset-0 z-[60] bg-ink/30" aria-hidden />}
      {body}
    </>,
    document.body,
  );
}
