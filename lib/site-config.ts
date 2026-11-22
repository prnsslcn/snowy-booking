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

/** 오시는 길(/location) 공개 여부 — false 면 메뉴에서 숨기고 주소로 들어와도 404(운영자 확인 전까지 꺼 둠) */
export const LOCATION_ENABLED = false;

/** 위치 — 비발디파크(스노위랜드) 도로명 주소. 소노호텔앤리조트 공식 오시는 길 기준 */
export const PLACE_NAME = '홍천 비발디파크 스노위랜드';
export const ADDRESS = '강원특별자치도 홍천군 서면 한치골길 262';
const MAP_QUERY = encodeURIComponent('비발디파크 스노위랜드');
export const MAP_LINKS = [
  { label: '네이버 지도', href: `https://map.naver.com/p/search/${MAP_QUERY}` },
  { label: '카카오맵', href: `https://map.kakao.com/?q=${MAP_QUERY}` },
] as const;

/** 사업자 정보(전자상거래법 제10조 — 결제 사이트 필수 표시). 푸터에서 '© 회사명'을 눌러 펼친다 */
export const COMPANY_NAME = '주식회사 에이비씨웍스글로벌';
export const BUSINESS_INFO =
  '대표 황혜진 · 사업자등록번호 442-87-01602 · 통신판매업신고 제2021-서울강서-1055호 · 서울특별시 강서구 마곡중앙로 171, 5층 513호 씨(마곡동) · campingclub2020@naver.com';

export const ONE_PER_DAY_NOTICE = '1인(휴대폰번호 기준) 1일 1동만 예약할 수 있습니다.';
export const TICKET_NOTICE = '스노위랜드 입장권은 포함되어 있지 않습니다.';
export const PARKING_NOTICE = '주차는 비발디파크 리조트 주차장을 이용해 주세요.';
export const REFUND_SUMMARY = '이용 2일 전까지 100% · 1일 전 50% · 당일 환불 불가';
