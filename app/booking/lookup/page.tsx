'use client';

import { useState } from 'react';

import { PageShell } from '@/components/site/PageShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { errorMessage } from '@/lib/booking/error-messages';
import { formatDateKorean, formatPhone, formatWon } from '@/lib/format';
import { REFUND_SUMMARY, USAGE_TIME } from '@/lib/site-config';

interface LookupResult {
  status: string;
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
  cancel_requested: { tone: 'warning', label: '취소 처리중' },
  refunded: { tone: 'neutral', label: '취소·환불 완료' },
  cancelled: { tone: 'neutral', label: '취소됨' },
  checked_in: { tone: 'accent', label: '입실 완료' },
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

  async function lookup() {
    setLoading(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      const res = await post('/api/bookings/lookup');
      const body = (await res.json()) as LookupResult & { error?: string };
      if (!res.ok) {
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
        ? `예약을 취소하시겠습니까?\n환불 예정 금액: ${formatWon(refund)}`
        : '이용일 당일 취소는 환불되지 않습니다.\n그래도 예약을 취소하시겠습니까?';
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
            ? `취소되었습니다. ${formatWon(body.refundedAmount ?? 0)}이 환불됩니다(카드사에 따라 영업일 3~5일 소요).`
            : '취소되었습니다.',
        );
      }
      await lookup();
    } finally {
      setCancelling(false);
    }
  }

  const status = result ? (STATUS[result.status] ?? { tone: 'neutral' as Tone, label: result.status }) : null;

  return (
    <PageShell>
      <h1 className="text-xl font-bold text-ink">예약 조회·취소</h1>
      <p className="mt-1 text-sm text-muted">예약 시 입력한 휴대폰 번호와 문자로 받은 예약번호(4자리)를 입력해 주세요.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <Field label="휴대폰 번호">
          <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-1234-5678" inputMode="numeric" maxLength={13} />
        </Field>
        <Field label="예약번호 (4자리)">
          <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" inputMode="numeric" maxLength={4} />
        </Field>
        <Button size="lg" type="submit" disabled={loading || code.length !== 4 || phone.replace(/\D/g, '').length < 10}>
          {loading ? '조회 중…' : '조회하기'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {notice && <p className="mt-4 text-sm text-success">{notice}</p>}

      {result && status && (
        <Card className="mt-6 divide-y divide-line">
          <div className="flex items-center justify-between p-5">
            <span className="font-bold text-ink">{result.typeName} 1동</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <Row label="이용일" value={`${formatDateKorean(result.date)} ${USAGE_TIME}`} />
          <Row label="예약자" value={`${result.guestName} · ${result.guestCount}명`} />
          <Row label="결제 금액" value={formatWon(result.amount)} />
          {result.status === 'refunded' && <Row label="환불 금액" value={formatWon(result.refundAmount ?? 0)} />}
          {result.refundPreview && (
            <div className="space-y-3 p-5">
              <p className="text-sm text-muted">
                지금 취소하면 <b className="text-ink">{formatWon(result.refundPreview.amount)}</b>
                {` (${Math.round(result.refundPreview.rate * 100)}%)`}이 환불됩니다.
              </p>
              <p className="text-xs text-subtle">취소 규정: {REFUND_SUMMARY}. 일정 변경은 취소 후 다시 예약해 주세요.</p>
              <Button variant="secondary" size="lg" onClick={cancel} disabled={cancelling}>
                {cancelling ? '취소 처리 중…' : '예약 취소하기'}
              </Button>
            </div>
          )}
        </Card>
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
