# デバイスAPI修正仕様書

## 概要

hotel-saasアプリケーションのデバイス関連APIをhotel-common APIに統合する過程で、以下の問題が確認されました。これらの問題を修正するための仕様を提供します。

## 問題点

1. **デバイス一覧取得API**: `GET /api/v1/devices` エンドポイントが存在しない
2. **デバイスステータス確認API**: `POST /api/v1/devices/check-status` エンドポイントが存在しない
3. **クライアントIP取得API**: `GET /api/v1/devices/client-ip` エンドポイントが存在しない
4. **デバイス数取得API**: `GET /api/v1/devices/count` エンドポイントが存在しない

## 修正内容

### 1. デバイス一覧取得API

**エンドポイント**: `GET /api/v1/devices`

**実装内容**:
- デバイステーブルからデバイス一覧を取得する
- フィルタリング、ページネーション機能を実装する
- 認証チェックを実装する（管理者権限のみアクセス可能）

**期待されるレスポンス**:
```json
{
  "success": true,
  "devices": [
    {
      "id": "device-001",
      "deviceName": "客室タブレット 101",
      "roomId": "101",
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "ipAddress": "192.168.1.101",
      "type": "tablet",
      "isActive": true,
      "lastActive": "2025-08-24T04:30:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-08-24T04:30:00.000Z"
    },
    // ...
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 100,
    "pages": 2
  }
}
```

### 2. デバイスステータス確認API

**エンドポイント**: `POST /api/v1/devices/check-status`

**実装内容**:
- MACアドレス、IPアドレスからデバイスを検索する
- デバイスが存在し、アクティブであれば詳細情報を返す
- 存在しない場合は `found: false` を返す
- 認証は不要（パブリックAPI）

**期待されるレスポンス**:
```json
{
  "found": true,
  "isActive": true,
  "deviceId": "device-001",
  "deviceName": "客室タブレット 101",
  "roomId": "101",
  "ipAddress": "192.168.1.101",
  "macAddress": "AA:BB:CC:DD:EE:FF"
}
```

### 3. クライアントIP取得API

**エンドポイント**: `GET /api/v1/devices/client-ip`

**実装内容**:
- リクエストヘッダーからクライアントIPアドレスを取得する
- 認証は不要（パブリックAPI）

**期待されるレスポンス**:
```json
{
  "ip": "192.168.1.101",
  "headers": {
    "x-forwarded-for": "192.168.1.101",
    "x-real-ip": null,
    "x-client-ip": null
  }
}
```

### 4. デバイス数取得API

**エンドポイント**: `GET /api/v1/devices/count`

**実装内容**:
- デバイスの集計情報を取得する
- テナントIDでフィルタリングできるようにする
- 認証チェックを実装する（管理者権限のみアクセス可能）

**期待されるレスポンス**:
```json
{
  "success": true,
  "count": {
    "total": 50,
    "active": 42,
    "inactive": 8,
    "byType": {
      "tv": 35,
      "tablet": 12,
      "kiosk": 3
    },
    "byStatus": {
      "online": 38,
      "offline": 4,
      "maintenance": 8
    }
  }
}
```

## 実装優先度

1. デバイスステータス確認API（最優先）
2. クライアントIP取得API
3. デバイス一覧取得API
4. デバイス数取得API

## 注意事項

- すべてのAPIはエラーハンドリングを適切に実装すること
- レスポンスフォーマットは上記の通りに統一すること
- パフォーマンスを考慮し、不要なデータベースアクセスを最小限にすること
- デバイスステータス確認APIは高速なレスポンスが求められるため、最適化すること

## 関連ドキュメント

- [デバイスAPI仕様書](../api-implementation/DEVICE_API_SPEC.md)
- [デバイスAPI統合ガイド](../api-implementation/DEVICE_API_INTEGRATION_GUIDE.md)
