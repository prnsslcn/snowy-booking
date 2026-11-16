-- 0002_products_units.sql
-- 상품 유형(요금 포함) + 개별 유닛. 수량은 units 행 수로만 관리(유닛 개별 등록형).

create table public.product_types (
  type          text primary key check (type ~ '^[a-z_]+$'),
  name          text not null,
  slug          text not null unique,
  max_capacity  int  not null check (max_capacity > 0),
  price_weekday int  not null check (price_weekday > 0),
  price_weekend int  not null check (price_weekend > 0),
  is_active     boolean not null default true,
  sort          int  not null default 0,
  updated_at    timestamptz not null default now()
);

create trigger product_types_updated_at
  before update on public.product_types
  for each row execute function public.set_updated_at();

create table public.units (
  id         uuid primary key default gen_random_uuid(),
  type       text not null references public.product_types (type),
  label      text not null,                  -- 관리자 전용(고객 비노출)
  sort       int  not null,                  -- 내부 자동 가배정 순서
  is_active  boolean not null default true,  -- false = 영구 철수
  created_at timestamptz not null default now(),
  unique (type, label)
);

create index units_type_sort_idx on public.units (type, sort);

-- ── 시드 (CLAUDE.md §1) ──────────────────────────────────────────────────────
insert into public.product_types (type, name, slug, max_capacity, price_weekday, price_weekend, sort) values
  ('cabana',        '카바나',     'cabana',        6,  70000,  90000, 1),
  ('caravan',       '카라반',     'caravan',       8, 100000, 120000, 2),
  ('caravan_group', '단체카라반', 'caravan-group', 14, 170000, 210000, 3);

insert into public.units (type, label, sort)
select 'cabana', '카바나 ' || n || '호', n from generate_series(1, 30) n;
insert into public.units (type, label, sort)
select 'caravan', '카라반 ' || n || '호', n from generate_series(1, 9) n;
insert into public.units (type, label, sort)
select 'caravan_group', '단체카라반 ' || n || '호', n from generate_series(1, 2) n;
