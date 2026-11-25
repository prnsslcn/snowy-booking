import type { Metadata } from 'next';

import { FacilityPage } from '@/components/site/FacilityPage';
import { getLocale } from '@/lib/i18n/server';

/** 시설 안내 — 카바나(폰·태블릿 전용, PC 는 홈 상품 장으로) */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getLocale()) === 'en' ? 'Cabana' : '카바나' };
}

export default function Page() {
  return <FacilityPage type="cabana" />;
}
