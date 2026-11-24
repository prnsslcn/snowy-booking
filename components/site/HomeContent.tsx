import Link from 'next/link';

import { Hero } from '@/components/site/Hero';
import { Closing } from '@/components/site/Closing';
import { PageTitle } from '@/components/site/PageTitle';
import { SectionSnap } from '@/components/site/SectionSnap';
import { Spaces, type Space } from '@/components/site/Spaces';
import { buttonClass } from '@/components/ui/Button';
import { PHOTO, photoAlt } from '@/lib/content/facilities';
import { formatKrw } from '@/lib/format';
import { money, productName, tr } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n/server';
import { kstToday } from '@/lib/policy/booking-window';
import { getProducts } from '@/lib/products';
import { notices } from '@/lib/site-config';
import { getSiteSettings } from '@/lib/site-settings';

/*
  홈 본문 — aftc 구조: 화면에 붙는 장을 다음 장이 덮으며 밝음/어두움이 번갈아 바뀐다.
  Hero(밝음, 사진) → 공간 안내 3장(어두움·밝음·어두움) → 마지막 장(밝음: 사진 흐름 + 메뉴·약관 + 사업자 정보 + 큰 Snowy).
  글은 확정 사실만(위치·수량·인원·요금·이용 시간·예약 규정). 수량·인원·요금은 DB 값.
*/
const DISPLAY: Record<string, string> = { cabana: 'Cabana', caravan: 'Caravan', caravan_group: 'Group Caravan' };

/** 홈 본문 — 홈(`/`)과 영업 종료 안내(`/off`)가 같이 쓴다. closed 면 첫 화면만 Closed 안내. */
export async function HomeContent({ closed: isClosed }: { closed: boolean }) {
  const settings = await getSiteSettings();
  const products = await getProducts();
  const locale = await getLocale();
  const t = tr(locale);
  // /off: 첫 화면만 예전 영업 종료 안내(Closed), 아래 시설 소개는 그대로(예약 버튼·링크는 각 컴포넌트가 숨김).
  // 관리자가 쓴 안내 문구는 한국어라, 영어 보기에서는 기본 안내를 영어로
  const year = kstToday().slice(0, 4);
  const closed = isClosed
    ? locale === 'en'
      ? {
          title: `The ${year} season has ended`,
          message: `Thank you to everyone who visited Snowy Cabana & Caravan this ${year} season.\nWe look forward to welcoming you again next season.`,
        }
      : { title: settings.closedTitle, message: settings.closedMessage }
    : null;
  const N = notices(locale);

  const n = settings.noticePopup;
  const today = kstToday();
  const notice = n.enabled && n.title && (!n.from || n.from <= today) && (!n.to || n.to >= today) ? n.title : null;

  const spaces: Space[] = (products ?? []).map((p) => ({
    type: p.type,
    slug: p.slug,
    name: productName(p.type, p.name, locale),
    display: DISPLAY[p.type] ?? p.name,
    maxCapacity: p.maxCapacity,
    // 주중·주말을 나누지 않고 범위로(₩70,000 ~ ₩90,000). 언제 주말 요금인지는 '자세히 보기'에.
    price: `${formatKrw(p.priceWeekday)}${locale === 'en' ? ' – ' : ' ~ '}${formatKrw(p.priceWeekend)}`,
    photos: (p.content?.photos ?? []).slice(0, 3).map((ph) => ({ ...ph, alt: photoAlt(ph, locale) })),
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

  return (
    <>
      <SectionSnap />
      <div className="relative">
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          {closed ? (
            // 영업 종료 첫 화면 — 예전 /off 안내 그대로(밝은 바탕, 큰 'Closed' + 안내 제목·내용). 사진·눈 없음
            <main data-nav-theme="light" className="h-full bg-ice-50 text-ink">
              <div className="mx-auto w-full max-w-3xl px-5 pt-28 md:px-8 md:pt-32">
                <PageTitle display="Closed" sub={closed.title} />
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/70">{closed.message}</p>
              </div>
            </main>
          ) : (
            <Hero src={PHOTO.hero.src} phoneSrc={PHOTO.heroPhone.src} alt={photoAlt(PHOTO.hero, locale)} notice={notice} />
          )}
        </div>
        {products ? (
          <Spaces spaces={spaces} />
        ) : (
          // DB 를 읽지 못했을 때 — 상품 장을 조용히 빼지 않고 안내(새로고침하면 다시 읽는다)
          <section
            data-nav-theme="light"
            className="relative z-20 flex min-h-[70dvh] flex-col items-center justify-center rounded-t-[48px] bg-ice-50 px-5 text-center text-ink"
          >
            <p className="text-[18px] font-semibold tracking-[-0.01em] md:text-[22px]">{t('상품 정보를 불러오지 못했습니다', 'We couldn’t load our rooms right now')}</p>
            <p className="mt-2 text-[15px] text-ink/60">{t('잠시 후 다시 시도해 주세요.', 'Please try again in a moment.')}</p>
            <Link href="/" prefetch={false} className={buttonClass('primary', 'sm', 'mt-8')}>
              {t('다시 불러오기', 'Try again')}
            </Link>
          </section>
        )}
        <div data-snap aria-hidden className="h-0" />
        <Closing z={30 + Math.max(spaces.length, 1)} />
      </div>
    </>
  );
}
