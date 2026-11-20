'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

import { createClient } from '@/lib/supabase/client';

/*
  관리자 틀 — 데스크톱: 왼쪽 고정 메뉴 / 폰: 위 막대 + 가로로 밀리는 메뉴.
  메뉴는 만들어진 화면만 둔다(단계마다 추가).
*/
export const ADMIN_NAV = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/board', label: '현장 배정' },
  { href: '/admin/bookings', label: '예약 관리' },
  { href: '/admin/sales', label: '매출' },
  { href: '/admin/calendar', label: '운영 달력' },
  { href: '/admin/units', label: '유닛·점검' },
  { href: '/admin/pricing', label: '요금' },
  { href: '/admin/settings', label: '운영 설정' },
] as const;

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}

function LogoutButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace('/admin/login');
        router.refresh();
      }}
      className={`text-[13px] font-medium text-ice-50/60 transition-colors hover:text-ice-50 ${className}`}
    >
      로그아웃
    </button>
  );
}

/** 밤색 틀 위 로고 — 눈송이 + 이름 */
function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span aria-hidden className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-ice-50/[.08]">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-ice-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
        </svg>
      </span>
      <span className="leading-tight">
        {!small && <span className="block font-display text-[11px] font-medium tracking-[0.04em] text-ice-50/50">Snowy Cabana &amp; Caravan</span>}
        <span className="block text-[15px] font-semibold text-ice-50">운영 콘솔</span>
      </span>
    </Link>
  );
}

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  // 폰 가로 메뉴: 지금 화면 메뉴가 보이도록 가운데로
  const mobileNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = mobileNav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const nav = mobileNav.current;
    if (el && nav) nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.clientWidth) / 2 });
  }, [pathname]);
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[240px_1fr]">
      {/* 데스크톱 왼쪽 메뉴(밤색) */}
      <aside className="sticky top-0 hidden h-[100dvh] flex-col bg-night px-3 py-5 lg:flex">
        <div className="px-2.5">
          <Brand />
        </div>
        <nav className="mt-8 flex flex-col gap-0.5">
          {ADMIN_NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`relative rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  active ? 'bg-ice-50/[.09] text-ice-50' : 'text-ice-50/55 hover:bg-ice-50/[.05] hover:text-ice-50/90'
                }`}
              >
                {active && <span aria-hidden className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-full bg-ice-300" />}
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-ice-50/10 px-3 pt-4">
          <p className="truncate text-[12px] text-ice-50/40">{email}</p>
          <LogoutButton className="mt-1.5" />
        </div>
      </aside>

      {/* 폰 위 막대(밤색) */}
      <header className="sticky top-0 z-40 bg-night lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Brand small />
          <LogoutButton />
        </div>
        <nav ref={mobileNav} className="flex gap-1 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none]">
          {ADMIN_NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors ${active ? 'bg-ice-50 text-night' : 'text-ice-50/60'}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-9 xl:px-10">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}

/** 화면 머리 — 제목 + 오른쪽 보조(버튼 등) */
export function AdminTitle({ title, sub, aside }: { title: string; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]">{title}</h1>
        {sub && <p className="mt-1.5 text-[14px] text-ink-2">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}
