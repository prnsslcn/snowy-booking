 
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { KitImg } from '@/components/kit/Img';
import { Arrow, KitFooter, KitNav, MAIN_ACTION } from '@/components/kit/KitChrome';
import { PHOTO, facilityBySlug } from '@/lib/content/facilities';
import { formatWon } from '@/lib/format';
import { getProducts, unitWord } from '@/lib/products';
import { ONE_PER_DAY_NOTICE, REFUND_SUMMARY, TICKET_NOTICE } from '@/lib/site-config';

/* 시설 상세(taste-skill 키트, place): 히어로(시설 대표 사진) → 요금과 기준(rows + 사진) → 사진 → footer.closing */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getProducts()).find((x) => x.slug === slug);
  return p
    ? {
        title: `${p.name}: 홍천 비발디파크 스노위랜드 당일 이용`,
        description: `스노위랜드 ${p.name} 최대 ${p.maxCapacity}인, 주중 ${formatWon(p.priceWeekday)} · 주말 ${formatWon(p.priceWeekend)}, 10:00–17:00 당일 이용.`,
      }
    : {};
}

export default async function FacilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = facilityBySlug(slug);
  const products = await getProducts();
  const p = products.find((x) => x.slug === slug);
  if (!content || !p) notFound();

  const [lead, ...rest] = content.photos;
  const side = rest[0];
  const more = rest.slice(1);
  const u = unitWord(p.type);

  return (
    <>
      <KitNav
        home={false}
        products={products.map((x) => ({ slug: x.slug, name: x.name, priceWeekday: x.priceWeekday, photo: PHOTO.room[x.type] }))}
      />
      <main id="top">
        <section className="hero hero--place" data-enter aria-labelledby="hero-h">
          <KitImg className="hero__bg" data-phone-fill src={lead.src} alt={lead.alt} sizes="100vw" eager style={{ ['--ly-pos' as string]: '50% 50%' }} />
          <div className="wrap">
            <div className="hero-text">
              <div className="hero__text">
                <h1 id="hero-h">스노위랜드 {p.name}</h1>
                <p className="hero__lead">
                  최대 {p.maxCapacity}인, {p.unitCount}
                  {u}. 매일 10:00–17:00 당일 이용, 주중 {formatWon(p.priceWeekday)}.
                </p>
                <div className="btn-row">
                  <a className="btn btn--primary" href={`/booking?type=${p.slug}`}>
                    {MAIN_ACTION}
                    <Arrow />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="prices" aria-labelledby="prices-h">
          <div className="wrap">
            <h2 id="prices-h">{p.name} 요금과 기준</h2>
            <div className="grid" style={{ marginTop: 'var(--s-6)' }}>
              <ul className="rows span-6">
                <li>
                  <span className="rows__name">주중</span>
                  <span className="rows__value">{formatWon(p.priceWeekday)}</span>
                </li>
                <li>
                  <span className="rows__name">주말·공휴일·12월 24일~2월 9일</span>
                  <span className="rows__value">{formatWon(p.priceWeekend)}</span>
                </li>
                <li>
                  <span className="rows__name">최대 인원(영유아 포함)</span>
                  <span className="rows__value">{p.maxCapacity}인</span>
                </li>
                <li>
                  <span className="rows__name">이용 시간</span>
                  <span className="rows__value">10:00–17:00</span>
                </li>
                <li>
                  <span className="rows__name">예약 기준</span>
                  <p>{ONE_PER_DAY_NOTICE} 자리는 이용 당일 현장에서 배정합니다.</p>
                </li>
                <li>
                  <span className="rows__name">취소·환불</span>
                  <p>{REFUND_SUMMARY}</p>
                </li>
                <li>
                  <span className="rows__name">입장권</span>
                  <p>{TICKET_NOTICE}</p>
                </li>
              </ul>
              {side && (
                <figure className="pl-photo pl-photo--end span-6" style={{ ['--pl-r' as string]: 1.3333 }}>
                  <KitImg src={side.src} alt={side.alt} sizes="(min-width: 1024px) 588px, 100vw" />
                </figure>
              )}
            </div>
          </div>
        </section>

        {more.length > 0 && (
          <section className="section" id="photos" aria-labelledby="photos-h">
            <div className="wrap">
              <h2 id="photos-h">{p.name} 사진</h2>
              <div className="grid" style={{ marginTop: 'var(--s-6)', alignItems: 'start' }}>
                {more.map((ph) => (
                  <figure key={ph.src} className={`pl-photo ${more.length === 1 ? 'span-6' : 'span-6'}`} style={{ ['--pl-r' as string]: 0.8 }}>
                    <KitImg src={ph.src} alt={ph.alt} sizes="(min-width: 1024px) 588px, 100vw" />
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <KitFooter closePhoto={p.type === 'cabana' ? PHOTO.room.caravan : PHOTO.close} />
    </>
  );
}
