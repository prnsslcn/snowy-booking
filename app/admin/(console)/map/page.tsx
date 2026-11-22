import { redirect } from 'next/navigation';

/** 예전 배치도(Beta) 주소 — 현장 배정으로 합쳐짐(2026-11-23) */
export default async function MapRedirect({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  redirect(date ? `/admin/board?date=${encodeURIComponent(date)}` : '/admin/board');
}
