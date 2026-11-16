import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk';

/**
 * 토스 결제창(v2 payment) 호출 — grill-booking 이식.
 * 성공 시 successUrl(paymentKey·orderId·amount) → 서버 confirm 재검증.
 * 실패·취소 시 failUrl(?orderId 포함) → 선점 즉시 반환.
 */
export async function requestTossPayment(params: {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerMobilePhone?: string;
}): Promise<void> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY 가 설정되지 않았습니다.');

  const tossPayments = await loadTossPayments(clientKey);
  const payment = tossPayments.payment({ customerKey: ANONYMOUS });
  const origin = window.location.origin;

  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: params.amount },
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl: `${origin}/booking/success`,
    failUrl: `${origin}/booking/fail?orderId=${encodeURIComponent(params.orderId)}`,
    customerName: params.customerName,
    ...(params.customerMobilePhone ? { customerMobilePhone: params.customerMobilePhone } : {}),
    card: { useEscrow: false, flowMode: 'DEFAULT', useCardPoint: false, useAppCardOnly: false },
  });
}
