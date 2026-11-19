# CLAUDE.md — snowy-booking

홍천 비발디파크 **스노위랜드** 내 카바나·카라반 상품의 온라인 예약·결제 시스템. Claude Code는 이 문서를 프로젝트 컨텍스트로 사용한다.

> 자매 프로젝트 **grill-booking**(알펜시아 BBQ, abc-bbq.com)에서 실운영으로 검증된 구조·교훈을 그대로 가져온다.
> 같은 운영자(주식회사 에이비씨웍스글로벌), 같은 스택, 같은 계정. 코드·설계가 헷갈리면 grill-booking을 참고 구현으로 본다.
> 표시 **[미정]** 항목은 운영자 확인 전까지 임의로 확정하지 말고, 설정값/상수로 분리해 나중에 바꿀 수 있게 구현한다.

---

## 1. 프로젝트 개요

- **목적:** 스노위랜드 내 카바나·카라반을 고객이 직접 날짜·상품을 골라 **전액 선결제**로 예약.
- **실서비스**다. 성능 최적화보다 **결제-예약 정합성**과 **재고(수량) 초과 예약 방지**가 최우선.
- 트래픽은 시즌 집중형(겨울 성수기)일 가능성이 높음 → 시즌 오픈 직후·주말 특정 날짜에 동시 결제가 몰릴 수 있다고 가정하고 동시성 설계.

### 상품 (3종)

| 상품 | 내부 type | 수량(재고) | 최대 인원 | 주중 요금 | 주말 요금 |
|---|---|---|---|---|---|
| 스노위 카바나 | `cabana` | 30동 | 6인 | 70,000원 | 90,000원 |
| 스노위 카라반 | `caravan` | 9대 | 8인 | 100,000원 | 120,000원 |
| 스노위 단체카라반 | `caravan_group` | 2대 | 14인 | 170,000원 | 210,000원 |

- 명칭은 **카바나 / 카라반 / 단체카라반**으로 통일 ("중형·대형" 표기 사용 안 함)
- 요금은 1동(1대) 1일 이용 기준. 주말 요금 적용일은 §4
- 편의시설·사진·소개 문구 → [미정] (운영자 자료 수령 후 반영)

---

## 2. 기술 스택 & 인프라

| 항목 | 내용 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) 풀스택, React 19, TypeScript strict |
| 스타일 | Tailwind CSS v4 (PostCSS), Framer Motion |
| DB/인증 | Supabase (PostgreSQL + Supabase Auth) |
| 결제 | 토스페이먼츠 결제위젯 직접 연동 (서버 승인 재검증 필수) |
| 알림 | 문자/알림톡 — 발송 대행사 [미정], **인터페이스(추상화 레이어)로만 구현** |
| 엑셀 | exceljs (월말보고 등) |
| 호스팅 | Vercel |
| 패키지 매니저 | pnpm, Node 22.x |

### 계정·비용 (결정 완료)

- **GitHub:** `prnsslcn` 계정에 새 저장소 `snowy-booking`
- **Vercel:** 기존 `prnsslcn` 계정에 프로젝트 추가 (Hobby, 추가 비용 0)
  - GitHub 1개는 Vercel 계정 1개에만 연결 원칙 → **새 Vercel 계정 만들지 않는다** (기존 사이트 자동배포 충돌 위험)
  - 주의: Hobby 약관상 상업용(결제 사이트)은 Pro 대상. 추후 Pro($20/월) 전환 검토
- **Supabase:** 기존 **Pro 조직**에 새 프로젝트 추가 (리전: grill-booking과 동일)
  - 비용: DB 1개당 Micro 컴퓨트 약 $10/월 추가 (+부가세 10%)
  - **무료 조직에 두지 않는다** — 무료는 1주일 저활동 시 자동 일시정지 → 결제 사이트 장애
- **토스페이먼츠:** 스노위랜드 도메인으로 상점(MID) 추가/계약 [미정]
  - 계약 시 **취소 한도(EXCEED_CANCEL_LIMIT) 조건** 반드시 확인 (§9 참고)

### 명령어

```bash
pnpm dev                                   # 개발 서버
pnpm build && pnpm start                   # 프로덕션 빌드/실행
pnpm lint
pnpm exec tsc --noEmit                     # 타입 체크 (커밋 전 필수)

pnpm exec supabase migration up --local    # 로컬 마이그레이션 적용
pnpm exec supabase gen types typescript --local > types/database.ts
pnpm exec supabase db push                 # 운영 DB 반영 (배포 순서 §12)
```

- supabase CLI는 **`npx` 말고 `pnpm exec supabase`** 로 호출
- 로컬 Docker는 Colima. DB 연결 거부 시 `colima start`

---

## 3. 도메인 모델 (grill-booking과 다른 핵심)

grill-booking은 `시설 1동 × 날짜 × 부(시간대)` = 슬롯 1개를 1건이 점유했다.
snowy-booking은 **`상품 type × 날짜`** 재고형이다. 고객은 유형만 고르고, 구체적인 유닛(몇 호)은 시스템이 배정한다.

### 예약 단위 (확정)

- **당일 이용(데이유즈), 10:00 ~ 17:00 하루 1회.** 시간대(부) 구분 없음 → 재고 단위는 `상품 type × 날짜`
  - grill-booking의 2부제·1·2부 통합 개념은 쓰지 않는다
- **1인 1동 (확정):** 예약 1건 = 유닛 1개. 수량 선택 없음
  - 상품 혼합·부분 수량 취소 문제 자체가 없어짐 (취소는 항상 예약 전체)
  - **같은 휴대폰번호로 같은 날짜에 활성 예약 1건만** 허용 (확정, 성수기 사재기 방지) — DB partial unique (guest_phone, date) where active and source='online'
    - 휴대폰번호는 저장 전 숫자만 남기는 정규화 필수 (010-1234-5678 / 01012345678 우회 방지)
    - 취소·환불·만료된 예약은 제외 → 취소 후 같은 날 재예약 가능
    - 관리자 유선·무상 예약은 이 제한에서 제외 (단체 손님 수동 처리용)
    - 고객 안내 문구: "1인(휴대폰번호 기준) 1일 1동만 예약할 수 있습니다"
- **인원:** (2026-11-20) 고객 예약에서 **이용 인원을 받지 않음** → `guest_count` null(0011). 관리자 유선·무상 예약은 인원 필수, 최대 인원 이하 검증
- **재고:** 상품별 활성 유닛 수 − 운영중지·점검 유닛 − 해당 날짜 확정/선점 예약 수

### 개별 유닛 & 배정

- 각 동/대(`units`)를 개별 레코드로 관리 (카바나 1~30호, 카라반 1~9호, 단체카라반 1~2호)
- 예약 확정 시 **유닛 자동 배정**, 관리자가 **변경 배정** 가능
- 현장 **입실 처리**(체크인 상태) 관리자 기능
- 유닛 단위 **운영 중지·점검**(특정 기간) 설정 → 재고에서 제외

### 운영 기간·운영일

- 시즌 운영 기간(시작~종료) 관리자 설정 [미정 — 겨울 시즌 예상]
- 운영 요일(시즌 중 매일?) [미정], 예약 가능 기간(오늘부터 몇 주/개월 앞까지) [미정], 당일 예약 마감 시각 [미정]
- 휴무일(closed_dates), 예약 잠금일(locked_dates) — grill-booking 기능 그대로

### 재고 관리 방식 (확정: 유닛 개별 등록형)

- 총 수량 숫자를 직접 고치지 않고, **유닛(카바나 1~30호 등)을 한 개씩 등록**하고 켜고 끄는 방식
- 재고 = 그 날짜에 운영 가능한 유닛 수 − 배정된 유닛 수 → 점검·배정과 자동으로 맞물림
- 수량 증설 = 유닛 추가, 영구 철수 = 유닛 비활성, 일시 점검 = 기간 지정 운영 중지

---

## 4. 요금 정책

- **2단 요금 (확정): 주중 / 주말.** 금액은 §1 표
- **주말 요금 적용일:** 금요일, 토요일, 일요일, **공휴일 전날**, **공휴일**, 그리고 **동계 성수기 기간 전체(요일 무관)**
- **동계 성수기 (확정, 한국 날짜 기준):** **2026-12-24 ~ 2027-02-09 (양 끝 포함)** → 이 기간은 평일도 매일 주말 요금
  - 매 시즌 바뀌므로 하드코딩 금지 → **`peak_periods` 테이블**(from_date, to_date, name)로 관리자 설정
  - 경계일 판정은 KST 날짜 문자열(YYYY-MM-DD) 비교로 — UTC 변환 실수 주의
  - 그 외 = 주중 요금
  - 공휴일에는 대체공휴일·임시공휴일 포함 → 코드에 하드코딩하지 말고 **`holidays` 테이블**로 관리
    - 연 1회 공휴일 데이터 등록(공공데이터포털 특일 정보 API로 자동 채우기 or 관리자 직접 입력)
    - 임시공휴일은 갑자기 지정되므로 관리자 화면에서 추가 가능해야 함
  - 판정 함수는 DB/서버 단일 출처: `is_weekend_rate(date)` = date ∈ peak_periods OR 요일 ∈ {금,토,일} OR date ∈ holidays OR date+1 ∈ holidays
- 특정일 개별 요금(예외 가격)은 1차 범위 아님 — 필요 시 `rate_overrides` 추가
- 요금은 **DB(관리자 설정)가 권위**. 결제 금액은 반드시 서버에서 재계산·검증 (클라이언트 금액 불신)
- 예약 시점 요금을 `bookings`에 스냅샷 저장 (이후 요금 변경과 무관하게 환불액 계산)
- 추가 인원 요금·옵션 상품 [미정] — 없으면 1차 범위에서 제외

---

## 5. 결제 정책 (grill-booking 동일)

- **전액 선결제.** 결제 완료되어야 예약 확정
- 결제 승인은 반드시 **서버에서 토스 API로 재검증** (`/v1/payments/confirm`)
- 결제 성공 ↔ 예약 확정은 **DB 함수(트랜잭션) 하나**로 묶는다
- `pending_payment` 선점 타임아웃 (기본 10분) — 만료 시 재고 반환 (pg_cron 등)
- 웹훅으로 상태 변경 수신 시에도 토스 원천 조회로 재확인

---

## 6. 환불 / 취소 규정

- **규정 (확정, grill-booking과 동일):**
  - 이용 2일 전까지: 100% 환불
  - 이용 1일 전: 50% 환불
  - 이용 당일 / 노쇼: 환불 없음
- 기준: **결제 금액**, **이용일 자정(KST)** 기준 계산. 계산 로직은 `lib/policy/refund.ts` 단일 출처
- **자동 환불:** 고객이 취소하면 규정대로 즉시 토스 환불 (관리자 승인 단계 없음)
- 관리자: 취소(규정 적용) + **전액 환불**(규정 무시, 자연재해 등 예외)
- 1인 1동이라 부분 취소 없음 (항상 예약 전체 취소)

---

## 7. 사이트 구조 — 고객용

| 메뉴 | 경로 | 내용 |
|---|---|---|
| 홈 | `/` | 히어로 → 상품 장 3개 → 소개·위치·사업자 정보 마지막 장. 관리자 공지는 히어로 제목 옆 한 줄 |
| 시설 소개 | 홈 `/#cabana` · `/#caravan` · `/#caravan-group` | 홈 안의 상품 장(사진·수량·인원·요금 + '자세히 보기' 펼침). 별도 시설 페이지 없음(2026-11-20 제거) |
| 예약하기 | `/booking` | 날짜(달력) → 상품 유형 → 예약자 정보 → 동의 → 결제 |
| 예약 조회·취소 | `/booking/lookup` | **휴대폰번호 + 예약번호(4자리)** 로 조회, 취소(규정대로 자동 환불) |
| 이용 안내 | `/guide` (+ `/faq`) | 운영 기간·이용 시간, 입장·이용 방법, 주의사항, 취소·환불 규정, FAQ |
| 오시는 길 | `/location` | 위치·주차, 스노위랜드 내 시설 위치 |
| 영업 종료 안내 | `/off` | 관리자 영업 종료 시 랜딩 (§8 일반설정) |
| 약관/정책 | `/terms`, `/privacy`, `/refund-policy` | 결제 페이지 푸터 필수 |

### 예약 플로우 상세

1. **날짜 선택** — 달력. 휴무일은 '휴장', 잠금일/매진은 '예약마감'으로 선택 불가 표시. 주말 요금일 표시
2. **상품 유형 선택** — 날짜별 잔여 수 + 그 날짜 요금(주중/주말) 표시. 1인 1동이라 수량 선택 없음
3. **예약자 정보** — 이름, 휴대폰 (이용 인원·차량번호 받지 않음 — 확정)
4. **동의** — 환불 규정·이용 수칙 동의 체크 (grill-booking과 동일하게 결제 전 필수)
5. **결제** — 토스 결제위젯 → success 페이지에서 서버 승인 → 완료 페이지
6. **완료** — 예약번호(4자리) 안내 + 확정 알림 발송

### 예약번호 · 조회 (확정)

- 고객용 **예약번호 = 숫자 4자리** (문자로 안내, 조회 시 휴대폰번호와 함께 입력)
- 4자리는 전역 유일이 불가(1만 개) → 내부 PK·토스 orderId는 별도의 긴 고유값 사용, 4자리 코드는 **같은 휴대폰번호의 활성 예약 사이에서만 겹치지 않게** 발급
- 조회는 반드시 **휴대폰번호 + 4자리 둘 다 일치**해야 함 (휴대폰만으로 조회 금지 — 개인정보·무단 취소 방지)
- 4자리는 추측 가능 범위가 작으므로 **조회 시도 횟수 제한**(휴대폰번호·IP 기준) 필수

### 일정 변경 — 1차 범위 제외 (확정)

- 고객 셀프 날짜 변경 없음 → "취소 후 재예약" 안내 (환불 규정 적용) 또는 관리자에게 문의
- 추후 추가 시: 재고 확인 + 기존 유닛 해제 + 신규 배정 + 차액 처리가 **원자적으로** 이뤄져야 함

---

## 8. 사이트 구조 — 관리자용 (`/admin`, Supabase Auth 보호)

| 메뉴 | 기능 |
|---|---|
| 대시보드 | 당일 예약 현황, **점유율**(유형별 판매/전체), 매출 요약 |
| 예약 관리 | 조회·검색, 상세, 예약 변경·취소, 유선(전화) 예약 등록·수정, 지인(무상) 예약 |
| 재고(시설) 관리 | 유형별 유닛(카바나 30 / 카라반 9 / 단체카라반 2), 유닛별 운영 중지·점검 기간 |
| 요금 관리 | 유형별 주중·주말 요금, **성수기 기간 설정**(이 기간 매일 주말 요금), **공휴일 관리**(연도별 등록·임시공휴일 추가) |
| 시설 배정 관리 | 예약 건별 유닛 자동 배정 확인·변경, **현장 배정 및 입실·퇴실·노쇼 처리** |
| 결제·환불 관리 | 결제 내역, 환불 승인·처리, 취소요청 멈춤 건 재시도, **계좌 직접 환불** 기록 |
| 매출 통계 | 일별·기간별 매출(**이용일 기준, 확정**), 예약률(점유율), 취소율·노쇼율, 월말보고(xlsx) |
| 운영 설정 | 운영 기간·이용 시간, 휴무일/예약 잠금일, 공지사항(팝업), **영업 종료 On/Off** |

### 관리자 권한 (확정)

- **관리자 계정이 있는 사람은 모두 전체 기능 사용 가능** (역할 구분 없음)
- 계정은 운영자(대표)가 직접 할당 — Supabase Auth 사용자 생성 + `admins` 테이블 등록 (grill-booking과 동일, 관리자 화면에서 계정 관리 UI는 1차 범위 아님)
- 권장: 환불·취소·배정 변경 등 주요 작업에 **누가 했는지(관리자 이메일) 기록** — 여러 명이 같은 권한을 가지므로 사후 확인용

### grill-booking에서 그대로 가져올 관리자 기능

- 날짜 **휴무**(closed_dates) / **예약 잠금**(locked_dates — 운영은 하되 신규 예약 차단, 취소로 자리 나도 트리거가 재차단)
- 유선 예약 등록·내용 변경(현장 추가/조정 금액), 무상(comp) 예약
- 매출: **이용일 기준**, 온라인+유선 합산, 기본 범위 '이번 달', 프리셋(오늘/7일/이번 달/지난 달), 일별 내림차순, 새로고침 시 임의 기간 초기화
- 월말보고 xlsx
- 일반설정: 영업 종료 스위치 → 홈·예약 → `/off`, 신규 예약 API 차단, 문구 편집(`{year}` 토큰 자동 치환)
- 관리자 페이지는 Lenis(부드러운 스크롤) 비활성, nav만 고정

---

## 9. 정합성·동시성 설계 (최우선)

### 재고 초과 예약 방지

- 가용성 확인과 예약 생성을 **분리된 비원자적 작업으로 처리하지 말 것**
- 권장: **유닛 배정 레코드에 유니크 제약**으로 원천 차단
  - 1인 1동이므로 `bookings.unit_id` 하나로 충분 → **(unit_id, date) where 활성 상태 UNIQUE** (grill-booking의 슬롯 유니크와 같은 원리)
  - 예약 생성 DB 함수에서 해당 날짜·유형의 빈 유닛 1개를 `FOR UPDATE SKIP LOCKED` 등으로 잡아 같은 트랜잭션에서 예약 삽입 → 못 잡으면 `SOLD_OUT`
  - 같은 휴대폰·같은 날짜 중복은 (guest_phone, date) partial unique(온라인 활성 예약 한정)로 차단 → 위반 시 `DUPLICATE_PHONE_DATE`로 친절한 안내
  - 숙박(1박 이상)으로 확정되면 날짜 범위 각각에 대해 동일 처리 (또는 `daterange` + exclusion constraint)
- 운영중지·점검 유닛, 휴무일, 잠금일, 영업 종료 상태는 **DB 함수 안에서** 재확인

### 예약 상태 머신

```
pending_payment ──(결제 승인)──▶ confirmed ──(취소 요청)──▶ cancel_requested ──(토스 취소 성공)──▶ refunded
       │                              │                                  │
       └──(타임아웃/실패)──▶ cancelled    ├── checked_in ──▶ checked_out     └──(계좌 직접 환불 기록)──▶ refunded
                                         └── no_show (환불 없음, 통계용)
```

### 환불 처리 순서 (grill-booking 실운영 교훈 반영)

1. `request_cancel_tx` — 예약 잠금 + `cancel_requested` 전이 + 결제키·금액·이용일 반환
2. 환불액 계산 (서버, KST, 단일 출처)
3. **토스 상태 사전 조회** — 이미 `CANCELED`면 다시 취소하지 않고 확정만 (재시도 시 이중 취소 방지)
4. 토스 취소 API — 실패 시 예약은 `cancel_requested`로 남기고 **토스 오류 코드·사유를 관리자 화면에 그대로 표시**
5. `finalize_refund_tx` — payments 취소 반영 + booking `refunded` + 유닛 해제
6. 취소 알림 (best-effort)

- `cancel_requested`에 멈춘 건은 **상세 화면에서 재시도 버튼** 제공 (확정 상태에만 버튼 두면 재시도 불가했던 문제)
- 실패 후 `router.refresh()`로 실제 상태 즉시 반영
- 멱등키(Idempotency-Key)는 실패 응답까지 캐시될 수 있어 사용하지 않고, 3번(사전 조회)으로 이중 취소 방지

### 계좌 직접 환불 (토스 취소 불가 시)

- 실사례: 결제 한 달 뒤 환불 시 토스가 `EXCEED_CANCEL_LIMIT`(취소 한도 초과)로 거절 → 정산 완료 후 정산 예정금이 부족하면 발생
- 운영자가 계좌이체로 돌려준 뒤 관리자 화면에서 **"계좌에서 직접 환불"** 기록
  - 토스 API 호출 없음, 토스·payments는 `paid` 유지
  - booking `refunded` + `manual_refund_amount/at/note` 기록, 보라색 배지로 구분
- 매출은 `confirmed`만 합산 → 전액 환불은 정확. **부분 환불 시 남긴 금액이 매출에서 빠지는 점** 인지(필요 시 개선)

---

## 10. DB 스키마 초안

> 확정 아님. 구현하며 `docs/schema.md`로 분리·확정한다.

| 테이블 | 핵심 컬럼 |
|---|---|
| `product_types` | type(PK: cabana/caravan/caravan_group), name, base_capacity, max_capacity, total_units, is_active, sort |
| `units` | id, type, label(카바나 1호…), is_active |
| `unit_blackouts` | unit_id, from_date, to_date, reason (운영 중지·점검) |
| `product_types` 요금 컬럼 | price_weekday, price_weekend (상품 유형별) |
| `holidays` | date(PK), name, source(api/manual) — 주말 요금 판정용 |
| `peak_periods` | id, name(예: 2026-27 동계 성수기), from_date, to_date — 기간 내 매일 주말 요금 (초기값 2026-12-24 ~ 2027-02-09) |
| `closed_dates` / `locked_dates` / `open_dates` | date, note (grill-booking 동일) |
| `bookings` | id, order_id(긴 고유값, 토스 orderId), lookup_code(4자리), source(online/offline/comp), type, unit_id, date, guest_name/phone/count, amount, price_snapshot(jsonb: 단가·주중/주말 구분), status, checked_in_at, checked_out_at, manual_refund_*, created/updated_at — 활성 예약 내 UNIQUE: (unit_id, date), (guest_phone, date), (guest_phone, lookup_code) |
| `admin_actions` | admin_email, action, booking_id, detail(jsonb), created_at — 누가 무엇을 했는지 기록 |
| `lookup_attempts` | phone/ip, attempted_at — 조회 시도 횟수 제한용 |
| `payments` | booking_id, toss_payment_key(unique), toss_order_id(unique), amount, status(ready/paid/cancelled/partial_cancelled), method, approved_at, cancelled_at, raw_response |
| `notifications` | booking_id, type(confirm/reminder/cancel/change), channel, recipient(customer/admin), status, sent_at |
| `admins` | id(auth.uid), email, role(owner/staff) |
| `site_settings` | 단일 행: business_closed, closed_title, closed_message, notice_popup(jsonb), season_from/to |

- **RLS:** 모든 테이블 활성화. 고객 쓰기는 서버(service_role)·보안 정의 DB 함수 경유만. 공개 읽기는 필요한 최소(휴무일 등)
- 시간대: 모든 날짜 계산 **KST**(`lib/policy/*` 단일 출처)

---

## 11. 알림

- 시나리오: 예약 확정 / 방문 전 리마인더 / 취소·환불 안내 (+ 관리자 알림)
- `lib/notifications/` 인터페이스 + 구현체 교체 구조. 대행사 SDK를 비즈니스 로직에 하드코딩 금지
- 발송 이력은 `notifications` 테이블에 기록, 관리자 화면에서 조회
- 알림톡 템플릿 사전 승인 절차 [미정]

---

## 12. 배포 규칙

- `main` 푸시 → Vercel 프로덕션 자동 배포
- **DB 스키마/RPC 시그니처 변경 시 순서 엄수: 운영 DB 먼저(`db push`) → 그다음 코드 푸시**
  - 코드가 먼저 나가면 새 컬럼·함수를 못 찾아 운영 화면이 깨진다
- 환경변수: 토스 시크릿 키, Supabase service role 키는 **서버 전용**. `NEXT_PUBLIC_` 접두사 금지
- 마이그레이션은 forward-only, 번호 순(`supabase/migrations/0001_…`)

---

## 13. 코딩 규칙 & 하지 말아야 할 것

### 규칙

- TypeScript strict, `any` 지양, 타입 우선
- 금액·결제·재고 로직은 반드시 서버(DB 함수)에서 검증
- **서버 액션은 throw 금지 → `{ ok, error }` 값으로 반환** (Next 프로덕션은 throw 메시지를 익명 digest로 가림)
- 커밋 전 `tsc --noEmit` + lint 통과
- **커밋 메시지에 `Co-Authored-By: Claude` 트레일러 넣지 않는다**

### 하지 말 것

- 클라이언트 결제 응답만 믿고 예약 확정
- 재고 확인과 예약 생성을 분리(race condition)
- 시크릿 키를 `NEXT_PUBLIC_`로 노출
- 알림 SDK 직접 하드코딩
- 결제 사이트 DB를 Supabase 무료 조직에 두기

### UI 주의 (grill-booking에서 겪은 것)

- Tailwind v4: 같은 속성 클래스 2개면 **class 순서가 아니라 CSS 생성 순서**로 승패 → 공용 Card 등은 지정 시 기본 bg/border를 빼는 방식
- Tailwind v4 dev: globals.css에 새 토큰/클래스 추가 후 반영 안 되면 `rm -rf .next` 후 dev 재시작
- 스퀴클(.squircle) 요소에 `backdrop-filter`·`box-shadow` 금지 (iOS에서 모서리 사각 자국)
- Lenis 부드러운 스크롤 사용 시 sticky 대신 fixed 헤더

---

## 14. 미정 / 운영자 확인 필요 체크리스트

### 확정됨

- [x] 이용 단위: 당일 이용 10:00~17:00 (부 구분 없음)
- [x] 상품명·수량·최대 인원·주중/주말 요금 (§1)
- [x] 주말 요금일: 금·토·일·공휴일 전날·공휴일 + 동계 성수기(2026-12-24 ~ 2027-02-09, KST) 매일
- [x] 환불 규정: grill-booking 동일, 고객 취소 시 자동 환불
- [x] 일정 변경: 1차 제외
- [x] 조회: 휴대폰번호 + 예약번호 4자리
- [x] 매출 기준: 이용일
- [x] 관리자: 계정 보유자 전원 전체 권한, 운영자가 직접 할당
- [x] 재고: 유닛 개별 등록형
- [x] 1인 1동: 예약 1건 = 유닛 1개 + 같은 휴대폰번호로 같은 날 1건만 (관리자 예약은 예외)
- [x] (2026-11-16 확정) 운영: 시즌 중 **매일**. 예약 가능 기간 **1개월**(변경 가능), 당일 예약 마감 **16:00 KST**
- [x] 이용: 10:00~17:00 칼같이(조기 입실·연장 없음). 입장권 **미포함**, 주차는 리조트 주차장(간단 안내만). 차량번호 **안 받음**
- [x] 추가 인원 요금·장비 대여 **없음**. 인원에 영유아 포함, 최소 인원 없음
- [x] 유닛 번호는 고객에게 **비노출**. 시스템은 내부 가배정만 하고 **현장에서 관리자가 임의 배정**(일행 인접 배정도 현장 처리)
- [x] 점검 등록 시 예약 충돌: 경고 → 관리자가 빈 유닛으로 수동 이동 → 서버가 충돌 0건 확인 → 잠그기
- [x] 고객 당일 셀프 취소 허용(입실 전, 환불 0원 — 자리 재판매 목적)
- [x] 토스: **신규 MID 계약**(대기 중, 지금은 fake 결제로 개발). 사업자 정보: grill-booking과 동일
- [x] 알림: **Solapi SMS**. 리마인더 없음. 유선·무상 예약 문자 없음. 환불 실패 관리자 문자 없음(화면 배지로 확인). 관리자 수신번호는 env `ADMIN_NOTIFY_PHONES`
- [x] 관리자: **계정 1개를 5~6명이 공유**, 처리자 이름 기록 안 함(admin_actions는 무엇을/언제만). role 컬럼 없음
- [x] 유선 예약: 정상가 기본 + 관리자 조정(extras), **결제수단(현금/카드/계좌) 기록**
- [x] (2026-11-20 변경) 고객 화면에 **잔여 수·주중/주말 구분 표시 안 함**(달력 주말 점 없음, 홈 요금은 `₩70,000 ~ ₩90,000` 범위). 매진만 '마감'. 조회 제한: 번호당 15분 실패 5회, IP당 20회
- [x] 공휴일: 공공데이터포털 특일 API 키로 연도별 불러오기(env `HOLIDAY_API_KEY`)
- [x] UI 방향: **겨울·스노우 테마의 밝은 톤 + 애플식 미니멀 + 토스식 깔끔함** (고객·관리자 모두 리뉴얼 예정, 시설 사진 준비됨)

### 미정 (운영자가 추후 알려주기로 함)

- [ ] 시즌 운영 기간(성수기보다 넓음) → `site_settings.season_from/to`(null = 제한 없음)
- [ ] 노쇼 기준(1차 범위 제외)
- [ ] 도메인 → env `NEXT_PUBLIC_SITE_URL`(문자 조회 링크)
- [ ] 고객 문의 전화번호 → `lib/site-config.ts` `CONTACT_PHONE`
- [ ] Solapi 발신번호(grill-booking 번호 공유 vs 별도)
- [ ] 토스 MID·키, 취소 한도 조건 / 약관·개인정보·환불정책 문구(현재 페이지 없음 → 푸터 링크 404)

---

## 16. 진행 현황 (2026-11-20 기준)

- **완료:** 설계 문서(`docs/schema.md`, `docs/booking-flow.md`) · 마이그레이션 0001~0010(운영 DB 반영됨) · **0011(guest_count null 허용) 운영 미반영 — 코드 푸시 전 `db push` 먼저** · 고객 예약·결제(fake)·조회·취소·환불 흐름 · Vercel 프로덕션 배포(`snowy-booking.vercel.app`)
- **고객 UI 4차(2026-11-20) — 사용자 프로젝트 aftc(`~/Desktop/dev/aftc`) 홈 구조 이식** (taste-skill 키트·DESIGN.md 방식은 폐기, 파일 삭제):
  - **라우트 그룹 하나** `app/(site)`(홈·예약·조회·결과·/off) — 최상위 레이아웃 1개, `site.css`(Tailwind), Outfit(영문 디스플레이, next/font) + Pretendard(CDN), 바탕 얼음빛 `#f0f5fa`(ice-50, 사이트 전체·전환 종이) + 글자 `ink` #0e1a2b(푸른 기운 진한 남색, 순수 검정 대신) + 얼음 팔레트(`site.css` `glacier` #1f4469 = 상품 장 바탕·주요 버튼, `ice-50~700` = 포인트·옅은 면). 검정 바탕은 쓰지 않음
  - `components/site/`: `Navbar`(fixed, 3겹 progressive blur, 섹션 `data-nav-theme` 감지로 글자색 반전, 모바일 풀스크린 clip-path 메뉴) · `PageTransition`(첫 진입은 블라인드 enter. 사이트 안 이동은 **종이 전환**: 지금 화면을 DOM 복제본으로 얼려 두고(body 맨 앞, 스크롤 상자로 sticky 유지) 새 화면이 위 모서리 48px 종이로 아래에서 올라와 덮음 → 복제본 제거. `#앵커`는 그 뒤 스크롤) · `SmoothScroll`(Lenis) · `TLink`(사이트 안 링크는 이걸로 — 종이 전환) · `Hero` · `Spaces`(상품 장: sticky + 다음 장이 위 모서리 48px 로 덮음, 밝음/어두움 반전, FAQ식 '자세히 보기') · `Closing`(마지막 장) · `PageTitle`/`SubPage`/`SiteFooter`(하위 화면) · `useStickyCover` · `motion.ts`(blockIn)
  - 예약하기: 진행 막대(단계마다 차오름) + 단계 내용 방향별 blur 슬라이드. 조회: aftc 공지사항 화면처럼 라이트 + 선 목록
  - nav 상품 링크는 홈 앵커. sticky 장은 붙은 위치를 보고하므로 앵커는 장 앞 0높이 표식(`Spaces`)
  - Lenis `start()`는 진행 중 스크롤을 reset → 모바일 메뉴에서 앵커 이동 시 scrollTo 전에 먼저 start
  - `components/ui/`(Button·Field·Badge)는 새 톤(알약 버튼, 둥근 입력칸 light/dark). 관리자 화면도 이 톤으로
  - **사이트 제목(2026-11-20 확정): "Snowy Cabana & Caravan" / "스노위 카바나·카라반"** — '스노위랜드'는 리조트 시설 이름이라 우리 브랜드 제목으로 쓰지 않음(위치 설명에만). 홈 첫 화면은 전면 사진 + 눈 내림(`Snowfall`) + 작은 'Snowy' + 큰 'Cabana & Caravan'
  - **임의 설명 문구 금지**(운영자 지시): 확정 사실(위치·수량·인원·요금·이용 시간·규정)만. 사업자 정보 표시는 법(전자상거래법) 필수
- **다음:** ① 관리자 화면(`components/ui` 새 톤)(로그인·예약 관리·현장 배정/입실·점검 흐름·유선/무상·환불 재시도/계좌 환불·요금/달력/공휴일·설정) ② 약관 3종 페이지 ③ 이용 안내·오시는 길
- 관리자 DB 함수는 이미 있음(0010) — 화면만 만들면 된다. 환불 재시도 경로(토스 취소 실패 → cancel_requested → 재시도)는 관리자 화면에서 e2e 검증 예정. fake 토스는 cancelReason에 `[FAIL:CODE]`를 넣으면 실패를 시뮬레이션한다

### 운영·개발 메모

- **권한:** public 스키마 함수는 anon·authenticated 실행 불가가 원칙(0001에서 기본 권한 회수). 새 함수는 `service_role`에만 명시적 GRANT. grill-booking도 같은 문제를 0038로 수정함
- **로컬 Supabase:** grill-booking과 동시 실행을 위해 포트 **553xx**(API 55321, DB 55322, Studio 55323). Colima 메모리 2GiB라 realtime·storage·edge·analytics 비활성
- **로컬 개발 서버는 로컬 DB로:** `.env.local`은 운영 DB를 가리키므로, 개발·테스트 시 `supabase status -o env` 값으로 `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY`를 덮어쓰고 `NEXT_PUBLIC_PAYMENTS_FAKE=1 TOSS_FAKE=1`로 실행
- **검증 스크립트:** `scripts/db/run-tests.sh`(DB 스모크 + 동시성), `scripts/e2e-api.sh`(고객 API 38개, 로컬 dev 서버 필요)
- **Vercel:** Production 변수는 기본 Secret. `NEXT_PUBLIC_*`는 **Config** 타입으로 추가해야 함(Secret이면 거부). `next.config.ts`가 `SUPABASE_URL`/`SUPABASE_ANON_KEY`도 `NEXT_PUBLIC_`으로 매핑(우회용). **`NEXT_PUBLIC_PAYMENTS_FAKE`·`TOSS_FAKE`는 Vercel에 절대 넣지 않음**
- git 원격은 SSH(`git@github.com:prnsslcn/snowy-booking.git`)
- 디자인 도구: Playwright MCP, `emil-design-eng` 스킬 설치됨 (`design-taste-frontend`도 설치돼 있으나 현재 디자인에는 쓰지 않음)

### 시설 사진 (`public/images/facilities/`, 1600px·q75 웹용 사본 / 원본 `public/images/{c,m,l}N.jpg`는 gitignore)

운영자 파일명: C=카바나, M=카라반(운영자 표현 '중형'), L=단체카라반('대형'). 화면 표기는 §1 명칭(카바나/카라반/단체카라반) 유지.

| 파일 | 방향 | 내용 |
|---|---|---|
| cabana-1 | 세로 | 눈 덮인 A자형 목조 외관 정면, 파란 하늘·소나무 (카바나 대표) |
| cabana-2 | 세로 | 내부 전경 — 삼각 원목 천장, 작은 창, 좌식 테이블 |
| cabana-3 | 세로 | 내부 벽면 — 난방 패널·감지기 |
| caravan-1 | **가로** | 흰 카라반 외관, 파란 하늘·지붕 위 눈 (카라반 대표) |
| caravan-2 | 세로 | 라운지 — ㄷ자 소파 + 원목 테이블 |
| caravan-3 | 세로 | 2층 침대 |
| caravan-4 | 세로 | 온도조절기(난방) |
| caravan-group-1 | **가로** | 설원 위 카라반 2대 + 눈 덮인 소나무, 파란 하늘 (**홈 히어로 후보**, 단체카라반 대표) |
| caravan-group-2 | 세로 | 복층 침대 + 사다리, 원목 내벽 |
| caravan-group-3 | 세로 | 넓은 거실 — 좌식 테이블, 히터, 창 2개 |

## 15. 디렉터리 구조 (제안)

```
/app
  /(public)          # 홈, 시설, 예약, 조회, 이용안내, 오시는 길, /off
  /admin             # 관리자 (인증 보호)
  /api               # 결제 승인·웹훅, 예약 선점, 조회·취소
/components
  /site /booking /admin /ui
/lib
  /booking           # 예약 선점·확정·환불·변경
  /payments          # 토스 클라이언트(real/fake 교체 가능)
  /notifications     # 알림 인터페이스 + 구현체
  /policy            # KST 날짜·예약 가능 기간·환불액 계산 (단일 출처)
  /admin             # 관리자 액션·조회
  /supabase          # 서버/관리자 클라이언트
/types               # database.ts(생성), domain.ts
/supabase/migrations
/docs                # schema.md, booking-flow.md, deploy.md
```
