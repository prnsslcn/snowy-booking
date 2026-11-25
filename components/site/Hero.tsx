'use client';

import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { getImageProps } from 'next/image';
import { Fragment, useState } from 'react';

import { useLocale } from '@/components/site/LocaleProvider';
import { blockIn, WILL } from '@/components/site/motion';
import { usePageTransition } from '@/components/site/PageTransition';
import { Snowfall } from '@/components/site/Snowfall';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { tr } from '@/lib/i18n';

/*
  첫 화면 — 사진 한 장이 화면을 채우고(하늘 위로 nav, 흰 글씨), 아래 눈밭 위에 작은 소제목 "Snowy" + 아주 큰 겨울 파랑 "Cabana & Caravan".
  - 등장(ready): 사진이 1.16 → 1 로 천천히 자리 잡고, 제목(Snowy → Cabana & Caravan)이 blockIn(blur 해제 + 상승 + fade)으로 차례로 나타난다. 그 뒤 아랫줄이 떠오름.
  - 하늘엔 눈이 천천히 내린다(Snowfall).
  - 스크롤(다음 장이 덮는 동안): 사진은 살짝 확대, 제목은 천천히 위로 흘러가며 화면 전체가 조금 어두워진다.
  글은 확정 사실만 — 상품 이름 셋, 예약 버튼, 관리자 공지(있을 때만).
*/

const EASE = [0.22, 1, 0.36, 1] as const;
/** 큰 제목 낱말(폰에선 'Cabana' / '& Caravan' 으로 줄바꿈) */
const TITLE = ['Cabana', '&', 'Caravan'];
const NAMES = ['Cabana', 'Caravan', 'Group Caravan'];

export interface HeroProps {
  src: string;
  phoneSrc: string;
  alt: string;
  /** 운영자 공지(관리자 설정) — 있을 때만 한 줄 */
  notice?: string | null;
}

export function Hero({ src, phoneSrc, alt, notice }: HeroProps) {
  const { ready } = usePageTransition();
  const t = tr(useLocale());

  // 아트 디렉션: 폰은 세로 크롭, md 이상은 가로 — <picture> 로 한 장만 받는다
  const common = { alt, fill: true, priority: true, sizes: '100vw' } as const;
  const {
    props: { srcSet: desktopSet },
  } = getImageProps({ ...common, src });
  const {
    props: { srcSet: phoneSet, ...img },
  } = getImageProps({ ...common, src: phoneSrc });

  // 첫 화면은 sticky — 한 화면 스크롤하는 동안 다음 장이 덮는다. 그 진행도로 깊이감.
  const { scrollY } = useScroll();
  const vh = () => (typeof window === 'undefined' ? 1 : window.innerHeight);
  const p = useTransform(scrollY, (y) => Math.min(1, Math.max(0, y / vh())));
  const photoScale = useTransform(p, [0, 1], [1, 1.1]);
  const titleY = useTransform(p, [0, 1], ['0%', '-38%']);
  const shade = useTransform(p, [0, 1], [0, 0.45]);
  const hintOpacity = useTransform(p, [0, 0.25], [1, 0]);
  const [snowing, setSnowing] = useState(true);
  useMotionValueEvent(p, 'change', (v) => setSnowing(v < 1));

  return (
    <section data-nav-theme="dark" className="relative h-full w-full overflow-hidden bg-[#c9dcf0]">
      {/* 사진 */}
      <motion.div className="absolute inset-0" style={{ scale: photoScale }}>
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.16, filter: 'brightness(1.12) saturate(0.9)' }}
          animate={ready ? { scale: 1, filter: 'brightness(1) saturate(1)' } : undefined}
          transition={{ duration: 2.4, ease: EASE }}
        >
          <picture>
            <source media="(min-width: 768px)" srcSet={desktopSet} sizes="100vw" />
            <img {...img} srcSet={phoneSet} alt={alt} className="object-cover" style={{ ...img.style, objectPosition: '50% 34%' }} />
          </picture>
        </motion.div>
      </motion.div>

      {/* 하늘 쪽 살짝 어둡게(nav 흰 글씨) */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#0d2440]/35 to-transparent" />
      {/*
        눈안개 — 제목 뒤 바닥을 아래로 갈수록 흐리고 하얗게(파란 제목 가독성). 경계 없이 위로 사라지도록
        흐림은 마스크로, 흰 기운은 그라데이션으로 따로 깐다. 폰은 제목 칸이 눈밭뿐이라 낮고 옅게.
      */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[52%] md:h-[50%]"
        style={{
          backdropFilter: 'blur(9px) saturate(1.05)',
          WebkitBackdropFilter: 'blur(9px) saturate(1.05)',
          maskImage: 'linear-gradient(to top, #000 30%, rgba(0,0,0,0.6) 60%, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, #000 30%, rgba(0,0,0,0.6) 60%, transparent)',
        }}
      />
      {/*
        PC: 좌우만 눈안개를 더 높이 — 왼쪽 'Snowy'·오른쪽 예약 버튼 뒤를 흐리고, 가운데(카라반)는 그대로.
        세로(아래 진함 → 위 사라짐)와 가로(양 끝 진함 → 가운데 없음) 마스크의 교집합.
      */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 hidden h-[70%] bg-white/25 md:block"
        style={{
          backdropFilter: 'blur(9px) saturate(1.05)',
          WebkitBackdropFilter: 'blur(9px) saturate(1.05)',
          maskImage: 'linear-gradient(to top, #000 40%, transparent), linear-gradient(to right, #000 8%, transparent 38%, transparent 62%, #000 92%)',
          WebkitMaskImage: 'linear-gradient(to top, #000 40%, transparent), linear-gradient(to right, #000 8%, transparent 38%, transparent 62%, #000 92%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-white/70 via-[#eef4fa]/45 to-transparent md:h-[56%] md:from-white/75 lg:via-[#eef4fa]/35" />
      <Snowfall active={snowing} className="absolute inset-0 h-full w-full" />
      {/* 폰·태블릿: 눈안개 아래를 바탕색으로 서서히 — 다음 사진 카드(ice-50)와 경계 없이 이어진다. 글자는 이 위에 */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-b from-ice-50/0 via-ice-50/70 to-ice-50 lg:hidden" />

      {/* 위: 하늘 위 상품 이름 줄(흰 글씨) */}
      <motion.p
        className="absolute left-5 top-[100px] flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-[17px] font-semibold tracking-[-0.015em] text-white md:left-8 md:top-28 md:text-2xl lg:left-10"
        initial={{ opacity: 0, filter: 'blur(8px)' }}
        animate={ready ? { opacity: 1, filter: 'blur(0px)' } : undefined}
        transition={{ duration: 1, ease: EASE, delay: 0.9 }}
      >
        {NAMES.map((n, i) => (
          <span key={n} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-white/70" />}
            {n}
          </span>
        ))}
      </motion.p>

      {/* 아래: 예약 버튼 + 큰 제목 */}
      <motion.div className="absolute inset-x-0 bottom-0 px-5 pb-5 md:px-8 md:pb-7 lg:px-10 lg:pb-9" style={{ y: titleY }}>
        {/* 소제목 Snowy(왼쪽, 큰 제목의 약 55%) · 예약 버튼(오른쪽) */}
        <div className="mb-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-[1.4vw]">
          <motion.span
            aria-hidden
            className="block pb-[0.14em] font-display text-[9.6vw] font-medium md:text-[min(5.8vw,8.25rem)] leading-none tracking-[-0.02em] text-glacier"
            style={WILL}
            {...blockIn(11, '18%', 1.1, 0.15, ready)}
          >
            Snowy
          </motion.span>
          <motion.div
            className="ml-auto flex items-center gap-3"
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={ready ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
            transition={{ duration: 1, ease: EASE, delay: 1.05 }}
          >
            {notice && (
              <p className="hidden max-w-[22rem] rounded-full bg-white/80 px-4 py-2 text-[13px] font-medium text-glacier md:block">{notice}</p>
            )}
            {/* 폰·태블릿은 예약하기 버튼 없음 — 사진 카드·시설 안내에서 예약 */}
            <span className="hidden lg:block">
              <TLink href="/booking" className={buttonClass('primary', 'md')}>
                {t('예약하기', 'Book Now')}
              </TLink>
            </span>
          </motion.div>
          {notice && (
            <motion.p
              className="w-full rounded-2xl bg-white/80 px-4 py-2.5 text-[13px] font-medium text-glacier md:hidden"
              initial={{ opacity: 0 }}
              animate={ready ? { opacity: 1 } : undefined}
              transition={{ duration: 1, ease: EASE, delay: 1.1 }}
            >
              {notice}
            </motion.p>
          )}
        </div>

        {/* 큰 제목 — 폰: "Cabana" / "& Caravan" 두 줄, md 이상: "Cabana & Caravan" 한 줄로 화면 폭을 채움 */}
        <h1
          className="font-display text-[17.5vw] font-extrabold text-glacier md:text-[min(10.2vw,14.5rem)]"
          style={{ lineHeight: 0.9, letterSpacing: '-0.022em' }}
        >
          <span className="sr-only">{t('스노위 카바나·카라반', 'Snowy Cabana & Caravan')}</span>
          <motion.span aria-hidden className="flex flex-wrap items-baseline gap-x-[0.22em] pb-[0.16em] md:flex-nowrap" style={WILL} {...blockIn(11, '18%', 1.1, 0.3, ready)}>
            {TITLE.map((word, w) => (
              // 폰은 '&' 앞에서 줄바꿈
              <Fragment key={w}>
                {word === '&' && <span aria-hidden className="h-0 basis-full md:hidden" />}
                <span>{word}</span>
              </Fragment>
            ))}
          </motion.span>
        </h1>

        {/* 아래로 스크롤 안내 — 제목 아래 가운데, 배경 없이 글자 + 가는 선 위로 빛이 천천히 흘러내림. 스크롤을 시작하면 사라짐 */}
        <motion.div style={{ opacity: hintOpacity }} className="mt-2 flex justify-center md:mt-3">
          <motion.div
            className="flex flex-col items-center gap-2 text-glacier"
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={ready ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
            transition={{ duration: 1, ease: EASE, delay: 1.5 }}
          >
            <span className="text-[12px] font-semibold tracking-[0.08em] md:text-[13px]">{t('아래로 스크롤', 'Scroll down')}</span>
            <span aria-hidden className="relative h-8 w-[1.5px] overflow-hidden rounded-full bg-glacier/25 md:h-10">
              <motion.span
                className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-transparent via-glacier to-glacier"
                animate={{ y: ['-100%', '200%'] }}
                transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1], repeat: Infinity, repeatDelay: 0.3 }}
              />
            </span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* 덮이는 동안 어두워짐 */}
      {/* PC: 다음 장이 덮는 동안 어두워짐(폰은 흐름이라 없음 — 아래 바탕색 이음이 회색으로 변하지 않게) */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-[#0a1a2e] lg:block" style={{ opacity: shade }} />
    </section>
  );
}
