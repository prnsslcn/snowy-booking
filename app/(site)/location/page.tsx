import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { CopyButton } from '@/components/site/CopyButton';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { PHOTO } from '@/lib/content/facilities';
import { ADDRESS, LOCATION_ENABLED, MAP_LINKS, PARKING_NOTICE, PLACE_NAME, TICKET_NOTICE, USAGE_TIME } from '@/lib/site-config';

export const metadata: Metadata = { title: '오시는 길', description: `${PLACE_NAME} · ${ADDRESS}` };

/*
  오시는 길 — 현장 사진 + 장소·주소(복사) + 지도 앱 열기 + 주차·입장권·이용 시간.
  지도는 외부 지도 앱 검색 링크로만(임베드 없음). 확정 사실만.
*/
export default function LocationPage() {
  if (!LOCATION_ENABLED) notFound();
  return (
    <SubPage display="Location" sub="오시는 길">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl md:aspect-[16/8]">
        <Image src={PHOTO.hero.src} alt={PHOTO.hero.alt} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
      </div>

      <section className="mt-4 rounded-3xl bg-white p-6 md:p-8">
        <h2 className="text-[13px] font-semibold text-ice-600">위치</h2>
        <p className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-glacier md:text-[34px]">{PLACE_NAME}</p>
        <address className="mt-2 text-[15px] not-italic text-ink/70 md:text-base">{ADDRESS}</address>
        <div className="mt-6 flex flex-wrap gap-2">
          {MAP_LINKS.map((m) => (
            <a key={m.href} href={m.href} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'sm')}>
              {m.label}
              <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <path d="M5.5 3.5h7v7M12.5 3.5 4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
          <CopyButton text={ADDRESS} />
        </div>
      </section>

      <dl className="mt-4 grid gap-3 md:grid-cols-3 md:gap-4">
        {[
          ['주차', PARKING_NOTICE],
          ['입장권', TICKET_NOTICE],
          ['이용 시간', `시즌 중 매일 ${USAGE_TIME} · 자리는 현장에서 배정합니다.`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-3xl bg-white p-6">
            <dt className="text-[13px] font-semibold text-ice-600">{k}</dt>
            <dd className="mt-2 text-[15px] leading-relaxed text-ink/80">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 flex flex-wrap justify-center gap-2.5">
        <TLink href="/guide" className={buttonClass('secondary', 'md')}>
          이용 안내
        </TLink>
        <TLink href="/booking" className={buttonClass('primary', 'md')}>
          예약하기
        </TLink>
      </div>
    </SubPage>
  );
}
