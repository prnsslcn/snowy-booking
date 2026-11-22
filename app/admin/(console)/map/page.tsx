import type { Metadata } from 'next';

import { AdminTitle } from '@/components/admin/AdminShell';
import { DateNav } from '@/components/admin/DateNav';
import { SiteMap } from '@/components/admin/SiteMap';
import { getBoard } from '@/lib/admin/board';
import { formatDateKorean } from '@/lib/format';
import { kstToday } from '@/lib/policy/booking-window';

export const metadata: Metadata = { title: '배치도' };
export const dynamic = 'force-dynamic';

/** 현장 배치도(Beta) — 위에서 본 유닛 위치로 예약을 찾아 키를 준다. 데이터는 현장 배정 보드와 같다. */
export default async function MapPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: raw } = await searchParams;
  const today = kstToday();
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const groups = await getBoard(date);

  return (
    <>
      <AdminTitle
        title="배치도"
        sub={`${formatDateKorean(date)}${date === today ? ' · 오늘' : ''} — 예약을 찾으면 위치가 표시됩니다`}
        aside={<DateNav date={date} today={today} basePath="/admin/map" />}
      />
      <SiteMap groups={groups} date={date} today={today} />
    </>
  );
}
