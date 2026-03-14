# キャンペーン管理API仕様書

## 概要

このAPIはホテル予約システムのキャンペーン管理機能を提供します。管理者向けAPIとクライアント向けAPIがあります。

## 基本情報

- ベースURL: `/api/v1`
- 認証: JWT認証
- レスポンス形式: JSON

## 管理者向けAPI

### キャンペーン一覧取得

```
GET /admin/campaigns
```

**クエリパラメータ:**
- `page`: ページ番号 (デフォルト: 1)
- `limit`: 1ページあたりの件数 (デフォルト: 20)
- `status`: ステータスでフィルタリング (オプション)
- `type`: タイプでフィルタリング (オプション)
- `displayType`: 表示タイプでフィルタリング (オプション)
- `search`: 検索キーワード (オプション)

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "code": "string",
      "name": "string",
      "description": "string",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.999Z",
      "status": "ACTIVE",
      "displayType": "BANNER",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### キャンペーン詳細取得

```
GET /admin/campaigns/:id
```

**パスパラメータ:**
- `id`: キャンペーンID

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "code": "string",
    "name": "string",
    "description": "string",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.999Z",
    "status": "ACTIVE",
    "displayType": "BANNER",
    "displayPriority": 100,
    "ctaType": "BUTTON",
    "ctaText": "詳細を見る",
    "ctaUrl": "https://example.com",
    "discountType": "PERCENTAGE",
    "discountValue": 10,
    "minOrderAmount": 5000,
    "maxUsageCount": 1000,
    "perUserLimit": 1,
    "timeRestrictions": {
      "enabled": true,
      "startTime": "10:00",
      "endTime": "18:00"
    },
    "dayRestrictions": {
      "enabled": true,
      "days": {
        "monday": true,
        "tuesday": true,
        "wednesday": true,
        "thursday": true,
        "friday": true,
        "saturday": false,
        "sunday": false
      }
    },
    "welcomeSettings": {
      "enabled": true,
      "imageUrl": "https://example.com/image.jpg",
      "videoUrl": null,
      "buttonText": "OK",
      "showOnce": true
    },
    "translations": [
      {
        "id": "string",
        "languageCode": "ja",
        "name": "キャンペーン名",
        "description": "キャンペーン説明",
        "ctaText": "詳細を見る"
      }
    ],
    "items": [
      {
        "id": "string",
        "productId": "string",
        "discountType": "PERCENTAGE",
        "discountValue": 10
      }
    ],
    "categories": [
      {
        "id": "string",
        "code": "string",
        "name": "string"
      }
    ],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### キャンペーン作成

```
POST /admin/campaigns
```

**リクエストボディ:**
```json
{
  "code": "string",
  "name": "string",
  "description": "string",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z",
  "status": "DRAFT",
  "displayType": "BANNER",
  "displayPriority": 100,
  "ctaType": "BUTTON",
  "ctaText": "詳細を見る",
  "ctaUrl": "https://example.com",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "minOrderAmount": 5000,
  "maxUsageCount": 1000,
  "perUserLimit": 1,
  "timeRestrictions": {
    "enabled": true,
    "startTime": "10:00",
    "endTime": "18:00"
  },
  "dayRestrictions": {
    "enabled": true,
    "days": {
      "monday": true,
      "tuesday": true,
      "wednesday": true,
      "thursday": true,
      "friday": true,
      "saturday": false,
      "sunday": false
    }
  },
  "welcomeSettings": {
    "enabled": true,
    "imageUrl": "https://example.com/image.jpg",
    "videoUrl": null,
    "buttonText": "OK",
    "showOnce": true
  },
  "translations": [
    {
      "languageCode": "ja",
      "name": "キャンペーン名",
      "description": "キャンペーン説明",
      "ctaText": "詳細を見る"
    }
  ],
  "items": [
    {
      "productId": "string",
      "discountType": "PERCENTAGE",
      "discountValue": 10
    }
  ],
  "categories": ["category_id_1", "category_id_2"]
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "code": "string",
    "name": "string",
    "description": "string",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.999Z",
    "status": "DRAFT",
    "displayType": "BANNER",
    "displayPriority": 100,
    "ctaType": "BUTTON",
    "ctaText": "詳細を見る",
    "ctaUrl": "https://example.com",
    "discountType": "PERCENTAGE",
    "discountValue": 10,
    "minOrderAmount": 5000,
    "maxUsageCount": 1000,
    "perUserLimit": 1,
    "timeRestrictions": {
      "enabled": true,
      "startTime": "10:00",
      "endTime": "18:00"
    },
    "dayRestrictions": {
      "enabled": true,
      "days": {
        "monday": true,
        "tuesday": true,
        "wednesday": true,
        "thursday": true,
        "friday": true,
        "saturday": false,
        "sunday": false
      }
    },
    "welcomeSettings": {
      "enabled": true,
      "imageUrl": "https://example.com/image.jpg",
      "videoUrl": null,
      "buttonText": "OK",
      "showOnce": true
    },
    "translations": [
      {
        "id": "string",
        "languageCode": "ja",
        "name": "キャンペーン名",
        "description": "キャンペーン説明",
        "ctaText": "詳細を見る"
      }
    ],
    "items": [
      {
        "id": "string",
        "productId": "string",
        "discountType": "PERCENTAGE",
        "discountValue": 10
      }
    ],
    "categories": [
      {
        "id": "string",
        "code": "string",
        "name": "string"
      }
    ],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### キャンペーン更新

```
PUT /admin/campaigns/:id
```

**パスパラメータ:**
- `id`: キャンペーンID

**リクエストボディ:**
```json
{
  "name": "string",
  "description": "string",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z",
  "status": "ACTIVE",
  "displayType": "BANNER",
  "displayPriority": 100,
  "ctaType": "BUTTON",
  "ctaText": "詳細を見る",
  "ctaUrl": "https://example.com",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "minOrderAmount": 5000,
  "maxUsageCount": 1000,
  "perUserLimit": 1,
  "timeRestrictions": {
    "enabled": true,
    "startTime": "10:00",
    "endTime": "18:00"
  },
  "dayRestrictions": {
    "enabled": true,
    "days": {
      "monday": true,
      "tuesday": true,
      "wednesday": true,
      "thursday": true,
      "friday": true,
      "saturday": false,
      "sunday": false
    }
  },
  "welcomeSettings": {
    "enabled": true,
    "imageUrl": "https://example.com/image.jpg",
    "videoUrl": null,
    "buttonText": "OK",
    "showOnce": true
  },
  "translations": [
    {
      "languageCode": "ja",
      "name": "キャンペーン名",
      "description": "キャンペーン説明",
      "ctaText": "詳細を見る"
    }
  ],
  "items": [
    {
      "productId": "string",
      "discountType": "PERCENTAGE",
      "discountValue": 10
    }
  ],
  "categories": ["category_id_1", "category_id_2"]
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "code": "string",
    "name": "string",
    "description": "string",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.999Z",
    "status": "ACTIVE",
    "displayType": "BANNER",
    "displayPriority": 100,
    "ctaType": "BUTTON",
    "ctaText": "詳細を見る",
    "ctaUrl": "https://example.com",
    "discountType": "PERCENTAGE",
    "discountValue": 10,
    "minOrderAmount": 5000,
    "maxUsageCount": 1000,
    "perUserLimit": 1,
    "timeRestrictions": {
      "enabled": true,
      "startTime": "10:00",
      "endTime": "18:00"
    },
    "dayRestrictions": {
      "enabled": true,
      "days": {
        "monday": true,
        "tuesday": true,
        "wednesday": true,
        "thursday": true,
        "friday": true,
        "saturday": false,
        "sunday": false
      }
    },
    "welcomeSettings": {
      "enabled": true,
      "imageUrl": "https://example.com/image.jpg",
      "videoUrl": null,
      "buttonText": "OK",
      "showOnce": true
    },
    "translations": [
      {
        "id": "string",
        "languageCode": "ja",
        "name": "キャンペーン名",
        "description": "キャンペーン説明",
        "ctaText": "詳細を見る"
      }
    ],
    "items": [
      {
        "id": "string",
        "productId": "string",
        "discountType": "PERCENTAGE",
        "discountValue": 10
      }
    ],
    "categories": [
      {
        "id": "string",
        "code": "string",
        "name": "string"
      }
    ],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### キャンペーン削除

```
DELETE /admin/campaigns/:id
```

**パスパラメータ:**
- `id`: キャンペーンID

**レスポンス:**
```
204 No Content
```

## クライアント向けAPI

### アクティブなキャンペーン一覧取得

```
GET /campaigns/active
```

**クエリパラメータ:**
- `lang`: 言語コード (オプション、デフォルト: ja)

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "code": "string",
      "name": "string",
      "description": "string",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.999Z",
      "status": "ACTIVE",
      "displayType": "BANNER",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### キャンペーン適用チェック

```
GET /campaigns/check
```

**クエリパラメータ:**
- `productId`: 商品ID (オプション)
- `categoryCode`: カテゴリーコード (オプション)
- `orderAmount`: 注文金額 (デフォルト: 0)

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "applicable": true,
    "campaign": {
      "id": "string",
      "code": "string",
      "name": "string",
      "description": "string",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.999Z",
      "status": "ACTIVE",
      "displayType": "BANNER",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### カテゴリー別キャンペーン取得

```
GET /campaigns/by-category/:code
```

**パスパラメータ:**
- `code`: カテゴリーコード

**クエリパラメータ:**
- `lang`: 言語コード (オプション、デフォルト: ja)

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "code": "string",
      "name": "string",
      "description": "string",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.999Z",
      "status": "ACTIVE",
      "displayType": "BANNER",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### ウェルカムスクリーン設定取得

```
GET /welcome-screen/config
```

**クエリパラメータ:**
- `lang`: 言語コード (オプション、デフォルト: ja)

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "title": "ようこそ",
    "message": "当ホテルへようこそ",
    "imageUrl": "https://example.com/image.jpg",
    "videoUrl": null,
    "buttonText": "OK",
    "showOnce": true
  }
}
```

### ウェルカムスクリーン表示判定

```
GET /welcome-screen/should-show
```

**クエリパラメータ:**
- `deviceId`: デバイスID (必須)

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "shouldShow": true
  }
}
```

### ウェルカムスクリーン完了マーク

```
POST /welcome-screen/mark-completed
```

**リクエストボディ:**
```json
{
  "deviceId": "string"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

## エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {}
  }
}
```

**エラーコード:**
- `VALIDATION_ERROR`: バリデーションエラー
- `NOT_FOUND`: リソースが見つからない
- `ALREADY_EXISTS`: リソースが既に存在する
- `UNAUTHORIZED`: 認証エラー
- `FORBIDDEN`: 権限エラー
- `INTERNAL_SERVER_ERROR`: 内部サーバーエラー
