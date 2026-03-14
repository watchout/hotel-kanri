# hotel-common API仕様

hotel-commonシステムが提供するAPIエンドポイントの仕様です。

## 認証

すべてのAPIリクエストには、JWTトークンによる認証が必要です。トークンは以下のヘッダーで送信します：

```
Authorization: Bearer <token>
```

## ベースURL

```
/api/v1/common
```

## 認証API

### ログイン

```
POST /auth/login
```

#### リクエストボディ
```json
{
  "email": "user@example.com",
  "password": "password123",
  "tenantId": "tenant_001"
}
```

#### レスポンス
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "太郎",
    "lastName": "山田",
    "role": "MANAGER",
    "permissions": ["read:customers", "write:reservations"]
  }
}
```

### トークンリフレッシュ

```
POST /auth/refresh
```

#### リクエストボディ
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### レスポンス
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

### ログアウト

```
POST /auth/logout
```

#### リクエストボディ
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### レスポンス
```json
{
  "success": true,
  "message": "ログアウトしました"
}
```

## ユーザー管理API

### ユーザー作成

```
POST /users
```

#### リクエストボディ
```json
{
  "email": "new.user@example.com",
  "password": "password123",
  "firstName": "花子",
  "lastName": "鈴木",
  "role": "STAFF",
  "permissions": ["read:customers"]
}
```

#### レスポンス
```json
{
  "id": "user_456",
  "email": "new.user@example.com",
  "firstName": "花子",
  "lastName": "鈴木",
  "role": "STAFF",
  "permissions": ["read:customers"],
  "createdAt": "2023-01-01T10:00:00Z"
}
```

### ユーザー一覧取得

```
GET /users
```

#### クエリパラメータ
- `role`: ロールでフィルタリング（任意）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）

#### レスポンス
```json
{
  "data": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "太郎",
      "lastName": "山田",
      "role": "MANAGER",
      "createdAt": "2022-12-01T10:00:00Z"
    },
    {
      "id": "user_456",
      "email": "new.user@example.com",
      "firstName": "花子",
      "lastName": "鈴木",
      "role": "STAFF",
      "createdAt": "2023-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

### ユーザー詳細取得

```
GET /users/:id
```

#### パスパラメータ
- `id`: ユーザーID

#### レスポンス
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "firstName": "太郎",
  "lastName": "山田",
  "role": "MANAGER",
  "permissions": ["read:customers", "write:reservations"],
  "lastLoginAt": "2023-01-05T09:30:00Z",
  "createdAt": "2022-12-01T10:00:00Z",
  "updatedAt": "2023-01-02T14:20:00Z"
}
```

### ユーザー更新

```
PATCH /users/:id
```

#### パスパラメータ
- `id`: ユーザーID

#### リクエストボディ
```json
{
  "firstName": "太郎",
  "lastName": "田中",
  "role": "ADMIN",
  "permissions": ["read:customers", "write:reservations", "read:billing"]
}
```

#### レスポンス
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "firstName": "太郎",
  "lastName": "田中",
  "role": "ADMIN",
  "permissions": ["read:customers", "write:reservations", "read:billing"],
  "updatedAt": "2023-01-06T11:15:00Z"
}
```

## テナント管理API

### テナント作成

```
POST /tenants
```

#### リクエストボディ
```json
{
  "name": "サンプルホテル",
  "subdomain": "sample-hotel",
  "adminEmail": "admin@sample-hotel.com",
  "adminPassword": "password123",
  "adminFirstName": "管理者",
  "adminLastName": "山田"
}
```

#### レスポンス
```json
{
  "id": "tenant_789",
  "name": "サンプルホテル",
  "subdomain": "sample-hotel",
  "status": "ACTIVE",
  "createdAt": "2023-01-10T09:00:00Z",
  "admin": {
    "id": "user_789",
    "email": "admin@sample-hotel.com",
    "firstName": "管理者",
    "lastName": "山田",
    "role": "ADMIN"
  }
}
```

### テナント一覧取得

```
GET /tenants
```

#### クエリパラメータ
- `status`: ステータスでフィルタリング（任意）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）

#### レスポンス
```json
{
  "data": [
    {
      "id": "tenant_001",
      "name": "プランタンホテル東京",
      "subdomain": "printemps-tokyo",
      "status": "ACTIVE",
      "createdAt": "2022-10-01T10:00:00Z"
    },
    {
      "id": "tenant_789",
      "name": "サンプルホテル",
      "subdomain": "sample-hotel",
      "status": "ACTIVE",
      "createdAt": "2023-01-10T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

### テナント詳細取得

```
GET /tenants/:id
```

#### パスパラメータ
- `id`: テナントID

#### レスポンス
```json
{
  "id": "tenant_001",
  "name": "プランタンホテル東京",
  "subdomain": "printemps-tokyo",
  "status": "ACTIVE",
  "createdAt": "2022-10-01T10:00:00Z",
  "updatedAt": "2022-12-15T14:30:00Z",
  "settings": {
    "timezone": "Asia/Tokyo",
    "currency": "JPY",
    "language": "ja",
    "features": {
      "membershipEnabled": true,
      "saasEnabled": true,
      "pmsEnabled": true
    }
  },
  "stats": {
    "userCount": 25,
    "customerCount": 1250,
    "reservationCount": 850
  }
}
```

### テナント更新

```
PATCH /tenants/:id
```

#### パスパラメータ
- `id`: テナントID

#### リクエストボディ
```json
{
  "name": "プランタンホテル東京新館",
  "status": "ACTIVE",
  "settings": {
    "features": {
      "membershipEnabled": true,
      "saasEnabled": true,
      "pmsEnabled": true
    }
  }
}
```

#### レスポンス
```json
{
  "id": "tenant_001",
  "name": "プランタンホテル東京新館",
  "subdomain": "printemps-tokyo",
  "status": "ACTIVE",
  "updatedAt": "2023-01-15T11:30:00Z",
  "settings": {
    "timezone": "Asia/Tokyo",
    "currency": "JPY",
    "language": "ja",
    "features": {
      "membershipEnabled": true,
      "saasEnabled": true,
      "pmsEnabled": true
    }
  }
}
```

## システム管理API

### システム状態取得

```
GET /system/status
```

#### レスポンス
```json
{
  "status": "HEALTHY",
  "timestamp": "2023-01-20T10:00:00Z",
  "components": {
    "auth": {
      "status": "HEALTHY",
      "message": "認証サービスは正常に動作しています"
    },
    "database": {
      "status": "HEALTHY",
      "message": "データベースは正常に接続されています"
    },
    "events": {
      "status": "HEALTHY",
      "message": "イベントブローカーは正常に動作しています"
    },
    "api": {
      "status": "HEALTHY",
      "message": "APIゲートウェイは正常に動作しています"
    }
  },
  "metrics": {
    "uptime": "10d 5h 30m",
    "requestsPerMinute": 250,
    "averageResponseTime": 120,
    "errorRate": 0.01
  }
}
```

### メンテナンス予定登録

```
POST /system/maintenance
```

#### リクエストボディ
```json
{
  "type": "SCHEDULED",
  "startTime": "2023-02-01T02:00:00Z",
  "endTime": "2023-02-01T04:00:00Z",
  "affectedSystems": ["hotel-saas", "hotel-pms", "hotel-member"],
  "description": "定期メンテナンスのためシステムが一時的に利用できません",
  "impact": "FULL_DOWNTIME"
}
```

#### レスポンス
```json
{
  "id": "maint_123",
  "type": "SCHEDULED",
  "startTime": "2023-02-01T02:00:00Z",
  "endTime": "2023-02-01T04:00:00Z",
  "affectedSystems": ["hotel-saas", "hotel-pms", "hotel-member"],
  "description": "定期メンテナンスのためシステムが一時的に利用できません",
  "impact": "FULL_DOWNTIME",
  "createdAt": "2023-01-20T10:30:00Z",
  "createdBy": "admin_user"
}
```

## エラーレスポンス

エラーが発生した場合、以下の形式でレスポンスが返されます：

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "メールアドレスまたはパスワードが正しくありません",
    "details": null
  }
}
```

## ステータスコード

- 200 OK: リクエスト成功
- 201 Created: リソース作成成功
- 400 Bad Request: リクエスト不正
- 401 Unauthorized: 認証エラー
- 403 Forbidden: 権限エラー
- 404 Not Found: リソースが見つからない
- 409 Conflict: リソースの競合
- 422 Unprocessable Entity: バリデーションエラー
- 500 Internal Server Error: サーバーエラー

## 関連ドキュメント
- [OpenAPI仕様](../../api/openapi.yaml)
- [認証ガイド](../../features/authentication/auth-guide.md)
- [イベント連携](../../integration/events/common-events.md)