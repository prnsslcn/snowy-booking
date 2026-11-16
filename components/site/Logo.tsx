/** 워드마크 — 단순한 눈 결정 + 이름. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] text-accent" fill="none" aria-hidden>
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5" />
          <path d="M9.5 4.2 12 6l2.5-1.8M9.5 19.8 12 18l2.5 1.8M4.6 10.6l2.8-.6-.9-2.9M19.4 13.4l-2.8.6.9 2.9M4.6 13.4l2.8.6-.9 2.9M19.4 10.6l-2.8-.6.9-2.9" />
        </g>
      </svg>
      <span className="text-[17px] font-bold tracking-[-0.02em] text-ink">스노위랜드</span>
    </span>
  );
}
