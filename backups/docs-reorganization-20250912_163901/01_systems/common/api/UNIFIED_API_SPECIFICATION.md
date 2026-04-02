
# 🎯 統一API仕様書 v1.0.0

**最終更新**: 2025-08-27  
**対象システム**: hotel-common統合APIサーバー  
**ベースURL**: `http://localhost:3400`

---

## 📋 目次

1. [認証API](#認証api)
2. [フロントデスク管理API](#フロントデスク管理api)
3. [管理者API](#管理者api)
4. [共通API](#共通api)
5. [レスポンス形式](#レスポンス形式)
6. [エラーハンドリング](#エラーハンドリング)

---

## 🔐 認証API

### ログイン
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@omotenasuai.com",
  "password": "admin123"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "staff1",
      "email": "admin@omotenasuai.com",
      "name": "管理者",
      "role": "admin",
      "tenantId": "default"
    },
    "tenant": { ... },
    "availableTenants": [ ... ]
  }
}
```

### ログアウト
```http
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

---

## 🏨 フロントデスク管理API

### 客室管理

#### 客室一覧取得
```http
GET /api/v1/admin/front-desk/rooms
Authorization: Bearer {accessToken}
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20, max: 1000)
  - status: "available" | "occupied" | "maintenance" | "cleaning"
  - room_type: string
  - floor: number
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "room-101",
        "room_number": "101",
        "room_type": "standard",
        "floor": 1,
        "status": "available",
        "capacity": 2,
        "amenities": ["wifi", "tv", "ac"],
        "notes": null,
        "last_cleaned": "2025-08-27T10:00:00Z",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-08-27T10:00:00Z"
      }
    ],
    "summary": {
      "total_rooms": 3,
      "by_status": {
        "available": 1,
        "occupied": 1,
        "maintenance": 1,
        "cleaning": 0
      },
      "by_type": {
        "standard": 1,
        "deluxe": 1,
        "suite": 1
      }
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 3,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

#### 客室詳細取得
```http
GET /api/v1/admin/front-desk/rooms/{id}
Authorization: Bearer {accessToken}
```

#### 客室状態更新
```http
PUT /api/v1/admin/front-desk/rooms/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "maintenance",
  "notes": "エアコン修理中",
  "maintenance_reason": "エアコン故障"
}
```

### 会計管理

#### 会計取引一覧取得
```http
GET /api/v1/admin/front-desk/accounting
Authorization: Bearer {accessToken}
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20, max: 1000)
  - type: "invoice" | "payment" | "refund"
  - status: "pending" | "completed" | "cancelled"
  - start_date: string (ISO date)
  - end_date: string (ISO date)
  - guest_id: string
  - room_number: string
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn-001",
        "type": "invoice",
        "invoice_number": "INV-2025-001",
        "guest_name": "田中太郎",
        "room_number": "101",
        "amount": 25000,
        "tax_amount": 2500,
        "total_amount": 27500,
        "status": "completed",
        "payment_method": "credit_card",
        "created_at": "2025-08-27T10:00:00Z",
        "completed_at": "2025-08-27T10:30:00Z",
        "items": [
          { "description": "宿泊料金", "amount": 20000 },
          { "description": "ルームサービス", "amount": 5000 }
        ]
      }
    ],
    "summary": {
      "total_transactions": 3,
      "total_revenue": 125000,
      "total_refunds": 3300,
      "pending_amount": 16500,
      "by_status": {
        "pending": 1,
        "completed": 2,
        "cancelled": 0
      },
      "by_payment_method": {
        "cash": 0,
        "credit_card": 2,
        "bank_transfer": 0
      }
    }
  }
}
```

#### 決済処理
```http
POST /api/v1/admin/front-desk/accounting/process-payment
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "invoice_id": "inv-001",
  "payment_method": "credit_card",
  "amount": 27500,
  "payment_reference": "CC-REF-001",
  "notes": "VISAカード決済"
}
```

#### 日次売上レポート
```http
GET /api/v1/admin/front-desk/accounting/daily-report
Authorization: Bearer {accessToken}
Query Parameters:
  - date: string (ISO date, default: today)
```

---

## 👨‍💼 管理者API

### 操作ログ管理

#### 操作ログ一覧取得
```http
GET /api/v1/admin/operation-logs
Authorization: Bearer {accessToken}
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20, max: 1000)
  - user_id: string
  - action: string
  - entity_type: string
  - start_date: string (ISO date)
  - end_date: string (ISO date)
  - status: "COMPLETED" | "FAILED" | "PENDING"
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-1756280486036-ejj01zrrad5",
        "user_id": "staff1",
        "action": "API_TEST",
        "entity_type": "test",
        "entity_id": "test-001",
        "event_type": "USER_OPERATION",
        "source_system": "hotel-common",
        "target_system": "hotel-common",
        "status": "COMPLETED",
        "event_data": { ... },
        "created_at": "2025-08-27T07:41:26.037Z",
        "processed_at": "2025-08-27T07:41:26.037Z"
      }
    ],
    "summary": {
      "total_logs": 1,
      "by_status": {
        "completed": 1,
        "failed": 0,
        "pending": 0
      },
      "by_event_type": {
        "USER_OPERATION": 1
      },
      "by_system": {
        "hotel-common": 1
      }
    }
  }
}
```

#### 操作ログ統計
```http
GET /api/v1/admin/operation-logs/stats
Authorization: Bearer {accessToken}
Query Parameters:
  - period: "1d" | "7d" | "30d" (default: "7d")
```

### 管理画面統計

#### サマリー統計
```http
GET /api/v1/admin/summary
Authorization: Bearer {accessToken}
```

#### オーダー一覧
```http
GET /api/v1/admin/orders
Authorization: Bearer {accessToken}
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20, max: 1000)
  - roomId: string
  - status: string
  - startDate: string (ISO date)
  - endDate: string (ISO date)
```

---

## 🔧 共通API

### 操作ログ

> **📋 更新履歴**  
> **v2.0 (2025年1月27日)**: 客室状態変更ログの詳細化対応 - hotel-common統合管理による更新  
> 詳細仕様: [客室状態変更ログ統合仕様書](../integration/specifications/room-operation-log-specification.md)

#### ログ記録
```http
POST /api/v1/logs/operations
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "action": "ROOM_CLEANING_COMPLETE",  // v2.0: 詳細アクション対応
  "type": "CHECKIN",                   // v1.0互換: action優先
  "target_type": "room",
  "target_id": "room-123",
  "details": {
    // v2.0: 標準化されたevent_data構造
    "room_id": "room-123",
    "room_number": "101",
    "old_status": "cleaning",
    "new_status": "available",
    "operation_reason": "チェックアウト後清掃完了",
    "operation_category": "cleaning",
    "quality_check": "passed",
    "staff_id": "staff-456",
    "department": "housekeeping",
    "actual_duration": 45,
    "triggered_by_system": "hotel-pms",
    "timestamp": "2025-01-27T10:30:00Z"
  }
}
```

### 客室メモ（Room Memo）

> 📋 更新履歴 (2025-09-10, hotel-common 統合管理による更新)
> - Room Memo API を追加（カテゴリ・可視性・履歴/コメント）
> - rooms.notes は廃止方針（移行実施後に削除予定）

#### 公式カテゴリ・可視性
```typescript
// カテゴリ（既定: 'handover'）
type RoomMemoCategory =
  | 'reservation'
  | 'handover'
  | 'lost_item'
  | 'maintenance'
  | 'cleaning'
  | 'guest_request'
  | 'other'

// 可視性（既定: 'public'）
type RoomMemoVisibility = 'public' | 'private' | 'role'

// role可視時のみ使用
type VisibleRole = 'front' | 'cleaning' | 'maintenance' | 'manager' | string
```

#### メモ一覧取得
```http
GET /api/v1/admin/room-memos
Authorization: Bearer {accessToken}
Query Parameters:
  - room_number: string (客室番号で絞り込み)
  - room_id: string (客室IDで絞り込み)
  - status: 'pending' | 'in_progress' | 'completed'
  - category: RoomMemoCategory
  - visibility: RoomMemoVisibility
  - page: number (default: 1)
  - limit: number (default: 20)
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "memos": [
      {
        "id": "memo-001",
        "room_id": "room-123",
        "room_number": "101",
        "category": "handover",
        "visibility": "public",
        "visible_roles": [],
        "content": "引継ぎ: リネン不足、補充依頼済み",
        "status": "in_progress",
        "priority": "normal",
        "due_date": null,
        "created_at": "2025-09-10T09:00:00Z",
        "updated_at": "2025-09-10T09:05:00Z",
        "created_by": { "id": "staff-1", "name": "山田" },
        "assigned_to": { "id": "staff-2", "name": "佐藤" },
        "comment_count": 1,
        "latest_comment": "補充完了、確認待ち"
      }
    ]
  },
  "pagination": { "page": 1, "limit": 20, "total_items": 1, "total_pages": 1 }
}
```

#### メモ作成
```http
POST /api/v1/admin/room-memos
Authorization: Bearer {accessToken}
Idempotency-Key: {uuid}
Content-Type: application/json

{
  "room_number": "101",
  "category": "handover",
  "visibility": "public",           // 省略時 'public'
  "visible_roles": [],                // visibility: 'role' の時のみ必須
  "content": "引継ぎ: リネン不足、補充依頼",
  "priority": "normal",              // 'low' | 'normal' | 'high' | 'urgent'
  "due_date": null,
  "assigned_to_staff_id": "staff-2"
}
```

備考:
- `created_by_staff_id` はトークンからサーバ側で付与（クライアント送信不要）
- テナント境界は必須（JWT/ミドルウェアで強制）

#### メモ更新
```http
PUT /api/v1/admin/room-memos/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "補充依頼→対応中に更新",
  "priority": "high",
  "due_date": "2025-09-11T12:00:00Z",
  "visibility": "role",
  "visible_roles": ["front", "manager"]
}
```

#### ステータス変更（監査ログを自動生成）
```http
PUT /api/v1/admin/room-memos/{id}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "completed",            // 'pending' | 'in_progress' | 'completed'
  "comment": "現地確認完了・クローズ"
}
```

#### コメント一覧/追加
```http
GET  /api/v1/admin/room-memos/{id}/comments
POST /api/v1/admin/room-memos/{id}/comments
Authorization: Bearer {accessToken}
Content-Type: application/json (POST)

// POST body
{ "content": "確認しました", "parent_comment_id": null }
```

#### メモ削除（ソフトデリート）
```http
DELETE /api/v1/admin/room-memos/{id}
Authorization: Bearer {accessToken}
```

#### WebSocket/イベント
```typescript
// 配信イベント（Phase 2 で有効化）
type RoomMemoEventType =
  | 'MEMO_CREATED'
  | 'MEMO_UPDATED'
  | 'MEMO_STATUS_CHANGED'
  | 'MEMO_COMMENT_ADDED'
  | 'MEMO_DELETED'
```

#### 移行・互換
- `rooms.notes` は廃止。既存データは `room_memos` へ一括取り込み（最古メモ or 系列化を選択可能）。
- 以後 `rooms.notes` は非推奨のためAPIレスポンスでは段階的に除去。

**v2.0対応アクション一覧**:
```typescript
// 客室清掃関連
'ROOM_CLEANING_START' | 'ROOM_CLEANING_COMPLETE' | 'ROOM_CLEANING_INSPECTION' | 'ROOM_CLEANING_FAILED'

// メンテナンス関連  
'ROOM_MAINTENANCE_START' | 'ROOM_MAINTENANCE_COMPLETE' | 'ROOM_REPAIR_REQUEST' | 'ROOM_REPAIR_COMPLETE'

// 客室ブロック関連
'ROOM_BLOCK' | 'ROOM_UNBLOCK' | 'ROOM_OUT_OF_ORDER' | 'ROOM_BACK_IN_SERVICE'

// 業務操作関連
'ROOM_INSPECTION' | 'ROOM_SETUP_COMPLETE' | 'ROOM_AMENITY_RESTOCK' | 'ROOM_DEEP_CLEANING'

// v1.0継続サポート
'CHECKIN' | 'CHECKOUT' | 'UPDATE_STATUS' | 'RESERVATION_CREATE' | 'RESERVATION_UPDATE' | 'RESERVATION_CANCEL'
```

#### ログ一覧取得
```http
GET /api/v1/logs/operations
Authorization: Bearer {accessToken}
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20, max: 1000)
  - action: string (v2.0: 詳細アクションでフィルタ可能)
  - operation_category: 'cleaning' | 'maintenance' | 'guest_service' | 'system' | 'emergency'
  - room_id: string
  - staff_id: string
  - start_date: string (ISO date)
  - end_date: string (ISO date)
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-1756280486036-ejj01zrrad5",
        "user_id": "staff-456",
        "action": "ROOM_CLEANING_COMPLETE",
        "action_label": "清掃完了",
        "target_type": "room",
        "target_id": "room-123",
        "system": "hotel-pms",
        "details": {
          "room_number": "101",
          "operation_category": "cleaning",
          "quality_check": "passed",
          "actual_duration": 45
        },
        "created_at": "2025-01-27T10:30:00Z"
      }
    ],
    "summary": {
      "total_logs": 1,
      "by_action": {
        "ROOM_CLEANING_COMPLETE": 1
      },
      "by_category": {
        "cleaning": 1
      }
    }
  }
}
```

### 会計機能

#### 請求書一覧
```http
GET /api/v1/accounting/invoices
Authorization: Bearer {accessToken}
```

#### 請求書作成
```http
POST /api/v1/accounting/invoices
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "customer_name": "テスト顧客",
  "customer_email": "test@example.com",
  "items": [
    {
      "name": "ルームサービス",
      "quantity": 1,
      "unit_price": 3000,
      "description": "朝食セット"
    }
  ],
  "notes": "テスト請求書"
}
```

#### 決済記録
```http
POST /api/v1/accounting/payments
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "invoice_id": "inv-001",
  "amount": 15000,
  "payment_method": "credit_card",
  "payment_reference": "CC-TEST-001",
  "notes": "テスト決済"
}
```

---

## 📊 レスポンス形式

### 成功レスポンス
```json
{
  "success": true,
  "data": {
    // 実際のデータ
  },
  "meta": {
    // メタデータ（オプション）
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 100,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "timestamp": "2025-08-27T07:00:00.000Z",
  "request_id": "req-1756280000000-abc123"
}
```

### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラーが発生しました",
    "details": {
      // エラー詳細（オプション）
    }
  },
  "timestamp": "2025-08-27T07:00:00.000Z",
  "request_id": "req-1756280000000-abc123"
}
```

---

## ⚠️ エラーハンドリング

### HTTPステータスコード

| コード | 説明 | 用途 |
|--------|------|------|
| 200 | OK | 成功 |
| 201 | Created | リソース作成成功 |
| 400 | Bad Request | リクエストエラー |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 認可エラー |
| 404 | Not Found | リソースが見つからない |
| 422 | Unprocessable Entity | バリデーションエラー |
| 500 | Internal Server Error | サーバーエラー |

### エラーコード

| コード | 説明 |
|--------|------|
| `VALIDATION_ERROR` | バリデーションエラー |
| `AUTHENTICATION_ERROR` | 認証エラー |
| `AUTHORIZATION_ERROR` | 認可エラー |
| `NOT_FOUND` | リソースが見つからない |
| `INTERNAL_ERROR` | 内部サーバーエラー |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 |

---

## 🔐 認証・認可

### JWTトークン
- **アクセストークン**: 8時間有効
- **リフレッシュトークン**: 30日間有効

### 権限レベル
- `STAFF`: 一般スタッフ
- `ADMIN`: 管理者
- `SUPER_ADMIN`: システム管理者
- `MANAGER`: マネージャー
- `OWNER`: オーナー
- `SYSTEM`: システム

### 認証ヘッダー
```http
Authorization: Bearer {accessToken}
```

---

## 📝 重要な注意事項

### ✅ 実装状況
- **フロントデスク客室管理API**: 完全実装（実際のroomsテーブル使用）
- **フロントデスク会計API**: 完全実装（実際の会計テーブル使用）
- **管理者操作ログAPI**: 完全実装（実際のsystem_eventテーブル使用）
- **会計API請求書詳細**: 完全実装（実際のinvoicesテーブル使用）

### 🔄 データベース対応
以下のテーブルが実装済み：
- ✅ `rooms` - 客室管理（完全実装）
- ✅ `invoices` - 請求書管理（完全実装）
- ✅ `payments` - 支払い管理（完全実装）
- ✅ `transactions` - 取引管理（完全実装）
- ✅ `reservations` - 予約管理（完全実装）
- ✅ `system_event` - システムイベントログ（完全実装）

### 📞 サポート
- **開発チーム**: hotel-common開発チーム
- **ドキュメント更新**: API変更時は必ずこの仕様書を更新
- **バージョン管理**: セマンティックバージョニング採用

---

**© 2025 Hotel Management System - API仕様書 v1.0.0**
