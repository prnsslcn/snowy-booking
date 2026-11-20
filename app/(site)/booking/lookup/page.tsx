'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';

import { blockIn, WILL } from '@/components/site/motion';
import { PageTitle } from '@/components/site/PageTitle';
import { usePageTransition } from '@/components/site/PageTransition';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';
import { errorMessage } from '@/lib/booking/error-messages';
import { thumbOf } from '@/lib/content/facilities';
import { formatDateKorean, formatPhone, formatWon } from '@/lib/format';
import { REFUND_SUMMARY, USAGE_TIME } from '@/lib/site-config';

/*
  예약 조회·취소 — aftc 공지사항 화면 구조: 밝은 바탕, 큰 영문 헤드라인 + 한글 부제,
  위아래 가는 선으로 나뉜 목록. 휴대폰 번호 + 예약번호 4자리가 모두 맞아야 조회(서버 검증·시도 제한).
*/

interface LookupResult {
  status: string;
  type: string;
  guestName: string;
  guestCount: number | null;
  typeName: string;
  date: string;
  amount: number;
  refundAmount: number | null;
  refundPreview: { rate: number; amount: number } | null;
}

type Tone = 'success' | 'warning' | 'neutral' | 'info';
const STATUS: Record<string, { tone: Tone; label: string }> = {
  confirmed: { tone: 'success', label: '예약 확정' },
  cancel_requested: { tone: 'warning', label: '취소 처리 중' },
  refunded: { tone: 'neutral', label: '취소 완료' },
  cancelled: { tone: 'neutral', label: '취소됨' },
  checked_in: { tone: 'info', label: '이용 중' },
  checked_out: { tone: 'neutral', label: '이용 완료' },
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function LookupPage() {
  const { ready } = usePageTransition();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState('');

  async function post(url: string) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
  }

  async function lookup(keepNotice = false) {
    setLoading(true);
    setError('');
    if (!keepNotice) setNotice('');
    try {
      const res = await post('/api/bookings/lookup');
      const body = (await res.json()) as LookupResult & { error?: string };
      if (!res.ok) {
        setResult(null);
        setError(errorMessage(body.error === 'VALIDATION_FAILED' ? 'NOT_FOUND' : body.error));
        return;
      }
      setResult(body);
    } catch {
      setError(errorMessage(null));
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!result?.refundPreview) return;
    const refund = result.refundPreview.amount;
    const msg =
      refund > 0
        ? `예약을 취소할까요?\n환불 예정 금액: ${formatWon(refund)}`
        : '이용일 당일 취소는 환불되지 않습니다.\n그래도 예약을 취소할까요?';
    if (!(await confirmDialog(msg, { confirmLabel: '예약 취소', cancelLabel: '닫기', danger: true }))) return;
    setCancelling(true);
    setError('');
    try {
      const res = await post('/api/bookings/cancel');
      const body = (await res.json()) as { refundedAmount?: number; error?: string };
      if (!res.ok) {
        setError(errorMessage(body.error));
      } else {
        setNotice(
          (body.refundedAmount ?? 0) > 0
            ? `취소되었습니다. ${formatWon(body.refundedAmount ?? 0)} 환불(카드사에 따라 영업일 3~5일).`
            : '취소되었습니다.',
        );
      }
      await lookup(true);
    } finally {
      setCancelling(false);
    }
  }

  const status = result ? (STATUS[result.status] ?? { tone: 'neutral' as Tone, label: result.status }) : null;
  const thumb = result ? thumbOf(result.type) : undefined;
  const canSubmit = code.length === 4 && phone.replace(/\D/g, '').length >= 10;

  return (
    <main data-nav-theme="light" className="flex min-h-[100dvh] flex-col bg-ice-50 text-ink">
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16 pt-32 md:px-10">
        <PageTitle display="Reservation" sub="예약 조회·취소" />

        <motion.form
          className="grid gap-4 border-t border-black/[.1] pt-8 md:grid-cols-[1fr_0.7fr_auto] md:items-end"
          style={WILL}
          {...blockIn(8, '14%', 0.78, 0.32, ready)}
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) void lookup();
          }}
        >
          <Field label="휴대폰 번호">
            <Input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
            />
          </Field>
          <Field label="예약번호">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4자리"
              inputMode="numeric"
              maxLength={4}
              className="tabular-nums tracking-[0.3em]"
            />
          </Field>
          <Button type="submit" className="h-14" disabled={loading || !canSubmit}>
            {loading ? '조회 중…' : '조회하기'}
          </Button>
        </motion.form>
        <motion.p className="mt-3 text-[13px] text-ink/50" style={WILL} {...blockIn(8, '14%', 0.78, 0.4, ready)}>
          예약 시 입력한 휴대폰 번호와 문자로 받은 예약번호 4자리를 입력해 주세요.
        </motion.p>

        <AnimatePresence>
          {error && (
            <motion.p
              key="err"
              role="alert"
              className="mt-8 rounded-2xl border border-[#d4351c]/20 bg-[#d4351c]/[.05] px-5 py-4 text-[14px] text-[#b42d18]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {error}
            </motion.p>
          )}
          {notice && (
            <motion.p
              key="ok"
              role="status"
              className="mt-8 rounded-2xl border border-ice-300/60 bg-ice-100 px-5 py-4 text-[14px] text-ice-700"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {notice}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {result && status ? (
            <motion.section
              key={`${result.date}-${result.status}`}
              aria-label="예약 내용"
              className="mt-12"
              initial={{ opacity: 0, filter: 'blur(8px)', y: 16 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              style={WILL}
            >
              <ul className="divide-y divide-black/[.08] border-y border-black/[.1]">
                <li className="flex items-center gap-4 py-5 md:py-6">
                  {thumb && (
                    <Image src={thumb.src} alt="" width={160} height={160} sizes="64px" className="h-14 w-14 flex-none rounded-xl object-cover md:h-16 md:w-16" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold md:text-xl">{result.typeName} 1{result.type === 'cabana' ? '동' : '대'}</p>
                    <p className="mt-1 text-[14px] text-ink/55">
                      {formatDateKorean(result.date)} · {USAGE_TIME}
                    </p>
                  </div>
                  <Badge tone={status.tone}>
                    {status.label}
                  </Badge>
                </li>
                <Row label="예약자" value={result.guestCount ? `${result.guestName} · ${result.guestCount}명` : result.guestName} />
                <Row label="결제 금액" value={formatWon(result.amount)} />
                {result.status === 'refunded' && <Row label="환불 금액" value={formatWon(result.refundAmount ?? 0)} />}
              </ul>

              {result.refundPreview && (
                <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[15px] text-ink/75">
                      지금 취소하면 <b className="font-semibold tabular-nums text-ice-700">{formatWon(result.refundPreview.amount)}</b> 환불
                      <span className="text-ink/45"> ({Math.round(result.refundPreview.rate * 100)}%)</span>
                    </p>
                    <p className="mt-1 text-[13px] text-ink/50">{REFUND_SUMMARY} · 날짜 변경은 취소 후 다시 예약</p>
                  </div>
                  <Button variant="danger" onClick={cancel} disabled={cancelling}>
                    {cancelling ? '취소 처리 중…' : '예약 취소하기'}
                  </Button>
                </div>
              )}
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>
      <SiteFooter />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <span className="text-[14px] text-ink/55">{label}</span>
      <span className="text-right text-[15px] font-medium tabular-nums md:text-base">{value}</span>
    </li>
  );
}
