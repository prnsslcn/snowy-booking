import Link from 'next/link';

import { PageShell } from '@/components/site/PageShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
      <Card className="w-full p-6">
        <h1 className="text-lg font-bold text-ink">결제가 완료되지 않았습니다</h1>
        <p className="mt-2 text-sm text-muted">{message ?? '결제가 취소되었거나 실패했습니다.'}</p>
        <Link href="/booking" className="mt-5 block">
          <Button size="lg">다시 예약하기</Button>
        </Link>
      </Card>
    </PageShell>
  );
}
