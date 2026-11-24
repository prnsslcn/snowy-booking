'use client';

import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { useRef, useState } from 'react';

import { BETA_PATH } from '@/components/site/beta-paths';
import { useLocale } from '@/components/site/LocaleProvider';
import { blockIn, WILL } from '@/components/site/motion';
import { usePageTransition } from '@/components/site/PageTransition';
import { PhotoViewer } from '@/components/site/PhotoViewer';
import { useBusinessClosed } from '@/components/site/SiteStatus';
import { Details, type Space } from '@/components/site/Spaces';
import { TLink } from '@/components/site/TLink';
import { tr } from '@/lib/i18n';

/*
  베타 시설 안내(/beta1 · /beta2 · /beta3) — 상품 하나만, 문서형(브라우저 스크롤 그대로).
  - 폰: 제목 → 사진 가로 넘김(네이티브 scroll-snap, 누르면 크게 보기) → 사실·예약 → 세부 안내(+ 누르면 블라인드처럼 펼침)
  - PC: 왼쪽 글, 오른쪽 사진 띠.
  - 아래: 다른 시설로 가는 줄(이전 · 다음).
  - 바탕은 홈 상품 장과 같은 색(카바나·단체카라반 겨울 파랑, 카라반 옅은 얼음).
*/
export function BetaFacility({ space, index, all }: { space: Space; index: number; all: Space[] }) {
  const dark = index % 2 === 0;
  const headRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const headSeen = useInView(headRef, { once: true });
  const restSeen = useInView(restRef, { once: true, margin: '0px 0px -5% 0px' });
  const { ready, leaveTo } = usePageTransition();
  const a = headSeen && ready;
  const b = restSeen && ready;
  const closed = useBusinessClosed();
  const locale = useLocale();
  const t = tr(locale);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [viewerOn, setViewerOn] = useState(false);

  const ink = dark ? 'text-ice-50' : 'text-glacier';
  const soft = dark ? 'text-ice-100/65' : 'text-glacier/60';
  const rule = dark ? 'border-white/20' : 'border-ice-700/15';

  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    leaveTo(e.currentTarget.getAttribute('href') ?? '/');
  };

  const others = all.filter((s) => s.type !== space.type);

  return (
    <main
      data-nav-theme={dark ? 'dark' : 'light'}
      aria-labelledby={`facility-${space.slug}`}
      className={`min-h-[100svh] px-5 pb-16 pt-[104px] md:px-8 lg:px-10 lg:pb-24 lg:pt-32 ${dark ? 'bg-glacier' : 'bg-ice-50'} ${ink}`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-7 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-x-14 lg:gap-y-8">
        {/* 제목 */}
        <div ref={headRef} className="lg:col-start-1 lg:row-start-1">
          <motion.p className={`font-mono text-xs tracking-[.22em] ${soft}`} style={WILL} {...blockIn(6, '14%', 0.7, 0.04, a)}>
            {String(index + 1).padStart(2, '0')} / {String(all.length).padStart(2, '0')}
          </motion.p>
          <motion.h1
            id={`facility-${space.slug}`}
            className="mt-3 font-display tracking-[-0.045em]"
            style={{ fontSize: 'clamp(2.75rem, 7vw, 6rem)', fontWeight: 800, lineHeight: 0.92, ...WILL }}
            {...blockIn(11, '18%', 0.82, 0.08, a)}
          >
            <span aria-hidden>{space.display}</span>
            <span className="sr-only">{space.name}</span>
          </motion.h1>
          {locale === 'ko' && (
            <motion.p aria-hidden className="mt-2 text-lg font-semibold md:text-2xl" style={WILL} {...blockIn(8, '14%', 0.78, 0.16, a)}>
              {space.name}
            </motion.p>
          )}
        </div>

        {/* 사진 — 가로로 밀어 넘김(브라우저 기본 스크롤). 다음 사진 끝이 살짝 보이게 */}
        <motion.div
          className="-mx-5 min-w-0 md:-mx-8 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mx-0"
          style={WILL}
          {...blockIn(8, '6%', 0.9, 0.24, a)}
        >
          <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-5 px-5 [scrollbar-width:none] md:scroll-px-8 md:px-8 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
            {space.photos.map((p, k) => (
              <button
                key={p.src}
                type="button"
                onClick={() => {
                  setViewerOn(true);
                  setViewing(k);
                }}
                aria-label={t(`${p.alt} 크게 보기`, `View larger: ${p.alt}`)}
                className={`relative h-[min(52svh,460px)] flex-none snap-start overflow-hidden rounded-2xl transition-transform duration-300 active:scale-[0.98] lg:h-[min(64vh,560px)] ${p.orientation === 'landscape' ? 'w-[88%] max-w-[620px]' : 'aspect-[3/4]'}`}
              >
                <Image src={p.src} alt={p.alt} fill priority={k === 0} sizes="(min-width: 1024px) 40vw, 88vw" className="object-cover" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* 사실 · 예약 · 세부 안내 */}
        <div ref={restRef} className="lg:col-start-1 lg:row-start-2">
          <motion.dl className={`grid grid-cols-[auto_1fr] border-t ${rule}`} style={WILL} {...blockIn(8, '14%', 0.78, 0.3, b)}>
            <div className={`flex flex-col gap-0.5 border-b border-r ${rule} py-3 pr-4`}>
              <dt className={`text-[12px] lg:text-[13px] ${soft}`}>{t('최대 인원', 'Max. guests')}</dt>
              <dd className="text-[15px] font-semibold tabular-nums md:text-lg">{t(`${space.maxCapacity}인`, `${space.maxCapacity} people`)}</dd>
            </div>
            <div className={`flex flex-col gap-0.5 border-b ${rule} py-3 pl-4`}>
              <dt className={`text-[12px] lg:text-[13px] ${soft}`}>{t('요금', 'Price')}</dt>
              <dd className="text-[15px] font-semibold tabular-nums md:text-lg">{space.price}</dd>
            </div>
          </motion.dl>
          <motion.p className={`mt-2.5 text-[12px] lg:text-[13px] ${soft}`} style={WILL} {...blockIn(8, '14%', 0.78, 0.36, b)}>
            {t(`1${space.type === 'cabana' ? '동' : '대'} 1일 · 10:00–17:00 당일 이용`, 'Per unit, per day · Day use 10:00–17:00')}
          </motion.p>
          {!closed && (
            <motion.div className="mt-5" style={WILL} {...blockIn(8, '14%', 0.78, 0.42, b)}>
              <a
                href={`/booking?type=${space.slug}`}
                onClick={go}
                className={`inline-flex items-center rounded-full px-6 py-3 text-[15px] font-semibold transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] lg:px-7 lg:py-3.5 lg:text-base ${dark ? 'bg-white text-glacier-deep' : 'bg-glacier text-white'}`}
              >
                {t('예약하기', 'Book Now')}
              </a>
            </motion.div>
          )}

          {/* 세부 안내 — 처음엔 접힘, + 누르면 블라인드처럼 아래로 펼쳐짐 */}
          <motion.div className="mt-6" style={WILL} {...blockIn(8, '14%', 0.78, 0.48, b)}>
            <Details name={t(`${space.name} 안내`, space.name)} items={space.details} dark={dark} open={open} onToggle={() => setOpen((v) => !v)} />
          </motion.div>
        </div>
      </div>

      {/* 다른 시설 */}
      <nav aria-label={t('다른 시설', 'Other spaces')} className={`mx-auto mt-16 max-w-6xl border-t ${rule} pt-6 lg:mt-24`}>
        <ul className="grid grid-cols-2 gap-3">
          {others.map((o) => (
            <li key={o.type}>
              <TLink
                href={BETA_PATH[o.type] ?? '/beta'}
                className={`group flex items-center justify-between gap-3 rounded-2xl px-4 py-4 transition-colors ${dark ? 'bg-white/[.07] hover:bg-white/[.12]' : 'bg-white hover:bg-white/70'}`}
              >
                <span className="min-w-0">
                  <span className="block font-display text-[18px] font-extrabold leading-none tracking-[-0.03em] md:text-[22px]">{o.display}</span>
                  {locale === 'ko' && <span className={`mt-1 block text-[12px] ${soft}`}>{o.name}</span>}
                </span>
                <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-none transition-transform duration-300 group-hover:translate-x-0.5">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </TLink>
            </li>
          ))}
        </ul>
      </nav>
      {viewerOn && <PhotoViewer photos={space.photos} index={viewing} onClose={() => setViewing(null)} />}
    </main>
  );
}
