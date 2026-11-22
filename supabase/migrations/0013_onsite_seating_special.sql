-- 0013_onsite_seating_special.sql
-- (2026-11-23 운영자)
-- 1) 현장 선착순 배정: 예약 순서와 자리는 무관. 손님이 도착하면 원하는 빈자리를 주고 그 자리로 입실.
--    예약의 unit_id 는 그때까지 '가배정'(재고 계산용)일 뿐 → 도착 시 고른 유닛으로 옮기며(필요하면
--    아직 안 온 예약과 맞바꿈) 입실까지 한 트랜잭션으로 처리한다.
-- 2) 특수(S1·S2): 예약 오류·지인 방문 등 특수 상황에 관리자가 유선으로 등록하는 자리.
--    온라인 판매 안 함 → product_types.is_active = false (고객 화면·온라인 예약·가용성·점유율에서 빠짐).
--    등록은 admin_register_special 로만(무상 comp, 0원).

-- ── 특수 상품·유닛 ───────────────────────────────────────────────────────────
-- price_* 는 check(> 0) 때문에 1. 특수 등록은 항상 0원(comp)이라 쓰이지 않는다.
insert into public.product_types (type, name, slug, max_capacity, price_weekday, price_weekend, is_active, sort)
values ('special', '특수', 'special', 14, 1, 1, false, 9)
on conflict (type) do nothing;

insert into public.units (type, label, sort) values
  ('special', 'S1', 1),
  ('special', 'S2', 2)
on conflict (type, label) do nothing;

-- ── 현장 배정 + 입실 ─────────────────────────────────────────────────────────
-- p_booking_id 를 p_unit_id 자리에 앉힌다.
--  - 그 자리를 아직 안 온 예약(확정·결제 대기·환불 처리 중)이 가배정으로 잡고 있으면 서로 맞바꾼다.
--  - 이미 입실·퇴실한 손님 자리면 UNIT_OCCUPIED.
--  - 확정 상태면 입실까지 처리, 이미 입실한 손님이면 자리만 옮긴다.
-- 반환: 'seated'(배정+입실) / 'moved'(입실 손님 자리 이동)
create or replace function public.admin_seat_booking(p_booking_id uuid, p_unit_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b    public.bookings%rowtype;
  v_o    public.bookings%rowtype;
  v_unit public.units%rowtype;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  perform public.lock_type_date(v_b.type, v_b.date);
  perform public.expire_stale_pending(v_b.type, v_b.date);

  select * into v_b from public.bookings where id = p_booking_id for update;
  if v_b.status not in ('confirmed', 'checked_in') then raise exception 'NOT_SEATABLE'; end if;
  if v_b.date > public.kst_today() then raise exception 'FUTURE_DATE'; end if;

  select * into v_unit from public.units where id = p_unit_id for share;
  if not found or v_unit.type <> v_b.type or not v_unit.is_active then raise exception 'UNIT_NOT_AVAILABLE'; end if;
  if public.unit_blacked_out(p_unit_id, v_b.date) then raise exception 'UNIT_NOT_AVAILABLE'; end if;

  if p_unit_id <> v_b.unit_id then
    select * into v_o from public.bookings b
     where b.unit_id = p_unit_id and b.date = v_b.date and public.is_active_status(b.status)
     for update;
    if found then
      if v_o.status in ('checked_in', 'checked_out') then raise exception 'UNIT_OCCUPIED'; end if;
      -- 아직 안 온 예약과 맞바꿈(제약은 문장 끝 검사 → 한 문장)
      update public.bookings
         set unit_id = case id when v_b.id then p_unit_id else v_b.unit_id end
       where id in (v_b.id, v_o.id);
    else
      update public.bookings set unit_id = p_unit_id where id = v_b.id;
    end if;
  end if;

  if v_b.status = 'confirmed' then
    update public.bookings set status = 'checked_in', checked_in_at = now() where id = v_b.id;
    return 'seated';
  end if;
  return 'moved';
end;
$$;

-- ── 특수 자리 등록 (S1·S2) ───────────────────────────────────────────────────
-- 정한 유닛에 바로 등록. 무상(comp)·0원·확정. 휴장·잠금·시즌·1인1일 제한은 관리자 권한으로 무시.
create or replace function public.admin_register_special(
  p_unit_id     uuid,
  p_date        date,
  p_guest_name  text,
  p_guest_phone text default null,
  p_note        text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit  public.units%rowtype;
  v_name  text := btrim(coalesce(p_guest_name, ''));
  v_phone text := nullif(regexp_replace(coalesce(p_guest_phone, ''), '\D', '', 'g'), '');
  v_order text;
  v_id    uuid;
begin
  if v_name = '' then raise exception 'NAME_REQUIRED'; end if;
  if v_phone is not null and v_phone !~ '^[0-9]{9,11}$' then raise exception 'INVALID_PHONE'; end if;
  if p_date is null or p_date < public.kst_today() then raise exception 'PAST_DATE'; end if;

  select * into v_unit from public.units where id = p_unit_id;
  if not found or v_unit.type <> 'special' or not v_unit.is_active then raise exception 'UNIT_NOT_AVAILABLE'; end if;

  perform public.lock_type_date('special', p_date);
  if public.unit_blacked_out(p_unit_id, p_date) or exists (
    select 1 from public.bookings b
     where b.unit_id = p_unit_id and b.date = p_date and public.is_active_status(b.status)
  ) then
    raise exception 'UNIT_NOT_AVAILABLE';
  end if;

  v_order := 'SNW-' || to_char(p_date, 'YYYYMMDD') || '-'
             || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.bookings (
    order_id, source, type, unit_id, date, guest_name, guest_phone, guest_count,
    amount, price_snapshot, status, note
  ) values (
    v_order, 'comp', 'special', p_unit_id, p_date, v_name, v_phone, null,
    0,
    jsonb_build_object('unit_price', 0, 'rate_kind', 'special', 'type_name', '특수', 'base_amount', 0, 'extras', '[]'::jsonb),
    'confirmed',
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.admin_seat_booking(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_register_special(uuid, date, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_seat_booking(uuid, uuid) to service_role;
grant execute on function public.admin_register_special(uuid, date, text, text, text) to service_role;
