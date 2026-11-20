'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/Field';
import { createClient } from '@/lib/supabase/client';
import { Snowflake } from '@/components/ui/Snowflake';

/** 관리자 로그인 — Supabase Auth 이메일·비밀번호. 계정은 운영자가 직접 발급(CLAUDE.md §8). */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-canvas px-5">
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex h-10 items-center gap-1 rounded-full pr-3.5 pl-2.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-ice-600/[.07] hover:text-ink md:top-6 md:left-6"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3.5 5.5 8l4.5 4.5" />
        </svg>
        홈으로
      </Link>

      <div className="w-full max-w-[360px]">
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-2xl bg-white ring-1 ring-line">
          <Snowflake size={24} className="text-ice-600" />
        </span>
        <p className="kicker mt-6">Snowy Cabana &amp; Caravan</p>
        <h1 className="mt-1 font-display text-[34px] font-semibold tracking-[-0.02em]">Admin</h1>
        <form onSubmit={login} className="panel mt-6 space-y-4">
          <label className="block">
            <span className="field-label">이메일</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className={fieldClass('light', '', 'cs')} />
          </label>
          <label className="block">
            <span className="field-label">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={!!error}
              className={fieldClass('light', '', 'cs')}
            />
            {error && <span className="mt-1.5 block text-[13px] text-[#d4351c]">{error}</span>}
          </label>
          <Button type="submit" size="cs" className="mt-1 w-full" disabled={loading || !email || !password}>
            {loading ? '로그인 중…' : '로그인'}
          </Button>
        </form>
      </div>
    </main>
  );
}
