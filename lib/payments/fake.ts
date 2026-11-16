import 'server-only';

import { PaymentError } from '@/lib/payments/errors';
import type { TossClient } from '@/lib/payments/toss';
import type { TossPaymentResult } from '@/lib/payments/types';

/**
 * 개발용 fake 토스 클라이언트 (비프로덕션 + TOSS_FAKE=1).
 *
 * grill-booking 대비 개선: 결제별 취소 누계를 메모리에 기억해 get()이 실제처럼
 * DONE / PARTIAL_CANCELED / CANCELED 를 돌려준다 → 환불 재시도·사전 조회 분기를 로컬에서 검증 가능.
 *
 * 실패 시뮬레이션: cancelReason 에 '[FAIL:CODE]' 를 넣으면 그 토스 코드로 취소 실패
 *   (예: '[FAIL:EXCEED_CANCEL_LIMIT]').
 */

interface FakePayment {
  orderId: string;
  total: number;
  canceled: number;
}

// 라우트별 번들이 모듈을 따로 로드해도 같은 저장소를 보도록 globalThis 에 둔다.
const g = globalThis as typeof globalThis & { __snowyFakeToss?: Map<string, FakePayment> };
const store = (g.__snowyFakeToss ??= new Map<string, FakePayment>());

function result(paymentKey: string, p: FakePayment | undefined, extra: Record<string, unknown>): TossPaymentResult {
  const total = p?.total ?? 0;
  const canceled = p?.canceled ?? 0;
  const status = !p ? 'DONE' : canceled === 0 ? 'DONE' : canceled >= total ? 'CANCELED' : 'PARTIAL_CANCELED';
  return {
    paymentKey,
    orderId: p?.orderId ?? '',
    status,
    totalAmount: total,
    balanceAmount: total - canceled,
    method: '간편결제',
    approvedAt: new Date().toISOString(),
    raw: { fake: true, status, totalAmount: total, balanceAmount: total - canceled, ...extra },
  };
}

export const fakeTossClient: TossClient = {
  async confirm(input) {
    store.set(input.paymentKey, { orderId: input.orderId, total: input.amount, canceled: 0 });
    return result(input.paymentKey, store.get(input.paymentKey), { confirm: true });
  },

  async cancel(input) {
    const fail = /\[FAIL:([A-Z_]+)\]/.exec(input.cancelReason);
    if (fail) {
      throw new PaymentError('TOSS_API_FAILED', `[${fail[1]}] fake 취소 실패`, fail[1]);
    }
    const p = store.get(input.paymentKey) ?? { orderId: '', total: input.cancelAmount ?? 0, canceled: 0 };
    const amount = input.cancelAmount ?? p.total - p.canceled;
    p.canceled = Math.min(p.total, p.canceled + amount);
    store.set(input.paymentKey, p);
    return result(input.paymentKey, p, { cancelAmount: amount });
  },

  async get(paymentKey) {
    return result(paymentKey, store.get(paymentKey), { get: true });
  },
};
