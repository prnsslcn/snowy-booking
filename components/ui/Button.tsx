import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';

// 색을 className 으로 덮어쓰지 말고 variant 를 추가할 것(Tailwind v4 는 같은 속성 클래스의 승패가 CSS 생성 순서)
type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const base =
  'pressable inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap select-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'bg-accent-soft text-accent hover:bg-[#dde9fd]',
  ghost: 'bg-transparent text-muted hover:bg-line-soft',
  dark: 'bg-ink text-white hover:bg-ink-2',
  outline: 'border border-line bg-surface text-ink hover:bg-line-soft',
  danger: 'border border-line bg-surface text-danger hover:bg-danger-soft',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 rounded-[10px] px-3.5 text-sm',
  md: 'h-12 rounded-[14px] px-5 text-[15px]',
  lg: 'h-14 w-full rounded-[16px] px-6 text-[17px]', // 전체 폭(폼·하단 CTA)
  xl: 'h-14 rounded-[16px] px-7 text-[17px]', // 큰 인라인(히어로 CTA)
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
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
