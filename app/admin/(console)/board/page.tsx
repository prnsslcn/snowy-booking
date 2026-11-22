import type { Metadata } from 'next';

import { AdminTitle } from '@/components/admin/AdminShell';
import { DateNav } from '@/components/admin/DateNav';
import { SiteMap } from '@/components/admin/SiteMap';
import { requireAdmin } from '@/lib/admin/auth';
import { getBoard } from '@/lib/admin/board';
import { formatDateKorean } from '@/lib/format';
import { kstToday } from '@/lib/policy/booking-window';

export const metadata: Metadata = { title: '현장 배정' };
export const dynamic = 'force-dynamic';

/** 현장 배정 — 위에서 본 배치도로 도착한 손님을 찾아 원하는 빈자리에 배정·입실(선착순). */
export default async function BoardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const { date: raw } = await searchParams;
  const today = kstToday();
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const groups = await getBoard(date);

  return (
    <>
      <AdminTitle
        title="현장 배정"
        sub={`${formatDateKorean(date)}${date === today ? ' · 오늘' : ''} — 도착한 손님을 찾아 빈자리를 누르면 배정·입실`}
        aside={<DateNav date={date} today={today} basePath="/admin/board" />}
      />
      <SiteMap groups={groups} date={date} today={today} />
    </>
  );
}
