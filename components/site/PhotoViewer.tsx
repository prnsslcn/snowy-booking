'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLocale } from '@/components/site/LocaleProvider';
import { useLenis } from '@/components/site/SmoothScroll';
import { tr } from '@/lib/i18n';

/*
  사진 크게 보기(폰·태블릿) — 사진을 누르면 흐린 반투명 바탕 위에 둥근 모서리 사진(좌우 여백). 같은 장 사진끼리 좌우로 밀어 넘긴다.
  열린 동안 페이지 스크롤(Lenis·장 넘기기)은 멈춘다. 닫기: 사진 바깥 누르기 · 아래로 끌기 · Esc(닫기 버튼 없음).
*/

export interface ViewerPhoto {
  src: string;
  alt: string;
  orientation?: 'portrait' | 'landscape';
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function PhotoViewer({ photos, index, onClose }: { photos: ViewerPhoto[]; index: number | null; onClose: () => void }) {
  const lenis = useLenis();
  const open = index !== null;

  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      lenis?.start();
      document.body.style.overflow = prev;
    };
  }, [open, lenis]);

  return createPortal(
    <AnimatePresence>{open && <Viewer key="v" photos={photos} start={index} onClose={onClose} />}</AnimatePresence>,
    document.body,
  );
}

function Viewer({ photos, start, onClose }: { photos: ViewerPhoto[]; start: number; onClose: () => void }) {
  const t = tr(useLocale());
  const [i, setI] = useState(start);
  const [dir, setDir] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const n = photos.length;
  const go = (d: 1 | -1) => {
    const next = i + d;
    if (next < 0 || next >= n) return;
    setDir(d);
    setI(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const p = photos[i];
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t('사진 크게 보기', 'Photo viewer')}
      className="fixed inset-0 z-[300] bg-white/[.14] text-white backdrop-blur-xl backdrop-saturate-[1.6]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const s = touch.current;
        touch.current = null;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        else if (dy > 80 && dy > Math.abs(dx)) onClose();
      }}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={p.src}
          custom={dir}
          className="pointer-events-none absolute inset-x-5 top-[calc(env(safe-area-inset-top)+64px)] bottom-[calc(env(safe-area-inset-bottom)+92px)] flex items-center justify-center"
          initial={{ opacity: 0, x: dir * 60, scale: dir ? 1 : 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: dir * -60 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {/* 사진 크기 그대로 맞춤 — 모서리를 사진 자체에 둥글게(바깥 = 빈 곳 → 누르면 닫힘) */}
          <Image
            src={p.src}
            alt={p.alt}
            width={p.orientation === 'landscape' ? 1600 : 1200}
            height={p.orientation === 'landscape' ? 1200 : 1600}
            sizes="100vw"
            className="pointer-events-auto h-auto max-h-full w-auto max-w-full rounded-2xl object-contain shadow-[0_20px_60px_rgb(0_0_0/0.35)]"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      </AnimatePresence>

      <p className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+18px)] -translate-x-1/2 rounded-full border border-white/60 bg-white/55 px-3.5 py-1.5 font-mono text-[12px] tracking-[.18em] text-ink backdrop-blur-md">
        {i + 1} / {n}
      </p>

      {n > 1 && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+20px)] left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/60 bg-white/55 p-1.5 text-ink backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => go(-1)} disabled={i === 0} aria-label={t('이전 사진', 'Previous photo')} className="grid h-10 w-10 place-items-center rounded-full transition-colors active:bg-white/70 disabled:opacity-25">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {photos.map((ph, k) => (
              <span key={ph.src} className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? 'w-5 bg-ink' : 'w-1.5 bg-ink/25'}`} />
            ))}
          </div>
          <button type="button" onClick={() => go(1)} disabled={i === n - 1} aria-label={t('다음 사진', 'Next photo')} className="grid h-10 w-10 place-items-center rounded-full transition-colors active:bg-white/70 disabled:opacity-25">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}
    </motion.div>
  );
}
