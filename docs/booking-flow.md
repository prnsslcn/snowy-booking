# 예약·결제·환불 흐름 (docs/booking-flow.md)

> 상태: **검토용 초안 v0.1** (2026-11-16). 테이블·함수 정의는 [schema.md](schema.md)에 있다.

## 0. 확정 정책 요약

| 항목 | 값 | 위치 |
|---|---|---|
| 이용 | 당일 10:00~17:00(조기 입실·연장 없음), 매일 운영 | 안내 문구 |
| 시즌 | 성수기보다 넓음, **날짜 미정** → `site_settings.season_from/to`(null이면 제한 없음) | DB |
| 예약 가능 기간 | 오늘(KST) ~ 오늘 + 1개월 − 1일 | `lib/policy/booking-window.ts` `BOOKING_WINDOW_MONTHS = 1` |
| 당일 마감 | 당일 16:00(KST) 이후 당일 예약 불가 | `SAME_DAY_CUTOFF_HOUR = 16` |
| 결제 대기 | 10분 | `PENDING_PAYMENT_MINUTES = 10` |
| 1인 1동 | 같은 휴대폰번호로 같은 날 온라인 활성 예약 1건 | DB partial unique |
| 인원 | 1 ≤ n ≤ 최대(6/8/14), 영유아 포함, 추가 요금 없음 | DB 함수 |
| 유닛 | 시스템이 내부적으로 가배정한다. **고객에게는 번호를 알리지 않고**, 현장에서 관리자가 배정한다 | — |
| 노쇼 | 1차 범위 제외(별도 처리 없음, 환불 없음) | — |
| 입장권 | 포함 안 됨. 주차는 리조트 주차장(간단히 안내) | 안내 문구 |

---

## 1. 고객 예약 플로우

```
[1] 날짜 → [2] 상품 유형 → [3] 예약자 정보 → [4] 동의 → [5] 결제(토스 위젯) → [6] 승인(서버) → [7] 완료
```

### [1] 날짜 선택 — `GET /api/availability?from&to`

달력의 각 날짜 상태(우선순위 순):

| 상태 | 조건 | 표시 |
|---|---|---|
| 선택 불가 | 예약 가능 기간 밖, 시즌 밖, 오늘이면서 16시 이후 | 흐리게 |
| 휴장 | `closed_dates` | '휴장' |
| 예약마감 | `locked_dates`, 또는 전 유형 잔여 0 | '예약마감' |
| 가능 | 그 외 | 선택 가능. 주말 요금일이면 배지 표시 |

- 잔여 = 그 유형의 `is_active` 유닛 − 그 날짜에 점검 중인 유닛 − 그 날짜의 활성 예약. 만료된 pending은 제외하고 센다.
- 달력은 UX 보조일 뿐이다. 실제 차단은 [5] 진입 시 서버와 DB가 다시 판정한다.

### [2] 상품 유형 선택

- 유형별로 잔여 수(정확한 숫자, 예: "3동 남음"), 그 날짜 요금, 주중/주말 구분, 최대 인원을 보여 준다.
- 수량 선택은 없다(1인 1동).

### [3] 예약자 정보

- 이름(필수), 휴대폰(필수, 저장 시 숫자만), 인원(1~최대)
- 안내 문구: "1인(휴대폰번호 기준) 1일 1동만 예약할 수 있습니다", "스노위랜드 입장권은 포함되어 있지 않습니다"

### [4] 동의

- 환불 규정과 이용 수칙 체크가 모두 필수다. 서버에서도 확인한다(동의 플래그 없으면 거부).

### [5] 선점 — `POST /api/bookings/reserve` → `reserve_booking`

**서버 라우트(TS)**
1. `site_settings.business_closed`이면 `BUSINESS_CLOSED`
2. 휴대폰번호 정규화와 형식 검증
3. `isWithinBookingWindow(date)` 확인(1개월, 당일 16시 마감, KST)
4. RPC 호출

**DB 함수 `reserve_booking` (단일 트랜잭션)**
1. 입력 검증: 유형 활성, `1 ≤ count ≤ max_capacity`, `date ≥ KST 오늘`
2. 날짜 검증: 시즌 범위(설정된 경우), `closed_dates` 아님, `locked_dates` 아님, `business_closed` 아님
3. **`pg_advisory_xact_lock('reserve', type, date)`**: 같은 유형·같은 날짜의 선점을 직렬화한다
4. 지연 회수: 이 (type, date)와 이 휴대폰·날짜의 만료된 pending을 `cancelled`로 바꾼다
5. **같은 휴대폰의 같은 날짜 미만료 pending 처리**: 고객이 결제창을 닫고 다시 시도한 경우다. 이전 pending을 `cancelled`로 바꾸고 새로 선점한다(아니면 최대 10분간 재시도가 막힌다)
   - 이전 건이 뒤늦게 결제 승인되면 [6]의 보상 취소가 처리한다
6. 빈 유닛 선택: 유형 일치, `is_active`, 그 날짜 점검 아님, 그 날짜 활성 예약 없음 → `order by sort limit 1`. 없으면 **`SOLD_OUT`**
7. `price_for(type, date)`로 금액을 정하고 `price_snapshot`을 만든다
8. `lookup_code` 발급: 0000~9999 무작위. `(guest_phone, lookup_code)` 활성 unique에 걸리면 재추첨한다
9. insert(`pending_payment`, `expires_at = now() + 10분`)
   - `(guest_phone, date)` 위반 → **`DUPLICATE_PHONE_DATE`**
   - `(unit_id, date)` 위반 → 정상 경로에서는 발생하지 않는다(advisory lock). 발생하면 `SOLD_OUT`으로 처리하고 로그를 남긴다
10. `{order_id, amount, order_name, expires_at}` 반환

advisory lock을 쓰는 이유: grill-booking처럼 `units` 행을 `FOR UPDATE SKIP LOCKED`로 잡으면 날짜와 무관하게 유닛 행 전체가 잠긴다. 그러면 다른 날짜의 동시 예약이 그 유닛을 건너뛰어 **실제로는 남아 있는데 매진으로 오판**할 수 있다. (type, date) 단위로 잠그면 정확하고, 경합 범위도 최대 30동이라 충분히 가볍다.

### [6] 결제 승인 — `/booking/success?paymentKey&orderId&amount`

grill-booking `lib/booking/confirm.ts`의 흐름을 그대로 쓴다.

1. `orderId`로 예약을 조회한다. 쿼리의 `amount`는 믿지 않고 **DB `amount`와 비교**하며, 다르면 승인을 호출하지 않는다
2. 토스 `POST /v1/payments/confirm`
3. `confirm_booking_tx`: 잠금 → 멱등(이미 confirmed면 통과) → pending 확인 → 금액 재검증 → payments insert → `confirmed`
4. `BOOKING_NOT_PENDING`(만료로 회수됨, 또는 [5]-5에서 대체됨)이면 **토스 전액 취소로 보상**하고 "결제 시간이 초과되어 자동 취소되었습니다"를 안내한다
5. 확정 SMS(고객과 관리자, best-effort)
6. `/booking/complete`에서 **예약번호 4자리**, 날짜, 상품, 인원, 금액을 보여 준다. 유닛 번호는 보여 주지 않는다

**웹훅** `POST /api/payments/webhook`: 본문은 믿지 않는다. `paymentKey`로 토스를 원천 조회한 뒤, `DONE`인데 예약이 pending이면 [6]-3부터, 토스 쪽이 `CANCELED`면 상태만 맞춘다.

**만료 스윕**: pg_cron이 1분마다 `expire_pending_bookings()`를 실행한다. [5]-4의 지연 회수와 함께 쓴다.

---

## 2. 예약 조회·취소 (고객) — `/booking/lookup`

### 조회 `POST /api/bookings/lookup {phone, code}`
1. 휴대폰번호를 정규화한다
2. `lookup_attempts`로 시도 횟수를 제한한다: 번호당 15분에 실패 5회, IP당 15분에 실패 20회 → `TOO_MANY_ATTEMPTS`
3. `(guest_phone, lookup_code)`가 일치하는 예약을 찾는다. **활성 예약 우선**, 없으면 가장 최근 건(취소 내역 확인용)
4. 반환: 상품명, 이용일, 인원, 금액, 상태, **지금 취소하면 환불될 금액**(`lib/policy/refund.ts`). 유닛은 반환하지 않는다
5. 휴대폰번호만으로 조회하는 경로는 만들지 않는다

### 취소 `POST /api/bookings/cancel {phone, code}`
조회와 같은 검증(제한 포함)을 거친 뒤 §3 환불 절차를 따른다. `confirmed`와 `cancel_requested`(재시도)만 허용하고, 입실한 예약은 불가하다.

---

## 3. 환불 절차 (고객과 관리자 공통) — grill-booking 실운영 교훈 반영

| 이용일까지 | 환불 |
|---|---|
| 2일 이상 | 100% |
| 1일 | 50% |
| 당일 / 노쇼 | 0% |

기준은 이용일 00:00 KST, 결제 금액이다. `lib/policy/refund.ts`를 그대로 이식한다.

1. `request_cancel_tx(order_id)`: 잠금 → `cancel_requested` → 결제키·금액·이용일 반환(이미 refunded면 멱등)
2. 환불액 계산(서버, KST). 관리자 "전액 환불"이면 100%
3. **토스 결제 사전 조회**: 이미 `CANCELED`(또는 취소액이 충족된 상태)면 취소 API를 건너뛰고 5로 간다
4. 환불액 > 0이면 토스 취소 API(50%는 `cancelAmount` 부분 취소)
   - 실패하면 `record_cancel_error`로 `{code, message}`를 저장하고, 예약은 `cancel_requested`로 남긴다. 고객에게는 "취소 접수됨, 처리 지연" 안내. 관리자는 예약 목록의 `cancel_requested` 배지로 확인한다(SMS 없음)
   - 멱등키(Idempotency-Key)는 쓰지 않는다(실패 응답까지 캐시됨)
5. `finalize_refund_tx`: payments `cancelled`/`partial_cancelled`, booking `refunded` + `refund_amount/refunded_at/refund_method`. 유닛은 활성 상태가 아니게 되므로 자동으로 해제된다
6. 취소 SMS(고객과 관리자, best-effort)

- 0% 환불(당일 취소)도 `refunded`(refund_amount 0, method `none`)로 전이해서 자리를 푼다. grill-booking과 동일하다.
- 잠금일에 취소된 자리는 `locked_dates` 검사 때문에 다시 판매되지 않는다(트리거 불필요).

### 계좌 직접 환불 (`EXCEED_CANCEL_LIMIT` 등)
관리자 상세 화면에서 금액과 메모를 입력해 `admin_manual_refund_tx`를 실행한다. 토스 호출은 없고 payments는 `paid`로 유지된다. booking은 `refunded`, `refund_method='manual'`, 보라색 배지로 표시한다.

---

## 4. 관리자 — 예약

| 기능 | 내용 |
|---|---|
| 목록·검색 | 날짜·유형·상태·출처, 이름·휴대폰·예약번호 검색 |
| 상세 | 결제 내역, `cancel_error`(토스 오류 코드·사유 원문), 감사 로그 |
| 취소 | 규정 적용 / **전액 환불**(예외). `cancel_requested`에서도 **재시도 버튼**을 둔다. 실패 후 `router.refresh()` |
| 유선 예약 | 유형·날짜·이름·휴대폰(선택)·인원·**결제수단(현금/카드/계좌, 필수)**·메모. 금액 기본값은 `price_for` 정상가이고, 현장 추가·조정(extras, 음수 허용)으로 바꿀 수 있다 |
| 무상 예약 | 금액 0, 결제수단 없음 |
| 유선·무상 공통 | 1인 1일 제한 없음, 4자리 조회코드 없음(고객 셀프 조회·취소 대상 아님), 확정·취소 문자 발송 없음. 잔여가 있어야 생성 가능(같은 advisory lock + 유닛 unique) |

---

## 5. 관리자 — 현장 배정·입실

- **배정 보드**: 날짜를 고르면 유형별 유닛 × 예약을 그리드로 보여 준다(가배정 상태 포함). 빈 유닛도 함께 표시한다
- **배정 변경** `admin_reassign_unit`: 같은 유형·같은 날짜의 빈 유닛으로 옮긴다. 일행 인접 배정 등 현장 판단은 관리자가 한다
- **맞바꾸기** `admin_swap_units`: 두 예약의 유닛을 한 트랜잭션에서 교환한다(빈 자리가 없을 때 필요)
- 두 함수 모두 (type, date) advisory lock을 잡는다. 온라인 선점과 동시에 실행돼도 안전하다
- **입실·퇴실**: 버튼 한 번으로 `checked_in_at`/`checked_out_at`을 기록하고, 되돌리기를 지원한다
- 다른 유형으로 변경(예: 카라반 → 단체카라반 업그레이드)은 1차 범위에서 제외한다(요금 차액 문제)

## 6. 관리자 — 재고(유닛)

- 유닛 추가, 영구 비활성. 비활성화할 때 미래 활성 예약이 있으면 §7과 같은 경고 절차를 거친다
- 유닛별 점검 기간 목록, 해제(삭제)

## 7. 관리자 — 점검(운영 중지) 등록: 경고 → 수동 이동 → 서버 확인 → 잠그기

운영자 요구(Q13)를 그대로 구현한다.

```
[유닛·기간·사유 입력] → [확인] ─ blackout_conflicts() ─┬─ 0건 → [잠그기] 활성화
                                                      └─ N건 → ⚠️ 경고창
                                                                │ 충돌 예약 목록(날짜·이름·상태)
                                                                │ + 각 날짜의 같은 유형 빈 유닛
                                                                │ → 관리자가 건별로 [옮기기](admin_reassign_unit)
                                                                ▼
                                                         [다시 확인] → 0건이면 [잠그기] 활성화
[잠그기] → admin_create_blackout()
           = 기간 내 각 날짜의 (type, date) advisory lock → 충돌 재확인 → 0건이면 insert
             └ 그사이 새 온라인 예약이 이 유닛에 배정됐으면 BLACKOUT_CONFLICT + 최신 목록 반환 → 경고창으로 돌아감
```

- 빈 유닛이 없는 날짜는 경고창에 "옮길 자리 없음"으로 표시한다. 그 날짜는 점검 기간에서 빼거나 고객과 협의해야 한다
- `pending_payment` 충돌은 "결제 진행 중, 최대 10분 후 다시 확인"으로 표시한다(옮기기도 가능)
- 점검이 등록되면 해당 기간에 그 유닛은 자동 배정 후보에서 빠지고, 재고에서도 제외된다

## 8. 관리자 — 요금·달력·설정

- 요금: 유형별 주중·주말 단가(변경은 이후 예약부터 적용, 기존 예약은 스냅샷 유지)
- 성수기 기간 CRUD, 공휴일 관리(연도별 목록, **공공데이터포털 특일 API로 불러오기**, 임시공휴일 수동 추가)
- 휴장일·예약마감일(grill-booking 동일)
- 일반설정: 영업 종료 스위치(홈·`/booking` → `/off`, 예약 API 차단, `{year}` 치환), **시즌 기간**, 공지 팝업

## 9. 관리자 — 매출·통계

- 이용일 기준, 온라인 + 유선 합산(무상 제외), 금액 = `amount − refund_amount`
- 기본 범위 '이번 달', 프리셋(오늘/7일/이번 달/지난 달), 일별 내림차순
- 점유율 = 유형별 판매 수 ÷ 운영 가능 유닛 수(점검 제외), 취소율
- 월말보고 xlsx(grill-booking `lib/admin/report.ts` 이식, 고기·추가메뉴 열 제거, 유선 결제수단 열 추가)

## 10. 알림 (Solapi SMS, `lib/notifications`)

| 이벤트 | 고객 | 관리자 |
|---|---|---|
| 예약 확정(온라인) | ✅ 예약번호 4자리·날짜·상품·인원·금액·이용시간·취소 규정 요약 | ✅ |
| 취소·환불 완료 | ✅ 환불액 | ✅ |
| 유선·무상 예약 | ❌ | ❌ |
| 토스 환불 실패 | ❌ | ❌ (관리자 화면 배지로 확인) |
| 리마인더 | ❌ | ❌ |

모든 발송은 best-effort다. 발송 실패가 예약·환불 트랜잭션에 영향을 주지 않는다. 발송 이력은 `notifications`에 남긴다.

---

## 11. 오류 코드 → 고객 안내

| 코드 | 안내 |
|---|---|
| SOLD_OUT | 선택하신 날짜의 {상품}이 모두 예약되었습니다. |
| DUPLICATE_PHONE_DATE | 1인(휴대폰번호 기준) 1일 1동만 예약할 수 있습니다. 기존 예약은 예약 조회에서 확인해 주세요. |
| DATE_CLOSED / DATE_LOCKED | 휴장일입니다 / 예약이 마감된 날짜입니다. |
| OUT_OF_WINDOW | 예약은 오늘부터 1개월 이내 날짜만 가능합니다(당일 예약은 16시까지). |
| OVER_CAPACITY | {상품}은 최대 {n}인까지 이용할 수 있습니다. |
| BUSINESS_CLOSED | (→ /off) |
| TOO_MANY_ATTEMPTS | 조회 시도가 너무 많습니다. 15분 후 다시 시도해 주세요. |
