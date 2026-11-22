import type { Metadata } from 'next';

import { AdminTitle } from '@/components/admin/AdminShell';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { requireAdmin } from '@/lib/admin/auth';
import { kstToday } from '@/lib/policy/booking-window';
import { DEFAULT_CLOSED_MESSAGE, DEFAULT_CLOSED_TITLE, fetchSiteSettings } from '@/lib/site-settings';

export const metadata: Metadata = { title: '운영 설정' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const s = await fetchSiteSettings();
  const n = s.noticePopup;
  return (
    <>
      <AdminTitle title="운영 설정" sub="영업 종료 · 시즌 기간 · 공지" />
      <SettingsForm
        year={kstToday().slice(0, 4)}
        defaults={{ title: DEFAULT_CLOSED_TITLE, message: DEFAULT_CLOSED_MESSAGE }}
        initial={{
          businessClosed: s.businessClosed,
          closedTitle: s.rawTitle ?? '',
          closedMessage: s.rawMessage ?? '',
          seasonFrom: s.seasonFrom ?? '',
          seasonTo: s.seasonTo ?? '',
          notice: { enabled: n.enabled, title: n.title ?? '', body: n.body ?? '', from: n.from ?? '', to: n.to ?? '' },
        }}
      />
    </>
  );
}
