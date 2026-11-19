/*
  블록 등장 — aftc(terafab heroLineIn) 방식: blur 해제 + 상승 + fade.
  헤드라인 blur 11px / y 18%, 본문 8px / 14% 가 기준값.
*/
export const BLOCK_EASE = [0.22, 1, 0.36, 1] as const;

export const blockIn = (blur: number, y: string, duration: number, delay: number, inView: boolean) => ({
  initial: { opacity: 0, filter: `blur(${blur}px)`, y },
  animate: inView ? { opacity: 1, filter: 'blur(0px)', y: '0%' } : undefined,
  transition: { duration, ease: BLOCK_EASE, delay },
});

export const WILL = { willChange: 'opacity, filter, transform' } as const;
