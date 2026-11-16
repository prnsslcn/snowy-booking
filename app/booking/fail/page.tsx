import { PageShell } from '@/components/site/PageShell';
import { ButtonLink } from '@/components/ui/Button';
import { releasePendingBooking } from '@/lib/booking/reserve';

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
    <PageShell center>
      <div className="enter w-full">
        <h1 className="text-[22px] font-bold">결제가 완료되지 않았어요</h1>
        <p className="mt-2 text-[15px] text-muted">{message ?? '결제가 취소되었거나 실패했습니다.'}</p>
        <p className="mt-1 text-[13px] text-subtle">결제된 금액은 없습니다. 다시 예약해 주세요.</p>
        <ButtonLink href="/booking" size="lg" className="mt-8">
          다시 예약하기
        </ButtonLink>
      </div>
    </PageShell>
  );
}
