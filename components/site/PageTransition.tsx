'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { SCROLL_OPTS, useLenis } from '@/components/site/SmoothScroll';

/*
  aftc PageTransition 이식(fruitful.com 시퀀스, expo.inOut 1.2s, Barba 패턴).
  - 첫 진입(enter): 블라인드가 아래쪽 둥근 모서리로 걷히며 콘텐츠가 10vh 위로 올라온다
  - 사이트 안 이동(leaveTo): 블라인드가 위쪽 둥근 모서리로 차오름(leave) → router.push →
    새 화면이 그려지면 맨 위로 → enter. 주소에 #앵커가 있으면 enter 뒤 그 자리로 스크롤.
  - ready: 블라인드가 완전히 걷힘. 첫 화면 안 등장 애니메이션은 이 값으로 게이트한다.
*/
const D = 1.2;
const EASE: [number, number, number, number] = [0.87, 0, 0.13, 1];

interface Ctx {
  ready: boolean;
  leaveTo: (href: string) => void;
}

const TransitionContext = createContext<Ctx>({ ready: true, leaveTo: () => {} });

export function usePageTransition() {
  return useContext(TransitionContext);
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const frames2 = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export function PageTransition({ navbar, children }: { navbar?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const [active, setActive] = useState(true);
  const [initial, setInitial] = useState(true);
  const busy = useRef(false);
  const content = useAnimationControls();
  const overlay = useAnimationControls();
  const blind = useAnimationControls();

  // router.push 뒤 새 화면(children)이 커밋될 때까지 기다리기
  const waiter = useRef<(() => void) | null>(null);
  useEffect(() => {
    waiter.current?.();
    waiter.current = null;
  }, [children, pathname]);

  const scrollToHash = useCallback(
    (hash: string) => {
      const el = hash.length > 1 ? document.querySelector<HTMLElement>(hash) : null;
      if (el) lenis?.scrollTo(el, SCROLL_OPTS);
    },
    [lenis],
  );

  const enter = useCallback(async () => {
    await Promise.all([
      content.start({ y: 0, transition: { duration: D, ease: EASE } }),
      overlay.start({ opacity: 0, transition: { duration: D, ease: EASE } }),
      blind.start({ scaleY: 0, borderRadius: '0px 0px 100vw 100vw', transition: { duration: D, ease: EASE } }),
    ]);
    setActive(false);
  }, [content, overlay, blind]);

  // 첫 진입
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await frames2();
      if (cancelled) return;
      await enter();
      if (cancelled) return;
      setInitial(false);
      if (window.location.hash) {
        const el = document.querySelector<HTMLElement>(window.location.hash);
        if (el) lenisRef.current?.scrollTo(el, SCROLL_OPTS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enter]);

  // 다른 사이트(결제창 등)에서 뒤로 가기로 돌아오면(bfcache) 덮인 상태가 남을 수 있어 새로 그린다
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  async function leaveTo(href: string) {
    const url = new URL(href, window.location.href);
    // 같은 화면 안 앵커는 스크롤만
    if (url.pathname === window.location.pathname && url.hash) {
      scrollToHash(url.hash);
      return;
    }
    if (busy.current) return;
    busy.current = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduce) {
      setActive(true);
      await frames2();
      blind.set({ scaleY: 0, borderRadius: '100vw 100vw 0px 0px', originY: 1 });
      overlay.set({ opacity: 0 });
      content.set({ y: 0 });
      await frame();
      await Promise.all([
        content.start({ y: '-10svh', transition: { duration: D, ease: EASE } }),
        overlay.start({ opacity: 1, transition: { duration: D, ease: EASE } }),
        blind.start({ scaleY: 1, borderRadius: '0vw 0vw 0px 0px', transition: { duration: D, ease: EASE } }),
      ]);
    }

    const changed = new Promise<void>((r) => (waiter.current = r));
    router.push(url.pathname + url.search);
    await Promise.race([changed, new Promise<void>((r) => setTimeout(r, 1500))]);
    await frame();
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);

    if (!reduce) {
      content.set({ y: '10vh' });
      blind.set({ originY: 0, borderRadius: '0px 0px 0vw 0vw' });
      await frame();
      await enter();
    }
    busy.current = false;
    if (url.hash) scrollToHash(url.hash);
  }

  return (
    <TransitionContext.Provider value={{ ready: !active, leaveTo: (href) => void leaveTo(href) }}>
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
