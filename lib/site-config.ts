/**
 * 사이트 표시용 고정 정보. [미정] 항목은 null — 운영자 확인 후 채운다(CLAUDE.md §14).
 */

export const SITE_NAME = '스노위랜드 카바나·카라반';
export const SMS_BRAND = '스노위랜드';

/** 이용 시간(당일 이용, 부 구분 없음). */
export const USAGE_START = '10:00';
export const USAGE_END = '17:00';
export const USAGE_TIME = `${USAGE_START}~${USAGE_END}`;

/** 고객 문의 전화 [미정]. null이면 화면·문자에서 생략. */
export const CONTACT_PHONE: string | null = null;

/** 사이트 주소(문자 내 조회 링크용) [미정 — 도메인]. 미설정이면 링크 생략. */
export function siteUrl(): string | null {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || null;
}

export const ONE_PER_DAY_NOTICE = '1인(휴대폰번호 기준) 1일 1동만 예약할 수 있습니다.';
export const TICKET_NOTICE = '스노위랜드 입장권은 포함되어 있지 않습니다.';
export const PARKING_NOTICE = '주차는 비발디파크 리조트 주차장을 이용해 주세요.';
export const REFUND_SUMMARY = '이용 2일 전까지 100% · 1일 전 50% · 당일 환불 불가';
