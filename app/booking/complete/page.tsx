import { PageShell } from '@/components/site/PageShell';
import { ButtonLink } from '@/components/ui/Button';
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
    <PageShell>
      <div className="enter pt-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
            <path d="m5.5 12.5 4.5 4.5 8.5-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-6 text-[26px] font-bold">예약이 확정되었어요</h1>
        <p className="mt-2 text-[15px] text-muted">예약 내용은 문자로도 보내드렸어요.</p>
      </div>

      {data && (
        <div className="enter mt-8 overflow-hidden rounded-[22px] border border-line-soft bg-surface">
          <div className="bg-ice px-6 py-7 text-center">
            <p className="text-[14px] font-medium text-ink-2">예약번호</p>
            <p className="tabular mt-2 text-[44px] font-bold leading-none tracking-[0.25em] text-ink">{data.lookup_code}</p>
            <p className="mt-3 text-[13px] text-muted">조회·취소할 때 휴대폰 번호와 함께 필요해요.</p>
          </div>
          <dl className="tabular space-y-3 px-6 py-5 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">이용일</dt>
              <dd className="text-right font-medium">{formatDateKorean(data.date)} {USAGE_TIME}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">공간</dt>
              <dd className="font-medium">{typeName} 1동 · {data.guest_count}명</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">결제 금액</dt>
              <dd className="font-semibold">{formatWon(data.amount)}</dd>
            </div>
          </dl>
          <p className="border-t border-line-soft px-6 py-4 text-[13px] leading-relaxed text-subtle">
            자리(호수)는 이용 당일 현장에서 배정해 드려요. {TICKET_NOTICE}
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <ButtonLink href="/booking/lookup" variant="outline" size="lg">
          예약 조회
        </ButtonLink>
        <ButtonLink href="/" variant="dark" size="lg">
          홈으로
        </ButtonLink>
      </div>
    </PageShell>
  );
}
