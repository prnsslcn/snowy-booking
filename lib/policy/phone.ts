/**
 * 휴대폰번호 정규화 — 단일 출처.
 * 저장·비교는 항상 숫자만(01012345678). 010-1234-5678 / 공백 등 우회로 1인 1일 제한을 피하지 못하게 한다.
 * DB에도 같은 형식 check가 있다(docs/schema.md bookings.guest_phone).
 */

const MOBILE_RE = /^01[0-9]{8,9}$/;

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** 정규화 후 휴대폰 형식이면 숫자 문자열, 아니면 null. */
export function parseMobilePhone(raw: string): string | null {
  const digits = normalizePhone(raw);
  return MOBILE_RE.test(digits) ? digits : null;
}
