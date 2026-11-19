import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import type { BookingListItem } from '@/lib/admin/bookings';
import { SOURCE_LABEL, statusBadge, unitOrType } from '@/lib/admin/labels';
import { formatPhone, formatWon } from '@/lib/format';

/*
  예약 목록 줄 — 데스크톱: 표 / 폰: 카드. 줄 전체가 상세로 가는 링크.
  compact = 대시보드용(이용일 열 생략).
*/

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function shortDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number);
  const w = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return `${m}/${d} (${WEEK[w]})`;
}

export function BookingRows({ items, compact = false }: { items: BookingListItem[]; compact?: boolean }) {
  return (
    <>
      {/* 데스크톱 표 */}
      <table className="hidden w-full text-[14px] md:table">
        <thead>
          <tr className="border-b border-ice-700/10 text-left text-[12px] text-ink/50">
            {!compact && <th className="py-2.5 pr-3 font-medium">이용일</th>}
            <th className="py-2.5 pr-3 font-medium">유닛</th>
            <th className="py-2.5 pr-3 font-medium">예약자</th>
            <th className="py-2.5 pr-3 font-medium">휴대폰</th>
            <th className="py-2.5 pr-3 font-medium">예약번호</th>
            <th className="py-2.5 pr-3 text-right font-medium">금액</th>
            <th className="py-2.5 text-right font-medium">상태</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => {
            const s = statusBadge({ status: b.status, cancel_error: b.cancelError, refund_method: b.refundMethod });
            return (
              <tr key={b.id} className="group relative border-b border-ice-700/[.07] last:border-0 hover:bg-ice-50">
                {!compact && <td className="py-3 pr-3 tabular-nums">{shortDate(b.date)}</td>}
                <td className="py-3 pr-3">
                  <Link href={`/admin/bookings/${b.id}`} className="font-semibold after:absolute after:inset-0">
                    {unitOrType(b)}
                  </Link>
                </td>
                <td className="py-3 pr-3">
                  {b.guestName}
                  {b.source !== 'online' && <span className="ml-1.5 text-[12px] text-ice-600">{SOURCE_LABEL[b.source]}</span>}
                </td>
                <td className="py-3 pr-3 tabular-nums text-ink/70">{b.guestPhone ? formatPhone(b.guestPhone) : '—'}</td>
                <td className="py-3 pr-3 font-mono tabular-nums">{b.lookupCode ?? '—'}</td>
                <td className="py-3 pr-3 text-right tabular-nums">{formatWon(b.amount)}</td>
                <td className="py-3 text-right">
                  <Badge tone={s.tone}>{s.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 폰 카드 */}
      <ul className="space-y-2 md:hidden">
        {items.map((b) => {
          const s = statusBadge({ status: b.status, cancel_error: b.cancelError, refund_method: b.refundMethod });
          return (
            <li key={b.id}>
              <Link href={`/admin/bookings/${b.id}`} className="block rounded-2xl border border-ice-700/10 bg-white p-4 active:bg-ice-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold">
                    {b.guestName}
                    {b.source !== 'online' && <span className="ml-1.5 text-[12px] font-medium text-ice-600">{SOURCE_LABEL[b.source]}</span>}
                  </span>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                <p className="mt-1.5 text-[13px] text-ink/60">
                  {!compact && <span className="tabular-nums">{shortDate(b.date)} · </span>}
                  {unitOrType(b)}
                </p>
                <p className="mt-1 flex justify-between text-[13px] tabular-nums text-ink/60">
                  <span>
                    {b.guestPhone ? formatPhone(b.guestPhone) : '—'}
                    {b.lookupCode && <span className="ml-2 font-mono">#{b.lookupCode}</span>}
                  </span>
                  <span className="font-medium text-ink">{formatWon(b.amount)}</span>
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
