'use client';

import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

import { useLocale } from '@/components/site/LocaleProvider';
import { blockIn, WILL } from '@/components/site/motion';
import { usePageTransition } from '@/components/site/PageTransition';
import type { Space } from '@/components/site/Spaces';
import { BETA_PATH } from '@/components/site/beta-paths';
import { TLink } from '@/components/site/TLink';
import { tr } from '@/lib/i18n';

/*
  베타 홈(/beta) 상품 — 사진 카드형(A~E안 중 확정). 누르면 시설 안내(/beta1~3).
  - 사진이 칸 전체를 채우고, 아래쪽만 겨울 파랑으로 어둡게 물들여 그 위에 흰 글씨(큰 영문 이름 · 한글 이름 · 요금).
  - 위 모서리엔 유리 알약 두 개(순번 · 최대 인원), 아래 오른쪽엔 흰 원 화살표.
  - 등장: 칸마다 화면에 들어오면 blockIn + 사진이 살짝 크게 있다가 제자리로(줌 아웃).
  첫 화면 아래 끝이 바탕색으로 물들어 있어(Hero fade) 모서리·겹침 없이 바로 이어진다.
  폰: 한 줄에 하나(5:4). PC: 세 칸 나란히(3:4 세로).
*/
const EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]';

/** 상품 칸 — 칸마다 화면에 들어올 때 따로 등장. PC 처럼 한 줄에 같이 들어오면 순서대로 살짝 늦게 */
function Card({ space: s, index: i }: { space: Space; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const { ready } = usePageTransition();
  const inView = seen && ready;
  const locale = useLocale();
  const t = tr(locale);
  const photo = s.photos[0];
  const pill = 'rounded-full border border-white/40 bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md lg:text-[12px]';
  return (
    <motion.li ref={ref} style={WILL} {...blockIn(10, '14%', 0.9, 0.04 + i * 0.07, inView)}>
      <TLink
        href={BETA_PATH[s.type] ?? '/beta'}
        className={`group relative block aspect-[5/4] overflow-hidden rounded-[28px] bg-glacier transition-transform duration-300 ${EASE} active:scale-[0.985] lg:aspect-[3/4]`}
      >
        {photo && (
          <motion.span
            className="absolute inset-0"
            initial={{ scale: 1.14 }}
            animate={inView ? { scale: 1 } : undefined}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.04 + i * 0.07 }}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className={`object-cover transition-transform duration-[1200ms] ${EASE} group-hover:scale-[1.05]`}
            />
          </motion.span>
        )}
        {/* 아래쪽만 겨울 파랑으로 — 흰 글씨 자리 */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#0d2440]/85 via-[#0d2440]/40 to-transparent" />

        {/* 위: 순번 · 최대 인원 */}
        <span className="absolute inset-x-3.5 top-3.5 flex items-center justify-between lg:inset-x-4 lg:top-4">
          <span className={`${pill} font-mono tracking-[.18em]`}>{String(i + 1).padStart(2, '0')}</span>
          <span className={pill}>{t(`최대 ${s.maxCapacity}인`, `Up to ${s.maxCapacity}`)}</span>
        </span>

        {/* 아래: 이름 · 요금 · 화살표 */}
        <span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-white lg:inset-x-6 lg:bottom-6">
          <span className="min-w-0">
            <span className="block font-display text-[34px] font-extrabold leading-[0.95] tracking-[-0.04em] lg:text-[40px]">{s.display}</span>
            {locale === 'ko' && <span className="mt-1.5 block text-[14px] font-semibold text-white/85">{s.name}</span>}
            <span className="mt-2.5 block text-[13px] font-medium tabular-nums text-white/75">{s.price}</span>
          </span>
          <span
            aria-hidden
            className={`flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white text-glacier transition-transform duration-500 ${EASE} group-hover:-rotate-45`}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </TLink>
    </motion.li>
  );
}

export function BetaProducts({ spaces }: { spaces: Space[] }) {
  return (
    <section data-nav-theme="light" className="relative z-20 bg-ice-50 px-5 pb-20 pt-10 text-glacier md:px-8 lg:px-10 lg:pb-28 lg:pt-16">
      <div className="mx-auto max-w-6xl">
        <ul className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-5">
          {spaces.map((s, i) => (
            <Card key={s.type} space={s} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
