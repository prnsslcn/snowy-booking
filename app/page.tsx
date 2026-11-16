import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { NoticePopup } from '@/components/site/NoticePopup';
import { PageShell } from '@/components/site/PageShell';
import { ArrowLink, ButtonLink } from '@/components/ui/Button';
import { PHOTO } from '@/lib/content/facilities';
import { formatWon } from '@/lib/format';
import { BOOKING_WINDOW_MONTHS, SAME_DAY_CUTOFF_HOUR, kstToday } from '@/lib/policy/booking-window';
import { getProducts } from '@/lib/products';
import { ONE_PER_DAY_NOTICE, PARKING_NOTICE, REFUND_SUMMARY, TICKET_NOTICE, USAGE_TIME } from '@/lib/site-config';
import { getSiteSettings } from '@/lib/site-settings';

/*
  배치(taste-skill place deal): nav-split · footer-visit · colour-band · block buttons ·
  offer=tall-small · type moment=address · rooms=row. bleed 는 쓸 수 있는 가로 사진이 없어 생략.
  색·글꼴·여백·버튼은 DESIGN-bmw.md 규칙.
*/
export const dynamic = 'force-dynamic';

const CUTOFF = `${String(SAME_DAY_CUTOFF_HOUR).padStart(2, '0')}:00`;
const MAP_URL = 'https://map.naver.com/p/search/' + encodeURIComponent('비발디파크 스노위랜드');

export default async function HomePage() {
  const settings = await getSiteSettings();
  if (settings.businessClosed) redirect('/off');
  const products = await getProducts();
  const minPrice = Math.min(...products.map((p) => p.priceWeekday));
  const maxCap = Math.max(...products.map((p) => p.maxCapacity));

  const notice = settings.noticePopup;
  const today = kstToday();
  const showNotice =
    notice.enabled && (notice.title || notice.body) && (!notice.from || notice.from <= today) && (!notice.to || notice.to >= today);

  return (
    <PageShell width="full">
      {showNotice && <NoticePopup id={`${notice.title ?? ''}${notice.from ?? ''}`} title={notice.title} body={notice.body} />}

      {/* 1. 히어로 — 첫 화면을 혼자 채움 */}
      <section className="wrap grid min-h-[calc(100svh-64px)] grid-rows-[auto_1fr] gap-8 py-8 md:grid-cols-12 md:grid-rows-1 md:items-end md:gap-6 md:py-10">
        <div className="enter md:col-span-5 md:pb-2">
          <p className="label text-muted">홍천 비발디파크</p>
          <h1 className="mt-4 text-[40px] leading-[1.05] md:text-[64px]">
            스노위랜드
            <br />
            카바나·카라반
          </h1>
          <p className="tabular mt-6 text-[18px] text-body">
            당일 이용 {USAGE_TIME}
            <br />
            1동 {formatWon(minPrice)}부터 · 최대 {maxCap}인
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            <ButtonLink href="/booking">예약하기</ButtonLink>
            <ArrowLink href="/booking/lookup">예약 조회</ArrowLink>
          </div>
        </div>
        <div className="relative min-h-[300px] overflow-hidden bg-surface-card md:col-span-7 md:h-full md:min-h-[520px]">
          <Image src={PHOTO.hero.src} alt={PHOTO.hero.alt} fill preload sizes="(min-width: 768px) 58vw, 100vw" className="object-cover" />
        </div>
      </section>

      {/* 2. 이용 안내 — 위치를 크게(type moment) + 6/6 */}
      <section id="visit" className="scroll-mt-16 border-t border-hairline py-20">
        <div className="wrap">
          <h2 className="text-[32px] leading-[1.15] md:text-[48px]">이용 안내</h2>
          <p className="mt-6">
            <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="draw text-[44px] font-bold leading-[1.05] text-ink md:text-[clamp(56px,7vw,104px)]">
              홍천 비발디파크 스노위랜드
            </a>
          </p>
          <div className="mt-14 grid gap-10 md:grid-cols-12 md:gap-6">
            <dl className="md:col-span-6">
              {[
                ['이용 시간', `당일 ${USAGE_TIME}`],
                ['예약 가능', `오늘부터 ${BOOKING_WINDOW_MONTHS}개월 이내 · 당일 예약 ${CUTOFF}까지`],
                ['예약 기준', ONE_PER_DAY_NOTICE],
                ['자리 배정', '이용 당일 현장에서 배정'],
                ['입장권·주차', `${TICKET_NOTICE} ${PARKING_NOTICE}`],
                ['취소·환불', REFUND_SUMMARY],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[112px_1fr] gap-4 border-t border-hairline py-4 last:border-b">
                  <dt className="text-[16px] font-bold text-ink">{k}</dt>
                  <dd className="text-[16px] leading-[1.5] text-body">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-card md:col-span-6">
              <Image src={PHOTO.visit.src} alt={PHOTO.visit.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. 공간과 요금 — tall-small */}
      <section id="prices" className="py-20">
        <div className="wrap grid gap-10 md:grid-cols-12 md:gap-6">
          <Link href="/facilities/cabana" className="zoom-link relative block aspect-[4/5] overflow-hidden bg-surface-card md:col-span-6" aria-label="카바나 자세히 보기">
            <Image src={PHOTO.offerTall.src} alt={PHOTO.offerTall.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-[450ms]" />
          </Link>
          <div className="flex flex-col justify-between gap-10 md:col-span-5 md:col-start-8">
            <div>
              <h2 className="text-[32px] leading-[1.15] md:text-[48px]">공간과 요금</h2>
              <ul className="mt-8">
                {products.map((p) => (
                  <li key={p.type} className="border-t border-hairline py-4 last:border-b">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-[18px] font-bold text-ink">{p.name}</span>
                      <span className="text-[16px] text-muted">최대 {p.maxCapacity}인</span>
                    </div>
                    <p className="tabular mt-1 text-[16px] text-body">
                      주중 {formatWon(p.priceWeekday)} · 주말 {formatWon(p.priceWeekend)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[16px] text-muted">
                주말 요금: 금·토·일, 공휴일과 그 전날, 12월 24일~2월 9일 매일. 1동 1일 기준.
              </p>
              <ArrowLink href="/booking" className="mt-2">
                날짜별 남은 자리 보기
              </ArrowLink>
            </div>
            <Link href="/facilities/caravan-group" className="zoom-link relative block aspect-square w-[min(282px,60%)] overflow-hidden bg-surface-card" aria-label="단체카라반 자세히 보기">
              <Image src={PHOTO.offerSmall.src} alt={PHOTO.offerSmall.alt} fill sizes="282px" className="object-cover transition-transform duration-[450ms]" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. 세 가지 공간 — row */}
      <section id="spaces" className="scroll-mt-16 border-t border-hairline py-20">
        <div className="wrap">
          <h2 className="text-[32px] leading-[1.15] md:text-[48px]">세 가지 공간</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-6">
            {products.map((p) => {
              const ph = PHOTO.room[p.type];
              return (
                <Link key={p.type} href={`/facilities/${p.slug}`} className="lift group block">
                  <div className="zoom-frame relative aspect-[4/5]">
                    {ph && <Image src={ph.src} alt={ph.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />}
                  </div>
                  <h3 className="mt-5 text-[20px]">{p.name}</h3>
                  <p className="tabular mt-1 text-[16px] text-body">
                    최대 {p.maxCapacity}인 · {formatWon(p.priceWeekday)}부터
                  </p>
                  <span className="label mt-2 inline-flex items-center gap-1.5 py-2 text-ink">
                    <span className="draw">자세히 보기</span>
                    <span aria-hidden>›</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. 마무리 — 색 띠(한 페이지 하나) */}
      <section className="bg-dark py-20 text-white">
        <div className="wrap flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[32px] leading-[1.15] text-white md:text-[48px]">예약</h2>
            <p className="mt-4 text-[18px] text-on-dark-soft">
              오늘부터 {BOOKING_WINDOW_MONTHS}개월 이내 · 당일 예약 {CUTOFF}까지 · 전액 선결제
            </p>
          </div>
          <ButtonLink href="/booking" variant="onDark">
            날짜 선택하기
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
