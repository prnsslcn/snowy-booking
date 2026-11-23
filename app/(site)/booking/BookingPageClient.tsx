'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Calendar, type CalendarDay } from '@/components/booking/Calendar';
import { blockIn, WILL } from '@/components/site/motion';
import { PageTitle } from '@/components/site/PageTitle';
import { usePageTransition } from '@/components/site/PageTransition';
import { SiteFooter } from '@/components/site/SiteFooter';
import { useLenis } from '@/components/site/SmoothScroll';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { errorMessage } from '@/lib/booking/error-messages';
import { PAYMENTS_FAKE, PayError, payAndConfirmFake, releaseClient, reserveClient, type ReserveResponse } from '@/lib/client/pay';
import { AGREEMENT_ID, mountTossWidget, PAYMENT_METHODS_ID, requestTossPayment, unmountTossWidget, type MountedWidget } from '@/lib/client/toss-payment';
import { thumbOf } from '@/lib/content/facilities';
import { formatPhone } from '@/lib/format';
import { formatDate, money, productName, tr } from '@/lib/i18n';
import { BOOKING_WINDOW_EN, BOOKING_WINDOW_KO, SAME_DAY_CUTOFF_HOUR } from '@/lib/policy/booking-window';
import { parseMobilePhone } from '@/lib/policy/phone';
import { notices, USAGE_TIME, usageTime } from '@/lib/site-config';
import { useLocale } from '@/components/site/LocaleProvider';

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

const STEPS = { ko: ['날짜', '상품', '예약자 정보', '결제'], en: ['Date', 'Type', 'Your details', 'Payment'] };
const TITLES = {
  ko: ['이용할 날짜를 골라 주세요', '상품을 선택해 주세요', '예약자 정보를 입력해 주세요', '결제 내용을 확인해 주세요'],
  en: ['Choose your date', 'Choose a type', 'Enter your details', 'Review and pay'],
};
const CUTOFF = `${String(SAME_DAY_CUTOFF_HOUR).padStart(2, '0')}:00`;
const EASE = [0.22, 1, 0.36, 1] as const;
const msLeft = (iso: string) => new Date(iso).getTime() - Date.now();
const BAR_EASE = [0.65, 0, 0.35, 1] as const;

export default function BookingPageClient({ preferredType }: { preferredType: string | null }) {
  const router = useRouter();
  const lenis = useLenis();
  const locale = useLocale();
  const L = tr(locale);
  const N = notices(locale);
  const { ready } = usePageTransition();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1); // 1 = 앞으로, -1 = 되돌아감
  const [avail, setAvail] = useState<AvailResponse | null>(null);
  const [loadError, setLoadError] = useState('');

  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [agreeRules, setAgreeRules] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const widgetRef = useRef<MountedWidget | null>(null);
  // 위젯 입력 미완료(NEED_*)로 결제 요청이 막혔을 때 잡아 둔 자리를 다음 클릭에 다시 쓴다(선점·반환 반복 방지)
  const holdRef = useRef<{ key: string; hold: ReserveResponse } | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);

  const load = useCallback(
    () =>
      fetch('/api/availability', { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) throw new Error();
          setAvail((await res.json()) as AvailResponse);
          setLoadError('');
        })
        .catch(() => setLoadError('LOAD_FAILED')), // 문구는 그릴 때 언어에 맞게
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
    moveTo(3);
  }

  function validateInfo(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = L('이름을 입력해 주세요.', 'Please enter your name.');
    if (!parseMobilePhone(phone)) e.phone = L('휴대폰 번호를 정확히 입력해 주세요.', 'Please enter a valid Korean mobile number.');
    if (!agreeRefund || !agreeRules) e.agree = L('필수 항목에 모두 동의해 주세요.', 'Please agree to all required items.');
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
      agreed: agreeRefund && agreeRules,
    };
    // 토스 키가 아직 없으면(가맹점 계약 전) 자리를 잡지 않고 안내만 — 키를 넣으면 자동으로 결제 진행
    if (!PAYMENTS_FAKE && !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY) {
      setPayError(L('온라인 결제를 준비하고 있습니다. 결제가 열리면 바로 예약하실 수 있습니다.', 'Online payment is being set up. You’ll be able to book as soon as it opens.'));
      setSubmitting(false);
      return;
    }
    const widget = widgetRef.current;
    if (!PAYMENTS_FAKE && !widget) {
      setSubmitting(false);
      return;
    }
    const key = `${req.type}|${req.date}|${req.guestName}|${req.guestPhone}`;
    let heldOrderId: string | null = null;
    try {
      if (PAYMENTS_FAKE) {
        const { orderId } = await payAndConfirmFake(req);
        router.push(`/booking/complete?o=${encodeURIComponent(orderId)}`);
        return;
      }
      // 앞서 잡아 둔 자리가 같은 내용이고 1분 이상 남았으면 그대로, 아니면 돌려주고 새로 잡는다
      const prev = holdRef.current;
      holdRef.current = null;
      let r: ReserveResponse;
      if (prev && prev.key === key && msLeft(prev.hold.expiresAt) > 60_000) {
        r = prev.hold;
      } else {
        if (prev) await releaseClient(prev.hold.orderId).catch(() => {});
        r = await reserveClient(req);
      }
      heldOrderId = r.orderId;
      holdRef.current = { key, hold: r };
      await requestTossPayment(widget!.widgets, {
        amount: r.amount,
        orderId: r.orderId,
        orderName: r.orderName,
        customerName: name.trim(),
        customerMobilePhone: parseMobilePhone(phone) ?? undefined,
      });
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      // 위젯 입력 미완료(NEED_* — 카드사·할부 미선택, 약관 미동의 등)는 위젯이 직접 안내 → 자리 유지, 다음 클릭에 재사용
      if (code.startsWith('NEED_')) {
        setSubmitting(false);
        return;
      }
      // 결제창이 안 떴거나 손님이 닫음 → 잡아 둔 자리를 바로 돌려준다(10분 기다리지 않게)
      holdRef.current = null;
      if (heldOrderId) void releaseClient(heldOrderId).catch(() => {});
      if (err instanceof PayError) {
        setPayError(errorMessage(err.code, locale));
        if (['SOLD_OUT', 'DATE_LOCKED', 'DATE_CLOSED', 'OUT_OF_WINDOW'].includes(err.code)) await load();
      } else {
        if (code !== 'USER_CANCEL') setPayError(L('결제가 취소되었거나 실패했습니다. 다시 시도해 주세요.', 'The payment was cancelled or failed. Please try again.'));
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
        : L('입력하지 않았거나 잘못된 항목이 있습니다.', 'Some fields are missing or incorrect.')
      : '';

  return (
    <main data-nav-theme="light" className="flex min-h-[100dvh] flex-col bg-ice-50 text-ink">
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-28 md:px-8 md:pt-32">
        <PageTitle
          display="Booking"
          sub={L('예약하기', 'Book your day')}
          aside={
            <span className="mb-1 flex-none overflow-hidden font-mono text-xs tracking-[.22em] text-ink/50" aria-hidden>
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
        <motion.nav aria-label={L('예약 단계', 'Booking steps')} style={WILL} {...blockIn(8, '14%', 0.78, 0.28, ready)}>
          <div className="relative h-[3px] overflow-hidden rounded-full bg-ice-100">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ice-400 to-ice-600"
              initial={{ width: '0%' }}
              animate={{ width: ready ? `${(step / STEPS[locale].length) * 100}%` : '0%' }}
              transition={{ duration: 0.9, ease: BAR_EASE }}
            />
          </div>
          <ol className="mt-3 grid grid-cols-4">
            {STEPS[locale].map((label, i) => {
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
                      active ? 'font-semibold text-ink' : done ? 'font-medium text-ink/60 hover:text-ink' : 'text-ink/30'
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

        {loadError && <p className="mt-8 rounded-2xl border border-[#d4351c]/25 bg-[#d4351c]/[.05] px-5 py-4 text-[14px] text-[#b02a15]">{L('예약 현황을 불러오지 못했습니다. 새로고침해 주세요.', 'We couldn’t load availability. Please refresh the page.')}</p>}

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
            {/* 이전 단계로 — 2단계부터 제목 위에 */}
            {step >= 2 && (
              <button
                type="button"
                onClick={() => goStep(step - 1)}
                disabled={submitting}
                className="group -ml-1 mb-4 inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-[14px] font-medium text-ink/55 transition-[color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-ink active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40"
              >
                <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-0.5" fill="none">
                  <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {L('이전 단계', 'Back')}
              </button>
            )}
            <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[28px]">{TITLES[locale][step - 1]}</h2>

            {step >= 2 && date && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip>
                  {formatDate(date, locale)} · {usageTime(locale)}
                </Chip>
                {step >= 3 && selected && <Chip>{productName(selected.type, selected.name, locale)}</Chip>}
              </div>
            )}

            {/* 1. 날짜 */}
            {step === 1 && (
              <div className="mt-6">
                <p className="mb-5 text-[15px] text-ink/60">{L(`오늘부터 ${BOOKING_WINDOW_KO} 이내 · 당일 예약 ${CUTOFF}까지`, `Up to ${BOOKING_WINDOW_EN} ahead · same-day bookings until ${CUTOFF}`)}</p>
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
                <p className="text-[15px] text-ink/60">{L('1인 1동 · 자리는 현장 배정', 'One unit per person · unit assigned on site')}</p>
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
                            ? 'border-ice-600 ring-1 ring-ice-600'
                            : 'border-black/[.08] hover:border-ice-400 active:scale-[0.985]'
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
                          <span className={`text-[18px] font-bold ${soldOut ? 'text-ink/35' : ''}`}>{productName(t.type, t.name, locale)}</span>
                          <span className="text-[13px] text-ink/50">{L(`최대 ${t.maxCapacity}인`, `Up to ${t.maxCapacity} people`)}</span>
                        </div>
                        <p className={`mt-1 font-display text-[22px] font-extrabold tracking-[-0.02em] tabular-nums ${soldOut ? 'text-ink/35' : ''}`}>
                          {money(t.price, locale)}
                        </p>
                        {soldOut && (
                          <div className="mt-2">
                            <Badge tone="error">{L('마감', 'Sold out')}</Badge>
                          </div>
                        )}
                      </div>
                      {!soldOut && (
                        <svg
                          aria-hidden
                          viewBox="0 0 16 16"
                          className="mr-1 h-5 w-5 flex-none text-ink/35 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:text-ice-600"
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
                <Field label={L('이름', 'Name')} error={errors.name}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
                </Field>
                <Field label={L('휴대폰 번호', 'Mobile number (Korea)')} error={errors.phone} hint={N.onePerDay}>
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

                <fieldset className="overflow-hidden rounded-3xl border border-black/[.08] bg-white">
                  <legend className="sr-only">{L('동의', 'Agreement')}</legend>
                  <CheckRow
                    checked={agreeRefund && agreeRules}
                    onChange={(v) => {
                      setAgreeRefund(v);
                      setAgreeRules(v);
                    }}
                    strong
                  >
                    {L('필수 항목 모두 동의', 'Agree to all required items')}
                  </CheckRow>
                  <div className="border-t border-black/[.06]">
                    <CheckRow checked={agreeRefund} onChange={setAgreeRefund}>
                      {L('[필수] 취소·환불 규정', '[Required] Cancellation and refund policy')}
                      <span className="mt-0.5 block text-[13px] text-ink/50">{N.refundSummary}</span>
                    </CheckRow>
                    <CheckRow checked={agreeRules} onChange={setAgreeRules}>
                      {L('[필수] 이용 수칙', '[Required] House rules')}
                      <span className="mt-0.5 block text-[13px] text-ink/50">
                        {L(`이용 시간 ${USAGE_TIME}, 최대 인원 준수.`, `Hours ${usageTime(locale)}; do not exceed the maximum number of guests.`)} {N.ticket} {N.parking}
                      </span>
                    </CheckRow>
                  </div>
                </fieldset>

                <BottomBar error={infoError}>
                  <Button size="block" onClick={() => validateInfo() && moveTo(4)}>
                    {L('다음', 'Next')}
                  </Button>
                </BottomBar>
              </div>
            )}

            {/* 4. 결제 */}
            {step === 4 && selected && (
              <div className="mt-8 space-y-6">
                <div className="rounded-3xl border border-black/[.08] bg-white px-5 md:px-6">
                  <dl className="divide-y divide-black/[.06]">
                    <SummaryRow label={L('이용일', 'Date')} value={`${formatDate(date, locale)} ${usageTime(locale)}`} />
                    <SummaryRow
                      label={L('상품', 'Type')}
                      value={L(`${selected.name} 1${selected.type === 'cabana' ? '동' : '대'}`, `${productName(selected.type, selected.name, locale)} × 1`)}
                    />
                    <SummaryRow label={L('예약자', 'Booked by')} value={`${name.trim()} · ${formatPhone(phone)}`} />
                    <div className="flex items-baseline justify-between gap-4 py-5">
                      <dt className="text-[15px] font-semibold">{L('결제 금액', 'Total')}</dt>
                      <dd className="font-display text-[32px] font-extrabold tracking-[-0.03em] tabular-nums md:text-[40px]">{money(selected.price, locale)}</dd>
                    </div>
                  </dl>
                </div>
                <ul className="space-y-1 text-[13px] text-ink/55">
                  <li>{L('취소·환불: ', 'Cancellation and refunds: ')}{N.refundSummary}</li>
                  <li>
                    {L(
                      '결제창에서 10분 안에 결제를 마쳐 주세요. 시간이 지나면 선점한 자리가 풀립니다.',
                      'Please complete payment within 10 minutes. After that, your held unit is released.',
                    )}
                  </li>
                </ul>

                {!PAYMENTS_FAKE && process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY && (
                  <TossWidget amount={selected.price} widgetRef={widgetRef} onReady={setWidgetReady} failText={L('결제 화면을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.', 'We couldn’t load the payment form. Please refresh and try again.')} />
                )}

                {PAYMENTS_FAKE && (
                  <p className="rounded-2xl border border-amber-500/30 bg-amber-500/[.07] px-5 py-3 text-[13px] text-amber-800">
                    {L('개발 모드 — 테스트 결제로 진행됩니다.', 'Development mode — test payment only.')}
                  </p>
                )}

                <BottomBar error={payError}>
                  <Button size="block" onClick={pay} disabled={submitting || (!PAYMENTS_FAKE && !!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY && !widgetReady)}>
                    {submitting ? (
                      L('결제 준비 중…', 'Preparing payment…')
                    ) : (
                      <span className="tabular-nums">{L(`${money(selected.price, locale)} 결제하기`, `Pay ${money(selected.price, locale)}`)}</span>
                    )}
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

/** 토스 결제위젯(결제수단·약관 UI). 결제 단계에 들어올 때 그리고, 나가면 지운다. */
function TossWidget({
  amount,
  widgetRef,
  onReady,
  failText,
}: {
  amount: number;
  widgetRef: { current: MountedWidget | null };
  onReady: (ready: boolean) => void;
  failText: string;
}) {
  const [failed, setFailed] = useState(false);
  const amountRef = useRef(amount); // 처음 그릴 때 금액 — 결제 요청 때 서버 금액으로 다시 맞춘다

  useEffect(() => {
    let alive = true;
    const mounting = mountTossWidget(amountRef.current);
    mounting
      .then((w) => {
        if (!alive) return;
        widgetRef.current = w;
        onReady(true);
      })
      .catch((err: unknown) => {
        console.error('[toss widget]', err);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      widgetRef.current = null;
      onReady(false);
      unmountTossWidget(mounting);
    };
  }, [widgetRef, onReady]);

  return (
    <div className="overflow-hidden rounded-3xl border border-black/[.08] bg-white">
      {failed && <p className="px-5 py-4 text-[14px] text-red-600">{failText}</p>}
      <div id={PAYMENT_METHODS_ID} />
      <div id={AGREEMENT_ID} />
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-ice-100 px-3 py-1.5 text-[13px] font-medium tabular-nums text-ice-700">{children}</span>;
}

function CheckRow({ checked, onChange, strong, children }: { checked: boolean; onChange: (v: boolean) => void; strong?: boolean; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 px-5 py-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={`mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] border transition-[background-color,border-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ice-600 peer-active:scale-90 ${
          checked ? 'border-glacier bg-glacier text-white' : 'border-black/20 bg-white text-transparent'
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={`text-[15px] ${strong ? 'font-bold' : 'text-ink/80'}`}>{children}</span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <dt className="flex-none text-[14px] text-ink/55">{label}</dt>
      <dd className="text-right text-[15px] font-medium">{value}</dd>
    </div>
  );
}

/** 모바일 하단 고정 주요 버튼. 오류는 버튼 바로 위(가려지지 않게). */
function BottomBar({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-5 border-t border-black/[.06] bg-ice-50/95 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-2 md:backdrop-blur-none">
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
