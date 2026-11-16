import type { HTMLAttributes } from 'react';

// Tailwind v4: 같은 속성 클래스가 둘이면 CSS 생성 순서로 승패 → 직접 지정한 bg/border 가 있으면 기본값을 뺀다(CLAUDE.md §13).
const hasOwn = (className: string, re: RegExp) =>
  className.split(/\s+/).some((t) => !t.includes(':') && re.test(t));

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  const bg = hasOwn(className, /^bg-/) ? '' : 'bg-surface';
  const border = hasOwn(className, /^border-(?!0$|2$|4$|8$|[xytrbl]-?|solid|dashed|dotted|none)/)
    ? ''
    : 'border-line-soft';
  return <div className={`rounded-[22px] border ${border} ${bg} ${className}`} {...props} />;
}
