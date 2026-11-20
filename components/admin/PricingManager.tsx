'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, buttonClass } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/Field';
import {
  addHolidayAction,
  addPeakAction,
  deleteHolidayAction,
  deletePeakAction,
  importHolidaysAction,
  updatePricesAction,
} from '@/lib/admin/config-actions';
import { formatWon } from '@/lib/format';

/*
  요금 — 상품별 주중·주말 요금 / 성수기(기간 내 매일 주말 요금) / 공휴일(연도별, 공공데이터 불러오기 + 직접 추가).
  주말 요금일 = 성수기 ∪ 금·토·일 ∪ 공휴일 ∪ 공휴일 전날 (DB is_weekend_rate 단일 출처).
*/

type Msg = { kind: 'error' | 'ok'; text: string } | null;
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-lg px-4 py-3 text-[13px] ${msg.kind === 'error' ? 'border border-[#d4351c]/20 bg-[#d4351c]/[.05] text-[#b42d18]' : 'bg-ice-100 text-ice-700'}`}>
      {msg.text}
    </p>
  );
}

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  function act<R extends { ok: boolean; error?: string }>(fn: () => Promise<R>, ok: string | ((r: R) => string)) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { kind: 'ok', text: typeof ok === 'function' ? ok(r) : ok } : { kind: 'error', text: r.error ?? '처리하지 못했습니다.' });
      router.refresh();
    });
  }
  return { pending, msg, act };
}

function PriceRow({ p }: { p: { type: string; name: string; weekday: number; weekend: number } }) {
  const [wd, setWd] = useState(String(p.weekday));
  const [we, setWe] = useState(String(p.weekend));
  const { pending, msg, act } = useAct();
  const changed = Number(wd) !== p.weekday || Number(we) !== p.weekend;
  return (
    <li className="py-3">
      <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <p className="col-span-2 text-[15px] font-semibold md:col-span-1 md:pb-3">{p.name}</p>
        <label>
          <span className="field-label">주중</span>
          <input value={wd} onChange={(e) => setWd(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={fieldClass('light', 'tabular-nums', 'cs')} />
        </label>
        <label>
          <span className="field-label">주말</span>
          <input value={we} onChange={(e) => setWe(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={fieldClass('light', 'tabular-nums', 'cs')} />
        </label>
        <Button
          size="cs"
          className="col-span-2 md:col-span-1"
          disabled={pending || !changed}
          onClick={() =>
            confirm(`${p.name} 요금을 주중 ${formatWon(Number(wd))} / 주말 ${formatWon(Number(we))}로 바꿀까요?\n이미 받은 예약 금액은 바뀌지 않습니다.`) &&
            act(() => updatePricesAction(p.type, Number(wd), Number(we)), '저장했습니다.')
          }
        >
          저장
        </Button>
      </div>
      <Note msg={msg} />
    </li>
  );
}

export function PricingManager({
  products,
  peaks,
  holidays,
  year,
}: {
  products: { type: string; name: string; weekday: number; weekend: number }[];
  peaks: { id: string; name: string; from: string; to: string }[];
  holidays: { date: string; name: string; source: string }[];
  year: number;
}) {
  const peak = useAct();
  const hol = useAct();
  const [pName, setPName] = useState('');
  const [pFrom, setPFrom] = useState('');
  const [pTo, setPTo] = useState('');
  const [hDate, setHDate] = useState('');
  const [hName, setHName] = useState('');

  return (
    <div className="space-y-5">
      <section className="panel">
        <h2 className="panel-title">상품별 요금</h2>
        <p className="mt-1 text-[13px] text-ink-2">1동(1대) 1일 기준. 바꾼 요금은 새 예약부터 적용됩니다.</p>
        <ul className="mt-2 divide-y divide-line">
          {products.map((p) => (
            <PriceRow key={p.type} p={p} />
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">성수기</h2>
        <p className="mt-1 text-[13px] text-ink-2">기간 안에는 요일과 관계없이 매일 주말 요금입니다(양 끝 포함).</p>
        <ul className="mt-3 divide-y divide-line">
          {peaks.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[14px]">
              <span>
                <b className="font-semibold">{p.name}</b>
                <span className="ml-2 tabular-nums text-ink-2">
                  {p.from} ~ {p.to}
                </span>
              </span>
              <button type="button" disabled={peak.pending} onClick={() => confirm(`'${p.name}'을(를) 지울까요?`) && peak.act(() => deletePeakAction(p.id), '지웠습니다.')} className="text-[13px] font-medium text-[#b42d18]">
                삭제
              </button>
            </li>
          ))}
          {peaks.length === 0 && <li className="py-3 text-[14px] text-ink-3">등록된 성수기가 없습니다.</li>}
        </ul>
        <form
          className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-[1.4fr_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            peak.act(async () => {
              const r = await addPeakAction(pName, pFrom, pTo);
              if (r.ok) {
                setPName('');
                setPFrom('');
                setPTo('');
              }
              return r;
            }, '추가했습니다.');
          }}
        >
          <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="이름 (예: 2027-28 동계 성수기)" aria-label="성수기 이름" className={fieldClass('light', 'col-span-2 md:col-span-1', 'cs')} />
          <input type="date" value={pFrom} onChange={(e) => setPFrom(e.target.value)} aria-label="시작" className={fieldClass('light', 'tabular-nums', 'cs')} />
          <input type="date" value={pTo} min={pFrom} onChange={(e) => setPTo(e.target.value)} aria-label="끝" className={fieldClass('light', 'tabular-nums', 'cs')} />
          <Button type="submit" size="cs" variant="tint" className="col-span-2 md:col-span-1" disabled={peak.pending || !pName || !pFrom || !pTo}>
            추가
          </Button>
        </form>
        <Note msg={peak.msg} />
      </section>

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">공휴일 {year}</h2>
          <div className="flex items-center gap-2">
            <Link href={`/admin/pricing?year=${year - 1}`} className={buttonClass('tint', 'cs', 'w-11 px-0')} aria-label="이전 해">
              ‹
            </Link>
            <Link href={`/admin/pricing?year=${year + 1}`} className={buttonClass('tint', 'cs', 'w-11 px-0')} aria-label="다음 해">
              ›
            </Link>
            <Button
              size="cs"
              disabled={hol.pending}
              onClick={() => hol.act(() => importHolidaysAction(year), (r) => (r.ok && r.data ? `불러왔습니다 — ${r.data.total}일 중 새로 ${r.data.added}일 추가` : '불러왔습니다.'))}
            >
              {hol.pending ? '불러오는 중…' : '공공데이터에서 불러오기'}
            </Button>
          </div>
        </div>
        <p className="mt-1 text-[13px] text-ink-2">공휴일과 그 전날은 주말 요금입니다. 임시공휴일은 지정되면 직접 추가하거나 다시 불러오세요. 이미 있는 날짜는 덮어쓰지 않습니다.</p>
        <ul className="mt-3 grid gap-x-6 md:grid-cols-2">
          {holidays.map((h) => {
            const w = WEEK[new Date(`${h.date}T00:00:00Z`).getUTCDay()];
            return (
              <li key={h.date} className="flex items-center justify-between gap-2 border-b border-line py-2.5 text-[14px]">
                <span>
                  <span className="tabular-nums text-ink-2">
                    {h.date.slice(5)} ({w})
                  </span>{' '}
                  <b className="font-semibold">{h.name}</b>
                  {h.source === 'manual' && <span className="ml-1.5 text-[11px] text-ice-600">직접</span>}
                </span>
                <button type="button" disabled={hol.pending} onClick={() => confirm(`${h.date} ${h.name}을(를) 지울까요?`) && hol.act(() => deleteHolidayAction(h.date), '지웠습니다.')} className="text-[13px] text-ink-3 hover:text-[#b42d18]" aria-label={`${h.name} 삭제`}>
                  ×
                </button>
              </li>
            );
          })}
          {holidays.length === 0 && <li className="py-3 text-[14px] text-ink-3">등록된 공휴일이 없습니다. 위 버튼으로 불러오세요.</li>}
        </ul>
        <form
          className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-[1fr_1.4fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            hol.act(async () => {
              const r = await addHolidayAction(hDate, hName);
              if (r.ok) {
                setHDate('');
                setHName('');
              }
              return r;
            }, '추가했습니다.');
          }}
        >
          <input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} aria-label="날짜" className={fieldClass('light', 'tabular-nums', 'cs')} />
          <input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="이름 (예: 임시공휴일)" aria-label="공휴일 이름" className={fieldClass('light', '', 'cs')} />
          <Button type="submit" size="cs" variant="tint" className="col-span-2 md:col-span-1" disabled={hol.pending || !hDate || !hName}>
            직접 추가
          </Button>
        </form>
        <Note msg={hol.msg} />
      </section>
    </div>
  );
}
