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

## スタッフ管理API

### スタッフ作成（管理者用）

```
POST /admin/staff
```

#### 権限要件
- 管理者権限（baseLevel 4以上）が必要

#### リクエストボディ
```json
{
  "email": "new.staff@example.com",
  "password": "password123",
  "firstName": "花子",
  "lastName": "鈴木",
  "displayName": "鈴木 花子",
  "staffCode": "S003",
  "staffNumber": "003",
  "departmentCode": "FRONT",
  "positionTitle": "フロントスタッフ",
  "baseLevel": 2,
  "employmentType": "full_time"
}
```

#### レスポンス
```json
{
  "id": "staff_456",
  "email": "new.staff@example.com",
  "firstName": "花子",
  "lastName": "鈴木",
  "displayName": "鈴木 花子",
  "staffCode": "S003",
  "departmentCode": "FRONT",
  "positionTitle": "フロントスタッフ",
  "baseLevel": 2,
  "employmentStatus": "active",
  "createdAt": "2023-01-01T10:00:00Z"
}
```

### スタッフ一覧取得（管理者用）

```
GET /admin/staff
```

#### 権限要件
- 管理者権限（baseLevel 3以上）が必要

#### クエリパラメータ
- `departmentCode`: 部門コードでフィルタリング（任意）
- `employmentStatus`: 雇用ステータスでフィルタリング（任意）
- `baseLevel`: 権限レベルでフィルタリング（任意）
- `search`: 名前、メールアドレス、スタッフコードで検索（任意）
- `page`: ページ番号（デフォルト: 1）
- `pageSize`: 1ページあたりの件数（デフォルト: 20）

#### レスポンス
```json
{
  "data": [
    {
      "id": "staff_123",
      "staffCode": "S001",
      "displayName": "山田 太郎",
      "email": "yamada@example.com",
      "departmentCode": "FRONT",
      "positionTitle": "フロント主任",
      "baseLevel": 3,
      "employmentStatus": "active",
      "lastLoginAt": "2023-01-05T09:30:00Z",
      "createdAt": "2022-12-01T10:00:00Z"
    },
    {
      "id": "staff_456",
      "staffCode": "S003",
      "displayName": "鈴木 花子",
      "email": "suzuki@example.com",
      "departmentCode": "FRONT",
      "positionTitle": "フロントスタッフ",
      "baseLevel": 2,
      "employmentStatus": "active",
      "lastLoginAt": "2023-01-04T14:20:00Z",
      "createdAt": "2023-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pageSize": 20,
    "totalPages": 2
  },
  "summary": {
    "totalStaff": 25,
    "activeStaff": 23,
    "inactiveStaff": 2,
    "departmentCounts": {
      "FRONT": 8,
      "HOUSEKEEPING": 12,
      "RESTAURANT": 5
    }
  }
}
```

### スタッフ詳細取得（管理者用）

```
GET /admin/staff/:id
```

#### 権限要件
- 管理者権限（baseLevel 3以上）が必要

#### パスパラメータ
- `id`: スタッフID

#### レスポンス
```json
{
  "id": "staff_123",
  "tenantId": "tenant_001",
  "staffCode": "S001",
  "staffNumber": "001",
  "lastName": "山田",
  "firstName": "太郎",
  "displayName": "山田 太郎",
  "email": "yamada@example.com",
  "departmentCode": "FRONT",
  "positionTitle": "フロント主任",
  "baseLevel": 3,
  "employmentType": "full_time",
  "employmentStatus": "active",
  "hireDate": "2022-12-01",
  "lastLoginAt": "2023-01-05T09:30:00Z",
  "createdAt": "2022-12-01T10:00:00Z",
  "updatedAt": "2023-01-02T14:20:00Z"
}
```

### スタッフ更新（管理者用）

```
PATCH /admin/staff/:id
```

#### 権限要件
- 管理者権限（baseLevel 3以上）が必要
- 自分より上位レベルのスタッフは更新不可

#### パスパラメータ
- `id`: スタッフID

#### リクエストボディ
```json
{
  "firstName": "太郎",
  "lastName": "田中",
  "displayName": "田中 太郎",
  "departmentCode": "MANAGEMENT",
  "positionTitle": "副支配人",
  "baseLevel": 4,
  "employmentStatus": "active"
}
```

#### レスポンス
```json
{
  "id": "staff_123",
  "email": "yamada@example.com",
  "firstName": "太郎",
  "lastName": "田中",
  "displayName": "田中 太郎",
  "departmentCode": "MANAGEMENT",
  "positionTitle": "副支配人",
  "baseLevel": 4,
  "employmentStatus": "active",
  "updatedAt": "2023-01-06T11:15:00Z"
}
```

### スタッフ削除（管理者用）

```
DELETE /admin/staff/:id
```

#### 権限要件
- 管理者権限（baseLevel 4以上）が必要
- システムユーザーは削除不可

#### パスパラメータ
- `id`: スタッフID

#### クエリパラメータ
- `soft`: ソフト削除フラグ（デフォルト: true）

#### レスポンス
```json
{
  "success": true,
  "message": "スタッフを削除しました",
  "deletedAt": "2023-03-01T15:00:00Z"
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