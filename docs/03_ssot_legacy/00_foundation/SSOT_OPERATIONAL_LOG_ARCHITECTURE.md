# SSOT: 運用/ログ二重管理アーキテクチャ

**作成日**: 2025-10-03  
**バージョン**: 1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（全システム共通基盤）

**関連SSOT**:
- [SSOT_SAAS_DATABASE_SCHEMA.md](./SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ統一
- [SSOT_SAAS_ORDER_MANAGEMENT.md](../01_core_features/SSOT_SAAS_ORDER_MANAGEMENT.md) - 注文管理
- [SSOT_DATABASE_MIGRATION_OPERATION.md](./SSOT_DATABASE_MIGRATION_OPERATION.md) - DBマイグレーション運用

---

## 📋 目次

1. [概要](#概要)
2. [設計原則](#設計原則)
3. [アーキテクチャパターン](#アーキテクチャパターン)
4. [対象データ種別](#対象データ種別)
5. [テーブル設計方針](#テーブル設計方針)
6. [データ移行戦略](#データ移行戦略)
7. [AI用データ参照ルール](#ai用データ参照ルール)
8. [実装ガイドライン](#実装ガイドライン)
9. [運用手順](#運用手順)

---

## 📖 概要

### 目的

ホテル管理システムにおいて、**即時レスポンスが必要な運用データ**と**完全な履歴保持が必要なログデータ**を分離管理し、パフォーマンスとデータ保全の両立を実現する。

### 基本方針

1. **運用データ**: 現在進行中のデータのみを保持（高速アクセス優先）
2. **ログデータ**: 全履歴を永続保存（完全性優先）
3. **自動移行**: 完了/終了時に運用→ログへ自動移行
4. **AI用データ**: ログデータから最適化された形式で提供

---

## 🎯 設計原則

### 原則1: データの二重管理

**すべての時系列データは以下2つのテーブルで管理**:

```
運用テーブル（Active）:
- 現在進行中のデータのみ
- 即時レスポンス要求
- 定期的にクリーンアップ

ログテーブル（Archive/History）:
- 完了・終了したデータすべて
- 完全な履歴保持
- 年次・月次パーティション
```

---

### 原則2: 自動移行

**ステータス変更時に自動的にログへコピー**:

```typescript
// 注文完了時の処理例
async function completeOrder(orderId: number) {
  await prisma.$transaction(async (tx) => {
    // 1. ステータス更新
    const order = await tx.order.update({
      where: { id: orderId },
      data: { status: 'completed', completedAt: new Date() }
    })
    
    // 2. ログテーブルへコピー（即座）
    await tx.orderLog.create({
      data: {
        ...order,
        originalId: order.id,
        archivedAt: new Date()
      }
    })
    
    // 3. 運用テーブルから削除は**バッチ処理で実行**
    // （トランザクション完了後、非同期で）
  })
}
```

---

### 原則3: パーティショニング

**ログテーブルは月次パーティション**:

```sql
-- PostgreSQLパーティショニング（推奨）
CREATE TABLE order_logs (
  ...
) PARTITION BY RANGE (created_at);

CREATE TABLE order_logs_2025_10 PARTITION OF order_logs
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE order_logs_2025_11 PARTITION OF order_logs
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

---

### 原則4: AI用データ最適化

**AIは専用ビュー/集計テーブルを参照**:

```sql
-- AI用集約ビュー（日次更新）
CREATE MATERIALIZED VIEW ai_order_insights AS
SELECT 
  DATE(created_at) as order_date,
  tenant_id,
  COUNT(*) as total_orders,
  AVG(total) as avg_order_value,
  jsonb_agg(items) as popular_items,
  jsonb_object_agg(status, count) as status_distribution
FROM order_logs
WHERE created_at >= NOW() - INTERVAL '2 years'  -- 2年分のみ
GROUP BY DATE(created_at), tenant_id;
```

**理由**:
- ✅ レスポンス速度維持（事前集計）
- ✅ 精度確保（2年分のデータで十分）
- ✅ ログテーブルへの負荷軽減

---

## 🏗️ アーキテクチャパターン

### パターン1: 運用/ログ分離

```
┌─────────────────────────────────────────────────────┐
│                   アプリケーション                      │
└───────────┬─────────────────────────┬───────────────┘
            │                         │
    ┌───────▼────────┐        ┌──────▼──────┐
    │  運用テーブル   │        │ ログテーブル │
    │  (Active)      │        │ (Archive)   │
    ├────────────────┤        ├─────────────┤
    │ 進行中データ   │◄──移行──│ 完了データ  │
    │ 高速アクセス   │        │ 完全履歴    │
    │ 小容量         │        │ 大容量      │
    └────────────────┘        └─────────────┘
           │                         │
           └──────────┬──────────────┘
                      │
              ┌───────▼────────┐
              │  AI用ビュー     │
              │ (Materialized) │
              ├────────────────┤
              │ 最適化データ   │
              │ 定期更新       │
              └────────────────┘
```

---

### パターン2: データフロー

```
[1] データ作成
    ↓
[運用テーブル] ← フロントエンド参照（即時）
    ↓ (ステータス変化時)
[ログテーブルへコピー] ← 即座実行
    ↓ (完了後N時間)
[運用テーブルから削除] ← バッチ処理
    ↓ (日次)
[AI用ビュー更新] ← REFRESH MATERIALIZED VIEW
    ↓ (月次)
[パーティション追加/削除] ← 保持期間管理
```

---

## 📊 対象データ種別

### 🔴 最優先（即座実装）

| データ種別 | 運用テーブル | ログテーブル | 移行トリガー | 保持期間（運用） | 保持期間（ログ） |
|----------|------------|------------|------------|----------------|----------------|
| **注文** | `orders` | `order_logs` | `status='completed'` または `'cancelled'` | 24時間 | 永久 |
| **注文明細** | `order_items` | `order_item_logs` | 親注文の完了 | 24時間 | 永久 |
| **チェックインセッション** | `checkin_sessions` | `checkin_session_logs` | `status='CHECKED_OUT'` | チェックアウト後7日 | 永久 |

---

### 🟡 高優先（Phase 2）

| データ種別 | 運用テーブル | ログテーブル | 移行トリガー | 保持期間（運用） | 保持期間（ログ） |
|----------|------------|------------|------------|----------------|----------------|
| **デバイスアクセス** | `device_access_logs` | `device_access_archive` | アクセスから30日 | 30日 | 永久 |
| **スタッフアクション** | `staff_actions` | `staff_action_logs` | 実行から90日 | 90日 | 永久 |
| **在庫変動** | `inventory_transactions` | `inventory_history` | 月次締め | 当月+前月 | 永久 |

---

### 🟢 中優先（Phase 3）

| データ種別 | 運用テーブル | ログテーブル | 移行トリガー | 保持期間（運用） | 保持期間（ログ） |
|----------|------------|------------|------------|----------------|----------------|
| **料金計算履歴** | `billing_calculations` | `billing_history` | 請求確定 | 請求後30日 | 7年（税法対応） |
| **エラーログ** | `error_logs` | `error_archive` | 発生から7日 | 7日 | 1年 |

---

## 🗄️ テーブル設計方針

### 1. 注文管理（Order）

#### 運用テーブル: `orders`

```sql
CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  room_id         TEXT NOT NULL,
  session_id      TEXT,
  status          TEXT DEFAULT 'received',
  total           INTEGER NOT NULL,
  items           JSONB NOT NULL,
  
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP,  -- 完了時刻（移行判定用）
  
  -- 論理削除（バッチ処理前の一時的なフラグ）
  is_deleted      BOOLEAN DEFAULT false,
  deleted_at      TIMESTAMP,
  
  CONSTRAINT fk_orders_session FOREIGN KEY (session_id) 
    REFERENCES checkin_sessions(id)
);

-- インデックス（高速アクセス特化）
CREATE INDEX idx_orders_active ON orders(tenant_id, status) 
  WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled');

CREATE INDEX idx_orders_session ON orders(session_id) 
  WHERE is_deleted = false;

CREATE INDEX idx_orders_cleanup ON orders(completed_at) 
  WHERE is_deleted = false AND status IN ('completed', 'cancelled');
```

**運用ルール**:
- ✅ `status IN ('received', 'preparing', 'ready', 'delivering', 'delivered')` のみ保持
- ✅ `completed` / `cancelled` は24時間後にバッチ削除
- ✅ 平均保持件数: 50-100件/テナント

---

#### ログテーブル: `order_logs`

```sql
CREATE TABLE order_logs (
  log_id          BIGSERIAL,  -- ログ専用ID
  original_id     INTEGER NOT NULL,  -- 元のorders.id
  tenant_id       TEXT NOT NULL,
  room_id         TEXT NOT NULL,
  session_id      TEXT,
  status          TEXT,
  total           INTEGER,
  items           JSONB,
  
  -- 元データのタイムスタンプ
  created_at      TIMESTAMP NOT NULL,
  updated_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  
  -- アーカイブ情報
  archived_at     TIMESTAMP DEFAULT NOW(),
  archived_reason TEXT,  -- 'completed', 'cancelled', 'manual'
  
  PRIMARY KEY (log_id, created_at)  -- パーティショニング用
) PARTITION BY RANGE (created_at);

-- 月次パーティション（自動生成スクリプト別途）
CREATE TABLE order_logs_2025_10 PARTITION OF order_logs
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- インデックス（履歴検索特化）
CREATE INDEX idx_order_logs_tenant_date ON order_logs(tenant_id, created_at DESC);
CREATE INDEX idx_order_logs_original ON order_logs(original_id);
CREATE INDEX idx_order_logs_session ON order_logs(session_id);
```

**運用ルール**:
- ✅ すべての完了/キャンセル注文を永久保存
- ✅ 月次パーティション自動生成（バッチ処理）
- ✅ 3年以上前のパーティションは圧縮（pg_dump → S3）

---

### 2. チェックインセッション（CheckinSession）

#### 運用テーブル: `checkin_sessions`

```sql
CREATE TABLE checkin_sessions (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  room_id           TEXT NOT NULL,
  status            TEXT DEFAULT 'ACTIVE',  -- ACTIVE, CHECKED_OUT, EXTENDED
  
  check_in_at       TIMESTAMP NOT NULL,
  check_out_at      TIMESTAMP,
  planned_check_out TIMESTAMP NOT NULL,
  
  guest_info        JSONB NOT NULL,
  adults            INTEGER DEFAULT 1,
  children          INTEGER DEFAULT 0,
  
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  
  -- バッチ削除用
  is_deleted        BOOLEAN DEFAULT false,
  deleted_at        TIMESTAMP
);

-- インデックス
CREATE INDEX idx_sessions_active ON checkin_sessions(tenant_id, room_id, status)
  WHERE is_deleted = false AND status = 'ACTIVE';

CREATE INDEX idx_sessions_cleanup ON checkin_sessions(check_out_at)
  WHERE is_deleted = false AND status = 'CHECKED_OUT';
```

**運用ルール**:
- ✅ `ACTIVE` セッションのみ保持
- ✅ `CHECKED_OUT` は7日後にログ移行＆削除
- ✅ 平均保持件数: 全客室数 × 1.2

---

#### ログテーブル: `checkin_session_logs`

```sql
CREATE TABLE checkin_session_logs (
  log_id            BIGSERIAL,
  original_id       TEXT NOT NULL,
  tenant_id         TEXT NOT NULL,
  room_id           TEXT NOT NULL,
  status            TEXT,
  
  check_in_at       TIMESTAMP NOT NULL,
  check_out_at      TIMESTAMP,
  planned_check_out TIMESTAMP,
  
  guest_info        JSONB,
  adults            INTEGER,
  children          INTEGER,
  
  created_at        TIMESTAMP,
  updated_at        TIMESTAMP,
  archived_at       TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (log_id, check_in_at)
) PARTITION BY RANGE (check_in_at);

-- 月次パーティション
CREATE TABLE checkin_session_logs_2025_10 PARTITION OF checkin_session_logs
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- インデックス
CREATE INDEX idx_session_logs_tenant_date ON checkin_session_logs(tenant_id, check_in_at DESC);
CREATE INDEX idx_session_logs_room ON checkin_session_logs(room_id, check_in_at DESC);
```

---

## 🔄 データ移行戦略

### 移行タイミング

#### リアルタイム移行（即座実行）

**トリガー**: ステータス変更時

```typescript
// hotel-common/src/services/order.service.ts
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
        sessionId: order.sessionId,
        status: order.status,
        total: order.total,
        items: order.items,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        completedAt: order.completedAt,
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
        createdAt: item.createdAt,
        archivedAt: new Date()
      }))
    })
    
    return order
  })
}
```

---

#### バッチ削除（定期実行）

**頻度**: 1時間ごと

```typescript
// hotel-common/src/batch/cleanup-orders.ts
import { prisma } from '../database/prisma'

export async function cleanupCompletedOrders() {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間前
  
  // 1. ログ移行済みの完了注文を削除
  const result = await prisma.order.deleteMany({
    where: {
      status: { in: ['completed', 'cancelled'] },
      completedAt: { lt: cutoffTime },
      // ログテーブルに存在確認は省略（必ずログ先行のため）
    }
  })
  
  console.log(`[Cleanup] Deleted ${result.count} completed orders`)
  
  // 2. 孤立した注文明細も削除
  await prisma.orderItem.deleteMany({
    where: {
      orderId: { notIn: await prisma.order.findMany({ select: { id: true } }).then(o => o.map(x => x.id)) }
    }
  })
}

// Cron設定例（PM2 ecosystem.config.js）
{
  name: 'cleanup-orders',
  script: 'dist/batch/cleanup-orders.js',
  cron_restart: '0 * * * *',  // 毎時0分
  autorestart: false
}
```

---

#### パーティション管理（月次実行）

**頻度**: 月初1日

```sql
-- hotel-common/scripts/partition-manager.sql

-- 1. 次月のパーティション作成
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

-- 2. 3年以上前のパーティションをデタッチ（削除前準備）
DO $$
DECLARE
  old_month DATE := DATE_TRUNC('month', NOW() - INTERVAL '3 years');
  partition_name TEXT := 'order_logs_' || TO_CHAR(old_month, 'YYYY_MM');
BEGIN
  EXECUTE format('ALTER TABLE order_logs DETACH PARTITION %I', partition_name);
  RAISE NOTICE 'Detached partition: %', partition_name;
  
  -- S3アーカイブ後、手動で DROP TABLE
END $$;
```

---

## 🤖 AI用データ参照ルール

### 問題: データ量とレスポンスのトレードオフ

**AIの特性**:
- ✅ データ量↑ = 精度↑
- ❌ データ量↑ = レスポンス↓

**解決策**: 用途別最適化

---

### ルール1: 時系列データは2年分に制限

**理由**:
- ✅ ホテル業界のトレンドサイクルは1-2年
- ✅ 2年分で十分な統計的有意性
- ✅ レスポンス速度を実用レベルに維持

**実装**:
```sql
-- AI用マテリアライズドビュー
CREATE MATERIALIZED VIEW ai_order_patterns AS
SELECT 
  tenant_id,
  DATE_TRUNC('day', created_at) as order_date,
  EXTRACT(DOW FROM created_at) as day_of_week,
  EXTRACT(HOUR FROM created_at) as hour_of_day,
  COUNT(*) as order_count,
  AVG(total) as avg_order_value,
  jsonb_agg(DISTINCT jsonb_array_elements(items->'menuItemId')) as popular_items
FROM order_logs
WHERE created_at >= NOW() - INTERVAL '2 years'
GROUP BY tenant_id, DATE_TRUNC('day', created_at), 
         EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at);

-- 日次更新
REFRESH MATERIALIZED VIEW CONCURRENTLY ai_order_patterns;
```

---

### ルール2: 集計データを事前計算

**AI用途別ビュー**:

| AI機能 | ビュー名 | 更新頻度 | データ範囲 |
|-------|---------|---------|----------|
| メニュー推薦 | `ai_menu_recommendations` | 日次 | 2年分 |
| 需要予測 | `ai_demand_forecast` | 週次 | 3年分（月次集計） |
| 異常検知 | `ai_anomaly_detection` | 時間次 | 直近30日 |
| 顧客分析 | `ai_customer_insights` | 週次 | 全期間（集約） |

**実装例**:
```sql
-- メニュー推薦用ビュー
CREATE MATERIALIZED VIEW ai_menu_recommendations AS
WITH item_stats AS (
  SELECT 
    tenant_id,
    jsonb_array_elements(items)->>'menuItemId' as menu_item_id,
    jsonb_array_elements(items)->>'name' as item_name,
    COUNT(*) as order_count,
    AVG((jsonb_array_elements(items)->>'price')::int) as avg_price
  FROM order_logs
  WHERE created_at >= NOW() - INTERVAL '2 years'
  GROUP BY tenant_id, menu_item_id, item_name
)
SELECT 
  tenant_id,
  menu_item_id,
  item_name,
  order_count,
  avg_price,
  RANK() OVER (PARTITION BY tenant_id ORDER BY order_count DESC) as popularity_rank
FROM item_stats;
```

---

### ルール3: キャッシュ戦略

**AI応答のキャッシュ**:

```typescript
// hotel-common/src/services/ai-cache.service.ts
import Redis from 'ioredis'

const redis = new Redis()

export async function getAIRecommendations(
  tenantId: string,
  roomId: string,
  context: any
): Promise<any> {
  const cacheKey = `ai:recommendations:${tenantId}:${roomId}:${JSON.stringify(context)}`
  
  // 1. キャッシュ確認（1時間有効）
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }
  
  // 2. マテリアライズドビューから取得
  const recommendations = await prisma.$queryRaw`
    SELECT * FROM ai_menu_recommendations
    WHERE tenant_id = ${tenantId}
    ORDER BY popularity_rank
    LIMIT 10
  `
  
  // 3. キャッシュ保存
  await redis.setex(cacheKey, 3600, JSON.stringify(recommendations))
  
  return recommendations
}
```

---

## 📋 実装ガイドライン

### Phase 1: 注文管理（Week 1-2）

#### hotel-common

- [ ] `order_logs` テーブル作成
- [ ] `order_item_logs` テーブル作成
- [ ] 月次パーティション作成スクリプト
- [ ] `completeOrder()` にログ移行ロジック追加
- [ ] バッチ削除スクリプト作成
- [ ] AI用マテリアライズドビュー作成

#### hotel-saas

- [ ] API仕様修正（運用テーブルのみ参照）
- [ ] 履歴参照APIの追加（ログテーブル参照）

---

### Phase 2: チェックインセッション（Week 3-4）

- [ ] `checkin_session_logs` テーブル作成
- [ ] チェックアウト時のログ移行処理
- [ ] バッチ削除スクリプト統合

---

### Phase 3: AI統合（Week 5-6）

- [ ] AI用マテリアライズドビュー作成
- [ ] 日次更新バッチ作成
- [ ] Redisキャッシュ実装
- [ ] AIエンドポイント最適化

---

## 🔧 運用手順

### 日次運用

**午前3時（自動）**:
```bash
# 1. AI用ビュー更新
psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY ai_order_patterns;"
psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY ai_menu_recommendations;"

# 2. 統計情報更新
psql -c "ANALYZE order_logs;"
psql -c "ANALYZE checkin_session_logs;"
```

---

### 毎時運用

**毎時0分（自動）**:
```bash
# 完了注文のクリーンアップ
node dist/batch/cleanup-orders.js
node dist/batch/cleanup-sessions.js
```

---

### 月次運用

**月初1日（半自動）**:
```bash
# 1. 次月パーティション作成
psql -f scripts/create-next-month-partitions.sql

# 2. 古いパーティションのアーカイブ確認
psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE tablename LIKE 'order_logs_%'
ORDER BY tablename DESC;"

# 3. 3年以上前のパーティションをS3へ
# （手動確認後実行）
./scripts/archive-old-partitions.sh 2022-10
```

---

## 📊 監視指標

### 運用テーブルサイズ監視

**目標値**:
- `orders`: 10,000件以下/テナント
- `checkin_sessions`: 客室数 × 1.5以下

**アラート条件**:
```sql
-- 注文テーブル肥大化チェック
SELECT 
  tenant_id,
  COUNT(*) as order_count,
  pg_size_pretty(pg_total_relation_size('orders')) as table_size
FROM orders
WHERE is_deleted = false
GROUP BY tenant_id
HAVING COUNT(*) > 10000;
```

---

### ログ移行の完全性チェック

**日次確認**:
```sql
-- ログ移行漏れチェック
SELECT COUNT(*) as missing_logs
FROM orders o
WHERE o.status IN ('completed', 'cancelled')
  AND o.completed_at < NOW() - INTERVAL '1 hour'
  AND NOT EXISTS (
    SELECT 1 FROM order_logs ol
    WHERE ol.original_id = o.id
  );
```

**期待値**: 0件

---

## 🔗 関連SSOT

- [SSOT_SAAS_ORDER_MANAGEMENT.md](../01_core_features/SSOT_SAAS_ORDER_MANAGEMENT.md) - 注文管理
- [SSOT_SAAS_DATABASE_SCHEMA.md](./SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_DATABASE_MIGRATION_OPERATION.md](./SSOT_DATABASE_MIGRATION_OPERATION.md) - DBマイグレーション運用

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-03 | 1.0.0 | 初版作成 | AI |

---

**以上、SSOT: 運用/ログ二重管理アーキテクチャ**

