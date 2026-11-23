import type { Metadata } from 'next';

import { LegalPage } from '@/components/site/LegalPage';
import { getLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return (await getLocale()) === 'en'
    ? { title: 'Cancellation & Refund Policy', description: 'Snowy Cabana & Caravan cancellation and refund policy' }
    : { title: '취소·환불정책', description: '스노위 카바나·카라반 취소 및 환불정책' };
}

export default async function RefundPolicyPage() {
  const locale = await getLocale();
  return (
    <LegalPage
      display="Refund Policy"
      title={locale === 'en' ? 'Cancellation & Refund Policy' : '취소·환불정책'}
      current="/refund-policy"
      locale={locale}
    >
      {locale === 'en' ? <RefundEn /> : <RefundKo />}
    </LegalPage>
  );
}

function RefundKo() {
  return (
    <>
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
    </>
  );
}

function RefundEn() {
  return (
    <>
      <p>
        Snowy Cabana &amp; Caravan requires full payment in advance. When a booking is cancelled, the refund is
        calculated from the amount paid, according to how much time remains before{' '}
        <strong>midnight (00:00 Korea Standard Time) at the start of the date of use</strong>, as shown below.
      </p>

      <h2>Refund Rules</h2>
      <table>
        <thead>
          <tr>
            <th>When you cancel</th>
            <th>Refund</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Up to 2 days before the date of use</td>
            <td>100% of the amount paid</td>
          </tr>
          <tr>
            <td>1 day before the date of use</td>
            <td>50% of the amount paid</td>
          </tr>
          <tr>
            <td>On the date of use</td>
            <td>No refund</td>
          </tr>
          <tr>
            <td>No-show (booked but did not come)</td>
            <td>No refund (same as cancelling on the day)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Example: for a booking on December 26, cancelling by December 24 gives a 100% refund, cancelling on December 25
        gives a 50% refund, and there is no refund on December 26 itself.
      </p>

      <h2>How to Cancel</h2>
      <ul>
        <li>
          Look up your booking under <a href="/booking/lookup">Find or Cancel a Booking</a> with your mobile number and
          4-digit booking number, then cancel it yourself. You can also cancel on the date of use as long as you have not
          checked in, but no refund is given.
        </li>
        <li>Only the whole booking can be cancelled.</li>
        <li>The date of use cannot be changed. Please cancel and book again; the refund rules above still apply.</li>
      </ul>

      <h2>Refund Processing</h2>
      <ul>
        <li>When you cancel, the refund under the rules above is requested immediately.</li>
        <li>
          Refunds go back to the original payment method (by cancelling the payment through Toss Payments) and may take
          3–5 business days depending on your card issuer or payment method.
        </li>
      </ul>

      <h2>Natural Disasters and Similar Events</h2>
      <p>
        If the Facilities cannot be used because of natural disasters, severe weather such as heavy snow, or other causes
        beyond the Company&rsquo;s control, the affected bookings are handled separately from these rules, as the Company
        will advise.
      </p>

      <h2>Contact</h2>
      <p>Questions about cancellations and refunds: campingclub2020@naver.com</p>
    </>
  );
}
