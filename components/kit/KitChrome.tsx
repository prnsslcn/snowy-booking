 
/**
 * taste-skill 키트 마크업(starter.html 구조): nav-split 메뉴, footer.closing(footer-visit + 색 띠 close-photo), 모바일 actionbar.
 * 키트 JS(system.js)가 메뉴 시트·hover 패널·actionbar 표시를 맡는다 — 여기서 스크립트를 더하지 않는다.
 * 다른 그룹(예약 화면)으로 가는 링크는 일반 <a>(최상위 레이아웃이 달라 전체 로드).
 */

import { KitImg, optimized } from '@/components/kit/Img';
import { USAGE_TIME } from '@/lib/site-config';
import { formatWon } from '@/lib/format';

export const MAIN_ACTION = '자리 예약하기';
export const MAP_SEARCH = 'https://www.openstreetmap.org/search?query=' + encodeURIComponent('비발디파크 스노위랜드 홍천');

export function Arrow() {
  return (
    <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
      <path className="m-arrow__stem" d="M1 6h8" />
      <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  );
}

export interface NavProduct {
  slug: string;
  name: string;
  priceWeekday: number;
  photo?: { src: string; alt: string };
}

export function KitNav({ products, home = true }: { products: NavProduct[]; home?: boolean }) {
  const base = home ? '' : '/';
  return (
    <header className="nav nav--split">
      <div className="wrap nav__bar">
        <a className="skip-link" href="#top">
          본문으로 건너뛰기
        </a>
        <a className="nav__logo" href={home ? '#top' : '/'}>
          <span className="mark" data-mark="ring" aria-hidden="true" />
          스노위랜드
        </a>
        <nav className="nav__links" aria-label="주 메뉴">
          <div className="nav__item">
            <a className="nav__link" href={`${base}#visit`}>
              안내
            </a>
          </div>
          <div className="nav__item">
            <a className="nav__link" href={`${base}#rooms`}>
              요금{' '}
              <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <div className="nav__menu">
              <div className="wrap grid">
                {products.map((p) => (
                  <a key={p.slug} className="menu-card span-4" href={`/facilities/${p.slug}`}>
                    <div className="panel">{p.photo && <KitImg className="frame__img" src={p.photo.src} alt={p.photo.alt} sizes="400px" />}</div>
                    <span className="t-card">{p.name}</span>
                    <span className="t-small muted">{formatWon(p.priceWeekday)}부터</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="nav__item">
            <a className="nav__link" href={`${base}#inside`}>
              실내
            </a>
          </div>
          <div className="nav__item">
            <a className="nav__link" href="/booking/lookup">
              조회
            </a>
          </div>
        </nav>
        <div className="nav__actions">
          <a className="btn btn--primary" href="/booking">
            {MAIN_ACTION}
          </a>
        </div>
        <button className="nav__toggle" type="button" aria-expanded="false" aria-label="메뉴">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export function KitFooter({ closePhoto }: { closePhoto: { src: string; alt: string; phoneSrc?: string } }) {
  return (
    <>
      <footer className="footer closing footer--visit ground-brand" id="contact" aria-labelledby="close-h">
        <div className="wrap">
          <div className="closing__cta close--photo">
            <div className="section-head--split">
              <div>
                <h2 id="close-h">카바나·카라반 온라인 예약</h2>
                <p className="t-lead">오늘부터 1개월 이내 날짜, 당일은 16:00까지. 전액 선결제입니다.</p>
              </div>
              <a className="btn btn--primary" href="/booking">
                {MAIN_ACTION}
                <Arrow />
              </a>
            </div>
            <div className="close__media">
              <picture>
                {closePhoto.phoneSrc && (
                  <source media="(max-width: 639px)" srcSet={`${optimized(closePhoto.phoneSrc, 640)} 640w, ${optimized(closePhoto.phoneSrc, 1080)} 1080w`} sizes="100vw" />
                )}
                <KitImg src={closePhoto.src} alt={closePhoto.alt} sizes="(min-width: 1024px) 1200px, 100vw" data-subject="카바나 외관" />
              </picture>
            </div>
          </div>
          <div className="closing__links">
            <div className="grid">
              <div className="span-6 stack-4">
                <address className="footer__address">
                  홍천 비발디파크
                  <br />
                  스노위랜드
                </address>
                <p>
                  <a className="link" href={MAP_SEARCH} target="_blank" rel="noopener noreferrer">
                    지도에서 보기
                  </a>
                </p>
              </div>
              <div className="span-6 start-7 stack-4">
                <h3>이용 시간</h3>
                <dl className="hours">
                  <dt>시즌 중 매일</dt>
                  <dd>{USAGE_TIME.replace('~', '–')}</dd>
                  <dt>당일 예약</dt>
                  <dd>16:00까지</dd>
                </dl>
              </div>
            </div>
            <div className="footer__legal">
              <span>
                © 2026 주식회사 에이비씨웍스글로벌 &nbsp; <a href="/terms">이용약관</a> &nbsp; <a href="/privacy">개인정보처리방침</a> &nbsp;{' '}
                <a href="/refund-policy">취소·환불정책</a> &nbsp; <a href="/booking/lookup">예약 조회·취소</a>
              </span>
              {/* 전자상거래법 제10조: 결제 사이트의 사업자 정보 표시 의무(스킬 규칙보다 법이 우선) */}
              <span className="t-small">
                대표 황혜진 · 사업자등록번호 442-87-01602 · 통신판매업신고 제2021-서울강서-1055호 · 서울특별시 강서구 마곡중앙로 171
              </span>
            </div>
          </div>
        </div>
      </footer>
      <nav className="actionbar" aria-label="빠른 실행">
        <a className="btn btn--primary" href="/booking">
          {MAIN_ACTION}
        </a>
      </nav>
    </>
  );
}
