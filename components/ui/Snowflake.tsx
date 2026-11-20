/** 브랜드 눈송이 — 6갈래 눈 결정(가지 하나를 60°씩 돌려 그림). 손님 nav·관리자 로고 공용. */
export function Snowflake({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="-16 -16 32 32" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden className={className}>
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
