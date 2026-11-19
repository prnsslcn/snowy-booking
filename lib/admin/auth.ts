import 'server-only';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

/**
 * 관리자 인증 경계(grill-booking 동일). 세션 기반 서버 클라이언트(RLS)로 admins self-read.
 * 관리자 확인 뒤의 조회·변경은 서비스 롤(lib/supabase/admin.ts) — DB 함수가 service_role 전용이라서.
 */
export interface AdminUser {
  id: string;
  email: string;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase.from('admins').select('id, email').eq('id', user.id).maybeSingle();
  return admin ? { id: admin.id, email: admin.email } : null;
}

/** 미인증·비관리자면 로그인으로. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  return admin;
}
