import { redirect } from 'next/navigation';

import BookingPageClient from './BookingPageClient';
import { getSiteSettings } from '@/lib/site-settings';

// 영업 종료 중엔 /off 로. 예약 조회(/booking/lookup)는 영향 없음.
export const dynamic = 'force-dynamic';

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  if ((await getSiteSettings()).businessClosed) redirect('/off');
  const { type } = await searchParams;
  return <BookingPageClient preferredType={type ?? null} />;
}
