-- 0009_refund.sql
-- 환불 DB 원자 부분. 토스 사전 조회·취소(외부)는 앱이 request_cancel_tx 와 finalize_refund_tx 사이에서 한다.
-- 정합성: 토스 취소 성공 → finalize. 실패 시 cancel_requested 유지 + record_cancel_error. (booking-flow §3)

-- ── 1단계: 취소 요청 ─────────────────────────────────────────────────────────
-- p_admin_override: 관리자 '전액 환불'(예외) — 입실/퇴실 상태도 허용
create or replace function public.request_cancel_tx(
  p_order_id       text,
  p_admin_override boolean default false
)
returns table (
  booking_id  uuid,
  payment_key text,
  paid_amount int,
  usage_date  date,
  outcome     text
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
    return next; return;
  end if;

  if not (
    v_b.status in ('confirmed', 'cancel_requested')
    or (p_admin_override and v_b.status in ('checked_in', 'checked_out'))
  ) then
    raise exception 'NOT_CANCELLABLE';
  end if;

  if v_b.status <> 'cancel_requested' then
    update public.bookings set status = 'cancel_requested' where id = v_b.id;
  end if;

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

-- ── 토스 취소 실패 기록 (관리자 화면에 원문 표시) ──────────────────────────────
create or replace function public.record_cancel_error(p_booking_id uuid, p_code text, p_message text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.bookings
     set cancel_error = jsonb_build_object('code', p_code, 'message', p_message, 'at', now())
   where id = p_booking_id;
$$;

-- ── 2단계: 환불 확정 ─────────────────────────────────────────────────────────
-- p_refund_method: 'toss'(토스 취소 성공 또는 사전조회로 이미 CANCELED 확인) / 'none'(0원 환불)
create or replace function public.finalize_refund_tx(
  p_booking_id    uuid,
  p_refund_amount int,
  p_refund_method text,
  p_is_partial    boolean,
  p_raw           jsonb
)
returns table (booking_id uuid, refunded_amount int, outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
begin
  select b.* into v_b from public.bookings b where b.id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  if v_b.status = 'refunded' then
    booking_id := v_b.id; refunded_amount := v_b.refund_amount; outcome := 'ALREADY_REFUNDED';
    return next; return;
  end if;

  if v_b.status <> 'cancel_requested' then raise exception 'NOT_CANCEL_REQUESTED'; end if;
  if p_refund_method not in ('toss', 'none') then raise exception 'INVALID_REFUND_METHOD'; end if;
  if p_refund_amount is null or p_refund_amount < 0 or p_refund_amount > v_b.amount then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_refund_method = 'none' and p_refund_amount <> 0 then raise exception 'INVALID_AMOUNT'; end if;

  if p_refund_method = 'toss' then
    update public.payments p
       set status = case when p_is_partial then 'partial_cancelled' else 'cancelled' end,
           cancelled_at = now(),
           raw_response = coalesce(p_raw, p.raw_response)
     where p.booking_id = p_booking_id and p.status = 'paid';
  end if;

  -- refunded 는 비활성 상태 → 유닛·1인1일 점유가 자동 해제된다
  update public.bookings
     set status = 'refunded',
         refund_amount = p_refund_amount,
         refunded_at = now(),
         refund_method = p_refund_method,
         cancel_error = null
   where id = p_booking_id;

  booking_id := v_b.id; refunded_amount := p_refund_amount; outcome := 'REFUNDED';
  return next;
end;
$$;

-- ── 계좌 직접 환불 (EXCEED_CANCEL_LIMIT 등 토스 취소 불가 시) ────────────────────
-- 토스 호출 없음, payments 는 paid 유지(토스 원장과 일치). booking 만 refunded.
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
  if p_amount is null or p_amount <= 0 or p_amount > v_b.amount then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.bookings
     set status = 'refunded',
         refund_amount = p_amount,
         refunded_at = now(),
         refund_method = 'manual',
         manual_refund_note = nullif(btrim(coalesce(p_note, '')), ''),
         cancel_error = null
   where id = p_booking_id;
end;
$$;

-- ── 권한 ─────────────────────────────────────────────────────────────────────
revoke all on function public.request_cancel_tx(text, boolean) from public, anon, authenticated;
revoke all on function public.record_cancel_error(uuid, text, text) from public, anon, authenticated;
revoke all on function public.finalize_refund_tx(uuid, int, text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.admin_manual_refund_tx(uuid, int, text) from public, anon, authenticated;

grant execute on function public.request_cancel_tx(text, boolean) to service_role;
grant execute on function public.record_cancel_error(uuid, text, text) to service_role;
grant execute on function public.finalize_refund_tx(uuid, int, text, boolean, jsonb) to service_role;
grant execute on function public.admin_manual_refund_tx(uuid, int, text) to service_role;
