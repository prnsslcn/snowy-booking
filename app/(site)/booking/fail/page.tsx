import type { Metadata } from 'next';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { releasePendingBooking } from '@/lib/booking/reserve';

export const metadata: Metadata = { title: '결제 실패' };

const FAIL_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: '결제를 취소하셨습니다.',
  PAY_PROCESS_ABORTED: '결제가 중단되었습니다. 다시 시도해 주세요.',
  REJECT_CARD_COMPANY: '카드사에서 결제를 거절했습니다. 다른 카드로 시도해 주세요.',
  INVALID_CARD_EXPIRATION: '카드 유효기간을 확인해 주세요.',
  EXCEED_MAX_DAILY_PAYMENT_COUNT: '하루 결제 가능 횟수를 넘었습니다.',
  NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT: '할부가 지원되지 않는 카드입니다.',
};

/** 토스 결제 실패·취소 리다이렉트. 선점한 자리를 즉시 반환한다(pending 만 취소, 멱등). */
export const dynamic = 'force-dynamic';

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string; orderId?: string }>;
}) {
  const { code, orderId } = await searchParams;
  if (orderId) await releasePendingBooking(orderId);
  // 주소에 붙은 문구를 그대로 보여 주지 않는다(조작된 링크로 엉뚱한 안내가 뜨지 않게) — 알려진 코드만 우리 문구로
  const message = (code && FAIL_MESSAGES[code]) || '결제가 취소되었거나 실패했습니다.';

  return (
    <SubPage display="Not paid" sub="결제가 완료되지 않았습니다">
      <p className="text-[15px] text-ink/70">{message}</p>
      <p className="mt-1 text-[13px] text-ink/50">결제된 금액은 없습니다.</p>
      <TLink href="/booking" className={buttonClass('primary', 'block', 'mt-10')}>
        다시 예약하기
      </TLink>
    </SubPage>
  );
}
