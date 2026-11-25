import { notFound } from 'next/navigation';

import { Facility } from '@/components/site/Facility';
import { SiteFooter } from '@/components/site/SiteFooter';
import { buildSpaces } from '@/components/site/spaces-data';
import { getLocale } from '@/lib/i18n/server';
import { getProducts } from '@/lib/products';

/**
 * 시설 안내 화면(서버) — /cabana · /caravan · /caravan-group 이 상품 type 만 바꿔 쓴다.
 * 폰·태블릿 전용: lg 이상에서는 감춰 두고 Facility 가 홈 상품 장으로 보낸다.
 * 영업 종료 중에도 열린다(/off 의 상품 카드에서 들어옴) — 예약하기 버튼만 숨김.
 */
export async function FacilityPage({ type }: { type: string }) {
  const [products, locale] = await Promise.all([getProducts(), getLocale()]);
  const all = buildSpaces(products, locale, true);
  const index = all.findIndex((s) => s.type === type);
  if (index < 0) notFound();
  return (
    // 푸터도 화면 바탕과 같은 색(카바나·단체카라반 = 겨울 파랑). 감싼 바탕도 같은 색 — 경계 소수점 픽셀에 밝은 줄이 비치지 않게
    <div className={`lg:invisible ${index % 2 === 0 ? 'bg-glacier' : 'bg-ice-50'}`}>
      <Facility space={all[index]} index={index} all={all} />
      <SiteFooter glacier={index % 2 === 0} />
    </div>
  );
}
