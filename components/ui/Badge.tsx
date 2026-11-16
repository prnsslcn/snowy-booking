type Tone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning' | 'manual';

const tones: Record<Tone, string> = {
  neutral: 'bg-line-soft text-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  manual: 'bg-manual-soft text-manual', // 계좌 직접 환불
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none ${tones[tone]}`}>
      {children}
    </span>
  );
}
