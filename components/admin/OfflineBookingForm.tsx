'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, fieldClass } from '@/components/ui/Field';
import { createOfflineAction, quotePriceAction } from '@/lib/admin/actions';
import { PAY_METHOD_LABEL } from '@/lib/admin/labels';
import { formatPhone, formatWon } from '@/lib/format';

/*
  유선(전화·현장 결제)·무상(지인) 예약 등록.
  - 유선: 금액은 비워 두면 그 날짜 정상가(주중/주말), 결제수단 필수
  - 무상: 0원, 결제수단 없음
  1인 1일 제한·당일 마감·잠금일은 관리자 예약에 적용되지 않음(휴장일·매진은 막힘).
*/

type Product = { type: string; name: string; maxCapacity: number };
type Pay = 'cash' | 'card' | 'transfer';

function Seg<T extends string>({ value, options, onChange, name }: { value: T; options: [T, string][]; onChange: (v: T) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-11 rounded-full px-5 text-[14px] font-medium transition-colors ${value === v ? 'bg-glacier text-white' : 'border border-ice-700/15 bg-white text-ink/70 hover:text-ink'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function OfflineBookingForm({ products, initialDate, initialType, today }: { products: Product[]; initialDate: string; initialType?: string; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState(products.find((p) => p.type === initialType)?.type ?? products[0]?.type ?? '');
  const [date, setDate] = useState(initialDate);
  const [source, setSource] = useState<'offline' | 'comp'>('offline');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [count, setCount] = useState('');
  const [amount, setAmount] = useState('');
  const [pay, setPay] = useState<Pay | ''>('');
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState<{ price: number; rateKind: string } | null>(null);
  const [error, setError] = useState('');

  const product = products.find((p) => p.type === type);

  useEffect(() => {
    if (!type || !date) return;
    let alive = true;
    quotePriceAction(type, date).then((r) => alive && setQuote(r.ok && r.data ? r.data : null));
    return () => {
      alive = false;
    };
  }, [type, date]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const n = Number(count);
    if (!name.trim()) return setError('예약자 이름을 입력해 주세요.');
    if (!Number.isInteger(n) || n < 1 || (product && n > product.maxCapacity)) return setError(`인원은 1~${product?.maxCapacity ?? ''}명입니다.`);
    if (source === 'offline' && !pay) return setError('결제수단을 골라 주세요.');
    const amt = amount.trim() === '' ? null : Number(amount.replace(/\D/g, ''));
    start(async () => {
      const res = await createOfflineAction({
        type,
        date,
        source,
        guestName: name,
        guestPhone: phone,
        guestCount: n,
        amount: amt,
        paymentMethod: source === 'offline' ? (pay as Pay) : null,
        note,
      });
      if (!res.ok) setError(res.error);
      else if (res.data) router.push(`/admin/bookings/${res.data.id}`);
    });
  }

  const finalAmount = source === 'comp' ? 0 : amount.trim() === '' ? (quote?.price ?? null) : Number(amount.replace(/\D/g, ''));

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="space-y-5 rounded-3xl bg-white p-5 md:p-7">
        <Field label="경로">
          <Seg name="경로" value={source} onChange={setSource} options={[['offline', '유선(현장·전화 결제)'], ['comp', '무상']]} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="상품">
            <select value={type} onChange={(e) => setType(e.target.value)} className={fieldClass('light', 'appearance-none', 'sm')}>
              {products.map((p) => (
                <option key={p.type} value={p.type}>
                  {p.name} (최대 {p.maxCapacity}인)
                </option>
              ))}
            </select>
          </Field>
          <Field label="이용일">
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass('light', 'tabular-nums', 'sm')} />
          </Field>
          <Field label="예약자 이름">
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass('light', '', 'sm')} />
          </Field>
          <Field label="휴대폰 (선택)">
            <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="numeric" maxLength={13} placeholder="010-0000-0000" className={fieldClass('light', 'tabular-nums', 'sm')} />
          </Field>
          <Field label="인원" hint={product ? `최대 ${product.maxCapacity}인(영유아 포함)` : undefined}>
            <input value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" className={fieldClass('light', 'tabular-nums', 'sm')} />
          </Field>
          {source === 'offline' && (
            <Field label="금액 (원)" hint={quote ? `비워 두면 정상가 ${formatWon(quote.price)} (${quote.rateKind === 'weekend' ? '주말' : '주중'})` : '비워 두면 정상가'}>
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={quote ? String(quote.price) : ''} className={fieldClass('light', 'tabular-nums', 'sm')} />
            </Field>
          )}
        </div>
        {source === 'offline' && (
          <Field label="결제수단">
            <Seg name="결제수단" value={pay as Pay} onChange={setPay} options={(Object.entries(PAY_METHOD_LABEL) as [Pay, string][])} />
          </Field>
        )}
        <Field label="메모 (선택)">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="단체명·요청 사항 등" className={fieldClass('light', '', 'sm')} />
        </Field>
      </div>

      <div className="space-y-3 rounded-3xl bg-white p-5 md:p-7 lg:sticky lg:top-8">
        <p className="text-[13px] font-medium text-ice-600">등록 내용</p>
        <p className="text-[17px] font-bold">
          {product?.name} · {date}
        </p>
        <p className="font-display text-[30px] font-bold tabular-nums tracking-[-0.02em]">{finalAmount === null ? '—' : formatWon(finalAmount)}</p>
        <p className="text-[13px] text-ink/55">{source === 'comp' ? '무상 예약(0원)' : pay ? `${PAY_METHOD_LABEL[pay]} 결제` : '결제수단을 골라 주세요'}</p>
        <Button type="submit" size="block" disabled={pending}>
          {pending ? '등록 중…' : '예약 등록'}
        </Button>
        {error && <p role="alert" className="rounded-2xl border border-[#d4351c]/20 bg-[#d4351c]/[.05] px-4 py-3 text-[13px] text-[#b42d18]">{error}</p>}
      </div>
    </form>
  );
}
