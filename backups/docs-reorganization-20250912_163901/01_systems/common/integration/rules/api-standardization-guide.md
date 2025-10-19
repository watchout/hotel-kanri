# 🔄 Hotel Systems API標準化実装ガイド

**各システムAPI仕様を hotel-common 基準に統一する実装手順書**

---

## 📋 **実装概要**

hotel-commonで定義された統一API標準を各システムに適用し、システム間の連携を標準化します。

### **対象システム**
- ✅ **hotel-common**: 標準定義完了済み
- 🔄 **hotel-saas**: Nuxt Server API → 標準適用
- 🔄 **hotel-member**: FastAPI → 標準適用  
- 📋 **hotel-pms**: 仕様策定段階 → 標準準拠で設計

---

## 🎯 **統一API標準仕様**

### **1. レスポンス形式統一**

```typescript
// ✅ 統一レスポンス形式（hotel-common定義済み）
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
  timestamp: Date
  request_id: string
}
```

### **2. エラーコード統一**

```typescript
// ✅ 統一エラーコード（hotel-common定義済み）
export const ERROR_CODES = {
  // 認証エラー (E001-E004)
  E001: 'UNAUTHORIZED',
  E002: 'FORBIDDEN', 
  E003: 'TOKEN_EXPIRED',
  E004: 'INVALID_TOKEN',
  
  // ビジネスロジックエラー (B001-B003)
  B001: 'VALIDATION_ERROR',
  B002: 'BUSINESS_RULE_VIOLATION',
  B003: 'RESOURCE_CONFLICT',
  
  // システムエラー (S001-S002)
  S001: 'INTERNAL_SERVER_ERROR',
  S002: 'SERVICE_UNAVAILABLE'
}
```

### **3. RESTful設計標準**

```
GET    /api/v1/reservations        - 一覧取得
GET    /api/v1/reservations/{id}   - 詳細取得
POST   /api/v1/reservations        - 新規作成
PUT    /api/v1/reservations/{id}   - 全体更新
PATCH  /api/v1/reservations/{id}   - 部分更新
DELETE /api/v1/reservations/{id}   - 削除
```

---

## 🏪 **hotel-saas API標準化実装**

### **Phase 1: レスポンス形式統一**

```typescript
// hotel-saas/server/api/orders/index.get.ts
import { StandardResponseBuilder } from 'hotel-common'

export default defineEventHandler(async (event) => {
  try {
    const orders = await getOrders()
    
    // ❌ 従来のレスポンス
    // return orders
    
    // ✅ 統一レスポンス形式
    return StandardResponseBuilder.success(orders)
  } catch (error) {
    return StandardResponseBuilder.serverError(error.message)
  }
})
```

### **Phase 2: エラーハンドリング統一**

```typescript
// hotel-saas/server/api/orders/index.post.ts
import { StandardResponseBuilder, HotelValidator } from 'hotel-common'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // バリデーション
    const validation = HotelValidator.validate(body, [
      { field: 'room_id', required: true, type: 'string' },
      { field: 'menu_items', required: true, type: 'array' }
    ])
    
    if (!validation.isValid) {
      return StandardResponseBuilder.validationError(validation.errors)
    }
    
    const order = await createOrder(body)
    return StandardResponseBuilder.success(order)
    
  } catch (error) {
    return StandardResponseBuilder.serverError(error.message)
  }
})
```

### **Phase 3: 認証統合**

```typescript
// hotel-saas/server/api/middleware/auth.ts
import { JwtManager } from 'hotel-common'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  
  if (!authHeader) {
    return StandardResponseBuilder.authError()
  }
  
  const token = JwtManager.extractTokenFromBearer(authHeader)
  const payload = JwtManager.verifyAccessToken(token)
  
  if (!payload) {
    return StandardResponseBuilder.authError('Invalid token')
  }
  
  // コンテキストに認証情報を追加
  event.context.user = payload
})
```

---

## 🎯 **hotel-member API標準化実装**

### **Phase 1: FastAPIレスポンス統一**

```python
# hotel-member/fastapi-backend/app/models/responses.py
from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime

class StandardResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[dict] = None
    meta: Optional[dict] = None
    timestamp: datetime
    request_id: str

class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_previous: bool

class PaginatedResponse(StandardResponse):
    data: dict  # items + pagination
```

### **Phase 2: FastAPIエラーハンドリング**

```python
# hotel-member/fastapi-backend/app/utils/response_builder.py
from app.models.responses import StandardResponse
from uuid import uuid4
from datetime import datetime

class ResponseBuilder:
    @staticmethod
    def success(data=None, meta=None):
        return StandardResponse(
            success=True,
            data=data,
            meta=meta,
            timestamp=datetime.now(),
            request_id=str(uuid4())
        )
    
    @staticmethod
    def error(code: str, message: str, details=None, status_code=400):
        return StandardResponse(
            success=False,
            error={
                "code": code,
                "message": message,
                "details": details
            },
            timestamp=datetime.now(),
            request_id=str(uuid4())
        )
```

### **Phase 3: ルーター適用例**

```python
# hotel-member/fastapi-backend/app/routers/customers.py
from fastapi import APIRouter, HTTPException, Depends
from app.utils.response_builder import ResponseBuilder

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])

@router.get("/")
async def get_customers(
    page: int = 1,
    limit: int = 20,
    current_user = Depends(get_current_user)
):
    try:
        customers = await customer_service.get_paginated(page, limit)
        return ResponseBuilder.success(customers)
    except Exception as e:
        return ResponseBuilder.error("S001", str(e))

@router.post("/")
async def create_customer(customer_data: CustomerCreate):
    try:
        # バリデーション
        if not customer_data.email:
            return ResponseBuilder.error(
                "B001", 
                "Validation failed", 
                {"errors": [{"field": "email", "message": "Email is required"}]}
            )
        
        customer = await customer_service.create(customer_data)
        return ResponseBuilder.success(customer)
    except Exception as e:
        return ResponseBuilder.error("S001", str(e))
```

---

## 💼 **hotel-pms API標準準拠設計**

### **仕様策定時の標準適用**

```typescript
// hotel-pms/src/api/types.ts (設計段階)
import { 
  ApiResponse, 
  StandardResponseBuilder,
  ERROR_CODES 
} from 'hotel-common'

// PMS専用型定義
export interface CheckInRequest {
  reservation_id: string
  guest_id?: string
  room_number: string
  check_in_time?: Date
  special_notes?: string
}

export interface CheckInResponse {
  id: string
  reservation_id: string
  room_number: string
  guest_name: string
  check_in_time: Date
  check_out_time: Date
  status: 'checked_in'
}

// API実装例（将来）
export class PMSApiHandler {
  static async checkIn(request: CheckInRequest): Promise<ApiResponse<CheckInResponse>> {
    try {
      // チェックイン処理
      const result = await processCheckIn(request)
      return StandardResponseBuilder.success(result)
    } catch (error) {
      return StandardResponseBuilder.serverError(error.message)
    }
  }
}
```

---

## 🔧 **実装手順とタイムライン**

### **Week 1: hotel-common拡張**
- [x] StandardResponseBuilder実装完了
- [x] API標準ガイドライン策定完了
- [x] エラーコード体系確立完了

### **Week 2: hotel-saas標準化**
- [ ] 既存APIエンドポイントのレスポンス形式変更
- [ ] エラーハンドリング統一
- [ ] JWT認証統合
- [ ] ページネーション実装

### **Week 3: hotel-member標準化**
- [ ] FastAPI ResponseBuilder実装
- [ ] 既存ルーターの標準化
- [ ] バリデーション統一
- [ ] 認証ミドルウェア統合

### **Week 4: 統合テスト**
- [ ] システム間API連携テスト
- [ ] エラーハンドリング一貫性確認
- [ ] 認証フロー動作確認
- [ ] パフォーマンステスト

---

## 📊 **実装確認チェックリスト**

### **hotel-saas**
- [ ] レスポンス形式：`ApiResponse<T>`に統一
- [ ] エラーコード：`ERROR_CODES`使用
- [ ] 認証：hotel-common JWT統合
- [ ] エンドポイント：`/api/v1/`プレフィックス
- [ ] ページネーション：標準クエリパラメータ対応

### **hotel-member**
- [ ] レスポンス形式：`StandardResponse`に統一
- [ ] エラーコード：`ERROR_CODES`使用
- [ ] 認証：JWT統合
- [ ] ルーター：RESTful設計準拠
- [ ] バリデーション：統一ルール適用

### **hotel-pms**
- [ ] 設計段階でhotel-common標準準拠
- [ ] 統一型定義使用
- [ ] 標準エラーハンドリング
- [ ] JWT認証統合設計

---

## 🚨 **注意事項・リスク対策**

### **破壊的変更への対策**
1. **段階的移行**: 旧形式と新形式の併存期間を設ける
2. **バージョニング**: `/api/v1/`で新仕様、`/api/`で旧仕様維持
3. **フィーチャーフラグ**: 新API仕様の段階的有効化

### **後方互換性確保**
```typescript
// 移行期間中の対応例
export function createCompatibleResponse<T>(data: T, isLegacy = false) {
  if (isLegacy) {
    // 旧形式のレスポンス
    return data
  }
  // 新形式のレスポンス  
  return StandardResponseBuilder.success(data)
}
```

### **影響システム最小化**
- hotel-commonバージョンアップは段階的リリース
- 各システムでの動作確認必須
- ロールバック計画の事前策定

---

## 📞 **実装サポート**

### **技術相談窓口**
- hotel-common仕様相談：システム統合担当者
- hotel-saas実装支援：Nuxt 3専門チーム  
- hotel-member実装支援：FastAPI専門チーム

### **参考資料**
- `hotel-common/src/standards/api-standards.ts`
- `hotel-common/README.md`
- API仕様テストケース（実装後提供）

---

**重要**: この標準化により、システム間の連携が大幅に改善され、開発効率とメンテナンス性が向上します。段階的な実装により、既存システムへの影響を最小化しながら標準統一を実現します。 