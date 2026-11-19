import type { ReactNode } from 'react';

import { PageTitle } from '@/components/site/PageTitle';
import { SiteFooter } from '@/components/site/SiteFooter';

/** 하위 화면 틀(밝은 바탕): 큰 영문 헤드라인 + 한글 부제 → 본문 → 사업자 정보 푸터 */
export function SubPage({ display, sub, children }: { display: string; sub: string; children: ReactNode }) {
  return (
    <main data-nav-theme="light" className="flex min-h-[100dvh] flex-col bg-[#fafaf8] text-[#0a0a0a]">
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-28 md:px-8 md:pt-32">
        <PageTitle display={display} sub={sub} />
        {children}
      </div>
      <SiteFooter />
    </main>
  );
}
