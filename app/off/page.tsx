import { PageShell } from '@/components/site/PageShell';
import { ButtonLink } from '@/components/ui/Button';
import { getSiteSettings } from '@/lib/site-settings';

/** 영업 종료 안내(관리자 일반설정 → 영업 종료 On). 문구의 {year}는 올해(KST)로 치환. */
export const dynamic = 'force-dynamic';

export default async function OffPage() {
  const s = await getSiteSettings();
  return (
    <PageShell center>
      <div className="enter w-full">
        <h1 className="text-[26px] font-bold">{s.closedTitle}</h1>
        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted">{s.closedMessage}</p>
        <ButtonLink href="/booking/lookup" variant="outline" size="lg" className="mt-8">
          기존 예약 조회·취소
        </ButtonLink>
      </div>
    </PageShell>
  );
}
