#!/usr/bin/env bash
set -euo pipefail

# === 設定 ===
SAAS=http://localhost:3101
COMMON=http://localhost:3401
TENANT="tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7"
COOKIE=/tmp/saas_session.txt
TEST_EMAIL="owner@test.omotenasuai.com"
TEST_PASSWORD="owner123"

# === ヘルパー関数 ===
step(){ echo -e "\n=== $* ==="; }
error(){ echo -e "\n❌ ERROR: $*" >&2; exit 1; }
success(){ echo -e "\n✅ $*"; }

# === Phase 0: 前提条件確認 ===
step "Phase 0: 前提条件確認"

# Cookie クリーンアップ
rm -f "$COOKIE"
success "Cookie クリーンアップ完了"

# hotel-common-rebuild 起動確認
if ! curl -fsS "$COMMON/health" >/dev/null 2>&1; then
  error "hotel-common-rebuild が起動していません"
fi
success "hotel-common-rebuild 起動確認 OK"

# hotel-saas-rebuild 起動確認
if ! curl -fsS "$SAAS/api/v1/health" >/dev/null 2>&1; then
  error "hotel-saas-rebuild が起動していません"
fi
success "hotel-saas-rebuild 起動確認 OK"

# === Phase 1: 認証 ===
step "Phase 1: ログイン"
LOGIN_RESPONSE=$(curl -sS -c "$COOKIE" -X POST "$SAAS/api/v1/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$LOGIN_RESPONSE" | jq .

if ! echo "$LOGIN_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "ログイン失敗"
fi
success "ログイン成功"

# === Phase 2: テナント切替 ===
step "Phase 2: テナント切替"
SWITCH_RESPONSE=$(curl -sS -b "$COOKIE" -X POST "$SAAS/api/v1/admin/switch-tenant" \
  -H 'Content-Type: application/json' \
  -d "{\"tenantId\":\"$TENANT\"}")

echo "$SWITCH_RESPONSE" | jq .

if ! echo "$SWITCH_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "テナント切替失敗"
fi
success "テナント切替成功"

# === Phase 3: ハンドオフAPI テスト ===

# HDF-ADM-001: リクエスト一覧取得
step "Phase 3-1: [HDF-ADM-001] リクエスト一覧取得"
LIST_RESPONSE=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests")
LIST_COUNT=$(echo "$LIST_RESPONSE" | jq -r '.data.requests | length')

echo "$LIST_RESPONSE" | jq .

if ! echo "$LIST_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "リクエスト一覧取得失敗"
fi
success "リクエスト一覧取得成功（$LIST_COUNT 件）"

# HDF-ADM-001: ステータスフィルタ
step "Phase 3-2: [HDF-ADM-001] ステータスフィルタ（PENDING）"
PENDING_RESPONSE=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests?status=PENDING")
PENDING_COUNT=$(echo "$PENDING_RESPONSE" | jq -r '.data.requests | length')

echo "$PENDING_RESPONSE" | jq .

if ! echo "$PENDING_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "ステータスフィルタ失敗"
fi
success "PENDING リクエスト取得成功（$PENDING_COUNT 件）"

# HDF-ADM-002: リクエスト詳細取得
step "Phase 3-3: [HDF-ADM-002] リクエスト詳細取得"
REQUEST_ID=$(echo "$LIST_RESPONSE" | jq -r '.data.requests[0].id')

if [ "$REQUEST_ID" = "null" ] || [ -z "$REQUEST_ID" ]; then
  error "テストリクエストが見つかりません（先にテストデータを作成してください）"
fi

DETAIL_RESPONSE=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID")

echo "$DETAIL_RESPONSE" | jq .

if ! echo "$DETAIL_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "リクエスト詳細取得失敗"
fi
success "リクエスト詳細取得成功（ID: $REQUEST_ID）"

# HDF-ADM-003: ステータス更新（PENDING → ACCEPTED）
step "Phase 3-4: [HDF-ADM-003] ステータス更新（PENDING → ACCEPTED）"
UPDATE_RESPONSE=$(curl -sS -b "$COOKIE" -X PATCH "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"ACCEPTED","notes":"テスト対応を開始します"}')

echo "$UPDATE_RESPONSE" | jq .

if ! echo "$UPDATE_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "ステータス更新（ACCEPTED）失敗"
fi
success "ステータス更新（ACCEPTED）成功"

# HDF-ADM-003: ステータス更新（ACCEPTED → COMPLETED）
step "Phase 3-5: [HDF-ADM-003] ステータス更新（ACCEPTED → COMPLETED）"
COMPLETE_RESPONSE=$(curl -sS -b "$COOKIE" -X PATCH "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"COMPLETED","notes":"対応完了しました"}')

echo "$COMPLETE_RESPONSE" | jq .

if ! echo "$COMPLETE_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "ステータス更新（COMPLETED）失敗"
fi
success "ステータス更新（COMPLETED）成功"

# === Phase 4: セキュリティテスト ===

# HDF-TEST-004: 他テナントのリクエストアクセス（404確認）
step "Phase 4-1: [HDF-TEST-004] テナント分離（他テナントのリクエストは404）"
OTHER_TENANT_ID="handoff_other_tenant_999"
FORBIDDEN_RESPONSE=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests/$OTHER_TENANT_ID")

echo "$FORBIDDEN_RESPONSE" | jq .

# 404 または NOT_FOUND エラーであることを確認
if echo "$FORBIDDEN_RESPONSE" | jq -e '.error.code=="NOT_FOUND"' >/dev/null; then
  success "テナント分離OK（他テナントのリクエストは404を返す）"
else
  error "テナント分離NG（他テナントのリクエストにアクセスできてしまう）"
fi

# === Phase 5: エラーケーステスト ===

# 無効なステータス遷移
step "Phase 5-1: [HDF-TEST-004] 無効なステータス遷移（COMPLETED → ACCEPTED）"
INVALID_RESPONSE=$(curl -sS -b "$COOKIE" -X PATCH "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"ACCEPTED"}')

echo "$INVALID_RESPONSE" | jq .

if echo "$INVALID_RESPONSE" | jq -e '.error.code=="INVALID_STATUS_TRANSITION"' >/dev/null; then
  success "ステータス遷移ルールOK（COMPLETED → ACCEPTED は拒否）"
else
  error "ステータス遷移ルールNG（無効な遷移が許可されている）"
fi

# === 完了 ===
step "全テスト完了"
success "ハンドオフ管理API テスト完了"
