'use client';

import type { AnchorHTMLAttributes } from 'react';

import { usePageTransition } from '@/components/site/PageTransition';

/**
 * 사이트 안 링크 — 블라인드 전환(PageTransition.leaveTo)을 거쳐 이동.
 * 새 탭·수정키 클릭은 브라우저 기본 동작 그대로.
 */
export function TLink({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { leaveTo } = usePageTransition();
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        leaveTo(href);
      }}
      {...props}
    />
  );
}
