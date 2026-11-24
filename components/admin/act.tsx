'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

/* 관리자 설정 화면 공용 — 서버 액션 실행(진행 중·결과 문구) + 결과 문구 표시 */

export type Msg = { kind: 'error' | 'ok'; text: string } | null;

export function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-lg px-4 py-3 text-[13px] ${msg.kind === 'error' ? 'border border-[#d4351c]/20 bg-[#d4351c]/[.05] text-[#b42d18]' : 'bg-ice-100 text-ice-700'}`}>
      {msg.text}
    </p>
  );
}

export function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  function act<R extends { ok: boolean; error?: string }>(fn: () => Promise<R>, ok: string | ((r: R) => string)) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { kind: 'ok', text: typeof ok === 'function' ? ok(r) : ok } : { kind: 'error', text: r.error ?? '처리하지 못했습니다.' });
      router.refresh();
    });
  }
  return { pending, msg, act };
}
