'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/components/ui/Dialog';
import { fieldClass } from '@/components/ui/Field';
import { checkInAction, checkOutAction, moveUnitAction, undoCheckAction } from '@/lib/admin/actions';

/*
  예약 상세 — 현장 처리: 입실 · 퇴실 · 되돌리기 · 다른 유닛으로 옮기기(빈 유닛 이동 / 예약 있는 유닛과 맞바꾸기).
  현장 배정 화면의 처리 창과 같은 동작.
*/

export interface MoveTarget {
  unitId: string;
  label: string;
  bookingId: string | null;
  guestName: string | null;
  blackout: boolean;
}

export function OnSiteActions({
  bookingId,
  status,
  date,
  today,
  unitLabel,
  targets,
}: {
  bookingId: string;
  status: string;
  date: string;
  today: string;
  unitLabel: string | null;
  targets: MoveTarget[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [target, setTarget] = useState('');

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError('');
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? '처리하지 못했습니다.');
      router.refresh();
    });
  }

  const active = ['confirmed', 'checked_in', 'checked_out'].includes(status);
  if (!active)
    return (
      <p className="text-[14px] text-ink-2">
        {status === 'cancel_requested' ? '환불 처리 중인 예약입니다. 현장 처리는 할 수 없습니다.' : status === 'pending_payment' ? '결제 대기 중인 예약입니다.' : '취소·환불된 예약입니다.'}
      </p>
    );

  const options = targets.filter((t) => !t.blackout);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {status === 'confirmed' && (
          <Button size="cs" className="col-span-2" disabled={pending || date > today} onClick={() => run(() => checkInAction(bookingId))}>
            입실 처리
          </Button>
        )}
        {status === 'checked_in' && (
          <Button size="cs" className="col-span-2" disabled={pending} onClick={() => run(() => checkOutAction(bookingId))}>
            퇴실 처리
          </Button>
        )}
        {(status === 'checked_in' || status === 'checked_out') && (
          <Button size="cs" variant="tint" className="col-span-2" disabled={pending} onClick={() => run(() => undoCheckAction(bookingId))}>
            {status === 'checked_out' ? '퇴실 되돌리기' : '입실 되돌리기'}
          </Button>
        )}
      </div>
      {status === 'confirmed' && date > today && <p className="text-[12px] text-ink-2">입실 처리는 이용일 당일부터 할 수 있습니다.</p>}

      {options.length > 0 && (
        <form
          className="flex gap-2 border-t border-line pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const t = options.find((o) => o.unitId === target);
            if (!t) return;
            const msg = t.bookingId ? `${unitLabel ?? '이 유닛'} ↔ ${t.label}(${t.guestName}) 맞바꿀까요?` : `${t.label}(으)로 옮길까요?`;
            if (!(await confirmDialog(msg))) return;
            run(() => moveUnitAction(bookingId, t.unitId, t.bookingId));
            setTarget('');
          }}
        >
          <div className="min-w-0 flex-1">
            <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="옮길 유닛" className={fieldClass('light', 'appearance-none', 'cs')}>
            <option value="">다른 유닛으로 옮기기</option>
            {options.map((o) => (
              <option key={o.unitId} value={o.unitId}>
                {o.label} {o.bookingId ? `— ${o.guestName} (맞바꾸기)` : '— 빈 칸'}
              </option>
            ))}
          </select>
          </div>
          <Button type="submit" size="cs" variant="tint" disabled={pending || !target}>
            옮기기
          </Button>
        </form>
      )}

      {error && <p role="alert" className="rounded-lg border border-[#d4351c]/20 bg-[#d4351c]/[.05] px-4 py-3 text-[13px] text-[#b42d18]">{error}</p>}
    </div>
  );
}
