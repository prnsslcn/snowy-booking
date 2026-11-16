'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { Calendar, type CalendarDay } from '@/components/booking/Calendar';
import { PageShell } from '@/components/site/PageShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { errorMessage } from '@/lib/booking/error-messages';
import { PAYMENTS_FAKE, PayError, payAndConfirmFake, reserveClient } from '@/lib/client/pay';
import { requestTossPayment } from '@/lib/client/toss-payment';
import { thumbOf } from '@/lib/content/facilities';
import { formatDateKorean, formatPhone, formatWon } from '@/lib/format';
import { SAME_DAY_CUTOFF_HOUR } from '@/lib/policy/booking-window';
import { parseMobilePhone } from '@/lib/policy/phone';
import { ONE_PER_DAY_NOTICE, PARKING_NOTICE, REFUND_SUMMARY, TICKET_NOTICE, USAGE_TIME } from '@/lib/site-config';

interface TypeAvail {
  type: string;
  name: string;
  slug: string;
  maxCapacity: number;
  remaining: number;
  price: number;
  rateKind: 'weekday' | 'weekend';
}
interface DayAvail {
  date: string;
  status: CalendarDay['status'];
  weekendRate: boolean;
  types: TypeAvail[];
}
interface AvailResponse {
  today: string;
  minDate: string;
  maxDate: string;
  days: DayAvail[];
}

const STEPS = ['날짜', '공간', '예약자 정보', '결제'];
const TITLES = ['날짜 선택', '공간 선택', '예약자 정보', '결제'];
const CUTOFF = `${String(SAME_DAY_CUTOFF_HOUR).padStart(2, '0')}:00`;

export default function BookingPageClient({ preferredType }: { preferredType: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [avail, setAvail] = useState<AvailResponse | null>(null);
  const [loadError, setLoadError] = useState('');

  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [count, setCount] = useState(0);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [agreeRules, setAgreeRules] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  const load = useCallback(
    () =>
      fetch('/api/availability', { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) throw new Error();
          setAvail((await res.json()) as AvailResponse);
          setLoadError('');
        })
        .catch(() => setLoadError('예약 현황을 불러오지 못했습니다. 새로고침해 주세요.')),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const dayMap = useMemo(() => {
    const m: Record<string, CalendarDay> = {};
    for (const d of avail?.days ?? []) m[d.date] = { status: d.status, weekendRate: d.weekendRate };
    return m;
  }, [avail]);

  const day = avail?.days.find((d) => d.date === date) ?? null;
  const selected = day?.types.find((t) => t.type === type) ?? null;

  function pickDate(iso: string) {
    setDate(iso);
    const d = avail?.days.find((x) => x.date === iso);
    const pre = preferredType ? d?.types.find((t) => t.slug === preferredType || t.type === preferredType) : null;
    setType(pre && pre.remaining > 0 ? pre.type : '');
    setStep(2);
  }

  function pickType(t: TypeAvail) {
    setType(t.type);
    setCount((c) => (c >= 1 && c <= t.maxCapacity ? c : 0));
    setStep(3);
  }

  function validateInfo(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = '이름을 입력해 주세요.';
    if (!parseMobilePhone(phone)) e.phone = '휴대폰 번호를 정확히 입력해 주세요.';
    if (!selected || count < 1 || count > selected.maxCapacity) e.count = '이용 인원을 선택해 주세요.';
    if (!agreeRefund || !agreeRules) e.agree = '필수 항목에 모두 동의해 주세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function pay() {
    if (!selected) return;
    setSubmitting(true);
    setPayError('');
    const req = {
      type: selected.type,
      date,
      guestName: name.trim(),
      guestPhone: phone,
      guestCount: count,
      agreed: agreeRefund && agreeRules,
    };
    try {
      if (PAYMENTS_FAKE) {
        const { orderId } = await payAndConfirmFake(req);
        router.push(`/booking/complete?o=${encodeURIComponent(orderId)}`);
        return;
      }
      const r = await reserveClient(req);
      await requestTossPayment({
        amount: r.amount,
        orderId: r.orderId,
        orderName: r.orderName,
        customerName: name.trim(),
        customerMobilePhone: parseMobilePhone(phone) ?? undefined,
      });
    } catch (err) {
      if (err instanceof PayError) {
        setPayError(errorMessage(err.code));
        if (['SOLD_OUT', 'DATE_LOCKED', 'DATE_CLOSED', 'OUT_OF_WINDOW'].includes(err.code)) await load();
      } else {
        const code = (err as { code?: string }).code;
        if (code !== 'USER_CANCEL') setPayError('결제가 취소되었거나 실패했습니다. 다시 시도해 주세요.');
      }
      setSubmitting(false);
    }
  }

  function goStep(n: number) {
    if (n >= step) return;
    setPayError('');
    setStep(n);
  }

  return (
    <PageShell>
      {/* 단계 탭(category-tab): 지난 단계만 눌러서 되돌아감 */}
      <ol className="grid grid-cols-4 border-b border-hairline">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => goStep(n)}
                disabled={!done}
                aria-current={active ? 'step' : undefined}
                className={`-mb-px w-full border-b-2 py-3 text-left text-[13px] font-bold tracking-[1.5px] ${
                  active ? 'border-ink text-ink' : done ? 'border-transparent text-muted hover:text-ink' : 'border-transparent text-muted-soft'
                }`}
              >
                <span className="tabular mr-1.5">{String(n).padStart(2, '0')}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div key={step} className="enter mt-8">
        <h1 className="text-[32px] leading-[1.15]">{TITLES[step - 1]}</h1>

        {step >= 2 && date && (
          <p className="mt-3 text-[16px] text-body">
            {formatDateKorean(date)} {USAGE_TIME}
            {step >= 3 && selected && <> · {selected.name}</>}
          </p>
        )}

        {loadError && <p className="mt-4 border border-error px-4 py-3 text-[14px] text-error">{loadError}</p>}

        {/* 1. 날짜 */}
        {step === 1 && (
          <div className="mt-6">
            <p className="mb-4 text-[16px] text-body">오늘부터 1개월 이내 · 당일 예약 {CUTOFF}까지</p>
            {avail ? (
              <Calendar value={date} onSelect={pickDate} days={dayMap} today={avail.today} minDate={avail.minDate} maxDate={avail.maxDate} />
            ) : (
              !loadError && <div className="h-[440px] animate-pulse bg-surface-soft" />
            )}
          </div>
        )}

        {/* 2. 공간 — configurator option tile */}
        {step === 2 && day && (
          <div className="mt-6 space-y-3">
            <p className="text-[16px] text-body">
              {day.weekendRate ? '주말 요금' : '주중 요금'} · 1인 1동 · 자리는 현장 배정
            </p>
            {day.types.map((t) => {
              const soldOut = t.remaining <= 0;
              const thumb = thumbOf(t.type);
              const isSel = type === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  disabled={soldOut}
                  onClick={() => pickType(t)}
                  className={`pressable flex w-full items-center gap-4 bg-canvas p-3 text-left ${
                    soldOut ? 'cursor-not-allowed border border-hairline' : isSel ? 'border-2 border-primary p-[11px]' : 'border border-hairline hover:border-ink'
                  }`}
                >
                  {thumb && (
                    <Image
                      src={thumb.src}
                      alt=""
                      width={240}
                      height={240}
                      sizes="88px"
                      className={`h-[88px] w-[88px] shrink-0 object-cover ${soldOut ? 'opacity-40 grayscale' : ''}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[18px] font-bold ${soldOut ? 'text-muted-soft' : 'text-ink'}`}>{t.name}</span>
                      <span className="text-[14px] text-muted">최대 {t.maxCapacity}인</span>
                    </div>
                    <p className={`tabular mt-1 text-[18px] font-bold ${soldOut ? 'text-muted-soft' : 'text-ink'}`}>{formatWon(t.price)}</p>
                    <div className="mt-2">
                      {soldOut ? <Badge tone="error">마감</Badge> : <Badge tone={t.remaining <= 3 ? 'warning' : 'neutral'}>
                        <span className="tabular">{t.remaining}동 남음</span>
                      </Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 3. 예약자 정보 + 동의 */}
        {step === 3 && selected && (
          <div className="mt-8 space-y-6">
            <Field label="이름" error={errors.name}>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
            </Field>
            <Field label="휴대폰 번호" error={errors.phone} hint={ONE_PER_DAY_NOTICE}>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={13}
                aria-invalid={!!errors.phone}
              />
            </Field>
            <Field label="이용 인원" error={errors.count} hint={`최대 ${selected.maxCapacity}인(영유아 포함)`}>
              <Select value={count || ''} onChange={(e) => setCount(Number(e.target.value))} aria-invalid={!!errors.count}>
                <option value="" disabled>
                  선택
                </option>
                {Array.from({ length: selected.maxCapacity }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}명
                  </option>
                ))}
              </Select>
            </Field>

            <fieldset className="border border-hairline">
              <legend className="sr-only">동의</legend>
              <CheckRow
                checked={agreeRefund && agreeRules}
                onChange={(v) => {
                  setAgreeRefund(v);
                  setAgreeRules(v);
                }}
                strong
              >
                필수 항목 모두 동의
              </CheckRow>
              <div className="border-t border-hairline">
                <CheckRow checked={agreeRefund} onChange={setAgreeRefund}>
                  [필수] 취소·환불 규정
                  <span className="mt-0.5 block text-[14px] text-muted">{REFUND_SUMMARY}</span>
                </CheckRow>
                <CheckRow checked={agreeRules} onChange={setAgreeRules}>
                  [필수] 이용 수칙
                  <span className="mt-0.5 block text-[14px] text-muted">
                    이용 시간 {USAGE_TIME}, 최대 인원 준수. {TICKET_NOTICE} {PARKING_NOTICE}
                  </span>
                </CheckRow>
              </div>
            </fieldset>

            <BottomBar error={Object.keys(errors).length > 0 ? (errors.agree && Object.keys(errors).length === 1 ? errors.agree : '입력하지 않았거나 잘못된 항목이 있습니다.') : ''}>
              <Button size="block" onClick={() => validateInfo() && setStep(4)}>
                다음
              </Button>
            </BottomBar>
          </div>
        )}

        {/* 4. 결제 */}
        {step === 4 && selected && (
          <div className="mt-8 space-y-6">
            <dl>
              <SummaryRow label="이용일" value={`${formatDateKorean(date)} ${USAGE_TIME}`} />
              <SummaryRow label="공간" value={`${selected.name} 1동 · ${count}명`} />
              <SummaryRow label="예약자" value={`${name.trim()} · ${formatPhone(phone)}`} />
              <SummaryRow label="요금" value={selected.rateKind === 'weekend' ? '주말 요금' : '주중 요금'} />
              <div className="flex items-baseline justify-between border-y-2 border-ink py-5">
                <dt className="text-[16px] font-bold text-ink">결제 금액</dt>
                <dd className="tabular text-[32px] font-bold text-ink">{formatWon(selected.price)}</dd>
              </div>
            </dl>
            <ul className="space-y-1 text-[14px] text-muted">
              <li>취소·환불: {REFUND_SUMMARY}</li>
              <li>결제창에서 10분 안에 결제를 마쳐 주세요. 시간이 지나면 선점한 자리가 풀립니다.</li>
            </ul>

            {PAYMENTS_FAKE && <p className="border border-warning px-4 py-3 text-[14px] text-warning">개발 모드 — 테스트 결제로 진행됩니다.</p>}

            <BottomBar error={payError}>
              <Button size="block" onClick={pay} disabled={submitting}>
                {submitting ? '결제 준비 중…' : <span className="tabular">{formatWon(selected.price)} 결제하기</span>}
              </Button>
            </BottomBar>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function CheckRow({ checked, onChange, strong, children }: { checked: boolean; onChange: (v: boolean) => void; strong?: boolean; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 px-4 py-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${
          checked ? 'border-primary bg-primary text-white' : 'border-hairline-strong bg-canvas text-transparent'
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      <span className={`text-[16px] ${strong ? 'font-bold text-ink' : 'text-body'}`}>{children}</span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-hairline py-4">
      <dt className="shrink-0 text-[16px] text-muted">{label}</dt>
      <dd className="text-right text-[16px] text-ink">{value}</dd>
    </div>
  );
}

/** 모바일 하단 고정 주요 버튼. 오류는 버튼 바로 위(가려지지 않게). */
function BottomBar({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-5 border-t border-hairline bg-canvas px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 md:static md:mx-0 md:border-0 md:px-0 md:pb-0 md:pt-2">
      {error && (
        <p role="alert" className="enter mb-3 border border-error px-4 py-3 text-[14px] text-error">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
