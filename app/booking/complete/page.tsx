import Link from 'next/link';

import { PageShell } from '@/components/site/PageShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDateKorean, formatWon } from '@/lib/format';
import { TICKET_NOTICE, USAGE_TIME } from '@/lib/site-config';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 완료 — 예약번호(4자리) 안내. orderId(추측 불가한 긴 값)로 확정된 온라인 예약만 조회.
 * 휴대폰번호 등 개인정보는 표시하지 않는다.
 */
export const dynamic = 'force-dynamic';

export default async function CompletePage({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  const { o } = await searchParams;
  const supabase = createAdminClient();
  const { data } = o
    ? await supabase
        .from('bookings')
        .select('lookup_code, date, guest_count, amount, status, price_snapshot')
        .eq('order_id', o)
        .eq('source', 'online')
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .maybeSingle()
    : { data: null };

  const typeName = (data?.price_snapshot as { type_name?: string } | null)?.type_name ?? '';

  return (
    <PageShell center>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-2xl text-accent">✓</div>
      <h1 className="mt-5 text-2xl font-bold text-ink">예약이 확정되었습니다</h1>
      <p className="mt-2 text-muted">예약 내역은 문자로도 안내됩니다.</p>

      {data && (
        <Card className="mt-6 w-full p-5">
          <p className="text-sm text-muted">예약번호</p>
          <p className="mt-1 text-4xl font-extrabold tracking-[0.3em] text-ink">{data.lookup_code}</p>
          <p className="mt-2 text-xs text-subtle">예약 조회·취소 시 휴대폰 번호와 예약번호(4자리)가 필요합니다.</p>
          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm text-muted">
            <p>{formatDateKorean(data.date)} {USAGE_TIME}</p>
            <p>{typeName} 1동 · {data.guest_count}명 · {formatWon(data.amount)}</p>
            <p className="text-xs text-subtle">자리(호수)는 이용 당일 현장에서 배정됩니다. {TICKET_NOTICE}</p>
          </div>
        </Card>
      )}

      <div className="mt-6 flex w-full gap-2">
        <Link href="/booking/lookup" className="flex-1">
          <Button variant="secondary" size="lg">예약 조회</Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button variant="ghost" size="lg">홈으로</Button>
        </Link>
      </div>
    </PageShell>
  );
}
