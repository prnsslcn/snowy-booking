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
  베타 홈(/beta) 상품 — 간단히 세 칸만(대표 사진 · 이름 · 최대 인원 · 요금). 누르면 시설 안내(/beta1~3).
  첫 화면 아래 끝이 바탕색으로 물들어 있어(Hero fade) 모서리·겹침 없이 바로 이어진다.
  폰: 가로형 줄 3개(왼쪽 사진, 오른쪽 글) — 한 화면 안에 셋이 다 보이게. PC: 세 칸 나란히(위 사진, 아래 글).
*/
/** 상품 칸 — 칸마다 화면에 들어올 때 따로 blockIn(blur 해제 + 상승 + fade). PC 처럼 한 줄에 같이 들어오면 순서대로 살짝 늦게 */
function Card({ space: s, index: i }: { space: Space; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const { ready } = usePageTransition();
  const inView = seen && ready;
  const t = tr(useLocale());
  const photo = s.photos[0];
  return (
    <motion.li ref={ref} style={WILL} {...blockIn(10, '18%', 0.85, 0.04 + i * 0.06, inView)}>
      <TLink
        href={BETA_PATH[s.type] ?? '/beta'}
        className="group flex items-stretch gap-4 rounded-3xl bg-white p-2.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] lg:flex-col lg:gap-0 lg:p-3"
      >
        <span className="relative aspect-[4/5] w-[38%] flex-none overflow-hidden rounded-2xl lg:aspect-[4/3] lg:w-full">
          {photo && (
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 33vw, 40vw"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-between py-1.5 pr-1.5 lg:px-2 lg:pb-2 lg:pt-5">
          <span>
            <span className="block font-mono text-[11px] tracking-[.22em] text-glacier/50">{String(i + 1).padStart(2, '0')}</span>
            <span className="mt-1.5 block font-display text-[26px] font-extrabold leading-none tracking-[-0.035em] lg:text-[34px]">{s.display}</span>
            <span className="mt-1.5 block text-[14px] font-semibold text-glacier/80 lg:text-[15px]">{s.name}</span>
          </span>
          <span className="mt-3 flex items-end justify-between gap-2">
            <span className="text-[12px] leading-snug text-glacier/65 lg:text-[13px]">
              {t(`최대 ${s.maxCapacity}인`, `Up to ${s.maxCapacity}`)}
              <span className="block font-semibold tabular-nums text-glacier">{s.price}</span>
            </span>
            <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-glacier text-white transition-transform duration-300 group-hover:translate-x-0.5">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
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
        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-5">
          {spaces.map((s, i) => (
            <Card key={s.type} space={s} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
