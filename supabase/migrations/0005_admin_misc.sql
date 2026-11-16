-- 0005_admin_misc.sql
-- 관리자 · 감사 로그 · 알림 이력 · 조회 시도 제한 · 사이트 설정.

-- ── 관리자 ───────────────────────────────────────────────────────────────────
-- 등록은 운영자가 직접(Supabase Auth 사용자 생성 후 이 테이블에 insert). 권한 구분 없음.
create table public.admins (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;

-- ── 감사 로그 (무엇을 언제 했는지; 계정 공유 운영이라 '누가'는 admin_email 수준) ──
create table public.admin_actions (
  id          bigint generated always as identity primary key,
  admin_email text,
  action      text not null,
  booking_id  uuid references public.bookings (id) on delete set null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index admin_actions_booking_idx on public.admin_actions (booking_id);
create index admin_actions_created_idx on public.admin_actions (created_at desc);

-- ── 알림 발송 이력 (Solapi SMS) ──────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  type       text not null check (type in ('confirm', 'cancel')),
  channel    text not null default 'sms' check (channel in ('sms', 'kakao_alimtalk')),
  recipient  text not null check (recipient in ('customer', 'admin')),
  status     text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at    timestamptz,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create index notifications_booking_idx on public.notifications (booking_id);

-- ── 예약 조회 시도 (4자리 추측 방지) ──────────────────────────────────────────
create table public.lookup_attempts (
  id           bigint generated always as identity primary key,
  phone        text,
  ip           inet,
  success      boolean not null,
  attempted_at timestamptz not null default now()
);

create index lookup_attempts_phone_idx on public.lookup_attempts (phone, attempted_at);
create index lookup_attempts_ip_idx on public.lookup_attempts (ip, attempted_at);

-- ── 사이트 설정 (단일 행) ────────────────────────────────────────────────────
create table public.site_settings (
  id              boolean primary key default true check (id),
  business_closed boolean not null default false,
  closed_title    text,
  closed_message  text,
  season_from     date,          -- null = 시즌 제한 없음 (시즌 일정 미정)
  season_to       date,
  notice_popup    jsonb not null default '{"enabled": false}'::jsonb,  -- {enabled,title,body,from,to}
  updated_at      timestamptz not null default now(),
  check (season_from is null or season_to is null or season_from <= season_to)
);

insert into public.site_settings (id) values (true);

create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();
