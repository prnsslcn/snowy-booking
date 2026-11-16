type Tone = 'neutral' | 'primary' | 'success' | 'error' | 'warning' | 'manual' | 'dark';

const tones: Record<Tone, string> = {
  neutral: 'border-hairline-strong text-muted',
  primary: 'border-primary text-primary',
  success: 'border-success text-success',
  error: 'border-error text-error',
  warning: 'border-warning text-warning',
  manual: 'border-manual text-manual', // 계좌 직접 환불
  dark: 'border-ink bg-ink text-white',
};

/** 직각 테두리 배지(caption 12px / 400 / 0.5px). */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center border px-2 py-1 text-[12px] font-normal leading-none tracking-[0.5px] ${tones[tone]}`}>
      {children}
    </span>
  );
}
