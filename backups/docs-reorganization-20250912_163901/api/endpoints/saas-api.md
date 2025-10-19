# hotel-saas API仕様

hotel-saasシステムが提供するAPIエンドポイントの仕様です。

## 認証

すべてのAPIリクエストには、JWTトークンによる認証が必要です。トークンは以下のヘッダーで送信します：

```
Authorization: Bearer <token>
```

## ベースURL

```
/api/v1
```

## サービス関連API

### サービス一覧取得

```
GET /services
```

#### クエリパラメータ
- `category`: サービスカテゴリでフィルタリング（任意）
- `status`: サービスステータスでフィルタリング（任意）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）

#### レスポンス
```json
{
  "data": [
    {
      "id": "svc_123",
      "name": "ルームサービス - 朝食",
      "description": "和洋選べる朝食セット",
      "category": "FOOD",
      "price": 2000,
      "taxRate": 0.1,
      "images": ["url1", "url2"],
      "availability": {
        "startTime": "07:00",
        "endTime": "10:00",
        "daysOfWeek": [0, 1, 2, 3, 4, 5, 6]
      },
      "status": "ACTIVE"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### サービス詳細取得

```
GET /services/:id
```

#### パスパラメータ
- `id`: サービスID

#### レスポンス
```json
{
  "id": "svc_123",
  "name": "ルームサービス - 朝食",
  "description": "和洋選べる朝食セット",
  "category": "FOOD",
  "price": 2000,
  "taxRate": 0.1,
  "images": ["url1", "url2"],
  "availability": {
    "startTime": "07:00",
    "endTime": "10:00",
    "daysOfWeek": [0, 1, 2, 3, 4, 5, 6]
  },
  "status": "ACTIVE",
  "options": [
    {
      "id": "opt_1",
      "name": "和食セット",
      "price": 0
    },
    {
      "id": "opt_2",
      "name": "洋食セット",
      "price": 0
    }
  ]
}
```

## 注文関連API

### 注文作成

```
POST /orders
```

#### リクエストボディ
```json
{
  "serviceId": "svc_123",
  "roomId": "room_456",
  "quantity": 2,
  "requestedDeliveryTime": "2023-01-01T08:00:00Z",
  "options": ["opt_2"],
  "specialInstructions": "アレルギー：小麦"
}
```

#### レスポンス
```json
{
  "id": "ord_789",
  "serviceId": "svc_123",
  "serviceName": "ルームサービス - 朝食",
  "roomId": "room_456",
  "quantity": 2,
  "amount": 4400,
  "status": "PENDING",
  "requestedDeliveryTime": "2023-01-01T08:00:00Z",
  "options": ["洋食セット"],
  "specialInstructions": "アレルギー：小麦",
  "createdAt": "2023-01-01T07:30:00Z"
}
```

### 注文キャンセル

```
POST /orders/:id/cancel
```

#### パスパラメータ
- `id`: 注文ID

#### リクエストボディ
```json
{
  "reason": "予定変更のため"
}
```

#### レスポンス
```json
{
  "id": "ord_789",
  "status": "CANCELED",
  "canceledAt": "2023-01-01T07:45:00Z",
  "reason": "予定変更のため"
}
```

### 注文履歴取得

```
GET /orders
```

#### クエリパラメータ
- `status`: 注文ステータスでフィルタリング（任意）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）

#### レスポンス
```json
{
  "data": [
    {
      "id": "ord_789",
      "serviceId": "svc_123",
      "serviceName": "ルームサービス - 朝食",
      "status": "PENDING",
      "quantity": 2,
      "amount": 4400,
      "requestedDeliveryTime": "2023-01-01T08:00:00Z",
      "createdAt": "2023-01-01T07:30:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

## フィードバック関連API

### フィードバック送信

```
POST /feedback
```

#### リクエストボディ
```json
{
  "serviceId": "svc_123",
  "orderId": "ord_789",
  "rating": 4,
  "comment": "とても良いサービスでした。ただ、配達が少し遅かったです。"
}
```

#### レスポンス
```json
{
  "id": "fb_101",
  "serviceId": "svc_123",
  "orderId": "ord_789",
  "rating": 4,
  "comment": "とても良いサービスでした。ただ、配達が少し遅かったです。",
  "submittedAt": "2023-01-01T10:15:00Z"
}
```

### フィードバック一覧取得

```
GET /feedback
```

#### クエリパラメータ
- `serviceId`: サービスIDでフィルタリング（任意）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）

#### レスポンス
```json
{
  "data": [
    {
      "id": "fb_101",
      "serviceId": "svc_123",
      "serviceName": "ルームサービス - 朝食",
      "rating": 4,
      "comment": "とても良いサービスでした。ただ、配達が少し遅かったです。",
      "submittedAt": "2023-01-01T10:15:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

## 顧客情報API

### 顧客情報取得

```
GET /customer
```

#### レスポンス
```json
{
  "id": "cust_123",
  "firstName": "太郎",
  "lastName": "山田",
  "email": "taro.yamada@example.com",
  "preferences": {
    "foodPreferences": ["和食", "イタリアン"],
    "specialDates": [
      {
        "type": "BIRTHDAY",
        "date": "04-01"
      },
      {
        "type": "ANNIVERSARY",
        "date": "06-15"
      }
    ]
  },
  "membership": {
    "rank": "GOLD",
    "points": 1500,
    "benefits": ["朝食無料", "レイトチェックアウト"]
  }
}
```

## エラーレスポンス

エラーが発生した場合、以下の形式でレスポンスが返されます：

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "リクエストパラメータが不正です",
    "details": [
      {
        "field": "quantity",
        "message": "1以上の値を指定してください"
      }
    ]
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
- [イベント連携](../../integration/events/saas-events.md)