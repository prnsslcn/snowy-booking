#!/usr/bin/env bash
# 로컬 DB 검증: 기능 스모크(롤백) + 동시성(마지막 자리 경합).
# 사전: pnpm exec supabase start (로컬 DB 컨테이너 supabase_db_snowy-booking)
set -euo pipefail

DB=${DB:-supabase_db_snowy-booking}
DIR="$(cd "$(dirname "$0")" && pwd)"
psqlx() { docker exec -i "$DB" psql -U postgres -v ON_ERROR_STOP=1 -qtA "$@"; }

echo "== smoke =="
OUT=$(psqlx < "$DIR/smoke.sql" 2>&1) || { echo "$OUT" | grep -v 'ok - '; echo "SMOKE FAIL"; exit 1; }
echo "$OUT" | grep -vE 'ok - |^\s*$|^\(' || true
echo "passed assertions: $(echo "$OUT" | grep -c 'ok - ')"

echo "== concurrency: 단체카라반(2대) 날짜 하나에 서로 다른 번호 20명 동시 선점 =="
D=$(psqlx -c "select public.kst_today() + 20")
psqlx -c "delete from public.payments; delete from public.bookings where date = '$D';"
for i in $(seq -w 1 20); do
  ( docker exec "$DB" psql -U postgres -qtA -c \
      "select public.reserve_booking('caravan_group', '$D', '동시$i', '010000000$i', 4)" >/dev/null 2>&1 \
      && echo OK || echo FAIL ) &
done > /tmp/snowy_conc_$$ ; wait
OKS=$(grep -c OK /tmp/snowy_conc_$$ || true); rm -f /tmp/snowy_conc_$$
ACTIVE=$(psqlx -c "select count(*) from public.bookings where date = '$D' and type = 'caravan_group' and public.is_active_status(status)")
DUP=$(psqlx -c "select count(*) from (select unit_id from public.bookings where date = '$D' and public.is_active_status(status) group by unit_id having count(*) > 1) x")
echo "succeeded=$OKS active=$ACTIVE duplicate_units=$DUP (expect 2 / 2 / 0)"
[[ "$OKS" == 2 && "$ACTIVE" == 2 && "$DUP" == 0 ]] || { echo "CONCURRENCY FAIL"; exit 1; }

echo "== concurrency: 같은 번호로 유형 3종 × 5회 동시 선점 (활성 1건이어야 함) =="
for i in $(seq 1 5); do
  for t in cabana caravan caravan_group; do
    ( docker exec "$DB" psql -U postgres -qtA -c \
        "select public.reserve_booking('$t', '$D', '중복', '01077778888', 2)" >/dev/null 2>&1 || true ) &
  done
done; wait
SAME=$(psqlx -c "select count(*) from public.bookings where date = '$D' and guest_phone = '01077778888' and public.is_active_status(status)")
echo "active_for_phone=$SAME (expect 1)"
[[ "$SAME" == 1 ]] || { echo "CONCURRENCY FAIL"; exit 1; }

echo "== concurrency: 카바나 30동에 40명 동시 선점 (다른 날짜와 교차) =="
D2=$(psqlx -c "select public.kst_today() + 21")
for i in $(seq -w 1 40); do
  ( docker exec "$DB" psql -U postgres -qtA -c \
      "select public.reserve_booking('cabana', '$D2', '카$i', '01011100$i', 2)" >/dev/null 2>&1 || true ) &
  ( docker exec "$DB" psql -U postgres -qtA -c \
      "select public.reserve_booking('cabana', '$D', '교$i', '01022200$i', 2)" >/dev/null 2>&1 || true ) &
done; wait
C1=$(psqlx -c "select count(*) from public.bookings where date = '$D2' and type = 'cabana' and public.is_active_status(status)")
C2=$(psqlx -c "select count(*) from public.bookings where date = '$D' and type = 'cabana' and public.is_active_status(status)")
echo "cabana D2=$C1 D=$C2 (expect 30 / 30 — 자리 남았는데 매진 오판 없음)"
[[ "$C1" == 30 && "$C2" == 30 ]] || { echo "CONCURRENCY FAIL"; exit 1; }

psqlx -c "delete from public.bookings where date in ('$D', '$D2');"
echo "ALL DB TESTS PASSED"
