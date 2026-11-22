'use client';

import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

import { BusinessInfo } from '@/components/site/BusinessInfo';
import { blockIn, WILL } from '@/components/site/motion';
import { usePageTransition } from '@/components/site/PageTransition';
import { useStickyCover } from '@/components/site/useStickyCover';
import { FACILITIES, type FacilityPhoto } from '@/lib/content/facilities';
import { LOCATION_ENABLED } from '@/lib/site-config';

/*
  마지막 장 — 사진 흐름 + 큰 푸터. 앞 장(단체카라반)을 밝은 장으로 덮는다.
  - 위: 시설 사진이 두 줄로 서로 반대 방향으로 천천히 흐른다(마우스 올리면 멈춤, 모션 줄이기면 정지)
  - 가운데: 메뉴 묶음(공간 · 예약 · 약관 3종) + 사업자 정보(전자상거래법 제10조 필수)
  - 맨 아래: 화면 폭을 채우는 큰 "Snowy" — 아래 끝이 살짝 잘리며 장을 닫는다
  지어낸 문구 없이 사진·이름·메뉴·사업자 정보만.
*/

// 설비 사진(감지기·온도조절기)은 흐름에서 뺀다
const SKIP = new Set(['/images/facilities/cabana-3.jpg', '/images/facilities/caravan-4.jpg']);
const ALL = FACILITIES.flatMap((f) => f.photos).filter((p) => !SKIP.has(p.src));
// 두 줄로 나누되 상품이 섞이도록 번갈아
const ROWS: FacilityPhoto[][] = [ALL.filter((_, i) => i % 2 === 0), ALL.filter((_, i) => i % 2 === 1)];

function MarqueeRow({ photos, reverse, seconds }: { photos: FacilityPhoto[]; reverse?: boolean; seconds: number }) {
  // 한 묶음 = 사진 ×2(화면 폭보다 길게), 트랙 = 묶음 ×2 → -50% 까지 흘리면 이음매 없음
  const set = [...photos, ...photos];
  return (
    <div className="marquee-row overflow-hidden">
      <div
        className="marquee-track flex w-max gap-2.5 md:gap-3"
        style={{ animation: `${reverse ? 'marquee-right' : 'marquee-left'} ${seconds}s linear infinite` }}
      >
        {[...set, ...set].map((p, i) => (
          <div
            key={i}
            aria-hidden={i >= photos.length || undefined}
            className={`relative h-[132px] flex-none overflow-hidden rounded-xl md:h-[200px] md:rounded-2xl lg:h-[236px] ${
              p.orientation === 'landscape' ? 'aspect-[4/3]' : 'aspect-[3/4]'
            }`}
          >
            <Image src={p.src} alt={i < photos.length ? p.alt : ''} fill sizes="(min-width: 1024px) 320px, 180px" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

const NAV: { title: string; links: { label: string; href: string; internal?: boolean }[] }[] = [
  {
    title: 'Spaces',
    links: [
      { label: '카바나', href: '/#cabana', internal: true },
      { label: '카라반', href: '/#caravan', internal: true },
      { label: '단체카라반', href: '/#caravan-group', internal: true },
    ],
  },
  {
    title: 'Visit',
    links: [
      { label: '이용 안내', href: '/guide', internal: true },
      ...(LOCATION_ENABLED ? [{ label: '오시는 길', href: '/location', internal: true }] : []),
    ],
  },
  {
    title: 'Booking',
    links: [
      { label: '예약하기', href: '/booking', internal: true },
      { label: '예약 조회·취소', href: '/booking/lookup', internal: true },
    ],
  },
  {
    title: 'Policy',
    links: [
      { label: '이용약관', href: '/terms', internal: true },
      { label: '개인정보처리방침', href: '/privacy', internal: true },
      { label: '취소·환불정책', href: '/refund-policy', internal: true },
    ],
  },
];

export function Closing({ z }: { z: number }) {
  const { ref, radius } = useStickyCover<HTMLElement>();
  const bodyRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const seen = useInView(bodyRef, { once: true, margin: '0px 0px -10% 0px' });
  const markSeen = useInView(markRef, { once: true, margin: '0px 0px -5% 0px' });
  const { ready, leaveTo } = usePageTransition();
  const inView = seen && ready;

  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    leaveTo(e.currentTarget.getAttribute('href') ?? '/');
  };

  return (
    <motion.footer
      ref={ref}
      id="contact"
      data-nav-theme="light"
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-ice-50 pt-[104px] text-ink lg:pt-28"
      style={{ zIndex: z, borderTopLeftRadius: radius, borderTopRightRadius: radius }}
    >
      <div ref={bodyRef}>
        {/* 사진 흐름 */}
        <motion.div className="flex flex-col gap-2.5 md:gap-3" style={WILL} {...blockIn(8, '8%', 0.9, 0.05, inView)}>
          <MarqueeRow photos={ROWS[0]} seconds={70} />
          <MarqueeRow photos={ROWS[1]} seconds={80} reverse />
        </motion.div>

        {/* 메뉴 묶음 */}
        <nav aria-label="사이트 메뉴" className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 px-5 md:mt-20 md:grid-cols-4 md:px-8 lg:px-10">
          {NAV.map((g, i) => (
            <motion.div key={g.title} style={WILL} {...blockIn(8, '14%', 0.78, 0.2 + i * 0.08, inView)}>
              <p className="font-display text-[13px] font-semibold tracking-[0.02em] text-ice-600 md:text-sm">{g.title}</p>
              <ul className="mt-3 space-y-2 md:mt-4 md:space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={l.internal ? go : undefined}
                      className={`group inline-block text-[15px] md:text-lg ${l.href === '/privacy' ? 'font-bold' : 'font-medium'}`}
                    >
                      <span className="relative after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-current after:transition-[width] after:duration-500 after:ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:after:w-full">
                        {l.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </nav>

        {/* 사업자 정보 */}
        <motion.div
          className="mx-5 mt-12 border-t border-black/[.1] pt-4 text-[11px] leading-relaxed text-ink/50 md:mx-8 md:mt-20 md:pt-5 md:text-[13px] lg:mx-10"
          style={WILL}
          {...blockIn(8, '14%', 0.78, 0.45, inView)}
        >
          <div className="flex items-start justify-between gap-4">
            {/* 누르면 사업자 정보가 펼쳐짐(전자상거래법 필수 표시) */}
            <BusinessInfo className="min-w-0" />
            {/* 관리자 진입(별도 레이아웃이라 종이 전환 없이 일반 이동) */}
            <a href="/admin" className="flex-none font-medium text-ink/45 underline-offset-4 transition-colors hover:text-ink hover:underline">
              Admin
            </a>
          </div>
        </motion.div>
      </div>

      {/* 큰 Snowy — 아래 끝이 살짝 잘리며 장을 닫는다 */}
      <div ref={markRef} aria-hidden className="mt-auto overflow-hidden px-3 pt-10 md:px-5 md:pt-14">
        <motion.p
          className="select-none font-display font-extrabold text-glacier"
          style={{ fontSize: '33.4vw', lineHeight: 1, letterSpacing: '-0.045em', marginBottom: '-0.1em' }}
          initial={{ y: '40%', opacity: 0 }}
          animate={markSeen && ready ? { y: '0%', opacity: 1 } : undefined}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          Snowy
        </motion.p>
      </div>
    </motion.footer>
  );
}
