'use client';

import { useState } from 'react';

import { PageShell } from '@/components/site/PageShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { errorMessage } from '@/lib/booking/error-messages';
import { facilityByType } from '@/lib/content/facilities';
import { formatDateKorean, formatPhone, formatWon } from '@/lib/format';
import { REFUND_SUMMARY, USAGE_TIME } from '@/lib/site-config';

interface LookupResult {
  status: string;
  type: string;
  guestName: string;
  guestCount: number;
  typeName: string;
  date: string;
  amount: number;
  refundAmount: number | null;
  refundPreview: { rate: number; amount: number } | null;
}

type Tone = 'success' | 'warning' | 'neutral' | 'danger' | 'accent';
const STATUS: Record<string, { tone: Tone; label: string }> = {
  confirmed: { tone: 'success', label: '예약 확정' },
  cancel_requested: { tone: 'warning', label: '취소 처리 중' },
  refunded: { tone: 'neutral', label: '취소 완료' },
  cancelled: { tone: 'neutral', label: '취소됨' },
  checked_in: { tone: 'accent', label: '이용 중' },
  checked_out: { tone: 'neutral', label: '이용 완료' },
};

export default function LookupPage() {
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
    if (!confirm(msg)) return;
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
            ? `취소되었습니다. ${formatWon(body.refundedAmount ?? 0)}이 환불됩니다(카드사에 따라 영업일 3~5일).`
            : '취소되었습니다.',
        );
      }
      await lookup(true);
    } finally {
      setCancelling(false);
    }
  }

  const status = result ? (STATUS[result.status] ?? { tone: 'neutral' as Tone, label: result.status }) : null;
  const cover = result ? (facilityByType(result.type)?.cover.src ?? null) : null;
  const canSubmit = code.length === 4 && phone.replace(/\D/g, '').length >= 10;

  return (
    <PageShell surface>
      <div className="enter">
        <h1 className="text-[26px] font-bold sm:text-[30px]">예약 조회·취소</h1>
        <p className="mt-2 text-[15px] text-muted">예약할 때 입력한 휴대폰 번호와 문자로 받은 예약번호 4자리를 입력해 주세요.</p>
      </div>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void lookup();
        }}
      >
        <Field label="휴대폰 번호">
          <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric" autoComplete="tel" maxLength={13} />
        </Field>
        <Field label="예약번호">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4자리 숫자"
            inputMode="numeric"
            maxLength={4}
            className="tabular tracking-[0.2em]"
          />
        </Field>
        <Button size="lg" type="submit" disabled={loading || !canSubmit}>
          {loading ? '조회 중…' : '조회하기'}
        </Button>
      </form>

      {error && <p className="enter mt-5 rounded-[14px] bg-danger-soft px-4 py-3 text-[14px] text-danger">{error}</p>}
      {notice && <p className="enter mt-5 rounded-[14px] bg-success-soft px-4 py-3 text-[14px] text-success">{notice}</p>}

      {result && status && (
        <div className="enter mt-8 overflow-hidden rounded-[22px] border border-line-soft bg-surface">
          <div className="flex items-center gap-4 p-5">
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element -- 작은 썸네일
              <img src={cover} alt="" className="h-14 w-14 rounded-[14px] object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold">{result.typeName} 1동</p>
              <p className="text-[14px] text-muted">{formatDateKorean(result.date)} {USAGE_TIME}</p>
            </div>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <div className="border-t border-line-soft">
            <Row label="예약자" value={`${result.guestName} · ${result.guestCount}명`} />
            <Row label="결제 금액" value={formatWon(result.amount)} />
            {result.status === 'refunded' && <Row label="환불 금액" value={formatWon(result.refundAmount ?? 0)} />}
          </div>
          {result.refundPreview && (
            <div className="border-t border-line-soft p-5">
              <p className="text-[15px] text-ink-2">
                지금 취소하면 <b className="tabular text-ink">{formatWon(result.refundPreview.amount)}</b>
                <span className="text-subtle"> ({Math.round(result.refundPreview.rate * 100)}%)</span>이 환불됩니다.
              </p>
              <p className="mt-1 text-[13px] text-subtle">{REFUND_SUMMARY} · 날짜 변경은 취소 후 다시 예약해 주세요.</p>
              <Button variant="danger" size="lg" onClick={cancel} disabled={cancelling} className="mt-4">
                {cancelling ? '취소 처리 중…' : '예약 취소하기'}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="tabular text-right text-[15px] font-medium">{value}</span>
    </div>
  );
}
