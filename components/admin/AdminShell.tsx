'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

import { DialogHost } from '@/components/ui/Dialog';
import { createClient } from '@/lib/supabase/client';
import { Snowflake } from '@/components/ui/Snowflake';

/*
  관리자 틀 — 데스크톱: 왼쪽 고정 메뉴 / 폰: 위 막대 + 가로로 밀리는 메뉴.
  메뉴는 만들어진 화면만 둔다(단계마다 추가).
*/
export const ADMIN_NAV = [
  { href: '/admin', label: '대시보드', en: 'Dashboard' },
  { href: '/admin/board', label: '현장 배정', en: 'On-site' },
  { href: '/admin/bookings', label: '예약 관리', en: 'Bookings' },
  { href: '/admin/sales', label: '매출', en: 'Sales' },
  { href: '/admin/calendar', label: '운영 달력', en: 'Calendar' },
  { href: '/admin/units', label: '유닛·점검', en: 'Units' },
  { href: '/admin/pricing', label: '요금', en: 'Pricing' },
  { href: '/admin/settings', label: '운영 설정', en: 'Settings' },
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
      className={`text-[13px] font-medium text-ink-2 transition-colors hover:text-ink ${className}`}
    >
      로그아웃
    </button>
  );
}

/** 로고 — 홈 nav 와 같은 눈송이(얼음 파랑) + 이름 */
function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span aria-hidden className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white ring-1 ring-line">
        <Snowflake size={20} className="text-ice-600" />
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
  // 폰 가로 메뉴: 지금 화면 메뉴가 보이도록 가운데로
  const mobileNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = mobileNav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const nav = mobileNav.current;
    if (el && nav) nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.clientWidth) / 2 });
  }, [pathname]);
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[240px_1fr]">
      {/* 데스크톱 왼쪽 메뉴(얼음 바탕 — 손님 화면 nav 처럼 가볍게) */}
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-line px-3 py-6 lg:flex">
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
                className={`relative rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition-colors ${
                  active ? 'bg-white text-glacier shadow-[0_1px_2px_rgb(31_68_105/0.06)] ring-1 ring-line' : 'text-ink-2 hover:bg-white/60 hover:text-ink'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line px-3 pt-4">
          <p className="truncate text-[12px] text-ink-3">{email}</p>
          <LogoutButton className="mt-1.5" />
        </div>
      </aside>

      {/* 폰 위 막대 */}
      <header className="sticky top-0 z-40 border-b border-line bg-ice-50/85 backdrop-blur-md lg:hidden">
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
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors ${active ? 'bg-glacier text-white' : 'text-ink-2'}`}
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
