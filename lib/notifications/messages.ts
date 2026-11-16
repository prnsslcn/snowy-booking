/**
 * 문자 문구 (순수 함수). 유닛 번호는 현장 배정이라 고객 문자에 넣지 않는다.
 */

import { formatDateKorean, formatPhone, formatWon } from '@/lib/format';
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
  guestCount: number;
  amount: number;
  typeName: string;
  dateIso: string;
}

export interface MessageExtra {
  /** 취소 시 실제 환불 금액(원). 0이면 규정상 환불 없음. */
  refundedAmount?: number;
}

export interface RenderedMessages {
  customer: string;
  admin: string;
}

function tail(): string[] {
  const lines: string[] = [];
  const url = siteUrl();
  if (url) lines.push(`예약 조회·취소: ${url}/booking/lookup`);
  if (CONTACT_PHONE) lines.push(`문의 ${CONTACT_PHONE}`);
  return lines;
}

export function buildMessages(
  type: 'confirm' | 'cancel',
  info: BookingInfo,
  extra: MessageExtra = {},
): RenderedMessages {
  const when = `${formatDateKorean(info.dateIso)} ${USAGE_TIME}`;
  const code = info.lookupCode ?? '-';
  const phone = info.guestPhone ? formatPhone(info.guestPhone) : '-';

  if (type === 'confirm') {
    return {
      customer: [
        `[${SMS_BRAND}] 예약이 확정되었습니다.`,
        `예약번호 ${code}`,
        `${info.guestName}님 · ${info.typeName} ${info.guestCount}인`,
        `이용 ${when}`,
        `결제 ${formatWon(info.amount)}`,
        '',
        '예약 조회·취소 시 휴대폰 번호와 예약번호(4자리)가 필요합니다.',
        `취소 규정: ${REFUND_SUMMARY}`,
        `※ ${TICKET_NOTICE}`,
        ...tail(),
      ].join('\n'),
      admin: `[예약확정] ${formatDateKorean(info.dateIso)} ${info.typeName} ${info.guestCount}인\n${info.guestName} ${phone} #${code}\n${formatWon(info.amount)}`,
    };
  }

  const refunded = extra.refundedAmount ?? 0;
  const refundLine =
    refunded > 0
      ? `환불 ${formatWon(refunded)} (카드사에 따라 영업일 기준 3~5일 소요)`
      : '취소 규정에 따라 환불 금액이 없습니다.';
  return {
    customer: [
      `[${SMS_BRAND}] 예약이 취소되었습니다.`,
      `예약번호 ${code}`,
      `${info.typeName} · ${formatDateKorean(info.dateIso)}`,
      refundLine,
      ...tail(),
    ].join('\n'),
    admin: `[예약취소] ${formatDateKorean(info.dateIso)} ${info.typeName}\n${info.guestName} ${phone} #${code}\n환불 ${formatWon(refunded)}`,
  };
}
