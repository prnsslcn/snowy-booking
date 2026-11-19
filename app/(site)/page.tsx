import { redirect } from 'next/navigation';

import { Hero } from '@/components/site/Hero';
import { Closing } from '@/components/site/Closing';
import { Spaces, type Space } from '@/components/site/Spaces';
import { PHOTO } from '@/lib/content/facilities';
import { formatKrw, formatWon } from '@/lib/format';
import { kstToday } from '@/lib/policy/booking-window';
import { getProducts, unitWord } from '@/lib/products';
import { ONE_PER_DAY_NOTICE, PARKING_NOTICE, REFUND_SUMMARY, TICKET_NOTICE } from '@/lib/site-config';
import { getSiteSettings } from '@/lib/site-settings';

/*
  홈 — aftc 구조: 화면에 붙는 장을 다음 장이 덮으며 밝음/어두움이 번갈아 바뀐다.
  Hero(밝음, 사진) → 공간 안내 3장(어두움·밝음·어두움) → 마지막 장(밝음: 소개 글 + 위치·시간·예약 + 사업자 정보).
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

  const minPrice = Math.min(...products.map((p) => p.priceWeekday));
  const lineup = products.map((p) => `${p.name} ${p.unitCount}${unitWord(p.type)}(최대 ${p.maxCapacity}인)`).join(', ');

  // '·' 앞뒤 줄바꿈 방지(WORD JOINER) — '카바나·' 에서 끊기지 않게
  const headline = '홍천 비발디파크 스노위랜드 안의\n카바나\u2060·\u2060카라반을 당일 이용으로 예약합니다.';
  const body = [
    `${lineup}. 시즌 중 매일 10:00부터 17:00까지 이용하며, 요금은 1동(1대) 1일 기준 ${formatWon(minPrice)}부터입니다. 금·토·일과 공휴일, 공휴일 전날, 동계 성수기에는 주말 요금이 적용됩니다.`,
    '예약은 오늘부터 1개월 이내 날짜로 할 수 있고, 당일 예약은 16:00까지 받습니다. 전액 선결제이며, 1인(휴대폰 번호 기준) 1일 1동만 예약할 수 있습니다. 스노위랜드 입장권은 포함되지 않습니다.',
  ];

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
      <div className="relative">
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          <Hero src={PHOTO.hero.src} phoneSrc={PHOTO.heroPhone.src} alt={PHOTO.hero.alt} notice={notice} />
        </div>
        <Spaces spaces={spaces} />
        <Closing headline={headline} body={body} z={30 + spaces.length} />
      </div>
    </>
  );
}
