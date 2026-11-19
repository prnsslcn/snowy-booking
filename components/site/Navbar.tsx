'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- 예약·시설 화면은 최상위 레이아웃이 달라 전체 로드(블라인드 후 location.assign) */

import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { usePageTransition } from '@/components/site/PageTransition';
import { SCROLL_OPTS, useLenis } from '@/components/site/SmoothScroll';

/*
  aftc Navbar 이식.
  - fixed 전체 폭, 배경 틴트 없이 3겹 progressive blur(bridge.surf 방식)
  - 섹션의 data-nav-theme(light/dark)을 스크롤로 감지해 글자색 전환
  - 좌: 로고(눈 결정 — hover 시 한 바퀴 회전, aftc 의 비행기 Lottie 자리)
  - 우: 상품 링크 | 예약 조회 | 예약하기 + 모바일 햄버거 → 풀스크린 clip-path 메뉴
*/

type NavTheme = 'light' | 'dark';

/** 상품 링크는 홈의 공간 장으로(#cabana 등 — Spaces 의 0높이 표식) */
export const NAV_ITEMS = [
  { label: '카바나', href: '#cabana' },
  { label: '카라반', href: '#caravan' },
  { label: '단체카라반', href: '#caravan-group' },
] as const;
const LOOKUP = { label: '예약 조회', href: '/booking/lookup' };
const BOOK = { label: '예약하기', href: '/booking' };

const BLUR_EXTEND = 48;
const BLUR_LAYERS = [
  { blur: 1, mask: 'linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%)' },
  { blur: 4, mask: 'linear-gradient(to bottom, #000 0%, #000 50%, transparent 100%)' },
  { blur: 10, mask: 'linear-gradient(to bottom, #000 0%, #000 30%, transparent 100%)' },
];

const MENU_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];

function Snowflake({ size = 28 }: { size?: number }) {
  // 6갈래 눈 결정 — 가지 하나를 60°씩 돌려 그림
  return (
    <svg width={size} height={size} viewBox="-16 -16 32 32" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M0 0V-13" />
          <path d="M0 -8.5 -3.6 -11.6M0 -8.5 3.6 -11.6" />
          <path d="M0 -4.5 -2.6 -6.8M0 -4.5 2.6 -6.8" />
        </g>
      ))}
    </svg>
  );
}

function Logo() {
  const spin = useAnimationControls();
  return (
    <motion.span
      className="inline-flex"
      animate={spin}
      onMouseEnter={() => {
        spin.set({ rotate: 0 });
        void spin.start({ rotate: 120, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } });
      }}
    >
      <Snowflake />
    </motion.span>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<NavTheme>('light');
  const lenis = useLenis();
  const pathname = usePathname();
  const { leaveTo } = usePageTransition();

  useEffect(() => {
    const detect = () => {
      const zone = 40;
      let current: NavTheme | null = null;
      for (const s of document.querySelectorAll<HTMLElement>('[data-nav-theme]')) {
        const r = s.getBoundingClientRect();
        if (r.top <= zone && r.bottom >= zone) {
          const t = s.dataset.navTheme;
          if (t === 'dark' || t === 'light') current = t;
        }
      }
      setTheme(current ?? 'light');
    };
    detect();
    // 화면 전환 직후엔 새 섹션이 아직 없을 수 있어 블라인드가 걷히는 동안 몇 번 더 본다
    const t1 = setTimeout(detect, 400);
    const t2 = setTimeout(detect, 1500);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(detect);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  // 모바일 메뉴가 열린 동안 페이지 스크롤 정지
  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open, lenis]);

  function go(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // 새 탭 열기는 그대로
    e.preventDefault();
    setOpen(false);
    // 모바일 메뉴가 열려 있던 동안 Lenis 가 멈춰 있다. start() 는 진행 중 애니메이션을 reset 하므로
    // 메뉴 닫힘 effect 보다 먼저 여기서 켜고 나서 스크롤한다(effect 의 start 는 그때 no-op).
    lenis?.start();
    if (href === '/' && pathname === '/') {
      lenis?.scrollTo(0, SCROLL_OPTS);
      return;
    }
    // 상품 앵커(#cabana 등)는 홈 기준 — 다른 화면에서는 홈으로 전환 뒤 그 자리로(leaveTo 가 처리)
    leaveTo(href.startsWith('#') ? `/${href}` : href);
  }

  const isDark = theme === 'dark';
  /** 밑줄 — 현재 화면이면 늘 그어져 있고, 아니면 hover 때 그어짐(aftc 동일) */
  const underline = (active = false) =>
    `relative inline-block py-1 after:absolute after:left-0 after:bottom-0 after:h-[1.5px] after:bg-current after:transition-[width] after:duration-500 after:ease-[cubic-bezier(0.16,1,0.3,1)] ${active ? 'after:w-full' : 'after:w-0 group-hover:after:w-full'}`;
  const link = 'group whitespace-nowrap text-sm font-medium';

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-[100]">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 isolate" style={{ height: `calc(100% + ${BLUR_EXTEND}px)` }}>
          {BLUR_LAYERS.map((l) => (
            <div
              key={l.blur}
              className="absolute inset-0"
              style={{
                backdropFilter: `blur(${l.blur}px)`,
                WebkitBackdropFilter: `blur(${l.blur}px)`,
                maskImage: l.mask,
                WebkitMaskImage: l.mask,
              }}
            />
          ))}
        </div>

        <div
          className="relative z-10 flex items-center px-4 py-3 transition-colors duration-300 md:px-6 md:py-4 lg:px-10"
          style={{ color: isDark ? '#ffffff' : '#0a0a0a' }}
        >
          <a href="/" onClick={(e) => go(e, '/')} className="-my-1 flex flex-none items-center" aria-label="스노위 카바나·카라반 홈">
            <span className="transition-colors duration-300" style={{ color: isDark ? '#ffffff' : '#33689f' }}>
              <Logo />
            </span>
          </a>

          <div className="ml-auto flex items-center gap-5 md:gap-6">
            <div className="hidden items-center gap-6 lg:flex xl:gap-7">
              {NAV_ITEMS.map((item) => (
                <a key={item.href} href={item.href} onClick={(e) => go(e, item.href)} className={link}>
                  <span className={underline()}>{item.label}</span>
                </a>
              ))}
            </div>
            <span aria-hidden className="hidden h-4 w-px bg-current opacity-20 lg:block" />
            <a href={LOOKUP.href} onClick={(e) => go(e, LOOKUP.href)} className={`${link} hidden lg:inline`}>
              <span className={underline(pathname === LOOKUP.href)}>{LOOKUP.label}</span>
            </a>
            <span aria-hidden className="hidden h-4 w-px bg-current opacity-20 lg:block" />
            <a href={BOOK.href} onClick={(e) => go(e, BOOK.href)} className={`${link} hidden md:inline`}>
              <span className={underline(pathname === BOOK.href)}>{BOOK.label}</span>
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={`-mr-1 p-1.5 transition-colors lg:hidden ${isDark ? 'text-white/80 hover:text-white' : 'text-[#0a0a0a]/70 hover:text-[#0a0a0a]'}`}
              aria-label="메뉴 열기"
              aria-expanded={open}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="메뉴"
            className="fixed inset-0 z-[220] flex flex-col items-center justify-center gap-7 bg-glacier/[.98] text-white backdrop-blur-3xl"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.6, ease: MENU_EASE }}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/[.08]"
              aria-label="메뉴 닫기"
              autoFocus
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
              </svg>
            </button>

            {[...NAV_ITEMS, LOOKUP].map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.05, ease: MENU_EASE }}
              >
                <a href={item.href} onClick={(e) => go(e, item.href)} className="text-2xl font-bold">
                  {item.label}
                </a>
              </motion.div>
            ))}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.4 }}>
              <a
                href={BOOK.href}
                onClick={(e) => go(e, BOOK.href)}
                className="mt-4 inline-block rounded-full bg-white px-8 py-4 text-lg font-semibold text-glacier-deep"
              >
                {BOOK.label}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
