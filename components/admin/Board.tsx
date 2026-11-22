'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { confirmDialog } from '@/components/ui/Dialog';
import { fieldClass } from '@/components/ui/Field';
import { checkInAction, checkOutAction, moveUnitAction, undoCheckAction } from '@/lib/admin/actions';
import type { BoardCell, BoardGroup } from '@/lib/admin/board';
import { statusBadge } from '@/lib/admin/labels';
import { formatPhone } from '@/lib/format';

/*
  현장 배정 보드 — 상품별 유닛 칸. 칸을 누르면 처리 창(폰: 아래에서 올라옴 / PC: 가운데).
  처리: 입실 · 퇴실 · 되돌리기 · 다른 유닛으로 옮기기(빈 유닛이면 이동, 예약 있는 유닛이면 맞바꾸기).
*/

/** "카바나 12호" → "12호" (칸 안에서는 상품명 생략) */
export function shortLabel(label: string) {
  const m = label.match(/(\d+\s*호)$/);
  return m ? m[1] : label;
}

export function cellTone(c: BoardCell) {
  const s = c.booking?.status;
  if (!c.booking) return c.blackout ? 'border-dashed border-ink/15 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(14,26,43,.04)_6px_12px)] text-ink-3' : 'border-dashed border-ice-300 bg-transparent text-ink-3';
  if (s === 'checked_in') return 'border-glacier bg-glacier text-white';
  if (s === 'checked_out') return 'border-ice-200 bg-ice-100 text-ink-2';
  if (s === 'pending_payment') return 'border-dashed border-amber-400 bg-amber-50 text-amber-800';
  if (s === 'cancel_requested') return 'border-[#d4351c]/30 bg-[#d4351c]/[.05] text-[#b42d18]';
  return 'border-ice-300 bg-white text-ink';
}

export function Board({ groups, date, today }: { groups: BoardGroup[]; date: string; today: string }) {
  const [sel, setSel] = useState<{ group: BoardGroup; cell: BoardCell } | null>(null);

  return (
    <>
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.type} className="rounded-2xl border border-line bg-white p-4 md:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="panel-title">{g.name}</h2>
              <p className="text-[13px] tabular-nums text-ink-2">
                예약 {g.counts.booked} · 입실 {g.counts.checkedIn} · 빈 칸 {g.counts.empty}
                {g.counts.blackout > 0 && ` · 점검 ${g.counts.blackout}`}
              </p>
            </div>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {g.cells.map((c) => (
                <li key={c.unitId}>
                  <button
                    type="button"
                    disabled={!c.booking}
                    onClick={() => setSel({ group: g, cell: c })}
                    className={`flex h-[72px] w-full flex-col justify-between rounded-lg border p-2.5 text-left transition-transform duration-200 enabled:active:scale-[0.97] ${cellTone(c)}`}
                  >
                    <span className="text-[12px] font-semibold tabular-nums opacity-80">{shortLabel(c.label)}</span>
                    <span className="truncate text-[14px] font-semibold leading-tight">
                      {c.booking ? c.booking.guestName : c.blackout ? '점검' : '빈 칸'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* 범례 */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[12px] text-ink-2">
        {[
          ['border-ice-300 bg-white', '예약 확정'],
          ['border-glacier bg-glacier', '입실'],
          ['border-ice-200 bg-ice-100', '퇴실'],
          ['border-dashed border-amber-400 bg-amber-50', '결제 대기'],
          ['border-dashed border-ice-300', '빈 칸'],
        ].map(([cls, l]) => (
          <li key={l} className="flex items-center gap-1.5">
            <span className={`h-3 w-4 rounded border ${cls}`} />
            {l}
          </li>
        ))}
      </ul>

      {sel && sel.cell.booking && (
        <Sheet key={sel.cell.unitId} group={sel.group} cell={sel.cell} date={date} today={today} onClose={() => setSel(null)} />
      )}
    </>
  );
}

function Sheet({ group, cell, date, today, onClose }: { group: BoardGroup; cell: BoardCell; date: string; today: string; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [target, setTarget] = useState('');
  const b = cell.booking!;
  const s = statusBadge({ status: b.status });
  const others = group.cells.filter((c) => c.unitId !== cell.unitId && !(c.blackout && !c.booking));

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, close = true) {
    setError('');
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? '처리하지 못했습니다.');
        return;
      }
      router.refresh();
      if (close) onClose();
    });
  }

  const canIn = b.status === 'confirmed' && date <= today;
  const canOut = b.status === 'checked_in';
  const canUndo = b.status === 'checked_in' || b.status === 'checked_out';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${cell.label} ${b.guestName}`}
        className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] md:rounded-xl md:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-ice-600">{cell.label}</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{b.guestName}</p>
          </div>
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>
        <dl className="mt-4 space-y-1.5 text-[14px]">
          {b.guestPhone && (
            <div className="flex justify-between">
              <dt className="text-ink-2">휴대폰</dt>
              <dd>
                <a href={`tel:${b.guestPhone}`} className="font-medium text-glacier underline decoration-ice-300 underline-offset-4">
                  {formatPhone(b.guestPhone)}
                </a>
              </dd>
            </div>
          )}
          {b.guestCount && (
            <div className="flex justify-between">
              <dt className="text-ink-2">인원</dt>
              <dd>{b.guestCount}명</dd>
            </div>
          )}
          {b.lookupCode && (
            <div className="flex justify-between">
              <dt className="text-ink-2">예약번호</dt>
              <dd className="font-mono">{b.lookupCode}</dd>
            </div>
          )}
          {b.note && (
            <div className="flex justify-between gap-4">
              <dt className="flex-none text-ink-2">메모</dt>
              <dd className="text-right">{b.note}</dd>
            </div>
          )}
        </dl>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {canIn && (
            <Button size="cs" className="col-span-2" disabled={pending} onClick={() => run(() => checkInAction(b.id))}>
              입실 처리
            </Button>
          )}
          {canOut && (
            <Button size="cs" className="col-span-2" disabled={pending} onClick={() => run(() => checkOutAction(b.id))}>
              퇴실 처리
            </Button>
          )}
          {canUndo && (
            <Button size="cs" variant="tint" className="col-span-2" disabled={pending} onClick={() => run(() => undoCheckAction(b.id))}>
              {b.status === 'checked_out' ? '퇴실 되돌리기' : '입실 되돌리기'}
            </Button>
          )}
          {b.status === 'confirmed' && date > today && <p className="col-span-2 text-[13px] text-ink-2">입실 처리는 이용일 당일부터 할 수 있습니다.</p>}
        </div>

        {/* 유닛 옮기기 */}
        {others.length > 0 && b.status !== 'pending_payment' && (
          <form
            className="mt-5 flex gap-2 border-t border-line pt-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const t = others.find((c) => c.unitId === target);
              if (!t) return;
              const msg = t.booking ? `${cell.label} ↔ ${t.label}(${t.booking.guestName}) 맞바꿀까요?` : `${t.label}(으)로 옮길까요?`;
              if (!(await confirmDialog(msg))) return;
              run(() => moveUnitAction(b.id, t.unitId, t.booking?.id ?? null));
            }}
          >
            <div className="min-w-0 flex-1">
            <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="옮길 유닛" className={fieldClass('light', 'appearance-none', 'cs')}>
              <option value="">다른 유닛으로 옮기기</option>
              {others.map((c) => (
                <option key={c.unitId} value={c.unitId}>
                  {c.label} {c.booking ? `— ${c.booking.guestName} (맞바꾸기)` : '— 빈 칸'}
                </option>
              ))}
            </select>
          </div>
            <Button type="submit" size="cs" variant="tint" disabled={pending || !target}>
              옮기기
            </Button>
          </form>
        )}

        {error && <p role="alert" className="mt-4 rounded-lg border border-[#d4351c]/20 bg-[#d4351c]/[.05] px-4 py-3 text-[13px] text-[#b42d18]">{error}</p>}

        <div className="mt-5 flex gap-2">
          <Link href={`/admin/bookings/${b.id}`} className={buttonClass('tint', 'cs', 'flex-1')}>
            예약 상세
          </Link>
          <button type="button" onClick={onClose} className={buttonClass('tint', 'cs', 'flex-1')}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
