import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { NoticePopup } from '@/components/site/NoticePopup';
import { PageShell } from '@/components/site/PageShell';
import { ButtonLink } from '@/components/ui/Button';
import { HERO_PHOTO } from '@/lib/content/facilities';
import { formatWon } from '@/lib/format';
import { kstToday } from '@/lib/policy/booking-window';
import { getProducts } from '@/lib/products';
import { SAME_DAY_CUTOFF_HOUR } from '@/lib/policy/booking-window';
import { REFUND_SUMMARY, TICKET_NOTICE, USAGE_TIME } from '@/lib/site-config';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

const CUTOFF = `${String(SAME_DAY_CUTOFF_HOUR).padStart(2, '0')}:00`;

export default async function HomePage() {
  const settings = await getSiteSettings();
  if (settings.businessClosed) redirect('/off');
  const products = await getProducts();

  const notice = settings.noticePopup;
  const today = kstToday();
  const showNotice =
    notice.enabled &&
    (notice.title || notice.body) &&
    (!notice.from || notice.from <= today) &&
    (!notice.to || notice.to >= today);

  return (
    <PageShell width="full">
      {showNotice && <NoticePopup id={`${notice.title ?? ''}${notice.from ?? ''}`} title={notice.title} body={notice.body} />}

      {/* ── 히어로: 왼쪽 정렬 제목 + 큰 설원 사진 ── */}
      <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-12">
        <div className="enter">
          <p className="text-[14px] font-semibold text-accent">홍천 비발디파크 · 스노위랜드</p>
          <h1 className="mt-3 text-[34px] font-bold leading-[1.18] sm:text-[52px]">
            눈 위에서 보내는 하루,
            <br />
            카바나와 카라반에서.
          </h1>
          <p className="mt-4 max-w-md text-[16px] text-muted sm:text-[17px]">
            당일 이용 {USAGE_TIME}. 날짜와 공간을 고르고 바로 예약하세요.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <ButtonLink href="/booking" size="xl">
              예약하기
            </ButtonLink>
            <ButtonLink href="/booking/lookup" variant="outline" size="xl">
              예약 조회
            </ButtonLink>
          </div>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-[28px] sm:mt-12">
          <Image
            src={HERO_PHOTO.src}
            alt={HERO_PHOTO.alt}
            width={1600}
            height={1200}
            preload
            sizes="(min-width: 1152px) 1104px, 100vw"
            className="aspect-[4/3] w-full object-cover sm:aspect-[21/9]"
          />
          <div className="absolute bottom-4 left-4 rounded-full bg-surface/90 px-3.5 py-2 text-[13px] font-semibold text-ink">
            당일 예약은 {CUTOFF}까지
          </div>
        </div>
      </section>

      {/* ── 세 가지 공간 ── */}
      <section id="spaces" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6 sm:pt-28">
        <h2 className="text-[26px] font-bold sm:text-[34px]">세 가지 공간</h2>
        <p className="mt-2 text-[15px] text-muted">1인 1동 예약 · 자리(호수)는 이용 당일 현장에서 배정해 드립니다.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.type}
              href={`/facilities/${p.slug}`}
              className="photo-zoom pressable group block overflow-hidden rounded-[22px] border border-line-soft bg-surface"
            >
              {p.content && (
                <div className="overflow-hidden">
                  <Image
                    src={p.content.cover.src}
                    alt={p.content.cover.alt}
                    width={1200}
                    height={1600}
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="aspect-[4/3] w-full object-cover sm:aspect-[4/5]"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[19px] font-bold">{p.name}</h3>
                  <span className="text-[13px] text-subtle">최대 {p.maxCapacity}인</span>
                </div>
                {p.content && <p className="mt-1 text-[14px] text-muted">{p.content.tagline}</p>}
                <p className="tabular mt-4 text-[15px] text-ink-2">
                  <span className="font-bold text-ink">{formatWon(p.priceWeekday)}</span>
                  <span className="text-subtle"> 부터</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 요금 ── */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <div className="grid gap-10 sm:grid-cols-[1fr_1.4fr] sm:gap-16">
          <div>
            <h2 className="text-[26px] font-bold sm:text-[34px]">요금</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              1동 1일 이용 기준. 금·토·일, 공휴일과 그 전날, 그리고 동계 성수기(12/24~2/9)에는 매일 주말 요금이 적용됩니다.
            </p>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-line-soft bg-surface">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 border-b border-line-soft px-5 py-3 text-[13px] text-subtle">
              <span>공간</span>
              <span className="w-20 text-right">주중</span>
              <span className="w-20 text-right">주말</span>
            </div>
            {products.map((p) => (
              <div key={p.type} className="tabular grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-line-soft px-5 py-4 last:border-0">
                <span>
                  <span className="font-semibold">{p.name}</span>
                  <span className="ml-1.5 text-[13px] text-subtle">{p.maxCapacity}인</span>
                </span>
                <span className="w-20 text-right text-[15px]">{formatWon(p.priceWeekday)}</span>
                <span className="w-20 text-right text-[15px] font-semibold">{formatWon(p.priceWeekend)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 알아두세요 ── */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <h2 className="text-[26px] font-bold sm:text-[34px]">예약 전에 알아두세요</h2>
        <dl className="mt-8 grid gap-px overflow-hidden rounded-[22px] border border-line-soft bg-line-soft sm:grid-cols-2">
          {[
            ['이용 시간', `${USAGE_TIME} 당일 이용입니다. 조기 입실·연장은 어렵습니다.`],
            ['1인 1일 1동', '휴대폰 번호 기준으로 같은 날 1동만 예약할 수 있습니다.'],
            ['입장권·주차', `${TICKET_NOTICE} 주차는 비발디파크 리조트 주차장을 이용해 주세요.`],
            ['취소·환불', `${REFUND_SUMMARY}. 예약 조회에서 바로 취소할 수 있습니다.`],
          ].map(([t, d]) => (
            <div key={t} className="bg-surface p-6">
              <dt className="text-[15px] font-bold">{t}</dt>
              <dd className="mt-1.5 text-[14px] leading-relaxed text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 마무리 CTA ── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="rounded-[28px] bg-ice px-6 py-12 text-center sm:py-16">
          <h2 className="text-[24px] font-bold sm:text-[32px]">원하는 날짜, 지금 확인해 보세요</h2>
          <p className="mt-2 text-[15px] text-muted">오늘부터 1개월 이내 날짜를 예약할 수 있습니다.</p>
          <ButtonLink href="/booking" size="xl" className="mt-7">
            날짜 선택하기
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
