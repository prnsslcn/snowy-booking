import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { PageShell } from '@/components/site/PageShell';
import { ButtonLink } from '@/components/ui/Button';
import { facilityBySlug } from '@/lib/content/facilities';
import { formatWon } from '@/lib/format';
import { getProducts } from '@/lib/products';
import { ONE_PER_DAY_NOTICE, REFUND_SUMMARY, TICKET_NOTICE, USAGE_TIME } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getProducts()).find((p) => p.slug === slug);
  return product ? { title: `${product.name} · 스노위랜드` } : {};
}

export default async function FacilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = facilityBySlug(slug);
  const product = (await getProducts()).find((p) => p.slug === slug);
  if (!content || !product) notFound();

  const [lead, ...rest] = content.photos;
  const leadWide = lead?.orientation === 'landscape';
  const grid = leadWide ? rest : content.photos;
  const cols = grid.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';

  return (
    <PageShell width="full">
      <section className="py-10 md:py-16">
        <div className="wrap">
          <div className="enter">
            <p className="label text-muted">당일 이용 {USAGE_TIME}</p>
            <h1 className="mt-3 text-[40px] leading-[1.05] md:text-[64px]">{product.name}</h1>
          </div>

          {/* 요금·인원 — spec cell */}
          <dl className="mt-10 grid grid-cols-3 border-y border-hairline">
            {[
              [formatWon(product.priceWeekday), '주중'],
              [formatWon(product.priceWeekend), '주말·공휴일·성수기'],
              [`${product.maxCapacity}인`, '최대 인원'],
            ].map(([v, k], i) => (
              <div key={k} className={`py-6 ${i > 0 ? 'border-l border-hairline pl-4 md:pl-6' : ''}`}>
                <dd className="tabular text-[17px] font-bold text-ink md:text-[24px]">{v}</dd>
                <dt className="mt-1 text-[13px] font-bold tracking-[1.5px] text-muted">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="pb-20">
        <div className="wrap space-y-6">
          {leadWide && lead && (
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-card md:aspect-[21/9]">
              <Image src={lead.src} alt={lead.alt} fill preload sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
            </div>
          )}
          <div className={`grid grid-cols-2 gap-3 md:gap-6 ${cols}`}>
            {grid.map((ph, i) => (
              <div key={ph.src} className={`relative aspect-[3/4] overflow-hidden bg-surface-card ${grid.length === 3 && i === 0 ? 'col-span-2 md:col-span-1' : ''}`}>
                <Image src={ph.src} alt={ph.alt} fill preload={!leadWide && i === 0} sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline py-20">
        <div className="wrap grid gap-10 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-7">
            <h2 className="text-[32px] leading-[1.15]">이용 기준</h2>
            <dl className="mt-8">
              {[
                ['이용 시간', `당일 ${USAGE_TIME}`],
                ['예약 기준', ONE_PER_DAY_NOTICE],
                ['자리 배정', '이용 당일 현장에서 배정'],
                ['입장권', TICKET_NOTICE],
                ['취소·환불', REFUND_SUMMARY],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[112px_1fr] gap-4 border-t border-hairline py-4 last:border-b">
                  <dt className="text-[16px] font-bold text-ink">{k}</dt>
                  <dd className="text-[16px] text-body">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="md:col-span-4 md:col-start-9 md:self-end">
            <ButtonLink href={`/booking?type=${product.slug}`} size="block">
              {product.name} 예약하기
            </ButtonLink>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
