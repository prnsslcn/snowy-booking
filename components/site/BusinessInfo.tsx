'use client';

import { useId, useState } from 'react';

import { useLocale } from '@/components/site/LocaleProvider';
import { BUSINESS_INFO, BUSINESS_INFO_EN, COMPANY_NAME } from '@/lib/site-config';

/**
 * '© 2026 회사명' — 누르면 사업자 정보가 아래로 펼쳐진다(평소에는 접힘).
 * 사업자 정보는 전자상거래법 제10조 필수 표시라 지우지 말고, 눌러서 바로 볼 수 있게만 접는다.
 * 높이 애니메이션은 grid-template-rows 0fr→1fr(모션 줄이기면 즉시).
 * admin: 이메일 바로 옆에 관리자 진입 링크(홈 마지막 장만 — 평소에는 접혀 숨어 있음).
 */
export function BusinessInfo({ className = '', admin = false }: { className?: string; admin?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const en = useLocale() === 'en';
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-left transition-colors hover:text-current"
      >
        © 2026 {COMPANY_NAME}
        <svg
          viewBox="0 0 12 12"
          aria-hidden
          className={`h-3 w-3 flex-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">
          {en ? (open ? 'Hide business information' : 'Show business information') : open ? '사업자 정보 접기' : '사업자 정보 펼치기'}
        </span>
      </button>
      <div
        id={id}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <p className="overflow-hidden" inert={!open}>
          <span className="block pt-1">
            {en ? BUSINESS_INFO_EN : BUSINESS_INFO}
            {admin && (
              <>
                {' · '}
                {/* 관리자 진입(별도 레이아웃이라 종이 전환 없이 일반 이동) */}
                <a href="/admin" className="font-bold underline-offset-4 transition-colors hover:text-ink hover:underline">
                  Admin
                </a>
              </>
            )}
          </span>
        </p>
      </div>
    </div>
  );
}
