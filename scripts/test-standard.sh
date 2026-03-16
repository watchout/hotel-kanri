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

# === Phase 1: 認証 ===
step "Phase 1: ログイン"
LOGIN_RESPONSE=$(curl -sS -c "$COOKIE" -X POST "$SAAS/api/v1/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$LOGIN_RESPONSE" | jq .

if ! echo "$LOGIN_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "ログイン失敗
レスポンス: $(echo "$LOGIN_RESPONSE" | jq -c .)
確認事項:
  1. テストユーザーが存在するか？
  2. パスワードが正しいか？
  3. hotel-common-rebuild のログを確認"
fi

# Cookie発行確認
if [ ! -f "$COOKIE" ] || [ ! -s "$COOKIE" ]; then
  error "Cookie が発行されませんでした
Cookieファイル: $COOKIE
確認事項:
  1. hotel-common-rebuild が Set-Cookie を返しているか？
  2. curl の -c オプションが正しく動作しているか？"
fi
success "ログイン成功（Cookie発行確認済み）"

# === Phase 2: テナント切替 ===
step "Phase 2: テナント切替"
SWITCH_RESPONSE=$(curl -sS -b "$COOKIE" -X POST "$SAAS/api/v1/admin/switch-tenant" \
  -H 'Content-Type: application/json' \
  -d "{\"tenantId\":\"$TENANT\"}")

echo "$SWITCH_RESPONSE" | jq .

if ! echo "$SWITCH_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "テナント切替失敗
レスポンス: $(echo "$SWITCH_RESPONSE" | jq -c .)
確認事項:
  1. テナントID が正しいか？ (現在: $TENANT)
  2. ユーザーがこのテナントにアクセス権を持っているか？
  3. hotel-common-rebuild のログを確認"
fi
success "テナント切替成功"

# === Phase 3: API検証 ===
step "Phase 3-1: Categories API"
CATEGORIES_RESPONSE=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/guest/categories")
CATEGORIES_COUNT=$(echo "$CATEGORIES_RESPONSE" | jq -r '.data.categories | length')

echo "$CATEGORIES_RESPONSE" | jq .

if ! echo "$CATEGORIES_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "Categories API 失敗
レスポンス: $(echo "$CATEGORIES_RESPONSE" | jq -c .)
確認事項:
  1. hotel-common-rebuild でカテゴリーのseedが投入されているか？
  2. tenantIdフィルタが正しく動作しているか？"
fi

if [ "$CATEGORIES_COUNT" -lt 1 ]; then
  error "Categories が0件です
確認事項:
  1. seedを実行したか？
     cd /Users/kaneko/hotel-common-rebuild
     npm run seed
  2. tenantIdフィルタが厳しすぎないか？"
fi
success "Categories API 成功（$CATEGORIES_COUNT 件）"

step "Phase 3-2: Menus API"
MENUS_RESPONSE=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/guest/menus")
MENUS_COUNT=$(echo "$MENUS_RESPONSE" | jq -r '.data.items | length')

echo "$MENUS_RESPONSE" | jq .

if ! echo "$MENUS_RESPONSE" | jq -e '.success==true' >/dev/null; then
  error "Menus API 失敗
レスポンス: $(echo "$MENUS_RESPONSE" | jq -c .)"
fi

if [ "$MENUS_COUNT" -lt 1 ]; then
  error "Menus が0件です
確認事項:
  1. seedを実行したか？
  2. tenantIdフィルタが厳しすぎないか？"
fi
success "Menus API 成功（$MENUS_COUNT 件）"

# === Phase 4: UI検証 ===
step "Phase 4-1: /menu ページ SSR"
curl -sS -b "$COOKIE" "$SAAS/menu" > /tmp/menu.html

if ! grep -q "OmotenasuAI" /tmp/menu.html; then
  error "/menu ページが正常に表示されていません
確認事項:
  1. SSR エラーが発生していないか？
  2. hotel-saas-rebuild のログを確認"
fi

if grep -q "データの取得に失敗しました" /tmp/menu.html; then
  error "/menu ページにエラーメッセージが表示されています
確認事項:
  1. API呼び出しが失敗していないか？
  2. useApi の実装を確認"
fi
success "/menu ページ SSR 成功"

# ID取得
CID=$(echo "$CATEGORIES_RESPONSE" | jq -r '.data.categories[0].id')
IID=$(echo "$MENUS_RESPONSE" | jq -r '.data.items[0].id')

step "Phase 4-2: /menu/category/{id} ページ SSR"
if ! curl -fsS -b "$COOKIE" "$SAAS/menu/category/$CID" > /tmp/category.html; then
  error "/menu/category/$CID が 404 または 5xx
確認事項:
  1. カテゴリーIDが正しいか？ (ID: $CID)
  2. ルーティングが正しいか？"
fi
success "/menu/category/$CID ページ SSR 成功"

step "Phase 4-3: /menu/item/{id} ページ SSR"
if ! curl -fsS -b "$COOKIE" "$SAAS/menu/item/$IID" > /tmp/item.html; then
  error "/menu/item/$IID が 404 または 5xx
確認事項:
  1. 商品IDが正しいか？ (ID: $IID)
  2. ルーティングが正しいか？"
fi
success "/menu/item/$IID ページ SSR 成功"

# === 最終結果 ===
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "✅ ALL TESTS PASSED"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Categories: $CATEGORIES_COUNT 件"
echo -e "Menus:      $MENUS_COUNT 件"
echo -e "Tenant:     $TENANT"
echo -e "Cookie:     $COOKIE"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "\n✅ commit/PR可能です"


