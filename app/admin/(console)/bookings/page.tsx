import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminTitle } from '@/components/admin/AdminShell';
import { BookingRows } from '@/components/admin/BookingRows';
import { buttonClass } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/Field';
import { requireAdmin } from '@/lib/admin/auth';
import { listBookings, PAGE_SIZE, STATUS_FILTERS, type ListFilters, type StatusFilter } from '@/lib/admin/bookings';
import { kstToday } from '@/lib/policy/booking-window';
import { DatePicker } from '@/components/ui/DatePicker';

export const metadata: Metadata = { title: '예약 관리' };
export const dynamic = 'force-dynamic';

type SP = { q?: string; status?: string; from?: string; to?: string; page?: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin(); // 레이아웃 확인은 화면 이동(RSC) 요청에서 건너뛰어질 수 있어 화면마다 다시 확인
  const sp = await searchParams;
  const filters: ListFilters = {
    q: sp.q?.slice(0, 40),
    status: sp.status && sp.status in STATUS_FILTERS ? (sp.status as StatusFilter) : 'valid',
    from: sp.from && DATE_RE.test(sp.from) ? sp.from : undefined,
    to: sp.to && DATE_RE.test(sp.to) ? sp.to : undefined,
    page: Number(sp.page) || 1,
  };
  const { items, total } = await listBookings(filters);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page ?? 1, pages);

  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== 'page') u.set(k, v);
    u.set('page', String(p));
    return `?${u.toString()}`;
  };

  const select = fieldClass('light', 'appearance-none pr-8', 'cs');
  const input = fieldClass('light', '', 'cs');

  return (
    <>
      <AdminTitle
        title="예약 관리"
        sub={filters.q ? `'${filters.q}' 검색 결과 ${total}건` : `이용일 ${filters.from ?? kstToday()}부터 · ${total}건`}
      />

      {/* 필터 — GET 폼(주소에 남아 새로고침·공유해도 그대로) */}
      <form className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-4 md:grid-cols-[1.6fr_1fr_0.9fr_0.9fr_auto] md:items-end md:gap-3 md:p-5">
        <label className="col-span-2 md:col-span-1">
          <span className="field-label">검색</span>
          <input name="q" defaultValue={filters.q} placeholder="이름 · 휴대폰 · 예약번호 · 주문번호" className={input} />
        </label>
        <label>
          <span className="field-label">상태</span>
          <select name="status" defaultValue={filters.status} className={select}>
            {Object.entries(STATUS_FILTERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">이용일 부터</span>
          <DatePicker name="from" defaultValue={filters.from ?? kstToday()} clearable />
        </label>
        <label>
          <span className="field-label">까지</span>
          <DatePicker name="to" defaultValue={filters.to ?? ''} clearable />
        </label>
        <div className="col-span-2 flex gap-2 md:col-span-1">
          <button type="submit" className={buttonClass('primary', 'cs', 'flex-1 md:flex-none')}>
            조회
          </button>
          <Link href="/admin/bookings" className={buttonClass('tint', 'cs')}>
            초기화
          </Link>
        </div>
      </form>
      <p className="-mt-2 mb-4 px-1 text-[12px] text-ink-3">검색어가 있으면 이용일과 관계없이 전체에서 찾습니다.</p>

      <section className="rounded-2xl border border-line bg-white p-3 md:p-5">
        {items.length ? <BookingRows items={items} /> : <p className="py-12 text-center text-[14px] text-ink-3">조건에 맞는 예약이 없습니다.</p>}
      </section>

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-2 text-[14px]">
          {page > 1 && (
            <Link href={qs(page - 1)} className={buttonClass('tint', 'cs')}>
              이전
            </Link>
          )}
          <span className="px-2 tabular-nums text-ink-2">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link href={qs(page + 1)} className={buttonClass('tint', 'cs')}>
              다음
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
