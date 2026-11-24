import type { Metadata } from 'next';

import { AdminCalendar } from '@/components/admin/AdminCalendar';
import { AdminTitle } from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin/auth';
import { getCalendarMonth } from '@/lib/admin/config';
import { kstToday } from '@/lib/policy/booking-window';

export const metadata: Metadata = { title: '운영 달력' };
export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const { month } = await searchParams;
  const today = kstToday();
  const ym = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : today.slice(0, 7);
  const days = await getCalendarMonth(ym);
  return (
    <>
      <AdminTitle title="운영 달력" sub="날짜를 누르면 그날 예약 목록 · 휴무·예약 잠금 지정" />
      <AdminCalendar ym={ym} days={days} today={today} />
    </>
  );
}
