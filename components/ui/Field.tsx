import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

/** 입력칸(DESIGN text-input): 흰 바탕, 1px 선, 높이 48, 모서리 0, 포커스 시 선이 ink 로. */
const fieldClass =
  'h-12 w-full rounded-none border border-hairline-strong bg-canvas px-4 text-[16px] font-light text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-soft focus:border-ink focus:shadow-[inset_0_0_0_1px_var(--color-ink)] aria-[invalid=true]:border-error';

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
      <span className="mb-2 block text-[14px] font-bold text-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[14px] text-error">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[14px] text-muted">{hint}</span>
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
      <svg aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" viewBox="0 0 16 16" fill="none">
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
