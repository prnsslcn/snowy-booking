import type { Metadata } from 'next';

import { LegalPage } from '@/components/site/LegalPage';

export const metadata: Metadata = { title: '취소·환불정책', description: '스노위 카바나·카라반 취소 및 환불정책' };

export default function RefundPolicyPage() {
  return (
    <LegalPage display="Refund Policy" title="취소·환불정책" current="/refund-policy">
      <p>
        스노위 카바나·카라반은 전액 선결제로 운영됩니다. 예약 취소 시 환불 금액은 결제 금액을 기준으로,{' '}
        <strong>이용일 자정(00:00, 한국 표준시)</strong>을 기준으로 남은 기간에 따라 아래와 같이 산정됩니다.
      </p>

      <h2>환불 규정</h2>
      <table>
        <thead>
          <tr>
            <th>취소 시점</th>
            <th>환불 금액</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>이용 2일 전까지</td>
            <td>결제 금액의 100% 환불</td>
          </tr>
          <tr>
            <td>이용 1일 전</td>
            <td>결제 금액의 50% 환불</td>
          </tr>
          <tr>
            <td>이용 당일</td>
            <td>환불 불가</td>
          </tr>
          <tr>
            <td>노쇼(예약 후 미방문)</td>
            <td>환불 불가 (당일 취소와 동일)</td>
          </tr>
        </tbody>
      </table>
      <p>
        예: 12월 26일 이용 예약의 경우 24일까지 취소하면 100%, 25일 중 취소하면 50%가 환불되며, 26일 당일에는
        환불되지 않습니다.
      </p>

      <h2>취소 방법</h2>
      <ul>
        <li>
          <a href="/booking/lookup">예약 조회·취소</a>에서 휴대폰 번호와 예약번호(4자리)로 예약을 조회한 뒤 직접
          취소할 수 있습니다. 이용 당일에도 입실 전이라면 취소할 수 있으며, 이때 환불 금액은 없습니다.
        </li>
        <li>취소는 예약 전체 단위로만 가능합니다.</li>
        <li>이용일 변경은 제공하지 않으며, 취소 후 다시 예약해야 합니다. 이때에도 위 환불 규정이 적용됩니다.</li>
      </ul>

      <h2>환불 처리</h2>
      <ul>
        <li>취소하면 위 규정에 따른 환불이 즉시 신청됩니다.</li>
        <li>
          환불은 최초 결제 수단으로 처리되며(결제대행사 토스페이먼츠를 통한 결제 취소), 카드사·결제수단 사정에
          따라 영업일 기준 3~5일이 걸릴 수 있습니다.
        </li>
      </ul>

      <h2>천재지변 등</h2>
      <p>
        천재지변, 폭설 등 기상악화, 그 밖에 회사의 통제를 벗어난 사유로 시설 이용이 불가능한 경우 해당 예약은 본
        규정과 별도로 처리하며, 회사의 안내에 따릅니다.
      </p>

      <h2>문의</h2>
      <p>취소·환불 관련 문의: campingclub2020@naver.com</p>
    </LegalPage>
  );
}
