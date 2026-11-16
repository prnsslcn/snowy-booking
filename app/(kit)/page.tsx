/* eslint-disable @next/next/no-html-link-for-pages -- 키트 페이지는 일반 <a>(전체 로드) */
import { redirect } from 'next/navigation';

import { KitHeroPicture, KitImg } from '@/components/kit/Img';
import { Arrow, KitFooter, KitNav, MAIN_ACTION, MAP_SEARCH } from '@/components/kit/KitChrome';
import { PHOTO } from '@/lib/content/facilities';
import { formatWon } from '@/lib/format';
import { getProducts, unitWord } from '@/lib/products';
import { kstToday } from '@/lib/policy/booking-window';
import { getSiteSettings } from '@/lib/site-settings';

/*
  type: place
  deal: hero place (printed) · nav nav-split · close close-photo on colour-band · footer footer-visit ·
        rhythm colour-band · buttons arrow · mark ring · palette olive-on-bone · type zilla (+ Hahmlet / IBM Plex Sans KR 한글)
        the offer = rooms row · the place = trio · type moment = address
        (name 이 뽑혔으나 close-word 는 place 의 colour-band 위에 쓰지 않는 규칙이라 address 로 다시 뽑음)
  moments: picture-develops — #visit 의 카라반 외관 사진(첫 사진 이후 처음 등장하는 큰 사진, 한 번 현상)
  screens: hero 1 · visit 1 · rooms 1 · inside 1 · footer.closing 1 (compact page, 사진 10장 중 9장)
  voice: 평이한 안내체(~입니다). 사실만: 위치·수량·인원·요금·이용 시간·예약 규정. 꾸밈말·지어낸 특징 없음.
*/
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const settings = await getSiteSettings();
  if (settings.businessClosed) redirect('/off');
  const products = await getProducts();
  const minPrice = Math.min(...products.map((p) => p.priceWeekday));
  // 관리자 공지: 팝업 대신 히어로 h1 위 한 줄(taste: 팝업·모달 금지, notice line 허용)
  const n = settings.noticePopup;
  const today = kstToday();
  const notice = n.enabled && n.title && (!n.from || n.from <= today) && (!n.to || n.to >= today) ? n.title : null;
  const counts = products.map((p) => `${p.name} ${p.unitCount}${unitWord(p.type)}`).join(', ');

  return (
    <>
      <KitNav
        products={products.map((p) => ({ slug: p.slug, name: p.name, priceWeekday: p.priceWeekday, photo: PHOTO.room[p.type] }))}
      />

      <main id="top">
        {/* 1. 히어로 — place hero: 사진 위에 아무것도 없음, 글은 아래 바탕 위 */}
        <section className="hero hero--place" data-enter aria-labelledby="hero-h">
          <KitHeroPicture src={PHOTO.hero.src} phoneSrc={PHOTO.heroPhone.src} alt={PHOTO.hero.alt} pos="50% 58%" />
          <div className="wrap">
            <div className="hero-text">
              <div className="hero__text">
                {notice && <p className="hero-notice">{notice}</p>}
                <h1 id="hero-h">홍천 비발디파크 스노위랜드 카바나·카라반</h1>
                <p className="hero__lead">
                  {counts}. 매일 10:00–17:00 당일 이용, 1{unitWord('cabana')} {formatWon(minPrice)}부터.
                </p>
                <div className="btn-row">
                  <a className="btn btn--primary" href="/booking">
                    {MAIN_ACTION}
                    <Arrow />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. 이용 안내 — 두 번째 화면, 위치를 크게(type moment: address) */}
        <section className="section" id="visit" data-place="visit" aria-labelledby="visit-h">
          <div className="wrap">
            <h2 id="visit-h">이용 안내</h2>
            <p className="type-moment">
              <a href={MAP_SEARCH} target="_blank" rel="noopener noreferrer">
                홍천 비발디파크
                <br />
                스노위랜드
              </a>
            </p>
            <div className="grid" style={{ marginTop: 'var(--s-6)' }}>
              <div className="visit visit--card span-6">
                <div className="visit__cols">
                  <div className="visit__col stack-4">
                    <p className="t-label">이용 시간</p>
                    <dl className="hours">
                      <dt>시즌 중 매일</dt>
                      <dd>10:00–17:00</dd>
                      <dt>당일 예약</dt>
                      <dd>16:00까지</dd>
                    </dl>
                  </div>
                  <div className="visit__col stack-4">
                    <p className="t-label">예약</p>
                    <p>오늘부터 1개월 이내 날짜. 1인(휴대폰 번호 기준) 1일 1동입니다.</p>
                  </div>
                </div>
                <ul className="visit__rows">
                  <li>
                    <span>입장권</span>
                    <span>스노위랜드 입장권은 포함되지 않습니다</span>
                  </li>
                  <li>
                    <span>주차</span>
                    <span>비발디파크 리조트 주차장</span>
                  </li>
                </ul>
              </div>
              <figure className="pl-photo pl-photo--end span-6" style={{ ['--pl-r' as string]: 1.3333 }} data-moment="picture-develops">
                <KitImg src={PHOTO.visit.src} alt={PHOTO.visit.alt} sizes="(min-width: 1024px) 588px, 100vw" data-subject="카라반 외관" />
              </figure>
            </div>
          </div>
        </section>

        {/* 3. 공간과 요금 — rooms row */}
        <section className="section" id="rooms" aria-labelledby="rooms-h">
          <div className="wrap">
            <div className="grid head-row">
              <h2 id="rooms-h" className="span-6">
                공간과 요금
              </h2>
              <p className="span-6 start-7">1동 1일 기준. 금·토·일, 공휴일과 그 전날, 12월 24일~2월 9일은 주말 요금입니다.</p>
            </div>
            <div className="grid">
              {products.map((p) => {
                const ph = PHOTO.room[p.type];
                return (
                  <a key={p.type} className="tile tile--portrait span-4" href={`/facilities/${p.slug}`}>
                    <div className="tile__media">{ph && <KitImg src={ph.src} alt={ph.alt} sizes="(min-width: 1024px) 384px, 100vw" />}</div>
                    <div className="tile__head">
                      <h3>{p.name}</h3>
                      <span className="tile__price">{formatWon(p.priceWeekday)}부터</span>
                    </div>
                    <p className="tile__facts">
                      최대 {p.maxCapacity}인 · {p.unitCount}
                      {unitWord(p.type)}
                    </p>
                    <p>
                      주중 {formatWon(p.priceWeekday)} · 주말 {formatWon(p.priceWeekend)}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. 실내 — trio(4:5 · 1:1 · 4:3, 윗선 맞춤) */}
        <section className="section" id="inside" aria-labelledby="inside-h">
          <div className="wrap">
            <div className="grid head-row">
              <h2 id="inside-h" className="span-6">
                카라반 실내
              </h2>
              <p className="span-6 start-7">
                <a className="link" href="/facilities/caravan">
                  카라반 보기
                </a>
                &nbsp;&nbsp;
                <a className="link" href="/facilities/caravan-group">
                  단체카라반 보기
                </a>
              </p>
            </div>
            <div className="grid" style={{ alignItems: 'start' }}>
              {PHOTO.inside.map((ph, i) => {
                const span = ['span-5', 'span-4', 'span-3'][i];
                const r = [0.8, 1, 1.3333][i];
                const href = i === 0 ? '/facilities/caravan-group' : '/facilities/caravan';
                return (
                  <a key={ph.src} className={`${span} zoom-link`} href={href} aria-label={ph.alt}>
                    <figure className="pl-photo" style={{ ['--pl-r' as string]: r }}>
                      <KitImg src={ph.src} alt={ph.alt} sizes="(min-width: 1024px) 486px, 100vw" />
                    </figure>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <KitFooter closePhoto={{ ...PHOTO.close, phoneSrc: '/images/facilities/cabana-1.jpg' }} />
    </>
  );
}
