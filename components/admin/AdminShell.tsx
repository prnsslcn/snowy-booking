'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import { DialogHost } from '@/components/ui/Dialog';
import { createClient } from '@/lib/supabase/client';
import { Snowflake } from '@/components/ui/Snowflake';

/*
  관리자 틀 — 데스크톱: 왼쪽 고정 메뉴(운영·분석·설정 묶음 + 선 아이콘) / 폰: 위 막대 + 가로로 밀리는 메뉴.
  지금 화면 표시는 하나의 면이 메뉴 사이를 미끄러져 옮겨 간다(layoutId).
*/
type NavItem = { href: string; label: string; en: string; icon: keyof typeof ICON };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: '운영',
    items: [
      { href: '/admin', label: '대시보드', en: 'Dashboard', icon: 'dashboard' },
      { href: '/admin/board', label: '현장 배정', en: 'On-site', icon: 'board' },
      { href: '/admin/bookings', label: '예약 관리', en: 'Bookings', icon: 'bookings' },
      { href: '/admin/calendar', label: '운영 달력', en: 'Calendar', icon: 'calendar' },
    ],
  },
  { label: '분석', items: [{ href: '/admin/sales', label: '매출', en: 'Sales', icon: 'sales' }] },
  {
    label: '설정',
    items: [
      { href: '/admin/units', label: '유닛·점검', en: 'Units', icon: 'units' },
      { href: '/admin/pricing', label: '요금', en: 'Pricing', icon: 'pricing' },
      { href: '/admin/settings', label: '운영 설정', en: 'Settings', icon: 'settings' },
    ],
  },
];

export const ADMIN_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** 데스크톱 등장 순서: 로고(0) → 묶음 이름·메뉴 차례로 → 계정(맨 끝) */
const GROUP_START = NAV_GROUPS.map((_, gi) => 1 + NAV_GROUPS.slice(0, gi).reduce((a, g) => a + g.items.length + 1, 0));
const ACCOUNT_ORDER = 1 + ADMIN_NAV.length + NAV_GROUPS.length;

/** 선 아이콘(24 격자, 1.6 선) */
const ICON = {
  dashboard: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  board: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  bookings: 'M6 3.5h12a1 1 0 0 1 1 1V21l-3.5-2-3.5 2-3.5-2L5 21V4.5a1 1 0 0 1 1-1zM9 8.5h6M9 12.5h6',
  sales: 'M4 20h16M7 16.5v-5M12 16.5V7M17 16.5v-8',
  calendar: 'M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1zM4 10h16M8.5 3.5v4M15.5 3.5v4',
  units: 'M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  pricing: 'M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.4 7.4a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.4-7.4a1 1 0 0 1-.3-.7zM8.5 8.5h.01',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM9 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  logout: 'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10',
} as const;

function Icon({ name, className = '' }: { name: keyof typeof ICON; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`h-[18px] w-[18px] flex-none ${className}`} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON[name]} />
    </svg>
  );
}

/** nav 등장 순서(첫 진입 한 번 — 틀은 화면을 옮겨도 그대로라 다시 돌지 않는다) */
const navIn = (i: number) => ({ className: 'block-in', style: { '--bi-delay': `${0.06 + i * 0.045}s`, '--bi-blur': '6px', '--bi-y': '10px' } as CSSProperties });

const SLIDE = { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 } as const;

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}

function useLogout() {
  const router = useRouter();
  return async () => {
    await createClient().auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };
}

/** 로고 — 홈 nav 와 같은 눈송이(얼음 파랑) + 이름 */
function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span aria-hidden className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-glacier">
        <Snowflake size={19} className="text-white" />
      </span>
      <span className="leading-tight">
        {!small && <span className="block font-display text-[11px] font-medium tracking-[0.03em] text-ice-600">Snowy Cabana &amp; Caravan</span>}
        <span className="block font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">Admin</span>
      </span>
    </Link>
  );
}

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const logout = useLogout();
  // 폰 가로 메뉴: 지금 화면 메뉴가 보이도록 가운데로
  const mobileNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = mobileNav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const nav = mobileNav.current;
    if (el && nav) nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
  }, [pathname]);
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[248px_1fr]">
      {/* 데스크톱 왼쪽 메뉴 */}
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-line bg-white/45 px-3 pb-4 pt-6 lg:flex">
        <div {...navIn(0)}>
          <div className="px-2.5">
            <Brand />
          </div>
        </div>
        <nav className="-mx-3 mt-6 flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-1 [scrollbar-width:none]">
          {NAV_GROUPS.map((g, gi) => (
            <div key={g.label}>
              <p style={navIn(GROUP_START[gi]).style} className="block-in mb-1.5 px-3.5 text-[11.5px] font-semibold tracking-[0.02em] text-ink-3">{g.label}</p>
              <div className="flex flex-col gap-0.5">
                {g.items.map((n, j) => {
                  const active = isActive(pathname, n.href);
                  return (
                    <div key={n.href} {...navIn(GROUP_START[gi] + 1 + j)}>
                    <Link
                      href={n.href}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ice-400 ${
                        active ? 'text-glacier' : 'text-ink-2 hover:bg-white/70 hover:text-ink'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="admin-nav-active"
                          transition={SLIDE}
                          aria-hidden
                          className="absolute inset-0 rounded-xl bg-white shadow-[0_1px_2px_rgb(31_68_105/0.06),0_4px_14px_-6px_rgb(31_68_105/0.12)] ring-1 ring-line"
                        />
                      )}
                      <Icon name={n.icon} className={`relative transition-colors ${active ? 'text-ice-600' : 'text-ink-3 group-hover:text-ink-2'}`} />
                      <span className="relative">{n.label}</span>
                      {active && <span aria-hidden className="relative ml-auto h-1.5 w-1.5 rounded-full bg-ice-500" />}
                    </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        {/* 계정 */}
        <div style={navIn(ACCOUNT_ORDER).style} className={`block-in mt-4 flex items-center gap-3 rounded-2xl bg-white/70 p-2.5 ring-1 ring-line`}>
          <span aria-hidden className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ice-100 font-display text-[14px] font-semibold uppercase text-glacier">
            {email.charAt(0) || 'A'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] text-ink-3">관리자</span>
            <span className="block truncate text-[13px] font-medium text-ink">{email}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            aria-label="로그아웃"
            title="로그아웃"
            className="grid h-9 w-9 flex-none place-items-center rounded-xl text-ink-3 transition-[color,background-color,transform] hover:bg-ice-50 hover:text-ink active:scale-[0.94]"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {/* 폰 위 막대 */}
      <header className="sticky top-0 z-40 border-b border-line bg-ice-50/85 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div {...navIn(0)}>
            <Brand small />
          </div>
          <button
            type="button"
            onClick={logout}
            style={navIn(1).style}
            className="block-in flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-2 ring-1 ring-line transition-[color,transform] hover:text-ink active:scale-[0.96]"
          >
            <Icon name="logout" className="!h-4 !w-4" />
            로그아웃
          </button>
        </div>
        <nav
          ref={mobileNav}
          className="flex gap-1 overflow-x-auto px-3 pb-2.5 [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-24px),transparent)] [scrollbar-width:none]"
        >
          {ADMIN_NAV.map((n, i) => {
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                style={navIn(i + 1).style}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`block-in relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors ${active ? 'text-white' : 'text-ink-2'}`}
              >
                {active && <motion.span layoutId="admin-nav-active-m" transition={SLIDE} aria-hidden className="absolute inset-0 rounded-full bg-glacier" />}
                <Icon name={n.icon} className={`relative !h-4 !w-4 ${active ? 'text-ice-200' : 'text-ink-3'}`} />
                <span className="relative">{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-9 xl:px-10">
        {/* 화면 본문 BlockIn — 화면(주소)을 옮길 때마다 제목 → 패널 차례로 다시 등장 */}
        <div key={pathname} className="block-in-kids mx-auto max-w-[1180px]">
          {children}
        </div>
      </main>
      <DialogHost />
    </div>
  );
}

/** 화면 머리 — 영문 머리글(메뉴 기준 자동) + 제목 + 오른쪽 보조(버튼 등) */
export function AdminTitle({ title, sub, aside, kicker }: { title: string; sub?: ReactNode; aside?: ReactNode; kicker?: string }) {
  const pathname = usePathname();
  const k = kicker ?? [...ADMIN_NAV].reverse().find((n) => isActive(pathname, n.href))?.en;
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
      <div>
        {k && <p className="kicker mb-1.5">{k}</p>}
        <h1 className="text-[24px] font-bold tracking-[-0.025em] md:text-[30px]">{title}</h1>
        {sub && <p className="mt-1.5 text-[14px] text-ink-2">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}
