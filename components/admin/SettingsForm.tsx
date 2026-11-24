'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { confirmDialog } from '@/components/ui/Dialog';
import { Field, fieldClass } from '@/components/ui/Field';
import { saveSettingsAction, type SettingsInput } from '@/lib/admin/config-actions';
import { BOOKING_WINDOW_KO } from '@/lib/policy/booking-window';
import { DatePicker } from '@/components/ui/DatePicker';

/*
  운영 설정(grill-booking 일반설정 이식). 저장 버튼 없음 — 토글·날짜는 바꾸면 바로, 글자 칸은 벗어날 때 저장.
  - 영업 종료: 켜면 홈·예약 화면 → /off(홈과 같은 구성, 첫 화면만 Closed, 예약 버튼·링크 없음), 새 예약 API 차단. 문구의 {year} 는 올해로 바뀐다.
  - 시즌 기간: 이 기간 밖 날짜는 예약 불가(비우면 제한 없음).
  - 공지: 홈 첫 화면에 한 줄(기간 지정 가능).
*/

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 flex-none rounded-full transition-colors ${on ? 'bg-ice-600' : 'bg-ink/15'}`}
    >
      <span className={`absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function SettingsForm({ initial, year, defaults }: { initial: SettingsInput; year: string; defaults: { title: string; message: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState(initial);
  // 마지막으로 저장된 값 — 글자 칸은 이것과 달라졌을 때만 칸을 벗어나며 저장
  const saved = useRef(initial);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const y = (t: string) => t.replaceAll('{year}', year);
  const input = fieldClass('light', '', 'cs');

  const save = (next: SettingsInput) => {
    setS(next);
    if (JSON.stringify(next) === JSON.stringify(saved.current)) return;
    if (timer.current) clearTimeout(timer.current);
    setMsg(null);
    start(async () => {
      const r = await saveSettingsAction(next);
      if (r.ok) {
        saved.current = next;
        setMsg({ kind: 'ok', text: '저장했습니다.' });
        timer.current = setTimeout(() => setMsg(null), 1800);
      } else {
        setMsg({ kind: 'error', text: r.error });
        setS(saved.current); // 실패하면 저장된 값으로 되돌림
      }
      router.refresh();
    });
  };
  // 바로 저장(토글·날짜) / 입력만(글자 칸 — 벗어날 때 commit)
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => save({ ...s, [k]: v });
  const setN = <K extends keyof SettingsInput['notice']>(k: K, v: SettingsInput['notice'][K]) => save({ ...s, notice: { ...s.notice, [k]: v } });
  const type = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => setS((p) => ({ ...p, [k]: v }));
  const commit = () => save(s);

  const toggleClosed = async (v: boolean) => {
    const ok = await confirmDialog(v ? '영업 종료를 켤까요?\n홈·예약 화면이 영업 종료 안내로 바뀌고 새 예약이 막힙니다.' : '영업 종료를 끄고 다시 예약을 받을까요?', {
      confirmLabel: v ? '영업 종료' : '다시 열기',
      danger: v,
    });
    if (ok) set('businessClosed', v);
  };

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-ink-2">바꾸면 바로 저장됩니다. 글자 칸은 입력을 마치고 칸을 벗어나면 저장됩니다.</p>
      <section className={`rounded-xl border p-5 md:p-6 ${s.businessClosed ? 'border-[#d4351c]/25 bg-[#d4351c]/[.04]' : 'border-line bg-white'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="panel-title">영업 종료</h2>
            <p className="mt-1 text-[13px] text-ink-2">켜면 홈·예약 화면이 영업 종료 안내(/off)로 바뀌고 새 예약이 막힙니다. 시설 소개는 그대로 보이고, 예약하기·예약 조회 버튼은 사라집니다.</p>
          </div>
          <Toggle on={s.businessClosed} onChange={toggleClosed} label="영업 종료" />
        </div>
        <div className="mt-4 space-y-3">
          <Field label="안내 제목" hint={`비우면 기본 문구. 미리보기: ${y(s.closedTitle || defaults.title)}`}>
            <input value={s.closedTitle} onChange={(e) => type('closedTitle', e.target.value)} onBlur={commit} placeholder={defaults.title} className={input} />
          </Field>
          <Field label="안내 내용" hint="{year} 는 올해로 바뀝니다. 줄바꿈 그대로 보입니다.">
            <textarea
              value={s.closedMessage}
              onChange={(e) => type('closedMessage', e.target.value)}
              onBlur={commit}
              placeholder={defaults.message}
              rows={3}
              className="w-full rounded-xl border border-ink/[.12] bg-white px-3.5 py-3 text-[16px] outline-none focus:border-ice-600 md:text-[14px]"
            />
          </Field>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">시즌 운영 기간</h2>
        <p className="mt-1 text-[13px] text-ink-2">이 기간 밖 날짜는 손님이 예약할 수 없습니다. 비우면 제한 없음(예약 가능 기간 {BOOKING_WINDOW_KO}만 적용).</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="시작">
            <DatePicker value={s.seasonFrom} onChange={(v) => set('seasonFrom', v)} placeholder="제한 없음" clearable />
          </Field>
          <Field label="끝">
            <DatePicker value={s.seasonTo} min={s.seasonFrom || undefined} onChange={(v) => set('seasonTo', v)} placeholder="제한 없음" clearable />
          </Field>
        </div>
      </section>

      <section className="panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="panel-title">공지</h2>
            <p className="mt-1 text-[13px] text-ink-2">켜면 홈 첫 화면에 제목이 한 줄로 보입니다. 기간을 비우면 계속 보입니다.</p>
          </div>
          <Toggle on={s.notice.enabled} onChange={(v) => setN('enabled', v)} label="공지" />
        </div>
        <div className="mt-4 space-y-3">
          <Field label="제목">
            <input value={s.notice.title} onChange={(e) => setS((p) => ({ ...p, notice: { ...p.notice, title: e.target.value } }))} onBlur={commit} placeholder="예: 12월 24일은 예약이 마감되었습니다" className={input} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="보이기 시작">
              <DatePicker value={s.notice.from} onChange={(v) => setN('from', v)} placeholder="바로" clearable />
            </Field>
            <Field label="보이기 끝">
              <DatePicker value={s.notice.to} min={s.notice.from || undefined} onChange={(v) => setN('to', v)} placeholder="계속" clearable />
            </Field>
          </div>
        </div>
      </section>

      {(msg || pending) && (
        <p
          role={msg?.kind === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2.5 text-[13px] font-medium shadow-lg ${msg?.kind === 'error' ? 'bg-[#b42d18] text-white' : 'bg-glacier text-white'}`}
        >
          {pending ? '저장 중…' : msg?.text}
        </p>
      )}
    </div>
  );
}
