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
import { facilityByType } from '@/lib/content/facilities';
import { formatDateKorean, formatPhone, formatWon } from '@/lib/format';
import { SAME_DAY_CUTOFF_HOUR } from '@/lib/policy/booking-window';
import { parseMobilePhone } from '@/lib/policy/phone';
import {
  ONE_PER_DAY_NOTICE,
  PARKING_NOTICE,
  REFUND_SUMMARY,
  TICKET_NOTICE,
  USAGE_TIME,
} from '@/lib/site-config';

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

const TOTAL_STEPS = 4;
const CUTOFF = `${String(SAME_DAY_CUTOFF_HOUR).padStart(2, '0')}:00`;
const TITLES: Record<number, string> = {
  1: '언제 방문하시나요?',
  2: '어떤 공간으로 할까요?',
  3: '예약하시는 분을 알려주세요',
  4: '결제 정보를 확인해 주세요',
};

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

  const allAgreed = agreeRefund && agreeRules;

  return (
    <PageShell surface>
      {/* 진행 표시 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setPayError('');
            if (step > 1) setStep(step - 1);
            else router.push('/');
          }}
          aria-label="이전"
          className="pressable -ml-2 flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-line-soft"
        >
          <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" aria-hidden>
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={step}>
          <div
            className="h-full origin-left rounded-full bg-accent transition-transform duration-300 ease-[var(--ease-out)]"
            style={{ transform: `scaleX(${step / TOTAL_STEPS})` }}
          />
        </div>
        <span className="tabular w-8 text-right text-[13px] font-medium text-subtle">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      <div key={step} className="enter mt-7">
        <h1 className="text-[26px] font-bold sm:text-[30px]">{TITLES[step]}</h1>

        {/* 지금까지 고른 것 — 눌러서 되돌아가기 */}
        {step >= 2 && date && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip onClick={() => setStep(1)}>{formatDateKorean(date)}</Chip>
            {step >= 3 && selected && <Chip onClick={() => setStep(2)}>{selected.name}</Chip>}
          </div>
        )}

        {loadError && <p className="mt-4 rounded-[14px] bg-danger-soft px-4 py-3 text-[14px] text-danger">{loadError}</p>}

        {/* 1. 날짜 */}
        {step === 1 && (
          <div className="mt-6">
            <p className="mb-4 text-[15px] text-muted">
              당일 이용 {USAGE_TIME} · 오늘부터 1개월 이내 · 당일 예약은 {CUTOFF}까지
            </p>
            {avail ? (
              <Calendar value={date} onSelect={pickDate} days={dayMap} today={avail.today} minDate={avail.minDate} maxDate={avail.maxDate} />
            ) : (
              !loadError && <div className="h-[420px] animate-pulse rounded-[22px] bg-line-soft" />
            )}
          </div>
        )}

        {/* 2. 공간 */}
        {step === 2 && day && (
          <div className="mt-6 space-y-3">
            <p className="text-[15px] text-muted">
              {day.weekendRate ? '주말 요금' : '주중 요금'} 적용일 · 1인 1동 · 자리는 현장에서 배정됩니다
            </p>
            {day.types.map((t) => {
              const soldOut = t.remaining <= 0;
              const cover = facilityByType(t.type)?.cover;
              return (
                <button
                  key={t.type}
                  type="button"
                  disabled={soldOut}
                  onClick={() => pickType(t)}
                  className={`pressable flex w-full items-center gap-4 rounded-[22px] border p-3 text-left ${
                    soldOut
                      ? 'cursor-not-allowed border-line-soft bg-surface/60'
                      : type === t.type
                        ? 'border-accent bg-accent-soft/50'
                        : 'border-line-soft bg-surface hover:border-line'
                  }`}
                >
                  {cover && (
                    <Image
                      src={cover.src}
                      alt=""
                      width={240}
                      height={240}
                      sizes="88px"
                      className={`h-[88px] w-[88px] shrink-0 rounded-[16px] object-cover ${soldOut ? 'opacity-40 grayscale' : ''}`}
                    />
                  )}
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[17px] font-bold ${soldOut ? 'text-subtle' : ''}`}>{t.name}</span>
                      <span className="text-[13px] text-subtle">최대 {t.maxCapacity}인</span>
                    </div>
                    <p className={`tabular mt-1 text-[17px] font-bold ${soldOut ? 'text-subtle' : 'text-ink'}`}>{formatWon(t.price)}</p>
                    <div className="mt-2">
                      {soldOut ? (
                        <Badge tone="danger">마감</Badge>
                      ) : (
                        <Badge tone={t.remaining <= 3 ? 'warning' : 'accent'}>
                          <span className="tabular">{t.remaining}동 남음</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 3. 예약자 정보 + 동의 */}
        {step === 3 && selected && (
          <div className="mt-6 space-y-5">
            <Field label="이름" error={errors.name}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" autoComplete="name" aria-invalid={!!errors.name} />
            </Field>
            <Field label="휴대폰 번호" error={errors.phone} hint={`예약 확인 문자를 보내드려요. ${ONE_PER_DAY_NOTICE}`}>
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
            <Field label="이용 인원" error={errors.count} hint={`영유아 포함 최대 ${selected.maxCapacity}인`}>
              <Select value={count || ''} onChange={(e) => setCount(Number(e.target.value))} aria-invalid={!!errors.count}>
                <option value="" disabled>
                  인원 선택
                </option>
                {Array.from({ length: selected.maxCapacity }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}명
                  </option>
                ))}
              </Select>
            </Field>

            <div className="overflow-hidden rounded-[22px] border border-line-soft bg-surface">
              <CheckRow
                checked={allAgreed}
                onChange={(v) => {
                  setAgreeRefund(v);
                  setAgreeRules(v);
                }}
                strong
              >
                필수 항목 모두 동의
              </CheckRow>
              <div className="border-t border-line-soft">
                <CheckRow checked={agreeRefund} onChange={setAgreeRefund}>
                  <span className="text-subtle">[필수]</span> 취소·환불 규정 동의
                  <span className="mt-0.5 block text-[13px] text-subtle">{REFUND_SUMMARY}</span>
                </CheckRow>
                <CheckRow checked={agreeRules} onChange={setAgreeRules}>
                  <span className="text-subtle">[필수]</span> 이용 수칙 동의
                  <span className="mt-0.5 block text-[13px] text-subtle">
                    이용 시간 {USAGE_TIME}·최대 인원 준수. {TICKET_NOTICE} {PARKING_NOTICE}
                  </span>
                </CheckRow>
              </div>
            </div>
            <BottomBar>
              {Object.keys(errors).length > 0 && (
                <p role="alert" className="enter mb-3 rounded-[14px] bg-danger-soft px-4 py-3 text-[14px] text-danger">
                  {errors.agree && Object.keys(errors).length === 1 ? errors.agree : '입력하지 않았거나 잘못된 항목이 있어요.'}
                </p>
              )}
              <Button size="lg" onClick={() => validateInfo() && setStep(4)}>
                다음
              </Button>
            </BottomBar>
          </div>
        )}

        {/* 4. 결제 */}
        {step === 4 && selected && (
          <div className="mt-6 space-y-4">
            <div className="rounded-[22px] border border-line-soft bg-surface">
              <SummaryRow label="이용일" value={`${formatDateKorean(date)} ${USAGE_TIME}`} />
              <SummaryRow label="공간" value={`${selected.name} 1동 · ${count}명`} />
              <SummaryRow label="예약자" value={`${name.trim()} · ${formatPhone(phone)}`} />
              <SummaryRow label="요금" value={selected.rateKind === 'weekend' ? '주말 요금' : '주중 요금'} />
              <div className="flex items-center justify-between border-t border-line-soft px-5 py-5">
                <span className="text-[15px] font-semibold">결제 금액</span>
                <span className="tabular text-[24px] font-bold">{formatWon(selected.price)}</span>
              </div>
            </div>
            <ul className="space-y-1.5 px-1 text-[13px] leading-relaxed text-muted">
              <li>· 취소·환불: {REFUND_SUMMARY}</li>
              <li>· 결제창에서 10분 안에 결제를 마쳐 주세요. 시간이 지나면 자리가 풀립니다.</li>
              <li>· 결제 금액은 서버에서 한 번 더 확인합니다.</li>
            </ul>

            {PAYMENTS_FAKE && (
              <p className="rounded-[14px] bg-warning-soft px-4 py-3 text-[14px] text-warning">
                개발 모드 — 실제 결제 없이 테스트 결제로 진행됩니다.
              </p>
            )}
            <BottomBar>
              {/* 오류는 고정 버튼 바로 위에 — 스크롤 위치와 무관하게 보이도록 */}
              {payError && (
                <p role="alert" className="enter mb-3 rounded-[14px] bg-danger-soft px-4 py-3 text-[14px] text-danger">
                  {payError}
                </p>
              )}
              <Button size="lg" onClick={pay} disabled={submitting}>
                {submitting ? '결제 준비 중…' : <span className="tabular">{formatWon(selected.price)} 결제하기</span>}
              </Button>
            </BottomBar>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2 ring-1 ring-line-soft hover:ring-line"
    >
      {children}
      <svg viewBox="0 0 16 16" className="h-3 w-3 text-subtle" fill="none" aria-hidden>
        <path d="M5 3.5 9.5 8 5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function CheckRow({
  checked,
  onChange,
  strong,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  strong?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 px-5 ${strong ? 'py-4' : 'py-3.5'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
          checked ? 'bg-accent text-white' : 'bg-line-soft text-subtle'
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={`text-[15px] ${strong ? 'font-bold' : 'text-ink-2'}`}>{children}</span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5 first:pt-5">
      <span className="shrink-0 text-[14px] text-muted">{label}</span>
      <span className="text-right text-[15px] font-medium">{value}</span>
    </div>
  );
}

/** 모바일에서 화면 하단에 붙는 주요 버튼(토스식). 넓은 화면에서는 일반 흐름. */
function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 bg-gradient-to-t from-surface from-70% to-surface/0 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-6 sm:static sm:mx-0 sm:bg-none sm:px-0 sm:pb-0 sm:pt-2">
      {children}
    </div>
  );
}
