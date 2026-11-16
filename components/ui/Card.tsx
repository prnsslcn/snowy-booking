import type { HTMLAttributes } from 'react';

// 상태 접두사(hover: 등) 없이 직접 지정한 배경/테두리색이 있는지 — 있으면 기본값을 빼야 덮어써진다.
// (같은 속성의 Tailwind 클래스가 둘이면 class 순서가 아니라 CSS 생성 순서로 승패가 갈려 기본값이 이길 수 있음)
const hasOwn = (className: string, re: RegExp) =>
  className.split(/\s+/).some((t) => !t.includes(':') && re.test(t));

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  const bg = hasOwn(className, /^bg-/) ? '' : 'bg-surface';
  const border = hasOwn(className, /^border-(?!0$|2$|4$|8$|[xytrbl]-?|solid|dashed|dotted|none)/)
    ? ''
    : 'border-line';
  return (
    <div
      className={`rounded-2xl border ${border} ${bg} shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
      {...props}
    />
  );
}
