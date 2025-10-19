# システム間API連携仕様

## 概要
本ドキュメントは、omotenasuai.comプロジェクトにおけるシステム間のAPI連携仕様を定義します。

## システム構成
```
hotel-common (統合基盤)
├── hotel-saas (顧客サービス)
├── hotel-pms (予約管理)
└── hotel-member (会員管理)
```

## 🔄 API連携パターン

### hotel-member → hotel-pms
**目的**: 顧客情報の提供・更新

```typescript
// 顧客情報取得
GET /api/customers/:id
Response: {
  id: string,
  tenant_id: string,
  name: string,
  email: string,
  phone: string,
  rank_id: string,
  total_points: number
}

// 顧客基本情報更新（限定フィールドのみ）
PATCH /api/customers/:id
Body: {
  name?: string,
  phone?: string,
  address?: string
}
```

### hotel-member → hotel-saas
**目的**: 顧客情報・会員特典の提供

```typescript
// 顧客情報取得（パーソナライズ用）
GET /api/customers/:id
Response: {
  id: string,
  name: string,
  rank: {
    id: string,
    name: string,
    benefits: string[]
  },
  preferences: object
}

// 会員特典情報取得
GET /api/membership/:id/benefits
Response: {
  benefits: [
    {
      type: 'discount' | 'service' | 'amenity',
      name: string,
      description: string,
      conditions: object
    }
  ]
}
```

### hotel-pms → hotel-member
**目的**: 予約・チェックイン情報の通知

```typescript
// 予約作成通知
POST /api/events/reservation-created
Body: {
  reservation_id: string,
  customer_id: string,
  tenant_id: string,
  checkin_date: string,
  checkout_date: string,
  room_type: string,
  total_amount: number
}

// チェックイン通知
POST /api/events/checkin
Body: {
  reservation_id: string,
  customer_id: string,
  tenant_id: string,
  checkin_time: string,
  room_number: string
}
```

## 🔐 認証・セキュリティ

### 統一JWT認証
```typescript
// 全APIリクエストに必須ヘッダー
Authorization: Bearer <JWT_TOKEN>
X-Tenant-ID: <TENANT_ID>

// JWT ペイロード構造
{
  sub: string,        // ユーザーID
  tenant_id: string,  // テナントID
  role: string,       // ユーザーロール
  permissions: string[], // 権限リスト
  exp: number,        // 有効期限
  iat: number         // 発行時刻
}
```

### アクセス制御
- **マルチテナント分離**: 全APIでtenant_id必須
- **最小権限の原則**: 必要最小限の権限のみ付与
- **データ暗号化**: 機密情報の暗号化転送

## 📊 データ整合性

### 必須バリデーション
```typescript
// 全API共通バリデーション
interface BaseRequest {
  tenant_id: string;  // 必須
  timestamp: string;  // 必須
  request_id: string; // 冪等性保証
}

// レスポンス共通構造
interface BaseResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: object;
  };
  timestamp: string;
}
```

### エラーハンドリング
```typescript
// 標準エラーコード
enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

## 🔄 イベント駆動連携

### イベント発行パターン
```typescript
// hotel-member イベント発行
await eventPublisher.publish('customer.updated', {
  customerId: string,
  tenantId: string,
  updatedFields: string[],
  oldValues: object,
  newValues: object,
  timestamp: Date
});

// hotel-pms イベント発行
await eventPublisher.publish('reservation.created', {
  reservationId: string,
  customerId: string,
  tenantId: string,
  checkinDate: string,
  checkoutDate: string,
  roomType: string,
  timestamp: Date
});
```

### イベント購読パターン
```typescript
// hotel-saas イベント購読
eventSubscriber.subscribe('customer.updated', async (event) => {
  // 顧客情報キャッシュ更新
  await updateCustomerCache(event.customerId, event.newValues);
  
  // パーソナライズ設定更新
  await updatePersonalization(event.customerId);
});
```

## 📈 パフォーマンス最適化

### キャッシュ戦略
```typescript
// Redis キャッシュパターン
const cacheKey = `customer:${tenantId}:${customerId}`;
const cachedData = await redis.get(cacheKey);

if (!cachedData) {
  const freshData = await fetchFromDatabase(customerId, tenantId);
  await redis.setex(cacheKey, 300, JSON.stringify(freshData)); // 5分キャッシュ
  return freshData;
}

return JSON.parse(cachedData);
```

### レート制限
```typescript
// API レート制限設定
const rateLimits = {
  'GET /api/customers/:id': '100/minute',
  'POST /api/events/*': '1000/minute',
  'PATCH /api/customers/:id': '10/minute'
};
```

## 🧪 テスト戦略

### 統合テスト
```typescript
describe('System Integration Tests', () => {
  test('hotel-member → hotel-pms customer sync', async () => {
    // 1. hotel-memberで顧客情報更新
    const updateResponse = await memberAPI.updateCustomer(customerId, {
      name: 'Updated Name',
      phone: '090-1234-5678'
    });
    
    // 2. イベント発行確認
    expect(eventPublisher.publish).toHaveBeenCalledWith('customer.updated', {
      customerId,
      updatedFields: ['name', 'phone']
    });
    
    // 3. hotel-pmsでの更新確認
    const pmsCustomer = await pmsAPI.getCustomer(customerId);
    expect(pmsCustomer.name).toBe('Updated Name');
    expect(pmsCustomer.phone).toBe('090-1234-5678');
  });
});
```

## 📋 運用監視

### ヘルスチェック
```typescript
// 各システムのヘルスチェックエンドポイント
GET /api/health
Response: {
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: string,
  services: {
    database: 'healthy' | 'unhealthy',
    redis: 'healthy' | 'unhealthy',
    external_apis: 'healthy' | 'unhealthy'
  },
  version: string
}
```

### ログ形式
```json
{
  "timestamp": "2025-09-12T14:30:00Z",
  "level": "INFO",
  "service": "hotel-member",
  "tenant_id": "tenant_123",
  "user_id": "user_456",
  "request_id": "req_789",
  "action": "customer.update",
  "resource_id": "customer_101",
  "duration_ms": 150,
  "status": "success"
}
```

---

**最終更新**: 2025-09-12
**適用範囲**: hotel-saas, hotel-pms, hotel-member, hotel-common
**関連ドキュメント**: 
- [統一開発ルール](../00_shared/standards/unified-development-rules.md)
- [統一認証基盤](../00_shared/architecture/unified-authentication-infrastructure-design.md)
