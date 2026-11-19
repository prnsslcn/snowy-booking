import type { Metadata } from 'next';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { formatDateKorean, formatWon } from '@/lib/format';
import { TICKET_NOTICE, USAGE_TIME } from '@/lib/site-config';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: '예약 완료' };

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
        .select('lookup_code, date, guest_count, amount, status, type, price_snapshot')
        .eq('order_id', o)
        .eq('source', 'online')
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .maybeSingle()
    : { data: null };

  const typeName = (data?.price_snapshot as { type_name?: string } | null)?.type_name ?? '';
  const unit = data?.type === 'cabana' ? '동' : '대';

  return (
    <SubPage display="Confirmed" sub="예약이 확정되었습니다">
      <p className="text-[15px] text-ink/60">예약 내용은 문자로도 발송됩니다.</p>

      {data && (
        <div className="mt-8">
          <div className="rounded-3xl bg-glacier px-6 py-8 text-white md:px-8 md:py-10">
            <p className="text-[13px] font-medium text-ice-200/80">예약번호</p>
            <p className="mt-3 font-display text-[64px] font-extrabold leading-none tracking-[0.12em] tabular-nums md:text-[80px]">{data.lookup_code}</p>
            <p className="mt-4 text-[13px] text-ice-200/80">조회·취소 시 휴대폰 번호와 함께 입력합니다.</p>
          </div>
          <dl className="mt-6 divide-y divide-black/[.06] border-y border-black/[.08]">
            {[
              ['이용일', `${formatDateKorean(data.date)} ${USAGE_TIME}`],
              ['상품', data.guest_count ? `${typeName} 1${unit} · ${data.guest_count}명` : `${typeName} 1${unit}`],
              ['결제 금액', formatWon(data.amount)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-4">
                <dt className="text-[14px] text-ink/55">{k}</dt>
                <dd className="text-right text-[15px] font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[13px] text-ink/55">자리(호수)는 이용 당일 현장에서 배정됩니다. {TICKET_NOTICE}</p>
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-3">
        <TLink href="/booking/lookup" className={buttonClass('secondary', 'block')}>
          예약 조회
        </TLink>
        <TLink href="/" className={buttonClass('primary', 'block')}>
          홈
        </TLink>
      </div>
    </SubPage>
  );
}
