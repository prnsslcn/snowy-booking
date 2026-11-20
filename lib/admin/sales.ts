import 'server-only';

import { REVENUE_STATUSES } from '@/lib/admin/labels';
import { kstToday } from '@/lib/policy/booking-window';
import { createAdminClient } from '@/lib/supabase/admin';

/*
  매출·월말보고 — 이용일(KST) 기준(CLAUDE.md §8 확정).
  매출 = 확정·입실·퇴실(REVENUE_STATUSES) 예약 금액. 무상(0원)·취소·환불·결제대기는 제외(실입금 기준).
  ※ 부분 환불(1일 전 50%)된 예약은 상태가 '환불 완료'라 남긴 금액도 매출에서 빠진다(CLAUDE.md §9 인지 사항).
*/

const pad = (n: number) => String(n).padStart(2, '0');

/** 기간 프리셋(KST 오늘 기준). 기본 = 이번 달 1일~말일 */
export function salesRanges(now: Date = new Date()) {
  const today = kstToday(now);
  const [y, m, d] = today.split('-').map(Number);
  const monthEnd = (yy: number, mm: number) => `${yy}-${pad(mm)}-${pad(new Date(Date.UTC(yy, mm, 0)).getUTCDate())}`;
  const lm = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const t = new Date(Date.UTC(y, m - 1, d - 6));
  return {
    today,
    thisMonth: { from: `${y}-${pad(m)}-01`, to: monthEnd(y, m) },
    lastMonth: { from: `${lm.y}-${pad(lm.m)}-01`, to: monthEnd(lm.y, lm.m) },
    last7: { from: t.toISOString().slice(0, 10), to: today },
  };
}

export interface SalesRow {
  id: string;
  date: string;
  type: string;
  typeName: string;
  unitLabel: string;
  source: 'online' | 'offline';
  orderId: string;
  lookupCode: string | null;
  guestName: string;
  guestPhone: string | null;
  guestCount: number | null;
  amount: number;
  /** 온라인: 결제수단(카드 등) / 유선: cash·card·transfer */
  method: string | null;
  paidAt: string | null;
  /** 유선 현장 조정·메모 요약 */
  memo: string;
}

export interface SalesData {
  from: string;
  to: string;
  rows: SalesRow[];
  online: { count: number; amount: number };
  offline: { count: number; amount: number; byMethod: Record<string, { count: number; amount: number }> };
  total: { count: number; amount: number };
  compCount: number;
  cancel: { cancelled: number; base: number };
  byType: { type: string; name: string; count: number; amount: number; sold: number; capacity: number }[];
  byDate: { date: string; onlineCount: number; onlineAmount: number; offlineCount: number; offlineAmount: number; count: number; amount: number }[];
}

type Extra = { label: string; amount: number };

export async function getSales(from: string, to: string): Promise<SalesData> {
  const supabase = createAdminClient();
  const [main, comp, online, types, units, blackouts, closed] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, date, type, source, order_id, lookup_code, guest_name, guest_phone, guest_count, amount, offline_payment_method, note, price_snapshot, units(label), product_types(name), payments(status, method, approved_at)')
      .in('source', ['online', 'offline'])
      .in('status', [...REVENUE_STATUSES])
      .gte('date', from)
      .lte('date', to),
    supabase.from('bookings').select('type', { count: 'exact' }).eq('source', 'comp').in('status', [...REVENUE_STATUSES]).gte('date', from).lte('date', to),
    // 취소율: 결제까지 끝난 온라인 예약 중 취소·환불된 비율
    supabase.from('bookings').select('status').eq('source', 'online').in('status', [...REVENUE_STATUSES, 'cancel_requested', 'refunded']).gte('date', from).lte('date', to),
    supabase.from('product_types').select('type, name, sort').order('sort'),
    supabase.from('units').select('id, type').eq('is_active', true),
    supabase.from('unit_blackouts').select('unit_id, from_date, to_date').lte('from_date', to).gte('to_date', from),
    supabase.from('closed_dates').select('date').gte('date', from).lte('date', to),
  ]);

  type R = {
    id: string;
    date: string;
    type: string;
    source: 'online' | 'offline';
    order_id: string;
    lookup_code: string | null;
    guest_name: string;
    guest_phone: string | null;
    guest_count: number | null;
    amount: number;
    offline_payment_method: string | null;
    note: string | null;
    price_snapshot: { extras?: Extra[] } | null;
    units: { label: string } | null;
    product_types: { name: string } | null;
    payments: { status: string; method: string | null; approved_at: string | null }[] | null;
  };

  const rows: SalesRow[] = ((main.data ?? []) as unknown as R[])
    .map((r) => {
      const paid = (r.payments ?? []).find((p) => p.status === 'paid') ?? null;
      const extras = (r.price_snapshot?.extras ?? []).map((e) => `${e.label}(${e.amount >= 0 ? '+' : ''}${e.amount.toLocaleString('ko-KR')})`).join(', ');
      return {
        id: r.id,
        date: r.date,
        type: r.type,
        typeName: r.product_types?.name ?? r.type,
        unitLabel: r.units?.label ?? '',
        source: r.source,
        orderId: r.order_id,
        lookupCode: r.lookup_code,
        guestName: r.guest_name,
        guestPhone: r.guest_phone,
        guestCount: r.guest_count,
        amount: r.amount,
        method: r.source === 'online' ? (paid?.method ?? null) : r.offline_payment_method,
        paidAt: paid?.approved_at ?? null,
        memo: [extras, r.note].filter(Boolean).join(' · '),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.typeName.localeCompare(b.typeName) || a.unitLabel.localeCompare(b.unitLabel, 'ko', { numeric: true }));

  const onlineSum = { count: 0, amount: 0 };
  const offlineSum = { count: 0, amount: 0, byMethod: {} as Record<string, { count: number; amount: number }> };
  const dateMap = new Map<string, SalesData['byDate'][number]>();
  const typeSum = new Map<string, { count: number; amount: number }>();
  for (const r of rows) {
    if (r.source === 'online') {
      onlineSum.count += 1;
      onlineSum.amount += r.amount;
    } else {
      offlineSum.count += 1;
      offlineSum.amount += r.amount;
      const k = r.method ?? 'etc';
      const m = (offlineSum.byMethod[k] ??= { count: 0, amount: 0 });
      m.count += 1;
      m.amount += r.amount;
    }
    const e = dateMap.get(r.date) ?? { date: r.date, onlineCount: 0, onlineAmount: 0, offlineCount: 0, offlineAmount: 0, count: 0, amount: 0 };
    if (r.source === 'online') {
      e.onlineCount += 1;
      e.onlineAmount += r.amount;
    } else {
      e.offlineCount += 1;
      e.offlineAmount += r.amount;
    }
    e.count += 1;
    e.amount += r.amount;
    dateMap.set(r.date, e);
    const t = typeSum.get(r.type) ?? { count: 0, amount: 0 };
    t.count += 1;
    t.amount += r.amount;
    typeSum.set(r.type, t);
  }

  // 점유율 = 판매(유료+무상) ÷ 운영 가능 유닛·일(휴무일 제외, 점검 유닛 제외). 유닛 수는 현재 운영 기준.
  const closedSet = new Set((closed.data ?? []).map((c) => c.date));
  const days: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (!closedSet.has(iso)) days.push(iso);
  }
  const unitType = new Map((units.data ?? []).map((u) => [u.id, u.type]));
  const compByType = new Map<string, number>();
  for (const c of comp.data ?? []) compByType.set(c.type, (compByType.get(c.type) ?? 0) + 1);

  const byType = (types.data ?? []).map((t) => {
    const unitCount = (units.data ?? []).filter((u) => u.type === t.type).length;
    let blackedDays = 0;
    for (const b of blackouts.data ?? []) {
      if (unitType.get(b.unit_id) !== t.type) continue;
      blackedDays += days.filter((d) => b.from_date <= d && d <= b.to_date).length;
    }
    const s = typeSum.get(t.type) ?? { count: 0, amount: 0 };
    return {
      type: t.type,
      name: t.name,
      count: s.count,
      amount: s.amount,
      sold: s.count + (compByType.get(t.type) ?? 0),
      capacity: Math.max(0, unitCount * days.length - blackedDays),
    };
  });

  const onlineRows = (online.data ?? []) as { status: string }[];
  return {
    from,
    to,
    rows,
    online: onlineSum,
    offline: offlineSum,
    total: { count: onlineSum.count + offlineSum.count, amount: onlineSum.amount + offlineSum.amount },
    compCount: comp.count ?? 0,
    cancel: { cancelled: onlineRows.filter((r) => r.status === 'refunded' || r.status === 'cancel_requested').length, base: onlineRows.length },
    byType,
    byDate: [...dateMap.values()].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
