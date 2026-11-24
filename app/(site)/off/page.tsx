import type { Metadata } from 'next';

import { HomeContent } from '@/components/site/HomeContent';
import { getLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getLocale()) === 'en' ? 'Season Closed' : '영업 종료' };
}

/*
  영업 종료 안내(관리자 운영 설정 → 영업 종료 On 이면 홈·예약하기가 여기로).
  홈과 같은 구성 — 첫 화면만 'Closed' 안내(밝은 바탕 + 문구, 문구의 {year}는 올해), 아래 시설 소개는 스크롤로 그대로.
  예약하기·예약 조회 버튼·링크는 없다(useBusinessClosed).
*/
export const dynamic = 'force-dynamic';

export default function OffPage() {
  return <HomeContent closed />;
}
