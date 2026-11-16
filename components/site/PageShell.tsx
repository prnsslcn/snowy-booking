import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

type Width = 'narrow' | 'wide' | 'full';

const widths: Record<Width, string> = {
  narrow: 'mx-auto w-full max-w-xl px-4 sm:px-6',
  wide: 'mx-auto w-full max-w-6xl px-4 sm:px-6',
  full: 'w-full',
};

export function PageShell({
  children,
  width = 'narrow',
  center = false,
  footer = true,
  surface = false,
}: {
  children: ReactNode;
  width?: Width;
  center?: boolean;
  footer?: boolean;
  /** 흰 바탕(입력 폼 화면) — 회색 입력칸이 배경과 구분되도록 */
  surface?: boolean;
}) {
  return (
    <div className={`flex min-h-[100dvh] flex-col ${surface ? 'bg-surface' : ''}`}>
      <SiteHeader />
      <main
        className={`${widths[width]} flex-1 ${
          center ? 'flex flex-col items-center justify-center py-16 text-center' : 'py-8 sm:py-12'
        }`}
      >
        {children}
      </main>
      {footer && <SiteFooter />}
    </div>
  );
}
