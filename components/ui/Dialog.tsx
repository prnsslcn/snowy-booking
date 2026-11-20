'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { buttonClass } from '@/components/ui/Button';

/*
  브라우저 기본 confirm/prompt 대신 쓰는 우리 팝업.
  - 어디서든 `await confirmDialog('제목\n설명')` / `await promptDialog('제목', '기본값')` 로 부른다.
  - 화면마다 <DialogHost /> 를 한 번 둔다(관리자 틀·손님 레이아웃).
  - 손님·관리자 CSS 둘 다에 있는 공용 토큰(ink·ice·glacier)만 쓴다.
  메시지의 첫 줄은 제목, 나머지는 설명으로 보인다.
*/

type Req = {
  id: number;
  kind: 'confirm' | 'prompt';
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  defaultValue: string;
  resolve: (v: boolean | string | null) => void;
};

export type DialogOptions = { confirmLabel?: string; cancelLabel?: string; danger?: boolean };

let current: Req | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function open(kind: Req['kind'], message: string, opts: DialogOptions & { defaultValue?: string }) {
  return new Promise<boolean | string | null>((resolve) => {
    // 이미 열려 있으면 앞의 것은 취소로 닫는다
    current?.resolve(current.kind === 'confirm' ? false : null);
    const [title, ...rest] = message.split('\n');
    current = {
      id: ++seq,
      kind,
      title,
      body: rest.join('\n').trim(),
      confirmLabel: opts.confirmLabel ?? '확인',
      cancelLabel: opts.cancelLabel ?? '취소',
      danger: opts.danger ?? false,
      defaultValue: opts.defaultValue ?? '',
      resolve,
    };
    emit();
  });
}

/** 확인 팝업 — 확인 true / 취소 false */
export function confirmDialog(message: string, opts: DialogOptions = {}) {
  return open('confirm', message, opts) as Promise<boolean>;
}

/** 입력 팝업 — 입력값 / 취소 null */
export function promptDialog(message: string, defaultValue = '', opts: DialogOptions = {}) {
  return open('prompt', message, { ...opts, defaultValue }) as Promise<string | null>;
}

function close(value: boolean | string | null) {
  const r = current;
  current = null;
  emit();
  r?.resolve(value);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function DialogHost() {
  const req = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  return <AnimatePresence>{req && <DialogView key={req.id} req={req} />}</AnimatePresence>;
}

function DialogView({ req }: { req: Req }) {
  const [value, setValue] = useState(req.defaultValue);
  const okRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancel = () => close(req.kind === 'confirm' ? false : null);
  const ok = () => close(req.kind === 'confirm' ? true : value.trim() || null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    if (req.kind === 'prompt') inputRef.current?.select();
    else okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/35 p-3 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(e) => e.target === e.currentTarget && cancel()}
    >
      <motion.form
        role={req.kind === 'confirm' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="dlg-title"
        aria-describedby={req.body ? 'dlg-body' : undefined}
        className="w-full max-w-[400px] rounded-2xl bg-white p-6 text-ink shadow-[0_24px_60px_-12px_rgb(14_26_43/0.35)]"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={(e) => {
          e.preventDefault();
          ok();
        }}
      >
        <h2 id="dlg-title" className="text-[17px] leading-snug font-semibold tracking-[-0.01em]">
          {req.title}
        </h2>
        {req.body && (
          <p id="dlg-body" className="mt-2 text-[14px] leading-relaxed whitespace-pre-line text-ink/60">
            {req.body}
          </p>
        )}
        {req.kind === 'prompt' && (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={req.title}
            className="mt-4 h-11 w-full rounded-lg border border-black/[.12] bg-white px-3 text-[16px] outline-none focus:border-ice-600 focus:ring-4 focus:ring-ice-200/50 sm:text-[14px]"
          />
        )}
        <div className="mt-6 flex gap-2 sm:justify-end">
          <button type="button" onClick={cancel} className={buttonClass('tint', 'cs', 'flex-1 sm:flex-none')}>
            {req.cancelLabel}
          </button>
          <button
            ref={okRef}
            type="submit"
            disabled={req.kind === 'prompt' && !value.trim()}
            className={buttonClass('primary', 'cs', `flex-1 sm:flex-none ${req.danger ? '!bg-[#d4351c] hover:!bg-[#b42d18]' : ''}`)}
          >
            {req.confirmLabel}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
