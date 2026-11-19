import type { Metadata } from 'next';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { releasePendingBooking } from '@/lib/booking/reserve';

export const metadata: Metadata = { title: '결제 실패' };

/** 토스 결제 실패·취소 리다이렉트. 선점한 자리를 즉시 반환한다(pending 만 취소, 멱등). */
export const dynamic = 'force-dynamic';

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string; orderId?: string }>;
}) {
  const { message, orderId } = await searchParams;
  if (orderId) await releasePendingBooking(orderId);

  return (
    <SubPage display="Not paid" sub="결제가 완료되지 않았습니다">
      <p className="text-[15px] text-[#0a0a0a]/70">{message ?? '결제가 취소되었거나 실패했습니다.'}</p>
      <p className="mt-1 text-[13px] text-[#0a0a0a]/50">결제된 금액은 없습니다.</p>
      <TLink href="/booking" className={buttonClass('primary', 'block', 'mt-10')}>
        다시 예약하기
      </TLink>
    </SubPage>
  );
}
