-- scripts/db/smoke.sql — 로컬 DB 기능 검증 (전부 롤백, 데이터 남기지 않음)
-- 실행: scripts/db/run-tests.sh
\set ON_ERROR_STOP on
begin;

create function pg_temp.expect_error(p_sql text, p_code text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED % but succeeded: %', p_code, p_sql;
exception when others then
  if sqlerrm <> p_code then
    raise exception 'EXPECTED % got %: %', p_code, sqlerrm, p_sql;
  end if;
end $$;

create function pg_temp.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'FAIL: %', p_msg; end if;
  raise notice 'ok - %', p_msg;
end $$;

-- 날짜 기준: 오늘(KST) + 10일 — 성수기와 무관한 날을 쓰기 위해 고정일 대신 상대일
\set d '(public.kst_today() + 10)'

-- ── 1. 요금 판정 ─────────────────────────────────────────────────────────────
select pg_temp.ok(not public.is_weekend_rate('2026-11-19'), '11/19(목) 주중');
select pg_temp.ok(public.is_weekend_rate('2026-11-20'), '11/20(금) 주말');
select pg_temp.ok(public.is_weekend_rate('2026-11-22'), '11/22(일) 주말');
select pg_temp.ok(not public.is_weekend_rate('2026-11-23'), '11/23(월) 주중');
select pg_temp.ok(public.is_weekend_rate('2026-12-24'), '12/24(목) 성수기 시작');
select pg_temp.ok(public.is_weekend_rate('2027-02-09'), '2/9(화) 성수기 마지막날');
select pg_temp.ok(not public.is_weekend_rate('2027-02-10'), '2/10(수) 성수기 다음날 주중');
insert into public.holidays (date, name) values ('2026-11-25', '테스트 공휴일');
select pg_temp.ok(public.is_weekend_rate('2026-11-25'), '공휴일 당일 주말');
select pg_temp.ok(public.is_weekend_rate('2026-11-24'), '공휴일 전날 주말');
select pg_temp.ok(not public.is_weekend_rate('2026-11-26'), '공휴일 다음날 주중');
select pg_temp.ok((select unit_price from public.price_for('cabana', '2026-11-23')) = 70000, '카바나 주중 70,000');
select pg_temp.ok((select unit_price from public.price_for('caravan_group', '2026-11-20')) = 210000, '단체카라반 주말 210,000');

-- ── 2. 선점 검증 오류 ─────────────────────────────────────────────────────────
select pg_temp.expect_error(format($q$select public.reserve_booking('cabana', %s, '홍길동', '010-1111-2222', 7)$q$, :'d'), 'OVER_CAPACITY');
select pg_temp.expect_error(format($q$select public.reserve_booking('cabana', %s, '홍길동', '02-123-4567', 2)$q$, :'d'), 'INVALID_PHONE');
select pg_temp.expect_error($q$select public.reserve_booking('cabana', public.kst_today() - 1, '홍길동', '01011112222', 2)$q$, 'OUT_OF_WINDOW');
select pg_temp.expect_error(format($q$select public.reserve_booking('cabana', %s, '  ', '01011112222', 2)$q$, :'d'), 'NAME_REQUIRED');
insert into public.closed_dates (date) values (:d + 1);
select pg_temp.expect_error(format($q$select public.reserve_booking('cabana', %s + 1, '홍길동', '01011112222', 2)$q$, :'d'), 'DATE_CLOSED');
insert into public.locked_dates (date) values (:d + 2);
select pg_temp.expect_error(format($q$select public.reserve_booking('cabana', %s + 2, '홍길동', '01011112222', 2)$q$, :'d'), 'DATE_LOCKED');
update public.site_settings set season_from = :d + 3;
select pg_temp.expect_error(format($q$select public.reserve_booking('cabana', %s, '홍길동', '01011112222', 2)$q$, :'d'), 'OUT_OF_SEASON');
update public.site_settings set season_from = null, business_closed = true;
select pg_temp.expect_error(format($q$select public.reserve_booking('cabana', %s, '홍길동', '01011112222', 2)$q$, :'d'), 'BUSINESS_CLOSED');
update public.site_settings set business_closed = false;

-- ── 3. 선점 → 확정 ───────────────────────────────────────────────────────────
create temp table r1 as select * from public.reserve_booking('caravan', :d, '홍길동', '010-1111-2222', 8);
select pg_temp.ok((select lookup_code ~ '^[0-9]{4}$' from r1), '조회코드 4자리');
select pg_temp.ok((select order_id like 'SNW-%' from r1), 'orderId 형식');
select pg_temp.ok((select guest_phone from public.bookings where id = (select booking_id from r1)) = '01011112222', '휴대폰 숫자만 저장');

-- 같은 번호 재시도(결제창 닫고 다시) → 이전 pending 대체
create temp table r2 as select * from public.reserve_booking('cabana', :d, '홍길동', '01011112222', 2);
select pg_temp.ok((select status from public.bookings where id = (select booking_id from r1)) = 'cancelled', '재시도 시 이전 pending 취소');
select pg_temp.ok((select count(*) from public.bookings where guest_phone = '01011112222' and date = :d and public.is_active_status(status)) = 1, '같은 번호·날짜 활성 1건');

-- 금액 불일치 → 거부
select pg_temp.expect_error(format($q$select public.confirm_booking_tx(%L, 'pk_x', 1, 'card', now(), '{}')$q$, (select order_id from r2)), 'AMOUNT_MISMATCH');
-- 대체된 이전 건 승인 → 보상 대상
select pg_temp.expect_error(format($q$select public.confirm_booking_tx(%L, 'pk_old', 100000, 'card', now(), '{}')$q$, (select order_id from r1)), 'BOOKING_NOT_PENDING');

select pg_temp.ok((select outcome from public.confirm_booking_tx((select order_id from r2), 'pk_1', (select amount from r2), 'card', now(), '{}')) = 'CONFIRMED', '확정');
select pg_temp.ok((select outcome from public.confirm_booking_tx((select order_id from r2), 'pk_1', (select amount from r2), 'card', now(), '{}')) = 'ALREADY_CONFIRMED', '확정 멱등');

-- 확정 후 같은 번호·같은 날짜 → 1인 1일
select pg_temp.expect_error(format($q$select public.reserve_booking('caravan', %s, '홍길동', '010 1111 2222', 2)$q$, :'d'), 'DUPLICATE_PHONE_DATE');
-- 다른 날짜는 가능
create temp table r3 as select * from public.reserve_booking('caravan', :d + 4, '홍길동', '01011112222', 2);
select pg_temp.ok((select lookup_code from r3) <> (select lookup_code from r2), '같은 번호 조회코드 중복 없음');

-- ── 4. 유선 예약은 1인 1일 예외 ───────────────────────────────────────────────
select pg_temp.expect_error(format($q$select public.admin_create_booking('cabana', %s, 'offline', '홍길동', '01011112222', 2)$q$, :'d'), 'PAYMENT_METHOD_REQUIRED');
create temp table o1 as select * from public.admin_create_booking('cabana', :d, 'offline', '홍길동', '01011112222', 2, null, 'cash');
select pg_temp.ok((select amount from o1) = (select unit_price from public.price_for('cabana', :d)), '유선 기본 정상가');
select pg_temp.ok((select amount from public.admin_update_offline_booking((select booking_id from o1), null, '[{"label":"현장 할인","amount":-10000}]'::jsonb)) = (select amount from o1) - 10000, '유선 extras 조정');
create temp table c1 as select * from public.admin_create_booking('cabana', :d, 'comp', '지인', null, 3);
select pg_temp.ok((select amount from c1) = 0, '무상 0원');

-- ── 5. 매진 · 잔여 ───────────────────────────────────────────────────────────
select public.admin_create_booking('caravan_group', :d, 'offline', '단체' || n, null, 10, null, 'card') from generate_series(1, 2) n;
select pg_temp.ok((select remaining from public.availability(:d, :d) where type = 'caravan_group') = 0, '단체카라반 잔여 0');
select pg_temp.expect_error(format($q$select public.reserve_booking('caravan_group', %s, '김철수', '01033334444', 5)$q$, :'d'), 'SOLD_OUT');
select pg_temp.ok((select remaining from public.availability(:d, :d) where type = 'cabana') = 27, '카바나 잔여 30-3=27');
select pg_temp.ok((select day_status from public.availability(:d + 1, :d + 1) limit 1) = 'closed', 'availability 휴장 표시');

-- ── 6. 만료 회수 ─────────────────────────────────────────────────────────────
create temp table p1 as select * from public.reserve_booking('caravan_group', :d + 5, '이영희', '01055556666', 4);
update public.bookings set expires_at = now() - interval '1 second' where id = (select booking_id from p1);
select pg_temp.ok((select remaining from public.availability(:d + 5, :d + 5) where type = 'caravan_group') = 2, '만료 pending 은 잔여로 계산');
select pg_temp.ok(public.expire_pending_bookings() >= 1, '만료 스윕');
select pg_temp.ok((select status from public.bookings where id = (select booking_id from p1)) = 'cancelled', '만료 → cancelled');

-- ── 7. 점검 등록 흐름 ────────────────────────────────────────────────────────
create temp table tgt as select unit_id, id as bid from public.bookings where id = (select booking_id from r2);
select pg_temp.ok((select count(*) from public.blackout_conflicts((select unit_id from tgt), :d, :d)) = 1, '점검 충돌 1건 감지');
select pg_temp.ok(jsonb_array_length((select free_units from public.blackout_conflicts((select unit_id from tgt), :d, :d))) = 27, '옮길 빈 유닛 목록');
select pg_temp.expect_error(format($q$select public.admin_create_blackout(%L, %s, %s + 2, '정비')$q$, (select unit_id from tgt), :'d', :'d'), 'BLACKOUT_CONFLICT');
select public.admin_reassign_unit((select bid from tgt), (select (free_units->0->>'id')::uuid from public.blackout_conflicts((select unit_id from tgt), :d, :d)));
select pg_temp.ok(public.admin_create_blackout((select unit_id from tgt), :d, :d + 2, '정비') is not null, '옮긴 뒤 점검 등록');
select pg_temp.expect_error(format($q$select public.admin_create_blackout(%L, %s + 1, %s + 3, '중복')$q$, (select unit_id from tgt), :'d', :'d'), 'BLACKOUT_OVERLAP');
select pg_temp.ok((select remaining from public.availability(:d, :d) where type = 'cabana') = 26, '점검 유닛은 재고 제외');
select pg_temp.expect_error(format($q$select public.admin_reassign_unit(%L, %L)$q$, (select booking_id from o1), (select unit_id from tgt)), 'UNIT_NOT_AVAILABLE');

-- ── 8. 맞바꾸기 (exclusion 제약 deferrable) ────────────────────────────────────
create temp table sw as select (select unit_id from public.bookings where id = (select booking_id from o1)) ua,
                               (select unit_id from public.bookings where id = (select booking_id from c1)) ub;
select public.admin_swap_units((select booking_id from o1), (select booking_id from c1));
select pg_temp.ok((select unit_id from public.bookings where id = (select booking_id from o1)) = (select ub from sw), '맞바꾸기 A');
select pg_temp.ok((select unit_id from public.bookings where id = (select booking_id from c1)) = (select ua from sw), '맞바꾸기 B');

-- 활성 유닛 직접 중복 배정 → 제약이 차단
select pg_temp.expect_error(format($q$update public.bookings set unit_id = %L where id = %L$q$, (select ub from sw), (select booking_id from r2)), 'conflicting key value violates exclusion constraint "bookings_unit_date_active"');

-- ── 9. 입실 · 유닛 비활성화 ───────────────────────────────────────────────────
select pg_temp.expect_error(format($q$select public.admin_check_in(%L)$q$, (select booking_id from o1)), 'FUTURE_DATE');
select pg_temp.expect_error(format($q$select public.admin_set_unit_active(%L, false)$q$, (select ub from sw)), 'UNIT_HAS_BOOKINGS');

-- ── 10. 환불 ─────────────────────────────────────────────────────────────────
select pg_temp.ok((select outcome from public.request_cancel_tx((select order_id from r2))) = 'CANCEL_REQUESTED', '취소 요청');
select public.record_cancel_error((select booking_id from r2), 'EXCEED_CANCEL_LIMIT', '취소 한도 초과');
select pg_temp.ok((select cancel_error->>'code' from public.bookings where id = (select booking_id from r2)) = 'EXCEED_CANCEL_LIMIT', '취소 실패 기록');
select pg_temp.ok((select outcome from public.request_cancel_tx((select order_id from r2))) = 'CANCEL_REQUESTED', 'cancel_requested 재시도 허용');
select pg_temp.ok((select outcome from public.finalize_refund_tx((select booking_id from r2), (select amount from r2) / 2, 'toss', true, '{}')) = 'REFUNDED', '50% 환불 확정');
select pg_temp.ok((select status from public.payments where toss_order_id = (select order_id from r2)) = 'partial_cancelled', '결제 부분취소');
select pg_temp.ok((select refund_amount from public.bookings where id = (select booking_id from r2)) = (select amount from r2) / 2, '환불액 기록');
select pg_temp.ok((select outcome from public.finalize_refund_tx((select booking_id from r2), 0, 'toss', true, '{}')) = 'ALREADY_REFUNDED', '환불 멱등');
-- 환불 후 같은 날 재예약 가능
select pg_temp.ok((select order_id from public.reserve_booking('cabana', :d, '홍길동', '01011112222', 2)) is not null, '환불 후 같은 날 재예약');

-- ── 11. 권한: anon/authenticated 는 함수·예약 테이블 접근 불가 ──────────────────
-- 날짜는 롤 전환 전에 리터럴로(anon 은 kst_today() 실행 권한도 없음)
select (public.kst_today() + 10)::text as dlit \gset
set local role anon;
select pg_temp.expect_error(format($q$select public.reserve_booking('cabana', %L, 'x', '01099998888', 1)$q$, :'dlit'), 'permission denied for function reserve_booking');
select pg_temp.expect_error($q$select public.kst_today()$q$, 'permission denied for function kst_today');
select pg_temp.expect_error($q$select public.confirm_booking_tx('x', 'x', 1, 'x', now(), '{}')$q$, 'permission denied for function confirm_booking_tx');
select pg_temp.expect_error($q$select count(*) from public.bookings$q$, 'permission denied for table bookings');
select pg_temp.ok((select count(*) from public.product_types) = 3, 'anon 상품 공개 읽기');
reset role;
set local role authenticated;
select pg_temp.expect_error(format($q$select public.admin_create_booking('cabana', %L, 'comp', 'x', null, 1)$q$, :'dlit'), 'permission denied for function admin_create_booking');
select pg_temp.ok((select count(*) from public.bookings) = 0, '비관리자 authenticated 예약 0건(RLS)');
reset role;

-- 권한 전수 점검: public 스키마 함수 중 anon 실행 가능 = 0
select pg_temp.ok((
  select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
) = 0, 'anon 실행 가능 함수 0개');

rollback;
\echo 'SMOKE TESTS PASSED'
