# 統計・分析機能 技術仕様書

## 📋 目次
1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [データベース設計](#データベース設計)
3. [API仕様](#api仕様)
4. [フロントエンド設計](#フロントエンド設計)
5. [パフォーマンス要件](#パフォーマンス要件)
6. [セキュリティ要件](#セキュリティ要件)

## 🏗️ アーキテクチャ概要

### **システム構成**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   フロントエンド   │    │    APIレイヤー    │    │   データベース    │
│                 │    │                 │    │                 │
│ Vue 3 + Nuxt 3  │◄──►│ Nuxt Server API │◄──►│  SQLite/Prisma  │
│ TypeScript      │    │ TypeScript      │    │                 │
│ Chart.js        │    │ Prisma Client   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **レイヤー責務**

#### **プレゼンテーション層**
- 統計ダッシュボードの表示
- グラフ・チャートの描画
- ユーザーインタラクション処理
- レスポンシブ対応

#### **ビジネスロジック層**
- 統計データの集計・計算
- ビジネスルール適用
- データ変換・整形
- 認証・認可

#### **データアクセス層**
- Prismaクライアントによるデータアクセス
- クエリ最適化
- トランザクション管理
- データ整合性保証

## 🗄️ データベース設計

### **統計関連テーブル**

#### **既存テーブルの活用**
```sql
-- 注文データ（メインデータソース）
Order {
  id: Int @id
  roomId: String        -- 客室識別
  placeId: Int?         -- プレイス関連（マーケティング分析用）
  status: String        -- 注文状態
  total: Int           -- 注文総額
  createdAt: DateTime  -- 注文日時（重要な分析軸）
  items: Json          -- 注文アイテム詳細
  isDeleted: Boolean
}

-- 注文アイテム詳細
OrderItem {
  id: Int @id
  orderId: Int
  menuItemId: Int      -- 商品ID（人気商品分析用）
  name: String         -- 商品名
  price: Int           -- 単価
  quantity: Int        -- 数量
  status: String
  deliveredAt: DateTime? -- 配達完了時刻（配達時間分析用）
  createdAt: DateTime
}

-- 商品マスタ
MenuItem {
  id: Int @id
  name_ja: String      -- 日本語商品名
  price: Int           -- 基準価格
  categoryId: Int?     -- カテゴリー（カテゴリー別分析用）
  showRankingDay: Boolean    -- 日次ランキング表示フラグ
  showRankingWeek: Boolean   -- 週次ランキング表示フラグ
  showRankingMonth: Boolean  -- 月次ランキング表示フラグ
  isDeleted: Boolean
}

-- プレイス情報
Place {
  id: Int @id
  code: String @unique  -- 客室番号
  name: String          -- 表示名
  placeTypeId: Int      -- プレイスタイプ（客室ランク分析用）
  attributes: Json?     -- 追加属性（収容人数、面積等）
  capacity: Int?        -- 収容人数
  area: Float?          -- 面積
}
```

#### **統計専用テーブル（将来追加予定）**
```sql
-- 日次統計サマリー（パフォーマンス向上用）
DailyStatsSummary {
  id: Int @id
  date: DateTime @unique
  totalOrders: Int
  totalRevenue: Int
  averageOrderValue: Int
  activeRooms: Int
  topProductId: Int?
  createdAt: DateTime
}

-- 時間帯別統計
HourlyStats {
  id: Int @id
  date: DateTime
  hour: Int            -- 0-23
  orderCount: Int
  revenue: Int
  averageOrderValue: Int
  @@unique([date, hour])
}
```

### **インデックス戦略**
```sql
-- パフォーマンス最適化のためのインデックス
@@index([createdAt])           -- 時系列分析用
@@index([roomId, createdAt])   -- 客室別時系列分析用
@@index([placeId])             -- プレイス分析用
@@index([menuItemId])          -- 商品分析用
@@index([status])              -- ステータス別分析用
```

## 🔌 API仕様

### **実装済みエンドポイント**

#### **KPI統計取得**
```typescript
GET /api/v1/admin/statistics/kpis

// クエリパラメータ
interface KpisQuery {
  period: '7' | '30' | '90'  // 分析期間（日数）
}

// レスポンス
interface KpisResponse {
  totalOrders: number        // 総注文数
  totalRevenue: number       // 総売上（円）
  averageOrderValue: number  // 平均客単価（円）
  activeRooms: number        // アクティブ客室数
}

// 実装詳細
// - 指定期間内の注文データを集計
// - 削除済み注文は除外
// - アクティブ客室は注文実績のある客室をカウント
```

#### **人気商品ランキング**
```typescript
GET /api/v1/admin/statistics/popular-products

// クエリパラメータ
interface PopularProductsQuery {
  period: '7' | '30' | '90'  // 分析期間
  limit?: number             // 取得件数（デフォルト10）
}

// レスポンス
interface PopularProduct {
  id: number           // 商品ID
  name: string         // 商品名（日本語優先）
  orderCount: number   // 注文数量の合計
  revenue: number      // 売上貢献度
  orderFrequency: number // 注文頻度（注文回数）
}

type PopularProductsResponse = PopularProduct[]
```

### **実装予定エンドポイント**

#### **時間帯別分析**
```typescript
GET /api/v1/admin/statistics/time-analysis

interface TimeAnalysisQuery {
  period: '7' | '30' | '90'
  groupBy: 'hour' | 'dayOfWeek' | 'month'
}

interface TimeAnalysisResponse {
  timeSlots: Array<{
    period: string       // "0-1", "Monday", "2024-01" など
    orderCount: number
    revenue: number
    averageOrderValue: number
    popularProducts: PopularProduct[]
  }>
  peakHours: number[]   // ピーク時間帯
  trends: {
    growth: number      // 成長率
    seasonality: number // 季節性指数
  }
}
```

#### **客室分析**
```typescript
GET /api/v1/admin/statistics/room-analysis

interface RoomAnalysisQuery {
  period: '7' | '30' | '90'
  placeTypeId?: number  // 特定プレイスタイプのみ
}

interface RoomAnalysisResponse {
  roomStats: Array<{
    roomId: string
    roomName: string
    placeType: string
    orderCount: number
    revenue: number
    averageOrderValue: number
    lastOrderDate: string
  }>
  placeTypeComparison: Array<{
    placeTypeId: number
    placeTypeName: string
    averageRevenue: number
    orderFrequency: number
  }>
}
```

### **エラーハンドリング**
```typescript
// 共通エラーレスポンス
interface ErrorResponse {
  statusCode: number
  statusMessage: string
  error?: string
}

// エラーケース
// 400: 不正なパラメータ
// 401: 認証エラー
// 403: 権限不足
// 500: サーバーエラー
```

## 🎨 フロントエンド設計

### **コンポーネント構成**
```
pages/admin/statistics/
├── index.vue              -- メインダッシュボード
├── time-analysis.vue      -- 時間帯別分析（予定）
├── room-analysis.vue      -- 客室分析（予定）
└── components/
    ├── KpiCards.vue       -- KPI概要カード
    ├── PopularProducts.vue -- 人気商品テーブル
    ├── TimeChart.vue      -- 時間帯別グラフ（予定）
    └── RoomChart.vue      -- 客室分析グラフ（予定）
```

### **状態管理**
```typescript
// composables/useStatistics.ts
interface StatisticsState {
  // 期間選択
  selectedPeriod: Ref<'7' | '30' | '90'>
  
  // データ
  kpis: Ref<KpisResponse | null>
  popularProducts: Ref<PopularProduct[]>
  
  // UI状態
  loading: Ref<boolean>
  activeTab: Ref<string>
  error: Ref<string | null>
}

// メソッド
interface StatisticsMethods {
  loadKpis(): Promise<void>
  loadPopularProducts(): Promise<void>
  refreshData(): Promise<void>
  exportToCsv(): Promise<void>
}
```

### **UI/UXパターン**
```vue
<!-- レスポンシブグリッド -->
<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
  <!-- KPIカード -->
</div>

<!-- タブナビゲーション -->
<nav class="-mb-px flex">
  <button :class="tabClass">時間帯別分析</button>
  <!-- ... -->
</nav>

<!-- データテーブル -->
<table class="min-w-full divide-y divide-gray-200">
  <!-- ヘッダー・ボディ -->
</table>
```

## ⚡ パフォーマンス要件

### **レスポンス時間目標**
| エンドポイント | 目標時間 | 最大許容時間 |
|-------------|---------|------------|
| KPI統計 | < 200ms | < 500ms |
| 人気商品 | < 300ms | < 800ms |
| 時間帯別分析 | < 500ms | < 1500ms |

### **最適化戦略**

#### **データベース最適化**
```sql
-- インデックス作成
CREATE INDEX idx_orders_created_at ON Order(createdAt);
CREATE INDEX idx_orders_room_created ON Order(roomId, createdAt);
CREATE INDEX idx_order_items_menu_id ON OrderItem(menuItemId);

-- クエリ最適化例
-- 悪い例：N+1クエリ
-- 良い例：JOINによる一括取得
SELECT oi.*, mi.name_ja 
FROM OrderItem oi
JOIN MenuItem mi ON oi.menuItemId = mi.id
WHERE oi.orderId IN (...)
```

#### **キャッシュ戦略**
```typescript
// APIレベルキャッシュ（将来実装）
const cacheKey = `kpis:${period}:${date}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// フロントエンドキャッシュ
const { data, refresh } = await useLazyFetch('/api/v1/admin/statistics/kpis', {
  key: `kpis-${period}`,
  server: false
})
```

#### **データ量制限**
- 大量データの場合はページネーション実装
- CSV エクスポートは非同期処理
- リアルタイム更新は WebSocket使用検討

## 🔒 セキュリティ要件

### **認証・認可**
```typescript
// 管理画面アクセス制御
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin-only']  // 管理者権限必須
})

// API認証
export default defineEventHandler(async (event) => {
  // JWTトークン検証
  const token = getCookie(event, 'auth-token')
  const user = await verifyToken(token)
  
  if (!user || !user.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'アクセス権限がありません'
    })
  }
  
  // 統計データ処理...
})
```

### **データプライバシー**
```typescript
// 個人情報の除外
const anonymizedData = {
  roomId: order.roomId,           // OK: 客室番号は分析に必要
  customerName: undefined,        // NG: 個人名は除外
  customerPhone: undefined,       // NG: 電話番号は除外
  revenue: order.total,           // OK: 売上データ
  items: order.items.map(item => ({
    name: item.name,              // OK: 商品名
    quantity: item.quantity,      // OK: 数量
    // 個人特定情報は除外
  }))
}
```

### **監査ログ**
```typescript
// 統計データアクセス履歴
await prisma.adminAccessLog.create({
  data: {
    path: '/api/v1/admin/statistics/kpis',
    method: 'GET',
    userId: user.id,
    ipAddress: getClientIP(event),
    userAgent: getHeader(event, 'user-agent'),
    createdAt: new Date()
  }
})
```

## 🧪 テスト仕様

### **単体テスト**
```typescript
// tests/api/statistics.test.ts
describe('Statistics API', () => {
  test('KPI統計取得', async () => {
    const response = await $fetch('/api/v1/admin/statistics/kpis?period=7')
    
    expect(response).toMatchObject({
      totalOrders: expect.any(Number),
      totalRevenue: expect.any(Number),
      averageOrderValue: expect.any(Number),
      activeRooms: expect.any(Number)
    })
    
    expect(response.totalOrders).toBeGreaterThanOrEqual(0)
    expect(response.averageOrderValue).toBeGreaterThanOrEqual(0)
  })
})
```

### **統合テスト**
```typescript
// tests/integration/statistics.test.ts
describe('統計機能統合テスト', () => {
  test('ダッシュボード表示', async () => {
    // テストデータ作成
    await createTestOrders(10)
    
    // ページアクセス
    const page = await browser.newPage()
    await page.goto('/admin/statistics')
    
    // KPIカード表示確認
    await expect(page.locator('[data-testid="kpi-total-orders"]')).toBeVisible()
    await expect(page.locator('[data-testid="kpi-total-revenue"]')).toBeVisible()
    
    // データ更新確認
    await page.click('[data-testid="refresh-button"]')
    await page.waitForLoadState('networkidle')
  })
})
```

## 📊 メトリクス・監視

### **パフォーマンス監視**
```typescript
// パフォーマンス計測
const startTime = Date.now()
const result = await statisticsCalculation()
const duration = Date.now() - startTime

// メトリクス送信（将来実装）
await sendMetrics({
  name: 'statistics.kpis.duration',
  value: duration,
  tags: { period }
})
```

### **エラー監視**
```typescript
// エラー追跡
try {
  return await calculateStatistics()
} catch (error) {
  console.error('統計計算エラー:', error)
  
  // エラー通知（将来実装）
  await notifyError({
    type: 'statistics_calculation_error',
    error: error.message,
    context: { period, userId }
  })
  
  throw createError({
    statusCode: 500,
    statusMessage: '統計データの計算に失敗しました'
  })
}
```

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2024/XX/XX | v1.0 | 初版作成 |
| 2024/XX/XX | v1.1 | フェーズ1実装完了 | 