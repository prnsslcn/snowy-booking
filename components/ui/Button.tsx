import type { ButtonHTMLAttributes } from 'react';

/**
 * 버튼(홈과 같은 언어: 알약 모양, 600, 누르면 0.97).
 * 색·크기는 className 으로 덮어쓰지 말고 variant/size 를 추가(Tailwind v4 는 같은 속성 클래스 승패가 CSS 생성 순서).
 * 링크 버튼은 <TLink className={buttonClass(...)}> 로.
 */
type Variant = 'primary' | 'secondary' | 'onDark' | 'onDarkSecondary' | 'danger' | 'dangerOnDark';
type Size = 'sm' | 'md' | 'block';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none transition-[transform,background-color,border-color,color,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current';

const variants: Record<Variant, string> = {
  primary: 'bg-glacier text-white hover:bg-glacier-deep',
  secondary: 'border border-black/15 bg-transparent text-ink hover:border-black/40',
  onDark: 'bg-white text-glacier-deep hover:bg-ice-100',
  onDarkSecondary: 'border border-white/20 bg-transparent text-white hover:border-white/50',
  danger: 'border border-[#d4351c]/40 bg-transparent text-[#d4351c] hover:border-[#d4351c]',
  dangerOnDark: 'border border-[#ff8a75]/40 bg-transparent text-[#ff8a75] hover:border-[#ff8a75]',
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-5 text-[14px]',
  md: 'h-12 px-7 text-[16px]',
  block: 'h-14 w-full px-7 text-[16px]',
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
