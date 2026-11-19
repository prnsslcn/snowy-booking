/**
 * 알약 배지(aftc 공지 Pinned 배지 모양: 옅은 면 + 같은 계열 글자).
 * manual = 계좌 직접 환불(보라).
 */
type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'manual';
type Surface = 'light' | 'dark';

const tones: Record<Surface, Record<Tone, string>> = {
  light: {
    neutral: 'bg-black/[.06] text-[#0a0a0a]/65',
    success: 'bg-emerald-600/10 text-emerald-700',
    warning: 'bg-amber-500/15 text-amber-700',
    error: 'bg-red-600/10 text-red-700',
    info: 'bg-sky-600/10 text-sky-700',
    manual: 'bg-violet-600/10 text-violet-700',
  },
  dark: {
    neutral: 'bg-white/[.08] text-white/60',
    success: 'bg-emerald-500/15 text-emerald-300',
    warning: 'bg-amber-400/15 text-amber-300',
    error: 'bg-red-500/15 text-red-300',
    info: 'bg-sky-400/15 text-sky-300',
    manual: 'bg-violet-400/15 text-violet-300',
  },
};

export function Badge({ tone = 'neutral', surface = 'light', children }: { tone?: Tone; surface?: Surface; children: React.ReactNode }) {
  return (
    <span className={`inline-flex flex-none items-center rounded-full px-2.5 py-1 text-[12px] font-medium leading-none ${tones[surface][tone]}`}>
      {children}
    </span>
  );
}
