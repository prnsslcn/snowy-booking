/**
 * 예약·결제·환불 오류 코드 → 고객 안내 문구 (클라이언트·서버 공용, docs/booking-flow.md §11).
 */

import { ONE_PER_DAY_NOTICE } from '@/lib/site-config';
import { BOOKING_WINDOW_EN, BOOKING_WINDOW_KO, SAME_DAY_CUTOFF_HOUR } from '@/lib/policy/booking-window';

const CUTOFF = `${String(SAME_DAY_CUTOFF_HOUR).padStart(2, '0')}:00`;

const MESSAGES: Record<string, string> = {
  SOLD_OUT: '선택하신 날짜의 상품이 모두 예약되었습니다. 다른 날짜나 상품을 선택해 주세요.',
  DUPLICATE_PHONE_DATE: `${ONE_PER_DAY_NOTICE} 기존 예약은 예약 조회에서 확인해 주세요.`,
  DATE_CLOSED: '휴장일입니다.',
  DATE_LOCKED: '예약이 마감된 날짜입니다.',
  OUT_OF_WINDOW: `예약은 오늘부터 ${BOOKING_WINDOW_KO} 이내 날짜만 가능합니다(당일 예약은 ${CUTOFF}까지).`,
  OUT_OF_SEASON: '운영 기간이 아닌 날짜입니다.',
  OVER_CAPACITY: '선택하신 상품의 최대 인원을 초과했습니다.',
  INVALID_GUEST_COUNT: '인원을 확인해 주세요.',
  INVALID_PHONE: '휴대폰 번호 형식이 올바르지 않습니다.',
  NAME_REQUIRED: '예약자 이름을 입력해 주세요.',
  AGREEMENT_REQUIRED: '환불 규정과 이용 수칙에 동의해 주세요.',
  PRODUCT_NOT_FOUND: '현재 판매하지 않는 상품입니다.',
  BUSINESS_CLOSED: '현재 예약을 받지 않습니다.',
  TOO_MANY_ATTEMPTS: '조회 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.',
  NOT_FOUND: '일치하는 예약을 찾을 수 없습니다. 휴대폰 번호와 예약번호(4자리)를 확인해 주세요.',
  NOT_CANCELLABLE: '취소할 수 없는 예약입니다.',
  CANCEL_IN_PROGRESS: '취소를 처리하고 있습니다. 잠시 후 예약 조회에서 결과를 확인해 주세요.',
  TOO_MANY_REQUESTS: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  PAYMENT_NOT_COMPLETED: '결제가 완료되지 않아 예약이 확정되지 않았습니다. 결제된 금액이 있으면 자동 취소됩니다.',
  TOSS_CANCEL_FAILED: '취소가 접수되었지만 환불 처리가 지연되고 있습니다. 확인 후 처리해 드리겠습니다.',
  BOOKING_NOT_PENDING: '결제 시간이 초과되어 자동 취소되었습니다. 결제된 금액은 환불됩니다.',
  AMOUNT_MISMATCH: '결제 금액이 올바르지 않아 자동 취소되었습니다. 결제된 금액은 환불됩니다.',
};

const MESSAGES_EN: Record<string, string> = {
  SOLD_OUT: 'This type is fully booked for the selected date. Please choose another date or type.',
  DUPLICATE_PHONE_DATE: 'Each mobile number can book one unit per day. You can check your existing booking under Find or Cancel a Booking.',
  DATE_CLOSED: 'We are closed on this date.',
  DATE_LOCKED: 'Booking is closed for this date.',
  OUT_OF_WINDOW: `You can book up to ${BOOKING_WINDOW_EN} ahead (same-day bookings close at ${CUTOFF}).`,
  OUT_OF_SEASON: 'This date is outside our operating season.',
  OVER_CAPACITY: 'This exceeds the maximum number of guests for the selected type.',
  INVALID_GUEST_COUNT: 'Please check the number of guests.',
  INVALID_PHONE: 'Please enter a valid Korean mobile number.',
  NAME_REQUIRED: 'Please enter the name for the booking.',
  AGREEMENT_REQUIRED: 'Please agree to the refund policy and house rules.',
  PRODUCT_NOT_FOUND: 'This type is not currently available.',
  BUSINESS_CLOSED: 'We are not accepting bookings at the moment.',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Please try again in 15 minutes.',
  NOT_FOUND: 'No matching booking was found. Please check your mobile number and 4-digit booking number.',
  NOT_CANCELLABLE: 'This booking cannot be cancelled.',
  CANCEL_IN_PROGRESS: 'Your cancellation is being processed. Please check the result under Find or Cancel a Booking shortly.',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again shortly.',
  PAYMENT_NOT_COMPLETED: 'The payment was not completed, so your booking was not confirmed. Any amount charged will be cancelled automatically.',
  TOSS_CANCEL_FAILED: 'Your cancellation was received, but the refund is delayed. We will check and process it.',
  BOOKING_NOT_PENDING: 'Your payment time ran out and the booking was cancelled automatically. Any amount charged will be refunded.',
  AMOUNT_MISMATCH: 'The payment amount was incorrect, so it was cancelled automatically. Any amount charged will be refunded.',
};

export function errorMessage(code: string | undefined | null, locale: 'ko' | 'en' = 'ko'): string {
  if (locale === 'en') return (code && MESSAGES_EN[code]) || 'Something went wrong. Please try again shortly.';
  return (code && MESSAGES[code]) || '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}
