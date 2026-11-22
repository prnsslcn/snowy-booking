import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminTitle } from '@/components/admin/AdminShell';
import { BookingRows } from '@/components/admin/BookingRows';
import { StatStrip } from '@/components/admin/StatStrip';
import { requireAdmin } from '@/lib/admin/auth';
import { getDashboard } from '@/lib/admin/bookings';
import { formatDateKorean } from '@/lib/format';

export const metadata: Metadata = { title: '대시보드' };
export const dynamic = 'force-dynamic';

const DAY_STATUS: Record<string, string> = { closed: '휴장', locked: '예약 잠금', out_of_season: '시즌 외', business_closed: '영업 종료' };

export default async function DashboardPage() {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const d = await getDashboard();
  const totalUnits = d.occupancy.reduce((s, o) => s + o.total, 0);
  const totalSold = d.occupancy.reduce((s, o) => s + o.sold, 0);
  const checkedIn = d.todayBookings.filter((b) => b.status === 'checked_in' || b.status === 'checked_out').length;

  return (
    <>
      <AdminTitle title="대시보드" />

      {/* 환불 실패·처리 중 — 가장 먼저 보이게 */}
      {d.stuckRefunds.length > 0 && (
        <section className="mb-5 rounded-2xl border border-[#d4351c]/20 bg-[#fdf3f1] p-5 md:p-7">
          <h2 className="panel-title text-[#b42d18]">환불 처리 중 {d.stuckRefunds.length}건 — 상세 화면에서 재시도하거나 계좌 환불을 기록하세요</h2>
          <div className="mt-3">
            <BookingRows items={d.stuckRefunds} compact />
          </div>
        </section>
      )}

      <StatStrip
        tone="glacier"
        head={
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="font-display text-[13px] font-semibold tracking-[0.02em] text-ice-200">Today</p>
              <p className="mt-1 text-[20px] font-bold tracking-[-0.02em] md:text-[24px]">{formatDateKorean(d.today)}</p>
            </div>
            <div className="w-full md:w-72">
              <div className="flex justify-between text-[12px] text-ice-100/70">
                <span>오늘 점유율</span>
                <span className="tabular-nums">{totalUnits ? Math.round((totalSold / totalUnits) * 100) : 0}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ice-50/[.14]">
                <div className="h-full rounded-full bg-ice-200" style={{ width: `${totalUnits ? (totalSold / totalUnits) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        }
        items={[
          { label: '오늘 점유', value: `${totalSold}`, unit: `/ ${totalUnits}`, note: '결제 대기 포함 / 운영 유닛' },
          { label: '오늘 입실', value: `${checkedIn}`, unit: `/ ${d.todayBookings.length}`, note: '입실·퇴실 처리 / 오늘 예약' },
          { label: '7일 내 예약', value: `${d.upcoming7}`, unit: '건', note: '오늘 포함, 확정·입실' },
          { label: '이번 달 매출', value: d.monthRevenue.toLocaleString('ko-KR'), unit: '원', note: `이용일 기준 ${d.monthCount}건` },
        ]}
      />

      {/* 상품별 오늘 점유 */}
      <section className="mt-6 panel">
        <h2 className="panel-title">상품별 오늘 점유</h2>
        <ul className="mt-4 space-y-4">
          {d.occupancy.map((o) => {
            const pct = o.total ? (o.sold / o.total) * 100 : 0;
            const closed = o.dayStatus !== 'open' && o.dayStatus !== 'sold_out';
            return (
              <li key={o.type}>
                <div className="flex items-baseline justify-between gap-3 text-[14px]">
                  <span className="font-medium">{o.name}</span>
                  <span className="tabular-nums text-ink-2">
                    {closed ? (DAY_STATUS[o.dayStatus] ?? o.dayStatus) : `${o.sold} / ${o.total}`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ice-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-ice-400 to-ice-600" style={{ width: `${closed ? 0 : pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 오늘 예약 */}
      <section className="mt-6 panel">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="panel-title">오늘 예약 {d.todayBookings.length}건</h2>
          <Link href={`/admin/bookings?from=${d.today}&to=${d.today}`} className="text-[13px] font-medium text-ice-600 hover:text-ice-700">
            전체 보기
          </Link>
        </div>
        <div className="mt-3">
          {d.todayBookings.length ? <BookingRows items={d.todayBookings} compact /> : <p className="py-6 text-center text-[14px] text-ink-3">오늘 예약이 없습니다.</p>}
        </div>
      </section>
    </>
  );
}
