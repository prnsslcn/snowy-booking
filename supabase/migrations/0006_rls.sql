-- 0006_rls.sql
-- 모든 테이블 RLS. 고객 쓰기는 서버(service_role) + security definer 함수만.
-- 테이블 GRANT 를 명시한다(Supabase 신규 기본값: 새 테이블은 Data API 롤에 자동 노출되지 않음).

alter table public.product_types   enable row level security;
alter table public.units           enable row level security;
alter table public.holidays        enable row level security;
alter table public.peak_periods    enable row level security;
alter table public.closed_dates    enable row level security;
alter table public.locked_dates    enable row level security;
alter table public.unit_blackouts  enable row level security;
alter table public.bookings        enable row level security;
alter table public.payments        enable row level security;
alter table public.admins          enable row level security;
alter table public.admin_actions   enable row level security;
alter table public.notifications   enable row level security;
alter table public.lookup_attempts enable row level security;
alter table public.site_settings   enable row level security;

-- ── service_role: 전체 (RLS 우회 롤) ─────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ── 공개 읽기: 달력·상품 표시용 최소 정보 ──────────────────────────────────────
grant select on public.product_types, public.holidays, public.peak_periods,
                public.closed_dates, public.locked_dates
  to anon, authenticated;

create policy product_types_read on public.product_types for select to anon, authenticated using (true);
create policy holidays_read      on public.holidays      for select to anon, authenticated using (true);
create policy peak_periods_read  on public.peak_periods  for select to anon, authenticated using (true);
create policy closed_dates_read  on public.closed_dates  for select to anon, authenticated using (true);
create policy locked_dates_read  on public.locked_dates  for select to anon, authenticated using (true);

-- ── 관리자 쓰기 (단순 마스터 데이터) ────────────────────────────────────────────
grant insert, update, delete on public.product_types, public.holidays, public.peak_periods,
                                public.closed_dates, public.locked_dates
  to authenticated;

create policy product_types_admin_write on public.product_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy holidays_admin_write on public.holidays for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy peak_periods_admin_write on public.peak_periods for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy closed_dates_admin_write on public.closed_dates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy locked_dates_admin_write on public.locked_dates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── 관리자 읽기 전용 (쓰기는 service_role 함수 경유) ────────────────────────────
grant select on public.units, public.unit_blackouts, public.bookings, public.payments,
                public.admin_actions, public.notifications
  to authenticated;

create policy units_admin_read          on public.units          for select to authenticated using (public.is_admin());
create policy unit_blackouts_admin_read on public.unit_blackouts for select to authenticated using (public.is_admin());
create policy bookings_admin_read       on public.bookings       for select to authenticated using (public.is_admin());
create policy payments_admin_read       on public.payments       for select to authenticated using (public.is_admin());
create policy admin_actions_admin_read  on public.admin_actions  for select to authenticated using (public.is_admin());
create policy notifications_admin_read  on public.notifications  for select to authenticated using (public.is_admin());

-- ── admins: 본인 행만 ─────────────────────────────────────────────────────────
grant select on public.admins to authenticated;
create policy admins_self_read on public.admins for select to authenticated using (id = auth.uid());

-- lookup_attempts, site_settings: 정책 없음 → service_role 전용.
