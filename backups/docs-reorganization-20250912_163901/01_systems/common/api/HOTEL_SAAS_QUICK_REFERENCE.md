# 🚀 hotel-saas API クイックリファレンス

**開発者向け簡易リファレンス**

---

## 🔗 **ベースURL**
```
開発環境: http://localhost:3400
本番環境: https://api.hotel-common.jp
```

## 🔐 **認証**
```typescript
// ログイン
POST /api/v1/auth/login
{
  "email": "user@hotel.com",
  "password": "password123",
  "tenantId": "hotel-001"
}

// レスポンス
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400
  }
}

// API呼び出し
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 🛒 **注文管理**

### 注文履歴取得
```typescript
GET /api/v1/orders/history?page=1&limit=20&roomId=101&status=DELIVERED
```

### 注文作成
```typescript
POST /api/v1/orders
{
  "room_id": "room-101",
  "customer_id": "customer-001",
  "items": [
    {
      "menu_item_id": "menu-001",
      "quantity": 2,
      "unit_price": 1500,
      "notes": "氷多めで"
    }
  ],
  "notes": "15分後にお届け希望"
}
```

### アクティブ注文取得
```typescript
GET /api/v1/orders/active
```

### 注文ステータス更新
```typescript
PUT /api/v1/orders/order-123/status
{
  "status": "PREPARING",
  "notes": "調理開始しました"
}
```

## 🍽️ **メニュー管理**

### メニュー一覧取得
```typescript
GET /api/v1/order/menu?category=drink&available=true
```

### トップメニュー取得
```typescript
GET /api/v1/menus/top?limit=10
```

## 🤖 **AIコンシェルジュ**

### レスポンスツリー一覧
```typescript
GET /api/v1/ai/response-tree
```

### セッション開始
```typescript
POST /api/v1/ai/response-tree/sessions
{
  "treeId": "tree-001",
  "deviceId": "tv-101",
  "interfaceType": "tv",
  "language": "ja"
}
```

### セッション更新
```typescript
PUT /api/v1/ai/response-tree/sessions/session-123
{
  "currentNodeId": "node-456",
  "action": "select"
}
```

### モバイル連携QRコード
```typescript
POST /api/v1/ai/response-tree/mobile-link
{
  "sessionId": "session-123",
  "expiresIn": 1800
}

// レスポンス
{
  "success": true,
  "data": {
    "linkCode": "MOBILE123456",
    "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "expiresAt": "2024-12-01T15:30:00Z"
  }
}
```

## 📊 **管理画面統計**

### サマリー統計
```typescript
GET /api/v1/admin/summary
// レスポンス
{
  "success": true,
  "data": {
    "totalReservations": 150,
    "activeReservations": 45,
    "totalRooms": 100,
    "availableRooms": 55,
    "totalOrders": 1250,
    "monthlyRevenue": 2500000
  }
}
```

### ダッシュボード統計
```typescript
GET /api/v1/admin/dashboard/stats
```

### ランキング統計
```typescript
GET /api/v1/admin/rankings?type=popular_items&period=monthly&limit=10
```

## 🏨 **基幹データ参照**

### 予約一覧
```typescript
GET /api/v1/reservations?status=ACTIVE&checkInDate=2024-12-01
```

### 部屋一覧
```typescript
GET /api/v1/rooms?floor=3&status=AVAILABLE
```

### デバイス一覧
```typescript
GET /api/v1/devices?roomId=101&type=TV&status=ACTIVE
```

## ⚠️ **エラーレスポンス**
```typescript
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token is required"
  },
  "timestamp": "2024-12-01T10:00:00Z",
  "request_id": "req-123456789"
}
```

## 🔧 **Nuxt.js統合例**
```typescript
// composables/useHotelApi.ts
export const useHotelApi = () => {
  const config = useRuntimeConfig()
  const token = useCookie('hotel_auth_token')
  
  const apiCall = async (endpoint: string, options: any = {}) => {
    return await $fetch(`${config.public.hotelCommonApiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token.value && { Authorization: `Bearer ${token.value}` }),
        ...options.headers
      }
    })
  }
  
  return {
    login: (credentials) => apiCall('/api/v1/auth/login', { method: 'POST', body: credentials }),
    getOrders: () => apiCall('/api/v1/orders/history'),
    createOrder: (data) => apiCall('/api/v1/orders', { method: 'POST', body: data }),
    getMenus: () => apiCall('/api/v1/order/menu'),
    startAiSession: (data) => apiCall('/api/v1/ai/response-tree/sessions', { method: 'POST', body: data })
  }
}
```

## 📱 **レスポンシブ対応**
```typescript
// TV画面用（大画面）
const { startAiSession } = useHotelApi()
const session = await startAiSession({
  treeId: 'tree-001',
  deviceId: 'tv-101',
  interfaceType: 'tv'
})

// モバイル用（小画面）
const mobileLink = await createMobileLink({
  sessionId: session.id,
  expiresIn: 1800
})
```

---

**詳細ドキュメント**: `docs/api/HOTEL_SAAS_API_GUIDE.md`  
**最終更新**: 2024年12月  
**バージョン**: v1.0.0
