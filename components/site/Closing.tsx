'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

import { blockIn, WILL } from '@/components/site/motion';
import { usePageTransition } from '@/components/site/PageTransition';
import { useStickyCover } from '@/components/site/useStickyCover';

/*
  마지막 장 — 소개 글 + 위치·이용 시간·예약 + 사업자 정보를 한 화면에.
  앞 장(단체카라반, 어두움)을 밝은 장으로 덮는다. 사업자 정보는 전자상거래법 제10조에 따라 필수.
*/

function Lines({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br className="hidden md:inline" />}
          {i < lines.length - 1 && ' '}
        </span>
      ))}
    </>
  );
}

export function Closing({ headline, body, z }: { headline: string; body: string[]; z: number }) {
  const { ref, radius } = useStickyCover<HTMLElement>();
  const bodyRef = useRef<HTMLDivElement>(null);
  const seen = useInView(bodyRef, { once: true, margin: '0px 0px -15% 0px' });
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
      className="relative flex min-h-[100dvh] flex-col bg-[#fafaf8] px-5 pb-5 pt-[104px] text-[#0a0a0a] md:pb-6 md:px-8 lg:px-10 lg:pt-28"
      style={{ zIndex: z, borderTopLeftRadius: radius, borderTopRightRadius: radius }}
    >
      <div ref={bodyRef} className="grid flex-1 content-start gap-7 md:gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:content-stretch lg:gap-20">
        {/* 소개 */}
        <div className="flex flex-col gap-5 md:gap-10">
          <motion.h2
            className="font-display text-[1.45rem] font-black leading-[1.3] tracking-[-0.025em] md:text-[2.5rem]"
            style={WILL}
            {...blockIn(11, '18%', 0.82, 0.08, inView)}
          >
            <Lines text={headline} />
          </motion.h2>
          <div className="flex max-w-3xl flex-col gap-3 md:gap-6">
            {body.map((p, i) => (
              <motion.p
                key={i}
                className="text-[14px] leading-[1.6] text-[#0a0a0a]/70 md:text-[1.1rem] md:leading-[1.65]"
                style={WILL}
                {...blockIn(8, '14%', 0.78, 0.2 + i * 0.12, inView)}
              >
                {p}
              </motion.p>
            ))}
          </div>
        </div>

        {/* 위치 · 이용 시간 · 예약 */}
        <motion.div className="flex flex-col gap-4 md:gap-6 lg:justify-end" style={WILL} {...blockIn(8, '14%', 0.78, 0.44, inView)}>
          <address className="font-display text-[1.35rem] font-extrabold not-italic leading-[1.15] tracking-[-0.03em] md:text-[2.5rem]">
            홍천 비발디파크
            <br />
            스노위랜드
          </address>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[14px] text-[#0a0a0a]/70 md:gap-y-1.5 md:text-[15px]">
            <dt>시즌 중 매일</dt>
            <dd className="tabular-nums">10:00–17:00</dd>
            <dt>당일 예약</dt>
            <dd className="tabular-nums">16:00까지</dd>
          </dl>
          <a
            href="/booking"
            onClick={go}
            className="inline-flex w-fit items-center rounded-full bg-glacier px-7 py-3 text-base font-semibold md:px-8 md:py-4 md:text-lg text-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
          >
            예약하기
          </a>
        </motion.div>
      </div>

      {/* 사업자 정보 */}
      <div className="mt-8 flex flex-col gap-1.5 border-t border-black/[.12] pt-4 text-[11px] leading-relaxed md:mt-12 md:gap-2 md:pt-5 text-[#0a0a0a]/50 md:text-[13px]">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span>© 2026 주식회사 에이비씨웍스글로벌</span>
          <a href="/terms" className="text-[#0a0a0a]/80 hover:text-[#0a0a0a]">이용약관</a>
          <a href="/privacy" className="font-semibold text-[#0a0a0a]/80 hover:text-[#0a0a0a]">개인정보처리방침</a>
          <a href="/refund-policy" className="text-[#0a0a0a]/80 hover:text-[#0a0a0a]">취소·환불정책</a>
          <a href="/booking/lookup" onClick={go} className="text-[#0a0a0a]/80 hover:text-[#0a0a0a]">예약 조회·취소</a>
        </p>
        <p>
          대표 황혜진 · 사업자등록번호 442-87-01602 · 통신판매업신고 제2021-서울강서-1055호 · 서울특별시 강서구 마곡중앙로 171, 5층 513호 씨(마곡동) · campingclub2020@naver.com
        </p>
      </div>
    </motion.footer>
  );
}
