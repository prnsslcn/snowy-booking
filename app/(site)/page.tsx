import { redirect } from 'next/navigation';

import { Hero } from '@/components/site/Hero';
import { Closing } from '@/components/site/Closing';
import { SectionSnap } from '@/components/site/SectionSnap';
import { Spaces, type Space } from '@/components/site/Spaces';
import { PHOTO } from '@/lib/content/facilities';
import { formatKrw, formatWon } from '@/lib/format';
import { kstToday } from '@/lib/policy/booking-window';
import { getProducts } from '@/lib/products';
import { ONE_PER_DAY_NOTICE, PARKING_NOTICE, REFUND_SUMMARY, TICKET_NOTICE } from '@/lib/site-config';
import { getSiteSettings } from '@/lib/site-settings';

/*
  홈 — aftc 구조: 화면에 붙는 장을 다음 장이 덮으며 밝음/어두움이 번갈아 바뀐다.
  Hero(밝음, 사진) → 공간 안내 3장(어두움·밝음·어두움) → 마지막 장(밝음: 사진 흐름 + 메뉴·약관 + 사업자 정보 + 큰 Snowy).
  글은 확정 사실만(위치·수량·인원·요금·이용 시간·예약 규정). 수량·인원·요금은 DB 값.
*/
export const dynamic = 'force-dynamic';

const DISPLAY: Record<string, string> = { cabana: 'Cabana', caravan: 'Caravan', caravan_group: 'Group Caravan' };

export default async function HomePage() {
  const settings = await getSiteSettings();
  if (settings.businessClosed) redirect('/off');
  const products = await getProducts();

  const n = settings.noticePopup;
  const today = kstToday();
  const notice = n.enabled && n.title && (!n.from || n.from <= today) && (!n.to || n.to >= today) ? n.title : null;

  const spaces: Space[] = products.map((p) => ({
    type: p.type,
    slug: p.slug,
    name: p.name,
    display: DISPLAY[p.type] ?? p.name,
    maxCapacity: p.maxCapacity,
    // 주중·주말을 나누지 않고 범위로(₩70,000 ~ ₩90,000). 언제 주말 요금인지는 '자세히 보기'에.
    price: `${formatKrw(p.priceWeekday)} ~ ${formatKrw(p.priceWeekend)}`,
    photos: (p.content?.photos ?? []).slice(0, 3),
    details: [
      `최대 ${p.maxCapacity}인(영유아 포함), 최소 인원 제한은 없습니다.`,
      '이용 시간은 10:00–17:00입니다. 조기 입실·연장 이용은 없습니다.',
      `주말 요금(${formatWon(p.priceWeekend)})은 금·토·일, 공휴일과 그 전날, 동계 성수기에 적용됩니다.`,
      `${ONE_PER_DAY_NOTICE} 자리는 이용 당일 현장에서 배정합니다.`,
      `취소·환불: ${REFUND_SUMMARY}`,
      `${TICKET_NOTICE} ${PARKING_NOTICE}`,
    ],
  }));

  return (
    <>
      <SectionSnap />
      <div className="relative">
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          <Hero src={PHOTO.hero.src} phoneSrc={PHOTO.heroPhone.src} alt={PHOTO.hero.alt} notice={notice} />
        </div>
        <Spaces spaces={spaces} />
        <div data-snap aria-hidden className="h-0" />
        <Closing z={30 + spaces.length} />
      </div>
    </>
  );
}
