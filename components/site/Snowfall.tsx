'use client';

import { useEffect, useRef } from 'react';

/*
  천천히 내리는 눈 — 캔버스 한 장. 크기·속도·투명도가 제각각인 눈송이가 좌우로 살짝 흔들리며 내려온다.
  화면 폭에 비례한 개수(상한 있음), DPR 대응. 모션 줄이기 설정이면 그리지 않는다.
  active=false 이면(장이 덮인 뒤 등) 그리기를 멈춘다.
*/
interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  sway: number;
  phase: number;
  a: number;
}

export function Snowfall({ active = true, className = '' }: { active?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let flakes: Flake[] = [];
    const make = (y?: number): Flake => {
      const depth = Math.random();
      return {
        x: Math.random() * w,
        y: y ?? Math.random() * h,
        r: 0.8 + depth * 2.2,
        vy: 0.25 + depth * 0.75,
        sway: 0.3 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        a: 0.35 + depth * 0.55,
      };
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(140, Math.round(w / 11));
      flakes = Array.from({ length: n }, () => make());
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!activeRef.current) return;
      t += 1;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      for (const f of flakes) {
        f.y += f.vy;
        f.x += Math.sin(t * 0.012 * f.sway + f.phase) * 0.35;
        if (f.y - f.r > h) Object.assign(f, make(-f.r * 2));
        ctx.globalAlpha = f.a;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none ${className}`} />;
}
