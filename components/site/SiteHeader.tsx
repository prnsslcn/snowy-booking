/* eslint-disable @next/next/no-html-link-for-pages -- 홈은 다른 최상위 레이아웃(키트)이라 전체 로드 */
/**
 * 예약 화면용 헤더 — 홈(taste 키트 nav-split)과 같은 모양: 왼쪽 단어, 가운데 마크+이름, 오른쪽 주요 버튼.
 * 홈은 다른 최상위 레이아웃이라 일반 <a>(전체 로드).
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
      <div className="wrap grid h-14 grid-cols-[1fr_auto_1fr] items-center md:h-[72px]">
        <nav aria-label="주 메뉴" className="flex items-center gap-1 text-[15px] font-medium text-ink">
          <a href="/#visit" className="hidden px-2 py-3 md:block">
            <span className="draw">안내</span>
          </a>
          <a href="/#rooms" className="hidden px-2 py-3 md:block">
            <span className="draw">요금</span>
          </a>
          <a href="/booking/lookup" className="px-2 py-3">
            <span className="draw">조회</span>
          </a>
        </nav>
        <a href="/" className="flex items-center gap-2 font-display text-[20px] text-ink md:text-[24px]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path fill="currentColor" fillRule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 5.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
          </svg>
          스노위랜드
        </a>
        <div className="flex justify-end">
          <a
            href="/booking"
            className="pressable hidden h-11 items-center rounded-[2px] bg-primary px-5 text-[15px] font-medium text-canvas hover:bg-primary-active md:inline-flex"
          >
            자리 예약하기
          </a>
        </div>
      </div>
    </header>
  );
}
