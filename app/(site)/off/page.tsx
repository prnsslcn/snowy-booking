import type { Metadata } from 'next';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { tr } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n/server';
import { getSiteSettings } from '@/lib/site-settings';
import { kstToday } from '@/lib/policy/booking-window';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getLocale()) === 'en' ? 'Season Closed' : '영업 종료' };
}

/** 영업 종료 안내(관리자 일반설정 → 영업 종료 On). 문구의 {year}는 올해(KST)로 치환. */
export const dynamic = 'force-dynamic';

export default async function OffPage() {
  const s = await getSiteSettings();
  const locale = await getLocale();
  const t = tr(locale);
  // 관리자가 쓴 안내 문구는 한국어라, 영어 보기에서는 기본 안내를 영어로
  const year = kstToday().slice(0, 4);
  const title = locale === 'en' ? `The ${year} season has ended` : s.closedTitle;
  const message =
    locale === 'en'
      ? `Thank you to everyone who visited Snowy Cabana & Caravan this ${year} season.\nWe look forward to welcoming you again next season.`
      : s.closedMessage;
  return (
    <SubPage display="Closed" sub={title}>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/70">{message}</p>
      <TLink href="/booking/lookup" className={buttonClass('secondary', 'block', 'mt-10')}>
        {t('기존 예약 조회·취소', 'Find or Cancel an Existing Booking')}
      </TLink>
    </SubPage>
  );
}
