'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * 진입 공지 팝업(관리자 일반설정 notice_popup). '오늘 하루 보지 않기'는 브라우저 저장(편의 기능).
 * <dialog> + @starting-style 로 중앙에서 scale(0.96)+opacity 등장(모달은 중앙 기준).
 */
export function NoticePopup({ id, title, body }: { id: string; title?: string; body?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const key = `snowy-notice-hide:${id}`;

  useEffect(() => {
    let hidden = false;
    try {
      hidden = localStorage.getItem(key) === new Date().toDateString();
    } catch {
      // 저장소 접근 불가(사생활 모드 등) — 그냥 보여준다
    }
    if (!hidden) ref.current?.showModal();
  }, [key]);

  function close(hideToday: boolean) {
    if (hideToday) {
      try {
        localStorage.setItem(key, new Date().toDateString());
      } catch {
        // 무시
      }
    }
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      onClick={(e) => e.target === ref.current && close(false)}
      className="notice-dialog m-auto w-[min(92vw,420px)] rounded-[24px] bg-surface p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="p-6">
        <p className="text-[13px] font-semibold text-accent">공지</p>
        {title && <h2 className="mt-1.5 text-[20px] font-bold">{title}</h2>}
        {body && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{body}</p>}
      </div>
      <div className="flex gap-2 border-t border-line-soft p-3">
        <Button variant="ghost" className="flex-1" onClick={() => close(true)}>
          오늘 하루 보지 않기
        </Button>
        <Button variant="dark" className="flex-1" onClick={() => close(false)}>
          닫기
        </Button>
      </div>
      <style>{`
        .notice-dialog[open] {
          opacity: 1; transform: scale(1);
          transition: opacity 240ms var(--ease-out), transform 240ms var(--ease-out), overlay 240ms allow-discrete, display 240ms allow-discrete;
          @starting-style { opacity: 0; transform: scale(0.96); }
        }
        .notice-dialog { opacity: 0; transform: scale(0.98);
          transition: opacity 160ms ease, transform 160ms ease, overlay 160ms allow-discrete, display 160ms allow-discrete; }
        .notice-dialog::backdrop { transition: background-color 240ms ease; }
        @media (prefers-reduced-motion: reduce) { .notice-dialog, .notice-dialog[open] { transform: none; } }
      `}</style>
    </dialog>
  );
}
