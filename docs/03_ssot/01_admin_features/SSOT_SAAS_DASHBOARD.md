# 📊 SSOT: hotel-saas ダッシュボード機能

**作成日**: 2025年10月2日  
**バージョン**: 1.0.0  
**ステータス**: 実装済み  
**関連システム**: hotel-saas (フロントエンド) + hotel-common (バックエンドAPI)

---

## 📚 関連ドキュメント

- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 認証システム全体
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/COMPLETE_API_ENDPOINT_LIST.md` - 実装済みAPI一覧
- `/Users/kaneko/hotel-saas/pages/admin/index.vue` - ダッシュボードUI実装
- `/Users/kaneko/hotel-common/src/routes/systems/saas/admin-dashboard.routes.ts` - API実装

---

## 📋 概要

### 目的
hotel-saas管理画面のダッシュボード機能の完全な仕様を定義する。

### 適用範囲
- ダッシュボードトップ画面（`/admin/`）
- 統計情報表示（今日の注文・売上・デバイス・処理待ち）
- クイックアクション（各機能へのショートカット）

### 技術スタック
- **フロントエンド**: Nuxt 3 + Vue 3 + TypeScript
- **バックエンドAPI**: hotel-common (Express + TypeScript)
- **認証方式**: Session認証（Redis + HttpOnly Cookie）
  - 詳細: [SSOT_SAAS_ADMIN_AUTHENTICATION.md](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md)
- **データベース**: PostgreSQL（Prisma経由）
- **状態管理**: Composables (`useApiClient`, `useSessionAuth`)

### 命名規則統一
- **データベース**: `snake_case` (例: `tenant_id`, `created_at`)
- **API/JSON**: `camelCase` (例: `tenantId`, `createdAt`)
- **変数名**: `camelCase` (JavaScript/TypeScript標準)

**重要**: 同じ概念は必ず同じ名称を使用
- テナントID: DB=`tenant_id`, API/JSON=`tenantId`
- セッションID: DB=`session_id`, API/JSON=`sessionId`

---

## ⚠️ 必須要件（CRITICAL）

### 1. 認証統一要件
**ダッシュボードは必ず認証済みユーザーのみアクセス可能**

- **認証方式**: Session認証（Redis + HttpOnly Cookie）
- **ミドルウェア**: `01.admin-auth.ts` による自動認証チェック
- **権限**: 管理者権限必須（`requireAdmin()`）
- **未認証時**: 自動的に `/admin/login` へリダイレクト

### 2. API呼び出し統一要件
**全てのAPI呼び出しはhotel-commonを経由すること**

- **hotel-saas**: UIとAPI中継のみ
- **hotel-common**: 実際のデータ取得・集計処理
- **直接DB接続禁止**: hotel-saas内で直接Prismaを使用してはいけない

### 3. エラーハンドリング要件
**エラー発生時も画面は表示を継続する**

- **原則**: エラーが発生してもログアウトしない
- **表示**: 統計値は0またはデフォルト値を表示
- **ユーザーへの通知**: コンソールログ + 今後トースト通知実装予定
- **禁止**: 401エラーで即座にログアウトさせる実装

---

## 🎯 画面構成

### 画面パス
```
/admin/  (pages/admin/index.vue)
```

### レイアウト
```yaml
layout: admin
  - ヘッダー: ナビゲーションバー、ログアウトボタン
  - サイドバー: AdminSidebar.vue（機能メニュー）
  - メインコンテンツ: ダッシュボード本体
```

### 表示要素

#### 1. エコノミープランバナー
**コンポーネント**: `AdminPlanBanner`

**表示内容**:
- デバイス数の使用状況（制限あり・超過警告）
- 月次注文数の表示
- プラン変更への誘導（エコノミープラン限定）

**データソース**:
- `activeDevices`: `/api/v1/admin/devices/count`
- `monthlyOrders`: `/api/v1/admin/orders/monthly-count`

**SSR**: 無効化（`<ClientOnly>`）

---

#### 2. 統計カード（4枚）

##### (a) 今日の注文数
**API**: `/api/v1/admin/summary`  
**データパス**: `response.data.totalOrders`  
**表示形式**: 数値（例: `42`）  
**アイコン**: `heroicons:shopping-cart` (青色)

##### (b) 今日の売上
**API**: `/api/v1/admin/summary`  
**データパス**: `response.data.totalRevenue`  
**表示形式**: 通貨（例: `¥125,000`）  
**アイコン**: `heroicons:currency-yen` (緑色)

##### (c) アクティブデバイス数
**API**: `/api/v1/admin/devices/count`  
**データパス**: `response.data.count`  
**表示形式**: 数値（例: `8`）  
**アイコン**: `heroicons:device-tablet` (紫色)

##### (d) 処理待ち注文
**API**: `/api/v1/admin/orders` (query: `status=pending`)  
**データパス**: `response.data.orders.length`  
**表示形式**: 数値（例: `3`）  
**アイコン**: `heroicons:clock` (黄色)

---

#### 3. クイックアクション（6個）

**レイアウト**: 3列グリッド（モバイル1列、タブレット2列、デスクトップ3列）

| アクション | リンク先 | アイコン | 色 |
|-----------|---------|---------|-----|
| 注文管理 | `/admin/orders` | `heroicons:clipboard-document-list` | 青 |
| メニュー管理 | `/admin/menu` | `heroicons:book-open` | 緑 |
| デバイス管理 | `/admin/devices` | `heroicons:device-tablet` | 紫 |
| フロント業務 | `/admin/front-desk` | `heroicons:building-office` | インディゴ |
| 統計・分析 | `/admin/statistics` | `heroicons:chart-bar` | 赤 |
| 設定 | `/admin/settings` | `heroicons:cog-6-tooth` | グレー |

---

## 🔌 API仕様

### 1. サマリー統計API

#### エンドポイント
```
GET /api/v1/admin/summary
```

#### 実装ファイル
- **hotel-saas (中継)**: `/Users/kaneko/hotel-saas/server/api/v1/admin/summary.get.ts` (line 1-53)
- **hotel-common (実処理)**: `/Users/kaneko/hotel-common/src/routes/systems/saas/admin-dashboard.routes.ts` (line 16-100)
- **Composable**: `/Users/kaneko/hotel-saas/composables/useApiClient.ts` (line 125-128)

#### 認証
- **必須**: Session認証 + 管理者権限
- **hotel-saas側**: `01.admin-auth.ts`ミドルウェアで認証チェック
- **hotel-common側**: `UnifiedSessionMiddleware.authenticate()` + `requireAdmin()`

#### リクエスト（ブラウザ → hotel-saas → hotel-common）

**フロントエンド → hotel-saas**:
```typescript
authenticatedFetch('/api/v1/admin/summary', {
  query: {
    from: '2025-10-02',
    to: '2025-10-02'
  }
});
```

**hotel-saas → hotel-common**:
```http
GET http://localhost:3400/api/v1/admin/summary
Cookie: hotel_session={sessionId}
```

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `from` | string (ISO date) | No | 今日 | 集計開始日 |
| `to` | string (ISO date) | No | 今日 | 集計終了日 |

#### レスポンス（成功）

**⚠️ 重要: 型定義との不一致**

現在の実装（hotel-common）と型定義（types/hotel-common-api.ts）が**異なります**。

**実際の実装レスポンス** (hotel-common/src/routes/systems/saas/admin-dashboard.routes.ts):
```json
{
  "success": true,
  "data": {
    "summary": {
      "devices": {
        "total": 10,
        "active": 8,
        "inactive": 2,
        "active_rate": 80
      },
      "orders": {
        "total": 245,
        "today": 12,
        "growth_rate": 0
      },
      "campaigns": {
        "total": 5,
        "active": 3,
        "inactive": 2,
        "active_rate": 60
      },
      "timestamp": "2025-10-02T10:30:00.000Z"
    }
  }
}
```

**型定義** (types/hotel-common-api.ts line 109-120):
```typescript
export interface DashboardSummary {
  todayOrders: number;        // ❌ 実装では summary.orders.today
  todayRevenue: number;       // ❌ 実装には存在しない
  occupiedRooms: number;      // ❌ 実装には存在しない
  availableRooms: number;     // ❌ 実装には存在しない
  maintenanceRooms?: number;  // ❌ 実装には存在しない
}
```

**修正が必要な箇所**:
1. hotel-commonのレスポンス構造を変更して型定義に合わせる、または
2. 型定義を実装に合わせて修正する

**推奨**: 型定義を実装に合わせて修正
```typescript
// types/hotel-common-api.ts を修正
export interface DashboardSummary {
  summary: {
    devices: {
      total: number;
      active: number;
      inactive: number;
      active_rate: number;
    };
    orders: {
      total: number;
      today: number;
      growth_rate: number;
    };
    campaigns: {
      total: number;
      active: number;
      inactive: number;
      active_rate: number;
    };
    timestamp: string;
  };
}
```

**hotel-saas実装の修正**:
```typescript
// pages/admin/index.vue (line 249-253) を修正
// ❌ 間違い
todayOrders.value = statsResponse.data?.totalOrders || 0
todaySales.value = statsResponse.data?.totalRevenue || 0

// ✅ 正しい
todayOrders.value = statsResponse.data?.summary?.orders?.today || 0
todaySales.value = statsResponse.data?.summary?.orders?.total || 0  // または売上用の別フィールド
```

#### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "TENANT_ID_REQUIRED",
    "message": "テナントIDが必要です"
  }
}
```

**エラーコード**:
| コード | ステータス | 説明 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 認証されていない |
| `FORBIDDEN` | 403 | 管理者権限がない |
| `TENANT_ID_REQUIRED` | 400 | テナントIDが取得できない |
| `INTERNAL_ERROR` | 500 | サーバー内部エラー |

#### 実装詳細（hotel-common）
```typescript
// 並列処理でパフォーマンス向上
const [totalDevices, activeDevices, totalOrders, todayOrders, ...] = await Promise.all([
  hotelDb.getAdapter().deviceRoom.count({ where: { tenantId } }),
  hotelDb.getAdapter().deviceRoom.count({ where: { tenantId, status: 'ACTIVE' } }),
  hotelDb.getAdapter().order.count({ where: { tenantId, isDeleted: false } }),
  hotelDb.getAdapter().order.count({ 
    where: { 
      tenantId, 
      isDeleted: false,
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    }
  }),
  // ... 他の統計
]);
```

---

### 2. デバイス数取得API

#### エンドポイント
```
GET /api/v1/admin/devices/count
```

#### 実装ファイル
- **hotel-saas (中継)**: `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/count.get.ts` (line 1-59)
- **hotel-common (実処理)**: `/Users/kaneko/hotel-common/src/routes/systems/saas/admin-dashboard.routes.ts` (line 205-252)
- **Composable**: `/Users/kaneko/hotel-saas/composables/useApiClient.ts` (line 130-132)

#### システム間連携フロー
```
ブラウザ
  ↓ authenticatedFetch('/api/v1/admin/devices/count')
hotel-saas (Nuxt3 API)
  ↓ $fetch('http://localhost:3400/api/v1/devices/count')
  ↓ Cookie: hotel_session={sessionId}
hotel-common (Express API)
  ↓ UnifiedSessionMiddleware.authenticate()
  ↓ SessionAuthService.validateSession(sessionId)
Redis (セッションストア)
  ← session data
hotel-common
  ↓ hotelDb.getAdapter().deviceRoom.count()
PostgreSQL
  ← device count data
```

#### 認証
- **必須**: Session認証 + 管理者権限

#### リクエスト
```http
GET /api/v1/admin/devices/count
Cookie: hotel_session={sessionId}
```

#### レスポンス（成功）
```json
{
  "success": true,
  "data": {
    "total": 10,
    "by_type": {
      "tablet": {
        "total": 8,
        "active": 6,
        "inactive": 2
      },
      "smartphone": {
        "total": 2,
        "active": 2,
        "inactive": 0
      }
    },
    "by_status": {
      "ACTIVE": 8,
      "INACTIVE": 2
    }
  }
}
```

**データ構造**:
```typescript
interface DeviceCountResponse {
  success: boolean;
  data: {
    total: number;
    by_type: Record<string, {
      total: number;
      active: number;
      inactive: number;
    }>;
    by_status: Record<string, number>;
  };
}
```

---

### 3. 月次注文数取得API

#### エンドポイント
```
GET /api/v1/admin/orders/monthly-count
```

#### 実装ファイル
- **hotel-saas (中継)**: `/Users/kaneko/hotel-saas/server/api/v1/admin/orders/monthly-count.get.ts` (line 1-61)
- **hotel-common (実処理)**: `/Users/kaneko/hotel-common/src/routes/systems/saas/admin-dashboard.routes.ts` (line 258-321)
- **Composable**: `/Users/kaneko/hotel-saas/composables/useApiClient.ts` (line 134-136)

#### 認証
- **必須**: Session認証 + 管理者権限

#### リクエスト
```http
GET /api/v1/admin/orders/monthly-count?months=12
Cookie: hotel_session={sessionId}
```

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `months` | number | No | 12 | 取得する月数（最大24） |

#### レスポンス（成功）
```json
{
  "success": true,
  "data": {
    "period": "12 months",
    "data": [
      {
        "month": "2025-10",
        "order_count": 245,
        "total_revenue": 1250000,
        "average_order_value": 5102
      },
      {
        "month": "2025-09",
        "order_count": 198,
        "total_revenue": 990000,
        "average_order_value": 5000
      }
      // ... 過去12ヶ月分
    ],
    "summary": {
      "total_orders": 2450,
      "total_revenue": 12500000,
      "average_monthly_orders": 204
    }
  }
}
```

**データ構造**:
```typescript
interface MonthlyOrderCountResponse {
  success: boolean;
  data: {
    period: string; // "N months"
    data: Array<{
      month: string; // "YYYY-MM" format
      order_count: number;
      total_revenue: number;
      average_order_value: number;
    }>;
    summary: {
      total_orders: number;
      total_revenue: number;
      average_monthly_orders: number;
    };
  };
}
```

#### 実装詳細（hotel-common）
```typescript
// PostgreSQL の DATE_TRUNC を使用した月次集計
const monthlyOrders = await hotelDb.getClient().$queryRaw`
  SELECT 
    DATE_TRUNC('month', "createdAt") as month,
    COUNT(*) as order_count,
    SUM("total") as total_revenue,
    AVG("total") as average_order_value
  FROM "Order"
  WHERE "tenantId" = ${tenantId}
    AND "createdAt" >= ${startDate}
    AND "isDeleted" = false
  GROUP BY DATE_TRUNC('month', "createdAt")
  ORDER BY month DESC
`;
```

---

### 4. 処理待ち注文取得API

#### エンドポイント
```
GET /api/v1/admin/orders
```

#### 実装ファイル
- **hotel-saas (中継)**: hotel-saasには専用APIなし（hotel-commonを直接呼び出し）
- **hotel-common (実処理)**: `/Users/kaneko/hotel-common/src/routes/systems/saas/admin-dashboard.routes.ts` (line 327-431)
- **フロントエンド呼び出し**: `/Users/kaneko/hotel-saas/pages/admin/index.vue` (line 213-218)

#### 認証
- **必須**: Session認証 + 管理者権限

#### リクエスト
```http
GET /api/v1/admin/orders?status=pending&page=1&limit=20
Cookie: hotel_session={sessionId}
```

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `status` | string | No | - | 注文ステータスフィルタ |
| `page` | number | No | 1 | ページ番号 |
| `limit` | number | No | 20 | 1ページあたりの件数（最大100） |
| `roomId` | string | No | - | 部屋IDフィルタ |
| `startDate` | string (ISO) | No | - | 開始日フィルタ |
| `endDate` | string (ISO) | No | - | 終了日フィルタ |

#### レスポンス（成功）
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "01J...",
        "tenantId": "default",
        "roomId": "101",
        "status": "pending",
        "total": 3500,
        "createdAt": "2025-10-02T09:30:00.000Z",
        "updatedAt": "2025-10-02T09:30:00.000Z",
        "paidAt": null,
        "items": [
          {
            "id": "01J...",
            "name": "コーヒー",
            "price": 500,
            "quantity": 1,
            "status": "pending",
            "notes": null,
            "deliveredAt": null
          }
        ]
      }
    ],
    "summary": {
      "total_orders": 3,
      "filtered_orders": 3
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

---

## 💻 フロントエンド実装

### ファイルパス
```
/Users/kaneko/hotel-saas/pages/admin/index.vue
```

### コンポーネント構成
```vue
<template>
  <div class="p-6">
    <!-- エコノミープランバナー -->
    <ClientOnly>
      <AdminPlanBanner :device-count="activeDevices" :monthly-orders="monthlyOrders" :is-loading="isLoading" />
    </ClientOnly>

    <!-- ヘッダー -->
    <div class="mb-8">
      <h1>管理画面</h1>
      <p>ホテルSaaSシステムの管理機能</p>
    </div>

    <!-- 統計カード（4枚） -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- 今日の注文数、今日の売上、アクティブデバイス、処理待ち注文 -->
    </div>

    <!-- クイックアクション -->
    <div class="bg-white rounded-lg shadow">
      <!-- 6個のアクションカード -->
    </div>
  </div>
</template>
```

### データ取得ロジック

**実装ファイル**: `/Users/kaneko/hotel-saas/pages/admin/index.vue` (line 151-256)

```typescript
// composables
const { authenticatedFetch } = useApiClient();
const { isAuthenticated, initialize } = useSessionAuth();

// 統計データ取得
const fetchStats = async () => {
  // 重複実行防止
  if (isLoading.value || hasLoaded.value) {
    console.log('🔄 統計データ取得: 既に実行中または完了済みのためスキップ');
    return;
  }

  try {
    isLoading.value = true;
    console.log('📊 ダッシュボード統計データ取得開始');

    // 🔒 認証方式: セッション認証 (session-based design)
    // 認証状態の初期化を確実に待つ
    if (!isAuthenticated.value) {
      console.log('🔐 セッション認証状態を初期化中...');
      await initialize();

      // 初期化後も認証されていない場合は処理を中断
      if (!isAuthenticated.value) {
        console.warn('🔐 セッション認証状態の初期化に失敗しました');
        return;
      }
    }

    console.log('🔐 認証状態確認完了、API呼び出し開始');

    // 並列でAPI呼び出しを実行（パフォーマンス向上）
    const [statsResponse, deviceResponse, pendingResponse, monthlyResponse] = await Promise.all([
      // 今日の注文統計を取得
      authenticatedFetch('/api/v1/admin/summary', {
        query: {
          from: new Date().toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        }
      }),
      // アクティブデバイス数を取得
      authenticatedFetch('/api/v1/admin/devices/count'),
      // 処理待ち注文数を取得
      authenticatedFetch('/api/v1/admin/orders', {
        query: { status: 'pending' }
      }),
      // 月次注文数を取得
      authenticatedFetch('/api/v1/admin/orders/monthly-count')
    ]);

    // データを設定
    todayOrders.value = statsResponse.data?.totalOrders || 0;
    todaySales.value = statsResponse.data?.totalRevenue || 0;
    activeDevices.value = deviceResponse.data?.count || 0;
    pendingOrders.value = pendingResponse.data?.orders?.length || 0;
    monthlyOrders.value = monthlyResponse?.monthlyCount?.totalCount || 0;

    hasLoaded.value = true;
    console.log('✅ ダッシュボード統計データ取得完了');

  } catch (error) {
    console.error('統計データ取得エラー:', error);

    // エラーメッセージを表示（ログアウトしない）
    if (error?.statusCode === 401) {
      // 認証エラー時
      console.warn('🔐 認証エラーが発生しました。トークンを確認してください。');
      // TODO: トースト通知やエラーメッセージ表示
    } else if (error?.statusCode === 403) {
      // 権限エラー時
      console.warn('🚫 このデータにアクセスする権限がありません。');
    } else if (error?.statusCode >= 500) {
      // サーバーエラー時
      console.warn('🔧 サーバーエラーが発生しました。しばらく後でお試しください。');
    } else {
      // その他のエラー時
      console.warn('⚠️ データの取得に失敗しました。ネットワーク接続を確認してください。');
    }
  } finally {
    isLoading.value = false;
  }
};

// コンポーネントマウント時に統計データを取得
onMounted(() => {
  fetchStats();
});
```

### 使用するComposable

#### useApiClient
**実装**: `/Users/kaneko/hotel-saas/composables/useApiClient.ts`

**主要メソッド**:
```typescript
const { authenticatedFetch, adminApi } = useApiClient();

// 汎用認証付きFetch
authenticatedFetch<T>(url: string, options?: any): Promise<T>

// 管理画面API専用ヘルパー
adminApi.getSummary(params?: any)
adminApi.getDeviceCount()
adminApi.getMonthlyOrderCount()
```

**特徴**:
- HttpOnly Cookieによる自動セッション認証
- 401エラー時の自動リトライ（1回のみ）
- テナントIDの自動付与（`X-Tenant-ID`ヘッダー）
  - 取得元: `user.tenant_id` (認証SSOTと同じフィールド名)
- `credentials: 'include'`で必ずCookieを送信

**認証SSOT連携**:
- セッション情報: [SSOT_SAAS_ADMIN_AUTHENTICATION.md](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md)
- `user.tenant_id`: スタッフの所属テナントID（DB: `staff.tenant_id`）
- `user.email`: ログインメールアドレス（DB: `staff.email`）
- `user.role`: 役割（DB: `staff.role`）

---

## 🗄️ データベーススキーマ

### 命名規則（Prisma）
- **フィールド名**: `camelCase` (Prismaのデフォルト)
- **実際のカラム名（PostgreSQL）**: `snake_case` (@@map で変換)
- **重要**: 認証SSOTと同じ概念は同じ命名
  - DB: `tenant_id` (PostgreSQL) ↔ Prisma: `tenantId`

### 使用テーブル

#### 1. Order（注文）
```prisma
model Order {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")    // ← 認証SSOTと統一
  roomId      String   @map("room_id")
  status      String   // "pending", "confirmed", "preparing", "delivered", "cancelled"
  total       Float
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  paidAt      DateTime? @map("paid_at")
  isDeleted   Boolean  @default(false) @map("is_deleted")
  
  OrderItem   OrderItem[]
  
  @@map("orders")  // PostgreSQLテーブル名（snake_case）
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@index([roomId])
}
```

**マッピング**:
- Prisma: `tenantId` (camelCase)
- PostgreSQL: `tenant_id` (snake_case)
- API/JSON: `tenantId` (camelCase)
- 認証SSOT: `staff.tenant_id` と同じ概念

#### 2. OrderItem（注文アイテム）
```prisma
model OrderItem {
  id          String   @id @default(uuid())
  orderId     String   @map("order_id")
  tenantId    String   @map("tenant_id")  // ← 認証SSOTと統一
  name        String
  price       Float
  quantity    Int
  status      String   // "pending", "preparing", "delivered", "cancelled"
  notes       String?
  deliveredAt DateTime? @map("delivered_at")
  createdAt   DateTime @default(now()) @map("created_at")
  
  Order       Order    @relation(fields: [orderId], references: [id])
  
  @@map("order_items")  // PostgreSQLテーブル名（snake_case）
  @@index([orderId])
  @@index([tenantId])
  @@index([tenantId, name])
}
```

#### 3. DeviceRoom（デバイス）
```prisma
model DeviceRoom {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")  // ← 認証SSOTと統一
  roomId      String   @map("room_id")
  deviceType  String   @map("device_type")  // "tablet", "smartphone", etc.
  status      String   // "ACTIVE", "INACTIVE"
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  @@map("device_rooms")  // PostgreSQLテーブル名（snake_case）
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, deviceType])
}
```

#### 4. Campaign（キャンペーン）
```prisma
model Campaign {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")  // ← 認証SSOTと統一
  status      String   // "ACTIVE", "INACTIVE", "SCHEDULED", "EXPIRED"
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  @@map("campaigns")  // PostgreSQLテーブル名（snake_case）
  @@index([tenantId])
  @@index([tenantId, status])
}
```

#### 5. Staff（スタッフ）- 認証SSOTから参照
認証に使用するスタッフテーブルの詳細は以下を参照:
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md - staff テーブル](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md#staff%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB)

**主要フィールド**:
- `tenant_id`: テナントID（全テーブルで統一）
- `email`: ログインメールアドレス（UNIQUE）
- `password_hash`: bcryptハッシュ化パスワード
- `role`: 役割（admin/manager/staff）

---

## 🔧 環境変数

### hotel-saas
```bash
# hotel-common API接続先
HOTEL_COMMON_API_URL=http://localhost:3400

# Redis接続（セッション認証用）
REDIS_URL=redis://localhost:6379
```

### hotel-common
```bash
# データベース接続
DATABASE_URL=postgresql://user:password@localhost:5432/hotel_db

# Redis接続（セッション認証用）
REDIS_URL=redis://localhost:6379

# サーバーポート
PORT=3400
```

---

## ⚠️ 既知の問題

### 🔴 問題1: hotel-saas API中継の不一致（軽微）

**症状**: 
- `/api/v1/admin/devices/count` → hotel-commonでは `/api/v1/devices/count` にリクエスト
- パスが不一致

**実装**:
```typescript
// /Users/kaneko/hotel-saas/server/api/v1/admin/devices/count.get.ts (line 37-45)
const baseUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
const response = await $fetch(`${baseUrl}/api/v1/devices/count`, {  // ← /admin なし
  method: 'GET',
  headers: { ... }
})
```

**影響**: 
- 動作はするが、APIパスの一貫性がない
- hotel-commonでは`admin-dashboard.routes.ts`でなく`device-status.routes.ts`が処理

**対応**: 
- hotel-commonのAPIパスを `/api/v1/admin/devices/count` に統一するか
- または、hotel-saasが `/api/v1/devices/count` を呼び出すように変更

---

### 問題2: growth_rate未実装
**症状**: `summary.orders.growth_rate` が常に0  
**原因**: 前日比計算ロジック未実装  
**影響**: 売上成長率が表示されない  
**対応**: TODO コメント記載済み（`/Users/kaneko/hotel-common/src/routes/systems/saas/admin-dashboard.routes.ts` line 83）

---

### 問題3: エラー時のユーザー通知不足
**症状**: API呼び出し失敗時、コンソールログのみ  
**原因**: トースト通知機能未実装  
**影響**: ユーザーがエラーに気づきにくい  
**対応**: TODO コメント記載済み（`/Users/kaneko/hotel-saas/pages/admin/index.vue` line 237）

---

## 📊 パフォーマンス最適化

### 並列API呼び出し
```typescript
// ❌ 逐次実行（遅い）
const stats = await fetch('/api/v1/admin/summary');
const devices = await fetch('/api/v1/admin/devices/count');
const orders = await fetch('/api/v1/admin/orders');

// ✅ 並列実行（速い）
const [stats, devices, orders] = await Promise.all([
  fetch('/api/v1/admin/summary'),
  fetch('/api/v1/admin/devices/count'),
  fetch('/api/v1/admin/orders')
]);
```

### データベースクエリ最適化
```typescript
// hotel-common内での並列クエリ実行
const [totalDevices, activeDevices, totalOrders, ...] = await Promise.all([
  hotelDb.getAdapter().deviceRoom.count(...),
  hotelDb.getAdapter().deviceRoom.count(...),
  hotelDb.getAdapter().order.count(...)
]);
```

### インデックス活用
```sql
-- 頻繁に使用するクエリ条件にインデックスを設定
CREATE INDEX idx_order_tenant_status ON "Order"(tenantId, status);
CREATE INDEX idx_order_tenant_created ON "Order"(tenantId, createdAt);
CREATE INDEX idx_device_tenant_status ON "DeviceRoom"(tenantId, status);
```

---

## 🧪 テスト要件

### 単体テスト
```typescript
describe('Dashboard API', () => {
  it('GET /api/v1/admin/summary - 認証済みユーザーは統計を取得できる', async () => {
    // ...
  });

  it('GET /api/v1/admin/summary - 未認証ユーザーは401エラー', async () => {
    // ...
  });

  it('GET /api/v1/admin/devices/count - デバイス数を取得できる', async () => {
    // ...
  });
});
```

### E2Eテスト
```typescript
describe('ダッシュボード画面', () => {
  it('ログイン後、ダッシュボードが表示される', async () => {
    await login();
    await expect(page).toHaveURL('/admin');
    await expect(page.getByText('管理画面')).toBeVisible();
  });

  it('統計カードに正しい値が表示される', async () => {
    await expect(page.getByText('今日の注文数')).toBeVisible();
    await expect(page.getByText('今日の売上')).toBeVisible();
  });
});
```

---

## 📝 実装チェックリスト

### フロントエンド（hotel-saas）
- [x] ダッシュボードページ作成（`pages/admin/index.vue`）
- [x] 統計カード4枚実装
- [x] クイックアクション6個実装
- [x] エコノミープランバナー実装
- [x] 認証チェック実装
- [x] 並列API呼び出し実装
- [x] エラーハンドリング実装（ログアウトしない方式）
- [ ] トースト通知実装（TODO）

### バックエンド（hotel-common）
- [x] サマリーAPI実装（`/api/v1/admin/summary`）
- [x] デバイス数API実装（`/api/v1/admin/devices/count`）
- [x] 月次注文数API実装（`/api/v1/admin/orders/monthly-count`）
- [x] 注文一覧API実装（`/api/v1/admin/orders`）
- [x] Session認証ミドルウェア統合
- [x] 管理者権限チェック実装
- [x] マルチテナント対応（tenant_id必須）
- [x] 並列クエリ最適化
- [ ] growth_rate計算実装（TODO）

### データベース
- [x] Orderテーブル作成
- [x] OrderItemテーブル作成
- [x] DeviceRoomテーブル作成
- [x] Campaignテーブル作成
- [x] 必要なインデックス作成

---

## 🚀 今後の拡張予定

### フェーズ2
- トースト通知機能実装
- リアルタイム統計更新（WebSocket/SSE）
- ダッシュボードカスタマイズ機能
- グラフ・チャート追加

### フェーズ3
- 売上成長率計算（前日比・前月比）
- 高度な分析機能（トレンド分析・予測）
- エクスポート機能（CSV/Excel）
- ダッシュボードウィジェット追加

---

## 🎬 実行トレース結果（実測値）

### トレース実行日時
**日時**: 2025年10月2日 14:58:05  
**環境**: 開発環境（hotel-saas: 3100, hotel-common: 3400）

### ダッシュボード表示フロー（実測）

#### 1. 認証フロー
```
T+0ms    [hotel-saas] ページマウント
T+10ms   [hotel-saas] 認証初期化開始
T+15ms   [hotel-saas] セッション認証成功
         └─ ユーザー: admin@omotenasuai.com (admin)
         └─ テナント: default
```

#### 2. 並列API呼び出し（4本同時）
```
T+20ms   [hotel-saas] 並列API開始
         ├─ GET /api/v1/admin/summary
         ├─ GET /api/v1/admin/devices/count
         ├─ GET /api/v1/admin/orders?status=pending
         └─ GET /api/v1/admin/orders/monthly-count

T+25ms   [hotel-common] 各API処理開始
```

#### 3. データベースクエリ実行（hotel-common側）

**デバイス数API** (`/api/v1/devices/count`):
```
T+25ms   PostgreSQL: COUNT device_rooms (tenantId=default)
         ├─ 総デバイス数: 24ms
         ├─ アクティブデバイス数: 並列実行
         └─ デバイス種別集計: GROUP BY

T+49ms   レスポンス返却 (処理時間: 24ms)
```

**注文一覧API** (`/api/v1/admin/orders`):
```
T+25ms   PostgreSQL: COUNT + SELECT Order
         ├─ WHERE: tenantId=default, isDeleted=false, status=pending
         └─ ORDER BY: createdAt DESC, LIMIT 20

T+60ms   レスポンス返却 (処理時間: 35ms)
```

**サマリーAPI** (`/api/v1/admin/summary`):
```
❌ 認証エラー: 401 Unauthorized
原因: Cookieが正しく送信されていない
```

**月次注文数API** (`/api/v1/admin/orders/monthly-count`):
```
❌ 認証エラー: 401 Unauthorized
原因: Cookieが正しく送信されていない
```

### パフォーマンス分析

#### 成功したAPI
| API | 処理時間 | データベースクエリ数 | レスポンスサイズ |
|-----|---------|-------------------|----------------|
| `/api/v1/admin/devices/count` | 24ms | 5回（並列） | ~200 bytes |
| `/api/v1/admin/orders` | 35ms | 2回（COUNT + SELECT） | ~1KB |

#### ボトルネック
1. **PostgreSQL GROUP BY**: 24msのうち約15msを消費
2. **複数COUNT**: 並列化により最適化済み
3. **Cookie認証エラー**: 一部APIで認証が失敗

### 🙋‍♂️ hotel-commonチームからの質問事項（2025年10月2日）

#### 質問1: SSOTと型定義の不一致について
**質問内容**:
> SSOTドキュメント (line 196-220) では複雑なネスト構造 (data.summary.orders.today) が定義されていますが、types/hotel-common-api.ts では単純な構造 (data.todayOrders) になっています。どちらが正しい仕様ですか？

**回答**:
✅ **hotel-commonの実装（ネスト構造）が正しい仕様です**

**理由**:
1. hotel-commonの実装は既に稼働中の実装
2. ネスト構造により、データの意味が明確
3. 将来の拡張性が高い（`summary.devices`, `summary.campaigns` など）

**修正が必要な箇所**:
- ❌ hotel-commonの実装を変更する（破壊的変更）
- ✅ `types/hotel-common-api.ts` を実装に合わせて修正する
- ✅ `pages/admin/index.vue` のデータ取得ロジックを修正する

**担当**: Sun (hotel-saas)

---

#### 質問2: Cookieの根本原因について
**質問内容**:
> 現在ログで authjs.csrf-token が送信されていることが確認されていますが、これはログイン時にhotel-session-idクッキーが正しく設定されていないことを意味します。この根本原因を先に解決すべきでしょうか？

**回答**:
✅ **はい、これは優先的に解決すべき根本的な問題です**

**現状の問題**:
```
ログ出力:
🍪 Cookie設定: hotel-session-id = c7b1a06e7e6fe660... (httpOnly, sameSite=strict)
🔍 送信ヘッダー: { hasCookie: true, cookiePreview: 'authjs.csrf-token=84e11eeb...' }
```
- ログイン時に `hotel-session-id` は設定されている
- しかし、hotel-saas → hotel-common のAPI呼び出し時には `authjs.csrf-token` が送信されている
- **結論**: Cookie自体は設定されているが、API中継時に正しく転送されていない

**根本原因**:
hotel-saasのAPI中継層（`/api/v1/admin/summary.get.ts` など）で、Cookieを明示的に転送していない

**修正方針**:
```typescript
// hotel-saas側の全API中継ファイルで修正
const response = await $fetch(`${baseUrl}/api/v1/admin/summary`, {
  headers: {
    Cookie: event.node.req.headers.cookie || '',  // ← これを追加
    'X-Tenant-ID': tenantId
  },
  credentials: 'include'
});
```

**影響範囲**: 
- ダッシュボード機能全体
- 他の管理画面機能（注文管理、メニュー管理など）
- hotel-saas → hotel-common の全API呼び出し

**担当**: Sun (hotel-saas) - 全API中継ファイルの修正
**優先度**: 🔴 最高（他の機能にも影響）

---

#### 質問3: Cookie問題はダッシュボードだけの問題か？
**質問内容**:
> SSOT (line 1089-1103) では「Cookie送信の不整合」が既知の問題として記載されており、hotel_sessionではなくauthjs.csrf-tokenが送信されている ことが明記されています。これは認証システム全体の問題であり、ダッシュボードだけの修正では解決しないのではないでしょうか？

**回答**:
✅ **その通りです。これは認証システム全体に関わる横断的な問題です**

**問題の性質**:
- **影響範囲**: hotel-saas → hotel-common の全API呼び出し
- **根本原因**: hotel-saasのAPI中継層の実装パターン
- **ダッシュボード固有の問題ではない**: 他の管理画面機能にも同様の問題が存在する可能性が高い

**対応方針**:
1. **短期対応（今すぐ）**: ダッシュボードで使用する4つのAPI中継ファイルを修正
   - `/api/v1/admin/summary.get.ts`
   - `/api/v1/admin/devices/count.get.ts`
   - `/api/v1/admin/orders/monthly-count.get.ts`
   - その他の管理画面API

2. **中期対応（次のスプリント）**: 共通化されたAPI中継ヘルパー関数を作成
   ```typescript
   // composables/useHotelCommonProxy.ts
   export const useHotelCommonProxy = () => {
     const proxyToHotelCommon = async (path: string, options?: any) => {
       const event = useRequestEvent()
       return await $fetch(`${baseUrl}${path}`, {
         ...options,
         headers: {
           ...options?.headers,
           Cookie: event?.node?.req?.headers?.cookie || '',
         },
         credentials: 'include'
       })
     }
     return { proxyToHotelCommon }
   }
   ```

3. **長期対応（リファクタリング）**: 認証SSOTを更新し、全システムで統一された実装パターンを適用

**参照ドキュメント**:
- [AUTHENTICATION_MASTER_SPECIFICATION.md](/Users/kaneko/hotel-kanri/docs/AUTHENTICATION_MASTER_SPECIFICATION.md)
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md)

**担当**:
- 短期対応: Sun (hotel-saas)
- 中期対応: hotel-kanri (共通化設計)
- 長期対応: 全システム横断タスク

**優先度**: 🔴 最高（認証システム全体の信頼性に影響）

---

### 検出された問題

#### 🔴 問題1: API レスポンス構造と型定義の不一致
**優先度**: 🔴 最高（即時対応必要）

**症状**: 
- hotel-common実装: `{ data: { summary: { orders: { today } } } }`
- types定義: `DashboardSummary { todayOrders, todayRevenue }`
- hotel-saas実装: `statsResponse.data?.totalOrders` で取得しようとしている

**影響**: 
- hotel-saas側でデータが正しく取得できない
- TypeScriptの型チェックが機能していない
- ダッシュボードに統計情報が表示されない

**対応（Sunが実施）**: 
1. types/hotel-common-api.ts の `DashboardSummary` を実装に合わせて修正
2. hotel-saas/pages/admin/index.vue のデータ取得ロジックを修正
3. TypeScript型チェックを通す

**修正後の正しいコード**:
```typescript
// 正しいデータ取得
todayOrders.value = statsResponse.data?.summary?.orders?.today || 0
```

---

#### 🔴 問題2: Cookie送信の不整合
**優先度**: 🔴 最高（認証システム全体に影響）

**症状**: 
- `/api/v1/admin/devices/count` は成功（200 OK）
- `/api/v1/admin/summary` は失敗（401 Unauthorized）
- 同じセッションで異なる結果

**原因**:
```
ログ出力:
🔍 送信ヘッダー: { hasCookie: true,
  cookiePreview: 'authjs.csrf-token=84e11eeb...' }
```
- hotel_sessionではなくauthjs.csrf-tokenが送信されている
- hotel-saas側のAPI中継で正しいCookieが転送されていない

**根本原因**: 
hotel-saas → hotel-common の API中継で、`$fetch` が自動的にCookieを転送していない

**影響範囲**: 
- 全ての hotel-saas → hotel-common API呼び出し
- ダッシュボード以外の機能にも影響

**対応（認証SSOT参照）**: 
- hotel-saas側のAPI中継層で Cookie を明示的に転送
- `event.node.req.headers.cookie` を hotel-common に転送する実装を追加
- 認証SSOTに記載の修正方針に従う

#### 🟡 問題3: テナントIDのUUID検証エラー
**優先度**: 🟡 高（本番事故リスク）

**症状**:
```
認証ログ記録API エラー: ZodError: [
  {
    "validation": "uuid",
    "message": "テナントIDは有効なUUIDである必要があります",
    "path": ["tenantId"]
  }
]
```

**原因**:
- テナントID "default" はUUID形式ではない（開発環境で使用）
- hotel-commonのZodスキーマがUUID必須と定義（`/api/v1/logs/auth.ts` line 16）
- 本番環境ではUUID必須だが、開発環境でのみ許可される想定で実装されている

**影響**: 
- 認証ログが記録されない（400 Bad Request）
- 監査証跡が不完全になる
- 開発と本番の動作が乖離し、本番でのデバッグが困難

**対応（Izaが実施 - hotel-common）**: 
**❌ 誤った方針（採用しない）**:
```typescript
// ❌ 開発環境のみ緩い検証（本番と開発の不一致を生む）
const schema = process.env.NODE_ENV === 'production' 
  ? z.string().uuid()
  : z.string().min(1)
```

**✅ 正しい方針（本番・開発の統一）**:
```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/logs/auth.ts (line 16)
// 修正前:
tenantId: z.string().uuid('テナントIDは有効なUUIDである必要があります'),

// 修正後:
tenantId: z.string().uuid('テナントIDは有効なUUIDである必要があります'),
```

**根本的な解決策**:
1. **開発環境でも本番と同じUUID形式のテナントIDを使用**
2. **"default"の使用を段階的に廃止**
   - 既存の"default"を有効なUUIDに置き換える
   - 新規開発では最初からUUIDを使用
3. **データベーススクリプトで"default"を自動変換**
   ```sql
   -- migration script
   UPDATE "Tenant" SET id = gen_random_uuid()::text WHERE id = 'default';
   UPDATE "staff" SET tenant_id = (SELECT id FROM "Tenant" LIMIT 1) WHERE tenant_id = 'default';
   -- 他のテーブルも同様に更新
   ```

**テナントID仕様の明確化**:
- 本番環境: UUID形式必須（例: `550e8400-e29b-41d4-a716-446655440000`）
- 開発環境: **本番と同一のUUID形式を使用**（事故防止）
- テスト環境: UUID形式を使用（本番と同じ検証ロジック）

**重要**: 
- 本番と開発の同一性を保つことで、本番環境での予期しないバリデーションエラーを防止
- 開発環境で"default"が動作しても、本番では動作しない状況を避ける
- すべての環境で同じZodスキーマを使用し、環境差異による事故を防ぐ

### 最適化提案

#### 1. インデックス最適化
現在のクエリパターンに最適化されたインデックス：
```sql
-- デバイス集計用
CREATE INDEX idx_device_rooms_tenant_type_status 
  ON device_rooms(tenantId, deviceType, status);

-- 注文検索用
CREATE INDEX idx_order_tenant_status_created 
  ON "Order"(tenantId, status, createdAt DESC);
```
**期待効果**: クエリ時間を50%削減（24ms → 12ms）

#### 2. キャッシュ戦略
```typescript
// Redis キャッシュ (TTL: 30秒)
const cacheKey = `dashboard:summary:${tenantId}:${date}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// キャッシュなし: DBクエリ実行
const result = await fetchFromDB();
await redis.setex(cacheKey, 30, JSON.stringify(result));
```
**期待効果**: 初回以降のロード時間90%削減

#### 3. Cookie転送の統一
```typescript
// hotel-saas側の修正
const response = await $fetch(`${baseUrl}/api/v1/admin/summary`, {
  headers: {
    Cookie: event.node.req.headers.cookie || '', // 全Cookie転送
    'X-Tenant-ID': tenantId
  },
  credentials: 'include'
});
```

---

## 📋 修正タスク一覧

### 🔴 緊急（即時対応）

#### タスク1: 型定義とデータ取得の修正
**担当**: Sun (hotel-saas)  
**期限**: 即時  
**優先度**: 🔴 最高

**修正ファイル**:
1. `/Users/kaneko/hotel-saas/types/hotel-common-api.ts` (line 109-120)
   ```typescript
   // 修正前
   export interface DashboardSummary {
     todayOrders: number;
     todayRevenue: number;
     occupiedRooms: number;
     availableRooms: number;
     maintenanceRooms?: number;
   }
   
   // 修正後
   export interface DashboardSummary {
     summary: {
       devices: {
         total: number;
         active: number;
         inactive: number;
         active_rate: number;
       };
       orders: {
         total: number;
         today: number;
         growth_rate: number;
       };
       campaigns: {
         total: number;
         active: number;
         inactive: number;
         active_rate: number;
       };
       timestamp: string;
     };
   }
   ```

2. `/Users/kaneko/hotel-saas/pages/admin/index.vue` (line 257-258)
   ```typescript
   // 修正前
   todayOrders.value = statsResponse.data?.todayOrders || 0
   todaySales.value = statsResponse.data?.todayRevenue || 0
   
   // 修正後
   todayOrders.value = statsResponse.data?.summary?.orders?.today || 0
   todaySales.value = statsResponse.data?.summary?.orders?.total || 0  // または売上用フィールド
   ```

**確認方法**:
```bash
# TypeScript型チェック
cd /Users/kaneko/hotel-saas
npm run type-check

# ダッシュボードにアクセスして統計情報が正しく表示されることを確認
```

---

#### タスク2: Cookie転送の修正
**担当**: Sun (hotel-saas)  
**期限**: 即時  
**優先度**: 🔴 最高

**修正対象ファイル**:
1. `/Users/kaneko/hotel-saas/server/api/v1/admin/summary.get.ts`
2. `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/count.get.ts`
3. `/Users/kaneko/hotel-saas/server/api/v1/admin/orders/monthly-count.get.ts`
4. その他の hotel-common へのAPI中継ファイル

**修正パターン**:
```typescript
// 修正前
const response = await $fetch(`${baseUrl}/api/v1/admin/summary`, {
  method: 'GET',
  headers: {
    'X-Tenant-ID': tenantId,
    'Content-Type': 'application/json',
  },
});

// 修正後
const response = await $fetch(`${baseUrl}/api/v1/admin/summary`, {
  method: 'GET',
  headers: {
    'X-Tenant-ID': tenantId,
    'Content-Type': 'application/json',
    'Cookie': event.node.req.headers.cookie || '',  // ← 追加
  },
  credentials: 'include',
});
```

**確認方法**:
```bash
# hotel-saasのログで Cookie送信を確認
tail -f /Users/kaneko/hotel-saas/.output/server/logs/app.log | grep "送信ヘッダー"

# hotel-commonのログで認証成功を確認
tail -f /Users/kaneko/hotel-common/logs/app.log | grep "401"
```

---

#### タスク3: テナントID "default" の UUID化
**担当**: Iza (hotel-common) + データベース管理者  
**期限**: 即時  
**優先度**: 🟡 高

**ステップ1: データベースマイグレーション**
```sql
-- 1. 新しいUUID形式のテナントIDを生成
DO $$
DECLARE
  new_tenant_id TEXT;
BEGIN
  -- "default"が存在する場合のみ実行
  IF EXISTS (SELECT 1 FROM "Tenant" WHERE id = 'default') THEN
    -- 新しいUUIDを生成
    new_tenant_id := gen_random_uuid()::text;
    
    -- Tenantテーブル更新
    UPDATE "Tenant" SET id = new_tenant_id WHERE id = 'default';
    
    -- 関連テーブル更新（外部キー制約により自動更新される場合はスキップ）
    UPDATE "staff" SET tenant_id = new_tenant_id WHERE tenant_id = 'default';
    UPDATE "Order" SET "tenantId" = new_tenant_id WHERE "tenantId" = 'default';
    UPDATE "device_rooms" SET "tenantId" = new_tenant_id WHERE "tenantId" = 'default';
    UPDATE "Campaign" SET "tenantId" = new_tenant_id WHERE "tenantId" = 'default';
    
    RAISE NOTICE '✅ テナントID "default" を % に更新しました', new_tenant_id;
  ELSE
    RAISE NOTICE 'ℹ️  テナントID "default" は存在しません（既に移行済み）';
  END IF;
END $$;
```

**ステップ2: 環境変数の更新**
```bash
# hotel-saas/.env
DEFAULT_TENANT_ID=<新しく生成されたUUID>

# hotel-common/.env
DEFAULT_TENANT_ID=<新しく生成されたUUID>
```

**ステップ3: Zodスキーマは変更不要**
```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/logs/auth.ts (line 16)
// 変更なし（UUID検証を維持）
tenantId: z.string().uuid('テナントIDは有効なUUIDである必要があります'),
```

**確認方法**:
```bash
# データベースで確認
psql -d hotel_db -c "SELECT id, name FROM \"Tenant\" WHERE id = 'default';"
# → 0 rows (削除されていることを確認)

psql -d hotel_db -c "SELECT id, name FROM \"Tenant\" LIMIT 5;"
# → すべてUUID形式であることを確認

# 認証ログが正常に記録されることを確認
tail -f /Users/kaneko/hotel-common/logs/app.log | grep "認証ログ記録API"
```

---

### 🟡 中期対応（次のスプリント）

#### タスク4: API中継共通化
**担当**: hotel-kanri (設計) + Sun (実装)  
**期限**: 次のスプリント  
**優先度**: 🟡 中

**新規ファイル作成**:
```typescript
// /Users/kaneko/hotel-saas/composables/useHotelCommonProxy.ts
export const useHotelCommonProxy = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.hotelCommonApiUrl || 'http://localhost:3400'
  
  const proxyToHotelCommon = async (path: string, options?: any) => {
    const event = useRequestEvent()
    
    // Cookie転送を自動化
    const headers = {
      ...options?.headers,
      'Cookie': event?.node?.req?.headers?.cookie || '',
    }
    
    // X-Tenant-ID の自動付与
    const session = event?.context?.session
    if (session?.tenant_id) {
      headers['X-Tenant-ID'] = session.tenant_id
    }
    
    return await $fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })
  }
  
  return { proxyToHotelCommon }
}
```

**既存ファイルのリファクタリング**:
```typescript
// /Users/kaneko/hotel-saas/server/api/v1/admin/summary.get.ts
import { useHotelCommonProxy } from '~/composables/useHotelCommonProxy'

export default defineEventHandler(async (event) => {
  const { proxyToHotelCommon } = useHotelCommonProxy()
  const query = getQuery(event)
  
  // シンプルに呼び出せる
  return await proxyToHotelCommon('/api/v1/admin/summary', {
    method: 'GET',
    query,
  })
})
```

---

### 🟢 長期対応（将来）

#### タスク5: 認証システム全体のリファクタリング
**担当**: 全システム横断タスク  
**期限**: 将来のスプリント  
**優先度**: 🟢 低

**目標**:
- Cookie転送の統一パターン確立
- 認証SSOT の完全実装
- 全システムでの一貫した認証フロー

**参照ドキュメント**:
- [AUTHENTICATION_MASTER_SPECIFICATION.md](/Users/kaneko/hotel-kanri/docs/AUTHENTICATION_MASTER_SPECIFICATION.md)
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md)

---

## 📚 参考資料

- [Nuxt 3 ドキュメント](https://nuxt.com/docs)
- [Prisma ドキュメント](https://www.prisma.io/docs)
- [Express ドキュメント](https://expressjs.com/)
- [PostgreSQL DATE_TRUNC](https://www.postgresql.org/docs/current/functions-datetime.html)

---

**最終更新**: 2025年10月2日  
**作成者**: AI Assistant (Luna)  
**レビュー**: 未実施  
**トレース実行**: 2025年10月2日（実測値に基づく動的仕様追加）  
**質問回答**: 2025年10月2日（hotel-commonチームからの質問に回答済み）

---

## 🌐 多言語対応

### 概要

ダッシュボード機能は**管理画面専用**であり、UIテキストのみ多言語化が必要です。

**対応パターン**: 🟢 **軽量対応**（UIテキストのみ）

**定義**:
- ✅ 静的UIテキスト（ボタン、ラベル、メッセージ等）を多言語化
- ✅ `@nuxtjs/i18n`を使用
- ❌ `translations`テーブルは使用しない
- ❌ 自動翻訳は実行しない
- ❌ データベースのデータフィールドは多言語化しない

**適用理由**: 
- 管理画面専用であり、スタッフが使用する機能
- 表示されるデータ（注文数、売上等）は数値であり、言語に依存しない
- データの表示専用であり、多言語データの登録・管理は行わない

**対象範囲**:
- ✅ UIテキスト（統計カードのラベル、クイックアクション、ヘッダー等） - `@nuxtjs/i18n`で対応
- ❌ データフィールド（注文数、売上金額等） - 数値のため多言語化不要

---

### 対象フィールド

#### **UIテキストの多言語化**

| 対象 | 対応方法 | 優先度 |
|------|---------|--------|
| 統計カードのラベル（「今日の注文数」「今日の売上」等） | `@nuxtjs/i18n` | ⭐⭐⭐ |
| クイックアクションのラベル（「注文管理」「メニュー管理」等） | `@nuxtjs/i18n` | ⭐⭐⭐ |
| ヘッダーテキスト（「管理画面」「ホテルSaaSシステムの管理機能」） | `@nuxtjs/i18n` | ⭐⭐⭐ |
| エラーメッセージ | `@nuxtjs/i18n` | ⭐⭐⭐ |

**データの多言語化は不要**:
- ❌ 注文数（数値）
- ❌ 売上金額（数値 + 通貨記号）
- ❌ デバイス数（数値）

---

### 実装方法

#### ✅ **UIテキストの多言語化**

**実装パターン**: `@nuxtjs/i18n`を使用

```vue
<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <div class="p-6">
    <!-- ヘッダー -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold">
        {{ t('admin.dashboard.title') }}
      </h1>
      <p class="text-gray-600">
        {{ t('admin.dashboard.subtitle') }}
      </p>
    </div>

    <!-- 統計カード -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- 今日の注文数 -->
      <StatCard
        :title="t('admin.dashboard.stats.todayOrders')"
        :value="todayOrders"
        icon="heroicons:shopping-cart"
        color="blue"
      />
      
      <!-- 今日の売上 -->
      <StatCard
        :title="t('admin.dashboard.stats.todaySales')"
        :value="formatCurrency(todaySales)"
        icon="heroicons:currency-yen"
        color="green"
      />
      
      <!-- アクティブデバイス -->
      <StatCard
        :title="t('admin.dashboard.stats.activeDevices')"
        :value="activeDevices"
        icon="heroicons:device-tablet"
        color="purple"
      />
      
      <!-- 処理待ち注文 -->
      <StatCard
        :title="t('admin.dashboard.stats.pendingOrders')"
        :value="pendingOrders"
        icon="heroicons:clock"
        color="yellow"
      />
    </div>

    <!-- クイックアクション -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">
        {{ t('admin.dashboard.quickActions.title') }}
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickActionCard
          :title="t('admin.dashboard.quickActions.orders')"
          to="/admin/orders"
          icon="heroicons:clipboard-document-list"
          color="blue"
        />
        
        <QuickActionCard
          :title="t('admin.dashboard.quickActions.menu')"
          to="/admin/menu"
          icon="heroicons:book-open"
          color="green"
        />
        
        <QuickActionCard
          :title="t('admin.dashboard.quickActions.devices')"
          to="/admin/devices"
          icon="heroicons:device-tablet"
          color="purple"
        />
        
        <QuickActionCard
          :title="t('admin.dashboard.quickActions.frontDesk')"
          to="/admin/front-desk"
          icon="heroicons:building-office"
          color="indigo"
        />
        
        <QuickActionCard
          :title="t('admin.dashboard.quickActions.statistics')"
          to="/admin/statistics"
          icon="heroicons:chart-bar"
          color="red"
        />
        
        <QuickActionCard
          :title="t('admin.dashboard.quickActions.settings')"
          to="/admin/settings"
          icon="heroicons:cog-6-tooth"
          color="gray"
        />
      </div>
    </div>
  </div>
</template>
```

**翻訳ファイル例** (`locales/ja.json`):

```json
{
  "admin": {
    "dashboard": {
      "title": "管理画面",
      "subtitle": "ホテルSaaSシステムの管理機能",
      "stats": {
        "todayOrders": "今日の注文数",
        "todaySales": "今日の売上",
        "activeDevices": "アクティブデバイス",
        "pendingOrders": "処理待ち注文"
      },
      "quickActions": {
        "title": "クイックアクション",
        "orders": "注文管理",
        "menu": "メニュー管理",
        "devices": "デバイス管理",
        "frontDesk": "フロント業務",
        "statistics": "統計・分析",
        "settings": "設定"
      },
      "errors": {
        "fetchStats": "統計データの取得に失敗しました",
        "network": "ネットワーク接続を確認してください",
        "unauthorized": "認証が必要です",
        "forbidden": "アクセス権限がありません"
      }
    }
  }
}
```

**翻訳ファイル例** (`locales/en.json`):

```json
{
  "admin": {
    "dashboard": {
      "title": "Admin Dashboard",
      "subtitle": "Hotel SaaS System Management",
      "stats": {
        "todayOrders": "Today's Orders",
        "todaySales": "Today's Sales",
        "activeDevices": "Active Devices",
        "pendingOrders": "Pending Orders"
      },
      "quickActions": {
        "title": "Quick Actions",
        "orders": "Order Management",
        "menu": "Menu Management",
        "devices": "Device Management",
        "frontDesk": "Front Desk",
        "statistics": "Statistics",
        "settings": "Settings"
      },
      "errors": {
        "fetchStats": "Failed to fetch statistics",
        "network": "Please check network connection",
        "unauthorized": "Authentication required",
        "forbidden": "Access denied"
      }
    }
  }
}
```

---

### マイグレーション計画

#### **Phase 1: UIテキストの多言語化（優先度: 高）**

**対象**: `hotel-saas` フロントエンド

**タスク**:
- [ ] `@nuxtjs/i18n`のセットアップ確認
- [ ] 翻訳ファイルの作成（`locales/ja.json`, `locales/en.json`）
- [ ] `pages/admin/index.vue`の翻訳キー置き換え
  - [ ] ヘッダーテキスト
  - [ ] 統計カードのラベル
  - [ ] クイックアクションのラベル
  - [ ] エラーメッセージ
- [ ] 言語切り替え機能の動作確認

**工数**: 0.5-1日

---

### 実装チェックリスト

#### **Phase 1: UIテキスト多言語化**

**hotel-saas（フロントエンド）**:
- [ ] `@nuxtjs/i18n`セットアップ確認
- [ ] 翻訳ファイル作成
  - [ ] `locales/ja.json` - ダッシュボードセクション追加
  - [ ] `locales/en.json` - ダッシュボードセクション追加
- [ ] `pages/admin/index.vue`更新
  - [ ] ヘッダーテキスト（`t('admin.dashboard.title')`）
  - [ ] 統計カードラベル（`t('admin.dashboard.stats.*')`）
  - [ ] クイックアクションラベル（`t('admin.dashboard.quickActions.*')`）
  - [ ] エラーメッセージ（`t('admin.dashboard.errors.*')`）
- [ ] 言語切り替えUIの実装（ヘッダー）
- [ ] 動作確認（日本語 ↔ 英語）

**テスト**:
- [ ] 日本語表示の確認
- [ ] 英語表示の確認
- [ ] 言語切り替えの動作確認
- [ ] 数値データが正しく表示されることを確認（言語によらず同じ値）
- [ ] 通貨記号のロケール対応確認（`formatCurrency`）

---

### 注意事項

#### ✅ **やるべきこと**

1. **軽量な実装**
   - `@nuxtjs/i18n`のみ使用
   - `translations`テーブルは使用しない

2. **数値データの扱い**
   - 注文数、売上等はロケールに応じたフォーマットを使用
   - 例: `formatCurrency(value)` でロケール対応の通貨表示

3. **エラーメッセージの多言語化**
   - コンソールログだけでなく、トースト通知も多言語対応

#### ❌ **やってはいけないこと**

1. **過剰な多言語化**
   - 数値データを翻訳しない
   - APIレスポンスを変更しない

2. **既存仕様との矛盾**
   - APIの構造を変更しない
   - データ取得ロジックを変更しない

3. **パフォーマンス劣化**
   - 翻訳キーの取得でレンダリングが遅くならないよう注意

---

### 影響範囲

| システム | 影響度 | 内容 |
|---------|--------|------|
| **hotel-saas** | 🟢 小 | `pages/admin/index.vue`の翻訳キー置き換えのみ |
| **hotel-common** | ✅ なし | API仕様変更なし |
| **hotel-pms** | ✅ なし | 依存なし |
| **hotel-member** | ✅ なし | 依存なし |

---

## 📝 変更履歴

### 2025年10月10日 - v2.0.0
- 多言語対応追加
- 軽量対応（UIテキストのみ）
- `@nuxtjs/i18n`による管理画面UI多言語化
- マイグレーション計画（Phase 1）
- 既存仕様との完全な整合性確保
- データフィールドの多言語化は不要と判断

### 2025年10月2日 - v1.1.0
- hotel-commonチームからの質問事項に回答
- 型定義との不一致を明確化
- Cookie転送問題の根本原因と対応方針を追記
- テナントID "default" の UUID化手順を追加
- 修正タスク一覧を作成（担当者・期限付き）
- 本番と開発環境の一致性を強調

### 2025年10月2日 - v1.0.0
- 初版作成
- トレース実行に基づく実測値を追加
- パフォーマンス分析結果を記載
- 検出された問題を3件記載

