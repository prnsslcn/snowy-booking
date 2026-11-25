'use client';

import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import Image, { getImageProps } from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { FACILITY_PATH } from '@/components/site/facility-paths';
import { useLocale } from '@/components/site/LocaleProvider';
import { blockIn, WILL } from '@/components/site/motion';
import { usePageTransition } from '@/components/site/PageTransition';
import { PhotoViewer } from '@/components/site/PhotoViewer';
import { useBusinessClosed } from '@/components/site/SiteStatus';
import { Details, type Space } from '@/components/site/Spaces';
import { TLink } from '@/components/site/TLink';
import { tr } from '@/lib/i18n';

/*
  시설 안내(/cabana · /caravan · /caravan-group) — 폰·태블릿 전용(lg 미만). 홈 사진 카드를 이어받은 화면, 브라우저 스크롤 그대로.
  PC(lg 이상)로 열면 홈의 그 상품 장(/#cabana 등, 영업 종료 중엔 /off#…)으로 보낸다 — PC 는 문서형을 쓰지 않는다.
  1) 첫 화면: 대표 사진이 위를 가득(아래 모서리만 둥글게), 아래쪽을 짙게 물들여 흰 글씨 — 순번 알약 · 큰 영문 이름 · 한글 이름.
     스크롤하면 사진이 천천히 확대되며 위로 흐른다. 누르면 크게 보기.
  2) 숫자 세 칸: 최대 인원 · 요금 · 이용 시간
  3) 사진: 대표 사진 포함 전부 가로 넘김(누르면 크게 보기)
  4) 세부 안내: 처음엔 접힘, + 누르면 블라인드처럼 펼침
  5) 다른 시설: 홈과 같은 작은 사진 카드 두 장
  예약하기: 숫자 칸과 사진 사이(폰은 폭 가득, PC 는 알약).
  바탕은 홈 상품 장과 같은 색(카바나·단체카라반 겨울 파랑, 카라반 옅은 얼음).
*/
const EASE = [0.22, 1, 0.36, 1] as const;
const TW = 'ease-[cubic-bezier(0.16,1,0.3,1)]';

/** 첫 화면 사진 — 폰(lg 미만)은 3:4 세로 확장본, PC 는 원본 가로. <picture> 로 한 장만 받는다 */
function HeroPicture({ src, tall, alt }: { src: string; tall: string; alt: string }) {
  const common = { alt, fill: true, priority: true, sizes: '100vw' } as const;
  const {
    props: { srcSet: wideSet },
  } = getImageProps({ ...common, src });
  const {
    props: { srcSet: tallSet, ...img },
  } = getImageProps({ ...common, src: tall });
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={wideSet} sizes="100vw" />
      <img {...img} srcSet={tallSet} alt={alt} className="object-cover" />
    </picture>
  );
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const { ready } = usePageTransition();
  return [ref, seen && ready] as const;
}

export function Facility({ space, index, all }: { space: Space; index: number; all: Space[] }) {
  const dark = index % 2 === 0;
  const { ready, leaveTo } = usePageTransition();
  const closed = useBusinessClosed();
  const locale = useLocale();
  const t = tr(locale);
  const [open, setOpen] = useState(false);
  // PC 로 열면 홈 상품 장으로(화면은 FacilityPage 가 lg 에서 감춰 둠)
  useEffect(() => {
    const pc = window.matchMedia('(min-width: 1024px)');
    const go = () => pc.matches && window.location.replace(`${closed ? '/off' : '/'}#${space.slug}`);
    go();
    pc.addEventListener('change', go);
    return () => pc.removeEventListener('change', go);
  }, [closed, space.slug]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [viewerOn, setViewerOn] = useState(false);
  const view = (k: number) => {
    setViewerOn(true);
    setViewing(k);
  };

  const [factsRef, factsIn] = useReveal<HTMLDivElement>();
  const [galleryRef, galleryIn] = useReveal<HTMLDivElement>();
  const [detailRef, detailIn] = useReveal<HTMLDivElement>();
  const [othersRef, othersIn] = useReveal<HTMLDivElement>();

  // 첫 화면 사진 — 스크롤하면 천천히 확대 + 위로
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);

  const soft = dark ? 'text-ice-100/65' : 'text-glacier/60';
  const rule = dark ? 'border-white/15' : 'border-glacier/15';
  const main = space.photos[0];
  const others = all.filter((s) => s.type !== space.type);
  const unit = space.type === 'cabana' ? t('동', 'unit') : t('대', 'unit');

  const book = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    leaveTo(e.currentTarget.getAttribute('href') ?? '/');
  };

  const facts: [string, string, string?][] = [
    [t('최대 인원', 'Max. guests'), t(`${space.maxCapacity}인`, `${space.maxCapacity}`), t('영유아 포함', 'incl. infants')],
    [t('요금', 'Price'), space.price, t(`1${unit} 1일`, 'per unit, per day')],
    [t('이용 시간', 'Hours'), '10:00–17:00', t('당일 이용', 'Day use')],
  ];

  return (
    <main aria-labelledby={`facility-${space.slug}`} className={`pb-16 lg:pb-24 ${dark ? 'bg-glacier text-ice-50' : 'bg-ice-50 text-glacier'}`}>
      {/* 1) 첫 화면 사진 */}
      <div ref={heroRef} data-nav-theme="dark" className="relative h-[72svh] min-h-[420px] overflow-hidden rounded-b-[36px] bg-glacier-deep lg:h-[86vh] lg:rounded-b-[48px]">
        {main && (
          <motion.div className="absolute inset-0" style={{ scale: heroScale, y: heroY }}>
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.18, filter: 'brightness(1.1)' }}
              animate={ready ? { scale: 1, filter: 'brightness(1)' } : undefined}
              transition={{ duration: 2, ease: EASE }}
            >
              {main.tall ? <HeroPicture src={main.src} tall={main.tall} alt={main.alt} /> : <Image src={main.src} alt={main.alt} fill priority sizes="100vw" className="object-cover" />}
            </motion.div>
          </motion.div>
        )}
        <span aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0d2440]/45 to-transparent" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0d2440]/85 via-[#0d2440]/30 to-transparent" />
        <button type="button" onClick={() => view(0)} aria-label={t('대표 사진 크게 보기', 'View the main photo larger')} className="absolute inset-0" />

        <div className="pointer-events-none absolute inset-x-0 bottom-7 mx-auto max-w-6xl px-5 text-white md:px-8 lg:bottom-12 lg:px-10">
          <motion.span
            className="inline-block rounded-full border border-white/40 bg-white/20 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[.18em] backdrop-blur-md"
            style={WILL}
            {...blockIn(6, '14%', 0.8, 0.25, ready)}
          >
            {String(index + 1).padStart(2, '0')} / {String(all.length).padStart(2, '0')}
          </motion.span>
          <motion.h1
            id={`facility-${space.slug}`}
            className="mt-3 font-display font-extrabold"
            style={{ fontSize: 'clamp(3.2rem, 15vw, 9rem)', lineHeight: 0.9, letterSpacing: '-0.045em', ...WILL }}
            {...blockIn(11, '18%', 1, 0.35, ready)}
          >
            <span aria-hidden>{space.display}</span>
            <span className="sr-only">{space.name}</span>
          </motion.h1>
          {locale === 'ko' && (
            <motion.p aria-hidden className="mt-2.5 text-[17px] font-semibold text-white/85 lg:text-2xl" style={WILL} {...blockIn(8, '14%', 0.85, 0.5, ready)}>
              {space.name}
            </motion.p>
          )}
        </div>
      </div>

      <div data-nav-theme={dark ? 'dark' : 'light'} className="mx-auto max-w-6xl px-5 md:px-8 lg:px-10">
        {/* 2) 숫자 세 칸 */}
        <div ref={factsRef} className={`mt-8 grid grid-cols-3 border-y ${rule} lg:mt-14`}>
          {facts.map(([k, v, sub], i) => (
            <motion.div
              key={k}
              className={`py-4 lg:py-7 ${i > 0 ? `border-l ${rule} pl-3 lg:pl-6` : 'pr-3'}`}
              style={WILL}
              {...blockIn(8, '14%', 0.8, 0.05 + i * 0.08, factsIn)}
            >
              <p className={`text-[11px] lg:text-[13px] ${soft}`}>{k}</p>
              <p className={`mt-1.5 font-semibold tabular-nums leading-tight ${i === 1 ? 'text-[13px] lg:text-xl' : 'text-[17px] lg:text-2xl'}`}>{v}</p>
              {sub && <p className={`mt-1 text-[11px] lg:text-[13px] ${soft}`}>{sub}</p>}
            </motion.div>
          ))}
        </div>
        {!closed && (
          <motion.div className="mt-6" style={WILL} {...blockIn(8, '14%', 0.8, 0.3, factsIn)}>
            <a
              href={`/booking?type=${space.slug}`}
              onClick={book}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold lg:inline-flex lg:w-auto lg:py-3.5 transition-transform duration-300 ${TW} active:scale-[0.97] ${dark ? 'bg-white text-glacier-deep' : 'bg-glacier text-white'}`}
            >
              {t('예약하기', 'Book Now')}
            </a>
          </motion.div>
        )}

        {/* 3) 사진 — 대표 사진 포함 전부. 가로 사진은 칸(4:5)에 3:4 확장본을 써서 덜 잘리게(크게 보기는 원본) */}
        {space.photos.length > 0 && (
          <div ref={galleryRef} className="mt-12 lg:mt-20">
            <motion.p className={`text-[13px] font-semibold ${soft}`} style={WILL} {...blockIn(6, '14%', 0.7, 0, galleryIn)}>
              {t('사진', 'Photos')} <span className="font-mono tracking-[.1em]">{space.photos.length}</span>
            </motion.p>
            <motion.div className="-mx-5 mt-3 md:-mx-8 lg:mx-0" style={WILL} {...blockIn(8, '6%', 0.9, 0.1, galleryIn)}>
              <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-5 px-5 [scrollbar-width:none] md:scroll-px-8 md:px-8 lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
                {space.photos.map((p, k) => (
                  <button
                    key={p.src}
                    type="button"
                    onClick={() => view(k)}
                    aria-label={t(`${p.alt} 크게 보기`, `View larger: ${p.alt}`)}
                    className={`relative aspect-[4/5] w-[62%] flex-none snap-start overflow-hidden rounded-[22px] transition-transform duration-300 ${TW} active:scale-[0.98] lg:w-auto lg:min-w-0 lg:flex-1`}
                  >
                    <Image src={p.tall ?? p.src} alt={p.alt} fill sizes="(min-width: 1024px) 25vw, 62vw" className={`object-cover transition-transform duration-[1200ms] ${TW} hover:scale-[1.04]`} />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* 4) 세부 안내 */}
        <motion.div ref={detailRef} className="mt-12 lg:mt-20" style={WILL} {...blockIn(8, '14%', 0.8, 0, detailIn)}>
          <Details name={t(`${space.name} 안내`, space.name)} items={space.details} dark={dark} open={open} onToggle={() => setOpen((v) => !v)} />
        </motion.div>

        {/* 5) 다른 시설 */}
        <div ref={othersRef} className="mt-14 lg:mt-24">
          <motion.p className={`text-[13px] font-semibold ${soft}`} style={WILL} {...blockIn(6, '14%', 0.7, 0, othersIn)}>
            {t('다른 시설', 'Other spaces')}
          </motion.p>
          <ul className="mt-3 grid grid-cols-2 gap-2.5 lg:gap-4">
            {others.map((o, i) => (
              <motion.li key={o.type} style={WILL} {...blockIn(8, '14%', 0.85, 0.08 + i * 0.08, othersIn)}>
                <TLink
                  href={FACILITY_PATH[o.type] ?? '/'}
                  className={`group relative block aspect-[4/5] overflow-hidden rounded-[22px] bg-glacier-deep transition-transform duration-300 ${TW} active:scale-[0.98] lg:aspect-[16/10]`}
                >
                  {o.photos[0] && (
                    <Image src={o.photos[0].src} alt={o.photos[0].alt} fill sizes="(min-width: 1024px) 50vw, 50vw" className={`object-cover transition-transform duration-[1200ms] ${TW} group-hover:scale-[1.05]`} />
                  )}
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#0d2440]/85 to-transparent" />
                  <span className="absolute inset-x-3.5 bottom-3.5 flex items-end justify-between gap-2 text-white lg:inset-x-5 lg:bottom-5">
                    <span className="min-w-0">
                      <span className="block font-display text-[20px] font-extrabold leading-[0.95] tracking-[-0.035em] lg:text-[30px]">{o.display}</span>
                      {locale === 'ko' && <span className="mt-1 block text-[12px] font-semibold text-white/80">{o.name}</span>}
                    </span>
                    <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white text-glacier transition-transform duration-500 group-hover:-rotate-45">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                </TLink>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      {viewerOn && <PhotoViewer photos={space.photos} index={viewing} onClose={() => setViewing(null)} />}
    </main>
  );
}
