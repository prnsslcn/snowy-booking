'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, buttonClass } from '@/components/ui/Button';
import { checkOutAction, undoCheckAction } from '@/lib/admin/actions';

/*
  예약 상세 — 현장 처리.
  자리는 손님이 도착했을 때 현장 배정 화면(배치도)에서 고르며 입실과 함께 정해진다(2026-11-23 선착순).
  그래서 여기서는 자리 배정·이동을 하지 않고, 입실 후의 퇴실·되돌리기만 둔다.
*/

export function OnSiteActions({
  bookingId,
  status,
  date,
  seat,
}: {
  bookingId: string;
  status: string;
  date: string;
  /** 입실(특수는 등록) 뒤의 자리. 그 전이면 null */
  seat: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError('');
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? '처리하지 못했습니다.');
      router.refresh();
    });
  }

  if (status === 'cancel_requested') return <p className="text-[14px] text-ink-2">환불 처리 중인 예약입니다. 현장 처리는 할 수 없습니다.</p>;
  if (status === 'pending_payment') return <p className="text-[14px] text-ink-2">결제 대기 중인 예약입니다.</p>;
  if (!['confirmed', 'checked_in', 'checked_out'].includes(status)) return <p className="text-[14px] text-ink-2">취소·환불된 예약입니다.</p>;

  return (
    <div className="space-y-3">
      <p className="text-[14px]">
        <span className="text-ink-2">자리 </span>
        <b className="font-semibold">{seat ?? '현장 배정 전'}</b>
      </p>
      {status === 'confirmed' && (
        <>
          <p className="text-[13px] text-ink-2">손님이 도착하면 현장 배정 화면에서 원하는 빈자리를 골라 배정·입실합니다.</p>
          <Link href={`/admin/board?date=${date}`} className={buttonClass('tint', 'cs', 'w-full')}>
            현장 배정 열기
          </Link>
        </>
      )}
      {status === 'checked_in' && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="cs" disabled={pending} onClick={() => run(() => checkOutAction(bookingId))}>
            퇴실 처리
          </Button>
          <Button size="cs" variant="tint" disabled={pending} onClick={() => run(() => undoCheckAction(bookingId))}>
            입실 되돌리기
          </Button>
        </div>
      )}
      {status === 'checked_out' && (
        <Button size="cs" variant="tint" className="w-full" disabled={pending} onClick={() => run(() => undoCheckAction(bookingId))}>
          퇴실 되돌리기
        </Button>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-[#b42d18]">
          {error}
        </p>
      )}
    </div>
  );
}
