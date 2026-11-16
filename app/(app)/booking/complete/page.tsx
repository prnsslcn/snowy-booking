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
      <div className="enter">
        <p className="label text-success">예약 확정</p>
        <h1 className="mt-3 text-[32px] leading-[1.15]">예약이 확정되었습니다</h1>
        <p className="mt-3 text-[16px] text-body">예약 내용은 문자로도 발송됩니다.</p>
      </div>

      {data && (
        <div className="enter mt-10">
          <div className="bg-dark px-6 py-8 text-white">
            <p className="label text-on-dark-soft">예약번호</p>
            <p className="tabular mt-3 text-[64px] font-medium leading-none tracking-[0.2em]">{data.lookup_code}</p>
            <p className="mt-4 text-[14px] text-on-dark-soft">조회·취소 시 휴대폰 번호와 함께 입력</p>
          </div>
          <dl>
            {[
              ['이용일', `${formatDateKorean(data.date)} ${USAGE_TIME}`],
              ['공간', `${typeName} 1동 · ${data.guest_count}명`],
              ['결제 금액', formatWon(data.amount)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-hairline py-4">
                <dt className="text-[16px] text-muted">{k}</dt>
                <dd className="tabular text-right text-[16px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[14px] text-muted">자리(호수)는 이용 당일 현장에서 배정됩니다. {TICKET_NOTICE}</p>
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-3">
        <ButtonLink href="/booking/lookup" variant="secondary">
          예약 조회
        </ButtonLink>
        <ButtonLink href="/">홈</ButtonLink>
      </div>
    </PageShell>
  );
}
