-- 0008_reserve_confirm.sql
-- 온라인 선점(pending_payment) → 결제 승인 후 확정 → 만료 회수.
-- 전부 security definer + service_role 전용. 흐름: docs/booking-flow.md §1.

-- ── 선점 ─────────────────────────────────────────────────────────────────────
create or replace function public.reserve_booking(
  p_type        text,
  p_date        date,
  p_guest_name  text,
  p_guest_phone text,
  p_guest_count int
)
returns table (
  booking_id  uuid,
  order_id    text,
  lookup_code text,
  amount      int,
  order_name  text,
  expires_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.site_settings%rowtype;
  v_pt       public.product_types%rowtype;
  v_phone    text := regexp_replace(coalesce(p_guest_phone, ''), '\D', '', 'g');
  v_name     text := btrim(coalesce(p_guest_name, ''));
  v_unit_id  uuid;
  v_price    record;
  v_order_id text;
  v_code     text;
  v_expires  timestamptz := now() + public.pending_payment_timeout();
  v_id       uuid;
  v_cname    text;
begin
  -- 1) 입력 검증
  select * into v_settings from public.site_settings limit 1;
  if v_settings.business_closed then raise exception 'BUSINESS_CLOSED'; end if;

  select * into v_pt from public.product_types pt where pt.type = p_type and pt.is_active;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;

  if v_name = '' then raise exception 'NAME_REQUIRED'; end if;
  if v_phone !~ '^01[0-9]{8,9}$' then raise exception 'INVALID_PHONE'; end if;
  if p_guest_count is null or p_guest_count < 1 then raise exception 'INVALID_GUEST_COUNT'; end if;
  if p_guest_count > v_pt.max_capacity then raise exception 'OVER_CAPACITY'; end if;

  -- 2) 날짜 검증 (1개월·16시 마감은 서버 라우트에서; 여기선 과거일 방어)
  if p_date is null or p_date < public.kst_today() then raise exception 'OUT_OF_WINDOW'; end if;
  if (v_settings.season_from is not null and p_date < v_settings.season_from)
     or (v_settings.season_to is not null and p_date > v_settings.season_to) then
    raise exception 'OUT_OF_SEASON';
  end if;
  if exists (select 1 from public.closed_dates cd where cd.date = p_date) then raise exception 'DATE_CLOSED'; end if;
  if exists (select 1 from public.locked_dates ld where ld.date = p_date) then raise exception 'DATE_LOCKED'; end if;

  -- 3) 직렬화: 휴대폰·날짜 → 유형·날짜 (항상 이 순서)
  perform public.lock_phone_date(v_phone, p_date);
  perform public.lock_type_date(p_type, p_date);

  -- 4) 지연 회수: 이 유형·날짜의 만료 pending
  perform public.expire_stale_pending(p_type, p_date);

  -- 5) 같은 번호·같은 날짜의 '결제 대기'는 재시도로 보고 대체(결제창 닫고 다시 시도한 경우).
  --    이전 건이 뒤늦게 승인되면 confirm 단계에서 BOOKING_NOT_PENDING → 앱이 토스 보상 취소.
  update public.bookings b
     set status = 'cancelled'
   where b.source = 'online'
     and b.guest_phone = v_phone
     and b.date = p_date
     and b.status = 'pending_payment';

  -- 6) 이미 확정된 같은 번호·같은 날짜 예약 → 1인 1일 1동
  if exists (
    select 1 from public.bookings b
    where b.source = 'online' and b.guest_phone = v_phone and b.date = p_date
      and public.is_active_status(b.status)
  ) then
    raise exception 'DUPLICATE_PHONE_DATE';
  end if;

  -- 7) 빈 유닛 가배정
  v_unit_id := public.pick_free_unit(p_type, p_date);
  if v_unit_id is null then raise exception 'SOLD_OUT'; end if;

  -- 8) 금액 (DB 권위)
  select * into v_price from public.price_for(p_type, p_date);

  -- 9) 식별자: 토스 orderId(긴 값) + 고객용 4자리
  v_order_id := 'SNW-' || to_char(p_date, 'YYYYMMDD') || '-'
                || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  -- 같은 번호의 과거 예약 전체와도 겹치지 않게(조회 시 모호함 방지). 휴대폰 잠금 보유 중.
  for i in 1..50 loop
    v_code := lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (
      select 1 from public.bookings b where b.guest_phone = v_phone and b.lookup_code = v_code
    );
    v_code := null;
  end loop;
  if v_code is null then raise exception 'LOOKUP_CODE_EXHAUSTED'; end if;

  -- 10) 삽입 (제약이 최종 방어선)
  begin
    insert into public.bookings (
      order_id, lookup_code, source, type, unit_id, date,
      guest_name, guest_phone, guest_count, amount, price_snapshot, status, expires_at
    ) values (
      v_order_id, v_code, 'online', p_type, v_unit_id, p_date,
      v_name, v_phone, p_guest_count, v_price.unit_price,
      jsonb_build_object(
        'unit_price',   v_price.unit_price,
        'rate_kind',    v_price.rate_kind,
        'type_name',    v_pt.name,
        'max_capacity', v_pt.max_capacity,
        'base_amount',  v_price.unit_price,
        'extras',       '[]'::jsonb
      ),
      'pending_payment', v_expires
    )
    returning id into v_id;
  exception
    when unique_violation or exclusion_violation then
      get stacked diagnostics v_cname = constraint_name;
      if v_cname = 'bookings_phone_date_active_uq' then
        raise exception 'DUPLICATE_PHONE_DATE';
      end if;
      raise exception 'SOLD_OUT';  -- bookings_unit_date_active (정상 경로에선 발생하지 않음)
  end;

  booking_id  := v_id;
  order_id    := v_order_id;
  lookup_code := v_code;
  amount      := v_price.unit_price;
  order_name  := '스노위 ' || v_pt.name || ' ' || to_char(p_date, 'MM/DD');
  expires_at  := v_expires;
  return next;
end;
$$;

-- ── 결제창 이탈·실패 시 즉시 자리 반환 (/booking/fail) ─────────────────────────
create or replace function public.release_pending_booking(p_order_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.bookings
     set status = 'cancelled'
   where order_id = p_order_id and status = 'pending_payment';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- ── 결제 승인 재검증 후 확정 (grill-booking 0011 구조) ─────────────────────────
-- 토스 승인 API(외부)는 앱이 호출, 이 함수는 검증 + payments + booking 을 한 트랜잭션으로.
create or replace function public.confirm_booking_tx(
  p_order_id    text,
  p_payment_key text,
  p_amount      int,
  p_method      text,
  p_approved_at timestamptz,
  p_raw         jsonb
)
returns table (booking_id uuid, lookup_code text, outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
begin
  select b.* into v_b from public.bookings b where b.order_id = p_order_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  -- 멱등: 이미 확정(또는 그 이후 상태)
  if v_b.status in ('confirmed', 'checked_in', 'checked_out') then
    booking_id := v_b.id; lookup_code := v_b.lookup_code; outcome := 'ALREADY_CONFIRMED';
    return next; return;
  end if;

  -- 만료 회수·재시도 대체 등으로 pending 이 아니면 확정 불가 → 앱이 토스 보상 취소
  if v_b.status <> 'pending_payment' then raise exception 'BOOKING_NOT_PENDING'; end if;

  if p_amount is distinct from v_b.amount then raise exception 'AMOUNT_MISMATCH'; end if;

  begin
    insert into public.payments (booking_id, toss_payment_key, toss_order_id, amount,
                                 status, method, approved_at, raw_response)
    values (v_b.id, p_payment_key, p_order_id, p_amount, 'paid', p_method, p_approved_at, p_raw);
  exception when unique_violation then
    booking_id := v_b.id; lookup_code := v_b.lookup_code; outcome := 'ALREADY_CONFIRMED';
    return next; return;
  end;

  update public.bookings set status = 'confirmed', expires_at = null where id = v_b.id;

  booking_id := v_b.id; lookup_code := v_b.lookup_code; outcome := 'CONFIRMED';
  return next;
end;
$$;

-- ── 만료 스윕 (pg_cron 1분) ──────────────────────────────────────────────────
create or replace function public.expire_pending_bookings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.bookings
     set status = 'cancelled'
   where status = 'pending_payment' and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-pending-bookings') then
    perform cron.unschedule('expire-pending-bookings');
  end if;
end $$;

select cron.schedule('expire-pending-bookings', '* * * * *', $$ select public.expire_pending_bookings(); $$);

-- 조회 시도 기록 30일 보관
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-lookup-attempts') then
    perform cron.unschedule('purge-lookup-attempts');
  end if;
end $$;

select cron.schedule('purge-lookup-attempts', '17 4 * * *',
  $$ delete from public.lookup_attempts where attempted_at < now() - interval '30 days'; $$);

-- ── 권한 ─────────────────────────────────────────────────────────────────────
revoke all on function public.reserve_booking(text, date, text, text, int) from public, anon, authenticated;
revoke all on function public.release_pending_booking(text) from public, anon, authenticated;
revoke all on function public.confirm_booking_tx(text, text, int, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.expire_pending_bookings() from public, anon, authenticated;

grant execute on function public.reserve_booking(text, date, text, text, int) to service_role;
grant execute on function public.release_pending_booking(text) to service_role;
grant execute on function public.confirm_booking_tx(text, text, int, text, timestamptz, jsonb) to service_role;
grant execute on function public.expire_pending_bookings() to service_role;
