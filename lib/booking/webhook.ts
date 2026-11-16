import 'server-only';

import { getTossClient, type TossClient } from '@/lib/payments/toss';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/**
 * 토스 웹훅(PAYMENT_STATUS_CHANGED) 안전망 — grill-booking 이식.
 * 본문은 서명이 없어 신뢰하지 않고, paymentKey 로 토스 원천을 재조회한다.
 * 외부 취소(토스 대시보드 직접 취소 등)로 CANCELED/PARTIAL_CANCELED 가 되면 DB 를 맞춘다.
 *
 * snowy 의 finalize_refund_tx 는 cancel_requested 에서만 동작하므로
 * request_cancel_tx(admin_override) 로 먼저 전이시킨 뒤 확정한다(멱등).
 */
export async function syncPaymentFromWebhook(
  paymentKey: string,
  toss: TossClient = getTossClient(),
): Promise<void> {
  if (!paymentKey) return;

  const result = await toss.get(paymentKey);
  if (result.status !== 'CANCELED' && result.status !== 'PARTIAL_CANCELED') return;

  const supabase = createAdminClient();
  const { data: pay } = await supabase
    .from('payments')
    .select('booking_id, status, toss_order_id')
    .eq('toss_payment_key', paymentKey)
    .eq('status', 'paid')
    .maybeSingle();
  if (!pay) return; // 우리 결제가 아니거나 이미 반영됨

  const { error: reqError } = await supabase.rpc('request_cancel_tx', {
    p_order_id: pay.toss_order_id,
    p_admin_override: true,
  });
  if (reqError) return;

  await supabase.rpc('finalize_refund_tx', {
    p_booking_id: pay.booking_id,
    p_refund_amount: result.totalAmount - result.balanceAmount,
    p_refund_method: 'toss',
    p_is_partial: result.status === 'PARTIAL_CANCELED',
    p_raw: result.raw as Json,
  });
}
