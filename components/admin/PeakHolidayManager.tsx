'use client';

import { useState } from 'react';

import { Note, useAct } from '@/components/admin/act';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { confirmDialog } from '@/components/ui/Dialog';
import { fieldClass } from '@/components/ui/Field';
import { addHolidayAction, addPeakAction, deleteHolidayAction, deletePeakAction, importHolidaysAction } from '@/lib/admin/config-actions';

/*
  운영 설정 — 성수기(기간 내 매일 주말 요금) / 공휴일(오늘 ~ 다가오는 3월 1일 한 목록, 공공데이터 불러오기 + 직접 추가).
  주말 요금일 = 성수기 ∪ 금·토·일 ∪ 공휴일 ∪ 공휴일 전날 (DB is_weekend_rate 단일 출처). 요금 금액은 요금 화면.
*/

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function PeakHolidayManager({
  peaks,
  holidays,
  range,
}: {
  peaks: { id: string; name: string; from: string; to: string }[];
  holidays: { date: string; name: string; source: string }[];
  range: { from: string; to: string };
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
              <button type="button" disabled={peak.pending} onClick={async () => (await confirmDialog(`'${p.name}'을(를) 지울까요?`, { confirmLabel: '삭제', danger: true })) && peak.act(() => deletePeakAction(p.id), '지웠습니다.')} className="text-[13px] font-medium text-[#b42d18]">
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
          <DatePicker value={pFrom} onChange={setPFrom} aria-label="시작" placeholder="시작" />
          <DatePicker value={pTo} min={pFrom || undefined} onChange={setPTo} aria-label="끝" placeholder="끝" />
          <Button type="submit" size="cs" variant="tint" className="col-span-2 md:col-span-1" disabled={peak.pending || !pName || !pFrom || !pTo}>
            추가
          </Button>
        </form>
        <Note msg={peak.msg} />
      </section>

      <section id="holidays" className="panel scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">공휴일</h2>
          <div className="flex items-center gap-2">
            <Button
              size="cs"
              disabled={hol.pending}
              onClick={() => hol.act(() => importHolidaysAction(), (r) => (r.ok && r.data ? `불러왔습니다 — ${r.data.total}일 중 새로 ${r.data.added}일 추가` : '불러왔습니다.'))}
            >
              {hol.pending ? '불러오는 중…' : '공공데이터에서 불러오기'}
            </Button>
          </div>
        </div>
        <p className="mt-1 text-[13px] text-ink-2">
          오늘부터 <span className="tabular-nums">{range.to.replaceAll('-', '. ')}</span>까지 보입니다(불러오기도 이 기간만). 공휴일과 그 전날은 주말 요금입니다. 임시공휴일은 지정되면 직접 추가하거나 다시 불러오세요. 이미 있는 날짜는 덮어쓰지 않습니다.</p>
        <ul className="mt-3 grid gap-x-6 md:grid-cols-2">
          {holidays.map((h) => {
            const w = WEEK[new Date(`${h.date}T00:00:00Z`).getUTCDay()];
            return (
              <li key={h.date} className="flex items-center justify-between gap-2 border-b border-line py-2.5 text-[14px]">
                <span>
                  <span className="tabular-nums text-ink-2">
                    {h.date.replaceAll('-', '. ')} ({w})
                  </span>{' '}
                  <b className="font-semibold">{h.name}</b>
                  {h.source === 'manual' && <span className="ml-1.5 text-[11px] text-ice-600">직접</span>}
                </span>
                <button type="button" disabled={hol.pending} onClick={async () => (await confirmDialog(`${h.date} ${h.name}을(를) 지울까요?`, { confirmLabel: '삭제', danger: true })) && hol.act(() => deleteHolidayAction(h.date), '지웠습니다.')} className="text-[13px] text-ink-3 hover:text-[#b42d18]" aria-label={`${h.name} 삭제`}>
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
          <DatePicker value={hDate} min={range.from} max={range.to} onChange={setHDate} aria-label="날짜" />
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
