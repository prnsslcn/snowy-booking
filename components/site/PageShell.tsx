import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export function PageShell({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main
        className={
          center
            ? 'mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center'
            : 'mx-auto w-full max-w-2xl flex-1 px-4 py-8'
        }
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
