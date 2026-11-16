import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

/** 토스식 입력: 회색 바탕 + 포커스 시 흰 바탕·파란 테두리. */
const fieldClass =
  'h-14 w-full rounded-[14px] border border-transparent bg-field px-4 text-[16px] text-ink outline-none transition-[background-color,border-color] duration-150 placeholder:text-subtle focus:border-accent focus:bg-surface aria-[invalid=true]:border-danger';

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-ink-2">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[13px] text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[13px] text-subtle">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${fieldClass} appearance-none pr-10 ${className}`} {...props}>
        {children}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
