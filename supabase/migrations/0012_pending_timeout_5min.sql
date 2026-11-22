-- 결제 대기 선점 유지 시간 10분 → 5분 (2026-11-23 운영자 결정, 오픈 날 몰림 대비)
-- TS lib/policy/booking-window.ts PENDING_PAYMENT_MINUTES 와 일치.
-- 만료 후 결제가 들어오면 confirm 이 BOOKING_NOT_PENDING → 앱이 토스 보상 취소(기존 흐름).
-- 이미 선점된 건의 expires_at 은 그대로(새 선점부터 5분).
create or replace function public.pending_payment_timeout()
returns interval
language sql
immutable
as $$
  select interval '5 minutes';
$$;

revoke all on function public.pending_payment_timeout() from public, anon, authenticated;
grant execute on function public.pending_payment_timeout() to service_role;
