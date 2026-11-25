'use client';

import { motion, useInView, useMotionValueEvent } from 'framer-motion';
import Image from 'next/image';
import { Fragment, useEffect, useId, useRef, useState } from 'react';

import { blockIn, WILL } from '@/components/site/motion';
import { useLocale } from '@/components/site/LocaleProvider';
import { tr } from '@/lib/i18n';
import { usePageTransition } from '@/components/site/PageTransition';
import { PhotoViewer } from '@/components/site/PhotoViewer';
import { useBusinessClosed } from '@/components/site/SiteStatus';
import { useStickyCover } from '@/components/site/useStickyCover';

/*
  공간 안내 — aftc 홈의 "덮는 장" 구조를 상품마다 한 장씩.
  Hero(밝음) → 카바나(겨울 파랑) → 카라반(옅은 얼음) → 단체카라반(겨울 파랑) → 마지막 장(밝음).
  각 장은 화면에 붙고, 다음 장이 위 모서리 48px 로 올라와 덮은 뒤 모서리가 펴진다.
  폰·태블릿은 '자세히 보기'가 펼침 대신 장 안에서 오른쪽 안내 쪽으로 넘어간다(장 높이 그대로 → 장 넘기기 유지).
  장은 한 화면(100dvh) 안에 맞춘다 — 남는 높이는 사진 칸이 줄어 흡수. 위 여백은 nav blur 꼬리(약 104px)보다 아래.
  글·사진은 blockIn 으로 순서대로. 내용은 DB 값(수량·인원·요금)과 실제 사진만.
*/

export interface SpacePhoto {
  src: string;
  alt: string;
  orientation: 'portrait' | 'landscape';
  /** 가로 사진의 3:4 세로 확장본(폰 시설 안내 첫 화면) */
  tall?: string;
}

export interface Space {
  type: string;
  slug: string;
  /** 화면 표기 이름(카바나 등) */
  name: string;
  /** 큰 영문 제목 */
  display: string;
  maxCapacity: number;
  /** 요금 범위(₩70,000 ~ ₩90,000) */
  price: string;
  photos: SpacePhoto[];
  /** 펼쳐 보는 세부 안내(확정 사실만) */
  details: string[];
}

/** 사실 칸 테두리·여백 — 최대 인원 | 요금 두 칸 */
const CELL = ['border-r pr-3 lg:pr-4', 'pl-3 lg:pl-4'];

/*
  grill-booking FaqAccordion 구조: 버튼 + 원형 + 아이콘(열리면 45° 회전),
  grid-rows 0fr→1fr 트랜지션으로 높이 측정 없이 펼침 + 내용 페이드. 기본 닫힘.
  장이 화면을 꽉 채우면(SpacePanel) 저절로 한 번 펼쳐진다 — 높이는 천천히 열리고 줄은 위에서부터 차례로 떠오른다.
  열림 상태는 장이 들고 있고, 사용자가 누르면 그대로 접고 펼 수 있다.
*/
const OPEN_EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

export function Details({
  name,
  items,
  dark,
  open,
  onToggle,
}: {
  name: string;
  items: string[];
  dark: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const t = tr(useLocale());
  const line = dark ? 'border-white/20' : 'border-ice-700/20';
  const soft = dark ? 'text-ice-50/80' : 'text-glacier/75';
  return (
    <div className={`border-b ${line}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 py-3 text-left"
      >
        <span className="text-[15px] font-semibold md:text-base">{t(`${name} 자세히 보기`, `More about the ${name.toLowerCase()}`)}</span>
        <span
          aria-hidden
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border ${line} transition-transform duration-700 ${OPEN_EASE} ${open ? 'rotate-45' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div
        id={id}
        className={`grid transition-[grid-template-rows] duration-[900ms] ${OPEN_EASE} ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden" inert={!open}>
          <ul className={`space-y-1.5 pb-4 text-[13px] leading-relaxed md:text-sm ${soft}`}>
            {items.map((t, i) => (
              <li
                key={t}
                className={`flex gap-2 transition-[opacity,transform,filter] duration-700 ${OPEN_EASE} ${open ? 'translate-y-0 opacity-100 blur-[0px]' : '-translate-y-1.5 opacity-0 blur-[3px]'}`}
                style={{ transitionDelay: open ? `${180 + i * 70}ms` : '0ms' }}
              >
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
  const { ref, top, radius, progress } = useStickyCover<HTMLElement>();
  const bodyRef = useRef<HTMLDivElement>(null);
  const seen = useInView(bodyRef, { once: true, margin: '0px 0px -20% 0px' });
  const { ready, leaveTo } = usePageTransition();
  const inView = seen && ready;

  // 장이 화면 맨 위에 닿아 꽉 채우면 자세히 보기를 한 번 저절로 펼친다(살짝 쉬었다가).
  // 데스크톱(lg)만 — 폰은 펼치면 사진 칸이 거의 사라져서 누를 때만 펼친다.
  const [open, setOpen] = useState(false);
  // 폰·태블릿: 안내 쪽으로 넘어갔는지
  const [slid, setSlid] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const autoDone = useRef(false);
  const autoTimer = useRef(0);
  useMotionValueEvent(progress, 'change', (v) => {
    if (autoDone.current || !ready || v < 0.995) return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    autoDone.current = true;
    autoTimer.current = window.setTimeout(() => setOpen(true), 350);
  });
  useEffect(() => () => window.clearTimeout(autoTimer.current), []);

  const [main, ...rest] = space.photos;
  const side = rest.slice(0, 2);
  // 폰·태블릿: 사진을 누르면 크게 보기(데스크톱은 그대로)
  const shown = [main, ...side].filter(Boolean);
  const [viewing, setViewing] = useState<number | null>(null);
  const [viewerOn, setViewerOn] = useState(false); // 처음 누를 때 붙인다(서버 렌더와 어긋나지 않게)
  const view = (k: number) => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    setViewerOn(true);
    setViewing(k);
  };
  const landscape = main?.orientation === 'landscape';

  const ink = dark ? 'text-ice-50' : 'text-glacier';
  const soft = dark ? 'text-ice-100/65' : 'text-glacier/60';
  const rule = dark ? 'border-white/20' : 'border-ice-700/15';

  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    leaveTo(e.currentTarget.getAttribute('href') ?? '/');
  };
  // 영업 종료 중엔 예약하기 버튼을 빼고 소개만
  const closed = useBusinessClosed();

  const locale = useLocale();
  const t = tr(locale);
  const facts: [string, string][] = [
    [t('최대 인원', 'Max. guests'), t(`${space.maxCapacity}인`, `${space.maxCapacity} people`)],
    [t('요금', 'Price'), space.price],
  ];

  return (
    <motion.section
      ref={ref}
      data-nav-theme={dark ? 'dark' : 'light'}
      data-lock-page={slid || undefined}
      aria-labelledby={`space-${space.slug}`}
      className={`sticky flex min-h-[100dvh] flex-col overflow-x-clip px-5 lg:min-h-[max(100dvh,600px)] pb-6 pt-[104px] max-lg:[@media(max-height:700px)]:pb-4 max-lg:[@media(max-height:700px)]:pt-[84px] md:px-8 md:pb-8 lg:px-10 lg:pb-10 lg:pt-28 ${dark ? 'bg-glacier' : 'bg-ice-50'} ${ink}`}
      style={{ top, zIndex: 30 + index, borderTopLeftRadius: radius, borderTopRightRadius: radius }}
    >
      {/* 폰·태블릿: 두 쪽 가로 트랙(소개 | 안내). '자세히 보기'를 누르면 장 안에서 오른쪽 쪽으로 밀려 넘어간다 — 장 높이는 그대로 */}
      <div className="-mx-5 flex min-h-0 flex-1 md:-mx-8 lg:mx-0">
      <div className={`flex min-h-0 w-[200%] flex-none transition-transform duration-700 ${OPEN_EASE} lg:w-full lg:flex-1 lg:translate-x-0 ${slid ? '-translate-x-1/2' : ''}`}>
      <div ref={bodyRef} inert={slid} className="flex min-h-0 w-1/2 flex-col gap-5 max-lg:[@media(max-height:700px)]:gap-3 px-5 md:px-8 lg:grid lg:w-full lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-0">
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
          {/* 한글 이름 줄 — 영어 보기에서는 큰 영문 제목과 같아서 숨긴다.
              언어를 바꿀 때 새로 생기지 않게(차례 등장에서 혼자 먼저 나오지 않게) 늘 그려 두고 감추기만 한다 */}
          <motion.p
            className={`mt-2 text-lg font-semibold md:text-2xl lg:order-1 lg:mt-3 ${locale === 'ko' ? '' : 'hidden'}`}
            style={WILL}
            {...blockIn(8, '14%', 0.78, 0.18, inView)}
            aria-hidden
          >
            {locale === 'ko' ? space.name : ''}
          </motion.p>

          <motion.dl
            className={`mt-4 max-lg:[@media(max-height:700px)]:mt-3 grid grid-cols-[auto_1fr] border-t ${rule} md:mt-6 lg:order-3 lg:mt-auto lg:grid-cols-[0.6fr_1.4fr]`}
            style={WILL}
            {...blockIn(8, '14%', 0.78, 0.28, inView)}
          >
            {facts.map(([k, v], i) => (
              <div
                key={k}
                className={`flex flex-col gap-0.5 border-b ${rule} py-3 max-lg:[@media(max-height:700px)]:py-2 lg:gap-1 lg:py-4 ${CELL[i]}`}
              >
                <dt className={`text-[12px] lg:text-[13px] ${soft}`}>{k}</dt>
                <dd className="text-[15px] font-semibold tabular-nums md:text-lg lg:text-xl">{v}</dd>
              </div>
            ))}
          </motion.dl>
          <motion.p className={`mt-2.5 text-[12px] lg:order-3 lg:mt-3 lg:text-[13px] ${soft}`} style={WILL} {...blockIn(8, '14%', 0.78, 0.34, inView)}>
            {t(`1${space.type === 'cabana' ? '동' : '대'} 1일 · 10:00–17:00 당일 이용`, 'Per unit, per day · Day use 10:00–17:00')}
          </motion.p>

          {!closed && (
          <motion.div className="mt-4 max-lg:[@media(max-height:700px)]:mt-3 flex flex-wrap items-center gap-5 lg:order-3 lg:mt-6" style={WILL} {...blockIn(8, '14%', 0.78, 0.4, inView)}>
            <a
              href={`/booking?type=${space.slug}`}
              onClick={go}
              className={`inline-flex items-center rounded-full px-6 py-3 max-lg:[@media(max-height:700px)]:py-2.5 text-[15px] font-semibold transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] lg:px-7 lg:py-3.5 lg:text-base ${dark ? 'bg-white text-glacier-deep' : 'bg-glacier text-white'}`}
            >
              {t('예약하기', 'Book Now')}
            </a>
          </motion.div>
          )}

          {/* 세부 안내 — 폰: 버튼 아래 / 데스크톱: 이름과 요금 사이 빈 칸에서 펼침 */}
          <motion.div className="mt-3 lg:order-2 lg:mt-8" style={WILL} {...blockIn(8, '14%', 0.78, 0.46, inView)}>
            {/* 데스크톱: 제자리 펼침 */}
            <div className="hidden lg:block">
              <Details name={space.name} items={space.details} dark={dark} open={open} onToggle={() => { autoDone.current = true; setOpen((v) => !v); }} />
            </div>
            {/* 폰·태블릿: 오른쪽 안내 쪽으로 넘어감 */}
            <button
              type="button"
              onClick={() => setSlid(true)}
              aria-expanded={slid}
              className={`flex w-full items-center justify-between gap-4 border-b py-3 max-lg:[@media(max-height:700px)]:py-2 text-left lg:hidden ${dark ? 'border-white/20' : 'border-ice-700/20'}`}
            >
              <span className="text-[15px] font-semibold">{t(`${space.name} 안내 자세히 보기`, `More about the ${space.name.toLowerCase()}`)}</span>
              <span aria-hidden className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border ${dark ? 'border-white/20' : 'border-ice-700/20'}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </motion.div>
        </div>

        {/* 우: 사진 — 남는 높이를 채움. 대표 사진이 가로면 위 전체 + 아래 2장, 세로면 왼쪽 길게 + 오른쪽 2장 */}
        <motion.div
          className={`grid min-h-[120px] max-lg:[@media(max-height:700px)]:min-h-[96px] flex-1 gap-2 md:gap-3 lg:min-h-0 ${landscape ? 'grid-cols-2 grid-rows-[1.4fr_1fr]' : 'grid-cols-[1.25fr_1fr] grid-rows-2'}`}
          style={WILL}
          {...blockIn(8, '6%', 0.9, 0.3, inView)}
        >
          {main && (
            <button
              type="button"
              onClick={() => view(0)}
              aria-label={t(`${main.alt} 크게 보기`, `View larger: ${main.alt}`)}
              className={`relative overflow-hidden rounded-xl transition-transform duration-300 active:scale-[0.98] md:rounded-2xl lg:pointer-events-none ${landscape ? 'col-span-2' : 'row-span-2'}`}
            >
              <Image src={main.src} alt={main.alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </button>
          )}
          {side.map((p, k) => (
            <button
              key={p.src}
              type="button"
              onClick={() => view(k + 1)}
              aria-label={t(`${p.alt} 크게 보기`, `View larger: ${p.alt}`)}
              className="relative overflow-hidden rounded-xl transition-transform duration-300 active:scale-[0.98] md:rounded-2xl lg:pointer-events-none"
            >
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
            </button>
          ))}
        </motion.div>
      </div>

      {/* 폰·태블릿 오른쪽 쪽: 안내만. 오른쪽으로 밀거나 '돌아가기'로 되돌아옴 */}
      <div inert={!slid} className="relative w-1/2 lg:hidden">
      {/* 장 높이를 늘리지 않게 겹쳐 두고, 넘치면 이 안에서 스크롤 */}
      <div
        data-scroll-y
        className="absolute inset-0 overflow-y-auto overscroll-contain px-5 pb-2 md:px-8"
        onTouchStart={(e) => (swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const st = swipe.current;
          swipe.current = null;
          if (!st) return;
          const dx = e.changedTouches[0].clientX - st.x;
          const dy = e.changedTouches[0].clientY - st.y;
          if (dx > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) setSlid(false);
        }}
      >
        <button type="button" onClick={() => setSlid(false)} className={`-ml-1 inline-flex items-center gap-1.5 rounded-full py-1 pr-2 text-[14px] font-semibold ${soft}`}>
          <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('돌아가기', 'Back')}
        </button>
        <h3 className="mt-4 font-display text-[28px] font-extrabold leading-none tracking-[-0.03em]">{t(`${space.name} 안내`, `About the ${space.name.toLowerCase()}`)}</h3>
        <ul className={`mt-5 border-t ${rule}`}>
          {space.details.map((d, i) => (
            <li
              key={d}
              className={`flex gap-3 border-b ${rule} py-3 text-[14px] leading-relaxed transition-[opacity,transform,filter] duration-700 ${OPEN_EASE} ${slid ? 'translate-x-0 opacity-100 blur-[0px]' : 'translate-x-4 opacity-0 blur-[3px]'}`}
              style={{ transitionDelay: slid ? `${260 + i * 60}ms` : '0ms' }}
            >
              <span className={`mt-[0.62em] h-1 w-1 flex-none rounded-full ${dark ? 'bg-ice-300' : 'bg-ice-500'}`} />
              <span className={dark ? 'text-ice-50/90' : 'text-glacier/85'}>{d}</span>
            </li>
          ))}
        </ul>
      </div>
      </div>
      </div>
      </div>
      {viewerOn && <PhotoViewer photos={shown} index={viewing} onClose={() => setViewing(null)} />}
    </motion.section>
  );
}

export function Spaces({ spaces }: { spaces: Space[] }) {
  return (
    <>
      {spaces.map((s, i) => (
        <Fragment key={s.type}>
          {/* nav 앵커(#cabana 등): sticky 장은 붙은 위치를 보고하므로 흐름 위치를 가진 0높이 표식으로 스크롤 */}
          <div id={s.slug} data-snap aria-hidden className="h-0" />
          <SpacePanel space={s} index={i} total={spaces.length} dark={i % 2 === 0} />
        </Fragment>
      ))}
    </>
  );
}
