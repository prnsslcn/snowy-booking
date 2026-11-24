import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminTitle } from '@/components/admin/AdminShell';
import { EphemeralRange } from '@/components/admin/EphemeralRange';
import { StatStrip } from '@/components/admin/StatStrip';
import { buttonClass } from '@/components/ui/Button';
import { requireAdmin } from '@/lib/admin/auth';
import { getSales, salesRanges } from '@/lib/admin/sales';
import { formatDateKorean, formatWon } from '@/lib/format';
import { DatePicker } from '@/components/ui/DatePicker';

export const metadata: Metadata = { title: '매출' };
export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—');

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const r = salesRanges();
  const sp = await searchParams;
  let from = sp.from && DATE.test(sp.from) ? sp.from : r.thisMonth.from;
  let to = sp.to && DATE.test(sp.to) ? sp.to : r.thisMonth.to;
  if (to < from) [from, to] = [to, from];
  const tooLong = (Date.parse(to) - Date.parse(from)) / 86400000 > 400;
  if (tooLong) ({ from, to } = r.thisMonth);
  const s = await getSales(from, to);

  const presets = [
    { label: '오늘', ...{ from: r.today, to: r.today } },
    { label: '최근 7일', ...r.last7 },
    { label: '이번 달', ...r.thisMonth },
    { label: '지난 달', ...r.lastMonth },
  ];
  const sold = s.byType.reduce((a, t) => a + t.sold, 0);
  const cap = s.byType.reduce((a, t) => a + t.capacity, 0);

  return (
    <>
      <EphemeralRange deps={`${from}|${to}`} />
      <AdminTitle
        title="매출"
        sub={`이용일 기준 ${from} ~ ${to} · 확정·입실·퇴실만(취소·환불 제외)`}
        aside={
          <a href={`/api/admin/report?from=${from}&to=${to}`} className={buttonClass('primary', 'cs')}>
            월말보고 엑셀 받기
          </a>
        }
      />

      {/* 기간 */}
      <div className="mb-5 rounded-2xl border border-line bg-white p-4 md:p-5">
        <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-canvas p-1 [scrollbar-width:none]">
          {presets.map((p) => {
            const active = from === p.from && to === p.to;
            return (
              <Link
                key={p.label}
                href={`/admin/sales?from=${p.from}&to=${p.to}`}
                aria-current={active ? 'true' : undefined}
                className={`h-9 shrink-0 rounded-full px-4 text-[14px] font-medium leading-9 transition-colors ${active ? 'bg-white text-ink shadow-[0_1px_2px_rgb(14_26_43/0.08),0_0_0_1px_rgb(14_26_43/0.06)]' : 'text-ink-2 hover:text-ink'}`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        <form className="mt-3 grid grid-cols-2 gap-2 md:flex md:items-end" method="get">
          <label className="md:w-44">
            <span className="field-label">시작(이용일)</span>
            <DatePicker name="from" defaultValue={from} />
          </label>
          <label className="md:w-44">
            <span className="field-label">끝(이용일)</span>
            <DatePicker name="to" defaultValue={to} />
          </label>
          <button className={buttonClass('tint', 'cs', 'col-span-2')}>조회</button>
        </form>
        {tooLong && <p className="mt-2 text-[13px] text-[#b42d18]">기간은 400일까지입니다. 이번 달로 보여 드립니다.</p>}
      </div>

      {/* 합계 */}
      <StatStrip
        items={[
          {
            label: '매출',
            value: s.total.amount.toLocaleString('ko-KR'),
            unit: '원',
            note: s.kept.amount ? `토스 결제 기준 · 취소 후 남은 금액 ${s.kept.amount.toLocaleString('ko-KR')}원 포함` : '토스 결제 기준',
          },
          { label: '예약', value: `${s.total.count}`, unit: '건', note: '확정·입실·퇴실' },
          {
            label: '점유율',
            value: pct(sold, cap),
            note: `${sold} / ${cap} 유닛·일`,
          },
          {
            label: '취소율',
            value: pct(s.cancel.cancelled, s.cancel.base),
            note: `${s.cancel.cancelled} / ${s.cancel.base}건 (결제 후 취소·환불)`,
          },
        ]}
      />

      {/* 상품별 */}
      <section className="panel mt-5">
        <h2 className="panel-title">상품별</h2>
        <ul className="mt-4 space-y-4">
          {s.byType.map((t) => (
            <li key={t.type}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
                <span className="font-medium">{t.name}</span>
                <span className="tabular-nums text-ink-2">
                  {t.count}건 · <b className="font-semibold text-ink">{formatWon(t.amount)}</b> · 점유 {pct(t.sold, t.capacity)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ice-100">
                <div className="h-full rounded-full bg-gradient-to-r from-ice-400 to-ice-600" style={{ width: `${t.capacity ? Math.min(100, (t.sold / t.capacity) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 일별 */}
      <section className="panel mt-5">
        <h2 className="panel-title">일별 매출 (최근 이용일부터)</h2>
        {s.byDate.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-ink-3">이 기간 매출이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {s.byDate.map((d) => (
              <li key={d.date} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={`/admin/board?date=${d.date}`} className="text-[14px] font-medium hover:text-glacier">
                  {formatDateKorean(d.date)}
                </Link>
                <p className="text-[14px] tabular-nums">
                  <span className="text-ink-2">{d.count}건</span> · <b className="font-semibold">{formatWon(d.amount)}</b>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-3 px-1 text-[12px] leading-relaxed text-ink-3">
        점유율은 현재 운영 중인 유닛 수 기준(휴무일·점검 유닛 제외)입니다. 1일 전 취소로 50% 환불된 예약은 남은 금액도 매출에서 빠집니다.
      </p>
    </>
  );
}
