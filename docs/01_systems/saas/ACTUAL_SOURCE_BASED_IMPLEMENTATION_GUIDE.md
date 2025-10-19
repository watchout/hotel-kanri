=== 実際のソースコード調査に基づく 客室一覧・デバイス管理 実装ガイド ===

【重要】実際のソースコードを調査した結果に基づく正確な実装指示

## 【調査結果サマリー】

### ✅ 既に実装済み
- hotel-saas: 客室一覧API (`rooms.get.ts`) - hotel-common連携済み
- hotel-saas: デバイス管理API群 - 完全実装済み
- hotel-common: DeviceRoom関連API - 完全実装済み
- hotel-common: 客室管理API - 完全実装済み
- API通信クライアント (`api-client.ts`) - 実装済み

### 🔄 実際に必要な作業
1. DeviceRoomテーブルのマイグレーション実行確認
2. エンドポイントのルーティング確認・修正
3. 動作テスト・デバッグ
4. エラーハンドリングの改善

## 【Phase 1: 現在の実装状況確認】

### 1.1 DeviceRoomテーブル確認

**確認コマンド**:
```bash
cd /Users/kaneko/hotel-common
npx prisma db pull
npx prisma generate
```

**マイグレーション確認**:
```bash
# 既存のマイグレーションファイルを確認
ls -la prisma/migrations/ | grep device

# 実際のテーブル存在確認
psql $DATABASE_URL -c "\dt device_rooms"
```

### 1.2 hotel-saas API動作確認

**現在のエンドポイント**:
```bash
# 客室一覧 (既に実装済み)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3100/api/v1/admin/rooms

# デバイス一覧 (既に実装済み)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3100/api/v1/admin/devices/list

# デバイス数 (既に実装済み)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3100/api/v1/admin/devices/count
```

### 1.3 hotel-common API動作確認

**現在のエンドポイント**:
```bash
# 客室管理API (既に実装済み)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3400/api/v1/admin/front-desk/rooms

# デバイス管理API (既に実装済み)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3400/api/v1/devices
```

## 【Phase 2: 実際の問題修正】

### 2.1 エンドポイント統一

**問題**: SaaSとCommonでエンドポイントパスが不一致

**修正対象ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/rooms.get.ts`

**現在のコード**:
```typescript
// 19行目: roomApi.getRooms を呼び出し
const response = await roomApi.getRooms({ headers: authHeaders, ...query })
```

**api-client.tsの該当部分**:
```typescript
// 389-398行目
getRooms: async (params: any = {}) => {
  const { headers, ...queryParams } = params;
  return safeApiCall(
    apiClient('/api/v1/admin/rooms', {  // ← ここが問題
      method: 'GET',
      params: queryParams,
      headers
    })
  );
}
```

**修正内容**:
```typescript
// /Users/kaneko/hotel-saas/server/utils/api-client.ts の 392行目を修正
apiClient('/api/v1/admin/front-desk/rooms', {  // front-desk を追加
```

### 2.2 デバイス管理APIの統一

**問題**: hotel-saasのデバイスAPIがhotel-commonの正しいエンドポイントを呼んでいない

**修正対象ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/list.get.ts`

**現在のコード (22行目)**:
```typescript
const response = await $fetch(`${baseUrl}/api/v1/devices`, {
```

**修正内容**: 既に正しいエンドポイントを呼んでいるため修正不要

### 2.3 認証ヘッダーの統一

**確認対象**: 認証ヘッダーの形式統一

**hotel-saas側の実装確認**:
```typescript
// devices/count.get.ts 41-44行目
headers: {
  'Authorization': `Bearer ${user.token}`,
  'Content-Type': 'application/json',
  ...(tenantId ? { 'X-Tenant-ID': tenantId } : {})
}
```

**hotel-common側の実装確認**:
```typescript
// device.routes.ts 13行目
router.use(authMiddleware)  // 認証ミドルウェア適用済み
```

## 【Phase 3: 動作テスト】

### 3.1 統合テストスクリプト

**テストファイル作成**: `/Users/kaneko/hotel-saas/test-room-device-apis.sh`

```bash
#!/bin/bash

echo "=== 客室一覧・デバイス管理API統合テスト ==="

# 環境変数設定
SAAS_URL="http://localhost:3100"
COMMON_URL="http://localhost:3400"

# 認証トークン取得
echo "1. 認証トークン取得..."
TOKEN_RESPONSE=$(curl -s -X POST "$SAAS_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@omotenasuai.com","password":"admin123"}')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.data.accessToken')
TENANT_ID=$(echo $TOKEN_RESPONSE | jq -r '.data.user.tenantId')

if [ "$TOKEN" = "null" ]; then
  echo "❌ 認証失敗"
  exit 1
fi

echo "✅ 認証成功: $TENANT_ID"

# 2. 客室一覧取得テスト
echo "2. 客室一覧取得テスト..."
ROOMS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$SAAS_URL/api/v1/admin/rooms?page=1&limit=5")

ROOMS_SUCCESS=$(echo $ROOMS_RESPONSE | jq -r '.success')
if [ "$ROOMS_SUCCESS" = "true" ]; then
  echo "✅ 客室一覧取得成功"
  echo $ROOMS_RESPONSE | jq '.data.rooms[0]'
else
  echo "❌ 客室一覧取得失敗"
  echo $ROOMS_RESPONSE | jq '.'
fi

# 3. デバイス一覧取得テスト
echo "3. デバイス一覧取得テスト..."
DEVICES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$SAAS_URL/api/v1/admin/devices/list")

DEVICES_SUCCESS=$(echo $DEVICES_RESPONSE | jq -r '.success')
if [ "$DEVICES_SUCCESS" = "true" ]; then
  echo "✅ デバイス一覧取得成功"
  echo $DEVICES_RESPONSE | jq '.devices[0]'
else
  echo "❌ デバイス一覧取得失敗"
  echo $DEVICES_RESPONSE | jq '.'
fi

# 4. デバイス数取得テスト
echo "4. デバイス数取得テスト..."
COUNT_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$SAAS_URL/api/v1/admin/devices/count")

COUNT_SUCCESS=$(echo $COUNT_RESPONSE | jq -r '.success')
if [ "$COUNT_SUCCESS" = "true" ]; then
  echo "✅ デバイス数取得成功"
  echo $COUNT_RESPONSE | jq '.count'
else
  echo "❌ デバイス数取得失敗"
  echo $COUNT_RESPONSE | jq '.'
fi

# 5. Common API直接テスト
echo "5. Common API直接テスト..."
COMMON_ROOMS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  "$COMMON_URL/api/v1/admin/front-desk/rooms")

echo "Common客室API:" $(echo $COMMON_ROOMS | jq '.success')

COMMON_DEVICES=$(curl -s -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  "$COMMON_URL/api/v1/devices")

echo "Commonデバイス API:" $(echo $COMMON_DEVICES | jq '.success')

echo "=== テスト完了 ==="
```

### 3.2 テスト実行

```bash
cd /Users/kaneko/hotel-saas
chmod +x test-room-device-apis.sh
./test-room-device-apis.sh
```

## 【Phase 4: 問題修正】

### 4.1 よくある問題と解決方法

#### 問題1: "DeviceRoom テーブルが見つからない"

**解決方法**:
```bash
cd /Users/kaneko/hotel-common

# マイグレーション実行
npx prisma migrate deploy

# または強制リセット
npx prisma db push --force-reset
npx prisma generate
```

#### 問題2: "hotel-common APIに接続できない"

**確認項目**:
```bash
# hotel-commonサーバーの起動確認
ps aux | grep hotel-common

# ポート確認
lsof -i :3400

# 環境変数確認
echo $HOTEL_COMMON_API_URL
```

#### 問題3: "認証エラー"

**デバッグ方法**:
```bash
# JWTトークンの内容確認
echo "eyJhbGciOiJIUzI1NiIs..." | base64 -d

# 認証ログ確認
tail -f /Users/kaneko/hotel-common/logs/integration-server.log
```

### 4.2 実際の修正が必要なファイル

#### 修正1: api-client.ts のエンドポイント修正

**ファイル**: `/Users/kaneko/hotel-saas/server/utils/api-client.ts`

**修正箇所**: 392行目
```typescript
// 修正前
apiClient('/api/v1/admin/rooms', {

// 修正後
apiClient('/api/v1/admin/front-desk/rooms', {
```

#### 修正2: デバイス管理APIのレスポンス形式統一

**ファイル**: `/Users/kaneko/hotel-common/src/routes/systems/saas/device.routes.ts`

**修正箇所**: 31-35行目
```typescript
// 修正前
return res.json({
  success: true,
  count: devices.length,
  devices
})

// 修正後
return res.json({
  success: true,
  data: {
    devices,
    count: devices.length
  }
})
```

## 【Phase 5: 本番デプロイ】

### 5.1 デプロイ前チェックリスト

- [ ] DeviceRoomテーブルが正しく作成されている
- [ ] hotel-commonサーバーが正常に起動している
- [ ] hotel-saasからhotel-commonへの通信が成功している
- [ ] 認証・認可が正しく動作している
- [ ] エラーハンドリングが適切に動作している
- [ ] ログ出力が適切に行われている

### 5.2 デプロイ手順

```bash
# 1. hotel-commonデプロイ
cd /Users/kaneko/hotel-common
npm run build
npm run deploy

# 2. hotel-saasデプロイ
cd /Users/kaneko/hotel-saas
npm run build
npm run deploy

# 3. 動作確認
./test-room-device-apis.sh
```

## 【重要な注意事項】

1. **既存実装の活用**: 多くの機能が既に実装済みのため、新規作成ではなく既存コードの修正・改善に集中
2. **エンドポイント統一**: SaaS側とCommon側でAPIパスの不一致を解消
3. **レスポンス形式統一**: 統一されたレスポンス形式への調整
4. **テスト重視**: 実際の動作確認を重視した段階的テスト

---

**作成日**: 2025年10月1日  
**基準**: 実際のソースコード調査結果  
**対象**: `/Users/kaneko/hotel-saas`, `/Users/kaneko/hotel-common`

