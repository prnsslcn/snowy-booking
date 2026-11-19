import type { Metadata } from 'next';

import { AdminTitle } from '@/components/admin/AdminShell';
import { UnitsManager } from '@/components/admin/UnitsManager';
import { getUnitsData } from '@/lib/admin/config';

export const metadata: Metadata = { title: '유닛·점검' };
export const dynamic = 'force-dynamic';

export default async function UnitsPage() {
  const d = await getUnitsData();
  return (
    <>
      <AdminTitle title="유닛·점검" sub="재고 = 운영 중인 유닛 − 점검 중 유닛 − 배정된 예약" />
      <UnitsManager types={d.types} units={d.units} blackouts={d.blackouts} today={d.today} />
    </>
  );
}
