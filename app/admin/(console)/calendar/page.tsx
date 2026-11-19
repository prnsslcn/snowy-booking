import type { Metadata } from 'next';

import { AdminCalendar } from '@/components/admin/AdminCalendar';
import { AdminTitle } from '@/components/admin/AdminShell';
import { getCalendarMonth } from '@/lib/admin/config';
import { kstToday } from '@/lib/policy/booking-window';

export const metadata: Metadata = { title: '운영 달력' };
export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const today = kstToday();
  const ym = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : today.slice(0, 7);
  const days = await getCalendarMonth(ym);
  return (
    <>
      <AdminTitle title="운영 달력" sub="날짜를 눌러 휴무·예약 잠금을 지정합니다" />
      <AdminCalendar ym={ym} days={days} today={today} />
    </>
  );
}
