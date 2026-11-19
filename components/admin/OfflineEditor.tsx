'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, fieldClass } from '@/components/ui/Field';
import { cancelOfflineAction, updateOfflineAction } from '@/lib/admin/actions';
import { PAY_METHOD_LABEL } from '@/lib/admin/labels';
import { formatPhone, formatWon } from '@/lib/format';

/*
  유선 예약 수정(grill-booking 현장 추가/조정 구조): 최종 금액 = 기본 금액 + 현장 조정 합계(음수 = 할인).
  무상 예약은 취소만. 둘 다 토스와 무관.
*/

type Pay = 'cash' | 'card' | 'transfer';
type Extra = { label: string; amount: string };

export function OfflineEditor({
  bookingId,
  source,
  status,
  baseAmount,
  extras,
  paymentMethod,
  guestName,
  guestPhone,
  guestCount,
  note,
}: {
  bookingId: string;
  source: string;
  status: string;
  baseAmount: number;
  extras: { label: string; amount: number }[];
  paymentMethod: Pay | null;
  guestName: string;
  guestPhone: string | null;
  guestCount: number | null;
  note: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [base, setBase] = useState(String(baseAmount));
  const [rows, setRows] = useState<Extra[]>(extras.map((e) => ({ label: e.label, amount: String(e.amount) })));
  const [pay, setPay] = useState<Pay>(paymentMethod ?? 'cash');
  const [name, setName] = useState(guestName);
  const [phone, setPhone] = useState(guestPhone ? formatPhone(guestPhone) : '');
  const [count, setCount] = useState(guestCount ? String(guestCount) : '');
  const [memo, setMemo] = useState(note ?? '');

  const editable = source === 'offline' && ['confirmed', 'checked_in', 'checked_out'].includes(status);
  const cancellable = ['confirmed', 'checked_in', 'checked_out'].includes(status);
  const toNum = (v: string) => Number(v.replace(/[^\d-]/g, '')) || 0;
  const total = toNum(base) + rows.reduce((s, r) => s + toNum(r.amount), 0);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setError('');
    setNotice('');
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? '처리하지 못했습니다.');
      else setNotice(ok);
      router.refresh();
    });
  }

  const input = fieldClass('light', 'tabular-nums', 'sm');

  return (
    <div className="space-y-4">
      {editable && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                updateOfflineAction(bookingId, {
                  baseAmount: toNum(base),
                  extras: rows.map((r) => ({ label: r.label.trim(), amount: toNum(r.amount) })).filter((r) => r.label || r.amount),
                  paymentMethod: pay,
                  guestName: name,
                  guestPhone: phone,
                  guestCount: Number(count),
                  note: memo,
                }),
              '저장했습니다.',
            );
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="예약자">
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass('light', '', 'sm')} />
            </Field>
            <Field label="인원">
              <input value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" className={input} />
            </Field>
            <Field label="휴대폰">
              <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="numeric" maxLength={13} className={input} />
            </Field>
            <Field label="결제수단">
              <select value={pay} onChange={(e) => setPay(e.target.value as Pay)} className={fieldClass('light', 'appearance-none', 'sm')}>
                {Object.entries(PAY_METHOD_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="기본 금액 (원)">
            <input value={base} onChange={(e) => setBase(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={input} />
          </Field>

          <div>
            <p className="mb-2 text-[14px] font-medium text-ink/70">현장 추가·조정 (할인은 음수)</p>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex gap-2">
                  {/* 폭은 감싸는 칸으로(입력칸 기본 w-full 과 충돌 방지) */}
                  <div className="min-w-0 flex-1">
                    <input
                      value={r.label}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      placeholder="항목"
                      aria-label="항목"
                      className={fieldClass('light', '', 'sm')}
                    />
                  </div>
                  <div className="w-28 flex-none">
                    <input
                      value={r.amount}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/[^\d-]/g, '') } : x)))}
                      placeholder="금액"
                      aria-label="금액"
                      inputMode="numeric"
                      className={fieldClass('light', 'tabular-nums', 'sm')}
                    />
                  </div>
                  <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="삭제" className="w-11 flex-none rounded-xl text-[18px] text-ink/40 hover:bg-ice-50 hover:text-ink">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setRows([...rows, { label: '', amount: '' }])} className="mt-2 text-[13px] font-medium text-glacier">
              + 항목 추가
            </button>
          </div>

          <Field label="메모">
            <input value={memo} onChange={(e) => setMemo(e.target.value)} className={fieldClass('light', '', 'sm')} />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-ice-100 px-4 py-3">
            <span className="text-[13px] text-ink/60">최종 금액</span>
            <span className="text-[18px] font-bold tabular-nums">{formatWon(total)}</span>
          </div>
          <Button type="submit" size="block" disabled={pending}>
            저장
          </Button>
        </form>
      )}

      {cancellable && (
        <Button
          variant="danger"
          size="block"
          disabled={pending}
          onClick={() => confirm(`${source === 'comp' ? '무상' : '유선'} 예약을 취소할까요?\n토스 결제가 없어 환불 처리는 하지 않습니다.`) && run(() => cancelOfflineAction(bookingId), '취소했습니다.')}
        >
          예약 취소
        </Button>
      )}

      {error && <p role="alert" className="rounded-2xl border border-[#d4351c]/20 bg-[#d4351c]/[.05] px-4 py-3 text-[13px] text-[#b42d18]">{error}</p>}
      {notice && <p role="status" className="rounded-2xl bg-ice-100 px-4 py-3 text-[13px] text-ice-700">{notice}</p>}
    </div>
  );
}
