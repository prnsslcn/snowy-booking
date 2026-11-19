import type { Metadata } from 'next';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { getSiteSettings } from '@/lib/site-settings';

export const metadata: Metadata = { title: '영업 종료' };

/** 영업 종료 안내(관리자 일반설정 → 영업 종료 On). 문구의 {year}는 올해(KST)로 치환. */
export const dynamic = 'force-dynamic';

export default async function OffPage() {
  const s = await getSiteSettings();
  return (
    <SubPage display="Closed" sub={s.closedTitle}>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#0a0a0a]/70">{s.closedMessage}</p>
      <TLink href="/booking/lookup" className={buttonClass('secondary', 'block', 'mt-10')}>
        기존 예약 조회·취소
      </TLink>
    </SubPage>
  );
}
