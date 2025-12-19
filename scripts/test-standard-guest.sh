#!/usr/bin/env bash
set -euo pipefail

# === 設定 ===
SAAS=http://localhost:3101
COMMON=http://localhost:3401
TENANT="tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7"
# デバイス認証は ip=auto でIPを自動取得するため、
# device_rooms テーブルに 127.0.0.1 or ::1 のテストデバイスが必要

# === ヘルパー関数 ===
step(){ echo -e "\n=== $* ==="; }
error(){ echo -e "\n❌ ERROR: $*" >&2; exit 1; }
success(){ echo -e "\n✅ $*"; }

# === Phase 0: 前提条件確認 ===
step "Phase 0: 前提条件確認"

# hotel-common-rebuild 起動確認
if ! curl -fsS "$COMMON/health" >/dev/null 2>&1; then
  error "hotel-common-rebuild が起動していません (http://localhost:3401)
起動方法:
  cd /Users/kaneko/hotel-common-rebuild
  npm run dev"
fi
success "hotel-common-rebuild 起動確認 OK"

# hotel-saas-rebuild 起動確認
if ! curl -fsS "$SAAS/api/v1/health" >/dev/null 2>&1; then
  error "hotel-saas-rebuild が起動していません (http://localhost:3101)
起動方法:
  cd /Users/kaneko/hotel-saas-rebuild
  npm run dev"
fi
success "hotel-saas-rebuild 起動確認 OK"

# === Phase 1: デバイス認証 ===
step "Phase 1: デバイス認証（hotel-common 直接）"

# hotel-common の GET /api/v1/guest/device/status?ip=auto を呼び出し
# ip=auto: サーバー側でクライアントIPを自動取得（127.0.0.1 or ::1）
DEVICE_CHECK_RESPONSE=$(curl -sS "$COMMON/api/v1/guest/device/status?ip=auto" \
  -H "x-tenant-id: $TENANT")

echo "$DEVICE_CHECK_RESPONSE" | jq .

# レスポンス形式: { success: true, data: { roomId, deviceId } }
DEVICE_SUCCESS=$(echo "$DEVICE_CHECK_RESPONSE" | jq -r '.success // false')
ROOM_ID=$(echo "$DEVICE_CHECK_RESPONSE" | jq -r '.data.roomId // "unknown"')
DEVICE_ID=$(echo "$DEVICE_CHECK_RESPONSE" | jq -r '.data.deviceId // "unknown"')

if [ "$DEVICE_SUCCESS" != "true" ] || [ "$ROOM_ID" == "unknown" ] || [ "$ROOM_ID" == "null" ]; then
  error "デバイス認証失敗
レスポンス: $(echo "$DEVICE_CHECK_RESPONSE" | jq -c .)

確認事項:
  1. テストデバイスが device_rooms テーブルに登録されているか？
     - IP: 127.0.0.1 (ローカル開発用)
     - tenant_id: $TENANT
     - is_active: true
  
  2. seed にテストデバイスが含まれているか？
     cd /Users/kaneko/hotel-common-rebuild
     npx prisma studio
     → device_rooms テーブルで確認
  
  3. テストデバイスを登録する方法:
     cd /Users/kaneko/hotel-common-rebuild
     npx prisma db execute --stdin <<'SQL'
INSERT INTO device_rooms (
  id, tenant_id, room_id, device_id, ip_address, 
  is_active, created_at, updated_at
) VALUES (
  'test-device-local',
  '$TENANT',
  'test-room-001',
  'test-device-001',
  '127.0.0.1',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET ip_address = '127.0.0.1', is_active = true;
SQL"
fi

# テナントIDは固定（x-tenant-id ヘッダーで指定）
DEVICE_TENANT_ID="$TENANT"

success "デバイス認証成功（Room ID: $ROOM_ID, Device: $DEVICE_ID）"

# === Phase 2: ゲストAPI検証（hotel-saas経由） ===
step "Phase 2-1: Categories API（hotel-saas経由）"

# 注意: hotel-saasのゲストAPIは device-guard.ts ミドルウェアが必要
#       このテストではミドルウェアを経由しないため、
#       hotel-common に直接アクセスしてテストします

CATEGORIES_RESPONSE=$(curl -sS "$COMMON/api/v1/guest/categories" \
  -H "x-tenant-id: $DEVICE_TENANT_ID")

echo "$CATEGORIES_RESPONSE" | jq .

if ! echo "$CATEGORIES_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "Categories API 失敗
レスポンス: $(echo "$CATEGORIES_RESPONSE" | jq -c .)
確認事項:
  1. hotel-common-rebuild でカテゴリーのseedが投入されているか？
  2. tenant_id フィルタが正しく動作しているか？
  3. x-tenant-id ヘッダーが正しいか？ (現在: $DEVICE_TENANT_ID)"
fi

CATEGORIES_COUNT=$(echo "$CATEGORIES_RESPONSE" | jq -r '.data.categories | length')

if [ "$CATEGORIES_COUNT" -lt 1 ]; then
  error "Categories が0件です
確認事項:
  1. seedを実行したか？
     cd /Users/kaneko/hotel-common-rebuild
     npm run seed
  2. tenant_id フィルタが厳しすぎないか？
  3. Prisma Studio で確認:
     npx prisma studio
     → menu_categories テーブルで tenant_id='$DEVICE_TENANT_ID' のレコードを確認"
fi

success "Categories API 成功（$CATEGORIES_COUNT 件）"

step "Phase 2-2: Menus API（hotel-common直接）"

MENUS_RESPONSE=$(curl -sS "$COMMON/api/v1/guest/menus" \
  -H "x-tenant-id: $DEVICE_TENANT_ID")

echo "$MENUS_RESPONSE" | jq .

if ! echo "$MENUS_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "Menus API 失敗
レスポンス: $(echo "$MENUS_RESPONSE" | jq -c .)"
fi

MENUS_COUNT=$(echo "$MENUS_RESPONSE" | jq -r '.data.items | length')

if [ "$MENUS_COUNT" -lt 1 ]; then
  error "Menus が0件です
確認事項:
  1. seedを実行したか？
  2. tenant_id フィルタが厳しすぎないか？
  3. Prisma Studio で確認:
     npx prisma studio
     → menu_items テーブルで tenant_id='$DEVICE_TENANT_ID' のレコードを確認"
fi

success "Menus API 成功（$MENUS_COUNT 件）"

# === Phase 3: UI検証（注意事項あり） ===
step "Phase 3: UI検証（重要な注意事項）"

echo "
⚠️  重要: ゲストUI（/menu）は device-guard.ts ミドルウェアが必要です

このスクリプトではミドルウェアをバイパスしているため、
UIの完全なテストはブラウザで実施してください。

ブラウザテスト手順:
1. hotel-saas-rebuild が起動していることを確認
   cd /Users/kaneko/hotel-saas-rebuild
   npm run dev

2. ブラウザで以下にアクセス:
   http://localhost:3101/menu

3. デバイス認証エラーが出る場合:
   - device-guard.ts が MAC/IP を取得できない
   - ローカル開発では正常（本番はホテルネットワーク内で動作）
   - 代替: 管理画面から device_rooms にローカルIPを登録

4. 正常に表示される場合:
   - カテゴリ一覧が表示される
   - 商品一覧が表示される
   - /menu/category/{id} にアクセス可能
   - /menu/item/{id} にアクセス可能
"

# API動作確認は完了しているため、UIは参考情報のみ
success "API検証完了（UI検証はブラウザで実施）"

# === 最終結果 ===
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "✅ GUEST API TESTS PASSED"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "デバイス認証: ✅ 成功"
echo -e "Room ID:      $ROOM_ID"
echo -e "Device ID:    $DEVICE_ID"
echo -e "Tenant ID:    $TENANT"
echo -e "Categories:   $CATEGORIES_COUNT 件"
echo -e "Menus:        $MENUS_COUNT 件"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "\n✅ ゲストAPI動作確認完了"
echo -e "\n⚠️  UI検証はブラウザで実施してください:"
echo -e "   http://localhost:3101/menu"

