import type { Metadata } from 'next';

import { AdminTitle } from '@/components/admin/AdminShell';
import { PricingManager } from '@/components/admin/PricingManager';
import { requireAdmin } from '@/lib/admin/auth';
import { getPricingData } from '@/lib/admin/config';
import { kstToday } from '@/lib/policy/booking-window';

export const metadata: Metadata = { title: '요금' };
export const dynamic = 'force-dynamic';

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const { year: y } = await searchParams;
  const thisYear = Number(kstToday().slice(0, 4));
  const year = Number(y) >= 2020 && Number(y) <= 2100 ? Number(y) : thisYear;
  const d = await getPricingData(year);
  return (
    <>
      <AdminTitle title="요금" sub="주말 요금일: 금·토·일, 공휴일과 그 전날, 성수기 기간 매일" />
      <PricingManager products={d.products} peaks={d.peaks} holidays={d.holidays} year={year} />
    </>
  );
}
