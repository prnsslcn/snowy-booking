'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { PageShell } from '@/components/site/PageShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { errorMessage } from '@/lib/booking/error-messages';
import { PayError, confirmPaymentClient } from '@/lib/client/pay';

/** 토스 성공 리다이렉트 → 서버 승인 재검증 → 완료 페이지. */
export default function PaymentSuccessPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode 이중 실행 방지(서버는 멱등이지만 불필요한 호출 차단)
    started.current = true;
    const run = async () => {
      const p = new URLSearchParams(window.location.search);
      const paymentKey = p.get('paymentKey');
      const orderId = p.get('orderId');
      const amount = Number(p.get('amount'));
      if (!paymentKey || !orderId || !Number.isInteger(amount)) throw new PayError('INVALID');
      await confirmPaymentClient({ paymentKey, orderId, amount });
      router.replace(`/booking/complete?o=${encodeURIComponent(orderId)}`);
    };
    run().catch((e: unknown) => {
      const code = e instanceof PayError ? e.code : '';
      setError(
        code === 'INVALID'
          ? '결제 정보가 올바르지 않습니다.'
          : code === 'BOOKING_NOT_PENDING' || code === 'AMOUNT_MISMATCH'
            ? errorMessage(code)
            : '결제 승인에 실패했습니다. 결제가 이뤄졌다면 자동으로 취소됩니다.',
      );
    });
  }, [router]);

  return (
    <PageShell center>
      {!error ? (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="mt-5 text-muted">결제를 확인하고 있습니다…</p>
        </>
      ) : (
        <Card className="w-full p-6">
          <h1 className="text-lg font-bold text-ink">결제를 완료하지 못했습니다</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <Link href="/booking" className="mt-5 block">
            <Button size="lg">다시 예약하기</Button>
          </Link>
        </Card>
      )}
    </PageShell>
  );
}
