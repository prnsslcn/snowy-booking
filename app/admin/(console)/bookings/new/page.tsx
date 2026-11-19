import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminTitle } from '@/components/admin/AdminShell';
import { OfflineBookingForm } from '@/components/admin/OfflineBookingForm';
import { kstToday } from '@/lib/policy/booking-window';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: '유선·무상 예약 등록' };
export const dynamic = 'force-dynamic';

export default async function NewOfflineBookingPage({ searchParams }: { searchParams: Promise<{ date?: string; type?: string }> }) {
  const sp = await searchParams;
  const today = kstToday();
  const { data } = await createAdminClient().from('product_types').select('type, name, max_capacity').eq('is_active', true).order('sort');
  const products = (data ?? []).map((p) => ({ type: p.type, name: p.name, maxCapacity: p.max_capacity }));
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date >= today ? sp.date : today;

  return (
    <>
      <Link href="/admin/bookings" className="mb-3 inline-flex items-center gap-1 text-[14px] font-medium text-ink/55 hover:text-ink">
        ‹ 예약 목록
      </Link>
      <AdminTitle title="유선·무상 예약 등록" sub="즉시 확정되고 빈 유닛이 자동 배정됩니다. 문자는 보내지 않습니다." />
      <OfflineBookingForm products={products} initialDate={date} initialType={sp.type} today={today} />
    </>
  );
}
