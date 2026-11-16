import 'server-only';

import { unstable_cache } from 'next/cache';

import { kstToday } from '@/lib/policy/booking-window';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 사이트 일반설정(단일 행) — grill-booking 이식 + 시즌 기간·공지 팝업.
 * 고객 페이지는 캐시본(태그 무효화), 예약 생성 API는 원본(fetchSiteSettings)을 읽는다.
 */

export const SITE_SETTINGS_TAG = 'site-settings';
export const YEAR_TOKEN = '{year}';
export const DEFAULT_CLOSED_TITLE = '{year} 시즌 영업이 종료되었습니다';
export const DEFAULT_CLOSED_MESSAGE =
  '{year} 시즌 스노위랜드 카바나·카라반을 찾아주신 모든 분께 감사드립니다.\n다음 시즌에 다시 찾아뵙겠습니다.';

export function applyYear(text: string, now: Date = new Date()): string {
  return text.replaceAll(YEAR_TOKEN, kstToday(now).slice(0, 4));
}

export interface NoticePopup {
  enabled: boolean;
  title?: string;
  body?: string;
  from?: string;
  to?: string;
}

export interface SiteSettings {
  businessClosed: boolean;
  closedTitle: string;
  closedMessage: string;
  rawTitle: string | null;
  rawMessage: string | null;
  seasonFrom: string | null;
  seasonTo: string | null;
  noticePopup: NoticePopup;
  updatedAt: string | null;
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('site_settings')
    .select('business_closed, closed_title, closed_message, season_from, season_to, notice_popup, updated_at')
    .eq('id', true)
    .maybeSingle();
  return {
    businessClosed: data?.business_closed ?? false,
    closedTitle: applyYear(data?.closed_title?.trim() || DEFAULT_CLOSED_TITLE),
    closedMessage: applyYear(data?.closed_message?.trim() || DEFAULT_CLOSED_MESSAGE),
    rawTitle: data?.closed_title ?? null,
    rawMessage: data?.closed_message ?? null,
    seasonFrom: data?.season_from ?? null,
    seasonTo: data?.season_to ?? null,
    noticePopup: ((data?.notice_popup ?? { enabled: false }) as unknown) as NoticePopup,
    updatedAt: data?.updated_at ?? null,
  };
}

export const getSiteSettings = unstable_cache(fetchSiteSettings, ['site-settings'], {
  tags: [SITE_SETTINGS_TAG],
  revalidate: 300,
});
