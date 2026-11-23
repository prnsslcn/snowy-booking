# DB 스키마 설계 (docs/schema.md)

> 상태: **검토용 초안 v0.1** (2026-11-16). 확정 후 마이그레이션(`supabase/migrations/0001_…`)으로 옮긴다.
> 함께 볼 문서: [booking-flow.md](booking-flow.md) · 프로젝트 규칙: [CLAUDE.md](../CLAUDE.md)

## 0. 설계 원칙

1. **재고 초과 예약은 DB가 막는다.** 애플리케이션의 "조회 후 삽입"에 의존하지 않는다.
   - 1차: `(type, date)` 단위 **advisory lock**으로 같은 상품·같은 날짜의 배정을 직렬화
   - 최종: `bookings (unit_id, date)` **활성 상태 partial unique**
2. **결제 성공 ↔ 예약 확정은 DB 함수 하나(트랜잭션).** 토스 승인 재검증은 앱이, 확정은 `confirm_booking_tx`가 한다.
3. **금액은 원 단위 정수.** 예약 시점의 단가·요금 구분을 `price_snapshot`에 저장한다.
4. **날짜는 `date` 타입(KST 달력 날짜).** 시각 비교가 필요하면 `now() at time zone 'Asia/Seoul'`. TS 쪽은 `lib/policy/*`가 단일 출처다.
5. **고객 쓰기는 service_role + `security definer` 함수만.** 모든 테이블에 RLS를 켠다.
6. **휴대폰번호는 숫자만 저장.** 정규화는 서버 진입점(`lib/policy/phone.ts`)에서 하고, DB check로 한 번 더 막는다.

### grill-booking과 다른 점

| grill-booking | snowy-booking |
|---|---|
| `slots`(동×날짜×부) 행을 미리 생성하고 상태를 open/booked/closed로 토글 | **slots 테이블 없음.** 재고 = 운영 가능 유닛 − 그 날짜 활성 예약. 유닛과 날짜는 `bookings`에서 직접 결합 |
| 슬롯 행 `FOR UPDATE`로 직렬화 | `pg_advisory_xact_lock(type, date)`으로 직렬화 + `(unit_id, date)` unique |
| 잠금일 = 슬롯을 closed로 바꾸는 트리거 | 잠금일 = 예약 함수에서 확인(슬롯 상태 동기화 문제 자체가 없음) |
| `booking_number`가 토스 orderId | `order_id`(긴 값, 토스 orderId)와 `lookup_code`(4자리, 고객용)를 분리 |

slots를 없앤 이유: 운영일이 매일이고 시즌 기간도 아직 정해지지 않아 슬롯 사전 생성(`generate_slots`)이 번거롭다. 또 잠금일·휴무일·점검 기간과 슬롯 상태를 맞추는 트리거(grill-booking 0035)가 버그의 주 원인이었다.

---

## 1. 상품·유닛

### `product_types`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| type | text PK | `cabana` / `caravan` / `caravan_group` |
| name | text | 카바나 / 카라반 / 단체카라반 |
| max_capacity | int | 6 / 8 / 14. 최소 인원 없음, 영유아 포함 |
| price_weekday | int check > 0 | 70,000 / 100,000 / 170,000 |
| price_weekend | int check > 0 | 90,000 / 120,000 / 210,000 |
| is_active | bool | 판매 중지 스위치 |
| sort | int | 표시 순서 |
| slug | text unique | 홈 앵커 `/#slug`, 예약 미리 선택 `/booking?type=slug` |
| updated_at | timestamptz | |

- CLAUDE.md 초안의 `total_units`는 두지 않는다. 수량은 항상 `units`에서 센다(유닛 개별 등록형, 이중 관리 방지).
- `base_capacity`도 두지 않는다. 추가 인원 요금이 없다(확정).

### `units`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| type | text FK → product_types | |
| label | text | 카바나 1호 … (**관리자 전용, 고객 비노출**) |
| sort | int | 내부 자동 배정 순서 |
| is_active | bool | false = 영구 철수(재고 제외) |
| created_at | timestamptz | |

- unique `(type, label)`
- 시드: 카바나 1~30호, 카라반 1~9호, 단체카라반 1~2호

### `unit_blackouts` (운영 중지·점검)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| unit_id | uuid FK → units | |
| from_date / to_date | date | 양 끝 포함, check from ≤ to |
| reason | text | |
| created_at | timestamptz | |

- 같은 유닛의 기간 겹침 방지: `exclude using gist (unit_id with =, daterange(from_date, to_date, '[]') with &&)` (btree_gist 확장)
- 등록은 **`admin_create_blackout` 함수로만** 한다. 해당 기간에 그 유닛에 활성 예약이 있으면 거부한다(booking-flow §7).

---

## 2. 요금·달력

### `holidays`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| date | date PK | 대체·임시공휴일 포함 |
| name | text | |
| source | text | `api` / `manual` |

- 공공데이터포털 **특일 정보 API**(한국천문연구원)로 연도별 자동 채우기 → 1차 범위. 키는 서버 전용 환경변수 `HOLIDAY_API_KEY`
- 관리자 화면에서 "○○년 공휴일 불러오기"(upsert, `source='api'`) + 임시공휴일 수동 추가(`source='manual'`, API 재동기화 때 덮어쓰지 않음)

### `peak_periods`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| name | text | 2026-27 동계 성수기 |
| from_date / to_date | date | 양 끝 포함 |

- 시드: `2026-12-24 ~ 2027-02-09`

### `closed_dates` / `locked_dates`

grill-booking과 같은 구조: `date PK, note, created_at`. 공개 읽기, 관리자 쓰기.

- `closed_dates`(휴장): 운영 안 함. 달력에 '휴장' 표시
- `locked_dates`(예약마감): 운영은 하되 신규 예약을 차단. 취소로 자리가 나도 열리지 않는다
- `open_dates`는 **두지 않는다.** 시즌 중 매일 운영이라 필요 없음

### 요금 판정 함수 (단일 출처)

```sql
is_weekend_rate(d date) returns bool
  = exists(peak_periods where d between from_date and to_date)
    or extract(isodow from d) in (5, 6, 7)          -- 금·토·일
    or exists(holidays where date = d)
    or exists(holidays where date = d + 1)          -- 공휴일 전날

price_for(p_type text, d date) returns table(unit_price int, rate_kind text)  -- 'weekday' | 'weekend'
```

TS 쪽(달력 표시용 `lib/policy/pricing.ts`)은 이 RPC 결과를 기간 단위로 받아 그린다. **TS에서 요금을 따로 계산하지 않는다.** 결제 금액은 항상 `reserve_booking` 안에서 `price_for`로 정한다.

---

## 3. 예약·결제

### `bookings`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| order_id | text unique | 토스 orderId. `SNW-YYYYMMDD-<랜덤 12자>` (6~64자, 영숫자·`-_`) |
| lookup_code | char(4) null | 고객용 예약번호. 온라인 예약만 발급 |
| source | text | `online` / `offline`(유선) / `comp`(무상) |
| type | text FK → product_types | |
| unit_id | uuid FK → units | **항상 배정**(내부 가배정). 고객에게는 노출하지 않음 |
| date | date | 이용일 |
| guest_name | text | 필수 |
| guest_phone | text | 숫자만. online은 check `^01[0-9]{8,9}$`, offline/comp는 null 허용 |
| guest_count | int | 1 ≤ n ≤ max_capacity (함수에서 검증) |
| amount | int check ≥ 0 | 결제(청구) 금액. comp = 0 |
| price_snapshot | jsonb | `{unit_price, rate_kind, type_name, max_capacity, extras[]}` |
| status | text | §4 상태 머신 |
| expires_at | timestamptz null | pending_payment 만료 시각 |
| offline_payment_method | text null | offline 전용: `cash` / `card` / `transfer` |
| note | text null | 관리자 메모 |
| refund_amount | int null | 실제 환불액(토스 취소 + 계좌 직접 환불 공통) |
| refunded_at | timestamptz null | |
| refund_method | text null | `toss` / `manual` / `none`(0원) |
| manual_refund_note | text null | 계좌 직접 환불 메모 |
| cancel_error | jsonb null | 마지막 토스 취소 실패 `{code, message, at}`. 관리자 화면에 그대로 표시 |
| checked_in_at / checked_out_at | timestamptz null | |
| created_at / updated_at | timestamptz | |

**활성 상태 집합** `ACTIVE = (pending_payment, confirmed, cancel_requested, checked_in, checked_out)`

| 제약 | 정의 | 위반 시 |
|---|---|---|
| 유닛 중복 | **exclusion** `(unit_id =, date =)` where status ∈ ACTIVE, `deferrable initially immediate` | 최종 방어선(정상 경로에서는 advisory lock으로 미리 걸러짐). unique index 대신 exclusion 제약을 쓰는 이유: 문장 끝에서 검사할 수 있어(deferrable) 두 예약의 유닛 맞바꾸기를 UPDATE 한 문장으로 처리할 수 있다 |
| 1인 1일 1동 | unique `(guest_phone, date)` where status ∈ ACTIVE and source = 'online' | `DUPLICATE_PHONE_DATE` |
| 조회코드 | unique `(guest_phone, lookup_code)` where status ∈ ACTIVE and lookup_code is not null | 발급 시 재추첨 |

grill-booking과 달라진 점:
- `manual_refund_amount/at`를 **`refund_amount/refunded_at/refund_method`로 일반화**했다. 50% 토스 부분 환불도 환불액이 남으므로, 매출을 `amount − refund_amount`로 정확히 계산할 수 있다. CLAUDE.md §9의 "부분 환불 시 남긴 금액이 매출에서 빠지는 문제"를 이걸로 해소한다.
- 고기·추가메뉴(addons)는 없다. 유선 예약의 현장 추가·조정 금액은 grill-booking 0033의 `extras[]`(라벨 + 금액, 음수 허용) 구조를 `price_snapshot.extras`로 가져온다.
- 차량번호 컬럼은 없다(확정).

### `payments`

grill-booking과 동일하다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| booking_id | uuid FK → bookings | |
| toss_payment_key | text unique | |
| toss_order_id | text unique | = bookings.order_id |
| amount | int | 승인액 |
| status | text | `paid` / `cancelled` / `partial_cancelled` |
| method | text | |
| approved_at / cancelled_at | timestamptz | |
| raw_response | jsonb | |

### `lookup_attempts` (조회 시도 제한)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigserial PK | |
| phone | text | |
| ip | inet | |
| success | bool | |
| attempted_at | timestamptz | index `(phone, attempted_at)`, `(ip, attempted_at)` |

- 제한(제안값, 상수로 분리): **휴대폰번호당 15분에 실패 5회**, **IP당 15분에 실패 20회** → `TOO_MANY_ATTEMPTS`
- 30일 지난 행은 pg_cron으로 삭제

---

## 4. 예약 상태 머신

```
pending_payment ──confirm_booking_tx──▶ confirmed ──request_cancel_tx──▶ cancel_requested ──finalize_refund_tx──▶ refunded
      │                                    │                                     │
      │ 만료(10분)/결제 실패                │ admin_check_in                      └─admin_manual_refund_tx─▶ refunded
      ▼                                    ▼
  cancelled                           checked_in ──admin_check_out──▶ checked_out

offline/comp: (생성 즉시) confirmed ──admin_cancel_offline──▶ cancelled
```

- **no_show는 1차 범위에서 제외한다**(운영자가 추후 기준 제공). 노쇼는 `confirmed`로 남고 환불도 없다. 나중에 status 값만 추가하면 된다.
- 입실한 예약(`checked_in` 이후)은 고객 취소가 불가하다. 관리자 "전액 환불"(예외 처리)만 가능하다.
- 입실·퇴실 되돌리기(실수 클릭 정정): `checked_in → confirmed`, `checked_out → checked_in`을 관리자만 할 수 있다.
- 매출 대상 = status ∈ {confirmed, checked_in, checked_out, cancel_requested, refunded}이고 금액 = `amount − coalesce(refund_amount, 0)`. 기준일은 이용일(`date`).

---

## 5. 사이트 설정·알림·관리자

### `site_settings` (단일 행, grill-booking 0037 확장)

| 컬럼 | 비고 |
|---|---|
| business_closed, closed_title, closed_message | 영업 종료 스위치(`{year}` 토큰) |
| season_from / season_to (date null) | **null이면 시즌 제한 없음**(시즌 일정 미정 → 운영자 확정 후 입력) |
| notice_popup (jsonb) | `{enabled, title, body, from, to}` |
| updated_at | |

예약 가능 기간(4개월), 당일 마감(16시), 결제 대기 시간(10분, DB `pending_payment_timeout()`과 짝)은 DB가 아니라 **`lib/policy/booking-window.ts` 상수**로 둔다(grill-booking과 동일). 바꿀 때는 코드 한 줄을 고친다.

### `notifications`

grill-booking과 동일: `booking_id, type(confirm/cancel), channel(sms), recipient(customer/admin), status(pending/sent/failed), sent_at, payload`.
- 리마인더는 없다(확정). 발송은 Solapi SMS(`lib/notifications/providers/solapi.ts`를 이식).
- 고객에게만 보낸다. 관리자 문자는 없다(2026-11-23 운영자 결정 — 관리자 화면에서 확인). `recipient='admin'` 값은 예전 이력용으로만 남는다.

### `admins`

`id(auth.uid) PK, email, created_at`. `is_admin()` 함수와 RLS는 grill-booking과 같다.
- `role` 컬럼은 **두지 않는다**(권한 구분 없음 확정, 필요해지면 추가).

### `admin_actions` (감사 로그)

| 컬럼 | 비고 |
|---|---|
| id, created_at | |
| admin_email | 로그인 계정 |
| action | `cancel`, `full_refund`, `manual_refund`, `retry_refund`, `reassign`, `check_in`, `check_out`, `create_offline`, `update_offline`, `blackout_create`, `blackout_delete`, `settings_update` … |
| booking_id (null) | |
| detail (jsonb) | 전후 값 |

---

## 6. 공유 계정 (확정)

관리자 계정 하나를 5~6명이 함께 쓴다(운영자 결정). 처리자 이름은 따로 입력받지 않는다.
`admin_actions`는 **무엇을 언제 했는지**(전후 값) 확인하는 용도로만 남긴다. 나중에 계정을 사람마다 나누면 `admin_email`로 바로 구분할 수 있다.

---

## 7. DB 함수 목록 (전부 `security definer`, service_role 전용)

| 함수 | 역할 |
|---|---|
| `is_weekend_rate(date)`, `price_for(type, date)` | 요금 판정(§2) |
| `availability(from, to)` | 날짜 × 유형별 `{운영 유닛 수, 활성 예약 수, 잔여, 요금, 상태(open/closed/locked/sold_out)}`. 달력·상품 선택 화면용 |
| `reserve_booking(type, date, name, phone, count)` | 온라인 선점 → pending_payment(booking-flow §3) |
| `release_pending_booking(order_id)` | 결제창 이탈·실패 시 즉시 자리 반환(/booking/fail) |
| `confirm_booking_tx(order_id, payment_key, amount, method, approved_at, raw)` | grill-booking 0011과 동일 구조 |
| `expire_pending_bookings()` | 만료된 pending을 cancelled로(pg_cron 1분 간격) |
| `request_cancel_tx(order_id, admin_override)` | 환불 1단계. `admin_override`이면 입실·퇴실 상태도 허용(관리자 전액 환불) |
| `finalize_refund_tx(booking_id, refund_amount, refund_method('toss'/'none'), is_partial, raw)`, `record_cancel_error(booking_id, code, msg)` | 환불 2단계 + 실패 기록 |
| `admin_manual_refund_tx(booking_id, amount, note)` | 계좌 직접 환불 |
| `admin_create_booking(type, date, name, phone, count, source, amount?, payment_method?, note?)` | 유선·무상(1인 1일 제한 없음) |
| `admin_update_offline_booking(booking_id, extras, payment_method?, ...)` | 유선 금액 조정 |
| `admin_cancel_offline_booking(booking_id)` | |
| `admin_reassign_unit(booking_id, new_unit_id)` / `admin_swap_units(booking_a, booking_b)` | 배정 변경(같은 유형·같은 날짜) |
| `admin_check_in / admin_check_out / admin_undo_check(booking_id)` | |
| `blackout_conflicts(unit_id, from, to)` | 경고창용: 그 기간에 이 유닛에 배정된 활성 예약 목록 |
| `admin_create_blackout(unit_id, from, to, reason)` / `admin_delete_blackout(id)` | 충돌 0건일 때만 등록, 아니면 `BLACKOUT_CONFLICT`(겹치는 점검은 `BLACKOUT_OVERLAP`) |
| `admin_add_unit(type, label)` / `admin_set_unit_active(unit_id, active)` | 유닛 증설 / 비활성화. 오늘 이후 활성 예약이 있으면 `UNIT_HAS_BOOKINGS` |

내부 헬퍼(외부 실행 권한 없음): `lock_type_date`, `lock_phone_date`, `expire_stale_pending`, `unit_blacked_out`, `pick_free_unit`, `kst_today`, `is_active_status`, `pending_payment_timeout`.

**권한 원칙:** 0001에서 public 스키마의 함수·테이블 기본 권한(anon·authenticated)을 끊고, 각 함수에 `service_role` 실행 권한만 명시적으로 준다(`is_admin`만 예외로 authenticated). grill-booking은 `revoke from public`만 해서 anon이 모든 RPC를 실행할 수 있는 상태였다.

모든 함수는 오류를 `raise exception '<CODE>'`로 던지고, `lib/booking/errors.ts`가 코드를 한국어 안내 문구로 바꾼다(grill-booking 방식).

---

## 8. RLS 요약

| 테이블 | anon/authenticated 읽기 | 쓰기 |
|---|---|---|
| product_types, holidays, peak_periods, closed_dates, locked_dates | 공개 | 관리자 |
| units, unit_blackouts | 관리자 | 관리자(blackout은 함수 경유) |
| bookings, payments, notifications, lookup_attempts, admin_actions | 관리자 | service_role 함수만 |
| site_settings | 없음(서버 전용) | 서버 전용 |
| admins | 본인 행 | 없음(운영자가 SQL로 등록) |

---

## 9. 마이그레이션 계획(초안)

```
0001_extensions.sql          pgcrypto, btree_gist, pg_cron, 기본 권한 정리, 공용 유틸
0002_products_units.sql      product_types, units + 시드
0003_calendar.sql            holidays, peak_periods(+시드), closed_dates, locked_dates, unit_blackouts
0004_bookings_payments.sql   bookings(유닛 exclusion + partial unique 2종), payments
0005_admin_misc.sql          admins, is_admin(), admin_actions, notifications, lookup_attempts, site_settings
0006_rls.sql                 RLS + 명시적 GRANT
0007_pricing_availability.sql 요금 판정, 재고 헬퍼, availability
0008_reserve_confirm.sql     reserve_booking, release_pending_booking, confirm_booking_tx, 만료 스윕 + cron
0009_refund.sql              request_cancel_tx, record_cancel_error, finalize_refund_tx, admin_manual_refund_tx
0010_admin_bookings.sql      유선·무상·배정·맞바꾸기·입실·점검·유닛 관리
```

검증: `scripts/db/run-tests.sh`(기능 스모크 + 동시성 테스트, 로컬 DB).
