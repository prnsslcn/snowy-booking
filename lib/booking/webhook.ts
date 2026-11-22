import 'server-only';

import { settlePayment } from '@/lib/booking/confirm';
import { getTossClient, type TossClient } from '@/lib/payments/toss';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/**
 * 토스 웹훅(PAYMENT_STATUS_CHANGED) 안전망 — grill-booking 이식.
 * 본문은 서명이 없어 신뢰하지 않고, paymentKey 로 토스 원천을 재조회한다.
 * 외부 취소(토스 대시보드 직접 취소 등)로 CANCELED/PARTIAL_CANCELED 가 되면 DB 를 맞춘다.
 * DONE(결제 완료)인데 우리 쪽 결제 기록이 없으면(승인 응답 유실·시간 초과) 확정하거나, 확정할 수 없으면 환불한다.
 * 우리 주문이 아닌 요청은 토스를 부르지 않고 버린다(무작위 요청으로 시크릿 키 호출량을 쓰지 않게).
 *
 * snowy 의 finalize_refund_tx 는 cancel_requested 에서만 동작하므로
 * request_cancel_tx(admin_override) 로 먼저 전이시킨 뒤 확정한다(멱등).
 */
export async function syncPaymentFromWebhook(
  paymentKey: string,
  orderId: string | null,
  toss: TossClient = getTossClient(),
): Promise<void> {
  if (!paymentKey) return;
  const supabase = createAdminClient();

  // 우리 주문인지 먼저(결제 기록의 결제키 또는 예약의 주문번호)
  const [{ data: known }, { data: order }] = await Promise.all([
    supabase.from('payments').select('id').eq('toss_payment_key', paymentKey).limit(1).maybeSingle(),
    orderId ? supabase.from('bookings').select('id').eq('order_id', orderId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!known && !order) return;

  const result = await toss.get(paymentKey);

  if (result.status === 'DONE') {
    if (known || !orderId || result.orderId !== orderId) return; // 이미 반영됐거나 주문 불일치
    try {
      await settlePayment(supabase, toss, orderId, result);
    } catch {
      // 확정 불가면 settlePayment 가 보상 취소까지 함
    }
    return;
  }
  if (result.status !== 'CANCELED' && result.status !== 'PARTIAL_CANCELED') return;

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
