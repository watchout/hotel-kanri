# オーダーAPI クイックリファレンス

## オーダー作成 API

```
POST /api/v1/orders
```

### 認証

```
Authorization: Bearer {JWT_TOKEN}
X-Tenant-ID: {TENANT_ID}
```

### リクエスト例

```json
{
  "roomId": "room-101",
  "items": [
    {
      "menuId": "menu-001",
      "name": "ハンバーガー",
      "price": 1500,
      "quantity": 2,
      "options": [
        {
          "id": "option-001",
          "name": "チーズ追加",
          "price": 200
        }
      ]
    }
  ],
  "specialInstructions": "ケチャップ多めでお願いします",
  "paymentMethod": "room-charge"
}
```

### レスポンス例

```json
{
  "success": true,
  "order": {
    "id": "order-001",
    "roomId": "room-101",
    "status": "pending",
    "totalAmount": 3200,
    "createdAt": "2025-08-01T12:00:00.000Z",
    "updatedAt": "2025-08-01T12:00:00.000Z",
    "items": [
      {
        "id": "item-001",
        "menuId": "menu-001",
        "name": "ハンバーガー",
        "price": 1500,
        "quantity": 2,
        "totalPrice": 3000,
        "options": [
          {
            "id": "option-001",
            "name": "チーズ追加",
            "price": 200
          }
        ]
      }
    ],
    "specialInstructions": "ケチャップ多めでお願いします",
    "paymentMethod": "room-charge"
  }
}
```

### TypeScript実装例

```typescript
import { orderApi } from '../utils/api-client';

// オーダーの作成
const orderData = {
  roomId: 'room-101',
  items: [
    {
      menuId: 'menu-001',
      name: 'ハンバーガー',
      price: 1500,
      quantity: 2,
      options: [
        {
          id: 'option-001',
          name: 'チーズ追加',
          price: 200
        }
      ]
    }
  ],
  specialInstructions: 'ケチャップ多めでお願いします',
  paymentMethod: 'room-charge'
};

try {
  const result = await orderApi.createOrder(orderData);
  console.log('オーダー作成成功:', result.order);
} catch (error) {
  console.error('オーダー作成エラー:', error);
}
```

## オーダー履歴 API

```
GET /api/v1/orders/history
```

### クエリパラメータ

```
?page=1&limit=10&status=completed&from=2025-01-01&to=2025-12-31&roomId=room-101
```

### TypeScript実装例

```typescript
import { orderApi } from '../utils/api-client';

// オーダー履歴の取得
try {
  const params = {
    page: 1,
    limit: 10,
    status: 'completed',
    roomId: 'room-101'
  };
  const result = await orderApi.getOrderHistory(params);
  console.log('オーダー履歴取得成功:', result.orders);
} catch (error) {
  console.error('オーダー履歴取得エラー:', error);
}
```

## アクティブオーダー API

```
GET /api/v1/orders/active
```

### クエリパラメータ

```
?roomId=room-101
```

### TypeScript実装例

```typescript
import { orderApi } from '../utils/api-client';

// アクティブオーダーの取得
try {
  const params = {
    roomId: 'room-101'
  };
  const result = await orderApi.getActiveOrders(params);
  console.log('アクティブオーダー取得成功:', result.orders);
} catch (error) {
  console.error('アクティブオーダー取得エラー:', error);
}
```

## オーダー詳細 API

```
GET /api/v1/orders/{id}
```

### TypeScript実装例

```typescript
import { orderApi } from '../utils/api-client';

// オーダー詳細の取得
try {
  const orderId = 'order-001';
  const result = await orderApi.getOrderDetails(orderId);
  console.log('オーダー詳細取得成功:', result.order);
} catch (error) {
  console.error('オーダー詳細取得エラー:', error);
}
```

## オーダーステータス更新 API

```
PUT /api/v1/orders/{id}/status
```

### リクエスト例

```json
{
  "status": "completed"
}
```

### TypeScript実装例

```typescript
import { orderApi } from '../utils/api-client';

// オーダーステータスの更新
try {
  const orderId = 'order-001';
  const status = 'completed';
  const result = await orderApi.updateOrderStatus(orderId, status);
  console.log('オーダーステータス更新成功:', result);
} catch (error) {
  console.error('オーダーステータス更新エラー:', error);
}
```

## エラーコード

| ステータスコード | 説明 |
|----------------|------|
| 400 | リクエストが不正です |
| 401 | 認証が必要です |
| 403 | このリソースにアクセスする権限がありません |
| 404 | 指定されたリソースが見つかりません |
| 500 | 内部サーバーエラーが発生しました |

## 詳細情報

より詳細な情報については、以下のドキュメントを参照してください：

- [オーダー作成API詳細ガイド](./CREATE_ORDER_API_GUIDE.md)
- [API更新情報](../HOTEL_SAAS_API_UPDATES.md)
