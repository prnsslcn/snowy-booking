import 'server-only';

import { serverEnv } from '@/lib/env';
import { PaymentError } from '@/lib/payments/errors';
import { fakeTossClient } from '@/lib/payments/fake';
import type {
  CancelPaymentInput,
  ConfirmPaymentInput,
  TossPaymentResult,
} from '@/lib/payments/types';

/**
 * 토스페이먼츠 서버 API 클라이언트 (grill-booking 이식). 시크릿 키는 lib/env.ts(server-only).
 * 비프로덕션 + TOSS_FAKE=1 이면 fake 구현체로 교체된다.
 */

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

export interface TossClient {
  confirm(input: ConfirmPaymentInput): Promise<TossPaymentResult>;
  cancel(input: CancelPaymentInput): Promise<TossPaymentResult>;
  /** 결제 단건 조회 — 환불 사전 조회·웹훅 재확인용. */
  get(paymentKey: string): Promise<TossPaymentResult>;
}

function authHeader(): string {
  const token = Buffer.from(`${serverEnv.tossSecretKey}:`).toString('base64');
  return `Basic ${token}`;
}

function parseResult(body: Record<string, unknown>): TossPaymentResult {
  return {
    paymentKey: String(body.paymentKey ?? ''),
    orderId: String(body.orderId ?? ''),
    status: String(body.status ?? ''),
    totalAmount: Number(body.totalAmount ?? 0),
    balanceAmount: Number(body.balanceAmount ?? body.totalAmount ?? 0),
    method: body.method != null ? String(body.method) : null,
    approvedAt: body.approvedAt != null ? String(body.approvedAt) : null,
    raw: body,
  };
}

async function call(path: string, init: RequestInit): Promise<TossPaymentResult> {
  const res = await fetch(`${TOSS_API_BASE}${path}`, {
    ...init,
    // 응답이 오지 않으면 끊는다(서버 함수 시간 초과로 결제만 되고 예약이 안 되는 일 방지 — 승인은 호출 쪽에서 원천 재조회로 복구)
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json', ...init.headers },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // 토스 에러 코드·사유를 그대로 보존(관리자 화면 표시용)
    const tossCode = body.code != null ? String(body.code) : null;
    const msg = String(body.message ?? `HTTP ${res.status}`);
    throw new PaymentError('TOSS_API_FAILED', tossCode ? `[${tossCode}] ${msg}` : msg, tossCode);
  }
  return parseResult(body);
}

export const realTossClient: TossClient = {
  confirm(input) {
    return call('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: input.amount,
      }),
    });
  },
  cancel(input) {
    // 멱등키는 실패 응답까지 캐시될 수 있어 사용하지 않는다 — 이중 취소 방지는 사전 조회(get)가 담당.
    return call(`/payments/${encodeURIComponent(input.paymentKey)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({
        cancelReason: input.cancelReason,
        ...(input.cancelAmount != null ? { cancelAmount: input.cancelAmount } : {}),
      }),
    });
  },
  get(paymentKey) {
    return call(`/payments/${encodeURIComponent(paymentKey)}`, { method: 'GET' });
  },
};

/** 프로덕션은 항상 real. */
export function getTossClient(): TossClient {
  if (process.env.NODE_ENV !== 'production' && process.env.TOSS_FAKE === '1') {
    return fakeTossClient;
  }
  return realTossClient;
}
