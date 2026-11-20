'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/Field';
import { createClient } from '@/lib/supabase/client';

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
    <main className="flex min-h-[100dvh] items-center justify-center bg-night px-5">
      <div className="w-full max-w-[380px]">
        <p className="font-display text-[12px] font-medium tracking-[0.04em] text-ice-50/50">Snowy Cabana &amp; Caravan</p>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] text-ice-50">운영 콘솔</h1>
        <form onSubmit={login} className="mt-7 space-y-4 rounded-xl bg-white p-6 md:p-7">
          <label className="block">
            <span className="field-label">이메일</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className={fieldClass('light', '', 'cs')} />
          </label>
          <label className="block">
            <span className="field-label">비밀번호</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" aria-invalid={!!error} className={fieldClass('light', '', 'cs')} />
            {error && <span className="mt-1.5 block text-[13px] text-[#d4351c]">{error}</span>}
          </label>
          <Button type="submit" size="cs" className="w-full" disabled={loading || !email || !password}>
            {loading ? '로그인 중…' : '로그인'}
          </Button>
        </form>
      </div>
    </main>
  );
}
