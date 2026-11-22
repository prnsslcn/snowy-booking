#!/usr/bin/env bash
# 고객 API e2e (fake 결제, 로컬 Supabase). 개발 서버가 로컬 DB + TOSS_FAKE=1 로 떠 있어야 한다.
#   scripts/e2e-api.sh   (BASE 기본 http://localhost:3000)
set -uo pipefail
BASE=${BASE:-http://localhost:3000}
DB=${DB:-supabase_db_snowy-booking}
OUT=$(mktemp)
PASS=0; FAIL=0; CODE=''

sql() { docker exec -i "$DB" psql -U postgres -qtA -c "$1"; }
# post <path> <json> → CODE 에 HTTP 상태, $OUT 에 본문
post() { CODE=$(curl -s -o "$OUT" -w '%{http_code}' -X POST "$BASE$1" -H 'Content-Type: application/json' -H "x-forwarded-for: ${IP:-10.0.0.1}" -d "$2"); }
j() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s||"{}");console.log(eval(process.argv[1]))})' "$1" < "$OUT"; }
check() { if [[ "$2" == "$3" ]]; then PASS=$((PASS+1)); echo "ok - $1"; else FAIL=$((FAIL+1)); echo "FAIL - $1 (expected '$3' got '$2') $(head -c 300 "$OUT")"; fi; }
reserve_body() { printf '{"type":"%s","date":"%s","guestName":"테스트","guestPhone":"%s","guestCount":%s,"agreed":%s}' "$1" "$2" "$3" "$4" "${5:-true}"; }
confirm_body() { printf '{"paymentKey":"%s","orderId":"%s","amount":%s}' "$1" "$2" "$3"; }
code_body() { printf '{"phone":"%s","code":"%s"}' "$1" "$2"; }
cleanup() { sql "delete from public.lookup_attempts; delete from public.notifications; delete from public.payments where booking_id in (select id from public.bookings where guest_phone like '0109000000%'); delete from public.bookings where guest_phone like '0109000000%';" >/dev/null; }

TODAY=$(sql "select public.kst_today()")
D3=$(sql "select public.kst_today() + 3")
D1=$(sql "select public.kst_today() + 1")
FAR=$(sql "select public.kst_today() + 40")
P1=01090000001; P2=01090000002; P3=01090000003; P4=01090000004
cleanup

# ── availability ──
CODE=$(curl -s -o "$OUT" -w '%{http_code}' "$BASE/api/availability")
check "availability 200" "$CODE" "200"
check "availability 날짜 수 ≥ 28" "$(j 'o.days.length>=28')" "true"
check "availability minDate = 오늘(16시 전) 또는 내일" "$(j "['$TODAY','$D1'].includes(o.minDate)")" "true"
check "availability 유형 3종" "$(j 'o.days[0].types.length')" "3"
BEFORE=$(j "o.days.find(d=>d.date==='$D3').types.find(t=>t.type==='caravan').remaining")

# ── 입력 검증 ──
post /api/bookings/reserve "$(reserve_body caravan "$D3" "$P1" 2 false)"
check "동의 없으면 거부" "$CODE $(j o.error)" "400 AGREEMENT_REQUIRED"
post /api/bookings/reserve "$(reserve_body caravan "$FAR" "$P1" 2)"
check "1개월 밖 거부" "$CODE $(j o.error)" "400 OUT_OF_WINDOW"
post /api/bookings/reserve "$(reserve_body cabana "$D3" "$P1" 7)"
check "최대 인원 초과 거부" "$CODE $(j o.error)" "400 OVER_CAPACITY"
post /api/bookings/reserve "$(reserve_body cabana "$D3" "02-123-4567" 2)"
check "휴대폰 형식 거부" "$CODE $(j o.error)" "400 INVALID_PHONE"

# ── 선점 → 확정 (3일 뒤: 100% 환불 구간) ──
post /api/bookings/reserve "$(reserve_body caravan "$D3" "010-9000-0001" 8)"
check "선점" "$CODE" "200"
O1=$(j o.orderId); A1=$(j o.amount)
check "금액은 DB 요금" "$A1" "$(sql "select unit_price from public.price_for('caravan', '$D3')")"
post /api/payments/confirm "$(confirm_body fakepay_x "$O1" 100)"
check "위변조 금액 승인 거부" "$CODE $(j o.error)" "422 AMOUNT_MISMATCH"
post /api/payments/confirm "$(confirm_body "fakepay_$O1" "$O1" "$A1")"
check "확정" "$CODE $(j o.outcome)" "200 CONFIRMED"
C1=$(j o.lookupCode)
post /api/payments/confirm "$(confirm_body "fakepay_$O1" "$O1" "$A1")"
check "확정 멱등" "$CODE $(j o.outcome)" "200 ALREADY_CONFIRMED"
check "알림 이력(고객만 — 관리자 문자 없음)" "$(sql "select count(*) from public.notifications n join public.bookings b on b.id=n.booking_id where b.order_id='$O1' and n.type='confirm'")" "1"
CODE=$(curl -s -o "$OUT" -w '%{http_code}' "$BASE/api/availability")
check "잔여 1 감소" "$(j "o.days.find(d=>d.date==='$D3').types.find(t=>t.type==='caravan').remaining")" "$((BEFORE-1))"
post /api/bookings/reserve "$(reserve_body cabana "$D3" "$P1" 2)"
check "1인 1일 1동" "$CODE $(j o.error)" "409 DUPLICATE_PHONE_DATE"
check "완료 페이지 예약번호 표시" "$(curl -s "$BASE/booking/complete?o=$O1" | grep -c ">$C1<")" "1"

# ── 조회 ──
WRONG=$(printf '%04d' $(( (10#$C1 + 1) % 10000 )))
post /api/bookings/lookup "$(code_body "$P1" "$WRONG")"
check "조회 틀린 번호 404" "$CODE" "404"
post /api/bookings/lookup "$(code_body "010-9000-0001" "$C1")"
check "조회 성공" "$CODE $(j o.status)" "200 confirmed"
check "조회 응답에 유닛 정보 없음" "$(j "/unit|label/.test(JSON.stringify(o))")" "false"
check "환불 미리보기 100%" "$(j o.refundPreview.amount)" "$A1"

# ── 고객 취소 100% ──
post /api/bookings/cancel "$(code_body "$P1" "$C1")"
check "취소(100%)" "$CODE $(j o.refundedAmount)" "200 $A1"
check "payments cancelled" "$(sql "select status from public.payments where toss_order_id='$O1'")" "cancelled"
check "취소 알림 이력(고객만)" "$(sql "select count(*) from public.notifications n join public.bookings b on b.id=n.booking_id where b.order_id='$O1' and n.type='cancel'")" "1"
post /api/bookings/cancel "$(code_body "$P1" "$C1")"
check "환불 완료 건 재취소 불가" "$CODE $(j o.error)" "409 NOT_CANCELLABLE"
post /api/bookings/reserve "$(reserve_body caravan "$D3" "$P1" 2)"
check "환불 후 같은 날 재예약 가능" "$CODE" "200"
O1b=$(j o.orderId)
check "결제 실패 페이지 → 선점 반환" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/booking/fail?orderId=$O1b") $(sql "select status from public.bookings where order_id='$O1b'")" "200 cancelled"

# ── 1일 전 취소 50% (부분 취소) ──
post /api/bookings/reserve "$(reserve_body cabana "$D1" "$P2" 3)"
O2=$(j o.orderId); A2=$(j o.amount)
post /api/payments/confirm "$(confirm_body "fakepay_$O2" "$O2" "$A2")"; C2=$(j o.lookupCode)
post /api/bookings/cancel "$(code_body "$P2" "$C2")"
check "1일 전 취소 50%" "$CODE $(j o.refundedAmount)" "200 $((A2/2))"
check "payments partial_cancelled" "$(sql "select status from public.payments where toss_order_id='$O2'")" "partial_cancelled"
check "환불액·방법 기록" "$(sql "select refund_amount||'/'||refund_method from public.bookings where order_id='$O2'")" "$((A2/2))/toss"

# ── 당일 취소 0% (당일 예약은 16시 전에만 가능) ──
if [[ $(sql "select extract(hour from now() at time zone 'Asia/Seoul') < 16") == "t" ]]; then
  post /api/bookings/reserve "$(reserve_body cabana "$TODAY" "$P3" 1)"
  O3=$(j o.orderId); A3=$(j o.amount)
  post /api/payments/confirm "$(confirm_body "fakepay_$O3" "$O3" "$A3")"; C3=$(j o.lookupCode)
  post /api/bookings/cancel "$(code_body "$P3" "$C3")"
  check "당일 취소 0원" "$CODE $(j o.refundedAmount)" "200 0"
  check "당일 취소: 결제 유지·예약 해제" "$(sql "select p.status||'/'||b.status||'/'||b.refund_method from public.bookings b join public.payments p on p.booking_id=b.id where b.order_id='$O3'")" "paid/refunded/none"
else
  echo "skip - 당일 취소(16시 이후)"
fi

# ── 조회 시도 제한 ──
for i in 1 2 3 4 5; do IP=10.9.9.9 post /api/bookings/lookup "$(code_body "$P4" "000$i")"; done
IP=10.9.9.8 post /api/bookings/lookup "$(code_body "$P4" "0009")"
check "번호당 실패 5회 후 429" "$CODE $(j o.error)" "429 TOO_MANY_ATTEMPTS"

# ── 페이지 ──
for p in / /booking /booking/lookup /off "/booking/fail"; do
  check "GET $p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")" "200"
done

cleanup
rm -f "$OUT"
echo "passed=$PASS failed=$FAIL"
[[ $FAIL == 0 ]]
