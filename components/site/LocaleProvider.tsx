'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useTransition } from 'react';

import { LOCALE_COOKIE, type Locale } from '@/lib/i18n';

const LocaleContext = createContext<Locale>('ko');

/** 레이아웃이 쿠키에서 읽은 언어를 손님 화면 클라이언트 컴포넌트에 내려 준다. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** 언어 바꾸기 — 쿠키(1년)에 기억하고 서버 화면을 다시 그린다(주소·스크롤 그대로). */
export function useSwitchLocale() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const locale = useLocale();
  const next: Locale = locale === 'en' ? 'ko' : 'en';
  function toggle() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    start(() => router.refresh());
  }
  return { locale, next, toggle, pending };
}

/** 번역 아이콘(가/A) — nav 오른쪽 끝 */
export function LangToggle({ className = '' }: { className?: string }) {
  const { next, toggle, pending } = useSwitchLocale();
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={next === 'en' ? 'View in English' : '한국어로 보기'}
      title={next === 'en' ? 'English' : '한국어'}
      className={`inline-flex items-center justify-center transition-opacity disabled:opacity-50 ${className}`}
    >
      <TranslateIcon />
    </button>
  );
}

/** 번역 아이콘 — 눈 결정과 같은 선 굵기의 단순한 '문자 A + 가' 모양 */
export function TranslateIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* 왼쪽: 한글 느낌의 획 */}
      <path d="M3 5h8" />
      <path d="M7 3v2" />
      <path d="M9.5 5c-.6 3.6-2.6 6.3-6 8" />
      <path d="M5.5 8.5c1.2 2 3 3.4 5.2 4.3" />
      {/* 오른쪽: A */}
      <path d="M12.5 21 17 10l4.5 11" />
      <path d="M14.2 17h5.6" />
    </svg>
  );
}
