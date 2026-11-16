/**
 * 알림(문자) 추상화 레이어 (grill-booking 이식). 비즈니스 로직은 이 인터페이스에만 의존한다.
 * 구현체: Solapi SMS(lib/notifications/providers/solapi.ts) / noop.
 */

import { solapiSender } from '@/lib/notifications/providers/solapi';

export type NotificationType = 'confirm' | 'cancel';
export type NotificationChannel = 'sms' | 'kakao_alimtalk';

export interface SendNotificationInput {
  bookingId: string;
  to: string;
  type: NotificationType;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
}

export interface SendNotificationResult {
  status: 'sent' | 'failed' | 'skipped';
  providerResponse?: unknown;
}

export interface NotificationSender {
  send(input: SendNotificationInput): Promise<SendNotificationResult>;
}

/** 발송하지 않고 이력만 남기는 구현체(키 미설정·발송 정지 시). */
export const noopSender: NotificationSender = {
  async send() {
    return { status: 'skipped', providerResponse: { noop: true } };
  },
};

/** SOLAPI_* 가 모두 있으면 실제 발송, 아니면 noop. NOTIFICATIONS_DISABLED=1 이면 항상 noop. */
export function getNotificationSender(): NotificationSender {
  if (process.env.NOTIFICATIONS_DISABLED === '1') return noopSender;
  if (process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SOLAPI_SENDER) {
    return solapiSender;
  }
  return noopSender;
}
