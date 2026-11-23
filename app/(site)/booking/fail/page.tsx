import type { Metadata } from 'next';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { releasePendingBooking } from '@/lib/booking/reserve';
import { tr } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getLocale()) === 'en' ? 'Payment Not Completed' : '결제 실패' };
}

const FAIL_MESSAGES: Record<string, [string, string]> = {
  PAY_PROCESS_CANCELED: ['결제를 취소하셨습니다.', 'You cancelled the payment.'],
  PAY_PROCESS_ABORTED: ['결제가 중단되었습니다. 다시 시도해 주세요.', 'The payment was interrupted. Please try again.'],
  REJECT_CARD_COMPANY: ['카드사에서 결제를 거절했습니다. 다른 카드로 시도해 주세요.', 'Your card issuer declined the payment. Please try another card.'],
  INVALID_CARD_EXPIRATION: ['카드 유효기간을 확인해 주세요.', 'Please check your card’s expiry date.'],
  EXCEED_MAX_DAILY_PAYMENT_COUNT: ['하루 결제 가능 횟수를 넘었습니다.', 'You have reached the daily payment limit.'],
  NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT: ['할부가 지원되지 않는 카드입니다.', 'Installments are not supported for this card.'],
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
  const t = tr(await getLocale());
  const known = code ? FAIL_MESSAGES[code] : undefined;
  const message = known ? t(known[0], known[1]) : t('결제가 취소되었거나 실패했습니다.', 'The payment was cancelled or failed.');

  return (
    <SubPage display="Not paid" sub={t('결제가 완료되지 않았습니다', 'The payment was not completed')}>
      <p className="text-[15px] text-ink/70">{message}</p>
      <p className="mt-1 text-[13px] text-ink/50">{t('결제된 금액은 없습니다.', 'You have not been charged.')}</p>
      <TLink href="/booking" className={buttonClass('primary', 'block', 'mt-10')}>
        {t('다시 예약하기', 'Book Again')}
      </TLink>
    </SubPage>
  );
}
