 
/**
 * 예약 화면용 푸터 — 홈 footer-visit(브랜드 색 띠)과 같은 모양.
 * 사업자 정보는 전자상거래법 제10조에 따라 결제 페이지에 필수.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-dark text-canvas">
      <div className="wrap grid gap-8 py-14 md:grid-cols-2">
        <address className="font-display text-[26px] not-italic leading-[1.25] md:text-[32px]">
          홍천 비발디파크
          <br />
          스노위랜드
        </address>
        <dl className="grid grid-cols-[auto_1fr] content-start gap-x-6 gap-y-2 text-[16px]">
          <dt className="font-medium">시즌 중 매일</dt>
          <dd className="tabular">10:00–17:00</dd>
          <dt className="font-medium">당일 예약</dt>
          <dd className="tabular">16:00까지</dd>
        </dl>
      </div>
      <div className="wrap flex flex-col gap-2 border-t border-canvas/15 py-6 text-[13px] text-on-dark-soft">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span>© 2026 주식회사 에이비씨웍스글로벌</span>
          <a href="/terms" className="draw text-canvas">이용약관</a>
          <a href="/privacy" className="draw font-medium text-canvas">개인정보처리방침</a>
          <a href="/refund-policy" className="draw text-canvas">취소·환불정책</a>
          <a href="/admin/login" className="draw">관리자</a>
        </p>
        <p>대표 황혜진 · 사업자등록번호 442-87-01602 · 통신판매업신고 제2021-서울강서-1055호 · 서울특별시 강서구 마곡중앙로 171, 5층 513호 씨(마곡동) · campingclub2020@naver.com</p>
      </div>
    </footer>
  );
}
