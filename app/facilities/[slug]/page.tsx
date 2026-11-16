import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { PageShell } from '@/components/site/PageShell';
import { ButtonLink } from '@/components/ui/Button';
import { facilityBySlug } from '@/lib/content/facilities';
import { formatWon } from '@/lib/format';
import { getProducts } from '@/lib/products';
import { REFUND_SUMMARY, TICKET_NOTICE, USAGE_TIME } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = facilityBySlug(slug);
  return f ? { title: `${f.tagline} · 스노위랜드`, description: f.description } : {};
}

export default async function FacilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = facilityBySlug(slug);
  const product = (await getProducts()).find((p) => p.slug === slug);
  if (!content || !product) notFound();

  // 넓은 화면 그리드: 첫 장이 가로면 한 줄 전체, 나머지 세로 사진 수만큼 열(빈 칸 방지)
  const leadWide = content.photos[0]?.orientation === 'landscape';
  const restCount = content.photos.length - (leadWide ? 1 : 0);
  const cols = restCount <= 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3';
  const spanAll = restCount <= 2 ? 'sm:col-span-2' : 'sm:col-span-3';

  return (
    <PageShell width="full">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
        <div className="enter">
          <p className="text-[14px] font-semibold text-accent">최대 {product.maxCapacity}인 · 당일 {USAGE_TIME}</p>
          <h1 className="mt-2 text-[32px] font-bold sm:text-[44px]">{product.name}</h1>
          <p className="mt-2 text-[17px] text-muted">{content.tagline}</p>
        </div>
      </div>

      {/* 갤러리: 모바일은 가로 스냅 스크롤, 넓은 화면은 그리드 */}
      <div className={`no-scrollbar mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-auto sm:grid sm:max-w-6xl ${cols} sm:overflow-visible sm:px-6`}>
        {content.photos.map((ph, i) => (
          <div
            key={ph.src}
            className={`relative shrink-0 snap-center overflow-hidden rounded-[22px] bg-line-soft ${
              i === 0 && ph.orientation === 'landscape' ? `w-[88%] ${spanAll} sm:w-auto` : 'w-[72%] sm:w-auto'
            }`}
          >
            <Image
              src={ph.src}
              alt={ph.alt}
              width={ph.orientation === 'landscape' ? 1600 : 1200}
              height={ph.orientation === 'landscape' ? 1200 : 1600}
              preload={i === 0}
              sizes={i === 0 && ph.orientation === 'landscape' ? '(min-width: 640px) 1104px, 88vw' : '(min-width: 640px) 360px, 72vw'}
              className={`w-full object-cover ${
                i === 0 && ph.orientation === 'landscape' ? 'aspect-[4/3] sm:aspect-[21/9]' : 'aspect-[3/4]'
              }`}
            />
          </div>
        ))}
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[1.4fr_1fr] sm:gap-16 sm:px-6 sm:py-16">
        <div>
          <p className="text-[17px] leading-relaxed text-ink-2">{content.description}</p>
          <h2 className="mt-10 text-[15px] font-bold">공간 특징</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {content.features.map((f) => (
              <li key={f} className="rounded-full bg-surface px-3.5 py-2 text-[14px] text-ink-2 ring-1 ring-line-soft">
                {f}
              </li>
            ))}
          </ul>
          <h2 className="mt-10 text-[15px] font-bold">이용 안내</h2>
          <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-muted">
            <li>· 당일 이용 {USAGE_TIME}, 1인(휴대폰 번호 기준) 1일 1동</li>
            <li>· 자리(호수)는 이용 당일 현장에서 배정해 드립니다</li>
            <li>· {TICKET_NOTICE}</li>
            <li>· 취소·환불: {REFUND_SUMMARY}</li>
          </ul>
        </div>

        <aside className="h-fit rounded-[22px] border border-line-soft bg-surface p-6 sm:sticky sm:top-24">
          <dl className="tabular space-y-3">
            <div className="flex justify-between text-[15px]">
              <dt className="text-muted">주중</dt>
              <dd className="font-semibold">{formatWon(product.priceWeekday)}</dd>
            </div>
            <div className="flex justify-between text-[15px]">
              <dt className="text-muted">주말·공휴일·성수기</dt>
              <dd className="font-semibold">{formatWon(product.priceWeekend)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] text-subtle">1동 1일 이용 기준 · 최대 {product.maxCapacity}인(영유아 포함)</p>
          <ButtonLink href={`/booking?type=${product.slug}`} size="lg" className="mt-6">
            이 공간 예약하기
          </ButtonLink>
        </aside>
      </div>
    </PageShell>
  );
}
