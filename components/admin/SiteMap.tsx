'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { cellTone, shortLabel } from '@/components/admin/Board';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/Field';
import { checkInAction, checkOutAction, undoCheckAction } from '@/lib/admin/actions';
import type { BoardCell, BoardGroup } from '@/lib/admin/board';
import { statusBadge } from '@/lib/admin/labels';
import {
  MAP_BASE,
  MAP_BLOCKS,
  MAP_FIRST_COL,
  MAP_LAST_COL,
  SLOT_ORDER,
  SLOT_ORDER_TENTATIVE,
  colIndex,
  type MapRow,
  type MapSlot,
  type SlotType,
} from '@/lib/admin/site-map';
import { formatPhone } from '@/lib/format';

/*
  현장 배치도(Beta) — 손님이 도착하면 이름·전화 뒤 4자리·예약번호로 찾고, 위치를 배치도에서 바로 보고 키를 준다.
  - 위: 위에서 본 배치(운영자 시트 그대로). 칸 색 = 상태(현장 배정 보드와 같은 색)
  - 가운데: 고른 예약 — 입실·퇴실·되돌리기
  - 아래: 그날 예약 목록(검색하면 배치도에서 나머지는 흐려짐)
  유닛 옮기기는 기존 현장 배정 보드에서.
*/

const TYPE_NAME: Record<SlotType, string> = { cabana: '카바나', caravan: '카라반', caravan_group: '단체카라반' };
const FIRST = colIndex(MAP_FIRST_COL);
const COLS = colIndex(MAP_LAST_COL) - FIRST + 1;
// 그리드 줄: 1 위 이름표 · 2 위 칸 · 3 가운데 길 · 4 아래 칸 · 5 아래 이름표
const ROW_LINE: Record<MapRow, { tile: number; tag: number }> = { top: { tile: 2, tag: 1 }, bottom: { tile: 4, tag: 5 } };
const gridCol = (col: string) => colIndex(col) - FIRST + 1;

type Placed = { slot: MapSlot; cell: BoardCell; typeName: string };

function digits(label: string) {
  return shortLabel(label).replace(/\s*호$/, '');
}

function matches(c: BoardCell, q: string) {
  const b = c.booking;
  if (!b) return false;
  const n = q.replace(/\s/g, '');
  if (!n) return true;
  const d = n.replace(/\D/g, '');
  return (
    b.guestName.replace(/\s/g, '').includes(n) ||
    (d.length >= 2 && ((b.guestPhone ?? '').endsWith(d) || (b.lookupCode ?? '') === d)) ||
    c.label.replace(/\s/g, '').includes(n)
  );
}

export function SiteMap({ groups, date, today }: { groups: BoardGroup[]; date: string; today: string }) {
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);

  // 유닛(정렬 순) ↔ 자리(SLOT_ORDER 순)
  const { placed, offMap } = useMemo(() => {
    const placed: Placed[] = [];
    const offMap: { cell: BoardCell; typeName: string }[] = [];
    for (const g of groups) {
      const order = SLOT_ORDER[g.type as SlotType] ?? [];
      g.cells.forEach((cell, i) => {
        if (order[i]) placed.push({ slot: order[i], cell, typeName: g.name });
        else offMap.push({ cell, typeName: g.name });
      });
    }
    return { placed, offMap };
  }, [groups]);

  const all = useMemo(() => [...placed.map((p) => ({ cell: p.cell, typeName: p.typeName })), ...offMap], [placed, offMap]);
  const booked = all.filter((x) => x.cell.booking);
  const hits = booked.filter((x) => matches(x.cell, q));
  const searching = q.trim().length > 0;
  // 검색 결과가 하나면 바로 고른다
  const selectedUnit = selId ?? (searching && hits.length === 1 ? hits[0].cell.unitId : null);
  const selected = all.find((x) => x.cell.unitId === selectedUnit && x.cell.booking) ?? null;

  const counts = {
    booked: booked.length,
    waiting: booked.filter((x) => x.cell.booking!.status === 'confirmed').length,
    in: booked.filter((x) => x.cell.booking!.status === 'checked_in').length,
    out: booked.filter((x) => x.cell.booking!.status === 'checked_out').length,
  };

  // 목록: 입실 전 → 입실 → 퇴실, 같은 상태 안에서는 상품·번호 순
  const rank: Record<string, number> = { confirmed: 0, pending_payment: 1, cancel_requested: 2, checked_in: 3, checked_out: 4 };
  const list = (searching ? hits : booked).slice().sort((a, b) => (rank[a.cell.booking!.status] ?? 9) - (rank[b.cell.booking!.status] ?? 9));

  return (
    <div className="space-y-4">
      {/* 찾기 + 숫자 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-[320px]">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelId(null);
            }}
            placeholder="이름 · 전화 뒤 4자리 · 예약번호"
            aria-label="예약 찾기"
            className={fieldClass('light', '', 'cs')}
          />
        </div>
        <p className="text-[13px] tabular-nums text-ink-2">
          예약 {counts.booked} · 입실 전 {counts.waiting} · 입실 {counts.in} · 퇴실 {counts.out}
        </p>
      </div>

      {/* 배치도 */}
      <section className="overflow-x-auto rounded-2xl border border-line bg-white p-4 md:p-6">
        <div
          className="grid min-w-[700px] gap-x-[2px] md:gap-x-[3px]"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: 'auto 64px 72px 64px auto' }}
        >
          {/* 가운데 길 */}
          <div className="rounded-full bg-ice-50" style={{ gridColumn: `1 / span ${COLS}`, gridRow: 3, margin: '22px 0' }} aria-hidden />

          {/* 묶음 이름표 */}
          {MAP_BLOCKS.map((b) => (
            <p
              key={`${b.row}-${b.from}`}
              className={`flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-ink-2 ${b.row === 'top' ? 'pb-2' : 'pt-2'}`}
              style={{ gridColumn: `${gridCol(b.from)} / ${gridCol(b.to) + 1}`, gridRow: ROW_LINE[b.row].tag }}
            >
              <span className="h-px flex-1 bg-line" />
              {b.type === 'caravan_group' ? '단체' : TYPE_NAME[b.type]}
              <span className="h-px flex-1 bg-line" />
            </p>
          ))}

          {/* Base */}
          <div
            className="flex items-center justify-center rounded-md bg-glacier font-display text-[12px] font-semibold text-ice-50"
            style={{ gridColumn: `${gridCol(MAP_BASE.col)} / span 2`, gridRow: ROW_LINE[MAP_BASE.row].tile }}
          >
            {MAP_BASE.label}
          </div>

          {/* 칸 */}
          {placed.map(({ slot, cell, typeName }) => {
            const b = cell.booking;
            const isSel = selectedUnit === cell.unitId && !!b;
            const dim = searching && !matches(cell, q);
            return (
              <button
                key={cell.unitId}
                type="button"
                disabled={!b}
                onClick={() => setSelId(isSel ? null : cell.unitId)}
                title={`${typeName} ${shortLabel(cell.label)}${b ? ` · ${b.guestName}` : cell.blackout ? ' · 점검' : ' · 빈 칸'}`}
                aria-label={`${cell.label}${b ? ` ${b.guestName}` : ''}`}
                aria-pressed={isSel}
                className={`relative flex items-center justify-center rounded-md border text-[11px] font-semibold tabular-nums tracking-[-0.03em] transition-[opacity,scale,box-shadow] xl:text-[12px] duration-200 enabled:active:scale-95 ${
                  isSel ? 'z-10 scale-110 border-ice-600 bg-ice-600 text-white shadow-[0_0_0_3px_#f0f5fa,0_0_0_5px_#33689f]' : cellTone(cell)
                } ${dim ? 'opacity-25' : ''}`}
                style={{ gridColumn: gridCol(slot.col), gridRow: ROW_LINE[slot.row].tile }}
              >
                {slot.type === 'caravan_group' ? `G${digits(cell.label)}` : digits(cell.label)}
                {/* 고른 칸 이름표 — 가운데 길 쪽으로 */}
                {isSel && b && (
                  <span
                    className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold text-white ${
                      slot.row === 'top' ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
                    }`}
                  >
                    {b.guestName}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-2">
          {[
            ['border-ice-300 bg-white', '입실 전'],
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
          {SLOT_ORDER_TENTATIVE && <li className="ml-auto text-ink-3">칸 번호는 임시 순서입니다(1번 위치 확정 전)</li>}
        </ul>
      </section>

      {offMap.length > 0 && (
        <p className="px-1 text-[13px] text-ink-2">
          배치도에 자리가 없는 유닛: {offMap.map((x) => `${x.cell.label}${x.cell.booking ? `(${x.cell.booking.guestName})` : ''}`).join(', ')}
        </p>
      )}

      {/* 고른 예약 */}
      {selected ? (
        <Selected key={selected.cell.unitId} cell={selected.cell} typeName={selected.typeName} date={date} today={today} onClose={() => setSelId(null)} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[14px] text-ink-2">
          {searching && hits.length === 0 ? '찾는 예약이 없습니다.' : '배치도의 칸이나 아래 목록에서 예약을 고르세요.'}
        </p>
      )}

      {/* 목록 */}
      <section className="rounded-2xl border border-line bg-white">
        <h2 className="panel-title px-5 pt-5 md:px-6">{searching ? `찾은 예약 ${list.length}` : `${date === today ? '오늘' : '이날'} 예약 ${list.length}`}</h2>
        {list.length === 0 ? (
          <p className="px-5 pt-3 pb-6 text-[14px] text-ink-2 md:px-6">예약이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {list.map(({ cell, typeName }) => {
              const b = cell.booking!;
              const s = statusBadge({ status: b.status });
              const isSel = selectedUnit === cell.unitId;
              return (
                <li key={cell.unitId}>
                  <button
                    type="button"
                    onClick={() => setSelId(cell.unitId)}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-5 py-3.5 text-left transition-colors md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_90px_90px_96px] md:px-6 ${
                      isSel ? 'bg-ice-50' : 'hover:bg-ice-50/60'
                    }`}
                  >
                    <span className="truncate text-[15px] font-semibold">{b.guestName}</span>
                    <span className="text-[14px] font-medium text-glacier md:order-none">
                      {typeName} {shortLabel(cell.label)}
                    </span>
                    <span className="text-[13px] tabular-nums text-ink-2">{b.guestPhone ? `…${b.guestPhone.slice(-4)}` : ''}</span>
                    <span className="hidden text-[13px] tabular-nums text-ink-2 md:block">{b.lookupCode ? `#${b.lookupCode}` : ''}</span>
                    <span className="justify-self-end">
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Selected({ cell, typeName, date, today, onClose }: { cell: BoardCell; typeName: string; date: string; today: string; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const b = cell.booking!;
  const s = statusBadge({ status: b.status });

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError('');
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? '처리하지 못했습니다.');
        return;
      }
      router.refresh();
    });
  }

  const canIn = b.status === 'confirmed' && date <= today;
  const canOut = b.status === 'checked_in';
  const canUndo = b.status === 'checked_in' || b.status === 'checked_out';

  return (
    <section className="rounded-2xl bg-glacier p-5 text-ice-50 md:p-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div>
          <p className="text-[13px] font-medium text-ice-100/70">{typeName}</p>
          <p className="stat mt-0.5 text-[34px] leading-none">{shortLabel(cell.label)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[20px] font-semibold tracking-[-0.02em]">{b.guestName}</p>
            <Badge tone={s.tone} surface="dark">
              {s.label}
            </Badge>
          </div>
          <p className="mt-1 text-[14px] tabular-nums text-ice-100/75">
            {b.guestPhone ? formatPhone(b.guestPhone) : ''}
            {b.lookupCode ? ` · 예약번호 ${b.lookupCode}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canIn && (
            <Button size="cs" variant="onDark" disabled={pending} onClick={() => run(() => checkInAction(b.id))}>
              입실 처리
            </Button>
          )}
          {canOut && (
            <Button size="cs" variant="onDark" disabled={pending} onClick={() => run(() => checkOutAction(b.id))}>
              퇴실 처리
            </Button>
          )}
          {canUndo && (
            <button type="button" disabled={pending} onClick={() => run(() => undoCheckAction(b.id))} className={darkGhost}>
              {b.status === 'checked_out' ? '퇴실 되돌리기' : '입실 되돌리기'}
            </button>
          )}
          <Link href={`/admin/bookings/${b.id}`} className={darkGhost}>
            예약 상세
          </Link>
          <button type="button" onClick={onClose} aria-label="닫기" className={darkGhost}>
            닫기
          </button>
        </div>
      </div>
      {b.status === 'confirmed' && date > today && <p className="mt-3 text-[13px] text-ice-100/70">입실 처리는 이용일 당일부터 할 수 있습니다.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-white/10 px-4 py-3 text-[13px] text-white">{error}</p>}
    </section>
  );
}

const darkGhost = buttonClass('onDarkSecondary', 'cs');
