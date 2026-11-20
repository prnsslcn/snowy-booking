import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminTitle } from '@/components/admin/AdminShell';
import { EphemeralRange } from '@/components/admin/EphemeralRange';
import { buttonClass } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/Field';
import { PAY_METHOD_LABEL } from '@/lib/admin/labels';
import { getSales, salesRanges } from '@/lib/admin/sales';
import { formatDateKorean, formatWon } from '@/lib/format';

export const metadata: Metadata = { title: '매출' };
export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—');

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
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
  const input = fieldClass('light', 'tabular-nums', 'sm');

  return (
    <>
      <EphemeralRange deps={`${from}|${to}`} />
      <AdminTitle
        title="매출"
        sub={`이용일 기준 ${from} ~ ${to} · 확정·입실·퇴실만(무상·취소·환불 제외)`}
        aside={
          <a href={`/api/admin/report?from=${from}&to=${to}`} className={buttonClass('primary', 'sm')}>
            월말보고 엑셀 받기
          </a>
        }
      />

      {/* 기간 */}
      <div className="mb-5 rounded-3xl bg-white p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = from === p.from && to === p.to;
            return (
              <Link
                key={p.label}
                href={`/admin/sales?from=${p.from}&to=${p.to}`}
                className={`h-10 rounded-full px-4 text-[14px] font-medium leading-10 ${active ? 'bg-glacier text-white' : 'border border-ice-700/15 text-ink/70 hover:text-ink'}`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        <form className="mt-3 grid grid-cols-2 gap-2 md:flex md:items-end" method="get">
          <label className="md:w-44">
            <span className="mb-1.5 block text-[12px] font-medium text-ink/55">시작(이용일)</span>
            <input type="date" name="from" defaultValue={from} className={input} />
          </label>
          <label className="md:w-44">
            <span className="mb-1.5 block text-[12px] font-medium text-ink/55">끝(이용일)</span>
            <input type="date" name="to" defaultValue={to} className={input} />
          </label>
          <button className={buttonClass('secondary', 'sm', 'col-span-2')}>조회</button>
        </form>
        {tooLong && <p className="mt-2 text-[13px] text-[#b42d18]">기간은 400일까지입니다. 이번 달로 보여 드립니다.</p>}
      </div>

      {/* 합계 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="col-span-2 rounded-3xl bg-glacier p-5 text-white md:col-span-1 md:p-6">
          <p className="text-[13px] font-medium text-ice-200">총 매출</p>
          <p className="mt-2 font-display text-[28px] font-bold tabular-nums tracking-[-0.02em]">{formatWon(s.total.amount)}</p>
          <p className="mt-1 text-[12px] text-ice-200/80">{s.total.count}건</p>
        </div>
        <div className="rounded-3xl bg-white p-5 md:p-6">
          <p className="text-[13px] font-medium text-ice-600">온라인(토스)</p>
          <p className="mt-2 font-display text-[22px] font-bold tabular-nums md:text-[24px]">{formatWon(s.online.amount)}</p>
          <p className="mt-1 text-[12px] text-ink/50">{s.online.count}건</p>
        </div>
        <div className="rounded-3xl bg-white p-5 md:p-6">
          <p className="text-[13px] font-medium text-ice-600">유선</p>
          <p className="mt-2 font-display text-[22px] font-bold tabular-nums md:text-[24px]">{formatWon(s.offline.amount)}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink/50">
            {s.offline.count}건
            {Object.entries(s.offline.byMethod).map(([m, v]) => ` · ${PAY_METHOD_LABEL[m] ?? m} ${formatWon(v.amount)}`)}
          </p>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-3 rounded-3xl bg-white p-5 md:col-span-1 md:block md:p-6">
          <div>
            <p className="text-[13px] font-medium text-ice-600">점유율</p>
            <p className="mt-2 font-display text-[22px] font-bold tabular-nums">{pct(sold, cap)}</p>
            <p className="mt-1 text-[12px] text-ink/50">
              {sold} / {cap} 유닛·일
            </p>
          </div>
          <div className="md:mt-4">
            <p className="text-[13px] font-medium text-ice-600">취소율(온라인)</p>
            <p className="mt-2 font-display text-[22px] font-bold tabular-nums">{pct(s.cancel.cancelled, s.cancel.base)}</p>
            <p className="mt-1 text-[12px] text-ink/50">
              {s.cancel.cancelled} / {s.cancel.base}건
            </p>
          </div>
        </div>
      </div>

      {/* 상품별 */}
      <section className="mt-5 rounded-3xl bg-white p-5 md:p-6">
        <h2 className="text-[15px] font-bold">상품별</h2>
        <ul className="mt-4 space-y-4">
          {s.byType.map((t) => (
            <li key={t.type}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
                <span className="font-semibold">{t.name}</span>
                <span className="tabular-nums text-ink/60">
                  {t.count}건 · <b className="font-semibold text-ink">{formatWon(t.amount)}</b> · 점유 {pct(t.sold, t.capacity)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ice-100">
                <div className="h-full rounded-full bg-gradient-to-r from-ice-400 to-ice-600" style={{ width: `${t.capacity ? Math.min(100, (t.sold / t.capacity) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
        {s.compCount > 0 && <p className="mt-4 text-[12px] text-ink/50">무상 예약 {s.compCount}건은 매출에서 빼고 점유율에는 넣었습니다.</p>}
      </section>

      {/* 일별 */}
      <section className="mt-5 rounded-3xl bg-white p-5 md:p-6">
        <h2 className="text-[15px] font-bold">일별 매출 (최근 이용일부터)</h2>
        {s.byDate.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-ink/45">이 기간 매출이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ice-700/[.07]">
            {s.byDate.map((d) => (
              <li key={d.date} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={`/admin/board?date=${d.date}`} className="text-[14px] font-medium hover:text-glacier">
                  {formatDateKorean(d.date)}
                </Link>
                <div className="text-right">
                  <p className="text-[14px] tabular-nums">
                    {d.count}건 · <b className="font-semibold">{formatWon(d.amount)}</b>
                  </p>
                  <p className="text-[12px] tabular-nums text-ink/50">
                    온라인 {d.onlineCount}건 {formatWon(d.onlineAmount)} · 유선 {d.offlineCount}건 {formatWon(d.offlineAmount)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-3 px-1 text-[12px] leading-relaxed text-ink/45">
        점유율은 현재 운영 중인 유닛 수 기준(휴무일·점검 유닛 제외)입니다. 1일 전 취소로 50% 환불된 예약은 남은 금액도 매출에서 빠집니다.
      </p>
    </>
  );
}
