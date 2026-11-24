import type { Metadata } from 'next';

import { AdminTitle } from '@/components/admin/AdminShell';
import { PricingManager } from '@/components/admin/PricingManager';
import { requireAdmin } from '@/lib/admin/auth';
import { getPricingData } from '@/lib/admin/config';

export const metadata: Metadata = { title: '요금' };
export const dynamic = 'force-dynamic';

/** 요금 — 상품별 금액만. 성수기·공휴일 날짜는 운영 설정(/admin/settings). */
export default async function PricingPage() {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const d = await getPricingData();
  return (
    <>
      <AdminTitle title="요금" sub="주말 요금일: 금·토·일, 공휴일과 그 전날, 성수기 기간 매일 (성수기·공휴일은 운영 설정에서)" />
      <PricingManager products={d.products} />
    </>
  );
}
