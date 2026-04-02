# デバイスAPI仕様書

このドキュメントは、hotel-commonが提供するデバイス関連APIの仕様を定義します。

## 概要

デバイスAPIは、ホテル内の各種デバイス（客室タブレット、TVなど）の管理、認証、状態確認などの機能を提供します。

## API一覧

### 1. デバイス一覧取得API

**エンドポイント**: `GET /api/v1/devices`

**説明**: 登録されているすべてのデバイスの一覧を取得します。

**認証**: 必須（管理者権限）

**パラメータ**:
- `tenantId` (optional): テナントIDでフィルタリング
- `status` (optional): デバイスのステータスでフィルタリング（active, inactive）
- `type` (optional): デバイスタイプでフィルタリング（tablet, tv, kiosk）
- `page` (optional): ページ番号（デフォルト: 1）
- `limit` (optional): 1ページあたりの件数（デフォルト: 100）

**レスポンス**:
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

**説明**: デバイスの認証状態を確認します。

**認証**: 不要（パブリックAPI）

**リクエストボディ**:
```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "ipAddress": "192.168.1.101",
  "userAgent": "Mozilla/5.0 ...",
  "pagePath": "/order"
}
```

**レスポンス**:
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

または、デバイスが見つからない場合:
```json
{
  "found": false,
  "isActive": false
}
```

### 3. クライアントIP取得API

**エンドポイント**: `GET /api/v1/devices/client-ip`

**説明**: クライアントのIPアドレスを取得します。

**認証**: 不要（パブリックAPI）

**レスポンス**:
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

**説明**: デバイスの集計情報を取得します。

**認証**: 必須（管理者権限）

**パラメータ**:
- `tenantId` (optional): テナントIDでフィルタリング

**レスポンス**:
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

### 5. デバイス登録API

**エンドポイント**: `POST /api/v1/devices`

**説明**: 新しいデバイスを登録します。

**認証**: 必須（管理者権限）

**リクエストボディ**:
```json
{
  "deviceName": "客室タブレット 101",
  "roomId": "101",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "ipAddress": "192.168.1.101",
  "type": "tablet",
  "isActive": true
}
```

**レスポンス**:
```json
{
  "success": true,
  "device": {
    "id": "device-001",
    "deviceName": "客室タブレット 101",
    "roomId": "101",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "ipAddress": "192.168.1.101",
    "type": "tablet",
    "isActive": true,
    "lastActive": "2025-08-24T04:30:00.000Z",
    "createdAt": "2025-08-24T04:30:00.000Z",
    "updatedAt": "2025-08-24T04:30:00.000Z"
  }
}
```

### 6. デバイス更新API

**エンドポイント**: `PUT /api/v1/devices/:deviceId`

**説明**: 既存のデバイス情報を更新します。

**認証**: 必須（管理者権限）

**パスパラメータ**:
- `deviceId`: デバイスID

**リクエストボディ**:
```json
{
  "deviceName": "客室タブレット 101（更新）",
  "roomId": "101",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "ipAddress": "192.168.1.101",
  "type": "tablet",
  "isActive": true
}
```

**レスポンス**:
```json
{
  "success": true,
  "device": {
    "id": "device-001",
    "deviceName": "客室タブレット 101（更新）",
    "roomId": "101",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "ipAddress": "192.168.1.101",
    "type": "tablet",
    "isActive": true,
    "lastActive": "2025-08-24T04:30:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-08-24T04:30:00.000Z"
  }
}
```

### 7. デバイス削除API

**エンドポイント**: `DELETE /api/v1/devices/:deviceId`

**説明**: デバイスを削除します。

**認証**: 必須（管理者権限）

**パスパラメータ**:
- `deviceId`: デバイスID

**レスポンス**:
```json
{
  "success": true,
  "message": "デバイスが正常に削除されました"
}
```

## エラーレスポンス

すべてのAPIは、エラー発生時に以下のような形式でレスポンスを返します：

```json
{
  "success": false,
  "error": {
    "code": "DEVICE_NOT_FOUND",
    "message": "指定されたデバイスが見つかりません",
    "details": {
      "deviceId": "device-999"
    }
  }
}
```

## エラーコード一覧

- `DEVICE_NOT_FOUND`: 指定されたデバイスが見つかりません
- `INVALID_DEVICE_DATA`: デバイスデータが不正です
- `DUPLICATE_MAC_ADDRESS`: 重複するMACアドレスが存在します
- `DUPLICATE_DEVICE_NAME`: 重複するデバイス名が存在します
- `UNAUTHORIZED`: 認証が必要です
- `FORBIDDEN`: 権限がありません
- `INTERNAL_ERROR`: 内部エラーが発生しました

## 認証

管理者権限が必要なAPIは、リクエストヘッダーに以下のような認証情報を含める必要があります：

```
Authorization: Bearer <JWT_TOKEN>
```

JWTトークンは、ログインAPIから取得できます。

## データモデル

### デバイス

| フィールド | 型 | 説明 |
|------------|------|-------------|
| id | string | デバイスID |
| deviceName | string | デバイス名 |
| roomId | string | 部屋ID |
| macAddress | string | MACアドレス |
| ipAddress | string | IPアドレス |
| type | string | デバイスタイプ（tablet, tv, kiosk） |
| isActive | boolean | アクティブ状態 |
| lastActive | string (ISO 8601) | 最終アクティブ日時 |
| createdAt | string (ISO 8601) | 作成日時 |
| updatedAt | string (ISO 8601) | 更新日時 |

## 実装ステータス

| API | ステータス | 備考 |
|-----|------------|------|
| デバイス一覧取得API | 未実装 | |
| デバイスステータス確認API | 未実装 | |
| クライアントIP取得API | 未実装 | |
| デバイス数取得API | 未実装 | |
| デバイス登録API | 未実装 | |
| デバイス更新API | 未実装 | |
| デバイス削除API | 未実装 | |
