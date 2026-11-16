import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PageShell } from '@/components/site/PageShell';
import { Button } from '@/components/ui/Button';
import { ONE_PER_DAY_NOTICE, TICKET_NOTICE, USAGE_TIME } from '@/lib/site-config';
import { getSiteSettings } from '@/lib/site-settings';

// 임시 홈 — 시설 사진·소개 문구 수령 후 디자인 교체(CLAUDE.md §7). 예약하기 버튼을 가장 강조.
export const dynamic = 'force-dynamic';

const PRODUCTS = [
  { name: '카바나', capacity: 6, weekday: 70000, weekend: 90000 },
  { name: '카라반', capacity: 8, weekday: 100000, weekend: 120000 },
  { name: '단체카라반', capacity: 14, weekday: 170000, weekend: 210000 },
];

export default async function HomePage() {
  if ((await getSiteSettings()).businessClosed) redirect('/off');

  return (
    <PageShell>
      <section className="py-10 text-center">
        <p className="text-sm text-muted">홍천 비발디파크</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">스노위랜드 카바나·카라반</h1>
        <p className="mt-3 text-muted">당일 이용 {USAGE_TIME} · 전액 선결제 온라인 예약</p>
        <Link href="/booking" className="mt-8 block">
          <Button size="lg">예약하기</Button>
        </Link>
        <Link href="/booking/lookup" className="mt-3 inline-block text-sm text-muted underline">
          예약 조회·취소
        </Link>
      </section>

      <section className="space-y-3">
        {PRODUCTS.map((p) => (
          <div key={p.name} className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5">
            <div>
              <p className="font-bold text-ink">{p.name}</p>
              <p className="text-sm text-subtle">최대 {p.capacity}인</p>
            </div>
            <div className="text-right text-sm text-muted">
              <p>주중 {p.weekday.toLocaleString('ko-KR')}원</p>
              <p>주말 {p.weekend.toLocaleString('ko-KR')}원</p>
            </div>
          </div>
        ))}
        <p className="pt-2 text-xs leading-relaxed text-subtle">
          주말 요금: 금·토·일·공휴일·공휴일 전날, 동계 성수기(12/24~2/9) 매일 적용.
          <br />
          {ONE_PER_DAY_NOTICE} {TICKET_NOTICE}
        </p>
      </section>
    </PageShell>
  );
}
