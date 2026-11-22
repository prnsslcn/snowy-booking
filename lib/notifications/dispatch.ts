import 'server-only';

import { getNotificationSender, type NotificationSender } from '@/lib/notifications';
import { buildCustomerMessage, type MessageExtra } from '@/lib/notifications/messages';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * 온라인 예약 확정/취소 시 고객에게 문자 발송 + 이력 기록.
 * 관리자 문자는 보내지 않는다(2026-11-23 운영자 결정 — 관리자 화면에서 확인). 전 과정 best-effort — 실패가 예약·환불을 되돌리지 않는다.
 */
export async function dispatchBookingNotification(
  supabase: AdminClient,
  bookingId: string,
  type: 'confirm' | 'cancel',
  extra: MessageExtra = {},
): Promise<void> {
  try {
    const { data } = await supabase
      .from('bookings')
      .select('source, lookup_code, guest_name, guest_phone, guest_count, amount, date, price_snapshot')
      .eq('id', bookingId)
      .maybeSingle();
    if (!data || data.source !== 'online') return;

    const snapshot = (data.price_snapshot ?? {}) as { type_name?: string };
    const text = buildCustomerMessage(
      type,
      {
        lookupCode: data.lookup_code,
        guestName: data.guest_name,
        guestPhone: data.guest_phone,
        guestCount: data.guest_count,
        amount: data.amount,
        typeName: snapshot.type_name ?? '',
        dateIso: data.date,
      },
      extra,
    );

    const sender = getNotificationSender();
    if (data.guest_phone) {
      await sendAndRecord(supabase, sender, bookingId, type, data.guest_phone, text);
    }
  } catch {
    // best-effort
  }
}

async function sendAndRecord(
  supabase: AdminClient,
  sender: NotificationSender,
  bookingId: string,
  type: 'confirm' | 'cancel',
  to: string,
  text: string,
): Promise<void> {
  try {
    const result = await sender.send({ bookingId, to, type, channel: 'sms', payload: { recipient: 'customer', text } });
    await supabase.from('notifications').insert({
      booking_id: bookingId,
      type,
      channel: 'sms',
      recipient: 'customer',
      status: result.status,
      sent_at: result.status === 'sent' ? new Date().toISOString() : null,
      payload: { to, text, providerResponse: result.providerResponse } as Json,
    });
  } catch {
    // best-effort
  }
}
