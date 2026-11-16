import { NextResponse } from 'next/server';

import { clientIp, lookupBooking } from '@/lib/booking/lookup';
import { readJson, str } from '@/lib/http';

/**
 * 예약 조회 — 휴대폰번호 + 4자리 예약번호. POST(번호를 URL·접근로그에 남기지 않음).
 * 불일치·미존재는 동일 404, 시도 초과는 429.
 */
export async function POST(request: Request) {
  const body = await readJson<{ phone: unknown; code: unknown }>(request);
  if (!body) return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });

  const out = await lookupBooking({
    phone: str(body.phone),
    code: str(body.code),
    ip: clientIp(request.headers),
  });
  if (out.ok) return NextResponse.json(out.booking);

  const status = out.error === 'TOO_MANY_ATTEMPTS' ? 429 : out.error === 'NOT_FOUND' ? 404 : 400;
  return NextResponse.json({ error: out.error }, { status });
}
