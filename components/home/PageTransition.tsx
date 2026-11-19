'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/*
  aftc PageTransition 이식(fruitful.com 시퀀스, expo.inOut 1.2s).
  - 첫 진입: 블라인드가 아래쪽 둥근 모서리로 걷히며 콘텐츠가 10vh 위로 올라옴(enter)
  - 다른 화면으로 이동: 블라인드가 위쪽 둥근 모서리로 차오른 뒤(leave) 전체 로드.
    예약·시설 화면은 최상위 레이아웃이 달라 SPA 전환이 불가 → leave 후 location.assign.
*/
const D = 1.2;
const EASE: [number, number, number, number] = [0.87, 0, 0.13, 1];

interface Ctx {
  /** 블라인드가 완전히 걷힘 — 첫 화면 안 등장 애니메이션 게이트 */
  ready: boolean;
  leaveTo: (href: string) => void;
}

const TransitionContext = createContext<Ctx>({ ready: true, leaveTo: (href) => window.location.assign(href) });

export function usePageTransition() {
  return useContext(TransitionContext);
}

export function PageTransition({ navbar, children }: { navbar?: ReactNode; children: ReactNode }) {
  const [active, setActive] = useState(true);
  const [initial, setInitial] = useState(true);
  const busy = useRef(false);
  const content = useAnimationControls();
  const overlay = useAnimationControls();
  const blind = useAnimationControls();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (cancelled) return;
      await Promise.all([
        content.start({ y: 0, transition: { duration: D, ease: EASE } }),
        overlay.start({ opacity: 0, transition: { duration: D, ease: EASE } }),
        blind.start({ scaleY: 0, borderRadius: '0px 0px 100vw 100vw', transition: { duration: D, ease: EASE } }),
      ]);
      if (cancelled) return;
      setActive(false);
      setInitial(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [content, overlay, blind]);

  // 뒤로 가기(bfcache)로 돌아오면 leave 끝 상태(블라인드 덮임)가 남아 있으므로 새로 그린다
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  async function leave(href: string) {
    if (busy.current) return;
    busy.current = true;
    setActive(true);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    blind.set({ scaleY: 0, borderRadius: '100vw 100vw 0px 0px', originY: 1 });
    overlay.set({ opacity: 0 });
    content.set({ y: 0 });
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await Promise.all([
      content.start({ y: '-10svh', transition: { duration: D, ease: EASE } }),
      overlay.start({ opacity: 1, transition: { duration: D, ease: EASE } }),
      blind.start({ scaleY: 1, borderRadius: '0vw 0vw 0px 0px', transition: { duration: D, ease: EASE } }),
    ]);
    window.location.assign(href);
  }

  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <TransitionContext.Provider
      value={{ ready: !active, leaveTo: (href) => (reduce ? window.location.assign(href) : void leave(href)) }}
    >
      {navbar}
      <motion.div animate={content} initial={{ y: initial ? '10vh' : 0 }} className="flex flex-1 flex-col">
        {children}
      </motion.div>
      {active && (
        <div className="pointer-events-none fixed inset-0 z-[1000]">
          <motion.div
            animate={overlay}
            initial={{ opacity: initial ? 1 : 0 }}
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
          />
          <motion.div
            animate={blind}
            initial={
              initial
                ? { scaleY: 1, borderRadius: '0px 0px 0vw 0vw', originY: 0 }
                : { scaleY: 0, borderRadius: '100vw 100vw 0px 0px', originY: 1 }
            }
            className="absolute inset-0 bg-[#fafaf8]"
          />
        </div>
      )}
    </TransitionContext.Provider>
  );
}
