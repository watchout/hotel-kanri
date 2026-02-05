# SSOT: 注文管理システム

**作成日**: 2025-10-02
**最終更新**: 2026-02-05（3層構造タグ追加）
**バージョン**: 2.2.0
**ステータス**: ✅ 確定
**優先度**: 🔴 最高（Phase 1）

**関連SSOT**:
- [SSOT_OPERATIONAL_LOG_ARCHITECTURE.md](../00_foundation/SSOT_OPERATIONAL_LOG_ARCHITECTURE.md) - 運用/ログ二重管理アーキテクチャ（必読）
- [SSOT_SAAS_MENU_MANAGEMENT.md](./SSOT_SAAS_MENU_MANAGEMENT.md) - メニュー管理（管理画面）
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤

**注**: 客室端末からの注文フローについては [SSOT_GUEST_ORDER_FLOW.md](../02_guest_features/SSOT_GUEST_ORDER_FLOW.md) を参照

---

## 層構造 (Layer Structure)

| セクション | 層 | RFC 2119 |
|-----------|-----|----------|
| §1-§3 概要・スコープ・技術スタック | [CORE] | - |
| §4 注文ライフサイクル | [CORE] | MUST |
| §5 データモデル | [CONTRACT] | MUST |
| §6 運用/ログ二重管理戦略 | [CONTRACT] | MUST |
| §7 API仕様 | [CONTRACT] | MUST |
| §8 システム間連携 | [CONTRACT] | SHOULD |
| §9-§11 実装詳細・未実装機能 | [DETAIL] | MAY |

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [注文ライフサイクル](#注文ライフサイクル)
5. [データモデル](#データモデル)
6. [運用/ログ二重管理戦略](#運用ログ二重管理戦略)
7. [API仕様](#api仕様)
8. [システム間連携](#システム間連携)
9. [実装詳細](#実装詳細)
10. [既存実装状況](#既存実装状況)
11. [未実装機能](#未実装機能)

---

## 📖 概要

### 目的
ホテルのルームサービス注文を管理する統一システムを提供する。注文の作成から完了まで、全ライフサイクルを一元管理する。

### 基本方針
- **統一API**: hotel-common が注文処理の中心
- **hotel-saas**: API プロキシ + フロントエンド
- **チェックインセッション連携**: セッションIDベースの注文管理
- **リアルタイム更新**: 注文ステータスの即時反映
- **オフライン対応**: IndexedDB によるローカル保存（将来実装）
- **🆕 運用/ログ分離**: 進行中の注文は`orders`、完了後は`order_logs`へ自動移行（24時間後）

### アーキテクチャ概要（管理画面）
```
[管理画面]
  ↓ 注文管理・確認
[hotel-saas API (Proxy)]
  ↓ GET/PUT /api/v1/admin/orders
[hotel-common API (Core)]
  ↓ Prisma ORM
[PostgreSQL (統一DB)]
  ├─ orders テーブル (運用: 進行中のみ)
  │   ↓ 完了後24時間でバッチ削除
  ├─ order_logs テーブル (ログ: 全履歴・月次パーティション)
  ├─ order_items テーブル (運用)
  ├─ order_item_logs テーブル (ログ)
  └─ checkin_sessions テーブル (外部キー)
```

**注**: 客室端末からの注文作成フローについては [SSOT_GUEST_ORDER_FLOW.md](../02_guest_features/SSOT_GUEST_ORDER_FLOW.md) を参照

---

## 🎯 スコープ

### 対象システム
- ✅ **hotel-common**: コア実装（注文CRUD、ビジネスロジック）
- ✅ **hotel-saas**: プロキシAPI + フロントエンド UI
- 🔄 **hotel-pms**: 将来連携（料金計算・請求）
- ❌ **hotel-member**: 対象外

### 機能範囲

#### ✅ 実装済み
- 注文一覧取得（`hotel-saas/server/api/v1/admin/orders.get.ts`）
- 部屋別注文取得（`hotel-saas/server/api/v1/admin/front-desk/room-orders.get.ts`）
- hotel-common への API プロキシ実装
- データベーステーブル（`orders`, `order_items`）

#### 🚧 部分実装
- 注文作成API（基本構造のみ）
- 注文ステータス更新

#### ❌ 未実装
- 注文キャンセル機能
- 注文編集機能
- 注文履歴・統計機能
- リアルタイム通知（WebSocket）
- オフライン対応（IndexedDB同期）

---

## 🛠️ 技術スタック

### バックエンド（hotel-common）
- **Framework**: Express.js + TypeScript
- **ORM**: Prisma
- **データベース**: PostgreSQL（統一DB）
- **認証**: Session-based（Redis）

### プロキシAPI（hotel-saas）
- **Framework**: Nuxt 3 Server Routes
- **HTTP Client**: `$fetch`（Nuxt built-in）
- **認証**: Session middleware

### フロントエンド（hotel-saas）
- **Framework**: Nuxt 3 + Vue 3
- **状態管理**: Composables
- **UI Library**: Tailwind CSS

---

## 🔄 注文ライフサイクル

### 注文ステータス遷移

```
[received]          注文受付
  ↓
[preparing]         調理中・準備中
  ↓
[ready]            配膳準備完了
  ↓
[delivering]       配達中
  ↓
[delivered]        配達完了
  ↓
[completed]        完了（料金精算済み）

[cancelled]        キャンセル（任意のタイミング）
```

### ステータス詳細

| ステータス | 説明 | 次の遷移先 | 遷移トリガー |
|-----------|------|-----------|------------|
| `received` | 注文受付完了 | `preparing`, `cancelled` | フロント/キッチンが確認 |
| `preparing` | 調理中・準備中 | `ready`, `cancelled` | 調理完了 |
| `ready` | 配膳準備完了 | `delivering`, `cancelled` | サーバーが受取 |
| `delivering` | 配達中 | `delivered`, `cancelled` | 部屋到着 |
| `delivered` | 配達完了 | `completed` | ゲスト受取確認 |
| `completed` | 完了 | - | PMS請求処理完了 |
| `cancelled` | キャンセル | - | スタッフ/ゲスト操作 |

---

## 📊 データモデル

### ⚠️ 重要: 運用/ログ二重管理

**この設計は [SSOT_OPERATIONAL_LOG_ARCHITECTURE.md](../00_foundation/SSOT_OPERATIONAL_LOG_ARCHITECTURE.md) に準拠しています。**

---

### Order（注文 - 運用テーブル）

**用途**: 現在進行中の注文のみを保持（高速アクセス特化）

**保持期間**: 
- 進行中（`received`, `preparing`, `ready`, `delivering`, `delivered`）: 即時参照
- 完了/キャンセル（`completed`, `cancelled`）: 24時間後にバッチ削除

**Prismaモデル**:
```prisma
model Order {
  id          Int       @id @default(autoincrement())
  tenantId    String    @map("tenant_id")
  roomId      String    @map("room_id")
  placeId     Int?      @map("place_id")
  status      String    @default("received")
  items       Json
  total       Int
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  completedAt DateTime? @map("completed_at")  // 🆕 完了時刻（バッチ削除判定用）
  paidAt      DateTime? @map("paid_at")
  isDeleted   Boolean   @default(false) @map("is_deleted")
  deletedAt   DateTime? @map("deleted_at")
  sessionId   String?   @map("session_id")
  uuid        String?   @unique
  
  session   CheckinSession? @relation(fields: [sessionId], references: [id])
  OrderItem OrderItem[]
  
  // インデックス（高速アクセス特化）
  @@index([tenantId], map: "idx_orders_tenant_id")
  @@index([sessionId], map: "idx_orders_session_id")
  @@index([status], map: "idx_orders_status")
  @@index([createdAt], map: "idx_orders_created_at")
  // 🆕 進行中注文の高速検索
  @@index([tenantId, status], map: "idx_orders_active", where: "is_deleted = false AND status NOT IN ('completed', 'cancelled')")
  // 🆕 バッチ削除用
  @@index([completedAt], map: "idx_orders_cleanup", where: "is_deleted = false AND status IN ('completed', 'cancelled')")
  @@map("orders")
}
```

**フィールド詳細**:

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `id` | Int | ✅ | 注文ID（自動採番） |
| `tenantId` | String | ✅ | テナントID（マルチテナント分離） |
| `roomId` | String | ✅ | 部屋番号 |
| `placeId` | Int | ❌ | 場所ID（将来拡張用） |
| `status` | String | ✅ | 注文ステータス（デフォルト: "received"） |
| `items` | Json | ✅ | 注文明細（JSON形式）※後述 |
| `total` | Int | ✅ | 合計金額（税込・円） |
| `createdAt` | DateTime | ✅ | 作成日時 |
| `updatedAt` | DateTime | ✅ | 更新日時 |
| `completedAt` | DateTime | ❌ | 🆕 完了時刻（バッチ削除判定用） |
| `paidAt` | DateTime | ❌ | 支払日時 |
| `isDeleted` | Boolean | ✅ | 論理削除フラグ |
| `deletedAt` | DateTime | ❌ | 削除日時 |
| `sessionId` | String | ❌ | チェックインセッションID |
| `uuid` | String | ❌ | 外部連携用UUID |

**`items` JSON構造**:
```json
[
  {
    "menuItemId": 1,
    "name": "ハンバーグステーキ",
    "price": 1200,
    "quantity": 2,
    "notes": "温かい状態で"
  },
  {
    "menuItemId": 5,
    "name": "オレンジジュース",
    "price": 400,
    "quantity": 1
  }
]
```

---

### OrderLog（注文ログ - アーカイブテーブル）

**用途**: 完了/キャンセルされた全注文の永久保存

**保持期間**: 永久（月次パーティション、3年以上前は圧縮保存）

**Prismaモデル**:
```prisma
model OrderLog {
  logId       BigInt    @id @default(autoincrement()) @map("log_id")
  originalId  Int       @map("original_id")  // 元のorders.id
  tenantId    String    @map("tenant_id")
  roomId      String    @map("room_id")
  placeId     Int?      @map("place_id")
  status      String
  items       Json
  total       Int
  
  // 元データのタイムスタンプ
  createdAt   DateTime  @map("created_at")
  updatedAt   DateTime  @map("updated_at")
  completedAt DateTime? @map("completed_at")
  paidAt      DateTime? @map("paid_at")
  sessionId   String?   @map("session_id")
  uuid        String?
  
  // アーカイブ情報
  archivedAt     DateTime @default(now()) @map("archived_at")
  archivedReason String   @map("archived_reason")  // 'completed', 'cancelled'
  
  // インデックス（履歴検索特化）
  @@index([tenantId, createdAt(sort: Desc)], map: "idx_order_logs_tenant_date")
  @@index([originalId], map: "idx_order_logs_original")
  @@index([sessionId], map: "idx_order_logs_session")
  @@map("order_logs")
}
```

**PostgreSQL DDL（パーティショニング）**:
```sql
-- 親テーブル
CREATE TABLE order_logs (
  log_id          BIGSERIAL,
  original_id     INTEGER NOT NULL,
  tenant_id       TEXT NOT NULL,
  room_id         TEXT NOT NULL,
  place_id        INTEGER,
  status          TEXT NOT NULL,
  items           JSONB NOT NULL,
  total           INTEGER NOT NULL,
  
  created_at      TIMESTAMP NOT NULL,
  updated_at      TIMESTAMP NOT NULL,
  completed_at    TIMESTAMP,
  paid_at         TIMESTAMP,
  session_id      TEXT,
  uuid            TEXT,
  
  archived_at     TIMESTAMP DEFAULT NOW(),
  archived_reason TEXT,
  
  PRIMARY KEY (log_id, created_at)
) PARTITION BY RANGE (created_at);

-- 月次パーティション（例）
CREATE TABLE order_logs_2025_10 PARTITION OF order_logs
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE order_logs_2025_11 PARTITION OF order_logs
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

**フィールド詳細**:

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `logId` | BigInt | ✅ | ログID（自動採番） |
| `originalId` | Int | ✅ | 元の注文ID（`orders.id`） |
| `archivedAt` | DateTime | ✅ | アーカイブ日時 |
| `archivedReason` | String | ✅ | アーカイブ理由（`completed`, `cancelled`） |
| ※その他 | - | - | `Order`モデルと同じ |

---

### OrderItem（注文明細 - 運用テーブル）

**Prismaモデル**:
```prisma
model OrderItem {
  id          Int       @id @default(autoincrement())
  tenantId    String
  orderId     Int
  menuItemId  Int
  name        String
  price       Int
  quantity    Int
  status      String    @default("pending")
  notes       String?
  deliveredAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime
  deleted_at  DateTime?
  deleted_by  String?
  is_deleted  Boolean   @default(false)
  
  Order       Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([tenantId])
  @@index([status])
  @@index([is_deleted])
  @@map("order_items")
}
```

**フィールド詳細**:

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `id` | Int | ✅ | 明細ID |
| `tenantId` | String | ✅ | テナントID |
| `orderId` | Int | ✅ | 注文ID（外部キー） |
| `menuItemId` | Int | ✅ | メニュー項目ID |
| `name` | String | ✅ | メニュー名（スナップショット） |
| `price` | Int | ✅ | 単価（円） |
| `quantity` | Int | ✅ | 数量 |
| `status` | String | ✅ | 明細ステータス |
| `notes` | String | ❌ | 特記事項 |
| `deliveredAt` | DateTime | ❌ | 配達完了日時 |

---

### OrderItemLog（注文明細ログ - アーカイブテーブル）

**用途**: 完了/キャンセルされた注文明細の永久保存

**Prismaモデル**:
```prisma
model OrderItemLog {
  logId       BigInt    @id @default(autoincrement()) @map("log_id")
  originalId  Int       @map("original_id")  // 元のorder_items.id
  orderId     Int       @map("order_id")     // 元のOrder.id
  tenantId    String    @map("tenant_id")
  menuItemId  Int       @map("menu_item_id")
  name        String
  price       Int
  quantity    Int
  status      String
  notes       String?
  deliveredAt DateTime? @map("delivered_at")
  
  // 元データのタイムスタンプ
  createdAt   DateTime  @map("created_at")
  updatedAt   DateTime  @map("updated_at")
  
  // アーカイブ情報
  archivedAt  DateTime  @default(now()) @map("archived_at")
  
  @@index([orderId], map: "idx_order_item_logs_order")
  @@index([tenantId], map: "idx_order_item_logs_tenant")
  @@map("order_item_logs")
}
```

---

### CheckinSession（チェックインセッション）

**Prismaモデル**:
```prisma
model checkin_sessions {
  id                String    @id
  tenant_id         String
  session_number    String    @unique
  reservation_id    String?
  room_id           String
  guest_info        Json
  adults            Int       @default(1)
  children          Int       @default(0)
  check_in_at       DateTime
  check_out_at      DateTime?
  planned_check_out DateTime
  status            String    @default("ACTIVE")
  special_requests  String?
  notes             String?
  created_at        DateTime  @default(now())
  updated_at        DateTime
  
  orders            Order[]
  
  @@index([tenant_id])
  @@index([room_id])
  @@index([session_number])
  @@index([status])
  @@map("checkin_sessions")
}
```

**注文との関連**:
- `Order.sessionId` → `checkin_sessions.id`
- 1セッション : N注文の関係
- セッションがACTIVEの間、注文を紐付け可能

---

## 🔄 運用/ログ二重管理戦略

### データフロー

```
[1] 注文作成 → orders テーブル（status='received'）
     ↓
[2] ステータス更新 → orders テーブル（status変化）
     ↓
[3] 注文完了 → orders テーブル（status='completed', completedAt設定）
     ↓ 【即座実行】
[4] ログへコピー → order_logs テーブル（archivedAt設定）
     ↓ 【24時間後・バッチ処理】
[5] 運用から削除 → orders テーブルから物理削除
     ↓
[6] ログのみ残存 → order_logs テーブル（永久保存）
```

---

### 実装: 注文完了処理

**ファイル**: `hotel-common/src/services/order.service.ts`

```typescript
export async function completeOrder(orderId: number, tenantId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. 注文を完了状態に
    const order = await tx.order.update({
      where: { id: orderId, tenantId },
      data: { 
        status: 'completed',
        completedAt: new Date()
      },
      include: { OrderItem: true }
    })
    
    // 2. ログテーブルへ即座コピー
    await tx.orderLog.create({
      data: {
        originalId: order.id,
        tenantId: order.tenantId,
        roomId: order.roomId,
        placeId: order.placeId,
        status: order.status,
        items: order.items,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        completedAt: order.completedAt,
        paidAt: order.paidAt,
        sessionId: order.sessionId,
        uuid: order.uuid,
        archivedAt: new Date(),
        archivedReason: 'completed'
      }
    })
    
    // 3. 注文明細もログへ
    await tx.orderItemLog.createMany({
      data: order.OrderItem.map(item => ({
        originalId: item.id,
        orderId: order.id,
        tenantId: item.tenantId,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        status: item.status,
        notes: item.notes,
        deliveredAt: item.deliveredAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        archivedAt: new Date()
      }))
    })
    
    return order
  })
}
```

---

### バッチ処理: 完了注文の削除

**ファイル**: `hotel-common/src/batch/cleanup-orders.ts`

**実行頻度**: 毎時0分

```typescript
import { prisma } from '../database/prisma'

export async function cleanupCompletedOrders() {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間前
  
  // 1. ログ移行済みの完了注文を削除
  const result = await prisma.order.deleteMany({
    where: {
      status: { in: ['completed', 'cancelled'] },
      completedAt: { lt: cutoffTime }
    }
  })
  
  console.log(`[Cleanup] Deleted ${result.count} completed orders`)
  
  // 2. 孤立した注文明細も削除
  const orderIds = await prisma.order.findMany({ select: { id: true } })
  await prisma.orderItem.deleteMany({
    where: {
      orderId: { notIn: orderIds.map(o => o.id) }
    }
  })
}

// PM2設定（ecosystem.config.js）
{
  name: 'cleanup-orders',
  script: 'dist/batch/cleanup-orders.js',
  cron_restart: '0 * * * *',  // 毎時0分
  autorestart: false
}
```

---

### パーティション管理

**ファイル**: `hotel-common/scripts/manage-partitions.sql`

**実行頻度**: 月初1日

```sql
-- 次月のパーティション作成
DO $$
DECLARE
  next_month DATE := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  next_next_month DATE := DATE_TRUNC('month', NOW() + INTERVAL '2 months');
  partition_name TEXT := 'order_logs_' || TO_CHAR(next_month, 'YYYY_MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF order_logs
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, next_month, next_next_month
  );
  
  RAISE NOTICE 'Created partition: %', partition_name;
END $$;
```

---

## 🔌 API仕様

### ⚠️ 重要: API参照テーブルの変更

| API用途 | 参照テーブル | 備考 |
|---------|------------|------|
| 進行中注文の取得 | `orders` | デフォルト（高速） |
| 完了注文の検索 | `order_logs` | 日時範囲指定必須 |
| 統計・レポート | `order_logs` | 集計は日次ビュー推奨 |

---

### 1. 注文一覧取得（進行中）

**エンドポイント**: `GET /api/v1/admin/orders`

**変更点**: デフォルトで進行中の注文のみ取得

**実装箇所**:
- hotel-saas: `/Users/kaneko/hotel-saas/server/api/v1/admin/orders.get.ts`
- hotel-common: `/api/v1/admin/orders`

**リクエスト**:
```typescript
// Query Parameters
{
  room_number?: string      // 部屋番号フィルタ
  status?: string          // ステータスフィルタ（デフォルト: 進行中のみ）
  date_from?: string       // 開始日（ISO8601）
  date_to?: string         // 終了日（ISO8601）
  limit?: number           // ページネーション（デフォルト: 50）
  offset?: number          // オフセット（デフォルト: 0）
  include_completed?: boolean  // 🆕 完了注文も含む（デフォルト: false）
  include_stats?: boolean  // 統計情報含む
}

// Headers
{
  'Authorization': 'Bearer {sessionId}',
  'X-Tenant-ID': '{tenantId}',
  'Content-Type': 'application/json'
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    orders: [
      {
        id: 123,
        uuid: "ord-20251002-0001",
        tenantId: "tenant-xxx",
        roomId: "501",
        status: "preparing",
        total: 3872,
        createdAt: "2025-10-02T10:30:00Z",
        updatedAt: "2025-10-02T10:33:00Z",
        sessionId: "session-xxx",
        items: [ /* JSON */ ],
        OrderItem: [
          {
            id: 456,
            name: "ハンバーグステーキ",
            price: 1200,
            quantity: 2,
            status: "pending",
            notes: "温かい状態で"
          },
          // ...
        ]
      },
      // ...
    ],
    total: 150,        // 総件数
    limit: 50,
    offset: 0,
    stats: {           // include_stats=true の場合
      totalOrders: 150,
      totalRevenue: 450000,
      averageOrderValue: 3000,
      ordersByStatus: {
        received: 10,
        preparing: 5,
        delivered: 135
      }
    }
  }
}
```

**実装詳細**:
```typescript
// hotel-common/src/routes/api/v1/admin/orders.ts
const orders = await prisma.order.findMany({
  where: {
    tenantId,
    isDeleted: false,
    // 🆕 デフォルトで進行中のみ
    ...(query.include_completed !== 'true' && {
      status: { in: ['received', 'preparing', 'ready', 'delivering', 'delivered'] }
    }),
    // 日時範囲指定
    ...(query.date_from && {
      createdAt: { gte: new Date(query.date_from) }
    })
  },
  orderBy: { createdAt: 'desc' },
  take: Number(query.limit) || 50,
  skip: Number(query.offset) || 0
})
```

**実装状況**: ✅ 実装済み（🔄 要修正: デフォルトフィルタ追加）

---

### 2. 注文履歴取得（完了/キャンセル）

**エンドポイント**: `GET /api/v1/admin/orders/history`

**新規追加**: ログテーブルから履歴を検索

**リクエスト**:
```typescript
{
  room_number?: string
  status?: string          // 'completed' または 'cancelled'
  date_from: string        // 必須
  date_to: string          // 必須
  limit?: number           // デフォルト: 100
  offset?: number
}
```

**実装詳細**:
```typescript
// hotel-common/src/routes/api/v1/admin/orders/history.ts
const orderLogs = await prisma.orderLog.findMany({
  where: {
    tenantId,
    createdAt: {
      gte: new Date(query.date_from),
      lte: new Date(query.date_to)
    },
    ...(query.status && { status: query.status }),
    ...(query.room_number && { roomId: query.room_number })
  },
  orderBy: { createdAt: 'desc' },
  take: Number(query.limit) || 100,
  skip: Number(query.offset) || 0
})
```

**実装状況**: ❌ 未実装（要作成）

---

### 3. 部屋別注文取得

**エンドポイント**: `GET /api/v1/admin/front-desk/room-orders`

**実装箇所**:
- hotel-saas: `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/room-orders.get.ts`

**リクエスト**:
```typescript
// Query Parameters
{
  room_number: string  // 必須
  status?: string
  limit?: number
}

// Headers（同上）
```

**レスポンス**: 注文一覧と同じ構造

**実装状況**: ✅ 実装済み

---

### 4. 注文作成

**エンドポイント**: `POST /api/v1/orders`

**実装箇所**:
- hotel-saas: 未実装（要作成）
- hotel-common: 未実装（要作成）

**リクエスト**:
```typescript
{
  roomId: "501",           // 部屋番号
  sessionId?: "session-xxx", // チェックインセッションID（任意）
  items: [
    {
      menuItemId: 1,
      quantity: 2,
      notes: "温かい状態で"
    },
    {
      menuItemId: 5,
      quantity: 1
    }
  ]
}

// Headers
{
  'Authorization': 'Bearer {sessionId}',  // デバイス認証の場合は不要
  'X-Tenant-ID': '{tenantId}',
  'Content-Type': 'application/json'
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    order: {
      id: 123,
      uuid: "ord-20251002-0001",
      tenantId: "tenant-xxx",
      roomId: "501",
      status: "received",
      total: 3872,
      createdAt: "2025-10-02T10:30:00Z",
      sessionId: "session-xxx",
      items: [ /* スナップショット */ ],
      OrderItem: [ /* 明細 */ ]
    }
  }
}
```

**ビジネスロジック**:
1. `tenantId` をリクエストヘッダーから取得
2. `menuItemId` から `menu_items` テーブルを参照し、価格・名称を取得
3. 合計金額を計算（税込）
4. トランザクションで `Order` + `OrderItem[]` を作成
5. 🆕 **ログへの即座コピーはしない**（完了時のみ）
6. WebSocket通知（将来実装）

**実装状況**: ❌ 未実装

---

### 5. 注文ステータス更新

**エンドポイント**: `PATCH /api/v1/orders/:id/status`

**実装箇所**: 未実装（要作成）

**リクエスト**:
```typescript
{
  status: "preparing"  // 新しいステータス
}

// Headers（同上）
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    order: {
      id: 123,
      status: "preparing",
      updatedAt: "2025-10-02T10:35:00Z"
    }
  }
}
```

**バリデーション**:
- ステータス遷移の妥当性チェック
- 権限チェック（スタッフのみ）
- テナント分離チェック

**🆕 完了時の特別処理**:
```typescript
if (newStatus === 'completed' || newStatus === 'cancelled') {
  // completedAt を設定
  data.completedAt = new Date()
  
  // ログテーブルへ即座コピー（上記「運用/ログ二重管理戦略」参照）
  await archiveOrder(order)
}
```

**実装状況**: ❌ 未実装

---

### 6. 注文取得（単体）

**エンドポイント**: `GET /api/v1/orders/:id`

**実装箇所**: 未実装（要作成）

**リクエスト**:
```typescript
// Path Parameter
id: number

// Headers（同上）
```

**レスポンス**: 注文オブジェクト（詳細）

**🆕 検索順序**:
1. まず `orders` テーブルを検索
2. 見つからない場合は `order_logs` テーブルを検索（過去24時間以内）

**実装状況**: ❌ 未実装

---

### 7. 注文キャンセル

**エンドポイント**: `POST /api/v1/orders/:id/cancel`

**実装箇所**: 未実装（要作成）

**リクエスト**:
```typescript
{
  reason?: string  // キャンセル理由
}

// Headers（同上）
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    order: {
      id: 123,
      status: "cancelled",
      updatedAt: "2025-10-02T10:40:00Z"
    }
  }
}
```

**ビジネスロジック**:
- ステータスが `delivered` または `completed` の場合はキャンセル不可
- キャンセル理由をログに記録
- 🆕 **キャンセル時も即座にログへコピー**（`archivedReason='cancelled'`）
- WebSocket通知（全関係者）

**実装状況**: ❌ 未実装

---

## 🔗 システム間連携

### hotel-saas → hotel-common

#### 認証ヘッダー

**すべてのAPIリクエストに付与**:
```typescript
headers: {
  'Authorization': `Bearer ${user.sessionId}`,  // セッションID
  'X-Tenant-ID': tenantId,                      // テナントID
  'Content-Type': 'application/json'
}
```

**実装例**（hotel-saas）:
```typescript
// hotel-saas/server/api/v1/admin/orders.get.ts (line 22-46)
export default defineEventHandler(async (event) => {
  const user = event.context.user
  const tenantId = event.context.tenant?.id || user.tenantId
  const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
  
  const response = await $fetch(`${hotelCommonApiUrl}/api/v1/admin/orders`, {
    headers: {
      'Authorization': `Bearer ${user.sessionId}`,  // 🔵 user.token も可（両方同じ値）
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json'
    },
    query: queryParams
  })
  
  return response
})
```

**📝 補足**: `event.context.user` には `sessionId` と `token` の両方が設定されており、同じ値を持ちます（`hotel-saas/server/middleware/01.admin-auth.ts` line 132-133）。どちらを使用しても問題ありませんが、`sessionId` を推奨します。

---

### hotel-common → hotel-pms（将来）

**料金計算・請求連携**:
```typescript
// 注文完了時にPMSへ通知
async function notifyPMSBilling(order: Order) {
  const pmsUrl = process.env.HOTEL_PMS_API_URL
  
  await $fetch(`${pmsUrl}/api/v1/billing/charge`, {
    method: 'POST',
    headers: {
      'X-Tenant-ID': order.tenantId,
      'Content-Type': 'application/json'
    },
    body: {
      sessionId: order.sessionId,
      roomNumber: order.roomId,
      amount: order.total,
      chargeType: 'room_service',
      items: order.items,
      orderId: order.id
    }
  })
}
```

---

## 💻 実装詳細

### hotel-saas（プロキシAPI）

#### ディレクトリ構成

```
/Users/kaneko/hotel-saas/
├── server/
│   └── api/
│       └── v1/
│           ├── orders/
│           │   ├── create.post.ts        ❌ 未作成（要実装）
│           │   ├── [id].get.ts          ❌ 未作成（要実装）
│           │   └── [id]/
│           │       ├── status.patch.ts  ❌ 未作成（要実装）
│           │       └── cancel.post.ts   ❌ 未作成（要実装）
│           └── admin/
│               ├── orders.get.ts         ✅ 実装済み
│               └── front-desk/
│                   └── room-orders.get.ts ✅ 実装済み
└── composables/
    └── useOrder.ts                        ❌ 未作成（要実装）
```

---

#### 実装済みAPI

##### 1. 注文一覧取得（管理画面）

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/orders.get.ts`

**重要な実装ポイント**:
```typescript
// line 6-9: セッション認証チェック
const user = event.context.user
if (!user) {
  throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
}

// line 22-24: テナントID取得（複数ソースから）
const headersIn = getRequestHeaders(event)
const tenantId = (headersIn['x-tenant-id'] as string) 
  || (event.context.tenant?.id as string) 
  || user.tenantId

// line 40-47: hotel-common への API呼び出し
const response = await $fetch(`${hotelCommonApiUrl}/api/v1/admin/orders`, {
  headers: {
    'Authorization': `Bearer ${user.sessionId}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId
  },
  query: queryParams
})
```

**エラーハンドリング**:
```typescript
// line 54-59: 接続エラー処理
if (error?.code === 'ECONNREFUSED') {
  throw createError({
    statusCode: 503,
    statusMessage: 'APIサーバーからのレスポンスがありません'
  })
}
```

---

##### 2. 部屋別注文取得

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/room-orders.get.ts`

**用途**: フロントデスク画面で特定の部屋の注文を表示

**実装**: 注文一覧APIと同様のプロキシパターン

---

#### 未実装API（要作成）

##### 1. 注文作成API

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/orders/create.post.ts`（新規作成）

**実装イメージ**:
```typescript
export default defineEventHandler(async (event) => {
  // 1. ボディ取得
  const body = await readBody(event)
  
  // 2. バリデーション
  if (!body.roomId || !Array.isArray(body.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request' })
  }
  
  // 3. テナントID取得
  const tenantId = event.context.tenantId || event.context.user?.tenantId
  
  // 4. hotel-common へ転送
  const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
  
  const response = await $fetch(`${hotelCommonApiUrl}/api/v1/orders`, {
    method: 'POST',
    headers: {
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json',
      // デバイス認証の場合はAuthorizationヘッダーなし
      ...(event.context.user && {
        'Authorization': `Bearer ${event.context.user.sessionId}`
      })
    },
    body
  })
  
  return response
})
```

---

##### 2. Composable: useOrder

**ファイル**: `/Users/kaneko/hotel-saas/composables/useOrder.ts`（新規作成）

**実装イメージ**:
```typescript
export const useOrder = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 注文作成
  const createOrder = async (data: {
    roomId: string
    items: Array<{
      menuItemId: number
      quantity: number
      notes?: string
    }>
    sessionId?: string
  }) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/v1/orders/create', {
        method: 'POST',
        body: data
      })
      
      return response.data.order
    } catch (e: any) {
      error.value = e.message || 'Failed to create order'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  // 注文取得
  const getOrder = async (orderId: number) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch(`/api/v1/orders/${orderId}`)
      return response.data.order
    } catch (e: any) {
      error.value = e.message || 'Failed to get order'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  // ステータス更新
  const updateStatus = async (orderId: number, status: string) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status }
      })
      
      return response.data.order
    } catch (e: any) {
      error.value = e.message || 'Failed to update status'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  return {
    loading,
    error,
    createOrder,
    getOrder,
    updateStatus
  }
}
```

---

### hotel-common（コアAPI）

#### ディレクトリ構成

```
/Users/kaneko/hotel-common/
└── src/
    └── routes/
        └── api/
            └── v1/
                ├── orders/
                │   ├── create.ts         ❌ 未作成（要実装）
                │   ├── [id].ts          ❌ 未作成（要実装）
                │   ├── [id]/
                │   │   ├── status.ts    ❌ 未作成（要実装）
                │   │   └── cancel.ts    ❌ 未作成（要実装）
                │   └── index.ts         ❌ 未作成（要実装）
                └── admin/
                    └── orders.ts         🚧 部分実装（要確認）
```

---

#### 未実装API（要作成）

##### 1. 注文作成API

**ファイル**: `/Users/kaneko/hotel-common/src/routes/api/v1/orders/create.ts`（新規作成）

**実装イメージ**:
```typescript
import { Router } from 'express'
import { prisma } from '../../../database/prisma'

const router = Router()

router.post('/orders', async (req, res) => {
  try {
    const { roomId, items, sessionId } = req.body
    const tenantId = req.headers['x-tenant-id'] as string
    
    // バリデーション
    if (!roomId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: roomId and items are required'
      })
    }
    
    // メニュー項目取得（価格・名称）
    const menuItemIds = items.map(item => item.menuItemId)
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        tenantId,
        isAvailable: true
      }
    })
    
    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some menu items not found or unavailable'
      })
    }
    
    // 合計金額計算
    let total = 0
    const orderItemsData = items.map(item => {
      const menuItem = menuItems.find(m => m.id === item.menuItemId)!
      const subtotal = Number(menuItem.price) * item.quantity
      total += subtotal
      
      return {
        tenantId,
        menuItemId: item.menuItemId,
        name: menuItem.name,
        price: Number(menuItem.price),
        quantity: item.quantity,
        notes: item.notes || null
      }
    })
    
    // トランザクション処理
    const order = await prisma.$transaction(async (tx) => {
      // 注文作成
      const newOrder = await tx.order.create({
        data: {
          tenantId,
          roomId,
          sessionId: sessionId || null,
          status: 'received',
          total,
          items: items, // JSON形式でスナップショット保存
          uuid: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        }
      })
      
      // 注文明細作成
      await tx.orderItem.createMany({
        data: orderItemsData.map(item => ({
          ...item,
          orderId: newOrder.id
        }))
      })
      
      // 注文明細を含めて返却
      return await tx.order.findUnique({
        where: { id: newOrder.id },
        include: { OrderItem: true }
      })
    })
    
    res.json({
      success: true,
      data: { order }
    })
    
  } catch (error) {
    console.error('注文作成エラー:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router
```

---

## 📋 既存実装状況

### ✅ 完全実装済み

| 項目 | ファイル | システム |
|------|---------|---------|
| 注文一覧取得API | `hotel-saas/server/api/v1/admin/orders.get.ts` | hotel-saas |
| 部屋別注文取得API | `hotel-saas/server/api/v1/admin/front-desk/room-orders.get.ts` | hotel-saas |
| データベーステーブル | `hotel-common/prisma/schema.prisma` | hotel-common |

### 🚧 部分実装

| 項目 | ファイル | 状態 |
|------|---------|------|
| 注文管理API（管理画面） | `hotel-common/src/routes/api/v1/admin/orders.ts` | 要確認 |

### ❌ 未実装

| 項目 | 優先度 | 実装必要ファイル |
|------|--------|----------------|
| 注文作成API | 🔴 最高 | hotel-common + hotel-saas |
| 注文取得API（単体） | 🔴 最高 | hotel-common + hotel-saas |
| ステータス更新API | 🔴 最高 | hotel-common + hotel-saas |
| 注文キャンセルAPI | 🟡 高 | hotel-common + hotel-saas |
| useOrder composable | 🔴 最高 | hotel-saas |
| リアルタイム通知 | 🟢 中 | hotel-common (WebSocket) |
| オフライン対応 | 🟢 中 | hotel-saas (IndexedDB) |

---

## 🔐 セキュリティ

### テナント分離

**必須チェック**:
- すべてのクエリに `tenantId` フィルタ
- `X-Tenant-ID` ヘッダーの検証
- Prisma拡張による自動フィルタリング

**実装例**:
```typescript
// hotel-common
const orders = await prisma.order.findMany({
  where: {
    tenantId,        // 必須
    isDeleted: false
  }
})
```

---

### 認証

**スタッフ（管理画面）**:
- Session認証（Redis + HttpOnly Cookie）
- `Authorization: Bearer {sessionId}` ヘッダー

**ゲスト（客室端末）**:
- デバイス認証（IP/MAC）
- `Authorization` ヘッダー不要

---

### バリデーション

**注文作成時**:
1. メニュー項目の存在確認
2. メニュー項目の提供可能性チェック（`isAvailable`）
3. 価格の整合性チェック
4. テナントIDの一致確認

---

## 📊 パフォーマンス

### データベースインデックス

**🆕 運用テーブル（orders）**:
```sql
-- 基本インデックス
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_session_id ON orders(session_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 🆕 進行中注文の高速検索（部分インデックス）
CREATE INDEX idx_orders_active ON orders(tenant_id, status)
  WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled');

-- 🆕 バッチ削除用（部分インデックス）
CREATE INDEX idx_orders_cleanup ON orders(completed_at)
  WHERE is_deleted = false AND status IN ('completed', 'cancelled');
```

**🆕 ログテーブル（order_logs）**:
```sql
-- 履歴検索用
CREATE INDEX idx_order_logs_tenant_date ON order_logs(tenant_id, created_at DESC);
CREATE INDEX idx_order_logs_original ON order_logs(original_id);
CREATE INDEX idx_order_logs_session ON order_logs(session_id);
```

**order_items / order_item_logs**:
```sql
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_tenant_id ON order_items(tenant_id);

CREATE INDEX idx_order_item_logs_order ON order_item_logs(order_id);
CREATE INDEX idx_order_item_logs_tenant ON order_item_logs(tenant_id);
```

---

### ページネーション

**デフォルト値**:
- `limit`: 50
- `offset`: 0

**最大値**:
- `limit`: 100（超過した場合は100に制限）

---

## 📋 実装チェックリスト

### Phase 0: データベースマイグレーション（必須）

#### hotel-common
- [ ] `order_logs` テーブル作成（月次パーティション対応）
- [ ] `order_item_logs` テーブル作成
- [ ] `orders.completed_at` カラム追加
- [ ] 部分インデックス作成（`idx_orders_active`, `idx_orders_cleanup`）
- [ ] 次月パーティション作成スクリプト（`scripts/create-partitions.sql`）
- [ ] バッチ削除スクリプト作成（`src/batch/cleanup-orders.ts`）
- [ ] PM2設定追加（毎時実行）

---

### Phase 1: コアAPI実装（Week 1）

#### hotel-common
- [ ] 注文作成API実装（`POST /api/v1/orders`）
- [ ] 注文取得API実装（`GET /api/v1/orders/:id`）
  - [ ] 運用テーブル → ログテーブルのフォールバック検索
- [ ] ステータス更新API実装（`PATCH /api/v1/orders/:id/status`）
  - [ ] 完了/キャンセル時の自動ログ移行
- [ ] 注文キャンセルAPI実装（`POST /api/v1/orders/:id/cancel`）
  - [ ] キャンセル時の自動ログ移行
- [ ] 🆕 注文履歴取得API実装（`GET /api/v1/admin/orders/history`）
- [ ] 🆕 `completeOrder()` サービス関数（ログ移行ロジック）
- [ ] バリデーション・エラーハンドリング

#### hotel-saas
- [ ] プロキシAPI実装（上記6つのエンドポイント）
- [ ] `useOrder` composable実装
- [ ] 🆕 注文一覧APIのデフォルトフィルタ修正

---

### Phase 2: フロントエンド統合（Week 2）

- [ ] 注文作成フォーム実装
- [ ] 注文ステータス表示UI
- [ ] 注文履歴画面
- [ ] リアルタイム更新（Polling）

---

### Phase 3: 運用監視（Week 3）

- [ ] 🆕 運用テーブルサイズ監視アラート
- [ ] 🆕 ログ移行漏れチェックスクリプト
- [ ] 🆕 パーティション容量監視
- [ ] 🆕 日次レポート（注文統計）

---

### Phase 4: 高度な機能（Week 4-5）

- [ ] WebSocket実装（リアルタイム通知）
- [ ] オフライン対応（IndexedDB）
- [ ] hotel-pms連携（料金計算）
- [ ] 🆕 AI用マテリアライズドビュー作成
  - [ ] `ai_order_patterns`（需要予測用）
  - [ ] `ai_menu_recommendations`（メニュー推薦用）
- [ ] 統計・レポート機能

---

## 🌐 多言語対応

### 概要

注文管理システムは**ゲスト向け機能**として、15言語対応が必須です。注文は「スナップショット」として保存されるため、注文時のメニュー名を全言語で記録します。

**重要**: 既存の注文データとの**完全な後方互換性**を保証します。

**対象範囲**:
- ✅ 注文内メニュー名（全15言語のスナップショット）
- ✅ 注文明細のメニュー名（全15言語のスナップショット）
- ✅ ゲストメモ・特記事項（将来的に翻訳）
- ✅ 管理画面UIテキスト（@nuxtjs/i18n）

**参照SSOT**:
- [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md) - 多言語化基盤
- [SSOT_SAAS_MENU_MANAGEMENT.md](./SSOT_SAAS_MENU_MANAGEMENT.md) - メニュー管理（翻訳元）

---

### 対象フィールド

| エンティティ | フィールド | 翻訳方法 | 後方互換性 |
|------------|-----------|---------|-----------|
| **Order** | `items[].name` | スナップショット（オプション） | ✅ 既存データそのまま動作 |
| **OrderItem** | `name` | デフォルト名（変更なし） | ✅ 既存カラム維持 |
| **OrderItem** | `translations` | 🆕 新規カラム（JSONB、NULL許容） | ✅ 既存データは NULL |
| **OrderItemLog** | `translations` | 🆕 新規カラム（JSONB、NULL許容） | ✅ 既存ログは NULL |

---

### データベース設計

#### OrderItem テーブルの拡張

**既存モデル（v2.1.0）**: 変更なし

```prisma
model OrderItem {
  id          Int       @id @default(autoincrement())
  tenantId    String
  orderId     Int
  menuItemId  Int
  name        String    // ← 既存のまま（デフォルト名）
  price       Int
  quantity    Int
  status      String    @default("pending")
  notes       String?
  deliveredAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime
  deleted_at  DateTime?
  deleted_by  String?
  is_deleted  Boolean   @default(false)
  
  Order       Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([tenantId])
  @@index([status])
  @@index([is_deleted])
  @@map("order_items")
}
```

**多言語対応版（v3.0.0）**: `translations`カラムのみ追加

```prisma
model OrderItem {
  id          Int       @id @default(autoincrement())
  tenantId    String
  orderId     Int
  menuItemId  Int
  name        String    // ← 既存のまま（デフォルト名、必須）
  translations Json?    // 🆕 追加（NULL許容）
  price       Int
  quantity    Int
  status      String    @default("pending")
  notes       String?
  deliveredAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime
  deleted_at  DateTime?
  deleted_by  String?
  is_deleted  Boolean   @default(false)
  
  Order       Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([tenantId])
  @@index([status])
  @@index([is_deleted])
  @@map("order_items")
}
```

**translations JSON構造**:
```json
{
  "ja": "ハンバーグステーキ",
  "en": "Hamburger Steak",
  "zh-CN": "汉堡牛排",
  "zh-TW": "漢堡牛排",
  "ko": "햄버거 스테이크",
  "th": "สเต็กแฮมเบอร์เกอร์",
  "vi": "Bít tết hamburger",
  "id": "Steak Hamburger",
  "fr": "Steak haché",
  "de": "Hacksteak",
  "es": "Bistec de hamburguesa",
  "it": "Bistecca di hamburger",
  "pt": "Bife de hambúrguer",
  "ru": "Бифштекс",
  "ar": "شريحة هامبرجر"
}
```

**PostgreSQL DDL**:
```sql
-- マイグレーション（非破壊的）
ALTER TABLE order_items 
ADD COLUMN translations JSONB;

-- インデックス（オプション）
CREATE INDEX idx_order_items_translations 
ON order_items USING GIN (translations);
```

---

#### Order.items JSON構造の拡張

**既存データ（v2.1.0）**: 変更なし

```json
{
  "menuItemId": 1,
  "name": "ハンバーグステーキ",
  "price": 1200,
  "quantity": 2,
  "notes": "温かい状態で"
}
```

**新規データ（v3.0.0以降）**: `translations`オプション追加

```json
{
  "menuItemId": 1,
  "name": "ハンバーグステーキ",
  "translations": {
    "ja": "ハンバーグステーキ",
    "en": "Hamburger Steak",
    "zh-CN": "汉堡牛排",
    "zh-TW": "漢堡牛排",
    "ko": "햄버거 스테이크",
    "th": "สเต็กแฮมเบอร์เกอร์",
    "vi": "Bít tết hamburger",
    "id": "Steak Hamburger",
    "fr": "Steak haché",
    "de": "Hacksteak",
    "es": "Bistec de hamburguesa",
    "it": "Bistecca di hamburger",
    "pt": "Bife de hambúrguer",
    "ru": "Бифштекс",
    "ar": "شريحة هامبرجر"
  },
  "price": 1200,
  "quantity": 2,
  "notes": "温かい状態で"
}
```

**注**: `name`フィールドは後方互換性のため**必須**

---

#### OrderItemLog テーブルの拡張

**多言語対応版（v3.0.0）**:

```prisma
model OrderItemLog {
  logId       BigInt    @id @default(autoincrement()) @map("log_id")
  originalId  Int       @map("original_id")
  orderId     Int       @map("order_id")
  tenantId    String    @map("tenant_id")
  menuItemId  Int       @map("menu_item_id")
  name        String    // ← 既存のまま
  translations Json?    // 🆕 追加（NULL許容）
  price       Int
  quantity    Int
  status      String
  notes       String?
  deliveredAt DateTime? @map("delivered_at")
  createdAt   DateTime  @map("created_at")
  updatedAt   DateTime  @map("updated_at")
  archivedAt  DateTime  @default(now()) @map("archived_at")
  
  @@index([orderId], map: "idx_order_item_logs_order")
  @@index([tenantId], map: "idx_order_item_logs_tenant")
  @@map("order_item_logs")
}
```

**PostgreSQL DDL**:
```sql
-- マイグレーション（非破壊的）
ALTER TABLE order_item_logs 
ADD COLUMN translations JSONB;

-- インデックス（オプション）
CREATE INDEX idx_order_item_logs_translations 
ON order_item_logs USING GIN (translations);
```

---

### API仕様の拡張（後方互換性保証）

#### 1. 注文取得API（GET /api/v1/orders/:id）

**既存API（v2.1.0）**: 変更なし

```http
GET /api/v1/orders/123
```

**レスポンス（既存データ）**:
```typescript
{
  success: true,
  data: {
    order: {
      id: 123,
      items: [
        {
          menuItemId: 1,
          name: "ハンバーグステーキ",  // ← 既存データそのまま
          price: 1200,
          quantity: 2
        }
      ],
      OrderItem: [
        {
          id: 456,
          name: "ハンバーグステーキ",  // ← 既存データそのまま
          translations: null,  // ← 既存データは NULL
          price: 1200,
          quantity: 2
        }
      ]
    }
  }
}
```

**拡張API（v3.0.0）**: `?lang=`パラメータ追加

```http
GET /api/v1/orders/123?lang=en
```

**レスポンス（言語フィルタ適用）**:
```typescript
{
  success: true,
  data: {
    order: {
      id: 123,
      items: [
        {
          menuItemId: 1,
          name: "Hamburger Steak",  // ← 翻訳適用
          price: 1200,
          quantity: 2
        }
      ],
      OrderItem: [
        {
          id: 456,
          name: "Hamburger Steak",  // ← 翻訳適用
          translations: {
            "ja": "ハンバーグステーキ",
            "en": "Hamburger Steak",
            "ko": "햄버거 스테이크"
          },
          price: 1200,
          quantity: 2
        }
      ]
    }
  }
}
```

**実装ロジック（後方互換性保証）**:
```typescript
// hotel-common/src/routes/api/v1/orders/[id].ts
const lang = req.query.lang as string || 'ja'

const order = await prisma.order.findUnique({
  where: { id: orderId, tenantId },
  include: { OrderItem: true }
})

// Order.items の翻訳適用（既存データ対応）
order.items = order.items.map(item => {
  // 新データ（translationsあり）
  if (item.translations && typeof item.translations === 'object') {
    return {
      ...item,
      name: item.translations[lang] || item.name  // フォールバック
    }
  }
  
  // 既存データ（translationsなし）
  return item  // そのまま返す
})

// OrderItem の翻訳適用（既存データ対応）
order.OrderItem = order.OrderItem.map(item => {
  // translations カラムがあり、かつ NULL でない
  if (item.translations && typeof item.translations === 'object') {
    return {
      ...item,
      name: item.translations[lang] || item.name  // フォールバック
    }
  }
  
  // 既存データ（translations が NULL）
  return item  // そのまま返す
})
```

---

### 実装フロー

#### Phase 1: メニュー翻訳との連携

**前提**: [SSOT_SAAS_MENU_MANAGEMENT.md](./SSOT_SAAS_MENU_MANAGEMENT.md) で既にメニュー翻訳が完了している

**注文作成時の処理**:
```typescript
// hotel-common/src/routes/api/v1/orders/create.ts

// 1. メニュー項目取得（翻訳含む）
const menuItems = await prisma.menuItem.findMany({
  where: {
    id: { in: menuItemIds },
    tenantId,
    isAvailable: true
  },
  select: {
    id: true,
    name: true,        // デフォルト名（日本語）
    price: true
  }
})

// 2. 各メニューの翻訳を取得
const menuTranslations = await Promise.all(
  menuItems.map(async (menuItem) => {
    const translations = await prisma.translation.findMany({
      where: {
        entityType: 'menu_item',
        entityId: String(menuItem.id),
        field: 'name'
      }
    })
    
    // 言語コード => 翻訳文字列のマップ
    const translationMap = translations.reduce((acc, t) => {
      acc[t.languageCode] = t.translatedText
      return acc
    }, {} as Record<string, string>)
    
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      translations: Object.keys(translationMap).length > 0 ? translationMap : null,
      price: menuItem.price
    }
  })
)

// 3. 注文作成（translationsを含める）
const order = await prisma.$transaction(async (tx) => {
  const newOrder = await tx.order.create({
    data: {
      tenantId,
      roomId,
      sessionId,
      status: 'received',
      total,
      items: items.map(item => {
        const menuData = menuTranslations.find(m => m.menuItemId === item.menuItemId)!
        return {
          menuItemId: item.menuItemId,
          name: menuData.name,
          ...(menuData.translations && { translations: menuData.translations }),  // ← オプション
          price: menuData.price,
          quantity: item.quantity,
          notes: item.notes
        }
      })
    }
  })
  
  // 4. OrderItem作成（translationsを含める）
  await tx.orderItem.createMany({
    data: items.map(item => {
      const menuData = menuTranslations.find(m => m.menuItemId === item.menuItemId)!
      return {
        tenantId,
        orderId: newOrder.id,
        menuItemId: item.menuItemId,
        name: menuData.name,
        translations: menuData.translations,  // ← NULL許容
        price: menuData.price,
        quantity: item.quantity,
        notes: item.notes
      }
    })
  })
  
  return await tx.order.findUnique({
    where: { id: newOrder.id },
    include: { OrderItem: true }
  })
})
```

---

#### Phase 2: ログ移行時の翻訳保持

**注文完了処理**:
```typescript
// hotel-common/src/services/order.service.ts

export async function completeOrder(orderId: number, tenantId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. 注文取得（翻訳含む）
    const order = await tx.order.findUnique({
      where: { id: orderId, tenantId },
      include: { OrderItem: true }
    })
    
    // 2. ログテーブルへコピー（translationsも含む）
    await tx.orderLog.create({
      data: {
        originalId: order.id,
        tenantId: order.tenantId,
        roomId: order.roomId,
        status: order.status,
        items: order.items,  // ← translationsを含むJSON
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        completedAt: order.completedAt,
        paidAt: order.paidAt,
        sessionId: order.sessionId,
        uuid: order.uuid,
        archivedAt: new Date(),
        archivedReason: 'completed'
      }
    })
    
    // 3. 注文明細ログ（translationsも含む）
    await tx.orderItemLog.createMany({
      data: order.OrderItem.map(item => ({
        originalId: item.id,
        orderId: order.id,
        tenantId: item.tenantId,
        menuItemId: item.menuItemId,
        name: item.name,
        translations: item.translations,  // 🆕
        price: item.price,
        quantity: item.quantity,
        status: item.status,
        notes: item.notes,
        deliveredAt: item.deliveredAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        archivedAt: new Date()
      }))
    })
    
    // 4. 完了状態に更新
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'completed', completedAt: new Date() }
    })
    
    return order
  })
}
```

---

### フロントエンド実装

#### 注文履歴表示（ゲスト端末）

**コンポーネント例**:
```vue
<template>
  <div class="order-history">
    <h2>{{ $t('order.history.title') }}</h2>
    
    <!-- 言語切り替え -->
    <select v-model="selectedLang" @change="fetchOrders">
      <option value="ja">日本語</option>
      <option value="en">English</option>
      <option value="ko">한국어</option>
      <option value="zh-CN">简体中文</option>
      <option value="zh-TW">繁體中文</option>
      <!-- ... 他の言語 -->
    </select>
    
    <!-- 注文リスト -->
    <div v-for="order in orders" :key="order.id" class="order-card">
      <div class="order-header">
        <span>{{ $t('order.number') }}: {{ order.id }}</span>
        <span>{{ formatDate(order.createdAt) }}</span>
      </div>
      
      <div class="order-items">
        <div v-for="item in order.OrderItem" :key="item.id" class="order-item">
          <!-- 選択言語のメニュー名を表示 -->
          <span class="item-name">{{ item.name }}</span>
          <span class="item-quantity">× {{ item.quantity }}</span>
          <span class="item-price">¥{{ item.price * item.quantity }}</span>
        </div>
      </div>
      
      <div class="order-total">
        <span>{{ $t('order.total') }}</span>
        <span>¥{{ order.total }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const selectedLang = ref('ja')
const orders = ref([])

const fetchOrders = async () => {
  const response = await $fetch('/api/v1/orders/history', {
    query: { lang: selectedLang.value }
  })
  orders.value = response.data.orders
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString(selectedLang.value)
}

onMounted(() => fetchOrders())
</script>

<style scoped>
.order-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.order-total {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid #333;
}
</style>
```

---

### マイグレーション計画（段階的移行）

#### Phase 1: データベース準備（Week 1）

- [ ] `order_items.translations` カラム追加（JSONB、NULL許容）
- [ ] `order_item_logs.translations` カラム追加（JSONB、NULL許容）
- [ ] GINインデックス作成
- [ ] **既存データは一切変更しない**

#### Phase 2: API拡張（Week 2）

- [ ] 注文作成時の翻訳取得ロジック追加
- [ ] `OrderItem.translations` 保存（NULL許容）
- [ ] 注文取得APIの `?lang=` 対応
- [ ] **既存APIの動作を保証**

#### Phase 3: ログ移行処理拡張（Week 3）

- [ ] `completeOrder()` で `translations` 保持
- [ ] `cancelOrder()` で `translations` 保持
- [ ] バッチ処理確認

#### Phase 4: フロントエンド対応（Week 3-4）

- [ ] 注文履歴画面の多言語対応
- [ ] 言語切り替えUI
- [ ] 管理画面UIテキスト（@nuxtjs/i18n）

#### Phase 5: 既存データの段階的移行（Week 4以降、オプション）

- [ ] バッチ処理で既存注文の翻訳を補完（過去7日分）
- [ ] 統計・レポート用の翻訳補完
- [ ] **注**: 既存データ移行は任意、未移行でも動作保証

---

### フォールバック戦略

```typescript
/**
 * 翻訳取得の優先順位
 * 1. 指定言語の翻訳
 * 2. 英語フォールバック
 * 3. 日本語フォールバック
 * 4. デフォルト名
 */
function getTranslatedName(item: OrderItem, lang: string): string {
  // 0. translations カラムチェック
  if (!item.translations || typeof item.translations !== 'object') {
    return item.name  // 既存データ（translationsなし）
  }
  
  // 1. 指定言語の翻訳
  if (item.translations[lang]) {
    return item.translations[lang]
  }
  
  // 2. 英語フォールバック
  if (lang !== 'en' && item.translations['en']) {
    return item.translations['en']
  }
  
  // 3. 日本語フォールバック
  if (lang !== 'ja' && item.translations['ja']) {
    return item.translations['ja']
  }
  
  // 4. デフォルト名
  return item.name
}
```

---

### 後方互換性テスト

#### テストケース1: 既存データの読み取り

```typescript
// 既存注文（translations = NULL）
const order = await prisma.order.findUnique({ 
  where: { id: 1 },
  include: { OrderItem: true }
})

// 期待結果: エラーなく取得、name はそのまま
expect(order.OrderItem[0].name).toBe('ハンバーグステーキ')
expect(order.OrderItem[0].translations).toBeNull()
```

#### テストケース2: 新規データの読み取り

```typescript
// 新規注文（translations あり）
const order = await prisma.order.findUnique({ 
  where: { id: 100 },
  include: { OrderItem: true }
})

// 期待結果: translations 含む
expect(order.OrderItem[0].translations).toHaveProperty('en')
expect(order.OrderItem[0].translations.en).toBe('Hamburger Steak')
```

#### テストケース3: 言語フィルタ適用

```typescript
// 既存データに対して ?lang=en で取得
const response1 = await $fetch('/api/v1/orders/1?lang=en')
// 期待: デフォルト名（translationsなし）
expect(response1.data.order.OrderItem[0].name).toBe('ハンバーグステーキ')

// 新規データに対して ?lang=en で取得
const response2 = await $fetch('/api/v1/orders/100?lang=en')
// 期待: 英語翻訳
expect(response2.data.order.OrderItem[0].name).toBe('Hamburger Steak')
```

#### テストケース4: ログ移行の整合性

```typescript
// 注文完了処理
await completeOrder(100, 'tenant-1')

// OrderLog確認
const orderLog = await prisma.orderLog.findFirst({
  where: { originalId: 100 }
})

// 期待: items JSON に translations 含む
expect(orderLog.items[0].translations).toHaveProperty('en')

// OrderItemLog確認
const itemLogs = await prisma.orderItemLog.findMany({
  where: { orderId: 100 }
})

// 期待: translations カラムに翻訳データ
expect(itemLogs[0].translations).toHaveProperty('en')
```

---

### 影響範囲（最小化）

| 影響対象 | 変更内容 | 影響度 | 後方互換性 |
|---------|---------|-------|-----------|
| **order_items** | `translations JSONB` カラム追加 | 🟡 中 | ✅ 既存データ動作 |
| **order_item_logs** | `translations JSONB` カラム追加 | 🟡 中 | ✅ 既存ログ動作 |
| **hotel-common API** | 注文作成・取得・完了処理の拡張 | 🟡 中 | ✅ 既存API保証 |
| **hotel-saas プロキシ** | `?lang=` パラメータ追加 | 🟢 低 | ✅ オプションパラメータ |
| **hotel-saas UI** | 注文履歴画面の多言語対応 | 🟡 中 | ✅ 既存UI動作 |
| **Order.items JSON** | `translations` オプション追加 | 🟢 低 | ✅ 既存構造維持 |

---

### 実装チェックリスト

#### データベース（Phase 1）

- [ ] `order_items.translations JSONB` カラム追加（NULL許容）
- [ ] `order_item_logs.translations JSONB` カラム追加（NULL許容）
- [ ] GINインデックス作成
- [ ] マイグレーションスクリプト作成
- [ ] **既存データが正常に動作することを確認**

#### hotel-common（Phase 2-3）

- [ ] 注文作成時のメニュー翻訳取得（メニュー管理SSOT連携）
- [ ] `OrderItem.translations` 保存（NULL許容）
- [ ] `Order.items[].translations` 保存（オプション）
- [ ] 注文取得APIの `?lang=` 対応
- [ ] 既存データのフォールバック処理
- [ ] ログ移行時の `translations` 保持
- [ ] バリデーション・エラーハンドリング

#### hotel-saas（Phase 2-4）

- [ ] プロキシAPIの `?lang=` パラメータ転送
- [ ] 注文履歴画面の言語切り替えUI
- [ ] 注文履歴の多言語表示
- [ ] 管理画面UIテキスト多言語化（@nuxtjs/i18n）
- [ ] **既存機能が正常に動作することを確認**

#### テスト（Phase 2-4）

- [ ] 既存データの読み取りテスト
- [ ] 新規データの作成・読み取りテスト
- [ ] 言語フィルタのテスト
- [ ] フォールバック処理のテスト
- [ ] ログ移行のテスト
- [ ] 後方互換性テスト
- [ ] パフォーマンステスト（JSONB検索）

---

### 注意事項

#### ✅ やるべきこと

- **既存カラム・構造を一切変更しない**
- **translations カラムは NULL許容**
- **既存APIの動作を保証する**
- **段階的移行を推奨する**
- **フォールバック戦略を実装する**
- **メニュー管理SSOTとの連携を確保する**

#### ❌ やってはいけないこと

- 既存の `name` フィールドを削除する
- 既存のPrismaモデル定義を変更する（`@map`追加等）
- 既存の注文データを強制的に変換する
- 既存APIのレスポンス構造を破壊する
- `translations`を必須カラムにする
- 後方互換性を損なう変更

---

### パフォーマンス考慮事項

#### JSONB検索の最適化

```sql
-- GINインデックスによる高速検索
CREATE INDEX idx_order_items_translations 
ON order_items USING GIN (translations);

-- 特定言語の翻訳存在チェック（高速）
SELECT * FROM order_items 
WHERE translations ? 'en';

-- 特定言語の翻訳値検索（高速）
SELECT * FROM order_items 
WHERE translations->>'en' = 'Hamburger Steak';
```

#### キャッシュ戦略

- 注文データは短命（24時間で削除）のため、キャッシュ不要
- ログデータは読み取り専用のため、CDNキャッシュ可能

---

## 🔗 関連SSOT

- [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md) - 多言語化基盤
- [SSOT_SAAS_MENU_MANAGEMENT.md](./SSOT_SAAS_MENU_MANAGEMENT.md) - メニュー管理（翻訳元）
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-10 | 3.0.0 | **多言語対応追加**<br>- `OrderItem.translations` カラム追加（JSONB、NULL許容）<br>- `OrderItemLog.translations` カラム追加（JSONB、NULL許容）<br>- `Order.items[].translations` オプション追加<br>- 注文取得APIの `?lang=` パラメータ対応<br>- 完全な後方互換性保証<br>- 段階的移行計画を明記<br>- フォールバック戦略実装 | AI |
| 2025-10-04 | 2.1.0 | **管理画面専用に特化**<br>- 客室端末関連の記述を削除<br>- アーキテクチャ図を管理画面用に変更<br>- ゲスト機能は`02_guest_features/`へ分離 | AI |
| 2025-10-03 | 2.0.0 | 運用/ログ二重管理アーキテクチャを全面適用。`order_logs`テーブル追加、自動アーカイブ処理、バッチ削除、パーティショニング戦略を追加 | AI |
| 2025-10-02 | 1.0.0 | 初版作成 | AI |

---

**以上、SSOT: 注文管理システム（v3.0.0）**

