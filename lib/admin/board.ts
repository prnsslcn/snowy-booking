import 'server-only';

import { ACTIVE_STATUSES } from '@/lib/admin/labels';
import { createAdminClient } from '@/lib/supabase/admin';

/*
  현장 배정 보드 — 날짜 하나의 상품별 유닛 칸.
  칸 = 활성 유닛 1개 + (그 날짜 활성 예약 | 점검 | 빈칸). 결제 대기(pending_payment)도 자리를 잡고 있으므로 표시.
*/

export interface BoardBooking {
  id: string;
  guestName: string;
  guestPhone: string | null;
  guestCount: number | null;
  source: string;
  status: string;
  lookupCode: string | null;
  note: string | null;
}

export interface BoardCell {
  unitId: string;
  label: string;
  booking: BoardBooking | null;
  blackout: string | null;
}

export interface BoardGroup {
  type: string;
  name: string;
  cells: BoardCell[];
  counts: { booked: number; checkedIn: number; empty: number; blackout: number };
}

export async function getBoard(date: string): Promise<BoardGroup[]> {
  const supabase = createAdminClient();
  const [types, units, bookings, blackouts] = await Promise.all([
    // 특수(S1·S2)는 온라인 판매 안 함(is_active=false)이지만 현장에서는 보여야 한다
    supabase.from('product_types').select('type, name, sort').or('is_active.eq.true,type.eq.special').order('sort'),
    supabase.from('units').select('id, type, label, sort').eq('is_active', true).order('sort'),
    supabase
      .from('bookings')
      .select('id, unit_id, guest_name, guest_phone, guest_count, source, status, lookup_code, note, expires_at')
      .eq('date', date)
      .in('status', [...ACTIVE_STATUSES]),
    supabase.from('unit_blackouts').select('unit_id, reason').lte('from_date', date).gte('to_date', date),
  ]);

  const now = Date.now();
  const byUnit = new Map<string, BoardBooking>();
  for (const b of bookings.data ?? []) {
    // 결제 시간이 지난 결제 대기는 곧 회수되므로 빈칸으로 본다
    if (b.status === 'pending_payment' && b.expires_at && new Date(b.expires_at).getTime() <= now) continue;
    byUnit.set(b.unit_id, {
      id: b.id,
      guestName: b.guest_name,
      guestPhone: b.guest_phone,
      guestCount: b.guest_count,
      source: b.source,
      status: b.status,
      lookupCode: b.lookup_code,
      note: b.note,
    });
  }
  const blackoutBy = new Map((blackouts.data ?? []).map((x) => [x.unit_id, x.reason ?? '점검']));

  return (types.data ?? []).map((t) => {
    const cells = (units.data ?? [])
      .filter((u) => u.type === t.type)
      .map((u) => ({ unitId: u.id, label: u.label, booking: byUnit.get(u.id) ?? null, blackout: blackoutBy.get(u.id) ?? null }));
    return {
      type: t.type,
      name: t.name,
      cells,
      counts: {
        booked: cells.filter((c) => c.booking).length,
        checkedIn: cells.filter((c) => c.booking && (c.booking.status === 'checked_in' || c.booking.status === 'checked_out')).length,
        empty: cells.filter((c) => !c.booking && !c.blackout).length,
        blackout: cells.filter((c) => !c.booking && c.blackout).length,
      },
    };
  });
}

/** 예약 상세의 '유닛 옮기기' 선택지 — 같은 상품·같은 날짜의 다른 유닛과 그 상태 */
export async function moveTargets(bookingId: string): Promise<{ unitId: string; label: string; bookingId: string | null; guestName: string | null; blackout: boolean }[]> {
  const supabase = createAdminClient();
  const { data: b } = await supabase.from('bookings').select('type, date, unit_id').eq('id', bookingId).maybeSingle();
  if (!b) return [];
  const groups = await getBoard(b.date);
  const g = groups.find((x) => x.type === b.type);
  return (g?.cells ?? [])
    .filter((c) => c.unitId !== b.unit_id)
    .map((c) => ({ unitId: c.unitId, label: c.label, bookingId: c.booking?.id ?? null, guestName: c.booking?.guestName ?? null, blackout: !c.booking && !!c.blackout }));
}
