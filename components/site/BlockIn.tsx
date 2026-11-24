'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

import { blockIn, WILL } from '@/components/site/motion';
import { usePageTransition } from '@/components/site/PageTransition';

/**
 * 블록 등장 래퍼 — 서버 화면(하위 화면 본문 등)에서 blockIn(blur 해제 + 상승 + fade)을 쓰게 한다.
 * 화면 전환(블라인드·종이)이 끝나고(ready) 화면에 들어오면 한 번 등장. delay 로 순서를 준다.
 */
export function BlockIn({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -8% 0px' });
  const { ready } = usePageTransition();
  const Tag = as === 'section' ? motion.section : motion.div;
  return (
    <Tag ref={ref} className={className} style={WILL} {...blockIn(8, '14%', 0.78, delay, seen && ready)}>
      {children}
    </Tag>
  );
}
