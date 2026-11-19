import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/** 관리자 처리 기록(무엇을·언제). 계정 공유 운영이라 이메일은 계정 단위. */
export async function logAdminAction(email: string, action: string, bookingId: string | null, detail: Record<string, unknown> = {}) {
  await createAdminClient()
    .from('admin_actions')
    .insert({ admin_email: email, action, booking_id: bookingId, detail: detail as { [key: string]: Json } });
}
