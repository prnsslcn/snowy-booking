import { redirect } from 'next/navigation';

import { HomeContent } from '@/components/site/HomeContent';
import { getSiteSettings } from '@/lib/site-settings';

/** 홈 — 영업 종료 중엔 /off(같은 홈 구성, 첫 화면만 Closed). */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if ((await getSiteSettings()).businessClosed) redirect('/off');
  return <HomeContent closed={false} />;
}
