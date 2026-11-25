import { notFound, redirect } from 'next/navigation';

import { BetaFacility } from '@/components/site/BetaFacility';
import { SiteFooter } from '@/components/site/SiteFooter';
import { buildSpaces } from '@/components/site/spaces-data';
import { getLocale } from '@/lib/i18n/server';
import { getProducts } from '@/lib/products';
import { getSiteSettings } from '@/lib/site-settings';

/** 베타 시설 안내 화면(서버) — /beta1 · /beta2 · /beta3 가 상품 type 만 바꿔 쓴다. 영업 종료 중엔 /off. */
export async function BetaFacilityPage({ type }: { type: string }) {
  if ((await getSiteSettings()).businessClosed) redirect('/off');
  const [products, locale] = await Promise.all([getProducts(), getLocale()]);
  const all = buildSpaces(products, locale, true);
  const index = all.findIndex((s) => s.type === type);
  if (index < 0) notFound();
  return (
    // 푸터도 화면 바탕과 같은 색(카바나·단체카라반 = 겨울 파랑). 감싼 바탕도 같은 색 — 경계 소수점 픽셀에 밝은 줄이 비치지 않게
    <div className={index % 2 === 0 ? 'bg-glacier' : 'bg-ice-50'}>
      <BetaFacility space={all[index]} index={index} all={all} />
      <SiteFooter glacier={index % 2 === 0} />
    </div>
  );
}
