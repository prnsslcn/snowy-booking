/**
 * 예약 도메인 에러 — DB 함수 RAISE 코드(0007~0010)를 타입화.
 */

export const BOOKING_ERROR_CODES = [
  'BUSINESS_CLOSED',
  'PRODUCT_NOT_FOUND',
  'NAME_REQUIRED',
  'INVALID_PHONE',
  'INVALID_GUEST_COUNT',
  'OVER_CAPACITY',
  'OUT_OF_WINDOW',
  'OUT_OF_SEASON',
  'DATE_CLOSED',
  'DATE_LOCKED',
  'DUPLICATE_PHONE_DATE',
  'SOLD_OUT',
  'LOOKUP_CODE_EXHAUSTED',
  'AGREEMENT_REQUIRED',
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number] | 'UNKNOWN';

export class BookingError extends Error {
  readonly code: BookingErrorCode;
  constructor(code: BookingErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'BookingError';
    this.code = code;
  }
}

/** RPC 에러 메시지에서 코드 추출. 코드가 다른 코드의 접두어가 되지 않도록 정확 일치 우선. */
export function toBookingError(error: unknown): BookingError {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const exact = BOOKING_ERROR_CODES.find((c) => message === c);
  const matched = exact ?? BOOKING_ERROR_CODES.find((c) => message.includes(c));
  return new BookingError(matched ?? 'UNKNOWN', message);
}

export function bookingHttpStatus(code: BookingErrorCode): number {
  switch (code) {
    case 'SOLD_OUT':
    case 'DUPLICATE_PHONE_DATE':
    case 'DATE_CLOSED':
    case 'DATE_LOCKED':
      return 409;
    case 'BUSINESS_CLOSED':
      return 403;
    case 'PRODUCT_NOT_FOUND':
      return 404;
    case 'UNKNOWN':
    case 'LOOKUP_CODE_EXHAUSTED':
      return 500;
    default:
      return 400;
  }
}
