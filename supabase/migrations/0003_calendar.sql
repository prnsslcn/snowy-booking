-- 0003_calendar.sql
-- 요금 판정용 달력(공휴일·성수기) + 운영 달력(휴장·예약마감) + 유닛 점검 기간.

create table public.holidays (
  date       date primary key,
  name       text not null,
  source     text not null default 'manual' check (source in ('api', 'manual')),
  created_at timestamptz not null default now()
);

create table public.peak_periods (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  from_date  date not null,
  to_date    date not null,
  created_at timestamptz not null default now(),
  check (from_date <= to_date)
);

-- 2026-27 동계 성수기 (확정, 양 끝 포함)
insert into public.peak_periods (name, from_date, to_date)
values ('2026-27 동계 성수기', '2026-12-24', '2027-02-09');

-- 휴장: 운영 안 함
create table public.closed_dates (
  date       date primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- 예약마감: 운영은 하되 신규 온라인 예약 차단(취소로 자리 나도 열리지 않음)
create table public.locked_dates (
  date       date primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- 유닛 운영 중지·점검 기간. 등록은 admin_create_blackout()(충돌 검사) 경유.
create table public.unit_blackouts (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null references public.units (id) on delete cascade,
  from_date  date not null,
  to_date    date not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (from_date <= to_date),
  -- 같은 유닛의 점검 기간 겹침 금지
  constraint unit_blackouts_no_overlap
    exclude using gist (unit_id with =, daterange(from_date, to_date, '[]') with &&)
);

create index unit_blackouts_unit_idx on public.unit_blackouts (unit_id, from_date, to_date);
