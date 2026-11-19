import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminTitle } from '@/components/admin/AdminShell';
import { Board } from '@/components/admin/Board';
import { DateNav } from '@/components/admin/DateNav';
import { buttonClass } from '@/components/ui/Button';
import { getBoard } from '@/lib/admin/board';
import { formatDateKorean } from '@/lib/format';
import { kstToday } from '@/lib/policy/booking-window';

export const metadata: Metadata = { title: '현장 배정' };
export const dynamic = 'force-dynamic';

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: raw } = await searchParams;
  const today = kstToday();
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const groups = await getBoard(date);

  return (
    <>
      <AdminTitle
        title="현장 배정"
        sub={`${formatDateKorean(date)}${date === today ? ' · 오늘' : ''} — 칸을 눌러 입실·퇴실·유닛 옮기기`}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <DateNav date={date} today={today} basePath="/admin/board" />
            <Link href={`/admin/bookings/new?date=${date}`} className={buttonClass('primary', 'sm')}>
              + 유선·무상 예약
            </Link>
          </div>
        }
      />
      <Board groups={groups} date={date} today={today} />
    </>
  );
}
