# SSOT: 客室ルームサービスUI（ゲスト向け）

**作成日**: 2025-10-02  
**バージョン**: 1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（Phase 1）

**関連SSOT**:
- [SSOT_SAAS_DEVICE_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md) - デバイス認証（自動ログイン）
- [SSOT_SAAS_ORDER_MANAGEMENT.md](./SSOT_SAAS_ORDER_MANAGEMENT.md) - 注文管理システム（未作成）
- [SSOT_SAAS_MENU_MANAGEMENT.md](./SSOT_SAAS_MENU_MANAGEMENT.md) - メニュー管理（未作成）
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [UI仕様](#ui仕様)
5. [画面遷移フロー](#画面遷移フロー)
6. [データモデル](#データモデル)
7. [API仕様](#api仕様)
8. [実装詳細](#実装詳細)
9. [既存実装状況](#既存実装状況)
10. [未実装機能](#未実装機能)

---

## 📖 概要

### 目的
ホテル客室のSTB/タブレット端末から、宿泊客が**ログイン操作なし**でルームサービスを注文できるUIを提供する。

### 基本方針
- **ゼロタッチ認証**: デバイス認証による自動ログイン
- **TV最適化UI**: 10フィートUIの原則に従った設計
- **リモコン対応**: リモコンでの操作に最適化
- **多言語対応**: 日本語・英語を最低限サポート
- **オフライン対応**: IndexedDBによるオフライン注文機能

### ユーザー体験のゴール
```
1. ゲストが客室TV/タブレットを起動
   ↓
2. 自動的にホテルのホーム画面が表示（ログイン不要）
   ↓
3. 「ルームサービス」をタップ
   ↓
4. メニューを閲覧・選択
   ↓
5. カートに追加・注文確定
   ↓
6. 注文完了・配達状況をリアルタイム表示
```

---

## 🎯 スコープ

### 対象システム
- ✅ **hotel-saas**: メイン実装（フロントエンド）
- ✅ **hotel-common**: バックエンドAPI（注文処理）
- ❌ **hotel-pms**: 対象外（料金計算のみ連携）
- ❌ **hotel-member**: 対象外（非会員ゲスト対応）

### 機能範囲

#### ✅ 実装済み
- トップページ（`pages/index.vue`）
- デバイス自動認証
- ラグジュアリーUI基盤
- 言語切り替え（日/英）
- リモコン対応フォーカス管理

#### 🚧 部分実装
- メニュー表示コンポーネント（`components/menu/MenuCard.vue`）
- 注文ステータス表示（`components/order/OrderStatusBadge.vue`）
- レシート表示（`pages/receipt/[orderId].vue`）

#### ❌ 未実装
- メニュー一覧ページ
- カート機能
- 注文確認ページ
- 注文履歴ページ
- リアルタイム配達状況表示

---

## 🛠️ 技術スタック

### フロントエンド
- **Framework**: Nuxt 3
- **UI Library**: Tailwind CSS + カスタムコンポーネント
- **アイコン**: Nuxt Icon (heroicons)
- **状態管理**: Composables（`useState`）
- **ローカルストレージ**: IndexedDB（オフライン対応）

### バックエンド
- **API**: hotel-common（Express + Prisma）
- **データベース**: PostgreSQL（統一DB）
- **テーブル**: `orders`, `order_items`, `menu_items`, `menu_categories`

### 認証
- **デバイス認証**: IP/MACアドレスベース
- **セッション管理**: 不要（デバイスIDで識別）

### 多言語
- **対応言語**: 日本語（デフォルト）、英語
- **実装方法**: Nuxt I18n（予定）、現在はハードコード

---

## 🎨 UI仕様

### デザイン原則

#### 1. 10フィートUI
```
- フォントサイズ: 最小20px、推奨24px以上
- タッチターゲット: 最小80x80px、推奨120x120px
- コントラスト比: WCAG AA準拠（4.5:1以上）
- アニメーション: スムーズな遷移（200-300ms）
```

#### 2. TV画面最適化
```css
.tv-viewport-container {
  width: 1920px;  /* Full HD */
  height: 1080px;
  overflow: hidden;  /* スクロール禁止 */
}
```

#### 3. カラースキーム
```css
/* ラグジュアリーテーマ */
--luxury-primary: #D4AF37;    /* ゴールド */
--luxury-secondary: #1a1a1a;  /* ダークグレー */
--luxury-accent: #8B7355;     /* ブロンズ */
--luxury-bg: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
```

---

### 画面構成

#### トップページ（`pages/index.vue`）

**レイアウト**:
```
┌─────────────────────────────────────────────┐
│ Header                                       │
│  [Logo] [Weather] [Language] [Home]         │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────┐       │
│  │  Campaign Banner (30% OFF)       │       │
│  │  [詳細を見る] [QRで予約]         │       │
│  └──────────────────────────────────┘       │
│                                              │
│  ┌──────────────────────────────────┐       │
│  │  AI Concierge (ARIA)             │       │
│  │  [レストラン予約] [観光案内]     │       │
│  │  [チャット開始]                   │       │
│  └──────────────────────────────────┘       │
│                                              │
├─────────────────────────────────────────────┤
│ Footer (5つのボタン):                       │
│ [🛒ルームサービス] [ℹ️インフォメーション]   │
│ [🏢館内施設] [📍観光案内] [📶WiFi接続]     │
└─────────────────────────────────────────────┘
```

**実装状況**: ✅ 実装済み（`pages/index.vue` line 1-699）

---

#### メニュー一覧ページ（未実装）

**パス**: `/menu`（予定）

**レイアウト**:
```
┌─────────────────────────────────────────────┐
│ Header [← Back] [Menu] [Cart(3)]            │
├─────────────────────────────────────────────┤
│ Category Tabs:                              │
│ [全て] [食事] [飲み物] [デザート] [その他] │
├─────────────────────────────────────────────┤
│                                              │
│  Grid View (2x3):                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Image   │  │  Image   │  │  Image   │  │
│  │  Item 1  │  │  Item 2  │  │  Item 3  │  │
│  │  ¥1,200  │  │  ¥800    │  │  ¥1,500  │  │
│  │ [詳細]   │  │ [詳細]   │  │ [詳細]   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Item 4  │  │  Item 5  │  │  Item 6  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  [前へ] Page 1/3 [次へ]                     │
│                                              │
└─────────────────────────────────────────────┘
```

**実装必要ファイル**: 
- `pages/menu/index.vue`（新規作成）
- `components/menu/MenuGrid.vue`（新規作成）
- `components/menu/CategoryTabs.vue`（新規作成）

---

#### メニュー詳細モーダル（部分実装）

**コンポーネント**: `components/order/MenuItemDetail.vue`

**レイアウト**:
```
┌─────────────────────────────────────────────┐
│ [×] 閉じる                                   │
├─────────────────────────────────────────────┤
│                                              │
│  ┌────────────────┐                         │
│  │                │                         │
│  │  Item Image    │  Item Name              │
│  │                │  ¥1,200 (税込)          │
│  │                │                         │
│  └────────────────┘  Description text...    │
│                                              │
│  オプション:                                 │
│  ☐ 温かい状態で                             │
│  ☐ アレルギー対応                           │
│                                              │
│  数量: [-] 1 [+]                            │
│                                              │
│  特記事項:                                   │
│  [                                    ]      │
│                                              │
│  [カートに追加 ¥1,200]                      │
│                                              │
└─────────────────────────────────────────────┘
```

**実装状況**: 🚧 部分実装（`components/order/MenuItemDetail.vue`）

---

#### カート・注文確認ページ（未実装）

**パス**: `/cart`（予定）

**レイアウト**:
```
┌─────────────────────────────────────────────┐
│ Header [← Back] [カート]                     │
├─────────────────────────────────────────────┤
│                                              │
│  カート内容:                                 │
│  ┌────────────────────────────────────────┐ │
│  │ Item 1 (x2)        ¥2,400    [削除]   │ │
│  │ ├ オプション: 温かい状態で              │ │
│  │ └ 特記事項: スプーン2本                 │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ Item 2 (x1)        ¥800      [削除]   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  配達先:                                     │
│  部屋番号: 501 (デバイスから自動取得)       │
│                                              │
│  合計:                                       │
│  小計        ¥3,200                         │
│  サービス料  ¥320 (10%)                     │
│  消費税      ¥352 (10%)                     │
│  ───────────────────                        │
│  合計        ¥3,872                         │
│                                              │
│  [注文を確定する]                           │
│                                              │
└─────────────────────────────────────────────┘
```

**実装必要ファイル**: 
- `pages/cart/index.vue`（新規作成）
- `components/cart/CartItem.vue`（新規作成）

---

#### 注文完了・ステータス表示（部分実装）

**パス**: `/order/[orderId]`（予定）

**レイアウト**:
```
┌─────────────────────────────────────────────┐
│ 注文が完了しました！                         │
├─────────────────────────────────────────────┤
│                                              │
│  注文番号: #ORD-20251002-0001               │
│  配達予定時刻: 約30分後                     │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │ ● 注文受付完了  ✓                   │   │
│  │ ○ 調理中       (3分前)              │   │
│  │ ○ 配膳準備中                        │   │
│  │ ○ 配達中                            │   │
│  │ ○ 配達完了                          │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  注文内容:                                   │
│  - Item 1 (x2)  ¥2,400                      │
│  - Item 2 (x1)  ¥800                        │
│                                              │
│  合計: ¥3,872                               │
│                                              │
│  [レシートを表示] [ホームに戻る]            │
│                                              │
└─────────────────────────────────────────────┘
```

**実装状況**: 🚧 部分実装
- `components/order/OrderStepTracker.vue`（ステップ表示）
- `components/order/OrderStatusBadge.vue`（ステータスバッジ）
- `pages/receipt/[orderId].vue`（レシート表示）

---

## 🔄 画面遷移フロー

### 1. 注文フロー（メインフロー）

```
[index.vue トップページ]
  ↓ フッター「ルームサービス」ボタンをクリック
  ↓ navigate('room-service') → 現在は/orderに遷移
[/order または /menu メニュー一覧] (未実装)
  ↓ メニュー項目をクリック
[MenuItemDetail モーダル] (部分実装)
  ↓ 「カートに追加」
[/menu メニュー一覧に戻る]
  ↓ 「カート」アイコンをクリック
[/cart カート・注文確認] (未実装)
  ↓ 「注文を確定」
[/order/[id] 注文完了・ステータス] (未実装)
  ↓ 「レシートを表示」
[/receipt/[id] レシート表示] (実装済み)
  ↓ 「ホームに戻る」
[index.vue トップページ]
```

**注意**: 現在の実装では`'room-service'`は`/order`にルーティングされていますが、`/order`ページは未実装です。`/menu`に変更するか、`/order`ページを実装する必要があります。

### 2. リモコン操作フロー

**フォーカス順序**:
```typescript
// data-focus-order 属性で制御
1: 言語切り替えボタン
2: ホームボタン
3: キャンペーンカード
4: 「詳細を見る」ボタン
5: 「QRで予約」ボタン
6: AIコンシェルジュカード
7-14: サービスカード（Room Service含む）
```

**実装ファイル**: `pages/index.vue` (line 32-34, 58, 66, 74, 90)

---

## 📊 データモデル

### Order（注文）

**Prismaモデル**:
```prisma
model Order {
  id        Int      @id @default(autoincrement())
  tenantId  String   @map("tenant_id")
  roomId    String   @map("room_id")
  placeId   Int?     @map("place_id")
  status    String   @default("received")
  items     Json
  total     Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  paidAt    DateTime? @map("paid_at")
  isDeleted Boolean  @default(false) @map("is_deleted")
  deletedAt DateTime? @map("deleted_at")
  sessionId String?  @map("session_id")
  uuid      String?  @unique
  
  session   CheckinSession? @relation(fields: [sessionId], references: [id])
  OrderItem OrderItem[]
  
  @@index([tenantId])
  @@index([sessionId])
  @@index([status])
  @@index([createdAt])
  @@map("orders")
}
```

**ステータス値**:
```typescript
type OrderStatus = 
  | 'received'      // 注文受付
  | 'preparing'     // 調理中
  | 'ready'         // 配膳準備完了
  | 'delivering'    // 配達中
  | 'delivered'     // 配達完了
  | 'completed'     // 完了（料金精算済み）
  | 'cancelled'     // キャンセル
```

---

### OrderItem（注文明細）

**Prismaモデル**:
```prisma
model OrderItem {
  id          Int       @id @default(autoincrement())
  tenantId    String    @map("tenant_id")
  orderId     Int       @map("order_id")
  menuItemId  Int       @map("menu_item_id")
  name        String
  price       Int
  quantity    Int
  status      String    @default("pending")
  notes       String?
  deliveredAt DateTime? @map("delivered_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  isDeleted   Boolean   @default(false) @map("is_deleted")
  
  Order       Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([tenantId])
  @@map("order_items")
}
```

---

### MenuItem（メニュー項目）

**Prismaモデル（hotel-saas/prisma/schema.prisma）**:
```prisma
model MenuItem {
  id              Int      @id @default(autoincrement())
  tenantId        String
  categoryId      Int
  name            String
  description     String?
  price           Decimal
  taxRate         Decimal  @default(10)
  imageUrl        String?
  allergens       String?
  nutritionInfo   Json?
  preparationTime Int?
  isAvailable     Boolean  @default(true)
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  tenant     Tenant      @relation(fields: [tenantId], references: [id])
  category   MenuCategory    @relation(fields: [categoryId], references: [id])
  orderItems OrderItem[]
  
  @@index([tenantId])
  @@index([categoryId])
  @@index([isAvailable])
  @@map("menu_items")
}
```

---

### MenuCategory（メニューカテゴリ）

**Prismaモデル**:
```prisma
model MenuCategory {
  id          Int             @id @default(autoincrement())
  tenantId    String
  name        String
  description String?
  imageUrl    String?
  sortOrder   Int             @default(0)
  isActive    Boolean         @default(true)
  parentId    Int?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  
  tenant      Tenant          @relation(fields: [tenantId], references: [id])
  parent      MenuCategory?   @relation("MenuCategoryHierarchy", fields: [parentId], references: [id])
  children    MenuCategory[]  @relation("MenuCategoryHierarchy")
  menuItems   MenuItem[]
  
  @@index([tenantId])
  @@index([parentId])
  @@index([sortOrder])
  @@map("menu_categories")
}
```

---

## 🔌 API仕様

### 1. メニュー一覧取得

**エンドポイント**: `GET /api/v1/menu/items`

**リクエスト**:
```typescript
// Query Parameters
{
  categoryId?: number  // カテゴリフィルタ
  isAvailable?: boolean // 提供可能なもののみ
  limit?: number       // ページネーション
  offset?: number
}

// Headers
{
  'Cookie': 'hotel-session-id=xxxxx'  // デバイス認証用（任意）
  'X-Tenant-ID': 'tenant-xxx'         // テナントID
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    items: [
      {
        id: 1,
        name: "ハンバーグステーキ",
        description: "特製デミグラスソース",
        price: 1200,
        taxRate: 10,
        imageUrl: "https://...",
        preparationTime: 30,
        isAvailable: true,
        category: {
          id: 1,
          name: "食事"
        }
      },
      // ...
    ],
    total: 50,
    limit: 20,
    offset: 0
  }
}
```

**実装状況**: ❌ 未実装（hotel-commonに作成必要）

---

### 2. 注文作成

**エンドポイント**: `POST /api/v1/orders`

**リクエスト**:
```typescript
{
  roomId: "501",           // 部屋番号（デバイスから自動取得）
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
  ],
  sessionId?: "session-xxx"  // チェックインセッションID（任意）
}

// Headers
{
  'Cookie': 'hotel-session-id=xxxxx'
  'X-Tenant-ID': 'tenant-xxx'
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
      status: "received",
      roomId: "501",
      total: 3872,
      items: [
        {
          id: 456,
          menuItemId: 1,
          name: "ハンバーグステーキ",
          price: 1200,
          quantity: 2,
          notes: "温かい状態で"
        },
        // ...
      ],
      createdAt: "2025-10-02T10:30:00Z"
    }
  }
}
```

**実装状況**: 🚧 部分実装（hotel-commonに存在、要確認）

---

### 3. 注文ステータス取得

**エンドポイント**: `GET /api/v1/orders/:orderId`

**リクエスト**:
```typescript
// Path Parameter
orderId: number

// Headers
{
  'Cookie': 'hotel-session-id=xxxxx'
  'X-Tenant-ID': 'tenant-xxx'
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
      status: "preparing",        // 現在のステータス
      roomId: "501",
      total: 3872,
      estimatedDeliveryTime: "2025-10-02T11:00:00Z",
      statusHistory: [
        {
          status: "received",
          timestamp: "2025-10-02T10:30:00Z"
        },
        {
          status: "preparing",
          timestamp: "2025-10-02T10:33:00Z"
        }
      ],
      items: [ /* ... */ ]
    }
  }
}
```

**実装状況**: ❌ 未実装

---

### 4. カテゴリ一覧取得

**エンドポイント**: `GET /api/v1/menu/categories`

**リクエスト**:
```typescript
// Headers
{
  'X-Tenant-ID': 'tenant-xxx'
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    categories: [
      {
        id: 1,
        name: "食事",
        sortOrder: 0,
        itemCount: 15
      },
      {
        id: 2,
        name: "飲み物",
        sortOrder: 1,
        itemCount: 20
      },
      // ...
    ]
  }
}
```

**実装状況**: ❌ 未実装

---

## 💻 実装詳細

### hotel-saas（フロントエンド）

#### ディレクトリ構成

```
/Users/kaneko/hotel-saas/
├── pages/
│   ├── index.vue                    ✅ トップページ
│   ├── menu/
│   │   └── index.vue                ❌ メニュー一覧（未作成）
│   ├── cart/
│   │   └── index.vue                ❌ カート（未作成）
│   ├── order/
│   │   └── [orderId].vue            ❌ 注文ステータス（未作成）
│   └── receipt/
│       └── [orderId].vue            ✅ レシート表示
├── components/
│   ├── menu/
│   │   ├── MenuCard.vue             ✅ メニューカード
│   │   ├── MenuGrid.vue             ❌ メニューグリッド（未作成）
│   │   ├── CategoryTabs.vue         ❌ カテゴリタブ（未作成）
│   │   └── MenuItemDetail.vue       🚧 メニュー詳細モーダル
│   ├── cart/
│   │   └── CartItem.vue             ❌ カート項目（未作成）
│   ├── order/
│   │   ├── OrderStepTracker.vue     ✅ ステータストラッカー
│   │   └── OrderStatusBadge.vue     ✅ ステータスバッジ
│   └── common/
│       ├── LuxuryCard.vue           ✅ ラグジュアリーカード
│       └── LuxuryButton.vue         ✅ ラグジュアリーボタン
├── composables/
│   ├── useCart.ts                   ❌ カート管理（未作成）
│   ├── useMenu.ts                   ❌ メニュー取得（未作成）
│   └── useOrder.ts                  ❌ 注文管理（未作成）
└── server/
    └── api/
        └── v1/
            ├── menu/
            │   ├── items.get.ts     ❌ メニュー一覧API（未作成）
            │   └── categories.get.ts ❌ カテゴリAPI（未作成）
            └── orders/
                ├── create.post.ts   ❌ 注文作成API（未作成）
                └── [id].get.ts      ❌ 注文取得API（未作成）
```

---

#### トップページ（実装済み）

**ファイル**: `/Users/kaneko/hotel-saas/pages/index.vue`

**重要なコード箇所**:

```typescript
// line 134-141: ルームサービスボタン（フッター）
<LuxuryButton
  text="ルームサービス"
  icon="heroicons:shopping-cart"
  variant="premium"
  size="lg"
  @click="navigate('room-service')"  // ← 'room-service'で呼び出し
/>

// line 382-399: navigate関数
const navigate = (page) => {
  const routes = {
    'room-service': '/order',  // ← 現在は/orderに遷移
    'info': '/info',
    // ...
  };
  const route = routes[page];
  if (route) {
    navigateTo(route);
  }
};
```

**修正必要箇所**:
- `'room-service': '/order'` → `'/menu'`に変更（または`/order`ページを実装）

---

#### メニュー一覧ページ（未実装）

**ファイル**: `/Users/kaneko/hotel-saas/pages/menu/index.vue`（新規作成）

**実装イメージ**:
```vue
<template>
  <div class="tv-viewport-container">
    <header class="menu-header">
      <button @click="goBack">← 戻る</button>
      <h1>Room Service Menu</h1>
      <button @click="openCart">
        🛒 Cart ({{ cartCount }})
      </button>
    </header>
    
    <CategoryTabs
      :categories="categories"
      :active="activeCategory"
      @change="setCategory"
    />
    
    <MenuGrid
      :items="filteredItems"
      @select="openDetail"
    />
    
    <MenuItemDetailModal
      v-if="selectedItem"
      :item="selectedItem"
      @close="selectedItem = null"
      @add-to-cart="addToCart"
    />
  </div>
</template>

<script setup lang="ts">
const { categories, items, loading } = useMenu()
const { addItem, count: cartCount } = useCart()

const activeCategory = ref<number | null>(null)
const selectedItem = ref(null)

const filteredItems = computed(() => {
  if (!activeCategory.value) return items.value
  return items.value.filter(i => i.categoryId === activeCategory.value)
})

function openDetail(item: MenuItem) {
  selectedItem.value = item
}

function addToCart(item: MenuItem, quantity: number, notes?: string) {
  addItem({ ...item, quantity, notes })
  selectedItem.value = null
}
</script>
```

---

#### Composable: useCart（未実装）

**ファイル**: `/Users/kaneko/hotel-saas/composables/useCart.ts`（新規作成）

**実装イメージ**:
```typescript
export const useCart = () => {
  const items = useState<CartItem[]>('cart-items', () => [])
  
  const count = computed(() => items.value.length)
  
  const total = computed(() => {
    return items.value.reduce((sum, item) => {
      return sum + (item.price * item.quantity)
    }, 0)
  })
  
  const addItem = (item: CartItem) => {
    const existing = items.value.find(i => i.menuItemId === item.menuItemId)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      items.value.push(item)
    }
  }
  
  const removeItem = (menuItemId: number) => {
    const index = items.value.findIndex(i => i.menuItemId === menuItemId)
    if (index > -1) items.value.splice(index, 1)
  }
  
  const clear = () => {
    items.value = []
  }
  
  return {
    items,
    count,
    total,
    addItem,
    removeItem,
    clear
  }
}
```

---

### hotel-common（バックエンド）

#### API実装が必要なエンドポイント

1. **メニュー一覧API**
   - ファイル: `/Users/kaneko/hotel-common/src/routes/api/v1/menu/items.ts`
   - メソッド: `GET /api/v1/menu/items`
   - 実装内容: Prismaでmenu_itemsを取得、tenantIdフィルタ必須

2. **カテゴリ一覧API**
   - ファイル: `/Users/kaneko/hotel-common/src/routes/api/v1/menu/categories.ts`
   - メソッド: `GET /api/v1/menu/categories`
   - 実装内容: Prismaでcategoriesを取得

3. **注文作成API**
   - ファイル: 既存確認必要
   - メソッド: `POST /api/v1/orders`
   - 実装内容: トランザクション処理（Order + OrderItem）

4. **注文取得API**
   - ファイル: `/Users/kaneko/hotel-common/src/routes/api/v1/orders/:id.ts`
   - メソッド: `GET /api/v1/orders/:id`
   - 実装内容: OrderをOrderItemsと共に取得

---

## 📋 既存実装状況

### ✅ 完全実装済み

| 項目 | ファイル | 行数 |
|------|---------|------|
| トップページ | `pages/index.vue` | 699 |
| レシート表示 | `pages/receipt/[orderId].vue` | - |
| メニューカード | `components/menu/MenuCard.vue` | - |
| ステータストラッカー | `components/order/OrderStepTracker.vue` | - |
| ステータスバッジ | `components/order/OrderStatusBadge.vue` | - |
| ラグジュアリーUI基盤 | `components/common/Luxury*.vue` | - |

### 🚧 部分実装

| 項目 | ファイル | 状態 |
|------|---------|------|
| メニュー詳細モーダル | `components/order/MenuItemDetail.vue` | 基本構造のみ |

### ❌ 未実装

| 項目 | 優先度 | 実装必要 |
|------|--------|----------|
| メニュー一覧ページ | 🔴 最高 | `pages/menu/index.vue` |
| カート機能 | 🔴 最高 | `pages/cart/index.vue` + `composables/useCart.ts` |
| 注文確認ページ | 🔴 最高 | カートページ内 |
| 注文ステータスページ | 🟡 高 | `pages/order/[orderId].vue` |
| メニューAPI | 🔴 最高 | hotel-common |
| 注文API | 🔴 最高 | hotel-common（確認・修正） |

---

## 🔗 システム間連携

### hotel-saas → hotel-common

**認証ヘッダー**:
```typescript
// すべてのAPIリクエストに付与
headers: {
  'X-Tenant-ID': event.context.tenantId,  // テナントID
  'Cookie': event.node.req.headers.cookie  // デバイス認証Cookie（任意）
}
```

**API呼び出し例**:
```typescript
// hotel-saas/server/api/v1/menu/items.get.ts
export default defineEventHandler(async (event) => {
  const tenantId = event.context.tenantId
  
  const response = await $fetch(`${API_URL}/api/v1/menu/items`, {
    headers: {
      'X-Tenant-ID': tenantId,
      'Cookie': event.node.req.headers.cookie || ''
    }
  })
  
  return response
})
```

---

### hotel-common → hotel-pms（将来）

**料金計算連携**:
```typescript
// 注文完了時にPMSへ料金情報を送信
// hotel-common/src/services/order-billing.ts
async function notifyPMS(order: Order) {
  await $fetch(`${PMS_URL}/api/v1/billing/charge`, {
    method: 'POST',
    body: {
      reservationId: order.sessionId,
      roomNumber: order.roomId,
      amount: order.total,
      items: order.items,
      chargeType: 'room_service'
    }
  })
}
```

---

## 🔐 セキュリティ

### デバイス認証

- **方式**: IP/MACアドレスベース
- **ミドルウェア**: `server/middleware/device-guard.ts`
- **参照SSOT**: [SSOT_SAAS_DEVICE_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md)

### テナント分離

- **すべてのAPIで`X-Tenant-ID`必須**
- **Prismaクエリに自動的に`tenantId`フィルタ適用**
- **参照SSOT**: [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md)

---

## 📱 多言語対応

### 対応言語

- **日本語**（デフォルト）
- **英語**

### 実装方法

**現状**: ハードコード（`pages/index.vue` line 32-34）

**今後の実装**:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  i18n: {
    locales: ['ja', 'en'],
    defaultLocale: 'ja',
    vueI18n: './i18n.config.ts'
  }
})

// i18n/ja.json
{
  "menu": {
    "title": "ルームサービスメニュー",
    "addToCart": "カートに追加",
    "orderNow": "注文する"
  }
}

// i18n/en.json
{
  "menu": {
    "title": "Room Service Menu",
    "addToCart": "Add to Cart",
    "orderNow": "Order Now"
  }
}
```

---

## 📊 パフォーマンス要件

### レスポンスタイム

| 操作 | 目標 | 説明 |
|------|------|------|
| ページ遷移 | < 200ms | スムーズな画面切り替え |
| メニュー読み込み | < 500ms | 画像含む初回表示 |
| 注文作成 | < 1s | API処理完了 |
| カート操作 | < 100ms | ローカル処理のみ |

### オフライン対応

- **IndexedDB**: カート情報の永続化
- **ServiceWorker**: メニュー画像のキャッシュ（将来実装）

---

## 📋 実装チェックリスト

### Phase 1: メニュー表示（Week 1）

- [ ] `pages/menu/index.vue`作成
- [ ] `components/menu/MenuGrid.vue`作成
- [ ] `components/menu/CategoryTabs.vue`作成
- [ ] `composables/useMenu.ts`作成
- [ ] hotel-common: メニューAPI実装
- [ ] hotel-common: カテゴリAPI実装

### Phase 2: カート機能（Week 2）

- [ ] `pages/cart/index.vue`作成
- [ ] `components/cart/CartItem.vue`作成
- [ ] `composables/useCart.ts`作成
- [ ] トップページの遷移修正

### Phase 3: 注文処理（Week 3）

- [ ] hotel-common: 注文作成API実装/修正
- [ ] hotel-common: 注文取得API実装
- [ ] `pages/order/[orderId].vue`作成
- [ ] リアルタイムステータス更新（WebSocket/Polling）

### Phase 4: 最適化（Week 4）

- [ ] 多言語対応（Nuxt I18n）
- [ ] 画像最適化
- [ ] オフライン対応（IndexedDB + ServiceWorker）
- [ ] パフォーマンステスト

---

## 🔗 関連SSOT

- [SSOT_SAAS_DEVICE_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md) - デバイス認証
- [SSOT_SAAS_ORDER_MANAGEMENT.md](./SSOT_SAAS_ORDER_MANAGEMENT.md) - 注文管理（未作成）
- [SSOT_SAAS_MENU_MANAGEMENT.md](./SSOT_SAAS_MENU_MANAGEMENT.md) - メニュー管理（未作成）
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-02 | 1.0.0 | 初版作成 | AI |

---

**以上、SSOT: 客室ルームサービスUI（ゲスト向け）**

