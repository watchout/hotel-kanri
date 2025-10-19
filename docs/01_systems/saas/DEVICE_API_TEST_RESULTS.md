# デバイスAPI統合テスト結果

## テスト概要

hotel-common側で実装されたデバイス関連APIをテストし、hotel-saas側との統合を確認しました。

## テスト結果

### 1. デバイスステータス確認API

**エンドポイント**: `POST /api/v1/devices/check-status`

**hotel-common側テスト**:
```bash
curl -X POST http://localhost:3400/api/v1/devices/check-status -H "Content-Type: application/json" -d '{"macAddress":"AA:BB:CC:DD:EE:FF","ipAddress":"127.0.0.1","userAgent":"Mozilla/5.0","pagePath":"/order"}'
```

**結果**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unknown argument `is_deleted`. Available options are marked with ?."
  }
}
```

**hotel-saas側テスト**:
```bash
curl -X POST http://localhost:3100/api/v1/device/check-status -H "Content-Type: application/json" -d '{"macAddress":"AA:BB:CC:DD:EE:FF","ipAddress":"127.0.0.1","userAgent":"Mozilla/5.0","pagePath":"/order"}'
```

**結果**:
```json
{
  "error": true,
  "url": "http://localhost:3100/api/v1/device/check-status",
  "statusCode": 403,
  "statusMessage": "Server Error",
  "message": "デバイス認証に失敗しました"
}
```

### 2. クライアントIP取得API

**エンドポイント**: `GET /api/v1/devices/client-ip`

**hotel-common側テスト**:
```bash
curl -X GET http://localhost:3400/api/v1/devices/client-ip
```

**結果**:
```json
{
  "ip": "::ffff:192.168.65.1",
  "headers": {
    "x-forwarded-for": null,
    "x-real-ip": null,
    "x-client-ip": null
  }
}
```

### 3. デバイス数取得API

**エンドポイント**: `GET /api/v1/devices/count`

**hotel-common側テスト**:
```bash
curl -X GET http://localhost:3400/api/v1/devices/count
```

**結果**:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication token is required"
}
```

### 4. デバイス一覧取得API

**エンドポイント**: `GET /api/v1/devices`

**hotel-common側テスト**:
```bash
curl -X GET http://localhost:3400/api/v1/devices
```

**結果**:
```json
{
  "success": true,
  "campaign": {
    "id": "devices",
    "name": "新規会員登録キャンペーン",
    "code": "NEWMEMBER",
    "description": "新規会員登録特典",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "isActive": true,
    "discountRate": 10,
    "targetCustomers": ["NEW"],
    "createdAt": "2025-06-01T00:00:00Z",
    "updatedAt": "2025-06-01T00:00:00Z"
  }
}
```

**hotel-saas側テスト**:
```bash
curl -X GET http://localhost:3100/api/v1/admin/devices
```

**結果**:
```json
{
  "error": true,
  "url": "http://localhost:3100/api/v1/admin/devices",
  "statusCode": 500,
  "statusMessage": "Server Error",
  "message": "デバイス一覧の取得に失敗しました"
}
```

## 問題点と修正案

### 1. デバイスステータス確認API

**問題**:
- Prismaクエリで `is_deleted` フィールドが存在しないエラー

**修正案**:
- Prismaスキーマを確認し、正しいフィールド名を使用する
- 例: `is_deleted` を `isDeleted` に変更する
- または、`is_deleted` フィールドがない場合は、該当条件を削除する

```typescript
// 修正前
const device = await hotelDb.getAdapter().deviceRoom.findFirst({
  where: {
    macAddress: "AA:BB:CC:DD:EE:FF",
    isActive: true,
    is_deleted: false,
  }
});

// 修正後
const device = await hotelDb.getAdapter().deviceRoom.findFirst({
  where: {
    macAddress: "AA:BB:CC:DD:EE:FF",
    isActive: true,
    // is_deleted条件を削除
  }
});
```

### 2. デバイス一覧取得API

**問題**:
- キャンペーン情報が返される（ルーティング問題）

**修正案**:
- ルーティングの設定を確認し、`/api/v1/devices` が正しいコントローラーにマッピングされるようにする
- 重複するルート定義がないか確認する

```typescript
// 修正例
router.get('/api/v1/devices', authenticateJWT, deviceController.getAllDevices);
```

## 次のステップ

1. hotel-common側で上記の修正を行う
2. 修正後、再度テストを実施する
3. すべてのAPIが正常に動作することを確認する
4. hotel-saas側でデバイス認証が正常に機能することを確認する

## 関連ドキュメント

- [デバイスAPI仕様書](../api-implementation/DEVICE_API_SPEC.md)
- [デバイスAPI統合ガイド](../api-implementation/DEVICE_API_INTEGRATION_GUIDE.md)
- [デバイスAPI修正仕様書](./DEVICE_API_FIX.md)

