'use client';

import { motion } from 'framer-motion';
import { getImageProps } from 'next/image';

import { usePageTransition } from '@/components/home/PageTransition';

/*
  aftc Hero 구조: 윗줄(큰 영문 제목, 오른쪽 보조 줄) + 아래를 채우는 그림.
  그림은 픽셀아트 대신 사진 그대로 — 블라인드가 걷히면 살짝 줌아웃되며 자리 잡는다.
*/

const EASE = [0.22, 1, 0.36, 1] as const;

export interface HeroProps {
  src: string;
  phoneSrc: string;
  alt: string;
  /** 운영자 공지(관리자 설정) — 있을 때만 오른쪽에 한 줄 */
  notice?: string | null;
}

export function Hero({ src, phoneSrc, alt, notice }: HeroProps) {
  const { ready } = usePageTransition();
  // 아트 디렉션: 폰은 세로 크롭, md 이상은 가로 — <picture> 로 한 장만 받는다
  const common = { alt, fill: true, priority: true, sizes: '100vw' } as const;
  const {
    props: { srcSet: desktopSet },
  } = getImageProps({ ...common, src });
  const {
    props: { srcSet: phoneSet, ...img },
  } = getImageProps({ ...common, src: phoneSrc });

  return (
    <section data-nav-theme="light" className="relative flex w-full flex-col overflow-hidden bg-[#fafaf8]" style={{ minHeight: '100dvh' }}>
      <div className="flex flex-col gap-6 border-b border-black/[.15] px-5 pb-6 pt-24 md:flex-row md:items-end md:justify-between md:gap-10 md:px-8 md:pb-8 lg:px-10 lg:pb-10 lg:pt-28">
        <h1 className="font-display tracking-[-0.045em] text-[#0a0a0a]" style={{ fontSize: 'clamp(2.25rem, 5.5vw, 5rem)', fontWeight: 800, lineHeight: 0.95 }}>
          <span className="sr-only">홍천 비발디파크 스노위랜드 카바나·카라반</span>
          <span aria-hidden>
            Snowyland
            <br />
            Cabana &amp; Caravan
          </span>
        </h1>
        {notice && <p className="flex-none text-[14px] font-medium text-[#0a0a0a] md:max-w-[22rem] md:text-right">{notice}</p>}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.08 }}
          animate={ready ? { scale: 1 } : undefined}
          transition={{ duration: 1.8, ease: EASE }}
        >
          <picture>
            <source media="(min-width: 768px)" srcSet={desktopSet} sizes="100vw" />
            <img {...img} srcSet={phoneSet} alt={alt} className="object-cover" style={{ ...img.style, objectPosition: '50% 62%' }} />
          </picture>
        </motion.div>
      </div>
    </section>
  );
}
