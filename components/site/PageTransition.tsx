'use client';

import { animate, motion, useAnimationControls, useMotionValue, useTransform } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { SCROLL_OPTS, useLenis } from '@/components/site/SmoothScroll';
import { byPosition, collectPieces, inView } from '@/components/site/swapPieces';

/*
  화면 전환.
  - 첫 진입(enter): aftc 블라인드(fruitful.com 시퀀스, expo.inOut 1.2s) — 블라인드가 아래 둥근 모서리로 걷히며
    콘텐츠가 10vh 위로 올라온다. ready 는 블라인드가 완전히 걷힌 뒤 true.
  - 사이트 안 이동(leaveTo): 홈의 "덮는 장"과 같은 모션 — 다음 화면이 종이 한 장에 실려 아래에서 올라와
    지금 화면을 덮는다. 위 모서리 48px 는 마지막 15% 에서 펴진다(useStickyCover 와 같은 규칙).
    지금 화면은 DOM 복제본으로 그 자리(스크롤 위치·sticky 상태 그대로)에 남겨 두고, 덮이는 동안 살짝 어두워진다.
    복제본은 스크롤 위치를 가진 별도 스크롤 상자 안에 넣어 sticky 장도 보던 모습 그대로 보인다.
  - 새 화면의 등장 애니메이션(blockIn 등, ready 게이트)은 종이가 절반 넘게 올라왔을 때 시작한다
    (ENTER_AT) — 종이에 실린 채 글이 흐림이 풀리며 떠오르도록.
  - 주소에 #앵커가 있으면 종이가 다 올라온 뒤 그 자리로 스크롤.
*/
const D = 1.2;
const EASE: [number, number, number, number] = [0.87, 0, 0.13, 1];
const SHEET_D = 1.1;
const SHEET_EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];
const RADIUS = 48;
/** 언어 바꾸기: 사라짐 · 한 조각 등장 · 조각 사이 간격(최대) · 전체 순차 등장 최대 길이 (ms) — site.css [data-swap] 와 맞춤 */
const OUT_MS = 300;
const IN_MS = 700;
const STEP_MS = 60;
const MAX_STAGGER_MS = 700;
/** 종이 진행도가 이 값을 넘으면 새 화면 등장 애니메이션 시작 */
const ENTER_AT = 0.55;

interface Ctx {
  ready: boolean;
  leaveTo: (href: string) => void;
  /** 글자만 흐려졌다가 run(언어 바꾸기) 뒤 새 글자로 또렷해진다 — 바탕·카드·사진·배치는 그대로 */
  replay: (run: () => void | Promise<void>) => void;
}

const TransitionContext = createContext<Ctx>({ ready: true, leaveTo: () => {}, replay: (run) => void run() });

export function usePageTransition() {
  return useContext(TransitionContext);
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const frames2 = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** 지금 화면을 그대로 얼려 둔 복제본(스크롤 위치·sticky 유지). 반환값으로 제거. */
function freeze(el: HTMLElement): () => void {
  const y = window.scrollY;
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  holder.inert = true;
  Object.assign(holder.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '5',
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    background: '#f0f5fa',
    pointerEvents: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  // 복제본의 id 는 앵커·라벨과 겹치지 않게 제거
  clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  holder.append(clone);
  // body 맨 앞에 둔다 — nav 색 판단은 DOM 순서상 뒤의 요소가 이기므로, 종이(새 화면)가 nav 줄을 덮으면 새 화면 색이 된다
  document.body.prepend(holder);
  holder.scrollTop = y;
  return () => holder.remove();
}

export function PageTransition({ navbar, children }: { navbar?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const [active, setActive] = useState(true);
  const [initial, setInitial] = useState(true);
  const [sheeting, setSheeting] = useState(false);
  // 종이 전환 중 새 화면 등장 애니메이션 대기
  const [entering, setEntering] = useState(false);
  const busy = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const content = useAnimationControls();
  const overlay = useAnimationControls();
  const blind = useAnimationControls();

  // 종이 진행도 0(화면 아래) → 1(제자리). 위치·모서리·아래 화면 어둡기를 모두 이 값에서 계산
  const sheetP = useMotionValue(1);
  const sheetY = useTransform(sheetP, (v) => (v >= 1 ? 0 : (1 - v) * (typeof window === 'undefined' ? 0 : window.innerHeight)));
  const sheetRadius = useTransform(sheetP, [0.85, 1], [RADIUS, 0], { clamp: true });
  const sheetRadiusPx = useTransform(sheetRadius, (r) => `${r}px`);
  const dim = useTransform(sheetP, [0, 1], [0, 0.22]);

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

  /**
   * 언어 바꾸기: 바탕·사진·배치는 그대로 두고 '조각'(글자, 글자가 든 상자는 상자째 — swapPieces.ts)만
   * 완전히 사라졌다가(투명 100%) 새 언어로 위에서부터 차례로 다시 나타난다. 스크롤 위치 그대로.
   */
  async function replay(run: () => void | Promise<void>) {
    if (busy.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      await run();
      return;
    }
    busy.current = true;
    const roots = () => [document.querySelector('nav'), sheetRef.current].filter((x): x is HTMLElement => !!x);

    // 1) 지금 조각들이 흐려지며 완전히 사라짐
    const before = collectPieces(roots());
    for (const el of before) el.setAttribute('data-swap', 'out');
    await new Promise((r) => setTimeout(r, OUT_MS + 40));

    // 2) 바꾸고 새 화면이 커밋될 때까지 기다림 — 대기 단계 동안은 새로 생기는 글자도 처음부터 숨김(site.css)
    const html = document.documentElement;
    html.setAttribute('data-swap-phase', 'wait');
    const changed = new Promise<void>((r) => (waiter.current = r));
    await run();
    await Promise.race([changed, new Promise<void>((r) => setTimeout(r, 1500))]);
    await frames2();

    // 3) 새로 생긴 조각까지 다시 모아 모두 숨긴 상태로 맞춘 뒤(전환 없이) → 위에서부터 차례로 등장
    const after = byPosition(collectPieces(roots()));
    for (const el of after) el.setAttribute('data-swap', 'hidden');
    for (const el of before) if (!after.includes(el)) el.removeAttribute('data-swap');
    html.removeAttribute('data-swap-phase');
    await frames2();
    const visible = after.filter(inView);
    const step = visible.length > 1 ? Math.min(STEP_MS, MAX_STAGGER_MS / (visible.length - 1)) : 0;
    let i = 0;
    for (const el of after) {
      const delay = inView(el) ? Math.round(i++ * step) : 0;
      el.style.setProperty('--swap-delay', `${delay}ms`);
      el.setAttribute('data-swap', 'in');
    }
    await new Promise((r) => setTimeout(r, MAX_STAGGER_MS + IN_MS + 60));
    for (const el of after) {
      el.removeAttribute('data-swap');
      el.style.removeProperty('--swap-delay');
    }
    window.dispatchEvent(new Event('scroll'));
    busy.current = false;
  }

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
    const el = sheetRef.current;

    let unfreeze = () => {};
    if (!reduce && el) {
      // 1) 지금 화면을 얼려 두고, 진짜 화면(종이)은 화면 아래로 내려 둔다
      unfreeze = freeze(el);
      sheetP.set(0);
      setSheeting(true);
      setEntering(true);
      await frame();
    }

    // 2) 새 화면으로 바꾸고 맨 위에서 시작
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    const changed = new Promise<void>((r) => (waiter.current = r));
    router.push(url.pathname + url.search);
    await Promise.race([changed, new Promise<void>((r) => setTimeout(r, 1500))]);
    await frames2();
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);

    // 3) 종이가 올라와 덮는다
    if (!reduce && el) {
      // 매 프레임 nav 글자색을 다시 판단하게 한다(종이가 nav 줄을 지나는 순간 바뀜)
      let entered = false;
      await animate(sheetP, 1, {
        duration: SHEET_D,
        ease: SHEET_EASE,
        onUpdate: (v) => {
          window.dispatchEvent(new Event('scroll'));
          if (!entered && v >= ENTER_AT) {
            entered = true;
            setEntering(false);
          }
        },
      });
      setEntering(false);
      unfreeze();
      setSheeting(false);
      // nav 글자색 다시 판단(복제본이 사라졌으므로)
      window.dispatchEvent(new Event('scroll'));
    }
    busy.current = false;
    if (url.hash) scrollToHash(url.hash);
  }

  return (
    <TransitionContext.Provider
      value={{ ready: !active && !entering, leaveTo: (href) => void leaveTo(href), replay: (run) => void replay(run) }}
    >
      {navbar}
      <motion.div
        ref={sheetRef}
        className={`flex flex-1 flex-col ${sheeting ? 'relative z-10 overflow-clip bg-ice-50 shadow-[0_-12px_40px_rgba(10,20,40,0.12)]' : ''}`}
        style={sheeting ? { y: sheetY, borderTopLeftRadius: sheetRadiusPx, borderTopRightRadius: sheetRadiusPx } : undefined}
      >
        <motion.div animate={content} initial={{ y: initial ? '10vh' : 0 }} className="flex flex-1 flex-col">
          {children}
        </motion.div>
      </motion.div>
      {sheeting && <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[6] bg-[#0a1a2e]" style={{ opacity: dim }} />}
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
            initial={{ scaleY: 1, borderRadius: '0px 0px 0vw 0vw', originY: 0 }}
            className="absolute inset-0 bg-ice-50"
          />
        </div>
      )}
    </TransitionContext.Provider>
  );
}
