/**
 * 관리자 DB 함수 예외 코드 → 화면 문구. 함수는 'raise exception CODE' 로 알린다.
 */
const MESSAGES: Record<string, string> = {
  BOOKING_NOT_FOUND: '예약을 찾을 수 없습니다.',
  NOT_ACTIVE: '취소·환불된 예약은 바꿀 수 없습니다.',
  NOT_CANCELLABLE: '지금 상태에서는 취소할 수 없습니다.',
  NOT_ONLINE: '온라인 결제 예약이 아닙니다.',
  NOT_OFFLINE: '유선·무상 예약이 아닙니다.',
  NOT_EDITABLE: '지금 상태에서는 수정할 수 없습니다.',
  UNIT_NOT_AVAILABLE: '그 유닛은 이미 사용 중이거나 점검 중입니다.',
  NOT_SWAPPABLE: '같은 날짜·같은 상품끼리만 맞바꿀 수 있습니다.',
  SAME_BOOKING: '같은 예약입니다.',
  NOT_CHECKIN_ABLE: '예약 확정 상태에서만 입실 처리할 수 있습니다.',
  FUTURE_DATE: '이용일 전에는 입실 처리할 수 없습니다.',
  NOT_CHECKED_IN: '입실한 예약만 퇴실 처리할 수 있습니다.',
  NOTHING_TO_UNDO: '되돌릴 입실·퇴실 처리가 없습니다.',
  INVALID_SOURCE: '예약 경로를 확인해 주세요.',
  PRODUCT_NOT_FOUND: '상품을 찾을 수 없습니다.',
  NAME_REQUIRED: '예약자 이름을 입력해 주세요.',
  INVALID_PHONE: '휴대폰 번호를 확인해 주세요.',
  INVALID_GUEST_COUNT: '인원을 확인해 주세요.',
  OVER_CAPACITY: '상품 최대 인원을 넘었습니다.',
  PAST_DATE: '지난 날짜에는 예약할 수 없습니다.',
  DATE_CLOSED: '휴장일입니다.',
  PAYMENT_METHOD_REQUIRED: '결제수단을 골라 주세요.',
  INVALID_AMOUNT: '금액을 확인해 주세요.',
  SOLD_OUT: '그 날짜에 남은 유닛이 없습니다.',
  INVALID_RANGE: '기간을 확인해 주세요(시작일 ≤ 종료일).',
  RANGE_TOO_LONG: '기간이 너무 깁니다.',
  UNIT_NOT_FOUND: '유닛을 찾을 수 없습니다.',
  BLACKOUT_CONFLICT: '그 기간에 이 유닛에 배정된 예약이 있습니다. 먼저 다른 유닛으로 옮겨 주세요.',
  BLACKOUT_OVERLAP: '이 유닛에 겹치는 점검 기간이 이미 있습니다.',
  BLACKOUT_NOT_FOUND: '점검 기간을 찾을 수 없습니다.',
  LABEL_REQUIRED: '유닛 이름을 입력해 주세요.',
  LABEL_DUPLICATE: '같은 이름의 유닛이 이미 있습니다.',
  UNIT_HAS_BOOKINGS: '오늘 이후 이 유닛에 배정된 예약이 있습니다. 먼저 다른 유닛으로 옮겨 주세요.',
};

export function adminErrorMessage(raw: string): string {
  const code = Object.keys(MESSAGES).find((c) => raw.includes(c));
  return code ? MESSAGES[code] : raw;
}
