-- 0014_security_hardening.sql
-- 출시 전 보안·운영 점검(2026-11-23)에서 나온 DB 쪽 수정.
--  1) 취소 동시 요청 이중 환불 방지: 취소 진행 중 잠금(cancel_lock_until, 2분)
--  2) 환불율 기준 고정: 처음 취소 요청한 시각(cancel_requested_at) — 실패 후 다음 날 재시도해도 같은 환불율
--  3) 고객이 지난 날짜 예약을 취소하지 못하게(규정상 0원 + 매출에서 사라지는 문제)
--  4) 계좌 직접 환불도 취소 진행 중이면 막음
--  5) 조회 시도 제한을 원자적으로(동시 요청으로 5회 제한을 넘지 못하게)
--  6) 예약 선점 요청 횟수 제한(IP 기준) — 재고 싹쓸이 방지
--  7) 유닛 철수 시 시간 지난 결제 대기도 정리
--  8) 특수(S1·S2) 상품이 실수로 온라인 판매되지 않게 제약

-- ── 1·2) 취소 진행 잠금 + 첫 요청 시각 ───────────────────────────────────────
alter table public.bookings
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists cancel_lock_until   timestamptz;

-- 반환 컬럼이 바뀌므로 다시 만든다(시그니처 동일 → 권한 다시 부여)
drop function if exists public.request_cancel_tx(text, boolean);
create function public.request_cancel_tx(
  p_order_id       text,
  p_admin_override boolean default false
)
returns table (
  booking_id   uuid,
  payment_key  text,
  paid_amount  int,
  usage_date   date,
  outcome      text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b   public.bookings%rowtype;
  v_key text;
begin
  select b.* into v_b from public.bookings b where b.order_id = p_order_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_b.source <> 'online' then raise exception 'NOT_ONLINE'; end if;

  if v_b.status = 'refunded' then
    booking_id := v_b.id; paid_amount := v_b.amount; usage_date := v_b.date; outcome := 'ALREADY_REFUNDED';
    requested_at := v_b.cancel_requested_at;
    return next; return;
  end if;

  if not (
    v_b.status in ('confirmed', 'cancel_requested')
    or (p_admin_override and v_b.status in ('checked_in', 'checked_out'))
  ) then
    raise exception 'NOT_CANCELLABLE';
  end if;

  -- 지난 이용일은 규정 취소 불가(관리자 전액 환불만)
  if not p_admin_override and v_b.status = 'confirmed' and v_b.date < public.kst_today() then
    raise exception 'NOT_CANCELLABLE';
  end if;

  -- 다른 취소가 진행 중(토스 호출 중)이면 거절 — 동시 요청이 각각 부분 취소를 보내는 이중 환불 방지
  if v_b.status = 'cancel_requested' and v_b.cancel_lock_until is not null and v_b.cancel_lock_until > now() then
    raise exception 'CANCEL_IN_PROGRESS';
  end if;

  update public.bookings
     set status = 'cancel_requested',
         cancel_requested_at = coalesce(cancel_requested_at, now()),
         cancel_lock_until = now() + interval '2 minutes'
   where id = v_b.id
  returning cancel_requested_at into requested_at;

  select p.toss_payment_key into v_key
  from public.payments p
  where p.booking_id = v_b.id and p.status = 'paid'
  limit 1;

  booking_id := v_b.id;
  payment_key := v_key;   -- paid 결제 없으면 null
  paid_amount := v_b.amount;
  usage_date := v_b.date;
  outcome := 'CANCEL_REQUESTED';
  return next;
end;
$$;

-- 토스 취소 실패 기록 — 잠금을 풀어 관리자가 바로 재시도할 수 있게
create or replace function public.record_cancel_error(p_booking_id uuid, p_code text, p_message text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.bookings
     set cancel_error = jsonb_build_object('code', p_code, 'message', p_message, 'at', now()),
         cancel_lock_until = null
   where id = p_booking_id;
$$;

-- ── 4) 계좌 직접 환불: 취소 진행 중이면 거절 ──────────────────────────────────
create or replace function public.admin_manual_refund_tx(
  p_booking_id uuid,
  p_amount     int,
  p_note       text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
begin
  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_b.source <> 'online' then raise exception 'NOT_ONLINE'; end if;
  if v_b.status not in ('confirmed', 'cancel_requested', 'checked_in', 'checked_out') then
    raise exception 'NOT_CANCELLABLE';
  end if;
  if v_b.status = 'cancel_requested' and v_b.cancel_lock_until is not null and v_b.cancel_lock_until > now() then
    raise exception 'CANCEL_IN_PROGRESS';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_b.amount then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.bookings
     set status = 'refunded',
         refund_amount = p_amount,
         refunded_at = now(),
         refund_method = 'manual',
         manual_refund_note = nullif(btrim(coalesce(p_note, '')), ''),
         cancel_error = null,
         cancel_lock_until = null
   where id = p_booking_id;
end;
$$;

-- ── 5) 조회 시도: 세기 + 기록을 한 번에(번호·IP 잠금) ─────────────────────────
-- 실패로 먼저 기록하고, 맞으면 앱이 success=true 로 바꾼다. 제한 초과면 TOO_MANY_ATTEMPTS.
create or replace function public.lookup_attempt_begin(
  p_phone          text,
  p_ip             inet,
  p_window_minutes int,
  p_max_phone      int,
  p_max_ip         int
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(mins => p_window_minutes);
  v_id    bigint;
begin
  perform pg_advisory_xact_lock(hashtext('lookup:phone:' || coalesce(p_phone, '')));
  if p_ip is not null then
    perform pg_advisory_xact_lock(hashtext('lookup:ip:' || host(p_ip)));
  end if;

  if (select count(*) from public.lookup_attempts
       where phone = p_phone and not success and attempted_at >= v_since) >= p_max_phone
     or (p_ip is not null and (select count(*) from public.lookup_attempts
       where ip = p_ip and not success and attempted_at >= v_since) >= p_max_ip) then
    raise exception 'TOO_MANY_ATTEMPTS';
  end if;

  insert into public.lookup_attempts (phone, ip, success) values (p_phone, p_ip, false)
  returning id into v_id;
  return v_id;
end;
$$;

create index if not exists lookup_attempts_ip_idx on public.lookup_attempts (ip, attempted_at);

-- ── 6) 요청 횟수 제한(범용) ──────────────────────────────────────────────────
create table if not exists public.rate_events (
  id   bigint generated always as identity primary key,
  kind text not null,
  key  text not null,
  at   timestamptz not null default now()
);
create index if not exists rate_events_kind_key_at_idx on public.rate_events (kind, key, at);
alter table public.rate_events enable row level security;   -- 정책 없음 = anon·authenticated 접근 불가
revoke all on public.rate_events from anon, authenticated;

-- 창(초) 안에 p_max 번 미만이면 기록하고 true, 아니면 false. 같은 키는 잠금으로 직렬화.
create or replace function public.rate_hit(p_kind text, p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('rate:' || p_kind || ':' || p_key));
  if (select count(*) from public.rate_events
       where kind = p_kind and key = p_key and at >= now() - make_interval(secs => p_window_seconds)) >= p_max then
    return false;
  end if;
  insert into public.rate_events (kind, key) values (p_kind, p_key);
  return true;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-rate-events') then
    perform cron.unschedule('purge-rate-events');
  end if;
end $$;
select cron.schedule('purge-rate-events', '27 4 * * *',
  $$ delete from public.rate_events where at < now() - interval '2 days'; $$);

-- ── 7) 유닛 철수: 시간 지난 결제 대기는 먼저 정리 ──────────────────────────────
create or replace function public.admin_set_unit_active(p_unit_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.units set is_active = p_active where id = p_unit_id;
  if not found then raise exception 'UNIT_NOT_FOUND'; end if;
  if not p_active then
    update public.bookings
       set status = 'cancelled'
     where unit_id = p_unit_id and status = 'pending_payment' and expires_at <= now();
    if exists (
      select 1 from public.bookings b
      where b.unit_id = p_unit_id and b.date >= public.kst_today()
        and public.is_active_status(b.status)
    ) then
      raise exception 'UNIT_HAS_BOOKINGS';
    end if;
  end if;
end;
$$;

-- ── 8) 특수 상품은 온라인 판매(is_active) 불가 ─────────────────────────────────
alter table public.product_types
  drop constraint if exists product_types_special_offline;
alter table public.product_types
  add constraint product_types_special_offline check (type <> 'special' or not is_active);

-- ── 권한 ─────────────────────────────────────────────────────────────────────
revoke all on function public.request_cancel_tx(text, boolean) from public, anon, authenticated;
revoke all on function public.record_cancel_error(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_manual_refund_tx(uuid, int, text) from public, anon, authenticated;
revoke all on function public.lookup_attempt_begin(text, inet, int, int, int) from public, anon, authenticated;
revoke all on function public.rate_hit(text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_set_unit_active(uuid, boolean) from public, anon, authenticated;
grant execute on function public.request_cancel_tx(text, boolean) to service_role;
grant execute on function public.record_cancel_error(uuid, text, text) to service_role;
grant execute on function public.admin_manual_refund_tx(uuid, int, text) to service_role;
grant execute on function public.lookup_attempt_begin(text, inet, int, int, int) to service_role;
grant execute on function public.rate_hit(text, text, int, int) to service_role;
grant execute on function public.admin_set_unit_active(uuid, boolean) to service_role;
grant select, insert, delete on public.rate_events to service_role;
