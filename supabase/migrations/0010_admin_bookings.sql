-- 0010_admin_bookings.sql
-- 관리자: 유선·무상 예약, 배정 변경·맞바꾸기, 입실·퇴실, 유닛 점검·비활성화.
-- 모두 service_role 전용(앱 서버가 관리자 인증 확인 후 호출). 감사 로그는 앱이 admin_actions 에 기록.

-- ── 유선·무상 예약 생성 ───────────────────────────────────────────────────────
-- 1인 1일 제한 없음, 조회코드 없음, 즉시 confirmed. 잠금일·당일 마감·시즌은 관리자 권한으로 무시.
create or replace function public.admin_create_booking(
  p_type           text,
  p_date           date,
  p_source         text,
  p_guest_name     text,
  p_guest_phone    text,
  p_guest_count    int,
  p_amount         int  default null,   -- null = 정상가(price_for)
  p_payment_method text default null,   -- offline 필수: cash/card/transfer
  p_note           text default null
)
returns table (booking_id uuid, order_id text, amount int, unit_label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pt      public.product_types%rowtype;
  v_phone   text := nullif(regexp_replace(coalesce(p_guest_phone, ''), '\D', '', 'g'), '');
  v_name    text := btrim(coalesce(p_guest_name, ''));
  v_unit_id uuid;
  v_label   text;
  v_price   record;
  v_amount  int;
  v_order   text;
  v_id      uuid;
begin
  if p_source not in ('offline', 'comp') then raise exception 'INVALID_SOURCE'; end if;
  select * into v_pt from public.product_types pt where pt.type = p_type;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if v_name = '' then raise exception 'NAME_REQUIRED'; end if;
  if v_phone is not null and v_phone !~ '^[0-9]{9,11}$' then raise exception 'INVALID_PHONE'; end if;
  if p_guest_count is null or p_guest_count < 1 then raise exception 'INVALID_GUEST_COUNT'; end if;
  if p_guest_count > v_pt.max_capacity then raise exception 'OVER_CAPACITY'; end if;
  if p_date is null or p_date < public.kst_today() then raise exception 'PAST_DATE'; end if;
  if exists (select 1 from public.closed_dates cd where cd.date = p_date) then raise exception 'DATE_CLOSED'; end if;
  if p_source = 'offline' and coalesce(p_payment_method, '') not in ('cash', 'card', 'transfer') then
    raise exception 'PAYMENT_METHOD_REQUIRED';
  end if;
  if p_amount is not null and p_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;

  perform public.lock_type_date(p_type, p_date);
  perform public.expire_stale_pending(p_type, p_date);

  v_unit_id := public.pick_free_unit(p_type, p_date);
  if v_unit_id is null then raise exception 'SOLD_OUT'; end if;
  select u.label into v_label from public.units u where u.id = v_unit_id;

  select * into v_price from public.price_for(p_type, p_date);
  v_amount := case when p_source = 'comp' then 0 else coalesce(p_amount, v_price.unit_price) end;

  v_order := 'SNW-' || to_char(p_date, 'YYYYMMDD') || '-'
             || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.bookings (
    order_id, source, type, unit_id, date, guest_name, guest_phone, guest_count,
    amount, price_snapshot, status, offline_payment_method, note
  ) values (
    v_order, p_source, p_type, v_unit_id, p_date, v_name, v_phone, p_guest_count,
    v_amount,
    jsonb_build_object(
      'unit_price',   v_price.unit_price,
      'rate_kind',    v_price.rate_kind,
      'type_name',    v_pt.name,
      'max_capacity', v_pt.max_capacity,
      'base_amount',  v_amount,
      'extras',       '[]'::jsonb
    ),
    'confirmed',
    case when p_source = 'offline' then p_payment_method end,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning id into v_id;

  booking_id := v_id; order_id := v_order; amount := v_amount; unit_label := v_label;
  return next;
end;
$$;

-- ── 유선 예약 내용 변경 (grill-booking 0033 extras 구조) ────────────────────────
-- 최종 금액 = base_amount + Σ extras.amount (extras 음수 허용: 현장 할인 등). null 인자는 '변경 없음'.
create or replace function public.admin_update_offline_booking(
  p_booking_id     uuid,
  p_base_amount    int   default null,
  p_extras         jsonb default null,   -- [{label, amount}]
  p_payment_method text  default null,
  p_guest_name     text  default null,
  p_guest_phone    text  default null,
  p_guest_count    int   default null,
  p_note           text  default null
)
returns table (amount int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b      public.bookings%rowtype;
  v_max    int;
  v_base   int;
  v_extras jsonb := '[]'::jsonb;
  v_item   jsonb;
  v_label  text;
  v_amt    int;
  v_total  int;
  v_phone  text;
begin
  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_b.source <> 'offline' then raise exception 'NOT_OFFLINE'; end if;
  if v_b.status not in ('confirmed', 'checked_in', 'checked_out') then raise exception 'NOT_EDITABLE'; end if;

  v_base := coalesce(p_base_amount, (v_b.price_snapshot->>'base_amount')::int, v_b.amount);
  if v_base < 0 then raise exception 'INVALID_AMOUNT'; end if;

  if p_extras is null then
    v_extras := coalesce(v_b.price_snapshot->'extras', '[]'::jsonb);
  else
    for v_item in select * from jsonb_array_elements(p_extras) loop
      v_label := btrim(coalesce(v_item->>'label', ''));
      v_amt := coalesce((v_item->>'amount')::int, 0);
      if v_label = '' and v_amt = 0 then continue; end if;
      if v_label = '' then v_label := '현장 조정'; end if;
      v_extras := v_extras || jsonb_build_object('label', v_label, 'amount', v_amt);
    end loop;
  end if;

  select v_base + coalesce(sum((e->>'amount')::int), 0) into v_total
  from jsonb_array_elements(v_extras) e;
  if v_total < 0 then raise exception 'INVALID_AMOUNT'; end if;

  if p_payment_method is not null and p_payment_method not in ('cash', 'card', 'transfer') then
    raise exception 'PAYMENT_METHOD_REQUIRED';
  end if;
  if p_guest_count is not null then
    select pt.max_capacity into v_max from public.product_types pt where pt.type = v_b.type;
    if p_guest_count < 1 then raise exception 'INVALID_GUEST_COUNT'; end if;
    if p_guest_count > v_max then raise exception 'OVER_CAPACITY'; end if;
  end if;
  if p_guest_name is not null and btrim(p_guest_name) = '' then raise exception 'NAME_REQUIRED'; end if;
  if p_guest_phone is not null then
    v_phone := nullif(regexp_replace(p_guest_phone, '\D', '', 'g'), '');
    if v_phone is not null and v_phone !~ '^[0-9]{9,11}$' then raise exception 'INVALID_PHONE'; end if;
  end if;

  update public.bookings b
     set amount = v_total,
         price_snapshot = b.price_snapshot
                          || jsonb_build_object('base_amount', v_base, 'extras', v_extras),
         offline_payment_method = coalesce(p_payment_method, b.offline_payment_method),
         guest_name = coalesce(btrim(p_guest_name), b.guest_name),
         guest_phone = case when p_guest_phone is null then b.guest_phone else v_phone end,
         guest_count = coalesce(p_guest_count, b.guest_count),
         note = case when p_note is null then b.note else nullif(btrim(p_note), '') end
   where b.id = p_booking_id;

  amount := v_total;
  return next;
end;
$$;

-- ── 유선·무상 취소 (토스 없음) ────────────────────────────────────────────────
create or replace function public.admin_cancel_offline_booking(p_booking_id uuid)
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
  if v_b.source not in ('offline', 'comp') then raise exception 'NOT_OFFLINE'; end if;
  if v_b.status not in ('confirmed', 'checked_in', 'checked_out') then raise exception 'NOT_CANCELLABLE'; end if;
  update public.bookings set status = 'cancelled' where id = p_booking_id;
end;
$$;

-- ── 배정 변경: 같은 유형·같은 날짜의 빈 유닛으로 ──────────────────────────────
create or replace function public.admin_reassign_unit(p_booking_id uuid, p_new_unit_id uuid)
returns table (from_label text, to_label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b    public.bookings%rowtype;
  v_unit public.units%rowtype;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  perform public.lock_type_date(v_b.type, v_b.date);
  perform public.expire_stale_pending(v_b.type, v_b.date);

  select * into v_b from public.bookings where id = p_booking_id for update;
  if not public.is_active_status(v_b.status) then raise exception 'NOT_ACTIVE'; end if;

  select * into v_unit from public.units where id = p_new_unit_id for share;
  if not found or v_unit.type <> v_b.type or not v_unit.is_active then raise exception 'UNIT_NOT_AVAILABLE'; end if;

  select u.label into from_label from public.units u where u.id = v_b.unit_id;
  to_label := v_unit.label;
  if p_new_unit_id = v_b.unit_id then return next; return; end if;

  if public.unit_blacked_out(p_new_unit_id, v_b.date) or exists (
    select 1 from public.bookings b
    where b.unit_id = p_new_unit_id and b.date = v_b.date and public.is_active_status(b.status)
  ) then
    raise exception 'UNIT_NOT_AVAILABLE';
  end if;

  update public.bookings set unit_id = p_new_unit_id where id = p_booking_id;
  return next;
end;
$$;

-- ── 맞바꾸기: 같은 유형·같은 날짜 두 예약의 유닛 교환 (exclusion 제약이 문장 끝 검사라 한 문장으로 가능) ──
create or replace function public.admin_swap_units(p_booking_a uuid, p_booking_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.bookings%rowtype;
  v_b public.bookings%rowtype;
begin
  if p_booking_a = p_booking_b then raise exception 'SAME_BOOKING'; end if;
  select * into v_a from public.bookings where id = p_booking_a;
  select * into v_b from public.bookings where id = p_booking_b;
  if v_a.id is null or v_b.id is null then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_a.type <> v_b.type or v_a.date <> v_b.date then raise exception 'NOT_SWAPPABLE'; end if;

  perform public.lock_type_date(v_a.type, v_a.date);

  -- id 순서로 잠가 교착 방지
  perform 1 from public.bookings where id in (p_booking_a, p_booking_b) order by id for update;
  select * into v_a from public.bookings where id = p_booking_a;
  select * into v_b from public.bookings where id = p_booking_b;
  if not public.is_active_status(v_a.status) or not public.is_active_status(v_b.status) then
    raise exception 'NOT_ACTIVE';
  end if;

  update public.bookings
     set unit_id = case id when p_booking_a then v_b.unit_id else v_a.unit_id end
   where id in (p_booking_a, p_booking_b);
end;
$$;

-- ── 입실·퇴실·되돌리기 ───────────────────────────────────────────────────────
create or replace function public.admin_check_in(p_booking_id uuid)
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
  if v_b.status <> 'confirmed' then raise exception 'NOT_CHECKIN_ABLE'; end if;
  if v_b.date > public.kst_today() then raise exception 'FUTURE_DATE'; end if;
  update public.bookings set status = 'checked_in', checked_in_at = now() where id = p_booking_id;
end;
$$;

create or replace function public.admin_check_out(p_booking_id uuid)
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
  if v_b.status <> 'checked_in' then raise exception 'NOT_CHECKED_IN'; end if;
  update public.bookings set status = 'checked_out', checked_out_at = now() where id = p_booking_id;
end;
$$;

create or replace function public.admin_undo_check(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
begin
  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_b.status = 'checked_out' then
    update public.bookings set status = 'checked_in', checked_out_at = null where id = p_booking_id;
    return 'checked_in';
  elsif v_b.status = 'checked_in' then
    update public.bookings set status = 'confirmed', checked_in_at = null where id = p_booking_id;
    return 'confirmed';
  end if;
  raise exception 'NOTHING_TO_UNDO';
end;
$$;

-- ── 점검 등록: 경고 → 수동 이동 → 서버 확인 → 잠그기 (booking-flow §7) ─────────

-- 경고창용: 기간 내 이 유닛에 배정된 활성 예약 + 그 날짜 같은 유형 빈 유닛 목록
create or replace function public.blackout_conflicts(p_unit_id uuid, p_from date, p_to date)
returns table (
  booking_id  uuid,
  date        date,
  guest_name  text,
  guest_phone text,
  status      text,
  source      text,
  free_units  jsonb   -- [{id, label}]
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.date, b.guest_name, b.guest_phone, b.status, b.source,
         coalesce((
           select jsonb_agg(jsonb_build_object('id', u.id, 'label', u.label) order by u.sort)
           from public.units u
           where u.type = b.type and u.is_active and u.id <> p_unit_id
             and not public.unit_blacked_out(u.id, b.date)
             and not exists (
               select 1 from public.bookings x
               where x.unit_id = u.id and x.date = b.date and public.is_active_status(x.status)
             )
         ), '[]'::jsonb)
  from public.bookings b
  where b.unit_id = p_unit_id
    and b.date between p_from and p_to
    and public.is_active_status(b.status)
    and not (b.status = 'pending_payment' and b.expires_at <= now())
  order by b.date;
$$;

create or replace function public.admin_create_blackout(
  p_unit_id uuid,
  p_from    date,
  p_to      date,
  p_reason  text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit public.units%rowtype;
  v_day  date;
  v_id   uuid;
begin
  if p_from is null or p_to is null or p_from > p_to then raise exception 'INVALID_RANGE'; end if;
  if p_to - p_from > 366 then raise exception 'RANGE_TOO_LONG'; end if;

  select * into v_unit from public.units where id = p_unit_id;
  if not found then raise exception 'UNIT_NOT_FOUND'; end if;

  -- 기간 내 각 날짜를 오름차순으로 잠가 온라인 선점·배정 변경과 직렬화
  for v_day in select d::date from generate_series(p_from, p_to, interval '1 day') d loop
    perform public.lock_type_date(v_unit.type, v_day);
  end loop;

  update public.bookings
     set status = 'cancelled'
   where unit_id = p_unit_id and status = 'pending_payment'
     and expires_at <= now() and date between p_from and p_to;

  if exists (
    select 1 from public.bookings b
    where b.unit_id = p_unit_id and b.date between p_from and p_to and public.is_active_status(b.status)
  ) then
    raise exception 'BLACKOUT_CONFLICT';
  end if;

  begin
    insert into public.unit_blackouts (unit_id, from_date, to_date, reason)
    values (p_unit_id, p_from, p_to, nullif(btrim(coalesce(p_reason, '')), ''))
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'BLACKOUT_OVERLAP';
  end;

  return v_id;
end;
$$;

create or replace function public.admin_delete_blackout(p_blackout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.unit_blackouts where id = p_blackout_id;
  if not found then raise exception 'BLACKOUT_NOT_FOUND'; end if;
end;
$$;

-- ── 유닛 추가·활성 전환 ──────────────────────────────────────────────────────
create or replace function public.admin_add_unit(p_type text, p_label text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if btrim(coalesce(p_label, '')) = '' then raise exception 'LABEL_REQUIRED'; end if;
  insert into public.units (type, label, sort)
  values (p_type, btrim(p_label),
          coalesce((select max(u.sort) from public.units u where u.type = p_type), 0) + 1)
  returning id into v_id;
  return v_id;
exception
  when unique_violation then raise exception 'LABEL_DUPLICATE';
  when foreign_key_violation then raise exception 'PRODUCT_NOT_FOUND';
end;
$$;

-- 비활성화 시 오늘 이후 활성 예약이 있으면 거부(점검과 같은 '먼저 옮기기' 절차).
-- 유닛 행 UPDATE 잠금 ↔ pick_free_unit 의 FOR SHARE 로 동시 배정과 직렬화.
create or replace function public.admin_set_unit_active(p_unit_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.units set is_active = p_active where id = p_unit_id;
  if not found then raise exception 'UNIT_NOT_FOUND'; end if;
  if not p_active and exists (
    select 1 from public.bookings b
    where b.unit_id = p_unit_id and b.date >= public.kst_today()
      and public.is_active_status(b.status)
      and not (b.status = 'pending_payment' and b.expires_at <= now())
  ) then
    raise exception 'UNIT_HAS_BOOKINGS';
  end if;
end;
$$;

-- ── 권한 ─────────────────────────────────────────────────────────────────────
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.admin_create_booking(text, date, text, text, text, int, int, text, text)',
    'public.admin_update_offline_booking(uuid, int, jsonb, text, text, text, int, text)',
    'public.admin_cancel_offline_booking(uuid)',
    'public.admin_reassign_unit(uuid, uuid)',
    'public.admin_swap_units(uuid, uuid)',
    'public.admin_check_in(uuid)',
    'public.admin_check_out(uuid)',
    'public.admin_undo_check(uuid)',
    'public.blackout_conflicts(uuid, date, date)',
    'public.admin_create_blackout(uuid, date, date, text)',
    'public.admin_delete_blackout(uuid)',
    'public.admin_add_unit(text, text)',
    'public.admin_set_unit_active(uuid, boolean)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
