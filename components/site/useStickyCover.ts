'use client';

import { useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/*
  aftc 홈의 "덮는 장" 구조(Hero → Intro → WhyABC → Location, 밝음/어두움 반전)를 장마다 쓰는 훅.
  - 장은 sticky 로 붙고, 다음 장(DOM 뒤, z 위)이 위로 올라와 덮는다
  - 위 모서리 48px → 진입 마지막 15% 에서 0(aftc Intro 동일)
  - 장 높이가 화면보다 크면(작은 폰) top 을 음수로 줘서 아래 끝까지 본 뒤 붙게 한다
*/
export function useStickyCover<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  top: number;
  radius: MotionValue<string>;
} {
  const ref = useRef<T>(null);
  const [top, setTop] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setTop(Math.min(0, window.innerHeight - el.offsetHeight));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start start'] });
  const radius = useTransform(scrollYProgress, [0.85, 1], [48, 0], { clamp: true });
  return { ref, top, radius: useTransform(radius, (r) => `${r}px`) };
}
