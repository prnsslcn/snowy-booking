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
    <>
      <BetaFacility space={all[index]} index={index} all={all} />
      <SiteFooter />
    </>
  );
}
