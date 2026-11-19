'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
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

  return !error ? (
    <SubPage display="Confirming" sub="결제 확인 중">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-ink [animation-duration:700ms]" />
        <p className="text-[15px] text-ink/70">창을 닫지 마세요.</p>
      </div>
    </SubPage>
  ) : (
    <SubPage display="Not paid" sub="결제를 완료하지 못했습니다">
      <p className="text-[15px] text-ink/70">{error}</p>
      <TLink href="/booking" className={buttonClass('primary', 'block', 'mt-10')}>
        다시 예약하기
      </TLink>
    </SubPage>
  );
}
