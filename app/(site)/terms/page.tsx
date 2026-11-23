import type { Metadata } from 'next';

import { LegalPage } from '@/components/site/LegalPage';
import { getLocale } from '@/lib/i18n/server';
import { BOOKING_WINDOW_EN, BOOKING_WINDOW_KO } from '@/lib/policy/booking-window';

export async function generateMetadata(): Promise<Metadata> {
  return (await getLocale()) === 'en'
    ? { title: 'Terms of Service', description: 'Snowy Cabana & Caravan Terms of Service' }
    : { title: '이용약관', description: '스노위 카바나·카라반 이용약관' };
}

export default async function TermsPage() {
  const locale = await getLocale();
  return (
    <LegalPage display="Terms" title={locale === 'en' ? 'Terms of Service' : '이용약관'} current="/terms" locale={locale}>
      {locale === 'en' ? <TermsEn /> : <TermsKo />}
    </LegalPage>
  );
}

function TermsKo() {
  return (
    <>
      <h2>제1조 (목적)</h2>
      <p>
        본 약관은 주식회사 에이비씨웍스글로벌(이하 &lsquo;회사&rsquo;)이 운영하는 스노위 카바나·카라반 예약
        서비스(이하 &lsquo;서비스&rsquo;)의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을
        목적으로 합니다.
      </p>

      <h2>제2조 (정의)</h2>
      <ul>
        <li>
          &lsquo;서비스&rsquo;란 회사가 제공하는 홍천 비발디파크 스노위랜드 안 카바나·카라반·단체카라반(이하
          &lsquo;시설&rsquo;)의 당일 이용 온라인 예약·결제 서비스를 말합니다.
        </li>
        <li>&lsquo;이용자&rsquo;란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
        <li>
          &lsquo;예약&rsquo;이란 이용자가 이용일과 시설 상품을 선택하고 결제를 완료하여 이용 권한을 확정하는 것을
          말합니다.
        </li>
      </ul>

      <h2>제3조 (약관의 명시와 개정)</h2>
      <ul>
        <li>회사는 본 약관을 서비스 화면에 게시하여 이용자가 확인할 수 있도록 합니다.</li>
        <li>
          회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 시행일과 개정 내용을
          사전에 공지합니다.
        </li>
      </ul>

      <h2>제4조 (서비스의 제공)</h2>
      <ul>
        <li>
          회사는 시즌 운영 기간 중 <strong>매일 10:00~17:00</strong> 당일 이용 기준으로 시설을 제공합니다. 조기
          입실 및 이용 시간 연장은 제공하지 않습니다.
        </li>
        <li>
          시설의 구체적인 호수(자리)는 이용 당일 현장에서 배정합니다.
        </li>
        <li>
          시즌 운영 기간·운영일은 회사의 사정에 따라 변경될 수 있으며, 변경 시 서비스 화면을 통해 안내합니다.
        </li>
        <li>스노위랜드 입장권은 서비스에 포함되어 있지 않습니다.</li>
      </ul>

      <h2>제5조 (예약 및 결제)</h2>
      <ul>
        <li>
          예약은 이용자가 이용일과 시설 상품을 선택하고 <strong>전액 선결제</strong>를 완료한 시점에 확정됩니다.
        </li>
        <li>결제는 회사가 지정한 결제대행사(토스페이먼츠)를 통해 처리됩니다.</li>
        <li>
          예약 가능 기간은 <strong>예약일로부터 {BOOKING_WINDOW_KO} 이내</strong>이며, 이용 당일 예약은 <strong>16:00까지</strong>{' '}
          받습니다.
        </li>
        <li>
          예약은 <strong>1인(휴대폰 번호 기준) 1일 1동(1대)</strong>까지 가능합니다.
        </li>
        <li>
          결제가 완료되지 않은 예약은 일정 시간이 지나면 자동으로 취소되며, 선점한 자리는 다른 이용자에게
          반환됩니다.
        </li>
      </ul>

      <h2>제6조 (예약의 변경·취소 및 환불)</h2>
      <ul>
        <li>예약한 이용일의 변경은 제공하지 않으며, 예약을 취소한 뒤 다시 예약해야 합니다.</li>
        <li>
          예약의 취소 및 환불은 별도의 <a href="/refund-policy">취소·환불정책</a>에 따릅니다. 환불 금액은 결제
          금액을 기준으로 이용일까지 남은 기간에 따라 산정됩니다.
        </li>
      </ul>

      <h2>제7조 (이용자의 의무)</h2>
      <ul>
        <li>이용자는 예약 시 정확한 정보를 제공해야 하며, 허위 정보로 인한 불이익은 이용자가 부담합니다.</li>
        <li>이용자는 상품별 최대 인원(영유아 포함)과 이용 시간을 지켜야 합니다.</li>
        <li>이용자는 시설 및 비품을 선량한 관리자의 주의로 이용하여야 합니다.</li>
        <li>이용자의 고의·과실로 시설·비품이 훼손된 경우 그에 대한 손해를 배상할 책임이 있습니다.</li>
      </ul>

      <h2>제8조 (회사의 의무)</h2>
      <ul>
        <li>회사는 관련 법령과 본 약관을 준수하며, 안정적인 서비스 제공을 위해 노력합니다.</li>
        <li>
          회사는 이용자의 개인정보를 <a href="/privacy">개인정보처리방침</a>에 따라 보호합니다.
        </li>
      </ul>

      <h2>제9조 (면책)</h2>
      <p>
        천재지변, 폭설 등 기상악화, 그 밖에 회사의 통제를 벗어난 사유로 서비스를 제공할 수 없는 경우 회사는 그에
        대한 책임을 지지 않으며, 해당 예약은 <a href="/refund-policy">취소·환불정책</a>에서 정한 바에 따라
        처리합니다.
      </p>

      <h2>제10조 (분쟁 해결 및 관할)</h2>
      <p>
        본 약관과 관련하여 분쟁이 발생한 경우 회사와 이용자는 성실히 협의하여 해결하며, 협의가 이루어지지 않을
        경우 관계 법령 및 상관례에 따릅니다. 본 약관은 대한민국 법령을 준거법으로 합니다.
      </p>
    </>
  );
}

function TermsEn() {
  return (
    <>
      <h2>Article 1 (Purpose)</h2>
      <p>
        These Terms set out the rights, obligations and responsibilities of 주식회사 에이비씨웍스글로벌 (the
        &lsquo;Company&rsquo;) and its users in connection with the Snowy Cabana &amp; Caravan booking service (the
        &lsquo;Service&rsquo;) operated by the Company.
      </p>

      <h2>Article 2 (Definitions)</h2>
      <ul>
        <li>
          &lsquo;Service&rsquo; means the online booking and payment service provided by the Company for day use of the
          cabanas, caravans and group caravans (the &lsquo;Facilities&rsquo;) at Snowyland, Vivaldi Park, Hongcheon.
        </li>
        <li>&lsquo;User&rsquo; means anyone who uses the Service under these Terms.</li>
        <li>
          &lsquo;Booking&rsquo; means a User selecting a date of use and a Facility and completing payment, which confirms
          the right to use that Facility.
        </li>
      </ul>

      <h2>Article 3 (Posting and Amendment of the Terms)</h2>
      <ul>
        <li>The Company posts these Terms on the Service so that Users can read them.</li>
        <li>
          The Company may amend these Terms to the extent permitted by applicable law. When it does, it will announce
          the effective date and the changes in advance.
        </li>
      </ul>

      <h2>Article 4 (Provision of the Service)</h2>
      <ul>
        <li>
          During the season, the Company provides the Facilities for day use <strong>every day from 10:00 to 17:00</strong>.
          Early check-in and extensions are not available.
        </li>
        <li>The specific unit is assigned on site on the day of use.</li>
        <li>
          The season and operating days may change depending on the Company&rsquo;s circumstances. Any change will be
          announced on the Service.
        </li>
        <li>Snowyland admission tickets are not included in the Service.</li>
      </ul>

      <h2>Article 5 (Booking and Payment)</h2>
      <ul>
        <li>
          A Booking is confirmed when the User selects a date and a Facility and completes <strong>full payment in advance</strong>.
        </li>
        <li>Payments are processed through the payment service provider designated by the Company (Toss Payments).</li>
        <li>
          Bookings can be made for dates <strong>up to {BOOKING_WINDOW_EN} ahead</strong>. Same-day bookings are accepted{' '}
          <strong>until 16:00</strong>.
        </li>
        <li>
          Each person (identified by mobile number) can book <strong>one unit per day</strong>.
        </li>
        <li>
          A booking that is not paid for within a set time is cancelled automatically, and the held unit is released to
          other Users.
        </li>
      </ul>

      <h2>Article 6 (Changes, Cancellations and Refunds)</h2>
      <ul>
        <li>The date of a Booking cannot be changed. To change it, please cancel and book again.</li>
        <li>
          Cancellations and refunds follow the separate <a href="/refund-policy">Cancellation &amp; Refund Policy</a>. The
          refund is calculated from the amount paid, based on the time remaining until the date of use.
        </li>
      </ul>

      <h2>Article 7 (Obligations of Users)</h2>
      <ul>
        <li>Users must provide accurate information when booking and bear any disadvantage caused by false information.</li>
        <li>Users must observe the maximum number of guests for each product (infants included) and the hours of use.</li>
        <li>Users must take due care of the Facilities and their furnishings.</li>
        <li>Users are liable for any damage to the Facilities or furnishings caused intentionally or through negligence.</li>
      </ul>

      <h2>Article 8 (Obligations of the Company)</h2>
      <ul>
        <li>The Company complies with applicable law and these Terms and strives to provide the Service reliably.</li>
        <li>
          The Company protects Users&rsquo; personal information in accordance with its <a href="/privacy">Privacy Policy</a>.
        </li>
      </ul>

      <h2>Article 9 (Disclaimer)</h2>
      <p>
        The Company is not liable where it cannot provide the Service because of natural disasters, severe weather such
        as heavy snow, or other causes beyond its control. Affected Bookings are handled as set out in the{' '}
        <a href="/refund-policy">Cancellation &amp; Refund Policy</a>.
      </p>

      <h2>Article 10 (Dispute Resolution and Governing Law)</h2>
      <p>
        If a dispute arises in connection with these Terms, the Company and the User will try in good faith to resolve it
        through discussion. If no agreement is reached, the matter is governed by applicable law and commercial practice.
        These Terms are governed by the laws of the Republic of Korea.
      </p>
    </>
  );
}
