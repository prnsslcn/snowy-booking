-- 0007_pricing_availability.sql
-- 요금 판정(단일 출처) + 재고 계산 공용 헬퍼 + 달력용 availability.

-- ── 요금 ─────────────────────────────────────────────────────────────────────
-- 주말 요금일 = 성수기 기간 ∪ 금·토·일 ∪ 공휴일 ∪ 공휴일 전날 (CLAUDE.md §4)
create or replace function public.is_weekend_rate(p_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.peak_periods pp where p_date between pp.from_date and pp.to_date)
      or extract(isodow from p_date) in (5, 6, 7)
      or exists (select 1 from public.holidays h where h.date in (p_date, p_date + 1));
$$;

create or replace function public.price_for(p_type text, p_date date)
returns table (unit_price int, rate_kind text)
language sql
stable
security definer
set search_path = public
as $$
  select case when w.is_weekend then pt.price_weekend else pt.price_weekday end,
         case when w.is_weekend then 'weekend' else 'weekday' end
  from public.product_types pt
  cross join lateral (select public.is_weekend_rate(p_date) as is_weekend) w
  where pt.type = p_type;
$$;

-- ── 재고 공용 헬퍼 (내부용; 외부 롤에 실행 권한 없음) ───────────────────────────

-- (type, date) 단위 배정 직렬화. 트랜잭션 종료 시 자동 해제.
-- 유닛 행 FOR UPDATE 대신 이걸 쓰는 이유: 유닛 행 잠금은 날짜와 무관하게 걸려
-- 다른 날짜 동시 예약을 '매진'으로 오판할 수 있다(docs/booking-flow.md §1 [5]).
create or replace function public.lock_type_date(p_type text, p_date date)
returns void
language sql
as $$
  select pg_advisory_xact_lock(hashtextextended('snowy:td:' || p_type || ':' || p_date::text, 0));
$$;

-- 휴대폰·날짜 단위 직렬화(같은 번호의 동시 예약 시도). 항상 lock_type_date 보다 먼저 잡는다.
create or replace function public.lock_phone_date(p_phone text, p_date date)
returns void
language sql
as $$
  select pg_advisory_xact_lock(hashtextextended('snowy:pd:' || p_phone || ':' || p_date::text, 0));
$$;

-- 만료된 결제 대기 즉시 회수(지연 회수). 해당 (type, date) 범위만.
create or replace function public.expire_stale_pending(p_type text, p_date date)
returns int
language plpgsql
as $$
declare
  v_count int;
begin
  update public.bookings
     set status = 'cancelled'
   where status = 'pending_payment'
     and expires_at <= now()
     and type = p_type
     and date = p_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 그 날짜에 유닛이 점검 중인지
create or replace function public.unit_blacked_out(p_unit_id uuid, p_date date)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.unit_blackouts ub
    where ub.unit_id = p_unit_id and p_date between ub.from_date and ub.to_date
  );
$$;

-- 그 날짜에 배정 가능한 빈 유닛 하나(sort 순). 호출자가 lock_type_date 를 잡은 상태여야 한다.
-- FOR SHARE: 동시에 유닛 비활성화(admin_set_unit_active)와 직렬화.
create or replace function public.pick_free_unit(p_type text, p_date date)
returns uuid
language sql
as $$
  select u.id
  from public.units u
  where u.type = p_type
    and u.is_active
    and not public.unit_blacked_out(u.id, p_date)
    and not exists (
      select 1 from public.bookings b
      where b.unit_id = u.id and b.date = p_date and public.is_active_status(b.status)
    )
  order by u.sort
  limit 1
  for share of u;
$$;

-- ── 달력·상품 선택용 잔여 현황 ────────────────────────────────────────────────
-- day_status: closed(휴장) / locked(예약마감) / out_of_season / open
-- remaining 은 reserve_booking 의 배정 조건과 동일하게 '실제로 배정 가능한 유닛 수'.
-- 예약 가능 기간(1개월)·당일 마감·영업 종료는 TS(lib/policy)에서 판정.
create or replace function public.availability(p_from date, p_to date)
returns table (
  date        date,
  type        text,
  total_units int,
  remaining   int,
  unit_price  int,
  rate_kind   text,
  day_status  text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings public.site_settings%rowtype;
begin
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'INVALID_RANGE';
  end if;
  if p_to - p_from > 92 then
    raise exception 'RANGE_TOO_LONG';
  end if;

  select * into v_settings from public.site_settings limit 1;

  return query
  with days as (
    select d::date as day from generate_series(p_from, p_to, interval '1 day') d
  )
  select
    days.day,
    pt.type,
    (select count(*)::int from public.units u where u.type = pt.type and u.is_active),
    (select count(*)::int
       from public.units u
      where u.type = pt.type
        and u.is_active
        and not public.unit_blacked_out(u.id, days.day)
        and not exists (
          select 1 from public.bookings b
          where b.unit_id = u.id
            and b.date = days.day
            and public.is_active_status(b.status)
            -- 아직 스윕 안 된 만료 pending 은 빈 자리로 본다
            and not (b.status = 'pending_payment' and b.expires_at <= now())
        )),
    pr.unit_price,
    pr.rate_kind,
    case
      when exists (select 1 from public.closed_dates cd where cd.date = days.day) then 'closed'
      when exists (select 1 from public.locked_dates ld where ld.date = days.day) then 'locked'
      when (v_settings.season_from is not null and days.day < v_settings.season_from)
        or (v_settings.season_to is not null and days.day > v_settings.season_to) then 'out_of_season'
      else 'open'
    end
  from days
  cross join public.product_types pt
  cross join lateral public.price_for(pt.type, days.day) pr
  where pt.is_active
  order by days.day, pt.sort;
end;
$$;

-- ── 권한 ─────────────────────────────────────────────────────────────────────
revoke all on function public.is_weekend_rate(date) from public, anon, authenticated;
revoke all on function public.price_for(text, date) from public, anon, authenticated;
revoke all on function public.lock_type_date(text, date) from public, anon, authenticated;
revoke all on function public.lock_phone_date(text, date) from public, anon, authenticated;
revoke all on function public.expire_stale_pending(text, date) from public, anon, authenticated;
revoke all on function public.unit_blacked_out(uuid, date) from public, anon, authenticated;
revoke all on function public.pick_free_unit(text, date) from public, anon, authenticated;
revoke all on function public.availability(date, date) from public, anon, authenticated;

grant execute on function public.is_weekend_rate(date) to service_role;
grant execute on function public.price_for(text, date) to service_role;
grant execute on function public.availability(date, date) to service_role;
