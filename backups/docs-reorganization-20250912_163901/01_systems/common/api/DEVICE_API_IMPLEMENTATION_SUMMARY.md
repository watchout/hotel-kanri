# デバイスAPI実装サマリー

## 概要

hotel-commonでは、ホテル内の各種デバイス（客室タブレット、TVなど）の管理、認証、状態確認などの機能を提供するデバイスAPIを実装しました。これらのAPIは、hotel-saasアプリケーションからの要求に基づいて実装されています。

## 実装済みAPI

以下のAPIが実装されています：

### 1. デバイス一覧取得API

**エンドポイント**: `GET /api/v1/devices`

**認証**: 必須（JWT）

**機能**:
- テナントに紐づくすべてのデバイスを取得
- 各種フィルタリングオプション対応

### 2. デバイスステータス確認API

**エンドポイント**: `POST /api/v1/devices/check-status`

**認証**: 不要（パブリックAPI）

**機能**:
- MACアドレスとIPアドレスからデバイスを検索
- デバイスの認証状態を確認
- 最終使用日時の自動更新

### 3. クライアントIP取得API

**エンドポイント**: `GET /api/v1/devices/client-ip`

**認証**: 不要（パブリックAPI）

**機能**:
- クライアントのIPアドレスを取得
- 複数のヘッダー情報（X-Forwarded-For, X-Real-IP, X-Client-IP）を確認

### 4. デバイス数取得API

**エンドポイント**: `GET /api/v1/devices/count`

**認証**: 必須（JWT）

**機能**:
- デバイスの集計情報を取得
- アクティブ/非アクティブ状態の集計
- デバイスタイプ別の集計
- ステータス別の集計

### 5. その他のデバイス関連API

- `GET /api/v1/devices/room/:roomId` - 部屋IDに紐づくデバイスを取得
- `GET /api/v1/devices/device/:deviceId` - デバイスIDで特定のデバイスを取得
- `POST /api/v1/devices` - 新しいデバイスを登録
- `PUT /api/v1/devices/:id` - デバイス情報を更新
- `PATCH /api/v1/devices/:id/last-used` - デバイス最終使用日時更新
- `DELETE /api/v1/devices/:id/deactivate` - デバイス非アクティブ化（論理削除）
- `DELETE /api/v1/devices/:id` - デバイス物理削除
- `GET /api/v1/devices/place/:placeId` - プレイスIDに紐づくデバイス取得
- `GET /api/v1/devices/type/:deviceType` - デバイスタイプでフィルタリング
- `GET /api/v1/devices/status/:status` - ステータスでフィルタリング
- `POST /api/v1/devices/bulk` - デバイス一括登録

## 実装詳細

### デバイスステータス確認API

このAPIは、デバイスの認証状態を確認するためのパブリックAPIです。MACアドレスとIPアドレスを受け取り、デバイスが存在するかどうかを確認します。

**リクエスト例**:
```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "ipAddress": "192.168.1.101",
  "userAgent": "Mozilla/5.0 ...",
  "pagePath": "/order"
}
```

**レスポンス例（デバイスが存在する場合）**:
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

**レスポンス例（デバイスが存在しない場合）**:
```json
{
  "found": false,
  "isActive": false
}
```

### クライアントIP取得API

このAPIは、クライアントのIPアドレスを取得するためのパブリックAPIです。

**レスポンス例**:
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

### デバイス数取得API

このAPIは、デバイスの集計情報を取得するためのAPIです。認証が必要です。

**レスポンス例**:
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

## テスト方法

デバイスAPIのテストには、以下のスクリプトを使用できます：

```bash
./test-device-apis.sh
```

このスクリプトは、各APIをテストし、レスポンスを表示します。

## エラーハンドリング

すべてのAPIは、エラー発生時に以下のような形式でレスポンスを返します：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {
      // エラーの詳細情報
    }
  }
}
```

## 認証

管理者権限が必要なAPIは、リクエストヘッダーに以下のような認証情報を含める必要があります：

```
Authorization: Bearer <JWT_TOKEN>
```

JWTトークンは、ログインAPIから取得できます。

## 実装ステータス

| API | ステータス | 備考 |
|-----|------------|------|
| デバイス一覧取得API | 実装済み | |
| デバイスステータス確認API | 実装済み | |
| クライアントIP取得API | 実装済み | |
| デバイス数取得API | 実装済み | |
| デバイス登録API | 実装済み | |
| デバイス更新API | 実装済み | |
| デバイス削除API | 実装済み | |


