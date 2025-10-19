# Hotel Common - Zodスキーマ統合例

## 概要
hotel-commonに追加されたZodスキーマは、型安全性とバリデーションを統一的に提供します。

## 基本的な使用方法

### 1. 予約データのバリデーション

```typescript
import { ReservationCreateSchema, z } from 'hotel-common'

// 正常なデータ
const validReservationData = {
  guest_name: '田中太郎',
  guest_email: 'tanaka@example.com',
  guest_phone: '090-1234-5678',
  room_type: 'deluxe',
  check_in: '2024-01-15T15:00:00Z',
  check_out: '2024-01-17T11:00:00Z',
  adults: 2,
  children: 1,
  origin: 'hotel-member'
}

// バリデーション実行
try {
  const validatedData = ReservationCreateSchema.parse(validReservationData)
  console.log('バリデーション成功:', validatedData)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('バリデーションエラー:', error.errors)
  }
}
```

### 2. 顧客データのバリデーション

```typescript
import { CustomerCreateSchema, ZodValidator } from 'hotel-common'

const customerData = {
  name: '山田花子',
  email: 'yamada@example.com',
  phone: '080-9876-5432',
  address: '東京都渋谷区...',
  gender: 'female',
  preferences: {
    room_type: 'non_smoking',
    floor: 'high'
  }
}

// 安全なパース
const result = ZodValidator.safeParse(CustomerCreateSchema, customerData)

if (result.success) {
  console.log('顧客データ:', result.data)
  // 型安全に data.name, data.email などにアクセス可能
} else {
  console.error('エラー:', result.errors)
}
```

### 3. API エンドポイントでの使用例

```typescript
import { ReservationCreateSchema, StandardResponseBuilder, ZodValidator } from 'hotel-common'

// Nuxt Server API例
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Zodバリデーション
    const validation = ZodValidator.validate(ReservationCreateSchema, body)
    
    if (!validation.isValid) {
      const errorResponse = StandardResponseBuilder.validationError(validation.errors)
      return errorResponse.response
    }
    
    // バリデーション通過後の処理
    const reservation = await createReservation(body)
    
    return StandardResponseBuilder.success(reservation)
    
  } catch (error) {
    return StandardResponseBuilder.serverError('予約作成に失敗しました')
  }
})
```

### 4. FastAPI での使用例

```python
from pydantic import BaseModel
from typing import Optional
import json

# hotel-commonのZodスキーマと同等のPydanticモデル生成
# 注：実際の統合では、Zodスキーマから自動生成することも可能

class ReservationCreate(BaseModel):
    guest_name: str
    guest_email: str
    guest_phone: Optional[str] = None
    room_type: str
    check_in: str  # datetime
    check_out: str  # datetime
    adults: int
    children: Optional[int] = None
    special_requests: Optional[str] = None
    origin: str
    origin_reference: Optional[str] = None

@app.post("/api/v1/reservations")
async def create_reservation(reservation: ReservationCreate):
    # Pydanticによる自動バリデーション
    # hotel-commonの標準レスポンス形式で返却
    return {
        "success": True,
        "data": reservation.dict(),
        "timestamp": datetime.now(),
        "request_id": str(uuid.uuid4())
    }
```

## スキーマ一覧

### 予約関連
- `ReservationCreateSchema` - 予約作成
- `ReservationUpdateSchema` - 予約更新  
- `RoomAvailabilitySchema` - 部屋空室確認

### 顧客関連
- `CustomerCreateSchema` - 顧客作成
- `CustomerUpdateSchema` - 顧客更新
- `CustomerSearchSchema` - 顧客検索

### 認証関連
- `AuthRequestSchema` - 認証リクエスト
- `UserCreateSchema` - ユーザー作成
- `UserUpdateSchema` - ユーザー更新
- `PasswordChangeSchema` - パスワード変更
- `TokenRefreshSchema` - トークンリフレッシュ

### 共通機能
- `PaginationSchema` - ページネーション
- `SearchSchema` - 検索パラメータ
- `BulkOperationSchema` - バルク操作
- `EventNotificationSchema` - イベント通知
- `TenantCreateSchema` - テナント作成
- `FileUploadSchema` - ファイルアップロード

## 日本語エラーメッセージ

すべてのスキーマは日本語エラーメッセージを提供し、フロントエンドでそのまま表示可能です。

```typescript
const result = ReservationCreateSchema.safeParse({
  guest_name: '',  // エラー
  guest_email: 'invalid-email',  // エラー
  check_in: '2024-01-20T15:00:00Z',
  check_out: '2024-01-19T11:00:00Z',  // チェックイン後なのでエラー
})

// エラーメッセージ例
// - "宿泊者名は必須です"
// - "有効なメールアドレスを入力してください"  
// - "チェックアウト日時はチェックイン日時より後である必要があります"
```

## 統合のメリット

1. **型安全性** - TypeScript型が自動推論される
2. **統一バリデーション** - フロントエンド・バックエンド共通ルール
3. **日本語対応** - ユーザーフレンドリーなエラーメッセージ
4. **柔軟性** - カスタムバリデーションルール追加可能
5. **保守性** - 一箇所でスキーマ管理

## hotel-pms での活用

hotel-pmsでこのZodスキーマを使用することで：

- 予約・顧客データの入力検証を統一
- APIリクエスト・レスポンスの型安全性確保
- フロントエンドでのリアルタイムバリデーション
- バックエンドでの確実なデータ検証

詳細な実装方法については、各システムの統合ガイドを参照してください。 