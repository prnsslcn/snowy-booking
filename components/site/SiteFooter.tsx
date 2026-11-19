import { TLink } from '@/components/site/TLink';

/**
 * 하위 화면(예약·조회·결과) 공용 푸터 — 홈 마지막 장의 사업자 정보 줄과 같은 모양.
 * 사업자 정보는 전자상거래법 제10조에 따라 결제 사이트에 필수.
 */
export function SiteFooter({ dark = false }: { dark?: boolean }) {
  const text = dark ? 'text-white/45' : 'text-ink/50';
  const link = dark ? 'text-white/75 hover:text-white' : 'text-ink/80 hover:text-ink';
  const rule = dark ? 'border-white/[.08]' : 'border-black/[.12]';
  return (
    <footer className={`mt-auto px-5 pb-6 pt-16 md:px-8 lg:px-10 ${dark ? 'bg-ink' : 'bg-ice-50'}`}>
      <div className={`flex flex-col gap-1.5 border-t ${rule} pt-5 text-[12px] leading-relaxed md:gap-2 md:text-[13px] ${text}`}>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span>© 2026 주식회사 에이비씨웍스글로벌</span>
          <a href="/terms" className={link}>
            이용약관
          </a>
          <a href="/privacy" className={`font-semibold ${link}`}>
            개인정보처리방침
          </a>
          <a href="/refund-policy" className={link}>
            취소·환불정책
          </a>
          <TLink href="/booking/lookup" className={link}>
            예약 조회·취소
          </TLink>
        </p>
        <p>
          대표 황혜진 · 사업자등록번호 442-87-01602 · 통신판매업신고 제2021-서울강서-1055호 · 서울특별시 강서구 마곡중앙로 171, 5층 513호 씨(마곡동) · campingclub2020@naver.com
        </p>
      </div>
    </footer>
  );
}
