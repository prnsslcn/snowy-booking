import Link from 'next/link';

import { PageShell } from '@/components/site/PageShell';
import { getSiteSettings } from '@/lib/site-settings';

/** 영업 종료 안내(관리자 일반설정 → 영업 종료 On). 문구의 {year}는 올해(KST)로 치환. */
export const dynamic = 'force-dynamic';

export default async function OffPage() {
  const s = await getSiteSettings();
  return (
    <PageShell center>
      <h1 className="text-2xl font-bold text-ink">{s.closedTitle}</h1>
      <p className="mt-4 whitespace-pre-line text-muted">{s.closedMessage}</p>
      <Link href="/booking/lookup" className="mt-6 text-sm text-accent underline">
        기존 예약 조회·취소
      </Link>
    </PageShell>
  );
}
