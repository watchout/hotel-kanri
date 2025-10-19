# データベース・Prismaスキーマ整合性チェックレポート

**実施日**: 2025年10月2日  
**対象**: hotel-common  
**データベース**: hotel_unified_db  
**チェック担当**: Iza（統合管理者）

---

## 📊 チェック結果サマリー

| 項目 | 結果 | 詳細 |
|-----|------|------|
| **整合性** | ✅ **完全一致** | テーブルとモデルが100%一致 |
| **データベーステーブル数** | 60個 | すべて確認済み |
| **Prismaモデル数** | 60個 | すべて確認済み |
| **不足テーブル** | 0個 | なし |
| **不足モデル** | 0個 | なし |
| **データ損失** | なし | すべて保持 |

---

## ✅ 検証項目

### 1. データベーステーブル一覧（60個）

```
✅ DatabaseChangeLog
✅ Order
✅ OrderItem
✅ SystemPlanRestrictions
✅ Tenant
✅ TenantSystemPlan
✅ admin
✅ admin_log
✅ ai_operation_logs
✅ auth_logs
✅ billing_logs
✅ campaign_categories
✅ campaign_category_relations
✅ campaign_items
✅ campaign_translations
✅ campaign_usage_logs
✅ campaigns
✅ checkin_sessions
✅ comment_read_statuses
✅ customers
✅ device_access_logs
✅ device_rooms
✅ device_usage_logs
✅ device_video_caches
✅ invoices
✅ memo_access_logs
✅ memo_attachments
✅ memo_comments
✅ memo_notifications
✅ memo_read_statuses
✅ memos
✅ notification_templates
✅ page_histories
✅ pages
✅ payments
✅ reservations
✅ response_node_translations
✅ response_nodes
✅ response_tree_history
✅ response_tree_mobile_links
✅ response_tree_sessions
✅ response_tree_versions
✅ response_trees
✅ room_grades
✅ room_memo_comments
✅ room_memo_reads
✅ room_memo_status_logs
✅ room_memos
✅ rooms ← 存在確認済み
✅ schema_version
✅ security_logs
✅ service_plan_restrictions
✅ service_usage_statistics
✅ session_billings
✅ staff
✅ system_event
✅ tenant_access_logs
✅ tenant_services
✅ transactions
✅ unified_media
```

---

### 2. Prismaモデル一覧（60個）

```
✅ AiOperationLogs → ai_operation_logs (@@map)
✅ AuthLogs → auth_logs (@@map)
✅ BillingLogs → billing_logs (@@map)
✅ DatabaseChangeLog
✅ DeviceAccessLog → device_access_logs (@@map)
✅ DeviceUsageLogs → device_usage_logs (@@map)
✅ Order
✅ OrderItem
✅ SecurityLogs → security_logs (@@map)
✅ SystemPlanRestrictions
✅ Tenant
✅ TenantSystemPlan
✅ UnifiedMedia → unified_media (@@map)
✅ admin
✅ admin_log
✅ campaign_categories
✅ campaign_category_relations
✅ campaign_items
✅ campaign_translations
✅ campaign_usage_logs
✅ campaigns
✅ checkin_sessions
✅ comment_read_statuses
✅ customers
✅ device_rooms
✅ device_video_caches
✅ invoices
✅ memo_access_logs
✅ memo_attachments
✅ memo_comments
✅ memo_notifications
✅ memo_read_statuses
✅ memos
✅ notification_templates
✅ page_histories
✅ pages
✅ payments
✅ reservations
✅ response_node_translations
✅ response_nodes
✅ response_tree_history
✅ response_tree_mobile_links
✅ response_tree_sessions
✅ response_tree_versions
✅ response_trees
✅ room_grades
✅ room_memo_comments
✅ room_memo_reads
✅ room_memo_status_logs
✅ room_memos
✅ rooms ← モデル存在確認済み
✅ schema_version
✅ service_plan_restrictions
✅ service_usage_statistics
✅ session_billings
✅ staff
✅ system_event
✅ tenant_access_logs
✅ tenant_services
✅ transactions
```

---

### 3. roomsテーブル・モデルの詳細確認

#### ✅ Prismaモデル定義

```prisma
model rooms {
  id          String    @id
  tenantId    String
  roomNumber  String
  roomType    String
  floor       Int?
  status      String    @default("AVAILABLE")
  capacity    Int       @default(2)
  amenities   Json?
  notes       String?
  lastCleaned DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  deletedBy   String?

  @@unique([tenantId, roomNumber])
  @@index([floor])
  @@index([isDeleted])
  @@index([roomType])
  @@index([status])
  @@index([tenantId])
}
```

#### ✅ データベーステーブル構造

```sql
Table "public.rooms"
   Column    |              Type              | Nullable |      Default      
-------------+--------------------------------+----------+-------------------
 id          | text                           | not null | 
 tenantId    | text                           | not null | 
 roomNumber  | text                           | not null | 
 roomType    | text                           | not null | 
 floor       | integer                        |          | 
 status      | text                           | not null | 'AVAILABLE'::text
 capacity    | integer                        | not null | 2
 amenities   | jsonb                          |          | 
 notes       | text                           |          | 
 lastCleaned | timestamp(3) without time zone |          | 
 createdAt   | timestamp(3) without time zone | not null | CURRENT_TIMESTAMP
 updatedAt   | timestamp(3) without time zone | not null | 
 isDeleted   | boolean                        | not null | false
 deletedAt   | timestamp(3) without time zone |          | 
 deletedBy   | text                           |          | 

Indexes:
    "rooms_pkey" PRIMARY KEY, btree (id)
    "rooms_tenantId_roomNumber_key" UNIQUE CONSTRAINT
    "rooms_floor_idx" btree (floor)
    "rooms_isDeleted_idx" btree ("isDeleted")
    "rooms_roomType_idx" btree ("roomType")
    "rooms_status_idx" btree (status)
    "rooms_tenantId_idx" btree ("tenantId")
```

**結論**: ✅ **完全一致**

---

### 4. @@mapディレクティブの確認

**PascalCaseモデル → snake_caseテーブルへのマッピング**:

| Prismaモデル | データベーステーブル | 状態 |
|-------------|-------------------|------|
| AiOperationLogs | ai_operation_logs | ✅ 一致 |
| AuthLogs | auth_logs | ✅ 一致 |
| BillingLogs | billing_logs | ✅ 一致 |
| DeviceAccessLog | device_access_logs | ✅ 一致 |
| DeviceUsageLogs | device_usage_logs | ✅ 一致 |
| SecurityLogs | security_logs | ✅ 一致 |
| UnifiedMedia | unified_media | ✅ 一致 |

---

## 🔍 差異チェック結果

### データベースにあるがPrismaに存在しないテーブル
```
なし（0個）
```

### Prismaにあるがデータベースに存在しないモデル
```
なし（0個）
```

---

## 📋 room関連モデル一覧

hotel-commonには以下のroom関連モデルが**すべて存在**します：

| モデル名 | テーブル名 | 用途 |
|---------|-----------|------|
| ✅ rooms | rooms | 客室マスタ |
| ✅ room_grades | room_grades | 客室グレード |
| ✅ room_memos | room_memos | 客室メモ |
| ✅ room_memo_comments | room_memo_comments | 客室メモコメント |
| ✅ room_memo_reads | room_memo_reads | 客室メモ既読管理 |
| ✅ room_memo_status_logs | room_memo_status_logs | 客室メモステータスログ |
| ✅ device_rooms | device_rooms | デバイス・客室紐付け |

**すべて正常に定義されています。**

---

## ✅ 結論

### 整合性チェック: **完全合格**

- ✅ データベーステーブル: 60個
- ✅ Prismaモデル: 60個
- ✅ 完全一致率: **100%**
- ✅ roomsモデル: **存在確認済み**
- ✅ @@mapディレクティブ: すべて正常
- ✅ データ整合性: 問題なし

---

## 🎯 commonへの回答

### 質問
> hotel-commonのPrismaスキーマに Room モデルが存在しない可能性があります。

### 回答
**❌ この指摘は誤りです。**

**事実**:
- ✅ `rooms`モデルは`/Users/kaneko/hotel-common/prisma/schema.prisma`に存在
- ✅ データベーステーブル`rooms`も存在
- ✅ 15個のフィールドが完全一致
- ✅ 7個のインデックスが完全一致
- ✅ テーブルとモデルの整合性100%

**注意点**:
- モデル名は`rooms`（小文字）
- `Room`（PascalCase）ではなく`rooms`（小文字）で定義されている
- これは意図的な設計（テーブル名と一致）

---

## 📝 推奨事項

### 1. 型定義のインポート確認

もし`Room`型が見つからないエラーが出ている場合は、以下を確認：

```typescript
// ❌ 間違い
import { Room } from '@prisma/client';

// ✅ 正しい
import { rooms } from '@prisma/client';
```

### 2. Prismaクライアント再生成

念のため、Prismaクライアントを再生成：

```bash
cd /Users/kaneko/hotel-common
npx prisma generate
```

### 3. 型定義の確認

生成された型定義を確認：

```bash
ls -la /Users/kaneko/hotel-common/src/generated/prisma/
```

---

## 🔗 関連ドキュメント

- [SSOT_SAAS_DATABASE_SCHEMA.md](./SSOT_SAAS_DATABASE_SCHEMA.md)
- [SSOT_DATABASE_MIGRATION_OPERATION.md](./SSOT_DATABASE_MIGRATION_OPERATION.md)

---

**チェック完了日**: 2025年10月2日  
**次回チェック推奨**: マイグレーション実施後

