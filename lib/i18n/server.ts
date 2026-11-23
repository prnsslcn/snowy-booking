import 'server-only';

import { cookies } from 'next/headers';

import { LOCALE_COOKIE, toLocale, type Locale } from '@/lib/i18n';

/** 요청의 언어(쿠키). 없으면 한국어. */
export async function getLocale(): Promise<Locale> {
  return toLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}
