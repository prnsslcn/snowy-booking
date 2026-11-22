-- 결제 대기 선점 유지 시간 5분 → 10분 (2026-11-23 운영자 결정)
-- 앱카드·3DS 인증이 5분을 넘기는 경우가 있어서(토스 승인 유효시간 약 10분). 0012 를 되돌림.
-- TS lib/policy/booking-window.ts PENDING_PAYMENT_MINUTES 와 일치. 이미 선점된 건은 그대로(새 선점부터 10분).
create or replace function public.pending_payment_timeout()
returns interval
language sql
immutable
as $$
  select interval '10 minutes';
$$;

revoke all on function public.pending_payment_timeout() from public, anon, authenticated;
grant execute on function public.pending_payment_timeout() to service_role;
