-- 0004_bookings_payments.sql
-- 예약 + 결제. 재고 초과·중복의 최종 방어선은 이 파일의 제약들이다(docs/schema.md §3).

create table public.bookings (
  id                     uuid primary key default gen_random_uuid(),
  order_id               text not null unique check (order_id ~ '^[A-Za-z0-9_-]{6,64}$'),  -- 토스 orderId
  lookup_code            text check (lookup_code ~ '^[0-9]{4}$'),   -- 고객용 4자리(온라인만)
  source                 text not null check (source in ('online', 'offline', 'comp')),
  type                   text not null references public.product_types (type),
  unit_id                uuid not null references public.units (id),  -- 내부 가배정(고객 비노출)
  date                   date not null,                                -- 이용일(KST)
  guest_name             text not null check (btrim(guest_name) <> ''),
  guest_phone            text check (guest_phone ~ '^[0-9]{9,11}$'),  -- 숫자만
  guest_count            int  not null check (guest_count >= 1),
  amount                 int  not null check (amount >= 0),           -- 결제(청구) 금액
  price_snapshot         jsonb not null,
  status                 text not null check (status in (
                           'pending_payment', 'confirmed', 'cancel_requested', 'refunded',
                           'cancelled', 'checked_in', 'checked_out')),
  expires_at             timestamptz,
  offline_payment_method text check (offline_payment_method in ('cash', 'card', 'transfer')),
  note                   text,
  refund_amount          int,
  refunded_at            timestamptz,
  refund_method          text check (refund_method in ('toss', 'manual', 'none')),
  manual_refund_note     text,
  cancel_error           jsonb,   -- 마지막 토스 취소 실패 {code, message, at}
  checked_in_at          timestamptz,
  checked_out_at         timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- 온라인 예약: 휴대폰(010…) + 조회코드 필수
  constraint bookings_online_fields check (
    source <> 'online'
    or (guest_phone ~ '^01[0-9]{8,9}$' and lookup_code is not null)
  ),
  -- 유선: 결제수단 필수 / 그 외: 없음
  constraint bookings_offline_method check ((source = 'offline') = (offline_payment_method is not null)),
  -- 무상: 0원
  constraint bookings_comp_free check (source <> 'comp' or amount = 0),
  constraint bookings_pending_expiry check (status <> 'pending_payment' or expires_at is not null),
  constraint bookings_refund_range check (
    refund_amount is null or (refund_amount >= 0 and refund_amount <= amount)
  ),
  constraint bookings_refunded_fields check (
    status <> 'refunded' or (refund_method is not null and refund_amount is not null)
  ),

  -- ★ 재고 초과 방지 최종 방어선: 같은 유닛·같은 날짜 활성 예약 1건.
  --   unique index 대신 exclusion 제약을 쓰는 이유: DEFERRABLE 가능 → 두 예약의 유닛 맞바꾸기를
  --   UPDATE 한 문장으로 처리할 수 있다(문장 끝에서 검사).
  constraint bookings_unit_date_active
    exclude using gist (unit_id with =, date with =)
    where (public.is_active_status(status))
    deferrable initially immediate
);

-- ★ 1인 1일 1동: 같은 휴대폰·같은 날짜 온라인 활성 예약 1건 (관리자 유선·무상은 제외)
create unique index bookings_phone_date_active_uq
  on public.bookings (guest_phone, date)
  where source = 'online' and public.is_active_status(status);

-- 조회코드: 같은 휴대폰의 활성 예약 사이에서 유일
create unique index bookings_phone_code_active_uq
  on public.bookings (guest_phone, lookup_code)
  where lookup_code is not null and public.is_active_status(status);

create index bookings_date_type_idx on public.bookings (date, type);
create index bookings_phone_idx on public.bookings (guest_phone);
create index bookings_pending_expiry_idx on public.bookings (expires_at) where status = 'pending_payment';
create index bookings_status_idx on public.bookings (status);

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings (id),
  toss_payment_key text not null unique,
  toss_order_id    text not null unique,
  amount           int  not null check (amount > 0),
  status           text not null check (status in ('paid', 'cancelled', 'partial_cancelled')),
  method           text,
  approved_at      timestamptz,
  cancelled_at     timestamptz,
  raw_response     jsonb,
  created_at       timestamptz not null default now()
);

create index payments_booking_idx on public.payments (booking_id);
