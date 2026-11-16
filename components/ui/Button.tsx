import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';

/**
 * 버튼(taste 키트 place: 모서리 2px, 16px/500, 높이 48, 좌우 24).
 * 색·크기는 className 으로 덮어쓰지 말고 variant/size 를 추가(Tailwind v4 는 같은 속성 클래스 승패가 CSS 생성 순서).
 */
type Variant = 'primary' | 'secondary' | 'onDark' | 'danger' | 'text';
type Size = 'sm' | 'md' | 'block';

const base =
  'pressable inline-flex items-center justify-center gap-2 rounded-[2px] text-[16px] font-medium whitespace-nowrap select-none disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-canvas hover:bg-primary-active disabled:bg-primary-disabled',
  secondary: 'border border-hairline-strong bg-canvas text-ink hover:border-ink',
  onDark: 'border border-white bg-transparent text-white hover:bg-white hover:text-dark',
  danger: 'border border-hairline-strong bg-canvas text-error hover:border-error',
  text: 'h-auto px-0 bg-transparent text-ink',
};

const sizes: Record<Size, string> = {
  sm: 'h-11 px-5',
  md: 'h-12 px-6',
  block: 'h-12 w-full px-6',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className = '') {
  return `${base} ${variants[variant]} ${variant === 'text' ? '' : sizes[size]} ${className}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/** "자세히 보기 ›" 형식의 글자 링크(라벨 + 밑줄 그려짐) */
export function ArrowLink({ className = '', children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link className={`label inline-flex items-center gap-1.5 py-3 text-ink ${className}`} {...props}>
      <span className="draw">{children}</span>
      <span aria-hidden>›</span>
    </Link>
  );
}
