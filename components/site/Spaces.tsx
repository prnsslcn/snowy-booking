'use client';

import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { Fragment, useId, useRef, useState } from 'react';

import { blockIn, WILL } from '@/components/site/motion';
import { usePageTransition } from '@/components/site/PageTransition';
import { useStickyCover } from '@/components/site/useStickyCover';

/*
  공간 안내 — aftc 홈의 "덮는 장" 구조를 상품마다 한 장씩.
  Hero(밝음) → 카바나(겨울 파랑) → 카라반(옅은 얼음) → 단체카라반(겨울 파랑) → 마지막 장(밝음).
  각 장은 화면에 붙고, 다음 장이 위 모서리 48px 로 올라와 덮은 뒤 모서리가 펴진다.
  장은 한 화면(100dvh) 안에 맞춘다 — 남는 높이는 사진 칸이 줄어 흡수. 위 여백은 nav blur 꼬리(약 104px)보다 아래.
  글·사진은 blockIn 으로 순서대로. 내용은 DB 값(수량·인원·요금)과 실제 사진만.
*/

export interface SpacePhoto {
  src: string;
  alt: string;
  orientation: 'portrait' | 'landscape';
}

export interface Space {
  type: string;
  slug: string;
  /** 화면 표기 이름(카바나 등) */
  name: string;
  /** 큰 영문 제목 */
  display: string;
  count: string;
  maxCapacity: number;
  priceWeekday: string;
  priceWeekend: string;
  photos: SpacePhoto[];
  /** 펼쳐 보는 세부 안내(확정 사실만) */
  details: string[];
}

/** 사실 칸 테두리·여백 — 폰 4열 한 줄, 데스크톱 2×2 */
const CELL = [
  'border-r pr-2 lg:pr-4',
  'border-r px-2 lg:border-r-0 lg:pl-4 lg:pr-0',
  'border-r px-2 lg:pl-0 lg:pr-4',
  'pl-2 lg:pl-4',
];

/*
  grill-booking FaqAccordion 구조: 버튼 + 원형 + 아이콘(열리면 45° 회전),
  grid-rows 0fr→1fr 트랜지션으로 높이 측정 없이 펼침 + 내용 페이드. 기본 닫힘.
*/
function Details({ name, items, dark }: { name: string; items: string[]; dark: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const line = dark ? 'border-white/20' : 'border-black/[.12]';
  const soft = dark ? 'text-ice-50/80' : 'text-[#0a0a0a]/70';
  return (
    <div className={`border-b ${line}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 py-3 text-left"
      >
        <span className="text-[15px] font-semibold md:text-base">{name} 자세히 보기</span>
        <span
          aria-hidden
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border ${line} transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-45' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div
        id={id}
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className={`overflow-hidden transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'opacity-100' : 'opacity-0'}`} inert={!open}>
          <ul className={`space-y-1.5 pb-4 text-[13px] leading-relaxed md:text-sm ${soft}`}>
            {items.map((t) => (
              <li key={t} className="flex gap-2">
                <span className={`mt-[0.6em] h-1 w-1 flex-none rounded-full ${dark ? 'bg-ice-300' : 'bg-ice-500'}`} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SpacePanel({ space, index, total, dark }: { space: Space; index: number; total: number; dark: boolean }) {
  const { ref, top, radius } = useStickyCover<HTMLElement>();
  const bodyRef = useRef<HTMLDivElement>(null);
  const seen = useInView(bodyRef, { once: true, margin: '0px 0px -20% 0px' });
  const { ready, leaveTo } = usePageTransition();
  const inView = seen && ready;

  const [main, ...rest] = space.photos;
  const side = rest.slice(0, 2);
  const landscape = main?.orientation === 'landscape';

  const ink = dark ? 'text-[#fafaf8]' : 'text-[#0a0a0a]';
  const soft = dark ? 'text-ice-100/65' : 'text-[#0a0a0a]/55';
  const rule = dark ? 'border-white/20' : 'border-ice-700/15';

  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    leaveTo(e.currentTarget.getAttribute('href') ?? '/');
  };

  const facts: [string, string][] = [
    ['수량', space.count],
    ['최대 인원', `${space.maxCapacity}인`],
    ['주중', space.priceWeekday],
    ['주말', space.priceWeekend],
  ];

  return (
    <motion.section
      ref={ref}
      data-nav-theme={dark ? 'dark' : 'light'}
      aria-labelledby={`space-${space.slug}`}
      className={`sticky flex min-h-[max(100dvh,600px)] flex-col px-5 pb-6 pt-[104px] md:px-8 md:pb-8 lg:px-10 lg:pb-10 lg:pt-28 ${dark ? 'bg-glacier' : 'bg-ice-50'} ${ink}`}
      style={{ top, zIndex: 30 + index, borderTopLeftRadius: radius, borderTopRightRadius: radius }}
    >
      <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-5 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        {/* 좌: 이름 · 사실 · 버튼 */}
        <div className="flex flex-none flex-col lg:min-h-0">
          {/* 폰: 이름 왼쪽 · 번호 오른쪽 한 줄 / 데스크톱: 번호 위, 이름 아래 */}
          <div className="flex flex-row-reverse items-end justify-between gap-4 lg:order-1 lg:block">
            <motion.p
              className={`flex-none pb-1 font-mono text-xs tracking-[.22em] lg:mb-4 lg:pb-0 ${soft}`}
              style={WILL}
              {...blockIn(6, '14%', 0.7, 0.04, inView)}
            >
              {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </motion.p>
            <motion.h2
              id={`space-${space.slug}`}
              className="font-display tracking-[-0.045em]"
              style={{ fontSize: 'clamp(2.25rem, 6vw, 6rem)', fontWeight: 800, lineHeight: 0.92, ...WILL }}
              {...blockIn(11, '18%', 0.82, 0.08, inView)}
            >
              <span aria-hidden>{space.display}</span>
              <span className="sr-only">{space.name}</span>
            </motion.h2>
          </div>
          <motion.p className="mt-2 text-lg font-semibold md:text-2xl lg:order-1 lg:mt-3" style={WILL} {...blockIn(8, '14%', 0.78, 0.18, inView)} aria-hidden>
            {space.name}
          </motion.p>

          <motion.dl
            className={`mt-4 grid grid-cols-4 border-t ${rule} md:mt-6 lg:order-3 lg:mt-auto lg:grid-cols-2`}
            style={WILL}
            {...blockIn(8, '14%', 0.78, 0.28, inView)}
          >
            {facts.map(([k, v], i) => (
              <div
                key={k}
                className={`flex flex-col gap-0.5 border-b ${rule} py-3 lg:gap-1 lg:py-4 ${CELL[i]}`}
              >
                <dt className={`text-[12px] lg:text-[13px] ${soft}`}>{k}</dt>
                <dd className="text-[15px] font-semibold tabular-nums md:text-lg lg:text-xl">{v}</dd>
              </div>
            ))}
          </motion.dl>
          <motion.p className={`mt-2.5 text-[12px] lg:order-3 lg:mt-3 lg:text-[13px] ${soft}`} style={WILL} {...blockIn(8, '14%', 0.78, 0.34, inView)}>
            1{space.type === 'cabana' ? '동' : '대'} 1일 · 10:00–17:00 당일 이용
          </motion.p>

          <motion.div className="mt-4 flex flex-wrap items-center gap-5 lg:order-3 lg:mt-6" style={WILL} {...blockIn(8, '14%', 0.78, 0.4, inView)}>
            <a
              href={`/booking?type=${space.slug}`}
              onClick={go}
              className={`inline-flex items-center rounded-full px-6 py-3 text-[15px] font-semibold transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] lg:px-7 lg:py-3.5 lg:text-base ${dark ? 'bg-white text-glacier-deep' : 'bg-glacier text-white'}`}
            >
              예약하기
            </a>
          </motion.div>

          {/* 세부 안내 — 폰: 버튼 아래 / 데스크톱: 이름과 요금 사이 빈 칸에서 펼침 */}
          <motion.div className="mt-3 lg:order-2 lg:mt-8" style={WILL} {...blockIn(8, '14%', 0.78, 0.46, inView)}>
            <Details name={space.name} items={space.details} dark={dark} />
          </motion.div>
        </div>

        {/* 우: 사진 — 남는 높이를 채움. 대표 사진이 가로면 위 전체 + 아래 2장, 세로면 왼쪽 길게 + 오른쪽 2장 */}
        <motion.div
          className={`grid min-h-[160px] flex-1 gap-2 md:gap-3 lg:min-h-0 ${landscape ? 'grid-cols-2 grid-rows-[1.4fr_1fr]' : 'grid-cols-[1.25fr_1fr] grid-rows-2'}`}
          style={WILL}
          {...blockIn(8, '6%', 0.9, 0.3, inView)}
        >
          {main && (
            <div className={`relative overflow-hidden rounded-xl md:rounded-2xl ${landscape ? 'col-span-2' : 'row-span-2'}`}>
              <Image src={main.src} alt={main.alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </div>
          )}
          {side.map((p) => (
            <div key={p.src} className="relative overflow-hidden rounded-xl md:rounded-2xl">
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}

export function Spaces({ spaces }: { spaces: Space[] }) {
  return (
    <>
      {spaces.map((s, i) => (
        <Fragment key={s.type}>
          {/* nav 앵커(#cabana 등): sticky 장은 붙은 위치를 보고하므로 흐름 위치를 가진 0높이 표식으로 스크롤 */}
          <div id={s.slug} aria-hidden className="h-0" />
          <SpacePanel space={s} index={i} total={spaces.length} dark={i % 2 === 0} />
        </Fragment>
      ))}
    </>
  );
}
