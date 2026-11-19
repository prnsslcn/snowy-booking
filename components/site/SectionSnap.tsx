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
*/
const THRESHOLD = 0.1;
const SETTLE_MS = 140;
const SNAP = { duration: 0.75, easing: (t: number) => 1 - Math.pow(1 - t, 3) };

export function SectionSnap() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    let timer = 0;
    let touching = false;

    const check = () => {
      if (touching || lenis.isStopped) return;
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
