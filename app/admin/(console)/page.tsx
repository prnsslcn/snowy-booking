import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminTitle } from '@/components/admin/AdminShell';
import { BookingRows } from '@/components/admin/BookingRows';
import { getDashboard } from '@/lib/admin/bookings';
import { formatDateKorean, formatWon } from '@/lib/format';

export const metadata: Metadata = { title: '대시보드' };
export const dynamic = 'force-dynamic';

const DAY_STATUS: Record<string, string> = { closed: '휴장', locked: '예약 잠금', out_of_season: '시즌 외', business_closed: '영업 종료' };

export default async function DashboardPage() {
  const d = await getDashboard();
  const totalUnits = d.occupancy.reduce((s, o) => s + o.total, 0);
  const totalSold = d.occupancy.reduce((s, o) => s + o.sold, 0);
  const checkedIn = d.todayBookings.filter((b) => b.status === 'checked_in' || b.status === 'checked_out').length;

  return (
    <>
      <AdminTitle title="대시보드" sub={`오늘 ${formatDateKorean(d.today)}`} />

      {/* 환불 실패·처리 중 — 가장 먼저 보이게 */}
      {d.stuckRefunds.length > 0 && (
        <section className="mb-6 rounded-3xl border border-[#d4351c]/20 bg-[#d4351c]/[.04] p-5 md:p-6">
          <h2 className="text-[15px] font-bold text-[#b42d18]">환불 처리 중 {d.stuckRefunds.length}건 — 상세 화면에서 재시도하거나 계좌 환불을 기록하세요</h2>
          <div className="mt-3">
            <BookingRows items={d.stuckRefunds} compact />
          </div>
        </section>
      )}

      {/* 숫자 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          ['오늘 점유', `${totalSold} / ${totalUnits}`, totalUnits ? `${Math.round((totalSold / totalUnits) * 100)}%` : ''],
          ['오늘 입실', `${checkedIn} / ${d.todayBookings.length}`, '입실·퇴실 처리 / 오늘 예약'],
          ['7일 내 예약', `${d.upcoming7}건`, '오늘 포함, 확정·입실'],
          ['이번 달 매출', formatWon(d.monthRevenue), `이용일 기준 ${d.monthCount}건`],
        ].map(([k, v, s]) => (
          <div key={k} className="rounded-3xl bg-white p-5 md:p-6">
            <p className="text-[13px] font-medium text-ice-600">{k}</p>
            <p className="mt-2 font-display text-[24px] font-bold tabular-nums tracking-[-0.02em] md:text-[28px]">{v}</p>
            <p className="mt-1 text-[12px] text-ink/50">{s}</p>
          </div>
        ))}
      </div>

      {/* 상품별 오늘 점유 */}
      <section className="mt-6 rounded-3xl bg-white p-5 md:p-6">
        <h2 className="text-[15px] font-bold">상품별 오늘 점유</h2>
        <ul className="mt-4 space-y-4">
          {d.occupancy.map((o) => {
            const pct = o.total ? (o.sold / o.total) * 100 : 0;
            const closed = o.dayStatus !== 'open' && o.dayStatus !== 'sold_out';
            return (
              <li key={o.type}>
                <div className="flex items-baseline justify-between gap-3 text-[14px]">
                  <span className="font-semibold">{o.name}</span>
                  <span className="tabular-nums text-ink/60">
                    {closed ? (DAY_STATUS[o.dayStatus] ?? o.dayStatus) : `${o.sold} / ${o.total}`}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ice-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-ice-400 to-ice-600" style={{ width: `${closed ? 0 : pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 오늘 예약 */}
      <section className="mt-6 rounded-3xl bg-white p-5 md:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-bold">오늘 예약 {d.todayBookings.length}건</h2>
          <Link href={`/admin/bookings?from=${d.today}&to=${d.today}`} className="text-[13px] font-medium text-glacier">
            전체 보기
          </Link>
        </div>
        <div className="mt-3">
          {d.todayBookings.length ? <BookingRows items={d.todayBookings} compact /> : <p className="py-6 text-center text-[14px] text-ink/45">오늘 예약이 없습니다.</p>}
        </div>
      </section>
    </>
  );
}
