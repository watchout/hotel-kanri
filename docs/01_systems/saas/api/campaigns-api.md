# キャンペーンAPI仕様書

## 概要

キャンペーン管理APIは、hotel-common側で実装され、統合DB（PostgreSQL）に接続して動作します。このAPIはキャンペーン管理機能とウェルカムスクリーン機能を提供します。

## 認証

すべてのAPIリクエストには有効なJWTトークンが必要です。認証ヘッダーに以下の形式でトークンを付与してください：

```
Authorization: Bearer <jwt_token>
```

## API エンドポイント

### キャンペーン管理API

#### キャンペーン一覧取得

```
GET /api/v1/admin/campaigns
```

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）
- `isActive`: アクティブなキャンペーンのみ取得（true/false）
- `language`: 言語コード（デフォルト: ja）

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "朝食タイムセール",
      "description": "朝7時から9時までの限定価格",
      "type": "percentage",
      "value": 20,
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-12-31T23:59:59Z",
      "isActive": true,
      "timeRestrictions": {
        "timeSlots": [
          {
            "startTime": "07:00",
            "endTime": "09:00"
          }
        ],
        "allowedDays": [1, 2, 3, 4, 5]
      },
      "minOrderAmount": null,
      "maxUsageCount": null,
      "currentUsageCount": 0,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1
  }
}
```

#### キャンペーン作成

```
POST /api/v1/admin/campaigns
```

**リクエストボディ**:
```json
{
  "name": "朝食タイムセール",
  "description": "朝7時から9時までの限定価格",
  "type": "percentage",
  "value": 20,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "isActive": true,
  "timeRestrictions": {
    "timeSlots": [
      {
        "startTime": "07:00",
        "endTime": "09:00"
      }
    ],
    "allowedDays": [1, 2, 3, 4, 5]
  },
  "minOrderAmount": null,
  "maxUsageCount": null,
  "menuItemIds": [1, 2, 3]
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "朝食タイムセール",
    "description": "朝7時から9時までの限定価格",
    "type": "percentage",
    "value": 20,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "isActive": true,
    "timeRestrictions": {
      "timeSlots": [
        {
          "startTime": "07:00",
          "endTime": "09:00"
        }
      ],
      "allowedDays": [1, 2, 3, 4, 5]
    },
    "minOrderAmount": null,
    "maxUsageCount": null,
    "currentUsageCount": 0,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "items": [
      { "id": 1, "menuItemId": 1 },
      { "id": 2, "menuItemId": 2 },
      { "id": 3, "menuItemId": 3 }
    ]
  }
}
```

#### キャンペーン詳細取得

```
GET /api/v1/admin/campaigns/:id
```

**パスパラメータ**:
- `id`: キャンペーンID

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "朝食タイムセール",
    "description": "朝7時から9時までの限定価格",
    "type": "percentage",
    "value": 20,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "isActive": true,
    "timeRestrictions": {
      "timeSlots": [
        {
          "startTime": "07:00",
          "endTime": "09:00"
        }
      ],
      "allowedDays": [1, 2, 3, 4, 5]
    },
    "minOrderAmount": null,
    "maxUsageCount": null,
    "currentUsageCount": 0,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "items": [
      {
        "id": 1,
        "menuItemId": 1,
        "menuItem": {
          "id": 1,
          "name": "モーニングセット",
          "price": 1200
        }
      },
      {
        "id": 2,
        "menuItemId": 2,
        "menuItem": {
          "id": 2,
          "name": "フレンチトースト",
          "price": 800
        }
      }
    ]
  }
}
```

#### キャンペーン更新

```
PUT /api/v1/admin/campaigns/:id
```

**パスパラメータ**:
- `id`: キャンペーンID

**リクエストボディ**:
```json
{
  "name": "朝食タイムセール【更新】",
  "description": "朝7時から10時までの限定価格",
  "type": "percentage",
  "value": 25,
  "timeRestrictions": {
    "timeSlots": [
      {
        "startTime": "07:00",
        "endTime": "10:00"
      }
    ],
    "allowedDays": [1, 2, 3, 4, 5, 6, 7]
  },
  "menuItemIds": [1, 2, 3, 4]
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "朝食タイムセール【更新】",
    "description": "朝7時から10時までの限定価格",
    "type": "percentage",
    "value": 25,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "isActive": true,
    "timeRestrictions": {
      "timeSlots": [
        {
          "startTime": "07:00",
          "endTime": "10:00"
        }
      ],
      "allowedDays": [1, 2, 3, 4, 5, 6, 7]
    },
    "minOrderAmount": null,
    "maxUsageCount": null,
    "currentUsageCount": 0,
    "updatedAt": "2025-01-02T00:00:00Z"
  }
}
```

#### キャンペーン削除

```
DELETE /api/v1/admin/campaigns/:id
```

**パスパラメータ**:
- `id`: キャンペーンID

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "isDeleted": true
  }
}
```

### 客室側API

#### アクティブなキャンペーン一覧取得

```
GET /api/v1/campaigns/active
```

**クエリパラメータ**:
- `language`: 言語コード（デフォルト: ja）

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "朝食タイムセール",
      "description": "朝7時から9時までの限定価格",
      "type": "percentage",
      "value": 20,
      "timeRestrictions": {
        "timeSlots": [
          {
            "startTime": "07:00",
            "endTime": "09:00"
          }
        ]
      },
      "items": [
        {
          "menuItemId": 1,
          "menuItem": {
            "id": 1,
            "name": "モーニングセット",
            "originalPrice": 1200,
            "campaignPrice": 960
          }
        }
      ]
    }
  ]
}
```

#### キャンペーン適用確認

```
GET /api/v1/campaigns/check
```

**クエリパラメータ**:
- `menuItemId`: 商品ID
- `categoryCode`: カテゴリーコード（オプション）
- `orderAmount`: 注文金額（オプション）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "activeCampaign": {
      "id": 1,
      "name": "朝食タイムセール",
      "type": "percentage",
      "value": 20,
      "timeRestrictions": {
        "timeSlots": [
          {
            "startTime": "07:00",
            "endTime": "09:00"
          }
        ]
      }
    },
    "originalPrice": 1200,
    "campaignPrice": 960,
    "discountAmount": 240,
    "discountText": "20%オフ"
  }
}
```

#### カテゴリー別キャンペーン取得

```
GET /api/v1/campaigns/by-category/:categoryCode
```

**パスパラメータ**:
- `categoryCode`: カテゴリーコード

**クエリパラメータ**:
- `language`: 言語コード（デフォルト: ja）

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "朝食タイムセール",
      "description": "朝7時から9時までの限定価格",
      "type": "percentage",
      "value": 20,
      "items": [
        {
          "menuItemId": 1,
          "menuItem": {
            "id": 1,
            "name": "モーニングセット",
            "originalPrice": 1200,
            "campaignPrice": 960
          }
        }
      ]
    }
  ]
}
```

### ウェルカムスクリーンAPI

#### ウェルカムスクリーン設定取得

```
GET /api/v1/welcome-screen/config
```

**クエリパラメータ**:
- `language`: 言語コード（デフォルト: ja）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "title": "ようこそ、ホテルサービスへ",
    "description": "タブレットから様々なサービスをご利用いただけます。",
    "buttonText": "始める",
    "imageUrl": "https://example.com/welcome.jpg",
    "showOnce": true
  }
}
```

#### ウェルカムスクリーン表示判定

```
GET /api/v1/welcome-screen/should-show
```

**クエリパラメータ**:
- `deviceId`: デバイスID

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "shouldShow": true
  }
}
```

#### ウェルカムスクリーン完了マーク

```
POST /api/v1/welcome-screen/mark-completed
```

**リクエストボディ**:
```json
{
  "deviceId": "device-123456"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "deviceId": "device-123456",
    "completedAt": "2025-01-01T12:34:56Z"
  }
}
```

## エラーレスポンス

エラーが発生した場合、以下の形式でレスポンスが返されます：

```json
{
  "success": false,
  "error": {
    "code": "CAMPAIGN_NOT_FOUND",
    "message": "指定されたキャンペーンが見つかりません",
    "status": 404
  }
}
```

## 主なエラーコード

- `UNAUTHORIZED`: 認証エラー（401）
- `FORBIDDEN`: 権限エラー（403）
- `CAMPAIGN_NOT_FOUND`: キャンペーンが見つからない（404）
- `VALIDATION_ERROR`: バリデーションエラー（400）
- `INTERNAL_SERVER_ERROR`: サーバー内部エラー（500）

## 注意事項

1. 時間帯制限のあるキャンペーンは、サーバー時間（UTC）で判定されます。
2. キャンペーン適用の優先順位は、割引額が大きい順となります。
3. 多言語対応は、`language`パラメータで言語コードを指定することで利用できます。
