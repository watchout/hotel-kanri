# 完全統合モードへの移行ガイド

## 概要

本ドキュメントでは、Phase 2.5の部分統合から完全統合モードへの移行手順を説明します。この移行により、hotel-saasとhotel-commonの間で完全な統合が実現され、デバイス管理機能などの新機能が利用可能になります。

## 1. 実装内容

### 1.1 デバイス管理API

DeviceRoomテーブルを活用したデバイス管理APIを実装しました。以下のエンドポイントが利用可能です：

```
- GET    /api/v1/devices                  - テナントのデバイス一覧取得
- GET    /api/v1/devices/room/:roomId     - 部屋IDに紐づくデバイス取得
- GET    /api/v1/devices/device/:deviceId - デバイスID指定で取得
- POST   /api/v1/devices                  - 新規デバイス登録
- PUT    /api/v1/devices/:id              - デバイス情報更新
- PATCH  /api/v1/devices/:id/last-used    - デバイス最終使用日時更新
- DELETE /api/v1/devices/:id/deactivate   - デバイス非アクティブ化（論理削除）
- DELETE /api/v1/devices/:id              - デバイス物理削除
- GET    /api/v1/devices/place/:placeId   - プレイスIDに紐づくデバイス取得
- GET    /api/v1/devices/type/:deviceType - デバイスタイプでフィルタリング
- GET    /api/v1/devices/status/:status   - ステータスでフィルタリング
- POST   /api/v1/devices/bulk             - デバイス一括登録
```

### 1.2 認証機能の強化

認証ミドルウェアを完全統合モード用に更新し、以下の機能を追加しました：

- 強化されたJWT認証
- テナントベースのアクセス制御
- ロールベースの権限管理
- パーミッションベースの権限管理

### 1.3 hotel-saas統合クラスの更新

`HotelSaasAuth`クラスを完全統合モード用に更新し、以下の機能を追加しました：

- `validateToken`メソッドの追加（互換性のため）
- 完全統合モード設定の追加
- 統一データベース使用の有効化

## 2. 移行手順

### 2.1 hotel-commonの更新

1. 新しいファイルを追加：
   - `src/repositories/device/device-room.repository.ts`
   - `src/services/device/device-room.service.ts`
   - `src/routes/device.routes.ts`
   - `src/server/integration-server-update.ts`

2. 既存ファイルの更新：
   - `src/auth/middleware.ts`
   - `src/integrations/hotel-saas/index.ts`

3. 統合サーバーの更新：
   ```bash
   node dist/server/integration-server-update.js
   ```

### 2.2 hotel-saasの更新

1. `.env`ファイルの更新：
   ```
   # 完全統合モード設定
   INTEGRATION_MODE=FULL
   ENABLE_JWT_AUTH=true
   ENABLE_EVENTS=true
   ENABLE_UNIFIED_API=true
   LEGACY_MODE=false
   ENABLE_POSTGRESQL=true
   ENABLE_UNIFIED_DB=true
   ```

2. デバイス管理API呼び出しの実装：
   ```javascript
   // hotel-saas/src/device/device-api.js
   import axios from 'axios'

   // デバイス一覧取得
   export async function getDevices(token) {
     return axios.get('http://localhost:3400/api/v1/devices', {
       headers: {
         Authorization: `Bearer ${token}`
       }
     })
   }

   // 新しいデバイス登録
   export async function registerDevice(token, deviceData) {
     return axios.post('http://localhost:3400/api/v1/devices', deviceData, {
       headers: {
         Authorization: `Bearer ${token}`
       }
     })
   }

   // デバイス情報更新
   export async function updateDevice(token, deviceId, deviceData) {
     return axios.put(`http://localhost:3400/api/v1/devices/${deviceId}`, deviceData, {
       headers: {
         Authorization: `Bearer ${token}`
       }
     })
   }
   ```

## 3. テスト手順

### 3.1 認証テスト

```bash
# JWT認証トークン取得
curl -X POST http://localhost:3100/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# 取得したトークンを使用してデバイス一覧取得
curl -X GET http://localhost:3400/api/v1/devices \
  -H "Authorization: Bearer <取得したトークン>"
```

### 3.2 デバイス登録テスト

```bash
curl -X POST http://localhost:3400/api/v1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <取得したトークン>" \
  -d '{
    "roomId": "room123",
    "roomName": "デラックスルーム",
    "deviceId": "device001",
    "deviceType": "tablet",
    "placeId": "place123",
    "ipAddress": "192.168.1.100",
    "macAddress": "00:11:22:33:44:55"
  }'
```

### 3.3 デバイス一括登録テスト

```bash
curl -X POST http://localhost:3400/api/v1/devices/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <取得したトークン>" \
  -d '{
    "devices": [
      {
        "roomId": "room124",
        "roomName": "スタンダードルーム",
        "deviceId": "device002",
        "deviceType": "tablet"
      },
      {
        "roomId": "room125",
        "roomName": "スイートルーム",
        "deviceId": "device003",
        "deviceType": "tablet"
      }
    ]
  }'
```

## 4. 注意事項

1. **データベース接続**：統合データベース（hotel_unified_db）への接続が必要です。
2. **JWT設定**：両システムで同じJWTシークレットを使用していることを確認してください。
3. **環境変数**：すべての必要な環境変数が設定されていることを確認してください。
4. **バックアップ**：移行前にデータベースのバックアップを取得してください。

## 5. トラブルシューティング

### 5.1 認証エラー

- **エラー**: `401 Unauthorized - Invalid or expired token`
  - **解決策**: JWTシークレットが両システムで一致しているか確認してください。

### 5.2 デバイス登録エラー

- **エラー**: `400 Bad Request - テナントIDが指定されていません`
  - **解決策**: 認証トークンにテナントIDが含まれているか確認してください。

- **エラー**: `400 Bad Request - このデバイスIDは既に登録されています`
  - **解決策**: 一意のデバイスIDを使用してください。

### 5.3 データベース接続エラー

- **エラー**: `500 Internal Server Error - Database connection failed`
  - **解決策**: DATABASE_URL環境変数が正しく設定されているか確認してください。

## 6. 連絡先

問題や質問がある場合は、統合チーム（integration-team@omotenasuai.com）までご連絡ください。
