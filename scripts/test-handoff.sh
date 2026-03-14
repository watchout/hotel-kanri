#!/usr/bin/env bash
set -euo pipefail

# =============================================
# DEV-0174: ハンドオフ機能 統合テスト
# =============================================
# テスト対象:
#   - Guest: POST /api/v1/guest/handoff/requests
#   - Guest: GET /api/v1/guest/handoff/requests/:id
#   - Admin: GET /api/v1/admin/handoff/requests
#   - Admin: GET /api/v1/admin/handoff/requests/:id
#   - Admin: PATCH /api/v1/admin/handoff/requests/:id/status

# === 設定 ===
SAAS=http://localhost:3101
COMMON=http://localhost:3401
TENANT="tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7"
COOKIE=/tmp/saas_session_handoff.txt
TEST_EMAIL="owner@test.omotenasuai.com"
TEST_PASSWORD="owner123"

# === ヘルパー関数 ===
step(){ echo -e "\n=== $* ==="; }
error(){ echo -e "\n❌ ERROR: $*" >&2; exit 1; }
success(){ echo -e "\n✅ $*"; }

PASS_COUNT=0
FAIL_COUNT=0

check_result() {
  local test_name="$1"
  local condition="$2"
  if eval "$condition"; then
    success "$test_name"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "❌ FAIL: $test_name"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# === Phase 0: 前提条件確認 ===
step "Phase 0: 前提条件確認"

rm -f "$COOKIE"

# hotel-common 起動確認
if ! curl -fsS "$COMMON/health" >/dev/null 2>&1; then
  error "hotel-common-rebuild が起動していません (http://localhost:3401)"
fi
success "hotel-common-rebuild 起動確認 OK"

# hotel-saas 起動確認
if ! curl -fsS "$SAAS/api/v1/health" >/dev/null 2>&1; then
  error "hotel-saas-rebuild が起動していません (http://localhost:3101)"
fi
success "hotel-saas-rebuild 起動確認 OK"

# === Phase 1: Admin ログイン ===
step "Phase 1: Admin ログイン"
LOGIN_RESPONSE=$(curl -sS -c "$COOKIE" -X POST "$SAAS/api/v1/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$LOGIN_RESPONSE" | jq .

if ! echo "$LOGIN_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "ログイン失敗"
fi
success "ログイン成功"

# === Phase 2: Guest ハンドオフリクエスト作成 ===
step "Phase 2: Guest - ハンドオフリクエスト作成 (hotel-common 直接)"

CREATE_RESPONSE=$(curl -sS -X POST "$COMMON/api/v1/guest/handoff/requests" \
  -H 'Content-Type: application/json' \
  -H "x-tenant-id: $TENANT" \
  -H "x-room-id: room-101" \
  -d '{
    "sessionId": "test_session_001",
    "channel": "front_desk",
    "context": {
      "lastMessages": [{"role": "user", "content": "予約を変更したい", "timestamp": "2026-02-09T10:00:00Z"}],
      "currentTopic": "reservation_change"
    }
  }')

echo "$CREATE_RESPONSE" | jq .

REQUEST_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // "null"')
check_result "リクエスト作成 - success=true" \
  "echo '$CREATE_RESPONSE' | jq -e '.success==true' >/dev/null 2>&1"
check_result "リクエスト作成 - id取得" \
  "[ '$REQUEST_ID' != 'null' ] && [ -n '$REQUEST_ID' ]"
check_result "リクエスト作成 - status=PENDING" \
  "echo '$CREATE_RESPONSE' | jq -e '.data.status==\"PENDING\"' >/dev/null 2>&1"

# === Phase 3: Guest ハンドオフリクエスト取得 (ポーリング) ===
step "Phase 3: Guest - ハンドオフリクエスト取得"

GET_RESPONSE=$(curl -sS "$COMMON/api/v1/guest/handoff/requests/$REQUEST_ID" \
  -H "x-tenant-id: $TENANT" \
  -H "x-room-id: room-101")

echo "$GET_RESPONSE" | jq .

check_result "リクエスト取得 - success=true" \
  "echo '$GET_RESPONSE' | jq -e '.success==true' >/dev/null 2>&1"
check_result "リクエスト取得 - status=PENDING" \
  "echo '$GET_RESPONSE' | jq -e '.data.status==\"PENDING\"' >/dev/null 2>&1"

# === Phase 4: Admin ハンドオフ一覧取得 ===
step "Phase 4: Admin - ハンドオフリクエスト一覧取得"

LIST_RESPONSE=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests")

echo "$LIST_RESPONSE" | jq .

check_result "一覧取得 - success=true" \
  "echo '$LIST_RESPONSE' | jq -e '.success==true' >/dev/null 2>&1"

# === Phase 5: Admin ハンドオフ詳細取得 ===
step "Phase 5: Admin - ハンドオフリクエスト詳細取得"

DETAIL_RESPONSE=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID")

echo "$DETAIL_RESPONSE" | jq .

check_result "詳細取得 - success=true" \
  "echo '$DETAIL_RESPONSE' | jq -e '.success==true' >/dev/null 2>&1"

# === Phase 6: Admin ステータス更新 (PENDING → ACCEPTED) ===
step "Phase 6: Admin - ステータス更新 (ACCEPTED)"

ACCEPT_RESPONSE=$(curl -sS -b "$COOKIE" -X PATCH "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status": "ACCEPTED", "notes": "予約変更対応を開始します"}')

echo "$ACCEPT_RESPONSE" | jq .

check_result "ACCEPTED更新 - success=true" \
  "echo '$ACCEPT_RESPONSE' | jq -e '.success==true' >/dev/null 2>&1"
check_result "ACCEPTED更新 - status=ACCEPTED" \
  "echo '$ACCEPT_RESPONSE' | jq -e '.data.status==\"ACCEPTED\"' >/dev/null 2>&1"

# === Phase 7: Admin ステータス更新 (ACCEPTED → COMPLETED) ===
step "Phase 7: Admin - ステータス更新 (COMPLETED)"

COMPLETE_RESPONSE=$(curl -sS -b "$COOKIE" -X PATCH "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status": "COMPLETED", "notes": "予約変更完了"}')

echo "$COMPLETE_RESPONSE" | jq .

check_result "COMPLETED更新 - success=true" \
  "echo '$COMPLETE_RESPONSE' | jq -e '.success==true' >/dev/null 2>&1"
check_result "COMPLETED更新 - status=COMPLETED" \
  "echo '$COMPLETE_RESPONSE' | jq -e '.data.status==\"COMPLETED\"' >/dev/null 2>&1"

# === Phase 8: 不正遷移テスト (COMPLETED → ACCEPTED) ===
step "Phase 8: 不正遷移テスト (COMPLETED → ACCEPTED)"

INVALID_RESPONSE=$(curl -sS -b "$COOKIE" -X PATCH "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status": "ACCEPTED"}')

echo "$INVALID_RESPONSE" | jq .

check_result "不正遷移 - success=false" \
  "echo '$INVALID_RESPONSE' | jq -e '.success==false' >/dev/null 2>&1"

# === 結果サマリ ===
step "テスト結果サマリ"
echo ""
echo "  ✅ PASS: $PASS_COUNT"
echo "  ❌ FAIL: $FAIL_COUNT"
echo ""

rm -f "$COOKIE"

if [ "$FAIL_COUNT" -gt 0 ]; then
  error "$FAIL_COUNT 件のテストが失敗しました"
fi

success "全 $PASS_COUNT 件のテストが合格しました！"
