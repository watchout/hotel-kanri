# 📊 SSOT: 統計・分析機能（基本統計）

**Doc-ID**: SSOT-ADMIN-STATISTICS-CORE-001  
**バージョン**: 1.0.0  
**作成日**: 2025年10月6日  
**最終更新**: 2025年10月6日  
**ステータス**: ✅ 確定  
**優先度**: 🟡 高優先（Phase 2）  
**所有者**: Sun（hotel-saas担当AI）

**関連SSOT**:
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_ADMIN_UI_DESIGN.md](./SSOT_ADMIN_UI_DESIGN.md) - UIデザイン統一ルール

**関連ドキュメント**:
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/statistics/README.md` - 統計機能概要
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/statistics/REQUIREMENTS.md` - 要件定義書
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/statistics/API_DESIGN.md` - API設計書

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [データモデル](#データモデル)
5. [API仕様](#api仕様)
6. [UI仕様](#ui仕様)
7. [現状実装状況](#現状実装状況)
8. [未実装機能](#未実装機能)
9. [実装詳細](#実装詳細)
10. [セキュリティ](#セキュリティ)
11. [パフォーマンス](#パフォーマンス)
12. [エラーハンドリング](#エラーハンドリング)

---

## 📖 概要

### 目的

hotel-saas管理画面で注文データ・商品データ・客室データを多角的に分析し、経営判断をサポートする基本統計・分析機能の完全な仕様を定義する。

### 基本方針

- **データドリブン経営**: リアルタイムKPIによる経営判断支援
- **包括的分析**: 注文・商品・客室・時間軸での多角的分析
- **直感的可視化**: グラフ・チャートによる分かりやすいデータ表現
- **プラン制限対応**: AIビジネスサポート機能として制限可能

### 適用範囲

- **基本統計機能**
  - KPI概要（総注文数、総売上、平均注文金額、アクティブ客室数）
  - 商品分析（人気商品ランキング、売上分析）
  - 客室分析（客室別注文状況、客室ランク別分析）
  - 時間帯分析（時間帯別・曜日別注文傾向）
  - 収益性分析（利益率、原価率）

---

## 🎯 スコープ

### 対象システム

- ✅ **hotel-saas**: メイン実装（管理画面UI + プロキシAPI）
- ✅ **hotel-common**: コア実装（API基盤 + データベース層）

### 対象機能

| # | 機能 | 説明 | 実装状態 | 優先度 |
|:-:|:-----|:-----|:------:|:-----:|
| 1 | ダッシュボード | KPI概要表示 | 🟢 部分実装 | 🔴 最高 |
| 2 | 商品分析 | 人気商品ランキング、売上分析 | 🟢 部分実装 | 🔴 最高 |
| 3 | 客室分析 | 客室別注文状況、利用率 | 🟢 部分実装 | 🟡 高 |
| 4 | 時間帯分析 | 時間帯別・曜日別注文傾向 | 🟡 UI実装済 | 🟡 高 |
| 5 | 収益性分析 | 利益率・原価率分析 | 🟡 UI実装済 | 🟢 中 |
| 6 | CSV エクスポート | データダウンロード | ❌ 未実装 | 🟢 中 |

### 対象外機能

- ❌ AI分析・インサイト機能 → `SSOT_ADMIN_STATISTICS_AI.md` で定義
- ❌ 配信スタジオ・A/Bテスト → `SSOT_ADMIN_STATISTICS_DELIVERY.md` で定義

---

## 🛠️ 技術スタック

### フロントエンド

```typescript
// 必須ライブラリ
const dependencies = {
  'vue': '^3.5.13',                    // Vue3 framework
  'nuxt': '^3.13.0',                   // Nuxt3 framework
  'typescript': '^5.6.3',              // TypeScript
  '@nuxt/icon': '^1.5.6',              // Icon library
  'tailwindcss': '^3.4.16',            // CSS framework
}
```

### バックエンド

#### hotel-saas（プロキシAPI）
- **サーバー**: Nuxt Nitro
- **ディレクトリ**: `/server/api/v1/admin/statistics/`
- **認証**: Session認証（adminミドルウェア）
- **役割**: hotel-common APIへのプロキシ

#### hotel-common（コアAPI）
- **サーバー**: Express.js
- **ディレクトリ**: `/src/routes/api/v1/statistics/`（**未実装**）
- **認証**: Session認証（Redis共有）
- **役割**: データベースアクセス、統計計算

### データベース

- **DBMS**: PostgreSQL（統一DB）
- **ORM**: Prisma 5.22+
- **スキーマ**: `/Users/kaneko/hotel-common/prisma/schema.prisma`
- **命名規則**: **新規テーブルはsnake_case必須**（[DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) v3.0.0準拠）

### セッションストア

- **Redis**: 必須（開発・本番共通）
- **接続**: 環境変数 `REDIS_URL`
- **キー形式**: `hotel:session:{sessionId}`

---

## 📊 データモデル

### 主要テーブル

統計・分析機能は以下の既存テーブルを使用します：

```prisma
// 注文テーブル
model Order {
  id        Int      @id @default(autoincrement())
  tenantId  String
  roomId    String
  placeId   Int?
  status    String   @default("received")
  items     Json
  total     Int
  createdAt DateTime @default(now())
  updatedAt DateTime
  paidAt    DateTime?
  isDeleted Boolean  @default(false)
  sessionId String?
  
  @@map("orders")
  @@index([tenantId])
  @@index([createdAt])
  @@index([status])
  @@index([isDeleted, paidAt])
}

// 注文詳細テーブル
model OrderItem {
  id          Int      @id @default(autoincrement())
  tenantId    String
  orderId     Int
  menuItemId  Int
  name        String
  price       Int
  quantity    Int
  status      String   @default("pending")
  deliveredAt DateTime?
  createdAt   DateTime @default(now())
  
  @@map("order_items")
  @@index([tenantId])
  @@index([orderId])
  @@index([menuItemId])
}

// 商品テーブル
model MenuItem {
  id            Int      @id @default(autoincrement())
  tenantId      String   @map("tenant_id")
  nameJa        String   @map("name_ja")
  nameEn        String?  @map("name_en")
  price         Int
  cost          Int      @default(0)
  categoryId    Int?     @map("category_id")
  isAvailable   Boolean  @default(true) @map("is_available")
  isDeleted     Boolean  @default(false) @map("is_deleted")
  
  @@map("menu_items")
  @@index([tenantId])
  @@index([tenantId, categoryId])
  @@index([tenantId, isAvailable])
}

// 客室テーブル
model device_rooms {
  id         String   @id
  tenantId   String   @map("tenant_id")
  roomNumber String   @map("room_number")
  gradeId    String?  @map("grade_id")
  status     String   @default("available")
  isDeleted  Boolean  @default(false) @map("is_deleted")
  
  @@map("device_rooms")
  @@index([tenantId])
  @@index([tenantId, gradeId])
}

// 客室ランクテーブル
model room_grades {
  id          String  @id
  tenantId    String  @map("tenant_id")
  name        String
  description String?
  sortOrder   Int     @default(0) @map("sort_order")
  
  @@map("room_grades")
  @@index([tenantId])
}
```

### TypeScript型定義

```typescript
// KPI統計
interface KpisResponse {
  totalOrders: number;           // 総注文数
  totalRevenue: number;          // 総売上
  averageOrderValue: number;     // 平均注文金額
  activeRooms: number;           // アクティブ客室数
  growth?: {                     // 前期比成長率
    orders: number;
    revenue: number;
    averageOrderValue: number;
    activeRooms: number;
  };
  periodInfo?: {                 // 期間情報
    startDate: string;
    endDate: string;
    days: number;
  };
}

// 商品分析
interface PopularProduct {
  id: number;
  name: string;
  categoryName: string;
  orderCount: number;            // 注文回数
  revenue: number;               // 売上
  growthRate: number;            // 成長率（%）
  profitMargin?: number;         // 利益率（%）
  averagePrice: number;          // 平均単価
}

// 客室分析
interface RoomAnalysis {
  roomId: string;
  roomNumber: string;
  gradeName: string;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
  utilizationRate: number;       // 利用率（%）
}

// 時間帯分析
interface TimeAnalysis {
  hour?: number;                 // 時間（0-23）
  dayOfWeek?: number;            // 曜日（0-6）
  month?: string;                // 月（YYYY-MM）
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
}

// 収益性分析
interface ProfitabilityAnalysis {
  productId: number;
  productName: string;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;          // 利益率（%）
  costRate: number;              // 原価率（%）
}
```

---

## 🔌 API仕様

### ベースパス

```
hotel-saas:   /api/v1/admin/statistics/
hotel-common: /api/v1/statistics/
```

### 認証

- **方式**: Session認証（Redis + HttpOnly Cookie）
- **ミドルウェア**: `requireAdmin()`
- **テナント識別**: セッションから `tenantId` を取得

### エンドポイント一覧

| # | エンドポイント | メソッド | 説明 | 実装状態 |
|:-:|:-------------|:--------|:-----|:------:|
| 1 | `/kpis` | GET | KPI統計取得 | 🟢 hotel-saas実装済（モック） |
| 2 | `/popular-products` | GET | 人気商品ランキング | 🔴 .disabled |
| 3 | `/room-analysis` | GET | 客室分析 | 🟢 hotel-saas実装済 |
| 4 | `/room-usage-analysis` | GET | 客室利用分析 | 🟢 hotel-saas実装済 |
| 5 | `/time-analysis` | GET | 時間帯分析 | 🔴 .disabled |
| 6 | `/profitability-analysis` | GET | 収益性分析 | 🔴 .disabled |
| 7 | `/export/csv` | GET | CSV エクスポート | 🔴 .disabled |

### API詳細仕様

#### 1. KPI統計取得

**エンドポイント**: `GET /api/v1/admin/statistics/kpis`

**クエリパラメータ**:
```typescript
interface KpisQuery {
  startDate?: string;  // YYYY-MM-DD（デフォルト: 7日前）
  endDate?: string;    // YYYY-MM-DD（デフォルト: 今日）
}
```

**レスポンス**:
```typescript
{
  "totalOrders": 487,
  "totalRevenue": 1254800,
  "averageOrderValue": 5800,
  "activeRooms": 45,
  "growth": {
    "orders": 7.7,
    "revenue": 4.7,
    "averageOrderValue": 7.4,
    "activeRooms": 2.3
  },
  "periodInfo": {
    "startDate": "2025-09-29",
    "endDate": "2025-10-06",
    "days": 7
  }
}
```

**実装ファイル**:
- hotel-saas: `/server/api/v1/admin/statistics/kpis.get.ts`（モックデータ返却中）
- hotel-common: **未実装**

#### 2. 人気商品ランキング

**エンドポイント**: `GET /api/v1/admin/statistics/popular-products`

**クエリパラメータ**:
```typescript
interface PopularProductsQuery {
  startDate?: string;
  endDate?: string;
  limit?: number;      // デフォルト: 10
  categoryId?: number; // カテゴリフィルタ
  sortBy?: 'orders' | 'revenue' | 'growth';  // デフォルト: orders
}
```

**レスポンス**:
```typescript
{
  "products": [
    {
      "id": 1,
      "name": "深夜限定セット",
      "categoryName": "セットメニュー",
      "orderCount": 156,
      "revenue": 234000,
      "growthRate": 12.5,
      "profitMargin": 45.2,
      "averagePrice": 1500
    }
  ],
  "total": 100
}
```

**実装ファイル**:
- hotel-saas: `/server/api/v1/admin/statistics/popular-products.get.ts.disabled`
- hotel-common: **未実装**

#### 3. 客室分析

**エンドポイント**: `GET /api/v1/admin/statistics/room-analysis`

**クエリパラメータ**:
```typescript
interface RoomAnalysisQuery {
  startDate?: string;
  endDate?: string;
  gradeId?: string;    // 客室ランクフィルタ
}
```

**レスポンス**:
```typescript
{
  "rooms": [
    {
      "roomId": "room_001",
      "roomNumber": "101",
      "gradeName": "スタンダード",
      "orderCount": 12,
      "revenue": 45000,
      "averageOrderValue": 3750,
      "utilizationRate": 85.5
    }
  ],
  "summary": {
    "totalRooms": 50,
    "activeRooms": 45,
    "averageRevenue": 28000,
    "averageOrders": 9.4
  }
}
```

**実装ファイル**:
- hotel-saas: `/server/api/v1/admin/statistics/room-analysis.get.ts`
- hotel-common: `/src/routes/api/v1/rooms/stats.ts`（**要確認**）

---

## 🎨 UI仕様

### 画面構成

```
/admin/statistics/
├── index.vue                   // ダッシュボード（メイン）
├── popular-products.vue        // 商品分析
├── room-analysis.vue           // 客室分析
├── room-usage-analysis.vue     // 客室利用分析
├── time-analysis.vue           // 時間帯分析
└── profitability-analysis.vue  // 収益性分析
```

### 共通UI要素

#### 1. タブナビゲーション

**コンポーネント**: `<AdminAnalysisTabNavigation />`

```vue
<template>
  <nav class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex space-x-8">
        <NuxtLink to="/admin/statistics" class="tab">
          概要
        </NuxtLink>
        <NuxtLink to="/admin/statistics/popular-products" class="tab">
          商品分析
        </NuxtLink>
        <NuxtLink to="/admin/statistics/room-analysis" class="tab">
          客室分析
        </NuxtLink>
        <!-- ... -->
      </div>
    </div>
  </nav>
</template>
```

#### 2. 期間選択

**コンポーネント**: `<DateRangePicker />`

```vue
<template>
  <div class="space-y-4">
    <!-- クイック選択 -->
    <div class="flex gap-2">
      <button @click="setQuickPeriod('7d')">過去7日</button>
      <button @click="setQuickPeriod('30d')">過去30日</button>
      <button @click="setQuickPeriod('90d')">過去90日</button>
      <button @click="setQuickPeriod('1y')">過去1年</button>
    </div>
    
    <!-- カスタム日付 -->
    <div class="grid grid-cols-2 gap-4">
      <input v-model="startDate" type="date" />
      <input v-model="endDate" type="date" />
    </div>
  </div>
</template>
```

#### 3. プラン制限バナー

**コンポーネント**: `<FeatureRestrictedBanner />`

```vue
<FeatureRestrictedBanner 
  feature-name="aiBusinessSupport"
  title="AIビジネスサポート機能"
  description="統計・分析機能はプロフェッショナルプラン以上でご利用いただけます。"
/>
```

### ダッシュボード画面（index.vue）

**パス**: `/admin/statistics`

**レイアウト**:
```
┌─────────────────────────────────────┐
│ タブナビゲーション                    │
├─────────────────────────────────────┤
│ ヘッダー                             │
│ ├─ タイトル                          │
│ └─ 期間選択                          │
├─────────────────────────────────────┤
│ KPI概要カード（4つ）                  │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│ │注文数│ │売上  │ │平均  │ │客室数││
│ └──────┘ └──────┘ └──────┘ └──────┘│
├─────────────────────────────────────┤
│ 人気商品プレビュー（トップ10）         │
├─────────────────────────────────────┤
│ 客室分析プレビュー                    │
└─────────────────────────────────────┘
```

**実装ファイル**: `/pages/admin/statistics/index.vue`

**主要機能**:
- プラン制限チェック（`usePlanFeatures`）
- KPI統計表示
- 人気商品トップ10
- 客室分析概要
- 期間選択（カスタム日付範囲）

---

## 📍 現状実装状況

### hotel-saas（UI + プロキシAPI）

#### 実装済みUI

| 画面 | ファイル | 状態 | 備考 |
|------|---------|------|------|
| ダッシュボード | `/pages/admin/statistics/index.vue` | ✅ 実装済 | プラン制限対応済み |
| 商品分析 | `/pages/admin/statistics/popular-products.vue` | ✅ 実装済 | 詳細画面あり |
| 客室分析 | `/pages/admin/statistics/room-analysis.vue` | ✅ 実装済 | - |
| 客室利用分析 | `/pages/admin/statistics/room-usage-analysis.vue` | ✅ 実装済 | - |
| 時間帯分析 | `/pages/admin/statistics/time-analysis.vue` | ✅ 実装済 | - |
| 収益性分析 | `/pages/admin/statistics/profitability-analysis.vue` | ✅ 実装済 | - |

#### API実装状況

| API | ファイル | 状態 | 備考 |
|-----|---------|------|------|
| KPI統計 | `/server/api/v1/admin/statistics/kpis.get.ts` | 🟡 モック | モックデータ返却中 |
| 人気商品 | `/server/api/v1/admin/statistics/popular-products.get.ts.disabled` | 🔴 無効化 | - |
| 客室分析 | `/server/api/v1/admin/statistics/room-analysis.get.ts` | ✅ 実装済 | hotel-common連携 |
| 客室利用 | `/server/api/v1/admin/statistics/room-usage-analysis.get.ts` | ✅ 実装済 | hotel-common連携 |
| 時間帯分析 | `/server/api/v1/admin/statistics/time-analysis.get.ts.disabled` | 🔴 無効化 | - |
| 収益性分析 | `/server/api/v1/admin/statistics/profitability-analysis.get.ts.disabled` | 🔴 無効化 | - |
| CSV出力 | `/server/api/v1/admin/statistics/export/csv.get.ts.disabled` | 🔴 無効化 | - |

### hotel-common（コアAPI）

#### 実装状況

- ❌ `/src/routes/api/v1/statistics/` ディレクトリ **存在しない**
- 🟡 `/src/routes/api/v1/rooms/stats.ts` **存在する可能性**（要確認）
- ❌ 統計計算ロジック **未実装**

---

## 🚧 未実装機能

### Phase 1（最高優先）- 2週間

- [ ] hotel-common側に統計APIを実装
  - [ ] `/api/v1/statistics/kpis`
  - [ ] `/api/v1/statistics/popular-products`
  - [ ] `/api/v1/statistics/time-analysis`
- [ ] 無効化されたAPIを有効化
- [ ] モックデータを実データに置き換え

### Phase 2（高優先）- 2週間

- [ ] 収益性分析API実装
- [ ] CSV エクスポート機能
- [ ] グラフ表示の充実化（Chart.js導入）
- [ ] リアルタイム更新機能

### Phase 3（中優先）- 2週間

- [ ] 前期比成長率の自動計算
- [ ] カスタムレポート機能
- [ ] スケジュール自動配信

---

## 🔧 実装詳細

### hotel-saas実装

#### プロキシAPI実装パターン

```typescript
// server/api/v1/admin/statistics/kpis.get.ts
import { createError, defineEventHandler, getQuery } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック（adminミドルウェアで実施済み）
    const user = event.context.user;
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'ログインが必要です'
      });
    }

    // テナントID取得
    const tenantId = user.tenant_id || user.tenantId;
    
    // クエリパラメータ取得
    const query = getQuery(event);
    
    // hotel-common APIを呼び出し
    const baseUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400';
    const response = await $fetch(`${baseUrl}/api/v1/statistics/kpis`, {
      method: 'GET',
      headers: {
        'X-Tenant-ID': tenantId
      },
      query
    });

    return response;
  } catch (error: any) {
    console.error('❌ KPI統計取得エラー:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'KPI統計の取得に失敗しました'
    });
  }
});
```

### hotel-common実装

#### 統計API実装パターン

```typescript
// src/routes/api/v1/statistics/kpis.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/kpis', async (req, res) => {
  try {
    // テナントID取得
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'テナントIDが必要です' });
    }

    // 期間パラメータ取得
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // 総注文数
    const totalOrders = await prisma.order.count({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
        isDeleted: false
      }
    });

    // 総売上
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
        isDeleted: false,
        paidAt: { not: null }
      },
      select: { total: true }
    });
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    // 平均注文金額
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // アクティブ客室数
    const activeRooms = await prisma.order.groupBy({
      by: ['roomId'],
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
        isDeleted: false
      }
    });

    return res.json({
      totalOrders,
      totalRevenue,
      averageOrderValue,
      activeRooms: activeRooms.length,
      periodInfo: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        days: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    console.error('KPI統計取得エラー:', error);
    return res.status(500).json({ error: 'KPI統計の取得に失敗しました' });
  }
});

export default router;
```

---

## 🔐 セキュリティ

### 認証・認可

1. **Session認証必須**
   - Redis + HttpOnly Cookie
   - 全エンドポイントで認証チェック

2. **テナント分離**
   - 全クエリに `tenantId` フィルタ必須
   - セッションから取得した `tenantId` のみ使用

3. **プラン制限**
   - `aiBusinessSupport` 機能チェック
   - 無効時はUI制限 + API拒否

### データ保護

1. **個人情報の除外**
   - 統計データには個人情報を含めない
   - 匿名化されたデータのみ使用

2. **監査ログ**
   - 全API呼び出しを記録
   - `SSOT_ADMIN_SYSTEM_LOGS.md` に従う

---

## ⚡ パフォーマンス

### パフォーマンス目標

| 項目 | 目標値 | 測定方法 |
|------|--------|---------|
| API応答時間 | 300ms以内 | hotel-common側でロギング |
| UI初回描画 | 2秒以内 | Lighthouse Performance Score 90+ |
| データ取得 | 1秒以内 | ユーザー体感 |

### 最適化戦略

#### データベース最適化

```typescript
// インデックスの活用
@@index([tenantId, createdAt])
@@index([tenantId, isDeleted, paidAt])

// N+1問題の回避
const orders = await prisma.order.findMany({
  where: { tenantId },
  include: {
    OrderItem: true  // 一括取得
  }
});
```

#### キャッシュ戦略

```typescript
// Redis キャッシュ（KPI統計）
const cacheKey = `stats:kpis:${tenantId}:${startDate}:${endDate}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await calculateKpis(tenantId, startDate, endDate);

// 5分間キャッシュ
await redis.setex(cacheKey, 300, JSON.stringify(data));
return data;
```

---

## ⚠️ エラーハンドリング

### エラー表示方針

#### 絶対遵守ルール

```typescript
// ❌ 絶対禁止
alert('エラーが発生しました');
confirm('削除しますか？');

// ✅ 正しい実装
import { useToast } from '~/composables/useToast';
const toast = useToast();
toast.error('統計データの取得に失敗しました');
```

### エラー分類

| エラー分類 | 表示方法 | 使用タイミング | 自動消去 |
|----------|---------|--------------|---------|
| API エラー（軽度） | トースト（error） | データ取得失敗 | 5秒後 |
| API エラー（重度） | エラーモーダル | システムエラー | 手動閉じる |
| バリデーションエラー | インラインエラー | 期間選択エラー | 手動修正時 |

### エラーコード定義

```typescript
export const StatisticsErrorCodes = {
  STATS_NOT_FOUND: 'STATS_NOT_FOUND',
  STATS_CALCULATION_FAILED: 'STATS_CALCULATION_FAILED',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
} as const;
```

---

## 🔄 マイグレーション計画

### 既存データからの移行

現在、hotel-saasには統計機能のUIとモックAPIが存在しますが、hotel-common側の実装が未完了です。

#### Phase 1: hotel-common API実装（2週間）

```bash
# 1. hotel-commonにディレクトリ作成
mkdir -p /Users/kaneko/hotel-common/src/routes/api/v1/statistics

# 2. 統計サービス実装
touch /Users/kaneko/hotel-common/src/services/StatisticsService.ts

# 3. API実装
touch /Users/kaneko/hotel-common/src/routes/api/v1/statistics/kpis.ts
touch /Users/kaneko/hotel-common/src/routes/api/v1/statistics/popular-products.ts
touch /Users/kaneko/hotel-common/src/routes/api/v1/statistics/time-analysis.ts
```

#### Phase 2: hotel-saas モック削除（1週間）

```typescript
// hotel-saas: モックデータ削除
// server/api/v1/admin/statistics/kpis.get.ts

// ❌ 削除: モックデータ生成ロジック
// console.log('⚠️ hotel-common APIが未実装: モックKPI統計情報を使用');

// ✅ 追加: 実APIコール
const baseUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400';
const response = await $fetch(`${baseUrl}/api/v1/statistics/kpis`, {
  method: 'GET',
  headers: {
    'X-Tenant-ID': tenantId
  },
  query
});
```

#### Phase 3: 無効化API有効化（1週間）

```bash
# .disabled拡張子を削除
mv popular-products.get.ts.disabled popular-products.get.ts
mv time-analysis.get.ts.disabled time-analysis.get.ts
mv profitability-analysis.get.ts.disabled profitability-analysis.get.ts
mv export/csv.get.ts.disabled export/csv.get.ts
```

### ロールバック手順

```bash
# hotel-common API実装前の状態に戻す
git checkout main -- /Users/kaneko/hotel-saas/server/api/v1/admin/statistics/

# モックデータに戻す
git revert <commit-hash>
```

---

## 📊 監視・ロギング

### 監査ログ

```typescript
// hotel-common: 統計API呼び出しログ
await prisma.auditLogs.create({
  data: {
    tenantId,
    action: 'STATISTICS_KPI_VIEW',
    resource: 'statistics',
    resourceId: null,
    userId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestData: { startDate, endDate },
    createdAt: new Date()
  }
});
```

### パフォーマンスログ

```typescript
// hotel-common: パフォーマンス測定
const startTime = Date.now();

const kpis = await calculateKpis(tenantId, startDate, endDate);

const executionTime = Date.now() - startTime;

// 300ms超過時に警告ログ
if (executionTime > 300) {
  console.warn(`⚠️ KPI統計計算が遅延: ${executionTime}ms (テナント: ${tenantId})`);
}

// メトリクス記録
await recordMetric('statistics.kpis.execution_time', executionTime, {
  tenantId,
  dateRange: `${startDate}_${endDate}`
});
```

### エラートラッキング

```typescript
// hotel-common: エラー記録
try {
  const kpis = await calculateKpis(tenantId, startDate, endDate);
} catch (error: any) {
  // Sentryなどのエラートラッキングサービスに送信
  console.error('❌ KPI統計計算エラー:', {
    tenantId,
    startDate,
    endDate,
    error: error.message,
    stack: error.stack
  });
  
  // エラーログテーブルに記録
  await prisma.errorLogs.create({
    data: {
      tenantId,
      errorType: 'STATISTICS_CALCULATION_ERROR',
      errorMessage: error.message,
      errorStack: error.stack,
      context: { startDate, endDate },
      createdAt: new Date()
    }
  });
  
  throw error;
}
```

---

## 🔧 トラブルシューティング

### 問題1: KPI統計が表示されない

**症状**: ダッシュボードでKPIが0件表示される

**原因**:
- hotel-common APIが起動していない
- テナントIDが正しく渡されていない
- データベースに注文データが存在しない

**解決方法**:
```bash
# 1. hotel-common API起動確認
curl http://localhost:3400/health

# 2. テナントIDの確認
# hotel-saas: server/api/v1/admin/statistics/kpis.get.ts
console.log('テナントID:', tenantId);

# 3. データベース確認
psql -U postgres -d hotel_db
SELECT COUNT(*) FROM orders WHERE tenant_id = 'tenant_001' AND is_deleted = false;
```

### 問題2: API応答が遅い（300ms超過）

**症状**: 統計APIの応答が遅い

**原因**:
- インデックスが不足
- N+1クエリ問題
- キャッシュが効いていない

**解決方法**:
```sql
-- インデックス追加
CREATE INDEX idx_orders_tenant_id_created_at ON orders(tenant_id, created_at);
CREATE INDEX idx_orders_tenant_id_is_deleted_paid_at ON orders(tenant_id, is_deleted, paid_at);

-- クエリ最適化
EXPLAIN ANALYZE
SELECT COUNT(*) FROM orders 
WHERE tenant_id = 'tenant_001' 
  AND created_at >= '2025-09-29' 
  AND created_at <= '2025-10-06' 
  AND is_deleted = false;
```

### 問題3: モックデータが表示され続ける

**症状**: hotel-common実装後もモックデータが表示される

**原因**:
- hotel-saas側のモックロジックが残っている
- 環境変数 `HOTEL_COMMON_API_URL` が未設定

**解決方法**:
```bash
# .env確認
cat /Users/kaneko/hotel-saas/.env | grep HOTEL_COMMON_API_URL

# 未設定の場合は追加
echo "HOTEL_COMMON_API_URL=http://localhost:3400" >> /Users/kaneko/hotel-saas/.env

# hotel-saas再起動
cd /Users/kaneko/hotel-saas
pnpm run dev
```

---

## ⚠️ 実装時の注意事項

### 絶対に守るべきルール

1. **モック・フォールバックの禁止**
   ```typescript
   // ❌ 絶対禁止
   const data = await fetchFromHotelCommon().catch(() => mockData);
   
   // ✅ 正しい実装
   const data = await fetchFromHotelCommon();
   // エラー時はそのままthrow
   ```

2. **テナントID必須**
   ```typescript
   // ❌ 絶対禁止
   const orders = await prisma.order.findMany();
   
   // ✅ 正しい実装
   const orders = await prisma.order.findMany({
     where: { tenantId }
   });
   ```

3. **開発環境と本番環境の同等性**
   ```typescript
   // ❌ 絶対禁止
   if (process.env.NODE_ENV === 'development') {
     return mockData;
   }
   
   // ✅ 正しい実装
   // 開発・本番で同じロジック、接続先のみ環境変数で変更
   const baseUrl = process.env.HOTEL_COMMON_API_URL;
   ```

### パフォーマンス最適化チェックリスト

- [ ] インデックスは適切に設定されているか
- [ ] N+1クエリは発生していないか
- [ ] キャッシュは適切に使用されているか
- [ ] クエリは最適化されているか（EXPLAIN ANALYZE実行）
- [ ] 不要なデータ取得はしていないか（SELECT * 禁止）

### セキュリティチェックリスト

- [ ] 全APIで認証チェックが実装されているか
- [ ] テナントIDによるデータ分離が実装されているか
- [ ] SQLインジェクション対策（Prisma使用）
- [ ] XSS対策（出力エスケープ）
- [ ] 入力バリデーション実装

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-06 | 1.1.0 | 120点改善<br>- マイグレーション計画追加<br>- 監視・ロギング詳細追加<br>- トラブルシューティングガイド追加<br>- 実装時の注意事項追加 | AI |
| 2025-10-06 | 1.0.0 | 初版作成<br>- 基本統計・分析機能の完全仕様定義<br>- 既存実装状況の詳細調査<br>- データモデル・API・UI仕様の統合<br>- DATABASE_NAMING_STANDARD.md v3.0.0準拠<br>- API_ROUTING_GUIDELINES.md準拠<br>- SSOT_ADMIN_UI_DESIGN.md準拠 | AI |

---

**以上、SSOT: 統計・分析機能（基本統計）v1.1.0**

