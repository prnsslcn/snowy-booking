import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { BlockIn } from '@/components/site/BlockIn';
import { Faq, type FaqItem } from '@/components/site/Faq';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { formatKrw } from '@/lib/format';
import { getProducts } from '@/lib/products';
import { productName, tr, type Locale } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n/server';
import { BOOKING_WINDOW_EN, BOOKING_WINDOW_KO } from '@/lib/policy/booking-window';
import { notices, usageTime } from '@/lib/site-config';
import { getSiteSettings } from '@/lib/site-settings';

export async function generateMetadata(): Promise<Metadata> {
  return (await getLocale()) === 'en'
    ? { title: 'Guide', description: 'Hours, booking, rates, cancellation and refunds for Snowy Cabana & Caravan' }
    : { title: '이용 안내', description: '스노위 카바나·카라반 이용 시간, 예약, 요금, 취소·환불 안내' };
}

/*
  이용 안내 — 확정 사실만 카드로(이용 시간 · 예약 · 상품과 요금 · 현장 이용 · 취소와 환불) + 자주 묻는 질문(#faq).
  상품 이름·최대 인원·요금은 DB(product_types)가 권위.
*/
export const dynamic = 'force-dynamic';

/** 카드 — 제목 다음 차례로 등장(blockIn). delay 는 카드 순서 */
function Card({ label, title, wide = false, delay = 0.28, children }: { label: string; title?: string; wide?: boolean; delay?: number; children?: ReactNode }) {
  return (
    <BlockIn as="section" delay={delay} className={`rounded-3xl bg-white p-6 md:p-7 ${wide ? 'md:col-span-2' : ''}`}>
      <h2 className="text-[13px] font-semibold text-ice-600">{label}</h2>
      {title && <p className="mt-2 text-[19px] font-bold leading-snug tracking-[-0.015em] md:text-[22px]">{title}</p>}
      {children}
    </BlockIn>
  );
}

function Notes({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-1.5 text-[14px] leading-relaxed text-ink/70 md:text-[15px]">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden className="mt-[0.62em] h-1 w-1 flex-none rounded-full bg-ice-400" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const TABLE = 'mt-4 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-ice-700/15 text-[14px] md:text-[15px]';
const TH = 'bg-ice-100 px-4 py-3 text-left font-semibold';
const TD = 'border-t border-ice-700/10 px-4 py-3 tabular-nums';

function faqItems(locale: Locale): FaqItem[] {
  const t = tr(locale);
  const N = notices(locale);
  return [
    { q: t('스노위랜드 입장권이 포함되어 있나요?', 'Is a Snowyland admission ticket included?'), a: N.ticket },
    { q: t('몇 호를 이용하게 되나요?', 'Which unit will I get?'), a: t('자리(호수)는 이용 당일 현장에서 배정합니다.', 'Your unit is assigned on site on the day of your visit.') },
    {
      q: t('이용 시간을 늘리거나 일찍 들어갈 수 있나요?', 'Can I arrive early or stay longer?'),
      a: t('이용 시간은 10:00~17:00이며, 조기 입실·연장 이용은 없습니다.', 'Hours are 10:00–17:00. Early check-in and extensions are not available.'),
    },
    {
      q: t('영유아도 인원에 포함되나요?', 'Do infants count toward the number of guests?'),
      a: t('네, 최대 인원에는 영유아가 포함됩니다. 최소 인원 제한은 없습니다.', 'Yes. Infants count toward the maximum number of guests. There is no minimum.'),
    },
    { q: t('하루에 여러 동을 예약할 수 있나요?', 'Can I book more than one unit for the same day?'), a: N.onePerDay },
    {
      q: t('예약 날짜를 바꿀 수 있나요?', 'Can I change the date of my booking?'),
      a: t(
        '날짜 변경은 제공하지 않습니다. 예약을 취소한 뒤 다시 예약해 주세요. 이때 취소·환불 규정이 적용됩니다.',
        'Date changes are not available. Please cancel and book again. The cancellation and refund rules apply.',
      ),
    },
    {
      q: t('이용 당일에도 취소할 수 있나요?', 'Can I cancel on the day of my visit?'),
      a: t(
        '입실 전이라면 예약 조회·취소에서 직접 취소할 수 있습니다. 다만 당일 취소는 환불되지 않습니다.',
        'Yes, as long as you have not checked in, under Find or Cancel a Booking. Same-day cancellations are not refunded.',
      ),
    },
    {
      q: t('예약번호는 어디서 확인하나요?', 'Where do I find my booking number?'),
      a: t(
        '예약이 확정되면 문자로 4자리 예약번호를 안내합니다. 조회·취소할 때 휴대폰 번호와 함께 입력합니다.',
        'We send your 4-digit booking number by text message once your booking is confirmed. Enter it with your mobile number to look up or cancel your booking.',
      ),
    },
    { q: t('주차는 어디에 하나요?', 'Where can I park?'), a: N.parking },
  ];
}

export default async function GuidePage() {
  const products = await getProducts();
  const locale = await getLocale();
  const t = tr(locale);
  const N = notices(locale);
  const link = 'font-medium text-glacier underline decoration-ice-300 underline-offset-4';

  return (
    <SubPage display="Guide" sub={t('이용 안내', 'Hours, booking, rates and refunds')}>
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <Card delay={0.28} label={t('이용 시간', 'Hours')} title={t('시즌 중 매일 10:00~17:00', `Every day of the season, ${usageTime('en')}`)}>
          <Notes items={[t('당일 이용, 하루 1회입니다.', 'Day use, once a day.'), t('조기 입실·연장 이용은 없습니다.', 'Early check-in and extensions are not available.')]} />
        </Card>

        <Card delay={0.34} label={t('예약', 'Booking')} title={t(`오늘부터 ${BOOKING_WINDOW_KO} 이내`, `Up to ${BOOKING_WINDOW_EN} ahead`)}>
          <Notes
            items={[
              t('당일 예약은 16:00까지 받습니다.', 'Same-day bookings close at 16:00.'),
              t('전액 선결제로 예약이 확정됩니다.', 'Your booking is confirmed once you pay in full.'),
              N.onePerDay,
            ]}
          />
        </Card>

        <Card delay={0.4} label={t('상품과 요금', 'Rooms and Rates')} wide>
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>{t('상품', 'Type')}</th>
                <th className={TH}>{t('최대 인원', 'Max. guests')}</th>
                <th className={TH}>{t('요금', 'Price')}</th>
              </tr>
            </thead>
            <tbody>
              {!products && (
                <tr>
                  <td colSpan={3} className={`${TD} text-ink/60`}>
                    {t('요금 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We couldn’t load the rates right now. Please try again in a moment.')}
                  </td>
                </tr>
              )}
              {(products ?? []).map((p) => (
                <tr key={p.type}>
                  <td className={`${TD} font-semibold`}>{productName(p.type, p.name, locale)}</td>
                  <td className={TD}>{t(`${p.maxCapacity}인`, `${p.maxCapacity}`)}</td>
                  <td className={TD}>
                    {formatKrw(p.priceWeekday)}
                    {locale === 'en' ? ' – ' : ' ~ '}
                    {formatKrw(p.priceWeekend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Notes
            items={[
              t('요금은 1동(1대) 1일 기준입니다.', 'Prices are per unit, per day.'),
              t(
                '금·토·일, 공휴일과 그 전날, 동계 성수기에는 주말 요금이 적용됩니다.',
                'The weekend rate applies on Fridays, Saturdays, Sundays, public holidays and the day before, and throughout the winter peak season.',
              ),
              t('최대 인원에는 영유아가 포함되며, 최소 인원 제한은 없습니다.', 'Infants count toward the maximum number of guests. There is no minimum.'),
            ]}
          />
        </Card>

        <Card delay={0.46} label={t('현장 이용', 'On Site')} title={t('자리는 이용 당일 현장에서 배정합니다', 'Your unit is assigned on site on the day')}>
          <Notes items={[N.ticket, N.parking]} />
        </Card>

        <Card delay={0.52} label={t('취소와 환불', 'Cancellations and Refunds')} title={t('이용 2일 전까지 100% 환불', 'Full refund up to 2 days before')}>
          <Notes
            items={[
              t('이용 1일 전 50%, 이용 당일·노쇼는 환불되지 않습니다.', '50% the day before. No refund on the day of use or for no-shows.'),
              t('날짜 변경은 없으며, 취소 후 다시 예약해 주세요.', 'Dates cannot be changed. Please cancel and book again.'),
              locale === 'en' ? (
                <>
                  Cancel it yourself under{' '}
                  <TLink href="/booking/lookup" className={link}>
                    Find or Cancel a Booking
                  </TLink>{' '}
                  with your mobile number and 4-digit booking number.
                </>
              ) : (
                <>
                  <TLink href="/booking/lookup" className={link}>
                    예약 조회·취소
                  </TLink>
                  에서 휴대폰 번호와 예약번호 4자리로 직접 취소할 수 있습니다.
                </>
              ),
            ]}
          />
          <TLink href="/refund-policy" className={buttonClass('secondary', 'sm', 'mt-5')}>
            {t('취소·환불정책 보기', 'View the Refund Policy')}
          </TLink>
        </Card>
      </div>

      {/* 자주 묻는 질문 */}
      <section id="faq" className="mt-16 scroll-mt-28 md:mt-20">
        <BlockIn delay={0.1}>
          <h2 className="mb-5 text-[22px] font-bold tracking-[-0.02em] md:text-[28px]">{t('자주 묻는 질문', 'FAQ')}</h2>
        </BlockIn>
        <BlockIn delay={0.18}>
          <Faq items={faqItems(locale)} />
        </BlockIn>
      </section>

      {/* 영업 종료 중엔 예약하기 버튼 숨김 */}
      {!(await getSiteSettings()).businessClosed && (
        <BlockIn delay={0.1} className="mt-12 flex justify-center">
          <TLink href="/booking" className={buttonClass('primary', 'md')}>
            {t('예약하기', 'Book Now')}
          </TLink>
        </BlockIn>
      )}
    </SubPage>
  );
}
