import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { BlockIn } from '@/components/site/BlockIn';
import { CopyButton } from '@/components/site/CopyButton';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { PHOTO, photoAlt } from '@/lib/content/facilities';
import { tr } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n/server';
import { ADDRESS, ADDRESS_EN, LOCATION_ENABLED, MAP_LINKS, notices, PLACE_NAME, PLACE_NAME_EN, usageTime } from '@/lib/site-config';
import { getSiteSettings } from '@/lib/site-settings';

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLocale()) === 'en';
  return { title: en ? 'Directions' : '오시는 길', description: en ? `${PLACE_NAME_EN} · ${ADDRESS_EN}` : `${PLACE_NAME} · ${ADDRESS}` };
}

/*
  오시는 길 — 현장 사진 + 장소·주소(복사) + 지도 앱 열기 + 주차·입장권·이용 시간.
  지도는 외부 지도 앱 검색 링크로만(임베드 없음). 확정 사실만.
  링크는 홈 마지막 장 Visit 묶음에만(nav 에는 없음). 주소 복사는 한국어 주소(지도 앱 검색용).
*/
export const dynamic = 'force-dynamic';

export default async function LocationPage() {
  if (!LOCATION_ENABLED) notFound();
  const locale = await getLocale();
  const t = tr(locale);
  const N = notices(locale);
  const closed = (await getSiteSettings()).businessClosed;
  return (
    <SubPage display="Location" sub={t('오시는 길', 'Directions')}>
      {/* 본문도 제목처럼 차례로 등장(blockIn) */}
      <BlockIn delay={0.28} className="relative aspect-[16/10] overflow-hidden rounded-3xl md:aspect-[16/8]">
        <Image src={PHOTO.hero.src} alt={photoAlt(PHOTO.hero, locale)} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
      </BlockIn>

      <BlockIn as="section" delay={0.36} className="mt-4 rounded-3xl bg-white p-6 md:p-8">
        <h2 className="text-[13px] font-semibold text-ice-600">{t('위치', 'Location')}</h2>
        <p className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-glacier md:text-[34px]">{t(PLACE_NAME, PLACE_NAME_EN)}</p>
        <address className="mt-2 text-[15px] not-italic text-ink/70 md:text-base">
          {t(ADDRESS, ADDRESS_EN)}
          {locale === 'en' && <span className="mt-1 block text-[13px] text-ink/50">{ADDRESS}</span>}
        </address>
        <div className="mt-6 flex flex-wrap gap-2">
          {MAP_LINKS.map((m) => (
            <a key={m.href} href={m.href} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'sm')}>
              {t(m.label, m.labelEn)}
              <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <path d="M5.5 3.5h7v7M12.5 3.5 4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
          <CopyButton text={ADDRESS} label={t('주소 복사', 'Copy Address (Korean)')} doneLabel={t('복사됨', 'Copied')} />
        </div>
      </BlockIn>

      <dl className="mt-4 grid gap-3 md:grid-cols-3 md:gap-4">
        {[
          [t('주차', 'Parking'), N.parking],
          [t('입장권', 'Admission'), N.ticket],
          [
            t('이용 시간', 'Hours'),
            t(`시즌 중 매일 ${usageTime(locale)} · 자리는 현장에서 배정합니다.`, `Daily during the season, ${usageTime(locale)} · Units are assigned on site.`),
          ],
        ].map(([k, v], i) => (
          <BlockIn key={k} delay={0.44 + i * 0.06} className="rounded-3xl bg-white p-6">
            <dt className="text-[13px] font-semibold text-ice-600">{k}</dt>
            <dd className="mt-2 text-[15px] leading-relaxed text-ink/80">{v}</dd>
          </BlockIn>
        ))}
      </dl>

      <BlockIn delay={0.6} className="mt-12 flex flex-wrap justify-center gap-2.5">
        <TLink href="/guide" className={buttonClass('secondary', 'md')}>
          {t('이용 안내', 'Guide')}
        </TLink>
        {/* 영업 종료 중엔 예약하기 버튼 숨김 */}
        {!closed && (
          <TLink href="/booking" className={buttonClass('primary', 'md')}>
            {t('예약하기', 'Book Now')}
          </TLink>
        )}
      </BlockIn>
    </SubPage>
  );
}
