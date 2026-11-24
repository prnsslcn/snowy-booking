'use client';

import { useRouter } from 'next/navigation';

import { buttonClass } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';

/** 날짜 이동 — 이전 날 · 날짜 고르기 · 다음 날 · 오늘. 주소(?date=)에 남는다. */
function shift(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DateNav({ date, today, basePath }: { date: string; today: string; basePath: string }) {
  const router = useRouter();
  const go = (d: string) => router.push(`${basePath}?date=${d}`);
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => go(shift(date, -1))} aria-label="이전 날" className={buttonClass('tint', 'cs', 'w-11 px-0')}>
        ‹
      </button>
      <div className="w-[170px]">
        <DatePicker value={date} onChange={(v) => v && go(v)} aria-label="날짜" />
      </div>
      <button type="button" onClick={() => go(shift(date, 1))} aria-label="다음 날" className={buttonClass('tint', 'cs', 'w-11 px-0')}>
        ›
      </button>
      {date !== today && (
        <button type="button" onClick={() => go(today)} className={buttonClass('tint', 'cs')}>
          오늘
        </button>
      )}
    </div>
  );
}
