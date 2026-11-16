'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Calendar, type CalendarDay } from '@/components/booking/Calendar';
import { PageShell } from '@/components/site/PageShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Stepper } from '@/components/ui/Stepper';
import { errorMessage } from '@/lib/booking/error-messages';
import { PAYMENTS_FAKE, PayError, payAndConfirmFake, reserveClient } from '@/lib/client/pay';
import { requestTossPayment } from '@/lib/client/toss-payment';
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

const STEPS = ['날짜', '상품', '예약자 정보', '결제'];
const CUTOFF = `${String(SAME_DAY_CUTOFF_HOUR).padStart(2, '0')}:00`;

export default function BookingPageClient({ preferredType }: { preferredType: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [avail, setAvail] = useState<AvailResponse | null>(null);
  const [loadError, setLoadError] = useState('');

  const [date, setDate] = useState('');
  const [type, setType] = useState<string>('');
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
    // 시설 상세에서 넘어온 경우 해당 상품 자동 선택(잔여 있을 때만)
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
    if (!parseMobilePhone(phone)) e.phone = '휴대폰 번호 형식이 올바르지 않습니다.';
    if (!selected || count < 1 || count > selected.maxCapacity) e.count = '인원을 선택해 주세요.';
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
        if (['SOLD_OUT', 'DATE_LOCKED', 'DATE_CLOSED', 'OUT_OF_WINDOW'].includes(err.code)) {
          await load();
        }
      } else {
        const code = (err as { code?: string }).code;
        if (code !== 'USER_CANCEL') setPayError('결제가 취소되었거나 실패했습니다. 다시 시도해 주세요.');
      }
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <div className="mb-8">
        <Stepper current={step} labels={STEPS} />
      </div>

      {loadError && <p className="mb-4 text-sm text-danger">{loadError}</p>}

      {/* 1. 날짜 */}
      {step === 1 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">날짜 선택</h2>
          <p className="text-sm text-muted">
            당일 이용 {USAGE_TIME}. 오늘부터 1개월 이내({avail?.maxDate ?? '…'}까지) 예약할 수 있으며,
            당일 예약은 {CUTOFF}까지입니다.
          </p>
          {avail ? (
            <Calendar value={date} onSelect={pickDate} days={dayMap} minDate={avail.minDate} maxDate={avail.maxDate} />
          ) : (
            !loadError && <p className="text-sm text-subtle">불러오는 중…</p>
          )}
        </section>
      )}

      {/* 2. 상품 */}
      {step === 2 && day && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">상품 선택</h2>
          <p className="text-sm text-muted">
            {formatDateKorean(date)} · {day.weekendRate ? '주말 요금' : '주중 요금'} 적용일
          </p>
          <p className="text-xs text-subtle">1인 1동 · 자리(호수)는 이용 당일 현장에서 배정됩니다.</p>
          <div className="space-y-3">
            {day.types.map((t) => {
              const soldOut = t.remaining <= 0;
              return (
                <button
                  key={t.type}
                  type="button"
                  disabled={soldOut}
                  onClick={() => pickType(t)}
                  className={`w-full rounded-2xl border p-5 text-left transition-colors ${
                    soldOut
                      ? 'cursor-not-allowed border-line-soft bg-line-soft'
                      : type === t.type
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-surface hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${soldOut ? 'text-subtle' : 'text-ink'}`}>
                      {t.name} <span className="text-sm font-normal text-subtle">· 최대 {t.maxCapacity}인</span>
                    </span>
                    <span className={`text-base font-extrabold ${soldOut ? 'text-subtle' : 'text-ink'}`}>
                      {formatWon(t.price)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {soldOut ? (
                      <Badge tone="danger">예약마감</Badge>
                    ) : (
                      <Badge tone={t.remaining <= 3 ? 'warning' : 'accent'}>{t.remaining}동 남음</Badge>
                    )}
                    <span className="text-xs text-subtle">{t.rateKind === 'weekend' ? '주말 요금' : '주중 요금'}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <Button variant="ghost" onClick={() => setStep(1)} className="w-full">
            날짜 다시 선택
          </Button>
        </section>
      )}

      {/* 3. 예약자 정보 + 동의 */}
      {step === 3 && selected && (
        <section className="space-y-5">
          <h2 className="text-lg font-bold text-ink">예약자 정보</h2>
          <Card className="bg-line-soft/60 p-4 text-sm text-muted">
            {formatDateKorean(date)} · {selected.name} · {formatWon(selected.price)}
          </Card>

          <Field label="이름" error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" autoComplete="name" />
          </Field>
          <Field label="휴대폰 번호" error={errors.phone} hint={`예약 조회·안내 문자에 사용됩니다. ${ONE_PER_DAY_NOTICE}`}>
            <Input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-1234-5678"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
            />
          </Field>
          <Field label="이용 인원" error={errors.count} hint={`영유아 포함 최대 ${selected.maxCapacity}인`}>
            <select
              value={count || ''}
              onChange={(e) => setCount(Number(e.target.value))}
              className="h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none focus:border-accent"
            >
              <option value="" disabled>
                인원 선택
              </option>
              {Array.from({ length: selected.maxCapacity }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}명
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-2 rounded-xl bg-line-soft p-4">
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={agreeRefund} onChange={(e) => setAgreeRefund(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
              <span className="text-sm text-muted">
                <b className="text-ink">[필수]</b> 취소·환불 규정({REFUND_SUMMARY})을 확인했으며 동의합니다.
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={agreeRules} onChange={(e) => setAgreeRules(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
              <span className="text-sm text-muted">
                <b className="text-ink">[필수]</b> 이용 수칙(이용 시간 {USAGE_TIME}, 최대 인원 준수)을 확인했으며 동의합니다.
                {` ${TICKET_NOTICE} ${PARKING_NOTICE}`}
              </span>
            </label>
          </div>
          {errors.agree && <p className="-mt-3 text-sm text-danger">{errors.agree}</p>}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">
              이전
            </Button>
            <Button className="flex-1" onClick={() => validateInfo() && setStep(4)}>
              다음
            </Button>
          </div>
        </section>
      )}

      {/* 4. 결제 */}
      {step === 4 && selected && (
        <section className="space-y-5">
          <h2 className="text-lg font-bold text-ink">결제</h2>
          <Card className="divide-y divide-line">
            <Row label="이용일" value={`${formatDateKorean(date)} ${USAGE_TIME}`} />
            <Row label="상품" value={`${selected.name} 1동 · ${count}명`} />
            <Row label="요금" value={selected.rateKind === 'weekend' ? '주말 요금' : '주중 요금'} />
            <Row label="예약자" value={`${name.trim()} · ${formatPhone(phone)}`} />
            <div className="flex items-center justify-between p-5">
              <span className="font-semibold text-ink">결제 금액</span>
              <span className="text-xl font-extrabold text-ink">{formatWon(selected.price)}</span>
            </div>
          </Card>
          <p className="text-xs text-subtle">결제 금액은 서버에서 다시 확인됩니다. 결제창에서 10분 안에 결제를 완료해 주세요.</p>

          {PAYMENTS_FAKE && (
            <div className="rounded-xl bg-[#fff5e5] px-4 py-3 text-sm text-[#c2780f]">
              <Badge tone="warning">개발 모드</Badge> 실제 결제 대신 테스트 결제로 진행됩니다.
            </div>
          )}
          {payError && <p className="text-sm text-danger">{payError}</p>}

          <Button size="lg" onClick={pay} disabled={submitting}>
            {submitting ? '처리 중…' : `${formatWon(selected.price)} 결제하기`}
          </Button>
          <Button variant="ghost" onClick={() => { setPayError(''); setStep(3); }} className="w-full" disabled={submitting}>
            이전
          </Button>
        </section>
      )}
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
