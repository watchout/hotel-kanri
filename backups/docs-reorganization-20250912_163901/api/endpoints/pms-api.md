# hotel-pms API仕様

hotel-pmsシステムが提供するAPIエンドポイントの仕様です。

## 認証

すべてのAPIリクエストには、JWTトークンによる認証が必要です。トークンは以下のヘッダーで送信します：

```
Authorization: Bearer <token>
```

## ベースURL

```
/api/v1/pms
```

## 予約API

### 予約一覧取得

```
GET /reservations
```

#### クエリパラメータ
- `startDate`: 開始日（ISO 8601形式）
- `endDate`: 終了日（ISO 8601形式）
- `status`: 予約ステータス（PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELED, NO_SHOW）
- `origin`: 予約元（MEMBER, OTA, FRONT, PHONE, WALK_IN）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）

#### レスポンス
```json
{
  "data": [
    {
      "id": "res_12345",
      "customerId": "cust_6789",
      "customerName": "山田 太郎",
      "roomId": "room_101",
      "roomNumber": "101",
      "roomType": "デラックス",
      "checkInDate": "2023-01-15T15:00:00Z",
      "checkOutDate": "2023-01-17T11:00:00Z",
      "nights": 2,
      "adults": 2,
      "children": 1,
      "totalAmount": 30000,
      "status": "CONFIRMED",
      "origin": "MEMBER",
      "createdAt": "2023-01-01T12:00:00Z"
    },
    {
      "id": "res_12346",
      "customerId": "cust_6790",
      "customerName": "鈴木 花子",
      "roomId": "room_102",
      "roomNumber": "102",
      "roomType": "スタンダード",
      "checkInDate": "2023-01-16T15:00:00Z",
      "checkOutDate": "2023-01-18T11:00:00Z",
      "nights": 2,
      "adults": 1,
      "children": 0,
      "totalAmount": 20000,
      "status": "CONFIRMED",
      "origin": "OTA",
      "createdAt": "2023-01-02T09:00:00Z"
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

### 予約詳細取得

```
GET /reservations/:id
```

#### パスパラメータ
- `id`: 予約ID

#### レスポンス
```json
{
  "id": "res_12345",
  "customerId": "cust_6789",
  "customer": {
    "id": "cust_6789",
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "phone": "090-1234-5678",
    "address": "東京都新宿区新宿1-1-1",
    "membershipId": "mem_4567",
    "membershipRank": "GOLD"
  },
  "roomId": "room_101",
  "room": {
    "id": "room_101",
    "number": "101",
    "type": "デラックス",
    "features": ["キングサイズベッド", "シティビュー", "バスタブ"]
  },
  "checkInDate": "2023-01-15T15:00:00Z",
  "checkOutDate": "2023-01-17T11:00:00Z",
  "nights": 2,
  "adults": 2,
  "children": 1,
  "totalAmount": 30000,
  "status": "CONFIRMED",
  "origin": "MEMBER",
  "specialRequests": "アレルギー対応の枕希望",
  "billingId": "bill_5678",
  "notes": "リピーターのお客様",
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

### 予約作成

```
POST /reservations
```

#### リクエストボディ
```json
{
  "customerId": "cust_6789",
  "roomTypeId": "rt_deluxe",
  "checkInDate": "2023-01-15T15:00:00Z",
  "checkOutDate": "2023-01-17T11:00:00Z",
  "adults": 2,
  "children": 1,
  "origin": "FRONT",
  "specialRequests": "アレルギー対応の枕希望",
  "rateCode": "RACK",
  "paymentMethod": "CREDIT_CARD",
  "notes": "リピーターのお客様"
}
```

#### レスポンス
```json
{
  "id": "res_12345",
  "customerId": "cust_6789",
  "roomId": "room_101",
  "roomNumber": "101",
  "roomType": "デラックス",
  "checkInDate": "2023-01-15T15:00:00Z",
  "checkOutDate": "2023-01-17T11:00:00Z",
  "nights": 2,
  "adults": 2,
  "children": 1,
  "totalAmount": 30000,
  "status": "CONFIRMED",
  "origin": "FRONT",
  "specialRequests": "アレルギー対応の枕希望",
  "createdAt": "2023-01-01T12:00:00Z"
}
```

### 予約更新

```
PUT /reservations/:id
```

#### パスパラメータ
- `id`: 予約ID

#### リクエストボディ
```json
{
  "checkInDate": "2023-01-16T15:00:00Z",
  "checkOutDate": "2023-01-18T11:00:00Z",
  "adults": 2,
  "children": 1,
  "specialRequests": "アレルギー対応の枕希望、エキストラベッド追加",
  "notes": "リピーターのお客様、遅めのチェックイン"
}
```

#### レスポンス
```json
{
  "id": "res_12345",
  "customerId": "cust_6789",
  "roomId": "room_101",
  "roomNumber": "101",
  "roomType": "デラックス",
  "checkInDate": "2023-01-16T15:00:00Z",
  "checkOutDate": "2023-01-18T11:00:00Z",
  "nights": 2,
  "adults": 2,
  "children": 1,
  "totalAmount": 30000,
  "status": "CONFIRMED",
  "origin": "FRONT",
  "specialRequests": "アレルギー対応の枕希望、エキストラベッド追加",
  "updatedAt": "2023-01-02T09:30:00Z"
}
```

### 予約キャンセル

```
POST /reservations/:id/cancel
```

#### パスパラメータ
- `id`: 予約ID

#### リクエストボディ
```json
{
  "reason": "顧客都合",
  "cancellationFee": 5000,
  "refundAmount": 25000
}
```

#### レスポンス
```json
{
  "id": "res_12345",
  "status": "CANCELED",
  "reason": "顧客都合",
  "cancellationFee": 5000,
  "refundAmount": 25000,
  "canceledAt": "2023-01-03T14:15:00Z"
}
```

### チェックイン処理

```
POST /reservations/:id/check-in
```

#### パスパラメータ
- `id`: 予約ID

#### リクエストボディ
```json
{
  "roomId": "room_101",
  "keyIssued": true,
  "paymentMethod": "CREDIT_CARD",
  "paymentDetails": {
    "cardType": "VISA",
    "last4": "1234"
  },
  "estimatedCheckOutTime": "2023-01-17T10:00:00Z"
}
```

#### レスポンス
```json
{
  "id": "res_12345",
  "status": "CHECKED_IN",
  "roomId": "room_101",
  "roomNumber": "101",
  "keyIssued": true,
  "checkInTime": "2023-01-15T15:30:00Z",
  "estimatedCheckOutTime": "2023-01-17T10:00:00Z",
  "billingId": "bill_5678"
}
```

### チェックアウト処理

```
POST /reservations/:id/check-out
```

#### パスパラメータ
- `id`: 予約ID

#### リクエストボディ
```json
{
  "keyReturned": true,
  "roomStatus": "DIRTY",
  "paymentMethod": "CREDIT_CARD",
  "paymentDetails": {
    "cardType": "VISA",
    "last4": "1234"
  }
}
```

#### レスポンス
```json
{
  "id": "res_12345",
  "status": "CHECKED_OUT",
  "keyReturned": true,
  "roomStatus": "DIRTY",
  "checkOutTime": "2023-01-17T10:45:00Z",
  "billingId": "bill_5678",
  "billingStatus": "PAID"
}
```

## 部屋API

### 部屋一覧取得

```
GET /rooms
```

#### クエリパラメータ
- `status`: 部屋ステータス（VACANT, OCCUPIED, OUT_OF_ORDER, RESERVED）
- `cleaningStatus`: 清掃ステータス（CLEAN, DIRTY, CLEANING, INSPECTED）
- `floor`: フロア番号
- `type`: 部屋タイプID
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 50）

#### レスポンス
```json
{
  "data": [
    {
      "id": "room_101",
      "number": "101",
      "typeId": "rt_deluxe",
      "typeName": "デラックス",
      "status": "VACANT",
      "cleaningStatus": "CLEAN",
      "floor": 1,
      "features": ["キングサイズベッド", "シティビュー", "バスタブ"]
    },
    {
      "id": "room_102",
      "number": "102",
      "typeId": "rt_standard",
      "typeName": "スタンダード",
      "status": "OCCUPIED",
      "cleaningStatus": "CLEAN",
      "floor": 1,
      "features": ["ダブルベッド", "シティビュー"]
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 50,
    "pages": 2
  }
}
```

### 部屋詳細取得

```
GET /rooms/:id
```

#### パスパラメータ
- `id`: 部屋ID

#### レスポンス
```json
{
  "id": "room_101",
  "number": "101",
  "typeId": "rt_deluxe",
  "type": {
    "id": "rt_deluxe",
    "name": "デラックス",
    "description": "広々としたデラックスルーム",
    "capacity": {
      "standard": 2,
      "maximum": 3
    },
    "amenities": ["ミニバー", "バスローブ", "スリッパ", "歯ブラシセット"]
  },
  "status": "VACANT",
  "cleaningStatus": "CLEAN",
  "floor": 1,
  "features": ["キングサイズベッド", "シティビュー", "バスタブ"],
  "notes": "角部屋、眺めが良い",
  "currentReservation": null,
  "nextReservation": {
    "id": "res_12345",
    "checkInDate": "2023-01-15T15:00:00Z",
    "checkOutDate": "2023-01-17T11:00:00Z",
    "customerName": "山田 太郎"
  },
  "maintenanceHistory": [
    {
      "id": "maint_123",
      "type": "REPAIR",
      "description": "エアコン修理",
      "date": "2022-12-15T10:00:00Z",
      "status": "COMPLETED"
    }
  ]
}
```

### 空室状況取得

```
GET /rooms/availability
```

#### クエリパラメータ
- `startDate`: 開始日（ISO 8601形式、必須）
- `endDate`: 終了日（ISO 8601形式、必須）
- `roomType`: 部屋タイプID（任意）

#### レスポンス
```json
{
  "dates": [
    "2023-01-15",
    "2023-01-16",
    "2023-01-17"
  ],
  "roomTypes": [
    {
      "id": "rt_deluxe",
      "name": "デラックス",
      "availability": [10, 8, 12],
      "totalRooms": 15
    },
    {
      "id": "rt_standard",
      "name": "スタンダード",
      "availability": [20, 15, 18],
      "totalRooms": 25
    }
  ]
}
```

### 部屋ステータス更新

```
PUT /rooms/:id/status
```

#### パスパラメータ
- `id`: 部屋ID

#### リクエストボディ
```json
{
  "status": "OUT_OF_ORDER",
  "reason": "エアコン故障",
  "estimatedFixDate": "2023-01-20T00:00:00Z"
}
```

#### レスポンス
```json
{
  "id": "room_101",
  "number": "101",
  "status": "OUT_OF_ORDER",
  "reason": "エアコン故障",
  "estimatedFixDate": "2023-01-20T00:00:00Z",
  "updatedAt": "2023-01-15T09:00:00Z"
}
```

### 清掃ステータス更新

```
PUT /rooms/:id/cleaning
```

#### パスパラメータ
- `id`: 部屋ID

#### リクエストボディ
```json
{
  "cleaningStatus": "CLEANING",
  "assignedTo": "staff_123",
  "notes": "優先清掃"
}
```

#### レスポンス
```json
{
  "id": "room_101",
  "number": "101",
  "cleaningStatus": "CLEANING",
  "assignedTo": "staff_123",
  "assignedToName": "佐藤 清",
  "startTime": "2023-01-17T11:00:00Z",
  "estimatedCompletionTime": "2023-01-17T11:30:00Z",
  "notes": "優先清掃",
  "updatedAt": "2023-01-17T11:00:00Z"
}
```

## 請求API

### 請求一覧取得

```
GET /billings
```

#### クエリパラメータ
- `status`: 請求ステータス（OPEN, PARTIALLY_PAID, PAID, CANCELED）
- `reservationId`: 予約ID
- `customerId`: 顧客ID
- `startDate`: 開始日（ISO 8601形式）
- `endDate`: 終了日（ISO 8601形式）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）

#### レスポンス
```json
{
  "data": [
    {
      "id": "bill_5678",
      "reservationId": "res_12345",
      "customerName": "山田 太郎",
      "roomNumber": "101",
      "totalAmount": 38000,
      "paidAmount": 0,
      "status": "OPEN",
      "dueDate": "2023-01-17T11:00:00Z",
      "createdAt": "2023-01-15T16:00:00Z"
    },
    {
      "id": "bill_5679",
      "reservationId": "res_12346",
      "customerName": "鈴木 花子",
      "roomNumber": "102",
      "totalAmount": 25000,
      "paidAmount": 25000,
      "status": "PAID",
      "dueDate": "2023-01-18T11:00:00Z",
      "createdAt": "2023-01-16T16:00:00Z"
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

### 請求詳細取得

```
GET /billings/:id
```

#### パスパラメータ
- `id`: 請求ID

#### レスポンス
```json
{
  "id": "bill_5678",
  "reservationId": "res_12345",
  "customerId": "cust_6789",
  "customer": {
    "id": "cust_6789",
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "phone": "090-1234-5678"
  },
  "items": [
    {
      "id": "item_001",
      "description": "デラックスルーム 2泊",
      "quantity": 2,
      "unitPrice": 15000,
      "amount": 30000,
      "category": "ROOM",
      "taxIncluded": true,
      "date": "2023-01-15T16:00:00Z"
    },
    {
      "id": "item_002",
      "description": "朝食",
      "quantity": 4,
      "unitPrice": 2000,
      "amount": 8000,
      "category": "SERVICE",
      "taxIncluded": true,
      "date": "2023-01-16T07:00:00Z"
    }
  ],
  "totalAmount": 38000,
  "paidAmount": 0,
  "balance": 38000,
  "status": "OPEN",
  "dueDate": "2023-01-17T11:00:00Z",
  "payments": [],
  "notes": "",
  "createdAt": "2023-01-15T16:00:00Z",
  "updatedAt": "2023-01-15T16:00:00Z"
}
```

### 請求作成

```
POST /billings
```

#### リクエストボディ
```json
{
  "reservationId": "res_12345",
  "items": [
    {
      "description": "デラックスルーム 2泊",
      "quantity": 2,
      "unitPrice": 15000,
      "category": "ROOM",
      "taxIncluded": true
    },
    {
      "description": "朝食",
      "quantity": 4,
      "unitPrice": 2000,
      "category": "SERVICE",
      "taxIncluded": true
    }
  ],
  "dueDate": "2023-01-17T11:00:00Z",
  "notes": ""
}
```

#### レスポンス
```json
{
  "id": "bill_5678",
  "reservationId": "res_12345",
  "customerId": "cust_6789",
  "customerName": "山田 太郎",
  "items": [
    {
      "id": "item_001",
      "description": "デラックスルーム 2泊",
      "quantity": 2,
      "unitPrice": 15000,
      "amount": 30000,
      "category": "ROOM",
      "taxIncluded": true,
      "date": "2023-01-15T16:00:00Z"
    },
    {
      "id": "item_002",
      "description": "朝食",
      "quantity": 4,
      "unitPrice": 2000,
      "amount": 8000,
      "category": "SERVICE",
      "taxIncluded": true,
      "date": "2023-01-15T16:00:00Z"
    }
  ],
  "totalAmount": 38000,
  "paidAmount": 0,
  "balance": 38000,
  "status": "OPEN",
  "dueDate": "2023-01-17T11:00:00Z",
  "createdAt": "2023-01-15T16:00:00Z"
}
```

### 請求項目追加

```
POST /billings/:id/items
```

#### パスパラメータ
- `id`: 請求ID

#### リクエストボディ
```json
{
  "items": [
    {
      "description": "ルームサービス（ディナー）",
      "quantity": 2,
      "unitPrice": 3000,
      "category": "SERVICE",
      "taxIncluded": true
    },
    {
      "description": "赤ワイン",
      "quantity": 1,
      "unitPrice": 5000,
      "category": "SERVICE",
      "taxIncluded": true
    }
  ]
}
```

#### レスポンス
```json
{
  "id": "bill_5678",
  "totalAmount": 49000,
  "paidAmount": 0,
  "balance": 49000,
  "status": "OPEN",
  "newItems": [
    {
      "id": "item_003",
      "description": "ルームサービス（ディナー）",
      "quantity": 2,
      "unitPrice": 3000,
      "amount": 6000,
      "category": "SERVICE",
      "taxIncluded": true,
      "date": "2023-01-16T19:00:00Z"
    },
    {
      "id": "item_004",
      "description": "赤ワイン",
      "quantity": 1,
      "unitPrice": 5000,
      "amount": 5000,
      "category": "SERVICE",
      "taxIncluded": true,
      "date": "2023-01-16T19:00:00Z"
    }
  ],
  "updatedAt": "2023-01-16T19:00:00Z"
}
```

### 支払い処理

```
POST /billings/:id/payments
```

#### パスパラメータ
- `id`: 請求ID

#### リクエストボディ
```json
{
  "amount": 49000,
  "paymentMethod": "CREDIT_CARD",
  "paymentDetails": {
    "cardType": "VISA",
    "last4": "1234",
    "authorizationCode": "AUTH123"
  },
  "notes": ""
}
```

#### レスポンス
```json
{
  "id": "bill_5678",
  "totalAmount": 49000,
  "paidAmount": 49000,
  "balance": 0,
  "status": "PAID",
  "payment": {
    "id": "payment_123",
    "amount": 49000,
    "paymentMethod": "CREDIT_CARD",
    "paymentDetails": {
      "cardType": "VISA",
      "last4": "1234",
      "authorizationCode": "AUTH123"
    },
    "date": "2023-01-17T10:30:00Z"
  },
  "receiptNumber": "REC20230117-001",
  "updatedAt": "2023-01-17T10:30:00Z"
}
```

### 請求書生成

```
GET /billings/:id/invoice
```

#### パスパラメータ
- `id`: 請求ID

#### クエリパラメータ
- `format`: 出力形式（pdf, html）

#### レスポンス
PDF形式またはHTML形式の請求書データ

## レポートAPI

### 売上レポート

```
GET /reports/revenue
```

#### クエリパラメータ
- `startDate`: 開始日（ISO 8601形式、必須）
- `endDate`: 終了日（ISO 8601形式、必須）
- `groupBy`: グループ化（daily, weekly, monthly、デフォルト: daily）
- `category`: カテゴリ（room, service, all、デフォルト: all）

#### レスポンス
```json
{
  "period": {
    "start": "2023-01-01T00:00:00Z",
    "end": "2023-01-31T23:59:59Z"
  },
  "total": 2450000,
  "currency": "JPY",
  "breakdown": [
    {
      "date": "2023-01-01",
      "total": 80000,
      "categories": {
        "room": 65000,
        "service": 15000
      }
    },
    {
      "date": "2023-01-02",
      "total": 75000,
      "categories": {
        "room": 60000,
        "service": 15000
      }
    }
  ],
  "summary": {
    "average": 79032,
    "min": 65000,
    "max": 95000,
    "categories": {
      "room": 1950000,
      "service": 500000
    }
  }
}
```

### 稼働率レポート

```
GET /reports/occupancy
```

#### クエリパラメータ
- `startDate`: 開始日（ISO 8601形式、必須）
- `endDate`: 終了日（ISO 8601形式、必須）
- `groupBy`: グループ化（daily, weekly, monthly、デフォルト: daily）
- `roomType`: 部屋タイプID（任意）

#### レスポンス
```json
{
  "period": {
    "start": "2023-01-01T00:00:00Z",
    "end": "2023-01-31T23:59:59Z"
  },
  "overall": {
    "occupancyRate": 0.75,
    "totalRooms": 40,
    "roomNights": 1240,
    "availableRoomNights": 1240
  },
  "breakdown": [
    {
      "date": "2023-01-01",
      "occupancyRate": 0.85,
      "occupiedRooms": 34,
      "totalRooms": 40
    },
    {
      "date": "2023-01-02",
      "occupancyRate": 0.80,
      "occupiedRooms": 32,
      "totalRooms": 40
    }
  ],
  "byRoomType": [
    {
      "id": "rt_deluxe",
      "name": "デラックス",
      "occupancyRate": 0.82,
      "roomNights": 381,
      "availableRoomNights": 465
    },
    {
      "id": "rt_standard",
      "name": "スタンダード",
      "occupancyRate": 0.72,
      "roomNights": 558,
      "availableRoomNights": 775
    }
  ]
}
```

## エラーレスポンス

エラーが発生した場合、以下の形式でレスポンスが返されます：

```json
{
  "error": {
    "code": "RESERVATION_NOT_FOUND",
    "message": "指定された予約が見つかりません",
    "details": {
      "reservationId": "res_99999"
    }
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
- 409 Conflict: リソースの競合（例：ダブルブッキング）
- 422 Unprocessable Entity: バリデーションエラー
- 500 Internal Server Error: サーバーエラー

## 関連ドキュメント
- [システム概要](../../systems/pms/overview.md)
- [イベント連携](../../integration/events/pms-events.md)
- [開発ガイドライン](../../development/guidelines/pms-guidelines.md)