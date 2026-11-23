'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useTransition } from 'react';

import { usePageTransition } from '@/components/site/PageTransition';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n';

const LocaleContext = createContext<Locale>('ko');

/** 레이아웃이 쿠키에서 읽은 언어를 손님 화면 클라이언트 컴포넌트에 내려 준다. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/**
 * 언어 바꾸기 — 쿠키(1년)에 기억하고, 블라인드가 화면(nav 포함)을 덮은 동안 서버 화면을 새 언어로 다시 그린 뒤
 * 첫 진입처럼 걷히며 내용이 다시 등장한다(PageTransition.replay). 주소는 그대로.
 */
export function useSwitchLocale() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { replay } = usePageTransition();
  const locale = useLocale();
  const next: Locale = locale === 'en' ? 'ko' : 'en';
  function toggle() {
    replay(() => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      start(() => router.refresh());
    });
  }
  return { locale, next, toggle, pending };
}

/**
 * 번역 버튼 — nav 오른쪽 끝. '한 A' 글자 아이콘(한국어·영어 두 언어뿐이라).
 * hover: '한'과 'A'가 대각선으로 자리를 바꾼다(모션 줄이기면 그대로).
 */
export function LangToggle({ className = '' }: { className?: string }) {
  const { next, toggle, pending } = useSwitchLocale();
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={next === 'en' ? 'View in English' : '한국어로 보기'}
      title={next === 'en' ? 'English' : '한국어'}
      className={`group relative inline-flex h-10 w-10 items-center justify-center transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 disabled:opacity-50 ${className}`}
    >
      <TranslateIcon />
    </button>
  );
}

const SWAP =
  'absolute leading-none font-semibold transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none';

/** '한 A' 아이콘 — 왼쪽 위 작은 '한', 오른쪽 아래 큰 'A'. 부모가 group 이면 hover 때 서로 자리를 바꾼다 */
export function TranslateIcon() {
  return (
    <span aria-hidden className="relative block h-[25px] w-[25px]">
      <span className={`${SWAP} left-0 top-0 text-[13px] tracking-[-0.04em] group-hover:translate-x-[12px] group-hover:translate-y-[10px]`}>한</span>
      <span className={`${SWAP} bottom-0 right-0 font-display text-[16px] group-hover:-translate-x-[13px] group-hover:-translate-y-[10px]`}>A</span>
    </span>
  );
}
