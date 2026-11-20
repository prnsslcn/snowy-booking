'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/Field';
import { cancelBookingAction, manualRefundAction } from '@/lib/admin/actions';
import { formatWon } from '@/lib/format';

/*
  예약 상세의 처리 버튼(온라인 예약).
  - 확정: 규정대로 취소 / 전액 환불
  - 입실·퇴실: 전액 환불만(규정 취소는 DB가 막음)
  - 환불 처리 중(토스 취소 실패로 멈춤): 재시도(규정·전액) + 계좌 직접 환불 기록
  실패하면 토스 오류 코드·사유를 그대로 보여 주고 화면을 새로 읽는다(router.refresh).
*/

export function BookingActions({
  bookingId,
  status,
  amount,
  policyRefund,
  policyRate,
}: {
  bookingId: string;
  status: string;
  amount: number;
  policyRefund: number;
  policyRate: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manualAmount, setManualAmount] = useState(String(amount));
  const [manualNote, setManualNote] = useState('');

  const stuck = status === 'cancel_requested';
  const canPolicy = status === 'confirmed' || stuck;
  const canFull = canPolicy || status === 'checked_in' || status === 'checked_out';

  function run(fn: () => Promise<{ ok: boolean; error?: string; data?: { refunded: number } }>, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setError('');
    setNotice('');
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? '처리하지 못했습니다.');
      else setNotice(res.data ? `처리되었습니다. 환불 ${formatWon(res.data.refunded)}` : '처리되었습니다.');
      router.refresh();
    });
  }

  if (!canFull) return <p className="text-[14px] text-ink-2">이 상태에서는 처리할 작업이 없습니다.</p>;

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        {canPolicy && (
          <Button
            size="cs" className="w-full"
            disabled={pending}
            onClick={() =>
              run(
                () => cancelBookingAction(bookingId, 'policy'),
                `${stuck ? '환불을 다시 시도할까요?' : '예약을 취소할까요?'}\n규정 환불 ${formatWon(policyRefund)} (${Math.round(policyRate * 100)}%)`,
              )
            }
          >
            {stuck ? '규정대로 환불 재시도' : '규정대로 취소'} · {formatWon(policyRefund)}
          </Button>
        )}
        <Button
          size="cs" className="w-full"
          variant="tint"
          disabled={pending}
          onClick={() =>
            run(
              () => cancelBookingAction(bookingId, 'full'),
              `${stuck ? '전액 환불로 다시 시도할까요?' : '규정과 관계없이 전액 환불할까요?'}\n환불 ${formatWon(amount)}`,
            )
          }
        >
          {stuck ? '전액 환불로 재시도' : '전액 환불'} · {formatWon(amount)}
        </Button>
        <p className="text-[12px] leading-relaxed text-ink-2">
          규정: 이용 2일 전까지 100% · 1일 전 50% · 당일 0%. 전액 환불은 자연재해 등 예외에만 씁니다.
        </p>
      </div>

      {stuck && (
        <form
          className="space-y-2.5 rounded-lg border border-violet-600/15 bg-violet-600/[.04] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(manualAmount.replace(/\D/g, ''));
            run(() => manualRefundAction(bookingId, n, manualNote), `계좌로 ${formatWon(n)} 환불한 것으로 기록할까요?\n토스 결제는 취소되지 않습니다.`);
          }}
        >
          <p className="text-[14px] font-semibold text-violet-800">계좌에서 직접 환불</p>
          <p className="text-[12px] leading-relaxed text-ink-2">
            토스 취소가 안 될 때(취소 한도 초과 등) 계좌이체로 돌려준 뒤 기록만 남깁니다. 토스 결제는 그대로입니다.
          </p>
          <input
            inputMode="numeric"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value.replace(/[^\d]/g, ''))}
            aria-label="환불 금액(원)"
            className={fieldClass('light', 'tabular-nums', 'cs')}
          />
          <input
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            placeholder="메모 (입금 계좌·날짜 등)"
            aria-label="메모"
            className={fieldClass('light', '', 'cs')}
          />
          <Button type="submit" size="cs" variant="tint" disabled={pending || !manualAmount}>
            계좌 환불 기록
          </Button>
        </form>
      )}

      {pending && <p className="text-[13px] text-ink-2">처리 중…</p>}
      {error && <p role="alert" className="rounded-lg border border-[#d4351c]/20 bg-[#d4351c]/[.05] px-4 py-3 text-[13px] text-[#b42d18]">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-ice-100 px-4 py-3 text-[13px] text-ice-700">{notice}</p>}
    </div>
  );
}
