import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { AdminTitle } from '@/components/admin/AdminShell';
import { BookingActions } from '@/components/admin/BookingActions';
import { OfflineEditor } from '@/components/admin/OfflineEditor';
import { OnSiteActions } from '@/components/admin/OnSiteActions';
import { Badge } from '@/components/ui/Badge';
import { moveTargets } from '@/lib/admin/board';
import { getBooking } from '@/lib/admin/bookings';
import { PAY_METHOD_LABEL, PAYMENT_STATUS_LABEL, SOURCE_LABEL, statusBadge, unitOrType } from '@/lib/admin/labels';
import { formatDateKorean, formatDateTimeKorean, formatPhone, formatWon } from '@/lib/format';
import { kstToday } from '@/lib/policy/booking-window';
import { refundAmount, refundRate } from '@/lib/policy/refund';

export const metadata: Metadata = { title: '예약 상세' };
export const dynamic = 'force-dynamic';

const ACTION_LABEL: Record<string, string> = {
  cancel_policy: '규정대로 취소',
  cancel_full_refund: '전액 환불',
  refund_retry: '환불 재시도',
  refund_failed: '토스 취소 실패',
  manual_refund: '계좌 직접 환불 기록',
  check_in: '입실 처리',
  check_out: '퇴실 처리',
  undo_check: '입실·퇴실 되돌리기',
  reassign_unit: '유닛 변경',
  swap_units: '유닛 맞바꾸기',
  create_offline: '유선 예약 등록',
  create_comp: '무상 예약 등록',
  update_offline: '유선 예약 수정',
  cancel_offline: '예약 취소',
};
const NOTI_LABEL: Record<string, string> = { confirm: '예약 확정', cancel: '취소·환불', reminder: '리마인더', change: '변경' };

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 md:p-6">
      <h2 className="mb-3 text-[15px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-ice-700/[.07]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-[14px]">
          <dt className="flex-none text-ink/50">{k}</dt>
          <dd className="min-w-0 break-all text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getBooking(id);
  if (!b) notFound();

  const s = statusBadge({ status: b.status, cancel_error: b.cancelError, refund_method: b.refundMethod });
  const snap = (b.priceSnapshot ?? {}) as { rate_kind?: string; unit_price?: number; base_amount?: number; extras?: { label: string; amount: number }[] };
  const today = kstToday();
  const targets = ['confirmed', 'checked_in', 'checked_out'].includes(b.status) ? await moveTargets(b.id) : [];
  const err = b.cancelError as { code?: string; message?: string; at?: string } | null;
  const now = new Date();

  return (
    <>
      <Link href="/admin/bookings" className="mb-3 inline-flex items-center gap-1 text-[14px] font-medium text-ink/55 hover:text-ink">
        ‹ 예약 목록
      </Link>
      <AdminTitle
        title={b.guestName}
        sub={`${formatDateKorean(b.date)} · ${unitOrType(b)}`}
        aside={<Badge tone={s.tone}>{s.label}</Badge>}
      />

      {err && (
        <section className="mb-5 rounded-3xl border border-[#d4351c]/20 bg-[#d4351c]/[.05] p-5">
          <p className="text-[14px] font-bold text-[#b42d18]">토스 취소 실패{err.code ? ` · ${err.code}` : ''}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#b42d18]/85">{err.message}</p>
          {err.at && <p className="mt-1 text-[12px] text-ink/45">{formatDateTimeKorean(err.at)}</p>}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card title="예약 정보">
            <Rows
              rows={[
                ['이용일', formatDateKorean(b.date)],
                ['상품', b.typeName],
                ['유닛', b.unitLabel ?? '—'],
                ['예약자', b.guestName],
                ['휴대폰', b.guestPhone ? formatPhone(b.guestPhone) : '—'],
                ...(b.guestCount ? ([['인원', `${b.guestCount}명`]] as [string, ReactNode][]) : []),
                ['예약번호', b.lookupCode ? <span className="font-mono">{b.lookupCode}</span> : '—'],
                ['경로', SOURCE_LABEL[b.source] ?? b.source],
                ['금액', `${formatWon(b.amount)}${snap.rate_kind ? ` (${snap.rate_kind === 'weekend' ? '주말' : '주중'} 요금)` : ''}`],
                ...((snap.extras ?? []).length
                  ? ([
                      ['기본 금액', formatWon(snap.base_amount ?? b.amount)],
                      ...(snap.extras ?? []).map((e) => [`· ${e.label}`, `${e.amount > 0 ? '+' : ''}${formatWon(e.amount)}`]),
                    ] as [string, ReactNode][])
                  : []),
                ...(b.offlinePaymentMethod ? ([['결제수단', PAY_METHOD_LABEL[b.offlinePaymentMethod]]] as [string, ReactNode][]) : []),
                ...(b.note ? ([['메모', b.note]] as [string, ReactNode][]) : []),
                ['주문번호', <span key="o" className="font-mono text-[12px]">{b.orderId}</span>],
                ['예약 시각', formatDateTimeKorean(b.createdAt)],
                ...(b.checkedInAt ? ([['입실', formatDateTimeKorean(b.checkedInAt)]] as [string, ReactNode][]) : []),
                ...(b.checkedOutAt ? ([['퇴실', formatDateTimeKorean(b.checkedOutAt)]] as [string, ReactNode][]) : []),
              ]}
            />
          </Card>

          {b.payments.length > 0 && (
            <Card title="결제">
              {b.payments.map((p, i) => (
                <Rows
                  key={i}
                  rows={[
                    ['상태', PAYMENT_STATUS_LABEL[p.status] ?? p.status],
                    ['수단', p.method ?? '—'],
                    ['금액', formatWon(p.amount)],
                    ['승인', p.approvedAt ? formatDateTimeKorean(p.approvedAt) : '—'],
                    ...(p.cancelledAt ? ([['취소', formatDateTimeKorean(p.cancelledAt)]] as [string, ReactNode][]) : []),
                  ]}
                />
              ))}
            </Card>
          )}

          {b.status === 'refunded' && (
            <Card title="환불">
              <Rows
                rows={[
                  ['환불 금액', formatWon(b.refundAmount ?? 0)],
                  ['방법', b.refundMethod === 'manual' ? '계좌 직접 환불' : b.refundMethod === 'toss' ? '토스 결제 취소' : '환불 없음'],
                  ['처리 시각', b.refundedAt ? formatDateTimeKorean(b.refundedAt) : '—'],
                  ...(b.manualRefundNote ? ([['메모', b.manualRefundNote]] as [string, ReactNode][]) : []),
                ]}
              />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="현장">
            <OnSiteActions bookingId={b.id} status={b.status} date={b.date} today={today} unitLabel={b.unitLabel} targets={targets} />
          </Card>

          <Card title={b.source === 'online' ? '취소·환불' : b.source === 'offline' ? '유선 예약 수정·취소' : '무상 예약 취소'}>
            {b.source === 'online' ? (
              <BookingActions
                bookingId={b.id}
                status={b.status}
                amount={b.amount}
                policyRefund={refundAmount(b.amount, b.date, now)}
                policyRate={refundRate(b.date, now)}
              />
            ) : (
              <OfflineEditor
                bookingId={b.id}
                source={b.source}
                status={b.status}
                baseAmount={snap.base_amount ?? b.amount}
                extras={snap.extras ?? []}
                paymentMethod={(b.offlinePaymentMethod as 'cash' | 'card' | 'transfer' | null) ?? null}
                guestName={b.guestName}
                guestPhone={b.guestPhone}
                guestCount={b.guestCount}
                note={b.note}
              />
            )}
          </Card>

          <Card title="기록">
            {b.actions.length === 0 && b.notifications.length === 0 ? (
              <p className="text-[14px] text-ink/45">기록이 없습니다.</p>
            ) : (
              <ul className="space-y-2.5 text-[13px]">
                {b.actions.map((a, i) => (
                  <li key={`a${i}`} className="flex justify-between gap-3">
                    <span>{ACTION_LABEL[a.action] ?? a.action}</span>
                    <span className="flex-none tabular-nums text-ink/45">{formatDateTimeKorean(a.createdAt)}</span>
                  </li>
                ))}
                {b.notifications.map((n, i) => (
                  <li key={`n${i}`} className="flex justify-between gap-3 text-ink/70">
                    <span>
                      문자 · {NOTI_LABEL[n.type] ?? n.type} ({n.recipient === 'admin' ? '관리자' : '고객'}) · {n.status}
                    </span>
                    <span className="flex-none tabular-nums text-ink/45">{formatDateTimeKorean(n.sentAt ?? n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
