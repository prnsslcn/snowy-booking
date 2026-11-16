import 'server-only';

/**
 * 서버 전용 환경변수 단일 진입점 (grill-booking lib/env.ts 이식).
 *
 * `import 'server-only'` 가드: 이 모듈이 클라이언트 번들에 포함되면 빌드가 즉시 실패한다.
 * 값은 지연 평가 — 실제 접근 시점에 검증하므로 env 미설정 상태에서도 빌드는 통과한다.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`필수 환경변수 누락: ${name}. .env.local 을 확인하세요(.env.example 참고).`);
  }
  return value;
}

export const serverEnv = {
  /** Supabase 서비스 롤 키 — RLS 우회. 서버 라우트/관리자 작업 전용. */
  get supabaseServiceRoleKey(): string {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  /** 토스페이먼츠 시크릿 키 — 결제 승인/취소 서버 API 인증용. */
  get tossSecretKey(): string {
    return required('TOSS_SECRET_KEY');
  },
  /** 솔라피 API 키. */
  get solapiApiKey(): string {
    return required('SOLAPI_API_KEY');
  },
  /** 솔라피 API 시크릿. */
  get solapiApiSecret(): string {
    return required('SOLAPI_API_SECRET');
  },
  /** 사전등록된 발신번호(한국 법상 필수). */
  get solapiSender(): string {
    return required('SOLAPI_SENDER');
  },
  /** 관리자 알림 수신 번호 목록(쉼표 구분, 선택). 비면 관리자 발송을 건너뛴다. */
  get adminNotifyPhones(): string[] {
    return (process.env.ADMIN_NOTIFY_PHONES ?? '')
      .split(',')
      .map((p) => p.replace(/\D/g, ''))
      .filter(Boolean);
  },
  /** 공공데이터포털 특일 정보 API 서비스 키(공휴일 불러오기). */
  get holidayApiKey(): string {
    return required('HOLIDAY_API_KEY');
  },
} as const;
