import 'server-only';

import { requireAdmin } from '@/lib/admin/auth';
import { ACTIVE_STATUSES, REVENUE_STATUSES, seatLabel } from '@/lib/admin/labels';
import { kstToday } from '@/lib/policy/booking-window';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/*
  관리자 조회 — 서비스 롤(관리자 확인은 호출하는 화면/액션이 requireAdmin 으로 먼저).
*/

const LIST_COLUMNS =
  'id, order_id, lookup_code, source, type, date, guest_name, guest_phone, guest_count, amount, status, refund_method, refund_amount, cancel_error, created_at, units(label), product_types(name)';

export interface BookingListItem {
  id: string;
  orderId: string;
  lookupCode: string | null;
  source: string;
  type: string;
  typeName: string;
  unitLabel: string | null;
  date: string;
  guestName: string;
  guestPhone: string | null;
  guestCount: number | null;
  amount: number;
  status: string;
  refundMethod: string | null;
  refundAmount: number | null;
  cancelError: Json | null;
  createdAt: string;
}

type Row = {
  id: string;
  order_id: string;
  lookup_code: string | null;
  source: string;
  type: string;
  date: string;
  guest_name: string;
  guest_phone: string | null;
  guest_count: number | null;
  amount: number;
  status: string;
  refund_method: string | null;
  refund_amount: number | null;
  cancel_error: Json | null;
  created_at: string;
  units: { label: string } | null;
  product_types: { name: string } | null;
};

function toItem(r: Row): BookingListItem {
  return {
    id: r.id,
    orderId: r.order_id,
    lookupCode: r.lookup_code,
    source: r.source,
    type: r.type,
    typeName: r.product_types?.name ?? r.type,
    unitLabel: seatLabel({ status: r.status, type: r.type, label: r.units?.label }),
    date: r.date,
    guestName: r.guest_name,
    guestPhone: r.guest_phone,
    guestCount: r.guest_count,
    amount: r.amount,
    status: r.status,
    refundMethod: r.refund_method,
    refundAmount: r.refund_amount,
    cancelError: r.cancel_error,
    createdAt: r.created_at,
  };
}

/** 상태 필터 묶음 */
export const STATUS_FILTERS = {
  valid: { label: '전체(유효)', statuses: ['confirmed', 'checked_in', 'checked_out', 'cancel_requested', 'refunded'] },
  active: { label: '확정·입실', statuses: ['confirmed', 'checked_in', 'checked_out'] },
  cancel_requested: { label: '환불 처리 중', statuses: ['cancel_requested'] },
  refunded: { label: '환불 완료', statuses: ['refunded'] },
  cancelled: { label: '취소·만료', statuses: ['cancelled'] },
  pending_payment: { label: '결제 대기', statuses: ['pending_payment'] },
} as const;
export type StatusFilter = keyof typeof STATUS_FILTERS;

export interface ListFilters {
  q?: string;
  status?: StatusFilter;
  /** 이용일 범위(YYYY-MM-DD). from 미지정 시 오늘부터 */
  from?: string;
  to?: string;
  page?: number;
}

export const PAGE_SIZE = 50;

export async function listBookings(f: ListFilters): Promise<{ items: BookingListItem[]; total: number }> {
  await requireAdmin();
  const supabase = createAdminClient();
  const statuses = STATUS_FILTERS[f.status ?? 'valid'].statuses;
  let query = supabase
    .from('bookings')
    .select(LIST_COLUMNS, { count: 'exact' })
    .in('status', [...statuses]);

  const q = (f.q ?? '').trim();
  if (q) {
    // 검색: 휴대폰·예약번호(숫자) / 주문번호(SNW-) / 이름 — 날짜 범위와 무관하게 전체에서
    const digits = q.replace(/\D/g, '');
    if (/^SNW-/i.test(q)) query = query.ilike('order_id', `${q}%`);
    else if (digits.length === 4 && digits === q) query = query.or(`lookup_code.eq.${digits},guest_phone.like.%${digits}%`);
    else if (digits.length >= 3 && digits.length === q.replace(/[\s-]/g, '').length) query = query.like('guest_phone', `%${digits}%`);
    else query = query.ilike('guest_name', `%${q.replace(/[%_,()]/g, '')}%`);
  } else {
    query = query.gte('date', f.from || kstToday());
    if (f.to) query = query.lte('date', f.to);
  }

  const page = Math.max(1, f.page ?? 1);
  const { data, count, error } = await query
    .order('date', { ascending: !q })
    .order('created_at', { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { items: ((data ?? []) as unknown as Row[]).map(toItem), total: count ?? 0 };
}

/** 한 이용일의 예약(유효 상태 — 확정·입실·퇴실·환불 처리 중·환불 완료). 상품 순서 → 예약 순 */
export async function listBookingsOnDate(date: string): Promise<BookingListItem[]> {
  await requireAdmin();
  const { data, error } = await createAdminClient()
    .from('bookings')
    .select(LIST_COLUMNS)
    .eq('date', date)
    .in('status', [...STATUS_FILTERS.valid.statuses])
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const items = ((data ?? []) as unknown as (Row & { product_types: { name: string; sort?: number } | null })[]).map(toItem);
  const order = ['cabana', 'caravan', 'caravan_group'];
  const rank = (t: string) => (order.indexOf(t) < 0 ? 99 : order.indexOf(t));
  return items.sort((a, b) => rank(a.type) - rank(b.type));
}

export interface BookingDetail extends BookingListItem {
  priceSnapshot: Json;
  note: string | null;

  refundedAt: string | null;
  manualRefundNote: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
  payments: {
    status: string;
    method: string | null;
    amount: number;
    approvedAt: string | null;
    cancelledAt: string | null;
    paymentKey: string | null;
  }[];
  actions: { action: string; detail: Json; createdAt: string }[];
  notifications: { type: string; status: string; recipient: string; sentAt: string | null; createdAt: string }[];
}

export async function getBooking(id: string): Promise<BookingDetail | null> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('bookings')
    .select(
      `${LIST_COLUMNS}, price_snapshot, note, refunded_at, manual_refund_note, checked_in_at, checked_out_at, expires_at, updated_at`,
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as Row & {
    price_snapshot: Json;
    note: string | null;
    refunded_at: string | null;
    manual_refund_note: string | null;
    checked_in_at: string | null;
    checked_out_at: string | null;
    expires_at: string | null;
    updated_at: string;
  };

  const [{ data: pays }, { data: acts }, { data: notis }] = await Promise.all([
    supabase.from('payments').select('*').eq('booking_id', id).order('created_at'),
    supabase.from('admin_actions').select('action, detail, created_at').eq('booking_id', id).order('created_at', { ascending: false }),
    supabase.from('notifications').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
  ]);

  type Pay = { status: string; method: string | null; amount: number; approved_at: string | null; cancelled_at: string | null; toss_payment_key: string | null };
  type Noti = { type: string; status: string; recipient: string; sent_at: string | null; created_at: string };

  return {
    ...toItem(r),
    priceSnapshot: r.price_snapshot,
    note: r.note,
    refundedAt: r.refunded_at,
    manualRefundNote: r.manual_refund_note,
    checkedInAt: r.checked_in_at,
    checkedOutAt: r.checked_out_at,
    expiresAt: r.expires_at,
    updatedAt: r.updated_at,
    payments: ((pays ?? []) as unknown as Pay[]).map((p) => ({
      status: p.status,
      method: p.method,
      amount: p.amount,
      approvedAt: p.approved_at,
      cancelledAt: p.cancelled_at,
      paymentKey: p.toss_payment_key,
    })),
    actions: (acts ?? []).map((a) => ({ action: a.action, detail: a.detail, createdAt: a.created_at })),
    notifications: ((notis ?? []) as unknown as Noti[]).map((n) => ({
      type: n.type,
      status: n.status,
      recipient: n.recipient,
      sentAt: n.sent_at,
      createdAt: n.created_at,
    })),
  };
}

export interface DashboardData {
  today: string;
  occupancy: { type: string; name: string; total: number; sold: number; dayStatus: string }[];
  todayBookings: BookingListItem[];
  stuckRefunds: BookingListItem[];
  monthRevenue: number;
  monthCount: number;
  upcoming7: number;
}

export async function getDashboard(): Promise<DashboardData> {
  await requireAdmin();
  const supabase = createAdminClient();
  const today = kstToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const d = new Date(`${today}T00:00:00Z`);
  const monthEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const in7 = new Date(d.getTime() + 6 * 86400000).toISOString().slice(0, 10);

  const [avail, types, todays, stuck, month, upcoming] = await Promise.all([
    supabase.rpc('availability', { p_from: today, p_to: today }),
    supabase.from('product_types').select('type, name, sort').eq('is_active', true).order('sort'),
    supabase
      .from('bookings')
      .select(LIST_COLUMNS)
      .eq('date', today)
      .in('status', ACTIVE_STATUSES.filter((s) => s !== 'pending_payment'))
      .order('type')
      .order('created_at'),
    supabase.from('bookings').select(LIST_COLUMNS).eq('status', 'cancel_requested').order('date'),
    // 매출 화면(lib/admin/sales.ts)과 같은 기준: 온라인(토스)만
    supabase.from('bookings').select('amount, status, refund_amount').eq('source', 'online').gte('date', monthStart).lte('date', monthEnd).in('status', [...REVENUE_STATUSES, 'refunded']),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('date', today)
      .lte('date', in7)
      .in('status', [...REVENUE_STATUSES]),
  ]);

  const names = new Map((types.data ?? []).map((t) => [t.type, t.name]));
  type A = { type: string; total_units: number; remaining: number; day_status: string };
  const occupancy = ((avail.data ?? []) as unknown as A[]).map((a) => ({
    type: a.type,
    name: names.get(a.type) ?? a.type,
    total: a.total_units,
    sold: Math.max(0, a.total_units - a.remaining),
    dayStatus: a.day_status,
  }));

  // 매출 화면과 같은 기준: 확정·입실·퇴실 금액 + 취소 건의 남은 금액(건수는 확정·입실·퇴실만)
  const monthAll = (month.data ?? []) as { amount: number; status: string; refund_amount: number | null }[];
  const monthRows = monthAll
    .map((r) => ({ amount: r.status === 'refunded' ? r.amount - (r.refund_amount ?? r.amount) : r.amount, kept: r.status === 'refunded' }))
    .filter((r) => !r.kept || r.amount > 0);
  return {
    today,
    occupancy,
    todayBookings: ((todays.data ?? []) as unknown as Row[]).map(toItem),
    stuckRefunds: ((stuck.data ?? []) as unknown as Row[]).map(toItem),
    monthRevenue: monthRows.reduce((s, r) => s + r.amount, 0),
    monthCount: monthRows.filter((r) => !r.kept).length,
    upcoming7: upcoming.count ?? 0,
  };
}
