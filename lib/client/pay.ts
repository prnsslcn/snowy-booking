/**
 * 클라이언트 결제 헬퍼 (grill-booking 이식).
 *  - fake 모드(NEXT_PUBLIC_PAYMENTS_FAKE=1): reserve → confirm 직호출
 *  - real 모드: reserve → 토스 결제창 → /booking/success 에서 confirm
 */

export const PAYMENTS_FAKE = process.env.NEXT_PUBLIC_PAYMENTS_FAKE === '1';

export interface ReserveRequest {
  type: string;
  date: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  agreed: boolean;
}

export interface ReserveResponse {
  orderId: string;
  amount: number;
  orderName: string;
  expiresAt: string;
}

export class PayError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

async function postJson<T>(url: string, body: unknown, fallbackCode: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new PayError(json.error ?? fallbackCode);
  return json;
}

export function reserveClient(req: ReserveRequest): Promise<ReserveResponse> {
  return postJson<ReserveResponse>('/api/bookings/reserve', req, 'RESERVE_FAILED');
}

export function confirmPaymentClient(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<{ orderId: string; lookupCode: string | null }> {
  return postJson('/api/payments/confirm', input, 'CONFIRM_FAILED');
}

export async function releaseClient(orderId: string): Promise<void> {
  await fetch('/api/bookings/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  }).catch(() => {});
}

/** fake 모드: 선점 → fake 승인. */
export async function payAndConfirmFake(req: ReserveRequest): Promise<{ orderId: string }> {
  const r = await reserveClient(req);
  await confirmPaymentClient({ paymentKey: `fakepay_${r.orderId}`, orderId: r.orderId, amount: r.amount });
  return { orderId: r.orderId };
}
