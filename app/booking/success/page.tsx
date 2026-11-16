'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { PageShell } from '@/components/site/PageShell';
import { ButtonLink } from '@/components/ui/Button';
import { errorMessage } from '@/lib/booking/error-messages';
import { PayError, confirmPaymentClient } from '@/lib/client/pay';

/** 토스 성공 리다이렉트 → 서버 승인 재검증 → 완료 페이지. */
export default function PaymentSuccessPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode 이중 실행 방지(서버는 멱등)
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
        <div className="enter">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-accent [animation-duration:700ms]" />
          <p className="mt-6 text-[17px] font-semibold">결제를 확인하고 있어요</p>
          <p className="mt-1 text-[14px] text-muted">창을 닫지 말고 잠시만 기다려 주세요.</p>
        </div>
      ) : (
        <div className="enter w-full">
          <h1 className="text-[22px] font-bold">결제를 완료하지 못했어요</h1>
          <p className="mt-2 text-[15px] text-muted">{error}</p>
          <ButtonLink href="/booking" size="lg" className="mt-8">
            다시 예약하기
          </ButtonLink>
        </div>
      )}
    </PageShell>
  );
}
