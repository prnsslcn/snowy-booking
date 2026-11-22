import { NextResponse } from 'next/server';

import { BookingError, bookingHttpStatus } from '@/lib/booking/errors';
import { clientIp } from '@/lib/booking/lookup';
import { reserveBooking } from '@/lib/booking/reserve';
import { createAdminClient } from '@/lib/supabase/admin';
import { ISO_DATE_RE, int, readJson, str } from '@/lib/http';

/**
 * 선점 → pending_payment. 성공 시 orderId·amount(DB 계산) 반환 → 클라이언트가 토스 결제창 호출.
 * 금액은 클라이언트에서 받지 않는다(DB price_for 가 권위).
 */

const RESERVE_WINDOW_SECONDS = 600;
const RESERVE_MAX_PER_IP = 10;

interface Body {
  type: unknown;
  date: unknown;
  guestName: unknown;
  guestPhone: unknown;
  guestCount: unknown;
  agreed: unknown;
}

export async function POST(request: Request) {
  const body = await readJson<Body>(request);
  if (!body) return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });

  const type = str(body.type);
  const date = str(body.date);
  // 이용 인원은 고객 화면에서 받지 않는다(선택 값). 보내면 기존대로 검증.
  const guestCount = body.guestCount == null ? null : int(body.guestCount);
  if (!type || !ISO_DATE_RE.test(date) || (body.guestCount != null && guestCount === null)) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }
  if (body.agreed !== true) {
    return NextResponse.json({ error: 'AGREEMENT_REQUIRED' }, { status: 400 });
  }

  // 선점 시도 제한: 같은 IP 10분에 10번 — 가짜 번호로 재고를 잡아 두는 싹쓸이 방지(0014 rate_hit)
  const ip = clientIp(request.headers);
  if (ip) {
    const { data: allowed } = await createAdminClient().rpc('rate_hit', {
      p_kind: 'reserve',
      p_key: ip,
      p_window_seconds: RESERVE_WINDOW_SECONDS,
      p_max: RESERVE_MAX_PER_IP,
    });
    if (allowed === false) return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 });
  }

  try {
    const result = await reserveBooking({
      type,
      date,
      guestName: str(body.guestName),
      guestPhone: str(body.guestPhone),
      guestCount,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.code }, { status: bookingHttpStatus(error.code) });
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
