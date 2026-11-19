import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin/auth';

/** 로그인한 관리자만 — 아니면 /admin/login 으로. */
export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
