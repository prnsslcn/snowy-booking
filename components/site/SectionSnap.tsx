'use client';

import { useEffect } from 'react';

import { useLenis } from '@/components/site/SmoothScroll';

/*
  홈 장 자석 스냅 — 스크롤이 완전히 멈춘 뒤, 가장 가까운 장의 시작점이 화면 높이의 THRESHOLD 안이면
  그 장이 화면을 꽉 채우는 위치로 끌어당긴다. 멀리 떨어져 있으면(장 중간쯤) 그대로 둔다.
  - lenis/snap 은 부드러운 스크롤이 아직 움직이는 도중 위치로 거리를 재서 가까이 멈춰도 놓치므로 직접 구현.
  - 스냅 지점 = 맨 위(0) + [data-snap] 표식(상품 장 앞 0높이 앵커, 마지막 장 앞)의 문서 위치.
    표식은 흐름 안 요소라 sticky 영향이 없다. 멈출 때마다 다시 재므로 자세히 보기 펼침·창 크기 변화도 반영.
  - 손가락이 화면에 닿아 있는 동안, 메뉴가 열려 스크롤이 멈춘 동안에는 당기지 않는다.

  폰·태블릿(터치, lg 미만) 장 넘기기 — 갤러리처럼 한 번 밀면 다음/이전 장으로.
  - 장 i 의 범위 = [p_i, p_{i+1} − 화면 높이]. 장이 화면보다 길면(자세히 보기 펼침·마지막 장) 그 안에서는 자유 스크롤,
    끝(밀어 올림)·처음(끌어 내림)에 닿은 뒤 미는 손짓만 장 넘기기로 바꾼다.
  - 넘기기로 정한 손짓은 화면이 손가락을 따라가지 않게 막고(preventDefault), PAGE_PX 를 넘는 순간 바로 넘긴다.
  - 가로 손짓(사진 넘기기 등)·메뉴/사진 보기로 스크롤이 멈춘 동안은 건드리지 않는다.
  - 긴 장 안 자유 스크롤의 관성이 장 사이(다음 장이 덮는 중)에 멈추면, 마지막 손짓 방향으로 마저 넘긴다.
*/
const THRESHOLD = 0.15;
const SETTLE_MS = 140;
const PAGE_PX = 28;
const PAGE = { duration: 0.8, easing: (t: number) => 1 - Math.pow(1 - t, 4), lock: true };
const SNAP = { duration: 0.75, easing: (t: number) => 1 - Math.pow(1 - t, 3) };

export function SectionSnap() {
  const lenis = useLenis();

  // 폰 장 넘기기
  useEffect(() => {
    if (!lenis) return;
    const mobile = window.matchMedia('(max-width: 1023px)');
    let startX = 0;
    let startY = 0;
    let mode: 'none' | 'native' | 'page' = 'none';
    let fired = false;
    let busy = false;
    let touching = false;
    let lastDir: 1 | -1 = 1;
    let settle = 0;

    const points = () => {
      const y = lenis.scroll;
      return [0, ...Array.from(document.querySelectorAll<HTMLElement>('[data-snap]'), (el) => Math.round(el.getBoundingClientRect().top + y))].sort((a, b) => a - b);
    };
    const page = (to: number) => {
      busy = true;
      lenis.scrollTo(to, { ...PAGE, onComplete: () => (busy = false) });
      window.setTimeout(() => (busy = false), PAGE.duration * 1000 + 200); // 혹시 onComplete 가 안 오면
    };
    /** 장 사이에 멈췄으면 마지막 손짓 방향의 장으로 */
    const settleCheck = () => {
      if (touching || busy || lenis.isStopped || !mobile.matches) return;
      if (lenis.isScrolling) return onScroll();
      const y = lenis.scroll;
      const vh = window.innerHeight;
      const ps = points();
      for (let k = 0; k + 1 < ps.length; k++) {
        const end = Math.max(ps[k], ps[k + 1] - vh);
        if (y > end + 2 && y < ps[k + 1] - 2) return page(lastDir === 1 ? ps[k + 1] : end);
      }
    };
    const onScroll = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(settleCheck, 120);
    };
    /** 손짓 방향(1 = 아래 장으로)에 대해 넘길 목표. null 이면 자유 스크롤 */
    const target = (dir: 1 | -1): number | null => {
      const y = lenis.scroll;
      const vh = window.innerHeight;
      const max = lenis.limit;
      const ps = points();
      let i = 0;
      for (let k = 0; k < ps.length; k++) if (ps[k] <= y + 2) i = k;
      const end = (k: number) => (k + 1 < ps.length ? Math.max(ps[k], ps[k + 1] - vh) : Math.max(ps[k], max));
      if (dir === 1) {
        if (y < end(i) - 2) return null; // 긴 장 안 — 끝까지 자유 스크롤
        return i + 1 < ps.length ? ps[i + 1] : null;
      }
      if (y > end(i) + 2) return end(i); // 장 사이(덮는 중)에 멈춰 있으면 이 장 끝으로
      if (y > ps[i] + 2) return null; // 긴 장 안 — 처음까지 자유 스크롤
      return i > 0 ? end(i - 1) : null;
    };

    const onStart = (e: TouchEvent) => {
      touching = true;
      window.clearTimeout(settle);
      mode = 'none';
      fired = false;
      if (!mobile.matches || e.touches.length > 1) return (mode = 'native'), undefined;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (busy) return e.cancelable && e.preventDefault();
      if (mode === 'native' || lenis.isStopped || !mobile.matches) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (mode === 'none') {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) >= Math.abs(dx)) lastDir = dy < 0 ? 1 : -1;
        if (Math.abs(dx) > Math.abs(dy)) return (mode = 'native'), undefined;
        mode = target(dy < 0 ? 1 : -1) === null ? 'native' : 'page';
        if (mode === 'native') return;
      }
      if (e.cancelable) e.preventDefault();
      if (fired || Math.abs(dy) < PAGE_PX) return;
      const to = target(dy < 0 ? 1 : -1);
      if (to === null) return;
      fired = true;
      page(to);
    };
    const onEnd = () => {
      touching = false;
      onScroll();
    };

    const off = lenis.on('scroll', onScroll);
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.clearTimeout(settle);
      off();
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
    };
  }, [lenis]);

  useEffect(() => {
    if (!lenis) return;
    let timer = 0;
    let touching = false;

    // 터치 폰·태블릿은 위 장 넘기기가 맡는다
    const paged = () => window.matchMedia('(max-width: 1023px)').matches && navigator.maxTouchPoints > 0;
    const check = () => {
      if (touching || lenis.isStopped || paged()) return;
      // 관성 스크롤(네이티브 포함)이 아직 끝나지 않았으면 조금 뒤 다시 본다
      if (lenis.isScrolling) return onScroll();
      const y = lenis.scroll;
      const points = [0, ...Array.from(document.querySelectorAll<HTMLElement>('[data-snap]'), (el) => el.getBoundingClientRect().top + y)];
      let best = points[0];
      for (const p of points) if (Math.abs(p - y) < Math.abs(best - y)) best = p;
      const d = Math.abs(best - y);
      if (d > 1 && d <= window.innerHeight * THRESHOLD) lenis.scrollTo(Math.round(best), SNAP);
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(check, SETTLE_MS);
    };
    const onTouchStart = () => {
      touching = true;
      window.clearTimeout(timer);
    };
    const onTouchEnd = () => {
      touching = false;
      onScroll();
    };

    const off = lenis.on('scroll', onScroll);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.clearTimeout(timer);
      off();
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [lenis]);

  return null;
}
