'use client';

import Lenis from 'lenis';
import { createContext, useContext, useEffect, useState } from 'react';

const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

/** Lenis 부드러운 스크롤(aftc 동일 설정). 관리자 화면에는 쓰지 않는다(CLAUDE.md §8). */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const instance = new Lenis({
      duration: 1.0,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      gestureOrientation: 'vertical',
    });
    const publish = requestAnimationFrame(() => setLenis(instance));
    let raf = 0;
    const loop = (time: number) => {
      instance.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(publish);
      cancelAnimationFrame(raf);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

/** 앵커 스크롤 공용 옵션 — easeInOutCubic 2s */
export const SCROLL_OPTS = {
  duration: 2,
  easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
