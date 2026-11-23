/**
 * 결제 도메인 에러 — confirm_booking_tx RAISE 메시지 / 토스 API 실패를 타입화.
 */

export type PaymentErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_NOT_PENDING' // 만료 회수·재시도 대체된 예약(보상 환불 대상)
  | 'AMOUNT_MISMATCH' // 토스 승인액 ≠ 예약 금액(보상 환불 대상)
  | 'TOSS_API_FAILED' // 토스 API 자체 실패
  | 'PAYMENT_NOT_COMPLETED' // 승인됐지만 결제 완료(DONE)가 아님(가상계좌 입금 대기 등) → 취소
  | 'METHOD_NOT_ALLOWED' // 받지 않는 결제수단(카드·간편결제 외 — 퀵계좌이체 등) → 취소
  | 'UNKNOWN';

const KNOWN_CODES: PaymentErrorCode[] = [
  'BOOKING_NOT_FOUND',
  'BOOKING_NOT_PENDING',
  'AMOUNT_MISMATCH',
  'TOSS_API_FAILED',
];

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  /** 토스가 돌려준 에러 코드(예: EXCEED_CANCEL_LIMIT). 관리자 화면에 그대로 표시. */
  readonly tossCode: string | null;
  constructor(code: PaymentErrorCode, message?: string, tossCode: string | null = null) {
    super(message ?? code);
    this.name = 'PaymentError';
    this.code = code;
    this.tossCode = tossCode;
  }
}

export function toPaymentError(error: unknown): PaymentError {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const matched = KNOWN_CODES.find((code) => message.includes(code));
  return new PaymentError(matched ?? 'UNKNOWN', message);
}

/** 캡처 후 확정 불가 → 토스 취소(보상)가 필요한 코드. */
export function needsCompensation(code: PaymentErrorCode): boolean {
  return code === 'AMOUNT_MISMATCH' || code === 'BOOKING_NOT_PENDING';
}

export function paymentHttpStatus(code: PaymentErrorCode): number {
  switch (code) {
    case 'BOOKING_NOT_FOUND':
      return 404;
    case 'BOOKING_NOT_PENDING':
      return 409;
    case 'AMOUNT_MISMATCH':
    case 'PAYMENT_NOT_COMPLETED':
    case 'METHOD_NOT_ALLOWED':
      return 422;
    case 'TOSS_API_FAILED':
      return 502;
    default:
      return 500;
  }
}
