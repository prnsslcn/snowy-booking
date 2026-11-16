import Link from 'next/link';

import { Logo } from '@/components/site/Logo';
import { CONTACT_PHONE, USAGE_TIME } from '@/lib/site-config';

/** 사업자 정보는 grill-booking 과 동일(운영자 확인). 결제 페이지 푸터 필수(전자상거래법 제10조). */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line-soft bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              홍천 비발디파크 스노위랜드 · 카바나·카라반 당일 이용 {USAGE_TIME}
              {CONTACT_PHONE && <> · 문의 {CONTACT_PHONE}</>}
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            <Link href="/booking" className="text-muted hover:text-ink">예약하기</Link>
            <Link href="/booking/lookup" className="text-muted hover:text-ink">예약 조회·취소</Link>
            <Link href="/terms" className="text-muted hover:text-ink">이용약관</Link>
            <Link href="/privacy" className="font-semibold text-ink-2 hover:text-ink">개인정보처리방침</Link>
            <Link href="/refund-policy" className="text-muted hover:text-ink">취소·환불정책</Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-line-soft pt-6 text-[12px] leading-relaxed text-subtle">
          <p>주식회사 에이비씨웍스글로벌 · 대표 황혜진 · 사업자등록번호 442-87-01602 · 통신판매업신고 제2021-서울강서-1055호</p>
          <p>서울특별시 강서구 마곡중앙로 171, 5층 513호 씨(마곡동) · campingclub2020@naver.com</p>
          <div className="mt-4 flex items-center justify-between">
            <p>© 2026 ABC Works Global</p>
            <Link href="/admin/login" className="hover:text-muted">관리자</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
