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
      className={`text-[13px] font-medium text-ink/55 transition-colors hover:text-ink ${className}`}
    >
      로그아웃
    </button>
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
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[232px_1fr]">
      {/* 데스크톱 왼쪽 메뉴 */}
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-ice-700/10 bg-white px-4 py-6 lg:flex">
        <Link href="/admin" className="px-3">
          <p className="font-display text-[12px] font-semibold tracking-[0.04em] text-ice-600">Snowy Cabana &amp; Caravan</p>
          <p className="mt-1 text-[17px] font-bold">운영 콘솔</p>
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {ADMIN_NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                  active ? 'bg-ice-100 text-glacier' : 'text-ink/65 hover:bg-ice-50 hover:text-ink'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-ice-700/10 px-3 pt-4">
          <p className="truncate text-[12px] text-ink/45">{email}</p>
          <LogoutButton className="mt-1" />
        </div>
      </aside>

      {/* 폰 위 막대 */}
      <header className="sticky top-0 z-40 border-b border-ice-700/10 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin" className="text-[16px] font-bold">
            운영 콘솔
          </Link>
          <LogoutButton />
        </div>
        <nav ref={mobileNav} className="-mb-px flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
          {ADMIN_NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-medium ${active ? 'bg-glacier text-white' : 'text-ink/65'}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-10">{children}</main>
    </div>
  );
}

/** 화면 머리 — 제목 + 오른쪽 보조(버튼 등) */
export function AdminTitle({ title, sub, aside }: { title: string; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em] md:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-ink/55">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}
