/**
 * 관리자 화면 표시용 이름·배지 색(서버·클라이언트 공용).
 */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'manual';

export const STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  pending_payment: { label: '결제 대기', tone: 'neutral' },
  confirmed: { label: '예약 확정', tone: 'success' },
  cancel_requested: { label: '환불 처리 중', tone: 'warning' },
  refunded: { label: '환불 완료', tone: 'neutral' },
  cancelled: { label: '취소됨', tone: 'neutral' },
  checked_in: { label: '입실', tone: 'info' },
  checked_out: { label: '퇴실', tone: 'neutral' },
};

/** 상태 배지 — 환불 실패(취소 오류 기록)·계좌 직접 환불은 따로 구분 */
export function statusBadge(b: { status: string; cancel_error?: unknown; refund_method?: string | null }): { label: string; tone: BadgeTone } {
  if (b.status === 'cancel_requested' && b.cancel_error) return { label: '환불 실패', tone: 'error' };
  if (b.status === 'refunded' && b.refund_method === 'manual') return { label: '계좌 환불', tone: 'manual' };
  if (b.status === 'refunded' && b.refund_method === 'none') return { label: '취소(환불 없음)', tone: 'neutral' };
  return STATUS_LABEL[b.status] ?? { label: b.status, tone: 'neutral' };
}

export const SOURCE_LABEL: Record<string, string> = { online: '온라인', offline: '유선', comp: '무상' };

export const PAYMENT_STATUS_LABEL: Record<string, string> = { ready: '결제 대기', paid: '결제 완료', cancelled: '결제 취소', partial_cancelled: '부분 취소' };

/** 유닛 이름(카바나 1호 등 — 상품명 포함)이 있으면 그것, 없으면 상품명 */
export function unitOrType(b: { unitLabel: string | null; typeName: string }): string {
  return b.unitLabel ?? b.typeName;
}

export const PAY_METHOD_LABEL: Record<string, string> = { cash: '현금', card: '카드', transfer: '계좌이체' };

/** 매출에 넣는 상태(결제 완료 후 환불되지 않은 것) — CLAUDE.md §9 */
export const REVENUE_STATUSES = ['confirmed', 'checked_in', 'checked_out'] as const;

export const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'cancel_requested', 'checked_in', 'checked_out'] as const;
