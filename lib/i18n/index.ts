/**
 * 손님 화면 한/영 전환(2026-11-23). 주소는 그대로, 쿠키(lang)로 언어를 기억한다.
 * - 서버 컴포넌트: getLocale()(lib/i18n/server.ts)
 * - 클라이언트 컴포넌트: useLocale()(components/site/LocaleProvider.tsx)
 * 문구는 쓰는 자리에서 tr(locale)('한국어', 'English') 로 나란히 둔다 — 두 언어가 어긋나지 않게.
 * 관리자 화면·문자는 한국어만.
 */

export type Locale = 'ko' | 'en';
export const LOCALE_COOKIE = 'lang';

export function toLocale(v: string | null | undefined): Locale {
  return v === 'en' ? 'en' : 'ko';
}

/** const t = tr(locale); t('예약하기', 'Book') */
export const tr =
  (locale: Locale) =>
  (ko: string, en: string): string =>
    locale === 'en' ? en : ko;

/** 상품 이름(DB 는 한국어) */
const TYPE_EN: Record<string, string> = { cabana: 'Cabana', caravan: 'Caravan', caravan_group: 'Group Caravan', special: 'Special' };
export function productName(type: string, koName: string, locale: Locale): string {
  return locale === 'en' ? (TYPE_EN[type] ?? koName) : koName;
}

/** 금액 — ko "70,000원" / en "₩70,000" */
export function money(amount: number, locale: Locale): string {
  return locale === 'en' ? `₩${amount.toLocaleString('en-US')}` : `${amount.toLocaleString('ko-KR')}원`;
}

const EN_WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** YYYY-MM-DD → ko "11월 30일 (월)" / en "Mon, Nov 30" */
export function formatDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (locale === 'en') return `${EN_WEEKDAY[wd]}, ${EN_MONTH[m - 1]} ${d}`;
  return `${m}월 ${d}일 (${['일', '월', '화', '수', '목', '금', '토'][wd]})`;
}

export const EN_MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
