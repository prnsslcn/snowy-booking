'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, fieldClass } from '@/components/ui/Field';
import { saveSettingsAction, type SettingsInput } from '@/lib/admin/config-actions';

/*
  운영 설정(grill-booking 일반설정 이식).
  - 영업 종료: 켜면 홈·예약 화면 → /off, 새 예약 API 차단. 문구의 {year} 는 올해로 바뀐다.
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
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function SettingsForm({ initial, year, defaults }: { initial: SettingsInput; year: string; defaults: { title: string; message: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => setS((p) => ({ ...p, [k]: v }));
  const setN = <K extends keyof SettingsInput['notice']>(k: K, v: SettingsInput['notice'][K]) => setS((p) => ({ ...p, notice: { ...p.notice, [k]: v } }));
  const y = (t: string) => t.replaceAll('{year}', year);
  const input = fieldClass('light', '', 'cs');

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (s.businessClosed !== initial.businessClosed && !confirm(s.businessClosed ? '영업 종료를 켤까요?\n홈·예약 화면이 영업 종료 안내로 바뀌고 새 예약이 막힙니다.' : '영업 종료를 끄고 다시 예약을 받을까요?')) return;
        setMsg(null);
        start(async () => {
          const r = await saveSettingsAction(s);
          setMsg(r.ok ? { kind: 'ok', text: '저장했습니다.' } : { kind: 'error', text: r.error });
          router.refresh();
        });
      }}
    >
      <section className={`rounded-xl border p-5 md:p-6 ${s.businessClosed ? 'border-[#d4351c]/25 bg-[#d4351c]/[.04]' : 'border-line bg-white'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="panel-title">영업 종료</h2>
            <p className="mt-1 text-[13px] text-ink-2">켜면 홈·예약 화면이 영업 종료 안내(/off)로 바뀌고 새 예약이 막힙니다. 예약 조회·취소는 그대로 됩니다.</p>
          </div>
          <Toggle on={s.businessClosed} onChange={(v) => set('businessClosed', v)} label="영업 종료" />
        </div>
        <div className="mt-4 space-y-3">
          <Field label="안내 제목" hint={`비우면 기본 문구. 미리보기: ${y(s.closedTitle || defaults.title)}`}>
            <input value={s.closedTitle} onChange={(e) => set('closedTitle', e.target.value)} placeholder={defaults.title} className={input} />
          </Field>
          <Field label="안내 내용" hint="{year} 는 올해로 바뀝니다. 줄바꿈 그대로 보입니다.">
            <textarea
              value={s.closedMessage}
              onChange={(e) => set('closedMessage', e.target.value)}
              placeholder={defaults.message}
              rows={3}
              className="w-full rounded-xl border border-ink/[.12] bg-white px-3.5 py-3 text-[16px] outline-none focus:border-ice-600 md:text-[14px]"
            />
          </Field>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">시즌 운영 기간</h2>
        <p className="mt-1 text-[13px] text-ink-2">이 기간 밖 날짜는 손님이 예약할 수 없습니다. 비우면 제한 없음(예약 가능 기간 1개월만 적용).</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="시작">
            <input type="date" value={s.seasonFrom} onChange={(e) => set('seasonFrom', e.target.value)} className={fieldClass('light', 'tabular-nums', 'cs')} />
          </Field>
          <Field label="끝">
            <input type="date" value={s.seasonTo} min={s.seasonFrom} onChange={(e) => set('seasonTo', e.target.value)} className={fieldClass('light', 'tabular-nums', 'cs')} />
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
            <input value={s.notice.title} onChange={(e) => setN('title', e.target.value)} placeholder="예: 12월 24일은 예약이 마감되었습니다" className={input} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="보이기 시작">
              <input type="date" value={s.notice.from} onChange={(e) => setN('from', e.target.value)} className={fieldClass('light', 'tabular-nums', 'cs')} />
            </Field>
            <Field label="보이기 끝">
              <input type="date" value={s.notice.to} min={s.notice.from} onChange={(e) => setN('to', e.target.value)} className={fieldClass('light', 'tabular-nums', 'cs')} />
            </Field>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:flex md:flex-col md:items-end md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button type="submit" size="cs" className="w-full md:w-auto md:min-w-40" disabled={pending}>
          {pending ? '저장 중…' : '설정 저장'}
        </Button>
        {msg && (
          <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-lg px-4 py-3 text-[13px] ${msg.kind === 'error' ? 'border border-[#d4351c]/20 bg-[#d4351c]/[.05] text-[#b42d18]' : 'bg-ice-100 text-ice-700'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
