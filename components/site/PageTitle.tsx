'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { blockIn, WILL } from '@/components/site/motion';
import { usePageTransition } from '@/components/site/PageTransition';

/**
 * 하위 화면 머리 — aftc 공지사항 헤드라인과 같은 타이포:
 * 큰 영문(Outfit 800) + 한글 부제. 블라인드가 걷히면 blockIn 으로 등장.
 */
export function PageTitle({ display, sub, dark = false, aside }: { display: string; sub: string; dark?: boolean; aside?: ReactNode }) {
  const { ready } = usePageTransition();
  return (
    <div className="mb-10 flex items-end justify-between gap-6 md:mb-14">
      <div>
        <motion.h1
          className="font-display tracking-[-0.045em]"
          style={{ fontSize: 'clamp(2.25rem, 5.5vw, 5rem)', fontWeight: 800, lineHeight: 0.95, ...WILL }}
          {...blockIn(11, '18%', 0.82, 0.08, ready)}
        >
          <span aria-hidden>{display}</span>
          <span className="sr-only">{sub}</span>
        </motion.h1>
        <motion.p
          aria-hidden
          className={`mt-4 font-medium ${dark ? 'text-white/60' : 'text-[#0a0a0a]/60'}`}
          style={{ fontSize: 'clamp(1rem, 1.3vw, 1.25rem)', ...WILL }}
          {...blockIn(8, '14%', 0.78, 0.2, ready)}
        >
          {sub}
        </motion.p>
      </div>
      {aside}
    </div>
  );
}
