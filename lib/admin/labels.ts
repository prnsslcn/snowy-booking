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

export const PAYMENT_STATUS_LABEL: Record<string, string> = { ready: '결제 대기', paid: '결제 완료', cancelled: '결제 취소', partial_cancelled: '부분 취소' };

/**
 * 화면에 보여 줄 자리 — 입실(퇴실)한 뒤에만. 특수(S1·S2)는 등록한 자리가 곧 자리.
 * 그 전의 bookings.unit_id 는 재고 계산용 가배정이라 보여 주지 않는다(2026-11-23 선착순 현장 배정).
 */
export function seatLabel(b: { status: string; type: string; label: string | null | undefined }): string | null {
  if (!b.label) return null;
  if (b.status === 'checked_in' || b.status === 'checked_out') return b.label;
  if (b.type === 'special' && b.status === 'confirmed') return b.label;
  return null;
}

/** 자리(입실 후)가 있으면 그것, 없으면 상품명 */
export function unitOrType(b: { unitLabel: string | null; typeName: string }): string {
  return b.unitLabel ?? b.typeName;
}

/** 매출에 넣는 상태(결제 완료 후 환불되지 않은 것) — CLAUDE.md §9 */
export const REVENUE_STATUSES = ['confirmed', 'checked_in', 'checked_out'] as const;

export const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'cancel_requested', 'checked_in', 'checked_out'] as const;
