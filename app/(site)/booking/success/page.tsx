'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useLocale } from '@/components/site/LocaleProvider';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { errorMessage } from '@/lib/booking/error-messages';
import { PayError, confirmPaymentClient } from '@/lib/client/pay';
import { tr } from '@/lib/i18n';

/** 토스 성공 리다이렉트 → 서버 승인 재검증 → 완료 페이지. */
export default function PaymentSuccessPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const started = useRef(false);
  const locale = useLocale();
  const t = tr(locale);

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
      // 오류 코드만 기억하고 문구는 그릴 때 언어에 맞게
      setError(code || 'FAILED');
    });
  }, [router]);

  const message =
    error === 'INVALID'
      ? t('결제 정보가 올바르지 않습니다.', 'The payment details are invalid.')
      : error === 'BOOKING_NOT_PENDING' || error === 'AMOUNT_MISMATCH' || error === 'PAYMENT_NOT_COMPLETED' || error === 'METHOD_NOT_ALLOWED'
        ? errorMessage(error, locale)
        : t('결제 승인에 실패했습니다. 결제가 이뤄졌다면 자동으로 취소됩니다.', 'We couldn’t approve the payment. If you were charged, it will be cancelled automatically.');

  return !error ? (
    <SubPage display="Confirming" sub={t('결제 확인 중', 'Confirming your payment')}>
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-ink [animation-duration:700ms]" />
        <p className="text-[15px] text-ink/70">{t('창을 닫지 마세요.', 'Please don’t close this window.')}</p>
      </div>
    </SubPage>
  ) : (
    <SubPage display="Not paid" sub={t('결제를 완료하지 못했습니다', 'The payment was not completed')}>
      <p className="text-[15px] text-ink/70">{message}</p>
      <TLink href="/booking" className={buttonClass('primary', 'block', 'mt-10')}>
        {t('다시 예약하기', 'Book Again')}
      </TLink>
    </SubPage>
  );
}
