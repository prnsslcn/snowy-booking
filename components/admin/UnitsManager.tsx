'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { confirmDialog, promptDialog } from '@/components/ui/Dialog';
import { fieldClass } from '@/components/ui/Field';
import { moveUnitAction } from '@/lib/admin/actions';
import type { BlackoutRow, UnitRow } from '@/lib/admin/config';
import {
  addUnitAction,
  blackoutConflictsAction,
  createBlackoutAction,
  deleteBlackoutAction,
  setUnitActiveAction,
  type Conflict,
} from '@/lib/admin/config-actions';
import { statusBadge } from '@/lib/admin/labels';

/*
  유닛·점검.
  - 유닛: 상품별 칩. 눌러서 켜기/끄기(끄기 = 영구 철수, 오늘 이후 배정 예약이 있으면 거부). 새 유닛 추가.
  - 점검(기간 지정 운영 중지) — CLAUDE.md §14 흐름: 확인 → 걸린 예약 경고 → 빈 유닛으로 옮김 → 다시 확인(0건) → 잠그기.
*/

type Msg = { kind: 'error' | 'ok'; text: string } | null;

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return msg.kind === 'error' ? (
    <p role="alert" className="rounded-lg border border-[#d4351c]/20 bg-[#d4351c]/[.05] px-4 py-3 text-[13px] text-[#b42d18]">{msg.text}</p>
  ) : (
    <p role="status" className="rounded-lg bg-ice-100 px-4 py-3 text-[13px] text-ice-700">{msg.text}</p>
  );
}

export function UnitsManager({ types, units, blackouts, today }: { types: { type: string; name: string }[]; units: UnitRow[]; blackouts: BlackoutRow[]; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);

  // 점검 등록 상태
  const [bType, setBType] = useState(types[0]?.type ?? '');
  const [bUnit, setBUnit] = useState('');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState('');
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [bMsg, setBMsg] = useState<Msg>(null);

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, set = setMsg) {
    set(null);
    start(async () => {
      const r = await fn();
      set(r.ok ? { kind: 'ok', text: ok } : { kind: 'error', text: r.error ?? '처리하지 못했습니다.' });
      router.refresh();
    });
  }

  function check() {
    setBMsg(null);
    start(async () => {
      const r = await blackoutConflictsAction(bUnit, from, to);
      if (!r.ok) return setBMsg({ kind: 'error', text: r.error });
      setConflicts(r.data ?? []);
    });
  }

  const unitsOf = (t: string) => units.filter((u) => u.type === t);
  const nextLabel = (t: string) => {
    const name = types.find((x) => x.type === t)?.name ?? '';
    const max = Math.max(0, ...unitsOf(t).map((u) => Number(u.label.match(/(\d+)\s*호$/)?.[1] ?? 0)));
    return `${name} ${max + 1}호`;
  };

  return (
    <div className="space-y-5">
      {/* 유닛 */}
      {types.map((t) => {
        const list = unitsOf(t.type);
        const on = list.filter((u) => u.isActive).length;
        return (
          <section key={t.type} className="panel">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="panel-title">{t.name}</h2>
              <p className="text-[13px] tabular-nums text-ink-2">
                운영 {on} · 철수 {list.length - on}
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {list.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={async () =>
                      (await confirmDialog(u.isActive ? `${u.label}을(를) 운영에서 뺄까요?\n영구 철수입니다. 일시 점검은 아래 '점검 기간'으로 등록하세요.` : `${u.label}을(를) 다시 운영할까요?`, {
                        confirmLabel: u.isActive ? '운영 중지' : '다시 운영',
                        danger: u.isActive,
                      })) &&
                      act(() => setUnitActiveAction(u.id, !u.isActive), u.isActive ? `${u.label} 운영 중지` : `${u.label} 다시 운영`)
                    }
                    className={`h-9 rounded-full border px-3.5 text-[13px] font-medium tabular-nums transition-colors ${
                      u.isActive ? 'border-ice-300 bg-white text-ink hover:border-ice-500' : 'border-dashed border-ink/20 text-ink-3 line-through'
                    }`}
                  >
                    {u.label.replace(`${t.name} `, '')}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  disabled={pending}
                  onClick={async () => {
                    const label = await promptDialog('새 유닛 이름', nextLabel(t.type), { confirmLabel: '추가' });
                    if (label) act(() => addUnitAction(t.type, label), `${label} 추가`);
                  }}
                  className="h-9 rounded-full bg-ice-100 px-3.5 text-[13px] font-medium text-ice-600"
                >
                  + 유닛 추가
                </button>
              </li>
            </ul>
          </section>
        );
      })}
      <p className="px-1 text-[12px] text-ink-2">유닛을 누르면 운영 중지(영구 철수)·다시 운영을 바꿉니다. 일시 점검은 아래 &lsquo;점검 기간&rsquo;으로 등록하세요.</p>
      <Note msg={msg} />

      {/* 점검 등록 */}
      <section className="panel">
        <h2 className="panel-title">점검 기간 등록</h2>
        <p className="mt-1 text-[13px] text-ink-2">기간 동안 이 유닛은 배정·판매에서 빠집니다. 그 기간에 이미 배정된 예약이 있으면 먼저 다른 유닛으로 옮겨야 잠글 수 있습니다.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          <label>
            <span className="field-label">상품</span>
            <select
              value={bType}
              onChange={(e) => {
                setBType(e.target.value);
                setBUnit('');
                setConflicts(null);
              }}
              className={fieldClass('light', 'appearance-none', 'cs')}
            >
              {types.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">유닛</span>
            <select
              value={bUnit}
              onChange={(e) => {
                setBUnit(e.target.value);
                setConflicts(null);
              }}
              className={fieldClass('light', 'appearance-none', 'cs')}
            >
              <option value="">선택</option>
              {unitsOf(bType)
                .filter((u) => u.isActive)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="field-label">시작</span>
            <input type="date" min={today} value={from} onChange={(e) => {
                setFrom(e.target.value);
                setConflicts(null);
              }} className={fieldClass('light', 'tabular-nums', 'cs')} />
          </label>
          <label>
            <span className="field-label">끝</span>
            <input type="date" min={from} value={to} onChange={(e) => {
                setTo(e.target.value);
                setConflicts(null);
              }} className={fieldClass('light', 'tabular-nums', 'cs')} />
          </label>
          <Button size="cs" variant="tint" className="col-span-2 md:col-span-1" disabled={pending || !bUnit} onClick={check}>
            예약 확인
          </Button>
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 (선택) — 예: 난방 점검" aria-label="사유" className={fieldClass('light', 'mt-3', 'cs')} />

        {conflicts && conflicts.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-50 p-4">
            <p className="text-[14px] font-semibold text-amber-800">이 기간에 배정된 예약 {conflicts.length}건 — 다른 유닛으로 옮긴 뒤 다시 확인하세요</p>
            <ul className="mt-3 space-y-2">
              {conflicts.map((c) => (
                <ConflictRow key={c.bookingId} c={c} onMoved={check} />
              ))}
            </ul>
          </div>
        )}
        {conflicts && conflicts.length === 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ice-100 p-4">
            <p className="text-[14px] text-ice-700">걸리는 예약이 없습니다. 점검을 잠글 수 있습니다.</p>
            <Button
              size="cs"
              disabled={pending}
              onClick={() =>
                act(
                  async () => {
                    const r = await createBlackoutAction(bUnit, from, to, reason);
                    if (r.ok) {
                      setConflicts(null);
                      setReason('');
                    }
                    return r;
                  },
                  '점검 기간을 등록했습니다.',
                  setBMsg,
                )
              }
            >
              점검 잠그기
            </Button>
          </div>
        )}
        <div className="mt-3">
          <Note msg={bMsg} />
        </div>
      </section>

      {/* 예정·진행 중 점검 */}
      <section className="panel">
        <h2 className="panel-title">예정·진행 중 점검 {blackouts.length}건</h2>
        {blackouts.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-3">없습니다.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {blackouts.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px]">
                <span>
                  <b className="font-semibold">{b.unitLabel}</b>
                  <span className="ml-2 tabular-nums text-ink-2">
                    {b.from} ~ {b.to}
                  </span>
                  {b.reason && <span className="ml-2 text-ink-2">· {b.reason}</span>}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={async () => (await confirmDialog(`${b.unitLabel} 점검(${b.from} ~ ${b.to})을 풀까요?`, { confirmLabel: '점검 풀기' })) && act(() => deleteBlackoutAction(b.id), '점검을 풀었습니다.')}
                  className="text-[13px] font-medium text-[#b42d18]"
                >
                  점검 풀기
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ConflictRow({ c, onMoved }: { c: Conflict; onMoved: () => void }) {
  const [pending, start] = useTransition();
  const [unit, setUnit] = useState('');
  const [err, setErr] = useState('');
  const s = statusBadge({ status: c.status });
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-[14px]">
      <span className="min-w-0 flex-1">
        <span className="tabular-nums text-ink-2">{c.date}</span> <b className="font-semibold">{c.guestName}</b>
        <span className="ml-1.5 text-[12px] text-ink-2">{s.label}</span>
      </span>
      {c.freeUnits.length ? (
        <>
          <div className="w-40">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="옮길 유닛" className={fieldClass('light', 'appearance-none', 'cs')}>
              <option value="">빈 유닛 선택</option>
              {c.freeUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="cs"
            variant="tint"
            disabled={pending || !unit}
            onClick={() =>
              start(async () => {
                const r = await moveUnitAction(c.bookingId, unit, null);
                if (!r.ok) setErr(r.error ?? '옮기지 못했습니다.');
                else onMoved();
              })
            }
          >
            옮기기
          </Button>
        </>
      ) : (
        <span className="text-[13px] text-[#b42d18]">그날 빈 유닛 없음</span>
      )}
      {err && <span className="w-full text-[12px] text-[#b42d18]">{err}</span>}
    </li>
  );
}
