import Link from 'next/link';

import { CONTACT_PHONE, USAGE_TIME } from '@/lib/site-config';

/**
 * 푸터(footer-visit, DESIGN footer: #f7f7f7, 본문 14/300).
 * 사업자 정보는 전자상거래법 제10조에 따라 결제 페이지에 필수라 표시한다.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface-soft">
      <div className="wrap py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-[18px] font-bold text-ink">스노위랜드</p>
            <p className="mt-3 text-[14px] text-body">
              홍천 비발디파크 스노위랜드
              <br />
              당일 이용 {USAGE_TIME}
              {CONTACT_PHONE && (
                <>
                  <br />
                  문의 {CONTACT_PHONE}
                </>
              )}
            </p>
          </div>
          <FooterCol title="예약">
            <FooterLink href="/booking">예약하기</FooterLink>
            <FooterLink href="/booking/lookup">예약 조회·취소</FooterLink>
          </FooterCol>
          <FooterCol title="정책">
            <FooterLink href="/terms">이용약관</FooterLink>
            <FooterLink href="/privacy" strong>
              개인정보처리방침
            </FooterLink>
            <FooterLink href="/refund-policy">취소·환불정책</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-12 border-t border-hairline pt-6 text-[12px] leading-relaxed tracking-[0.5px] text-muted">
          <p>주식회사 에이비씨웍스글로벌 · 대표 황혜진 · 사업자등록번호 442-87-01602 · 통신판매업신고 제2021-서울강서-1055호</p>
          <p>서울특별시 강서구 마곡중앙로 171, 5층 513호 씨(마곡동) · campingclub2020@naver.com</p>
          <div className="mt-4 flex items-center justify-between">
            <p>© 2026 ABC Works Global</p>
            <Link href="/admin/login" className="py-2">
              <span className="draw">관리자</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label text-ink">{title}</p>
      <ul className="mt-3 space-y-1">{children}</ul>
    </div>
  );
}

function FooterLink({ href, strong, children }: { href: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className={`inline-block py-1.5 text-[14px] ${strong ? 'font-bold text-ink' : 'text-body'}`}>
        <span className="draw">{children}</span>
      </Link>
    </li>
  );
}
