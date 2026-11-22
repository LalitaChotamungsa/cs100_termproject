#!/usr/bin/env bash
BASE="${1:-http://184.198.68.187}"
FAIL=0

result() {  # result "ชื่อ" "ผ่านไหม(0/1)" "รายละเอียด"
  if [ "$2" = "0" ]; then echo "PASS: $1"; else echo "FAIL: $1 ($3)"; FAIL=1; fi
}

# 1) GET returns a JSON array
BODY=$(curl -s "$BASE/api/portfolios.php")
case "$BODY" in
  \[*) result "GET /api/portfolios.php returns JSON array" 0 ;;
  *)   result "GET /api/portfolios.php returns JSON array" 1 "got: ${BODY:0:60}" ;;
esac

# 2) invalid POST -> 422
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" -d '[{"displayName":""}]' "$BASE/api/portfolios.php")
[ "$CODE" = "422" ]; result "invalid POST returns 422" $? "got $CODE"

# 3) /data/portfolios.json -> 404
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/data/portfolios.json")
[ "$CODE" = "404" ]; result "/data/portfolios.json returns 404" $? "got $CODE"

# 4) /.git/config -> 403
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/.git/config")
[ "$CODE" = "403" ]; result "/.git/config returns 403" $? "got $CODE"

exit $FAIL
