'use client';

import { useState } from 'react';

import { buttonClass } from '@/components/ui/Button';

/** 글자 복사 버튼 — 복사되면 잠깐 '복사됨'. 클립보드를 못 쓰면 조용히 넘어간다. */
export function CopyButton({ text, label = '주소 복사', doneLabel = '복사됨' }: { text: string; label?: string; doneLabel?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass('secondary', 'sm')}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* 클립보드 권한 없음 — 무시 */
        }
      }}
    >
      {done ? doneLabel : label}
    </button>
  );
}
