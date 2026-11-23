import type { Metadata } from 'next';

import { getLocale } from '@/lib/i18n/server';

/** 클라이언트 화면이라 제목은 여기서 */
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getLocale()) === 'en' ? 'Find or Cancel a Booking' : '예약 조회·취소' };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
