#!/bin/bash
# gate-release: リリース前ゲート
# デプロイ前にステージング環境の基本動作を確認

PASS=0
FAIL=0

STG_API="${STG_API_URL:-https://stg-api.omotenasuai.com}"
STG_APP="${STG_APP_URL:-https://stg-app.omotenasuai.com}"

echo "============================================"
echo " Gate: Release Check"
echo " API: $STG_API"
echo " APP: $STG_APP"
echo "============================================"

# --- 1. API Health ---
echo ""
echo "=== 1. API Health ==="
HEALTH=$(curl -s --connect-timeout 10 "$STG_API/health" 2>/dev/null || echo "FAILED")
DB_STATUS=$(echo "$HEALTH" | jq -r '.database // "unknown"' 2>/dev/null || echo "unknown")

if echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null 2>&1; then
  echo "  PASS: API is healthy (db: $DB_STATUS)"
  PASS=$((PASS + 1))
else
  echo "  FAIL: API health check failed"
  echo "  Response: $HEALTH"
  FAIL=$((FAIL + 1))
fi

# --- 2. Admin Login ---
echo ""
echo "=== 2. Admin Login ==="
LOGIN_RESPONSE=$(curl -s --connect-timeout 10 -c /tmp/gate-release-cookies.txt \
  "$STG_API/api/v1/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}' 2>/dev/null || echo "FAILED")

if echo "$LOGIN_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "  PASS: Admin login successful"
  PASS=$((PASS + 1))
else
  echo "  FAIL: Admin login failed"
  FAIL=$((FAIL + 1))
fi

SESSION=$(grep hotel_session /tmp/gate-release-cookies.txt 2>/dev/null | awk '{print $NF}' || echo "")

# --- 3. Key Admin Endpoints ---
echo ""
echo "=== 3. Key Admin Endpoints ==="

check_endpoint() {
  local EP_METHOD="$1"
  local EP_PATH="$2"
  local HTTP_CODE
  HTTP_CODE=$(curl -s --connect-timeout 10 -o /dev/null -w "%{http_code}" \
    -X "$EP_METHOD" "$STG_API$EP_PATH" \
    -H "Cookie: hotel_session=$SESSION" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo "  PASS: $EP_METHOD $EP_PATH → $HTTP_CODE"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $EP_METHOD $EP_PATH → $HTTP_CODE"
    FAIL=$((FAIL + 1))
  fi
}

check_endpoint "GET" "/api/v1/admin/menu/items"
check_endpoint "GET" "/api/v1/admin/demo-tokens"

# --- 4. Guest Page Access ---
echo ""
echo "=== 4. Guest Page Access ==="
APP_CODE=$(curl -s --connect-timeout 10 -o /dev/null -w "%{http_code}" "$STG_APP/menu" 2>/dev/null || echo "000")

if [ "$APP_CODE" = "200" ] || [ "$APP_CODE" = "302" ]; then
  echo "  PASS: Guest page accessible ($APP_CODE)"
  PASS=$((PASS + 1))
else
  echo "  FAIL: Guest page inaccessible ($APP_CODE)"
  FAIL=$((FAIL + 1))
fi

# --- 5. Demo Token Flow ---
echo ""
echo "=== 5. Demo Token Flow ==="
VALIDATE_RESPONSE=$(curl -s --connect-timeout 10 "$STG_API/api/v1/demo-token/validate?token=gate-release-test" 2>/dev/null || echo "FAILED")
VALIDATE_CODE=$(echo "$VALIDATE_RESPONSE" | jq -r '.error.code // .success' 2>/dev/null || echo "unknown")

if [ "$VALIDATE_CODE" = "INVALID_TOKEN" ] || [ "$VALIDATE_CODE" = "true" ]; then
  echo "  PASS: Demo token endpoint responds correctly ($VALIDATE_CODE)"
  PASS=$((PASS + 1))
else
  echo "  FAIL: Demo token endpoint error ($VALIDATE_CODE)"
  FAIL=$((FAIL + 1))
fi

# Cleanup
rm -f /tmp/gate-release-cookies.txt 2>/dev/null

# --- 結果サマリー ---
echo ""
echo "============================================"
echo " Gate Release Result: PASS=$PASS FAIL=$FAIL"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  echo "GATE: FAILED"
  exit 1
else
  echo "GATE: PASSED"
  exit 0
fi
