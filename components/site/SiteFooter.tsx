import Link from 'next/link';

import { CONTACT_PHONE, SITE_NAME, USAGE_TIME } from '@/lib/site-config';

/** 사업자 정보는 grill-booking 과 동일(운영자 확인). 결제 페이지 푸터 필수(전자상거래법 제10조). */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-subtle">
        <p className="font-semibold text-muted">{SITE_NAME}</p>
        <p className="mt-2 leading-relaxed">
          홍천 비발디파크 스노위랜드 · 당일 이용 {USAGE_TIME}
          <br />
          전액 선결제 · 취소·환불 규정은 예약 시 안내됩니다.
          {CONTACT_PHONE && (
            <>
              <br />
              문의 {CONTACT_PHONE}
            </>
          )}
        </p>

        <details className="group mt-6 border-t border-line pt-5">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs text-subtle [&::-webkit-details-marker]:hidden">
            사업자정보
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className="transition-transform group-open:rotate-180">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="mt-3 text-xs leading-relaxed text-subtle">
            <p>주식회사 에이비씨웍스글로벌 | 대표 황혜진 | 사업자등록번호 442-87-01602</p>
            <p>통신판매업신고 제2021-서울강서-1055호</p>
            <p>서울특별시 강서구 마곡중앙로 171, 5층 513호 씨(마곡동)</p>
            <p>
              이메일{' '}
              <a href="mailto:campingclub2020@naver.com" className="hover:text-muted hover:underline">
                campingclub2020@naver.com
              </a>
            </p>
          </div>
        </details>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Link href="/terms" className="text-muted hover:underline">이용약관</Link>
          <Link href="/privacy" className="font-semibold text-muted hover:underline">개인정보처리방침</Link>
          <Link href="/refund-policy" className="text-muted hover:underline">취소·환불정책</Link>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-subtle">© 2026 ABC Works Global. All rights reserved.</p>
          <Link href="/admin/login" className="text-xs text-subtle hover:text-muted hover:underline">
            관리자 로그인
          </Link>
        </div>
      </div>
    </footer>
  );
}
