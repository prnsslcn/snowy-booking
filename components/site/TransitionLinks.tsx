'use client';

import type { HTMLAttributes } from 'react';

import { usePageTransition } from '@/components/site/PageTransition';

/**
 * 안에 든 일반 <a href="/..."> 링크(약관 본문 등)를 사이트 안 이동이면 종이 전환으로 보낸다.
 * 바깥 주소·새 탭·수정키 클릭은 브라우저 기본 동작 그대로.
 */
export function TransitionLinks({ onClick, ...props }: HTMLAttributes<HTMLElement> & { as?: never }) {
  const { leaveTo } = usePageTransition();
  return (
    <article
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const a = (e.target as HTMLElement).closest('a');
        const href = a?.getAttribute('href');
        if (!a || !href || !href.startsWith('/') || a.target) return;
        e.preventDefault();
        leaveTo(href);
      }}
    />
  );
}
