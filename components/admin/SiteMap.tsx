'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { shortLabel } from '@/components/admin/Board';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { confirmDialog } from '@/components/ui/Dialog';
import { fieldClass } from '@/components/ui/Field';
import { cancelSpecialAction, checkInAction, checkOutAction, registerSpecialAction, seatAction, undoCheckAction } from '@/lib/admin/actions';
import type { BoardBooking, BoardCell, BoardGroup } from '@/lib/admin/board';
import { statusBadge } from '@/lib/admin/labels';
import { MAP_BASE, MAP_BLOCKS, MAP_COLS, SLOT_ORDER, SLOT_ORDER_TENTATIVE, SPECIAL_NUDGE_PX, type MapRow, type MapSlot, type SlotType } from '@/lib/admin/site-map';
import { formatPhone } from '@/lib/format';

/*
  현장 배치도(Beta) — 선착순 현장 배정.
  - 예약의 유닛은 도착 전까지 가배정(재고 계산용)일 뿐이라 배치도에 그리지 않는다.
    배치도의 '찬 자리' = 입실·퇴실한 손님(+ 특수 S1·S2 는 등록한 자리).
  - 손님 도착 → 찾기(이름·전화 뒤 4자리·예약번호) → 고르면 앉을 수 있는 빈자리가 밝아짐 → 원하는 자리를 누르면 배정 + 입실.
    (그 자리를 아직 안 온 예약이 가배정으로 잡고 있으면 DB 가 맞바꾼다)
  - 입실한 손님을 고르고 다른 빈자리를 누르면 자리 이동.
  - 빈 S1·S2 를 누르면 특수 등록(예약 오류·지인 방문 등, 무상).
*/

type Item = { booking: BoardBooking; cell: BoardCell; type: SlotType; typeName: string };
type Tile = { slot: MapSlot; cell: BoardCell; typeName: string };
type Run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void;

const SEATED = new Set(['checked_in', 'checked_out']);
const ROW_LINE: Record<MapRow, { tile: number; tag: number }> = { top: { tile: 2, tag: 1 }, bottom: { tile: 4, tag: 5 } };

/** 칸에 찬 손님: 입실·퇴실한 손님, 특수 자리는 등록(확정)부터 */
function occupantOf(cell: BoardCell, type: SlotType): BoardBooking | null {
  const b = cell.booking;
  if (!b) return null;
  if (SEATED.has(b.status)) return b;
  if (type === 'special' && b.status === 'confirmed') return b;
  return null;
}

function seatName(cell: BoardCell, type: SlotType) {
  return type === 'special' ? cell.label : shortLabel(cell.label);
}

function tileText(cell: BoardCell, type: SlotType) {
  if (type === 'special') return cell.label;
  const n = shortLabel(cell.label).replace(/\s*호$/, '');
  return type === 'caravan_group' ? `G${n}` : n;
}

function matches(b: BoardBooking, q: string) {
  const n = q.replace(/\s/g, '');
  if (!n) return true;
  const d = n.replace(/\D/g, '');
  return b.guestName.replace(/\s/g, '').includes(n) || (d.length >= 2 && ((b.guestPhone ?? '').endsWith(d) || (b.lookupCode ?? '') === d));
}

function tileTone(occ: BoardBooking | null, cell: BoardCell) {
  if (occ?.status === 'checked_in') return 'border-glacier bg-glacier text-white';
  if (occ?.status === 'checked_out') return 'border-ice-200 bg-ice-100 text-ink-2';
  if (occ) return 'border-ice-300 bg-white text-ink'; // 특수 등록(입실 전)
  if (cell.blackout) return 'border-dashed border-ink/15 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(14,26,43,.05)_6px_12px)] text-ink-3';
  return 'border-dashed border-ice-300 bg-transparent text-ink-3';
}

export function SiteMap({ groups, date, today }: { groups: BoardGroup[]; date: string; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState('');
  const [selId, setSelIdRaw] = useState<string | null>(null);
  // 입실한 손님 자리 옮기기는 '자리 옮기기'를 눌렀을 때만(실수로 옮기지 않게)
  const [moving, setMoving] = useState(false);
  const setSelId = (id: string | null) => {
    setSelIdRaw(id);
    setMoving(false);
  };
  const [registerUnit, setRegisterUnit] = useState<Tile | null>(null);
  const [error, setError] = useState('');

  const { tiles, offMap, items } = useMemo(() => {
    const tiles: Tile[] = [];
    const offMap: BoardCell[] = [];
    const items: Item[] = [];
    for (const g of groups) {
      const type = g.type as SlotType;
      const order = SLOT_ORDER[type] ?? [];
      g.cells.forEach((cell, i) => {
        if (order[i]) tiles.push({ slot: order[i], cell, typeName: g.name });
        else offMap.push(cell);
        if (cell.booking) items.push({ booking: cell.booking, cell, type, typeName: g.name });
      });
    }
    return { tiles, offMap, items };
  }, [groups]);

  const searching = q.trim().length > 0;
  const hits = items.filter((x) => matches(x.booking, q));
  const selectedId = selId ?? (searching && hits.length === 1 ? hits[0].booking.id : null);
  const sel = items.find((x) => x.booking.id === selectedId) ?? null;

  // 고른 손님이 자리를 고르는 중인지(도착 배정 / 입실 손님 이동). 특수는 자리가 정해져 있어 제외.
  const seating =
    !!sel && sel.type !== 'special' && date <= today && (sel.booking.status === 'confirmed' || (sel.booking.status === 'checked_in' && moving));
  const canTake = (t: Tile) =>
    seating &&
    t.slot.type === sel!.type &&
    !t.cell.blackout &&
    !occupantOf(t.cell, t.slot.type) &&
    !(sel!.booking.status === 'checked_in' && t.cell.unitId === sel!.cell.unitId);

  const run: Run = (fn, after) => {
    setError('');
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? '처리하지 못했습니다.');
        router.refresh();
        return;
      }
      after?.();
      router.refresh();
    });
  };

  function afterCheckIn(bookingId: string) {
    setQ('');
    setSelId(bookingId);
  }

  async function onTile(t: Tile) {
    setError('');
    const occ = occupantOf(t.cell, t.slot.type);
    if (sel && canTake(t)) {
      const b = sel.booking;
      const where = `${t.typeName} ${seatName(t.cell, t.slot.type)}`;
      const ok = await confirmDialog(
        b.status === 'confirmed' ? `${b.guestName}님을 ${where}에 배정할까요?\n배정과 함께 입실 처리됩니다.` : `${b.guestName}님 자리를 ${where}(으)로 옮길까요?`,
        { confirmLabel: b.status === 'confirmed' ? '배정·입실' : '옮기기' },
      );
      // 입실(배정)하면 검색창을 비우고, 방금 앉힌 손님은 계속 보여 준다
      if (ok) run(() => seatAction(b.id, t.cell.unitId), () => (b.status === 'confirmed' ? afterCheckIn(b.id) : setMoving(false)));
      return;
    }
    if (occ) {
      setRegisterUnit(null);
      setSelId(occ.id === selectedId ? null : occ.id);
      return;
    }
    if (!seating && t.slot.type === 'special' && !t.cell.blackout && date >= today) {
      setSelId(null);
      setRegisterUnit(t);
    }
  }

  const waiting = items.filter((x) => x.booking.status === 'confirmed' && x.type !== 'special');
  const count = (s: string) => items.filter((x) => x.booking.status === s).length;
  const freeBy = (type: SlotType) => tiles.filter((t) => t.slot.type === type && !t.cell.blackout && !occupantOf(t.cell, type)).length;

  const rank: Record<string, number> = { confirmed: 0, pending_payment: 1, cancel_requested: 2, checked_in: 3, checked_out: 4 };
  const list = (searching ? hits : items)
    .slice()
    .sort((a, b) => (rank[a.booking.status] ?? 9) - (rank[b.booking.status] ?? 9) || a.typeName.localeCompare(b.typeName));

  return (
    <div className="space-y-4">
      {/* 찾기 + 숫자 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="w-full sm:w-[320px]">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelId(null);
              setRegisterUnit(null);
            }}
            placeholder="이름 · 전화 뒤 4자리 · 예약번호"
            aria-label="예약 찾기"
            className={fieldClass('light', '', 'cs')}
          />
        </div>
        <p className="text-[13px] tabular-nums text-ink-2">
          도착 대기 {waiting.length} · 입실 {count('checked_in')} · 퇴실 {count('checked_out')}
          <span className="text-ink-3">
            {' '}
            · 빈자리 카바나 {freeBy('cabana')} · 카라반 {freeBy('caravan')} · 단체 {freeBy('caravan_group')}
          </span>
        </p>
      </div>

      {/* 배치도 */}
      <section className="overflow-x-auto rounded-2xl border border-line bg-white p-4 md:p-5">
        <div
          className="grid min-w-[600px] gap-x-[3px]"
          style={{ gridTemplateColumns: `repeat(${MAP_COLS}, minmax(0, 1fr))`, gridTemplateRows: 'auto 72px 128px 72px auto' }}
        >
          {/* 가운데 길 */}
          <div className="rounded-full bg-ice-50" style={{ gridColumn: `1 / span ${MAP_COLS}`, gridRow: 3, margin: '50px 0' }} aria-hidden />

          {/* 묶음 이름표 */}
          {MAP_BLOCKS.map((b) => (
            <p
              key={`${b.row}-${b.from}`}
              className={`flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-ink-2 ${b.row === 'top' ? 'pb-2' : 'pt-2'}`}
              style={{ gridColumn: `${b.from} / ${b.to + 1}`, gridRow: ROW_LINE[b.row].tag, translate: b.label === '특수' ? `${SPECIAL_NUDGE_PX}px 0` : undefined }}
            >
              <span className="h-px flex-1 bg-line" />
              {b.label}
              <span className="h-px flex-1 bg-line" />
            </p>
          ))}

          {/* 푸드트레일러 */}
          <div
            className="flex items-center justify-center rounded-md bg-glacier px-1 text-center font-display text-[11px] font-semibold leading-tight text-ice-50 xl:text-[12px]"
            style={{ gridColumn: `${MAP_BASE.col} / span ${MAP_BASE.span}`, gridRow: ROW_LINE[MAP_BASE.row].tile }}
          >
            {MAP_BASE.label}
          </div>

          {/* 칸 */}
          {tiles.map((t) => {
            const occ = occupantOf(t.cell, t.slot.type);
            const take = canTake(t);
            const isSel = !!occ && occ.id === selectedId;
            const isReg = registerUnit?.cell.unitId === t.cell.unitId;
            const dim = (seating && !take && !isSel) || (searching && !seating && !(occ && matches(occ, q)));
            const clickable = take || !!occ || (!seating && t.slot.type === 'special' && !t.cell.blackout && date >= today);
            return (
              <button
                key={t.cell.unitId}
                type="button"
                disabled={pending || !clickable}
                onClick={() => onTile(t)}
                title={`${t.typeName} ${seatName(t.cell, t.slot.type)}${occ ? ` · ${occ.guestName}` : t.cell.blackout ? ' · 점검' : ' · 빈자리'}`}
                aria-label={`${t.cell.label}${occ ? ` ${occ.guestName}` : t.cell.blackout ? ' 점검' : ' 빈자리'}`}
                aria-pressed={isSel || isReg}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-md border px-0.5 text-[11px] font-semibold tabular-nums tracking-[-0.03em] transition-[opacity,scale,box-shadow,background-color] duration-200 enabled:active:scale-95 xl:text-[12px] ${
                  take
                    ? 'border-ice-600 bg-ice-100 text-ice-700 enabled:hover:bg-ice-200'
                    : isSel || isReg
                      ? 'z-10 scale-110 border-ice-600 bg-ice-600 text-white shadow-[0_0_0_3px_#f0f5fa,0_0_0_5px_#33689f]'
                      : tileTone(occ, t.cell)
                } ${dim ? 'opacity-25' : ''}`}
                style={{ gridColumn: t.slot.col, gridRow: ROW_LINE[t.slot.row].tile, translate: t.slot.type === 'special' ? `${SPECIAL_NUDGE_PX}px 0` : undefined }}
              >
                <span>{tileText(t.cell, t.slot.type)}</span>
                {occ && <span className="max-w-full truncate text-[10px] font-medium leading-none opacity-80">{occ.guestName.slice(0, 3)}</span>}
                {isSel && occ && (
                  <span
                    className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold text-white ${
                      t.slot.row === 'top' ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
                    }`}
                  >
                    {occ.guestName}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-2">
          {[
            ['border-dashed border-ice-300', '빈자리'],
            ['border-glacier bg-glacier', '입실'],
            ['border-ice-200 bg-ice-100', '퇴실'],
            ['border-ice-300 bg-white', '특수 등록'],
            ['border-ice-600 bg-ice-100', '배정할 수 있는 자리'],
          ].map(([cls, l]) => (
            <li key={l} className="flex items-center gap-1.5">
              <span className={`h-3 w-4 rounded border ${cls}`} />
              {l}
            </li>
          ))}
          {SLOT_ORDER_TENTATIVE && <li className="ml-auto text-ink-3">칸 번호는 임시 순서입니다(1번 위치 확정 전)</li>}
        </ul>
      </section>

      {offMap.length > 0 && <p className="px-1 text-[13px] text-ink-2">배치도에 자리가 없는 유닛: {offMap.map((c) => c.label).join(', ')}</p>}

      {error && <p role="alert" className="rounded-xl border border-[#d4351c]/20 bg-[#d4351c]/[.05] px-4 py-3 text-[13px] text-[#b42d18]">{error}</p>}

      {/* 고른 예약 / 특수 등록 / 안내 */}
      {registerUnit ? (
        <SpecialForm key={registerUnit.cell.unitId} tile={registerUnit} date={date} onDone={() => setRegisterUnit(null)} />
      ) : sel ? (
        <Selected
          key={sel.booking.id}
          item={sel}
          date={date}
          today={today}
          moving={moving}
          setMoving={setMoving}
          onCheckedIn={() => afterCheckIn(sel.booking.id)}
          free={freeBy(sel.type)}
          pending={pending}
          run={run}
          onClose={() => setSelId(null)}
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[14px] text-ink-2">
          {searching && hits.length === 0 ? '찾는 예약이 없습니다.' : '도착한 손님을 찾아 고른 뒤 원하는 빈자리를 누르면 배정·입실됩니다. 빈 S1·S2 를 누르면 특수 등록.'}
        </p>
      )}

      {/* 목록 */}
      <section className="rounded-2xl border border-line bg-white">
        <h2 className="panel-title px-5 pt-5 md:px-6">{searching ? `찾은 예약 ${list.length}` : `${date === today ? '오늘' : '이날'} 예약 ${list.length}`}</h2>
        {list.length === 0 ? (
          <p className="px-5 pt-3 pb-6 text-[14px] text-ink-2 md:px-6">예약이 없습니다.</p>
        ) : (
          <>
          {/* 열 이름 — 칸 배치는 아래 줄과 같은 그리드(폰에서는 줄이 두 칸이라 숨김) */}
          <div className="mt-3 hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_90px_90px_96px] gap-x-4 border-b border-line px-6 pb-2.5 text-[12px] font-medium text-ink-3 md:grid"
          >
            <span>성명</span>
            <span>예약 상품</span>
            <span>휴대폰 뒷번호</span>
            <span>예약 번호</span>
            <span />
          </div>
          <ul className="mt-2 divide-y divide-line md:mt-0">
            {list.map((x) => {
              const b = x.booking;
              const s = statusBadge({ status: b.status });
              const isSel = b.id === selectedId;
              // 자리는 입실(특수는 등록) 뒤에만 보여 준다 — 그 전 유닛은 가배정이라 의미 없음
              const seat = occupantOf(x.cell, x.type) ? seatName(x.cell, x.type) : '';
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterUnit(null);
                      setSelId(isSel ? null : b.id);
                    }}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-5 py-3.5 text-left transition-colors md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_90px_90px_96px] md:px-6 ${
                      isSel ? 'bg-ice-50' : 'hover:bg-ice-50/60'
                    }`}
                  >
                    <span className="truncate text-[15px] font-semibold">{b.guestName}</span>
                    <span className="text-[14px] font-medium text-glacier">
                      {x.typeName}
                      {seat && ` ${seat}`}
                    </span>
                    <span className="text-[13px] tabular-nums text-ink-2">{b.guestPhone ? `…${b.guestPhone.slice(-4)}` : ''}</span>
                    <span className="hidden text-[13px] tabular-nums text-ink-2 md:block">{b.lookupCode ? `#${b.lookupCode}` : ''}</span>
                    <span className="justify-self-end">
                      <Badge tone={s.tone}>{x.type === 'special' && b.status === 'confirmed' ? '특수 등록' : s.label}</Badge>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Selected({
  item,
  date,
  today,
  moving,
  setMoving,
  onCheckedIn,
  free,
  pending,
  run,
  onClose,
}: {
  item: Item;
  date: string;
  today: string;
  moving: boolean;
  setMoving: (v: boolean) => void;
  onCheckedIn: () => void;
  free: number;
  pending: boolean;
  run: Run;
  onClose: () => void;
}) {
  const b = item.booking;
  const s = statusBadge({ status: b.status });
  const special = item.type === 'special';
  const hasSeat = !!occupantOf(item.cell, item.type);

  let hint = '';
  if (b.status === 'confirmed' && !special) {
    hint =
      date > today
        ? '이용일 당일부터 자리 배정·입실을 할 수 있습니다.'
        : free > 0
          ? `배치도에서 밝게 표시된 빈자리(${free})를 누르면 배정과 함께 입실됩니다.`
          : '빈자리가 없습니다.';
  } else if (b.status === 'checked_in' && !special && moving) {
    hint = free > 0 ? '옮길 빈자리를 배치도에서 누르세요.' : '옮길 빈자리가 없습니다.';
  } else if (b.status === 'pending_payment') {
    hint = '결제 대기 중인 예약입니다.';
  } else if (b.status === 'cancel_requested') {
    hint = '환불 처리 중인 예약입니다.';
  }

  return (
    <section className="rounded-2xl bg-glacier p-5 text-ice-50 md:p-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="min-w-[72px]">
          <p className="text-[13px] font-medium text-ice-100/70">{item.typeName}</p>
          <p className="stat mt-0.5 text-[34px] leading-none">{hasSeat ? seatName(item.cell, item.type) : '—'}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[20px] font-semibold tracking-[-0.02em]">{b.guestName}</p>
            <Badge tone={s.tone} surface="dark">
              {special && b.status === 'confirmed' ? '특수 등록' : s.label}
            </Badge>
          </div>
          <p className="mt-1 text-[14px] tabular-nums text-ice-100/75">
            {b.guestPhone ? formatPhone(b.guestPhone) : '전화 없음'}
            {b.lookupCode ? ` · 예약번호 ${b.lookupCode}` : ''}
            {b.note ? ` · ${b.note}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {special && b.status === 'confirmed' && date <= today && (
            <Button size="cs" variant="onDark" disabled={pending} onClick={() => run(() => checkInAction(b.id), onCheckedIn)}>
              입실 처리
            </Button>
          )}
          {b.status === 'checked_in' && (
            <Button size="cs" variant="onDark" disabled={pending} onClick={() => run(() => checkOutAction(b.id))}>
              퇴실 처리
            </Button>
          )}
          {b.status === 'checked_in' && !special && date <= today && (
            <button type="button" disabled={pending} onClick={() => setMoving(!moving)} className={darkGhost} aria-pressed={moving}>
              {moving ? '옮기기 취소' : '자리 옮기기'}
            </button>
          )}
          {SEATED.has(b.status) && (
            <button type="button" disabled={pending} onClick={() => run(() => undoCheckAction(b.id))} className={darkGhost}>
              {b.status === 'checked_out' ? '퇴실 되돌리기' : '입실 되돌리기'}
            </button>
          )}
          {special ? (
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                if (await confirmDialog(`${item.cell.label} 특수 등록을 취소할까요?\n${b.guestName}`, { confirmLabel: '등록 취소', danger: true })) {
                  run(() => cancelSpecialAction(b.id), onClose);
                }
              }}
              className={darkGhost}
            >
              등록 취소
            </button>
          ) : (
            <Link href={`/admin/bookings/${b.id}`} className={darkGhost}>
              예약 상세
            </Link>
          )}
          <button type="button" onClick={onClose} className={darkGhost}>
            닫기
          </button>
        </div>
      </div>
      {hint && <p className="mt-4 border-t border-white/10 pt-3.5 text-[13px] text-ice-100/80">{hint}</p>}
    </section>
  );
}

function SpecialForm({ tile, date, onDone }: { tile: Tile; date: string; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      className="rounded-2xl border border-line bg-white p-5 md:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        start(async () => {
          const res = await registerSpecialAction({ unitId: tile.cell.unitId, date, name, phone, note });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          router.refresh();
          onDone();
        });
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="panel-title">{tile.cell.label} 특수 등록</h2>
        <p className="text-[13px] text-ink-2">예약 오류·지인 방문 등 · 무상(0원)</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
        <label>
          <span className="field-label">이름</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={fieldClass('light', '', 'cs')} />
        </label>
        <label>
          <span className="field-label">휴대폰(선택)</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={fieldClass('light', 'tabular-nums', 'cs')} />
        </label>
        <label>
          <span className="field-label">메모(선택)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="사유 등" className={fieldClass('light', '', 'cs')} />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-[#b42d18]">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Button type="submit" size="cs" disabled={pending || !name.trim()}>
          등록
        </Button>
        <button type="button" onClick={onDone} className={buttonClass('tint', 'cs')}>
          닫기
        </button>
      </div>
    </form>
  );
}

const darkGhost = buttonClass('onDarkSecondary', 'cs');
