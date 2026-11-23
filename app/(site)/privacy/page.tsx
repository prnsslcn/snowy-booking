import type { Metadata } from 'next';

import { LegalPage } from '@/components/site/LegalPage';
import { getLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return (await getLocale()) === 'en'
    ? { title: 'Privacy Policy', description: 'Snowy Cabana & Caravan Privacy Policy' }
    : { title: '개인정보처리방침', description: '스노위 카바나·카라반 개인정보처리방침' };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return (
    <LegalPage display="Privacy" title={locale === 'en' ? 'Privacy Policy' : '개인정보처리방침'} current="/privacy" locale={locale}>
      {locale === 'en' ? <PrivacyEn /> : <PrivacyKo />}
    </LegalPage>
  );
}

function PrivacyKo() {
  return (
    <>
      <p>
        주식회사 에이비씨웍스글로벌(이하 &lsquo;회사&rsquo;)은 정보주체의 개인정보를 중요하게 생각하며, 「개인정보
        보호법」 등 관련 법령을 준수합니다. 회사는 본 방침을 통해 스노위 카바나·카라반 예약 서비스에서 수집하는
        개인정보의 항목, 처리 목적, 보유 기간 등을 안내합니다.
      </p>

      <h2>제1조 (개인정보의 처리 목적)</h2>
      <p>회사는 다음의 목적을 위하여 개인정보를 처리하며, 목적 외의 용도로는 이용하지 않습니다.</p>
      <ul>
        <li>예약 접수 및 확정, 예약 내역 관리</li>
        <li>결제 처리 및 환불 처리</li>
        <li>예약 확정·취소 등 안내 문자(SMS) 발송</li>
        <li>예약 조회 시 본인 확인 및 부정 조회 방지</li>
        <li>고객 문의 응대 및 분쟁 처리</li>
      </ul>

      <h2>제2조 (수집하는 개인정보 항목)</h2>
      <ul>
        <li>
          <strong>필수 항목:</strong> 예약자 성명, 휴대폰 번호, 예약 정보(이용일·상품)
        </li>
        <li>
          <strong>결제 과정:</strong> 결제 승인 정보(결제수단, 승인번호, 결제금액 등). 카드번호 등 결제수단의 상세
          정보는 결제대행사(토스페이먼츠)가 처리하며 회사는 보관하지 않습니다.
        </li>
        <li>
          <strong>자동 생성·수집 정보:</strong> 서비스 이용 기록, 접속 로그, 예약 조회 시도 기록(휴대폰 번호·접속
          IP)
        </li>
      </ul>

      <h2>제3조 (개인정보의 보유 및 이용 기간)</h2>
      <p>
        회사는 처리 목적이 달성되면 지체 없이 개인정보를 파기합니다. 다만 관계 법령 등에 따라 다음 정보는 명시된
        기간 동안 보관합니다.
      </p>
      <table>
        <thead>
          <tr>
            <th>보존 항목</th>
            <th>근거</th>
            <th>보존 기간</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>계약 또는 청약철회 등에 관한 기록</td>
            <td>전자상거래법</td>
            <td>5년</td>
          </tr>
          <tr>
            <td>대금결제 및 재화 등의 공급에 관한 기록</td>
            <td>전자상거래법</td>
            <td>5년</td>
          </tr>
          <tr>
            <td>소비자 불만 또는 분쟁처리에 관한 기록</td>
            <td>전자상거래법</td>
            <td>3년</td>
          </tr>
          <tr>
            <td>예약 조회 시도 기록</td>
            <td>부정 조회 방지</td>
            <td>30일</td>
          </tr>
        </tbody>
      </table>

      <h2>제4조 (개인정보의 제3자 제공)</h2>
      <p>
        회사는 정보주체의 개인정보를 제1조의 목적 범위를 초과하여 이용하거나 제3자에게 제공하지 않습니다. 다만
        법령에 특별한 규정이 있거나 수사기관의 적법한 요청이 있는 경우는 예외로 합니다.
      </p>

      <h2>제5조 (개인정보 처리의 위탁)</h2>
      <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
      <table>
        <thead>
          <tr>
            <th>수탁업체</th>
            <th>위탁 업무</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>토스페이먼츠(주)</td>
            <td>결제 처리 및 결제 도용 방지</td>
          </tr>
          <tr>
            <td>솔라피(주)</td>
            <td>예약 안내 문자(SMS) 발송</td>
          </tr>
          <tr>
            <td>Supabase Inc.</td>
            <td>데이터베이스 호스팅(개인정보 보관)</td>
          </tr>
          <tr>
            <td>Vercel Inc.</td>
            <td>웹사이트 호스팅</td>
          </tr>
        </tbody>
      </table>

      <h2>제6조 (개인정보의 국외 이전)</h2>
      <p>회사는 서비스 제공을 위해 일부 개인정보 처리를 국외 사업자에게 위탁하고 있습니다.</p>
      <ul>
        <li>
          <strong>Supabase Inc.</strong> (미국) — 이전 항목: 제2조의 수집 항목 / 이전 목적: 데이터베이스 호스팅 /
          보유·이용 기간: 위탁계약 종료 또는 처리 목적 달성 시까지 / 데이터 보관 리전: 대한민국(서울)
        </li>
        <li>
          <strong>Vercel Inc.</strong> (미국) — 이전 항목: 접속 로그 등 서비스 이용 기록 / 이전 목적: 웹사이트
          호스팅 / 보유·이용 기간: 위탁계약 종료 또는 처리 목적 달성 시까지
        </li>
      </ul>

      <h2>제7조 (정보주체의 권리·의무 및 행사 방법)</h2>
      <p>
        정보주체는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구할 수 있으며, 회사는 지체 없이
        조치합니다. 권리 행사는 제10조의 개인정보 보호책임자 연락처로 요청하실 수 있습니다.
      </p>

      <h2>제8조 (개인정보의 파기)</h2>
      <p>
        보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일은 복구가 불가능한
        방법으로 영구 삭제하며, 출력물 등은 분쇄 또는 소각합니다.
      </p>

      <h2>제9조 (개인정보의 안전성 확보 조치)</h2>
      <ul>
        <li>개인정보 접근 권한의 최소화 및 접근 통제</li>
        <li>전송 구간 암호화(HTTPS) 적용</li>
        <li>결제수단 상세 정보 미보관(결제대행사 처리)</li>
        <li>예약 조회 시 휴대폰 번호와 예약번호 일치 확인 및 조회 시도 횟수 제한</li>
      </ul>

      <h2>제10조 (개인정보 보호책임자)</h2>
      <ul>
        <li>성명: 황혜진</li>
        <li>이메일: campingclub2020@naver.com</li>
      </ul>
      <p>
        기타 개인정보 침해에 대한 상담이 필요한 경우 개인정보분쟁조정위원회(1833-6972), 개인정보침해신고센터(118)
        등에 문의하실 수 있습니다.
      </p>

      <h2>제11조 (개인정보처리방침의 변경)</h2>
      <p>
        본 방침은 법령·서비스의 변경에 따라 개정될 수 있으며, 변경 시 시행일과 변경 내용을 본 페이지를 통해
        공지합니다.
      </p>
    </>
  );
}

function PrivacyEn() {
  return (
    <>
      <p>
        주식회사 에이비씨웍스글로벌 (the &lsquo;Company&rsquo;) values the personal information of data subjects and
        complies with the Personal Information Protection Act and other applicable laws of Korea. This policy explains
        what personal information the Snowy Cabana &amp; Caravan booking service collects, why it is processed and how
        long it is kept.
      </p>

      <h2>Article 1 (Purposes of Processing)</h2>
      <p>The Company processes personal information for the following purposes only and does not use it for any other purpose.</p>
      <ul>
        <li>Receiving and confirming bookings, and managing booking records</li>
        <li>Processing payments and refunds</li>
        <li>Sending text messages (SMS) such as booking confirmations and cancellations</li>
        <li>Verifying identity and preventing misuse when bookings are looked up</li>
        <li>Responding to customer inquiries and handling disputes</li>
      </ul>

      <h2>Article 2 (Personal Information Collected)</h2>
      <ul>
        <li>
          <strong>Required:</strong> name of the person booking, mobile number, booking details (date of use and product)
        </li>
        <li>
          <strong>During payment:</strong> payment approval details (payment method, approval number, amount, etc.).
          Detailed payment information such as card numbers is handled by the payment service provider (Toss Payments)
          and is not stored by the Company.
        </li>
        <li>
          <strong>Generated or collected automatically:</strong> service usage records, access logs, and booking lookup
          attempts (mobile number and IP address)
        </li>
      </ul>

      <h2>Article 3 (Retention Period)</h2>
      <p>
        The Company destroys personal information without delay once the purpose of processing has been achieved.
        However, the following information is kept for the periods stated, as required by law.
      </p>
      <table>
        <thead>
          <tr>
            <th>Record</th>
            <th>Basis</th>
            <th>Retention</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Records of contracts or withdrawal of offers</td>
            <td>Act on Consumer Protection in Electronic Commerce</td>
            <td>5 years</td>
          </tr>
          <tr>
            <td>Records of payment and supply of goods or services</td>
            <td>Act on Consumer Protection in Electronic Commerce</td>
            <td>5 years</td>
          </tr>
          <tr>
            <td>Records of consumer complaints or dispute handling</td>
            <td>Act on Consumer Protection in Electronic Commerce</td>
            <td>3 years</td>
          </tr>
          <tr>
            <td>Booking lookup attempts</td>
            <td>Preventing misuse of lookups</td>
            <td>30 days</td>
          </tr>
        </tbody>
      </table>

      <h2>Article 4 (Provision to Third Parties)</h2>
      <p>
        The Company does not use personal information beyond the purposes in Article 1 or provide it to third parties,
        except where specifically required by law or upon a lawful request from an investigative authority.
      </p>

      <h2>Article 5 (Outsourcing of Processing)</h2>
      <p>To provide the Service smoothly, the Company outsources the following processing work.</p>
      <table>
        <thead>
          <tr>
            <th>Contractor</th>
            <th>Work</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Toss Payments Co., Ltd.</td>
            <td>Payment processing and fraud prevention</td>
          </tr>
          <tr>
            <td>Solapi Inc.</td>
            <td>Sending booking text messages (SMS)</td>
          </tr>
          <tr>
            <td>Supabase Inc.</td>
            <td>Database hosting (storage of personal information)</td>
          </tr>
          <tr>
            <td>Vercel Inc.</td>
            <td>Website hosting</td>
          </tr>
        </tbody>
      </table>

      <h2>Article 6 (Transfer Abroad)</h2>
      <p>To provide the Service, the Company entrusts some processing of personal information to companies outside Korea.</p>
      <ul>
        <li>
          <strong>Supabase Inc.</strong> (USA) — Information transferred: the items in Article 2 / Purpose: database
          hosting / Retention: until the outsourcing contract ends or the purpose is achieved / Data region: Seoul,
          Republic of Korea
        </li>
        <li>
          <strong>Vercel Inc.</strong> (USA) — Information transferred: service usage records such as access logs /
          Purpose: website hosting / Retention: until the outsourcing contract ends or the purpose is achieved
        </li>
      </ul>

      <h2>Article 7 (Rights of Data Subjects and How to Exercise Them)</h2>
      <p>
        Data subjects may at any time request access to, correction or deletion of, or suspension of processing of
        their personal information, and the Company will act without delay. Requests can be made to the Privacy Officer
        listed in Article 10.
      </p>

      <h2>Article 8 (Destruction)</h2>
      <p>
        Personal information whose retention period has expired or whose purpose has been achieved is destroyed without
        delay. Electronic files are permanently deleted in a way that cannot be recovered, and printed materials are
        shredded or incinerated.
      </p>

      <h2>Article 9 (Security Measures)</h2>
      <ul>
        <li>Minimizing and controlling access to personal information</li>
        <li>Encryption in transit (HTTPS)</li>
        <li>No storage of detailed payment information (handled by the payment service provider)</li>
        <li>Matching of mobile number and booking number, and a limit on lookup attempts</li>
      </ul>

      <h2>Article 10 (Privacy Officer)</h2>
      <ul>
        <li>Name: 황혜진</li>
        <li>Email: campingclub2020@naver.com</li>
      </ul>
      <p>
        For other advice on privacy violations, you may contact the Personal Information Dispute Mediation Committee
        (+82-1833-6972) or the Personal Information Infringement Report Center (118).
      </p>

      <h2>Article 11 (Changes to This Policy)</h2>
      <p>
        This policy may be revised following changes in law or the Service. Any change will be announced on this page
        together with its effective date.
      </p>
    </>
  );
}
