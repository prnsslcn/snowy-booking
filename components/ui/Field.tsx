import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

/**
 * 입력칸 — 라이트(예약)·다크(조회) 두 톤. 높이 56, 모서리 14, 포커스 시 선이 진해짐.
 */
type Tone = 'light' | 'dark';

/** 크기 — md: 손님 화면(높이 56) / sm: 관리자 필터 등(높이 44, 폰은 16px 유지해 iOS 확대 방지) */
type FieldSize = 'md' | 'sm';
const fieldSize: Record<FieldSize, string> = {
  md: 'h-14 rounded-[14px] px-4 text-[16px]',
  sm: 'h-11 rounded-xl px-3.5 text-[16px] md:text-[14px]',
};

const fieldBase =
  'w-full border outline-none transition-[border-color,background-color,box-shadow] duration-200';
const fieldTone: Record<Tone, string> = {
  light:
    'border-black/[.12] bg-white text-ink placeholder:text-black/30 focus:border-ice-600 focus:ring-4 focus:ring-ice-200/50 aria-[invalid=true]:border-[#d4351c]',
  dark: 'border-white/[.12] bg-white/[.04] text-white placeholder:text-white/30 focus:border-white/60 focus:bg-white/[.06] aria-[invalid=true]:border-[#ff8a75]',
};

export function fieldClass(tone: Tone = 'light', className = '', size: FieldSize = 'md') {
  return `${fieldBase} ${fieldSize[size]} ${fieldTone[tone]} ${className}`;
}

export function Field({
  label,
  error,
  hint,
  tone = 'light',
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  tone?: Tone;
  children: ReactNode;
}) {
  const dark = tone === 'dark';
  return (
    <label className="block">
      <span className={`mb-2 block text-[14px] font-medium ${dark ? 'text-white/70' : 'text-ink/70'}`}>{label}</span>
      {children}
      {error ? (
        <span className={`mt-1.5 block text-[13px] ${dark ? 'text-[#ff8a75]' : 'text-[#d4351c]'}`}>{error}</span>
      ) : hint ? (
        <span className={`mt-1.5 block text-[13px] ${dark ? 'text-white/45' : 'text-ink/50'}`}>{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ tone = 'light', className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { tone?: Tone }) {
  return <input className={fieldClass(tone, className)} {...props} />;
}

export function Select({
  tone = 'light',
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { tone?: Tone }) {
  return (
    <div className="relative">
      <select className={fieldClass(tone, `appearance-none pr-11 ${className}`)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden
        className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 ${tone === 'dark' ? 'text-white' : 'text-ink'}`}
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
