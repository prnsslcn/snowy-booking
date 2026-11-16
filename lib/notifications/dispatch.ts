import 'server-only';

import { serverEnv } from '@/lib/env';
import { getNotificationSender, type NotificationSender } from '@/lib/notifications';
import { buildMessages, type MessageExtra } from '@/lib/notifications/messages';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * 온라인 예약 확정/취소 시 고객 + 관리자(ADMIN_NOTIFY_PHONES) 발송 + 이력 기록.
 * 유선·무상 예약은 호출하지 않는다(운영자 결정). 전 과정 best-effort — 실패가 예약·환불을 되돌리지 않는다.
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
    const { customer, admin } = buildMessages(
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
      await sendAndRecord(supabase, sender, bookingId, type, 'customer', data.guest_phone, customer);
    }
    for (const phone of serverEnv.adminNotifyPhones) {
      await sendAndRecord(supabase, sender, bookingId, type, 'admin', phone, admin);
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
  recipient: 'customer' | 'admin',
  to: string,
  text: string,
): Promise<void> {
  try {
    const result = await sender.send({ bookingId, to, type, channel: 'sms', payload: { recipient, text } });
    await supabase.from('notifications').insert({
      booking_id: bookingId,
      type,
      channel: 'sms',
      recipient,
      status: result.status,
      sent_at: result.status === 'sent' ? new Date().toISOString() : null,
      payload: { to, text, providerResponse: result.providerResponse } as Json,
    });
  } catch {
    // best-effort
  }
}
