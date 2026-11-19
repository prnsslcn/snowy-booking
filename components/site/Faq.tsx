'use client';

import { useId, useState } from 'react';

/*
  자주 묻는 질문 — grill-booking FaqAccordion 구조(홈 '자세히 보기'와 같은 움직임).
  질문 줄 + 원형 + 아이콘(열리면 45° 회전), grid-rows 0fr→1fr 로 높이 측정 없이 펼침. 기본 닫힘, 여러 개 동시 열림 가능.
*/

export interface FaqItem {
  q: string;
  a: string;
}

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

function Row({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-b border-ice-700/15">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-semibold md:text-[17px]">{item.q}</span>
        <span
          aria-hidden
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border border-ice-700/20 text-glacier transition-transform duration-700 ${EASE} ${open ? 'rotate-45' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div id={id} className={`grid transition-[grid-template-rows] duration-700 ${EASE} ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden" inert={!open}>
          <p
            className={`pb-5 pr-12 text-[14px] leading-relaxed text-ink/70 transition-[opacity,transform] duration-700 ${EASE} md:text-[15px] ${
              open ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
            }`}
          >
            {item.a}
          </p>
        </div>
      </div>
    </li>
  );
}

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <ul className="border-t border-ice-700/15">
      {items.map((it) => (
        <Row key={it.q} item={it} />
      ))}
    </ul>
  );
}
