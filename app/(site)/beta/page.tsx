import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { HomeContent } from '@/components/site/HomeContent';
import { getSiteSettings } from '@/lib/site-settings';

/** 홈 베타 — 문서형(장 넘기기 없이 브라우저 스크롤 그대로). 검색에는 올리지 않는다. 영업 종료 중엔 /off. */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function HomeBetaPage() {
  if ((await getSiteSettings()).businessClosed) redirect('/off');
  return <HomeContent closed={false} doc />;
}
