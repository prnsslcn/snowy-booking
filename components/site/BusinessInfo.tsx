'use client';

import { useLocale } from '@/components/site/LocaleProvider';
import { BUSINESS_INFO, BUSINESS_INFO_EN, COMPANY_NAME } from '@/lib/site-config';

/**
 * '© 2026 회사명' + 사업자 정보(전자상거래법 제10조 필수 표시).
 * 항상 펼쳐 보인다 — 토스·카드사 심사에서 접기(토글) 형태는 반송될 수 있다고 안내받음(2026-11-27).
 * admin: 이메일 바로 옆에 관리자 진입 링크(홈 마지막 장만).
 */
export function BusinessInfo({ className = '', admin = false }: { className?: string; admin?: boolean }) {
  const en = useLocale() === 'en';
  return (
    <div className={className}>
      <p>© 2026 {COMPANY_NAME}</p>
      <p className="pt-1">
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
      </p>
    </div>
  );
}
