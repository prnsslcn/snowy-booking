import type { ReactNode } from 'react';

import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { TransitionLinks } from '@/components/site/TransitionLinks';

/*
  약관 3종(이용약관 · 개인정보처리방침 · 취소·환불정책) 공통 틀.
  하위 화면 머리(큰 영문 + 한글 부제, 오른쪽 시행일) → 세 문서 사이 이동 탭 → 본문.
  본문은 시맨틱 태그(h2/p/ul/table/a)로 쓰면 아래 셀렉터로 꾸며진다.
  문안은 grill-booking(같은 운영사) 약관을 이 서비스의 확정 사실에 맞게 옮긴 것 — 운영자 검토 대상.
*/

export const POLICY_EFFECTIVE_DATE = '2026년 11월 20일';

const DOCS = [
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/refund-policy', label: '취소·환불정책' },
] as const;

const PROSE = [
  'text-[15px] leading-[1.75] text-ink/75',
  '[&_h2]:mt-12 [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:tracking-[-0.01em] [&_h2]:text-ink md:[&_h2]:text-lg',
  '[&_h2:first-child]:mt-0',
  '[&_p]:mt-3',
  '[&_strong]:font-semibold [&_strong]:text-ink',
  '[&_a]:font-medium [&_a]:text-glacier [&_a]:underline [&_a]:decoration-ice-300 [&_a]:underline-offset-4 hover:[&_a]:decoration-glacier',
  '[&_ul]:mt-3 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:marker:text-ice-400',
  '[&_table]:mt-4 [&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0 [&_table]:overflow-hidden [&_table]:rounded-2xl [&_table]:border [&_table]:border-ice-700/15 [&_table]:bg-white [&_table]:text-[14px]',
  '[&_th]:bg-ice-100 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink',
  '[&_td]:border-t [&_td]:border-ice-700/10 [&_td]:px-4 [&_td]:py-3 [&_td]:align-top',
].join(' ');

export function LegalPage({
  display,
  title,
  current,
  children,
}: {
  /** 큰 영문 제목 */
  display: string;
  /** 한글 문서 이름 */
  title: string;
  current: (typeof DOCS)[number]['href'];
  children: ReactNode;
}) {
  return (
    <SubPage
      display={display}
      sub={title}
      aside={<p className="mb-1 flex-none text-right text-[13px] text-ink/50">시행일 {POLICY_EFFECTIVE_DATE}</p>}
    >
      {/* 세 문서 사이 이동 */}
      <nav aria-label="약관" className="-mt-2 mb-10 flex flex-wrap gap-2 md:mb-14">
        {DOCS.map((d) => {
          const active = d.href === current;
          return (
            <TLink
              key={d.href}
              href={d.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-[14px] font-medium transition-colors duration-300 ${
                active ? 'bg-glacier text-white' : 'bg-white text-ink/70 hover:text-ink'
              }`}
            >
              {d.label}
            </TLink>
          );
        })}
      </nav>
      <TransitionLinks className={PROSE}>{children}</TransitionLinks>
    </SubPage>
  );
}
