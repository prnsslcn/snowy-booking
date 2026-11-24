import type { Metadata } from 'next';

import { AdminTitle } from '@/components/admin/AdminShell';
import { PeakHolidayManager } from '@/components/admin/PeakHolidayManager';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { requireAdmin } from '@/lib/admin/auth';
import { getPricingData } from '@/lib/admin/config';
import { kstToday } from '@/lib/policy/booking-window';
import { DEFAULT_CLOSED_MESSAGE, DEFAULT_CLOSED_TITLE, fetchSiteSettings } from '@/lib/site-settings';

export const metadata: Metadata = { title: '운영 설정' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const [s, d] = await Promise.all([fetchSiteSettings(), getPricingData()]);
  const n = s.noticePopup;
  return (
    <>
      <AdminTitle title="운영 설정" sub="영업 종료 · 시즌 기간 · 공지 · 성수기 · 공휴일" />
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
      {/* 성수기·공휴일 — 바로 저장되는 항목이라 위 '설정 저장'과 따로 */}
      <div className="mt-5">
        <PeakHolidayManager peaks={d.peaks} holidays={d.holidays} range={d.holidayRange} />
      </div>
    </>
  );
}
