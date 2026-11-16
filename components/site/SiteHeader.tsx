import Link from 'next/link';

import { Logo } from '@/components/site/Logo';
import { ButtonLink } from '@/components/ui/Button';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="스노위랜드 홈">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/#spaces" className="hidden rounded-[10px] px-3 py-2 text-[14px] font-medium text-muted hover:text-ink sm:block">
            공간 소개
          </Link>
          <Link href="/booking/lookup" className="rounded-[10px] px-3 py-2 text-[14px] font-medium text-muted hover:text-ink">
            예약 조회
          </Link>
          <ButtonLink href="/booking" size="sm" className="ml-1">
            예약하기
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
