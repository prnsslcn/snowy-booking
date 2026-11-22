/**
 * 문자 문구 (순수 함수). 유닛 번호는 현장 배정이라 고객 문자에 넣지 않는다.
 */

import { formatDateKorean, formatWon } from '@/lib/format';
import {
  CONTACT_PHONE,
  REFUND_SUMMARY,
  SMS_BRAND,
  TICKET_NOTICE,
  USAGE_TIME,
  siteUrl,
} from '@/lib/site-config';

export interface BookingInfo {
  lookupCode: string | null;
  guestName: string;
  guestPhone: string | null;
  /** 온라인 예약은 인원을 받지 않아 null */
  guestCount: number | null;
  amount: number;
  typeName: string;
  dateIso: string;
}

export interface MessageExtra {
  /** 취소 시 실제 환불 금액(원). 0이면 규정상 환불 없음. */
  refundedAmount?: number;
}

function tail(): string[] {
  const lines: string[] = [];
  const url = siteUrl();
  if (url) lines.push(`예약 조회·취소: ${url}/booking/lookup`);
  if (CONTACT_PHONE) lines.push(`문의 ${CONTACT_PHONE}`);
  return lines;
}

/** 고객 문자 문구. 관리자 문자는 보내지 않는다(2026-11-23 운영자 결정 — 관리자 화면에서 확인). */
export function buildCustomerMessage(
  type: 'confirm' | 'cancel',
  info: BookingInfo,
  extra: MessageExtra = {},
): string {
  const when = `${formatDateKorean(info.dateIso)} ${USAGE_TIME}`;
  const code = info.lookupCode ?? '-';

  if (type === 'confirm') {
    return [
      `[${SMS_BRAND}] 예약이 확정되었습니다.`,
      `예약번호 ${code}`,
      `${info.guestName}님 · ${info.typeName}${info.guestCount ? ` ${info.guestCount}인` : ''}`,
      `이용 ${when}`,
      `결제 ${formatWon(info.amount)}`,
      '',
      '예약 조회·취소 시 휴대폰 번호와 예약번호(4자리)가 필요합니다.',
      `취소 규정: ${REFUND_SUMMARY}`,
      `※ ${TICKET_NOTICE}`,
      ...tail(),
    ].join('\n');
  }

  const refunded = extra.refundedAmount ?? 0;
  const refundLine =
    refunded > 0
      ? `환불 ${formatWon(refunded)} (카드사에 따라 영업일 기준 3~5일 소요)`
      : '취소 규정에 따라 환불 금액이 없습니다.';
  return [
    `[${SMS_BRAND}] 예약이 취소되었습니다.`,
    `예약번호 ${code}`,
    `${info.typeName} · ${formatDateKorean(info.dateIso)}`,
    refundLine,
    ...tail(),
  ].join('\n');
}
