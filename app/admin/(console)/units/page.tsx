import type { Metadata } from 'next';

import { AdminTitle } from '@/components/admin/AdminShell';
import { UnitsManager } from '@/components/admin/UnitsManager';
import { requireAdmin } from '@/lib/admin/auth';
import { getUnitsData } from '@/lib/admin/config';

export const metadata: Metadata = { title: '유닛·점검' };
export const dynamic = 'force-dynamic';

export default async function UnitsPage() {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const d = await getUnitsData();
  return (
    <>
      <AdminTitle title="유닛·점검" sub="재고 = 운영 중인 유닛 − 점검 중 유닛 − 배정된 예약" />
      <UnitsManager types={d.types} units={d.units} blackouts={d.blackouts} today={d.today} />
    </>
  );
}
