import type { Space } from '@/components/site/Spaces';
import { photoAlt } from '@/lib/content/facilities';
import { formatKrw } from '@/lib/format';
import { money, productName, tr, type Locale } from '@/lib/i18n';
import type { Product } from '@/lib/products';
import { notices } from '@/lib/site-config';

/* 상품 장 데이터 — 홈(/, /off)·시설 안내(/cabana · /caravan · /caravan-group)가 같이 쓴다. 수량·인원·요금은 DB 값, 글은 확정 사실만. */

const DISPLAY: Record<string, string> = { cabana: 'Cabana', caravan: 'Caravan', caravan_group: 'Group Caravan' };

export function buildSpaces(products: Product[] | null, locale: Locale, allPhotos = false): Space[] {
  const t = tr(locale);
  const N = notices(locale);
  return (products ?? []).map((p) => ({
  type: p.type,
  slug: p.slug,
  name: productName(p.type, p.name, locale),
  display: DISPLAY[p.type] ?? p.name,
  maxCapacity: p.maxCapacity,
  // 주중·주말을 나누지 않고 범위로(₩70,000 ~ ₩90,000). 언제 주말 요금인지는 '자세히 보기'에.
  price: `${formatKrw(p.priceWeekday)}${locale === 'en' ? ' – ' : ' ~ '}${formatKrw(p.priceWeekend)}`,
  photos: (p.content?.photos ?? []).slice(0, allPhotos ? undefined : 3).map((ph) => ({ ...ph, alt: photoAlt(ph, locale) })),
  details: [
    t(`최대 ${p.maxCapacity}인(영유아 포함), 최소 인원 제한은 없습니다.`, `Up to ${p.maxCapacity} people, infants included. There is no minimum.`),
    t('이용 시간은 10:00–17:00입니다. 조기 입실·연장 이용은 없습니다.', 'Hours are 10:00–17:00. Early check-in and extensions are not available.'),
    t(
      `주말 요금(${money(p.priceWeekend, locale)})은 금·토·일, 공휴일과 그 전날, 동계 성수기에 적용됩니다.`,
      `The weekend rate (${money(p.priceWeekend, locale)}) applies on Fridays, Saturdays, Sundays, public holidays and the day before, and throughout the winter peak season.`,
    ),
    t(`${N.onePerDay} 자리는 이용 당일 현장에서 배정합니다.`, `${N.onePerDay} Your unit is assigned on site on the day of your visit.`),
    t(`취소·환불: ${N.refundSummary}`, `Cancellation and refunds: ${N.refundSummary}`),
    `${N.ticket} ${N.parking}`,
  ],
}));
}
