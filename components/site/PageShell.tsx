import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

type Width = 'form' | 'full';

/** form: 예약·조회 같은 입력 화면(좁은 단), full: 섹션이 각자 .wrap 을 가짐 */
export function PageShell({
  children,
  width = 'form',
  center = false,
}: {
  children: ReactNode;
  width?: Width;
  center?: boolean;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main
        className={
          width === 'full'
            ? 'flex-1'
            : `wrap flex-1 ${center ? 'flex flex-col items-center justify-center py-20 text-center' : 'py-10 md:py-16'}`
        }
      >
        {width === 'form' ? <div className="mx-auto w-full max-w-[560px]">{children}</div> : children}
      </main>
      <SiteFooter />
    </div>
  );
}
