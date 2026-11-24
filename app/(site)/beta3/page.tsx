import type { Metadata } from 'next';

import { BetaFacilityPage } from '@/components/site/BetaFacilityPage';

/** 베타 시설 안내 — caravan_group. 검색에는 올리지 않는다. */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return <BetaFacilityPage type="caravan_group" />;
}
