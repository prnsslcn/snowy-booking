import Link from 'next/link';

import { ButtonLink } from '@/components/ui/Button';

/** 상단 메뉴(nav-split): 흰 바탕 64px, 비치거나 흐린 효과 없음. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
      <div className="wrap flex h-16 items-center justify-between">
        <Link href="/" className="text-[18px] font-bold text-ink">
          스노위랜드
        </Link>
        <nav className="flex items-center gap-1 text-[14px] font-normal tracking-[0.3px] text-ink md:gap-2">
          <Link href="/#visit" className="hidden px-3 py-3 md:block">
            <span className="draw">이용 안내</span>
          </Link>
          <Link href="/#spaces" className="hidden px-3 py-3 md:block">
            <span className="draw">공간</span>
          </Link>
          <Link href="/booking/lookup" className="px-3 py-3">
            <span className="draw">예약 조회</span>
          </Link>
          <ButtonLink href="/booking" size="sm" className="ml-1">
            예약하기
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
