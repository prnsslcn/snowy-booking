'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { Calendar, type CalendarDay } from '@/components/booking/Calendar';
import { blockIn, WILL } from '@/components/site/motion';
import { PageTitle } from '@/components/site/PageTitle';
import { usePageTransition } from '@/components/site/PageTransition';
import { SiteFooter } from '@/components/site/SiteFooter';
import { useLenis } from '@/components/site/SmoothScroll';
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

/*
  예약하기 — 홈과 같은 톤(밝은 바탕, Outfit 헤드라인, 알약 버튼, 둥근 카드).
  단계: 날짜 → 공간 → 예약자 정보 → 결제. 단계가 바뀔 때마다 진행 막대가 차오르고(되돌아가면 줄어듦)
  단계 내용은 진행 방향으로 blur 해제 + 밀려 들어온다. 지난 단계는 눌러서 되돌아갈 수 있다.
*/

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
const TITLES = ['이용할 날짜를 골라 주세요', '공간을 골라 주세요', '예약자 정보를 입력해 주세요', '결제 내용을 확인해 주세요'];
const CUTOFF = `${String(SAME_DAY_CUTOFF_HOUR).padStart(2, '0')}:00`;
const EASE = [0.22, 1, 0.36, 1] as const;
const BAR_EASE = [0.65, 0, 0.35, 1] as const;

export default function BookingPageClient({ preferredType }: { preferredType: string | null }) {
  const router = useRouter();
  const lenis = useLenis();
  const { ready } = usePageTransition();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1); // 1 = 앞으로, -1 = 되돌아감
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

  function moveTo(n: number) {
    setDir(n > step ? 1 : -1);
    setStep(n);
    lenis?.scrollTo(0, { duration: 0.8 });
  }

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
    moveTo(2);
  }

  function pickType(t: TypeAvail) {
    setType(t.type);
    setCount((c) => (c >= 1 && c <= t.maxCapacity ? c : 0));
    moveTo(3);
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
    moveTo(n);
  }

  const infoError =
    Object.keys(errors).length > 0
      ? errors.agree && Object.keys(errors).length === 1
        ? errors.agree
        : '입력하지 않았거나 잘못된 항목이 있습니다.'
      : '';

  return (
    <main data-nav-theme="light" className="flex min-h-[100dvh] flex-col bg-[#fafaf8] text-[#0a0a0a]">
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-28 md:px-8 md:pt-32">
        <PageTitle
          display="Booking"
          sub="예약하기"
          aside={
            <span className="mb-1 flex-none overflow-hidden font-mono text-xs tracking-[.22em] text-[#0a0a0a]/50" aria-hidden>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={step}
                  className="inline-block"
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '-100%', opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  0{step}
                </motion.span>
              </AnimatePresence>{' '}
              / 04
            </span>
          }
        />

        {/* 진행 막대 — 단계마다 차오름. 지난 단계 이름은 눌러서 되돌아감 */}
        <motion.nav aria-label="예약 단계" style={WILL} {...blockIn(8, '14%', 0.78, 0.28, ready)}>
          <div className="relative h-[3px] overflow-hidden rounded-full bg-black/[.08]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-[#0a0a0a]"
              initial={{ width: '0%' }}
              animate={{ width: ready ? `${(step / STEPS.length) * 100}%` : '0%' }}
              transition={{ duration: 0.9, ease: BAR_EASE }}
            />
          </div>
          <ol className="mt-3 grid grid-cols-4">
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
                    className={`flex items-center gap-1.5 text-left text-[13px] transition-colors duration-500 ${
                      active ? 'font-semibold text-[#0a0a0a]' : done ? 'font-medium text-[#0a0a0a]/60 hover:text-[#0a0a0a]' : 'text-[#0a0a0a]/30'
                    }`}
                  >
                    <span className="font-mono text-[11px] tabular-nums">0{n}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </motion.nav>

        {loadError && <p className="mt-8 rounded-2xl border border-[#d4351c]/25 bg-[#d4351c]/[.05] px-5 py-4 text-[14px] text-[#b02a15]">{loadError}</p>}

        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 32, filter: 'blur(8px)' }),
              center: { opacity: 1, x: 0, filter: 'blur(0px)' },
              exit: (d: number) => ({ opacity: 0, x: d * -24, filter: 'blur(6px)' }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: EASE }}
            className="mt-10 md:mt-12"
            style={WILL}
          >
            <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[28px]">{TITLES[step - 1]}</h2>

            {step >= 2 && date && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip>
                  {formatDateKorean(date)} · {USAGE_TIME}
                </Chip>
                {step >= 3 && selected && <Chip>{selected.name}</Chip>}
                {step >= 4 && count > 0 && <Chip>{count}명</Chip>}
              </div>
            )}

            {/* 1. 날짜 */}
            {step === 1 && (
              <div className="mt-6">
                <p className="mb-5 text-[15px] text-[#0a0a0a]/60">오늘부터 1개월 이내 · 당일 예약 {CUTOFF}까지</p>
                {avail ? (
                  <Calendar value={date} onSelect={pickDate} days={dayMap} today={avail.today} minDate={avail.minDate} maxDate={avail.maxDate} />
                ) : (
                  !loadError && <div className="h-[460px] animate-pulse rounded-3xl bg-black/[.04]" />
                )}
              </div>
            )}

            {/* 2. 공간 */}
            {step === 2 && day && (
              <div className="mt-6 space-y-3">
                <p className="text-[15px] text-[#0a0a0a]/60">
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
                      className={`group flex w-full items-center gap-4 rounded-3xl border bg-white p-3 text-left transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:gap-5 md:p-4 ${
                        soldOut
                          ? 'cursor-not-allowed border-black/[.06]'
                          : isSel
                            ? 'border-[#0a0a0a] ring-1 ring-[#0a0a0a]'
                            : 'border-black/[.08] hover:border-black/30 active:scale-[0.985]'
                      }`}
                    >
                      {thumb && (
                        <Image
                          src={thumb.src}
                          alt=""
                          width={240}
                          height={240}
                          sizes="96px"
                          className={`h-20 w-20 flex-none rounded-2xl object-cover md:h-24 md:w-24 ${soldOut ? 'opacity-40 grayscale' : ''}`}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className={`text-[18px] font-bold ${soldOut ? 'text-[#0a0a0a]/35' : ''}`}>{t.name}</span>
                          <span className="text-[13px] text-[#0a0a0a]/50">최대 {t.maxCapacity}인</span>
                        </div>
                        <p className={`mt-1 font-display text-[22px] font-extrabold tracking-[-0.02em] tabular-nums ${soldOut ? 'text-[#0a0a0a]/35' : ''}`}>
                          {formatWon(t.price)}
                        </p>
                        <div className="mt-2">
                          {soldOut ? (
                            <Badge tone="error">마감</Badge>
                          ) : (
                            <Badge tone={t.remaining <= 3 ? 'warning' : 'neutral'}>
                              <span className="tabular-nums">
                                {t.remaining}
                                {t.type === 'cabana' ? '동' : '대'} 남음
                              </span>
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!soldOut && (
                        <svg
                          aria-hidden
                          viewBox="0 0 16 16"
                          className="mr-1 h-5 w-5 flex-none text-[#0a0a0a]/35 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:text-[#0a0a0a]"
                          fill="none"
                        >
                          <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
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

                <fieldset className="overflow-hidden rounded-3xl border border-black/[.08] bg-white">
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
                  <div className="border-t border-black/[.06]">
                    <CheckRow checked={agreeRefund} onChange={setAgreeRefund}>
                      [필수] 취소·환불 규정
                      <span className="mt-0.5 block text-[13px] text-[#0a0a0a]/50">{REFUND_SUMMARY}</span>
                    </CheckRow>
                    <CheckRow checked={agreeRules} onChange={setAgreeRules}>
                      [필수] 이용 수칙
                      <span className="mt-0.5 block text-[13px] text-[#0a0a0a]/50">
                        이용 시간 {USAGE_TIME}, 최대 인원 준수. {TICKET_NOTICE} {PARKING_NOTICE}
                      </span>
                    </CheckRow>
                  </div>
                </fieldset>

                <BottomBar error={infoError}>
                  <Button size="block" onClick={() => validateInfo() && moveTo(4)}>
                    다음
                  </Button>
                </BottomBar>
              </div>
            )}

            {/* 4. 결제 */}
            {step === 4 && selected && (
              <div className="mt-8 space-y-6">
                <div className="rounded-3xl border border-black/[.08] bg-white px-5 md:px-6">
                  <dl className="divide-y divide-black/[.06]">
                    <SummaryRow label="이용일" value={`${formatDateKorean(date)} ${USAGE_TIME}`} />
                    <SummaryRow label="공간" value={`${selected.name} 1${selected.type === 'cabana' ? '동' : '대'} · ${count}명`} />
                    <SummaryRow label="예약자" value={`${name.trim()} · ${formatPhone(phone)}`} />
                    <SummaryRow label="요금" value={selected.rateKind === 'weekend' ? '주말 요금' : '주중 요금'} />
                    <div className="flex items-baseline justify-between gap-4 py-5">
                      <dt className="text-[15px] font-semibold">결제 금액</dt>
                      <dd className="font-display text-[32px] font-extrabold tracking-[-0.03em] tabular-nums md:text-[40px]">{formatWon(selected.price)}</dd>
                    </div>
                  </dl>
                </div>
                <ul className="space-y-1 text-[13px] text-[#0a0a0a]/55">
                  <li>취소·환불: {REFUND_SUMMARY}</li>
                  <li>결제창에서 10분 안에 결제를 마쳐 주세요. 시간이 지나면 선점한 자리가 풀립니다.</li>
                </ul>

                {PAYMENTS_FAKE && (
                  <p className="rounded-2xl border border-amber-500/30 bg-amber-500/[.07] px-5 py-3 text-[13px] text-amber-800">
                    개발 모드 — 테스트 결제로 진행됩니다.
                  </p>
                )}

                <BottomBar error={payError}>
                  <Button size="block" onClick={pay} disabled={submitting}>
                    {submitting ? '결제 준비 중…' : <span className="tabular-nums">{formatWon(selected.price)} 결제하기</span>}
                  </Button>
                </BottomBar>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <SiteFooter />
    </main>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-black/[.05] px-3 py-1.5 text-[13px] font-medium tabular-nums text-[#0a0a0a]/75">{children}</span>;
}

function CheckRow({ checked, onChange, strong, children }: { checked: boolean; onChange: (v: boolean) => void; strong?: boolean; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 px-5 py-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={`mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] border transition-[background-color,border-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0a0a0a] peer-active:scale-90 ${
          checked ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white' : 'border-black/20 bg-white text-transparent'
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={`text-[15px] ${strong ? 'font-bold' : 'text-[#0a0a0a]/80'}`}>{children}</span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <dt className="flex-none text-[14px] text-[#0a0a0a]/55">{label}</dt>
      <dd className="text-right text-[15px] font-medium">{value}</dd>
    </div>
  );
}

/** 모바일 하단 고정 주요 버튼. 오류는 버튼 바로 위(가려지지 않게). */
function BottomBar({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-5 border-t border-black/[.06] bg-[#fafaf8]/95 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-2 md:backdrop-blur-none">
      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            className="mb-3 rounded-2xl border border-[#d4351c]/25 bg-[#d4351c]/[.05] px-5 py-3 text-[14px] text-[#b02a15]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}
