import Link from 'next/link';

import { SITE_NAME } from '@/lib/site-config';

// 임시 헤더 — 디자인 확정(시설 자료 수령) 후 교체.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-[15px] font-bold text-ink">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/booking/lookup" className="rounded-lg px-3 py-2 text-muted hover:bg-line-soft">
            예약 조회
          </Link>
          <Link href="/booking" className="rounded-lg bg-accent px-3 py-2 font-semibold text-white hover:bg-accent-strong">
            예약하기
          </Link>
        </nav>
      </div>
    </header>
  );
}
