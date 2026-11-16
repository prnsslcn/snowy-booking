-- 0001_extensions.sql
-- 확장 + 공용 유틸 + 기본 권한 정리.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;   -- (uuid, date) = 연산 exclusion 제약용
create extension if not exists pg_cron;

-- ── 함수 기본 권한 ────────────────────────────────────────────────────────────
-- Supabase는 public 스키마에 새로 만든 함수의 EXECUTE를 anon·authenticated에 기본 부여한다.
-- 그러면 브라우저에 노출된 anon 키로 /rest/v1/rpc/<함수> 를 직접 호출할 수 있다
-- (security definer 함수라면 RLS도 우회). grill-booking에서 실제로 확인된 문제.
-- → 기본 부여를 끊고, 각 함수마다 필요한 롤에만 명시적으로 GRANT 한다.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- 테이블도 기본 노출을 끊고 0006_rls.sql 에서 명시적으로 GRANT 한다.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- ── updated_at 자동 갱신 ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── KST 오늘 날짜 (DB 쪽 단일 출처; TS는 lib/policy/booking-window.ts) ─────────
create or replace function public.kst_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

-- ── 결제 대기 선점 유지 시간 (TS PENDING_PAYMENT_MINUTES 와 일치) ──────────────
create or replace function public.pending_payment_timeout()
returns interval
language sql
immutable
as $$
  select interval '10 minutes';
$$;

-- ── 예약 '활성'(유닛·1인1일 점유) 상태 집합 — 인덱스 predicate 와 쿼리 공용 ─────
create or replace function public.is_active_status(p_status text)
returns boolean
language sql
immutable
as $$
  select p_status in ('pending_payment', 'confirmed', 'cancel_requested', 'checked_in', 'checked_out');
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.kst_today() from public, anon, authenticated;
revoke all on function public.pending_payment_timeout() from public, anon, authenticated;
revoke all on function public.is_active_status(text) from public, anon, authenticated;
grant execute on function public.kst_today() to service_role;
grant execute on function public.pending_payment_timeout() to service_role;
grant execute on function public.is_active_status(text) to service_role;
