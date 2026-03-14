# SSOT: 客室端末メニュー閲覧（GUEST_MENU_VIEW）

**作成日**: 2025-10-14  
**最終更新**: 2025-10-14  
**バージョン**: v1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（Phase 2 Week 5）

**関連SSOT**:
- [SSOT_GUEST_ORDER_FLOW.md](./SSOT_GUEST_ORDER_FLOW.md) - 注文フロー（必読）
- [SSOT_SAAS_MENU_MANAGEMENT.md](../01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md) - メニュー管理
- [SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md](../00_foundation/SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md) - UIデザイン原則
- [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md) - 多言語化システム
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ

**注**: 本SSOTは**客室端末からのメニュー閲覧機能**を定義します。注文フローは GUEST_ORDER_FLOW.md に分離されています。

---

## 📋 目次

1. [概要](#概要)
2. [システム境界](#システム境界)
3. [画面構成](#画面構成)
4. [UIデザイン](#uiデザイン)
5. [コンポーネント設計](#コンポーネント設計)
6. [API設計](#api設計)
7. [検索・フィルタリング](#検索フィルタリング)
8. [AI機能統合](#ai機能統合)
9. [動画コンテンツ](#動画コンテンツ)
10. [実装ガイド](#実装ガイド)
11. [セキュリティ](#セキュリティ)

---

## 📖 概要

### 目的

ホテル客室に設置されたタブレット・TV等の端末から、宿泊客が**ルームサービスのメニューを閲覧・検索・フィルタリング**するための統合UI/UXを提供する。

### 基本方針

- **Netflix型UI**: カルーセル・カード型デザインで直感的な閲覧体験
- **文化的配慮**: 店舗側のカテゴリ設計による宗教的・食事制限への対応
- **AIチャット連携**: メニュー選びをAIがサポート
- **滞在スタイル分析**: 滞在パターンに応じた最適なメニュー提案
- **動画対応**: 各メニューに動画コンテンツを追加可能
- **多言語対応**: 15言語対応（Phase 3以降）

### アーキテクチャ概要

```
[客室端末: タブレット/TV]
  ↓ ブラウザ（WebViewアプリ）
[hotel-saas Pages (Vue 3/Nuxt 3)]
  ├─ /menu（メニュートップ）= pages/menu/index.vue
  └─ /menu/category/[id]（カテゴリ詳細）= pages/menu/category/[id].vue
[hotel-saas Components]
  ├─ CategoryTabs.vue（3階層カテゴリナビゲーション）
  ├─ CategoryList.vue（カテゴリ一覧）
  ├─ MenuCard.vue（商品カード）
  ├─ AvailabilityMask.vue（提供時間外マスク）
  └─ GachaMenuCard.vue（ガチャ機能）
[hotel-saas API (Proxy)]
  ↓ GET /api/v1/order/menu
  ↓ GET /api/v1/menu/categories
  ↓ GET /api/v1/menu/recommended
[hotel-common API (Core)]
  ↓ Prisma ORM
[PostgreSQL (統一DB)]
  ├─ menu_items テーブル
  ├─ menu_categories テーブル（旧）
  └─ tags テーブル（新：3階層カテゴリ）
```

---

## 🎯 システム境界

### 対象システム

| システム | 役割 | 実装範囲 |
|:---------|:-----|:--------|
| **hotel-saas** | 客室端末UI + プロキシAPI | ✅ Pages, Components, Stores, Middleware |
| **hotel-common** | コアAPI実装 | ✅ メニューデータ取得API |
| **hotel-pms** | 将来連携 | 🔄 国籍データ連携（Phase 4）|
| **hotel-member** | 将来連携 | 🔄 パーソナライズ・スタンプラリー（Phase 4）|

### 機能範囲

#### ✅ 本SSOTの対象

- 客室端末の2画面（メニュートップ、カテゴリ詳細）
- メニュー閲覧・検索・フィルタリング機能
- 3階層カテゴリナビゲーション
- Netflix型カルーセルUI
- 文化的配慮カテゴリ（ハラール、ベジタリアン等）
- AIチャットコンシェルジュ連携
- 動画コンテンツ表示

#### ❌ 本SSOTの対象外

- 注文フロー（カート、注文確定） → [SSOT_GUEST_ORDER_FLOW.md](./SSOT_GUEST_ORDER_FLOW.md)
- メニュー管理画面 → [SSOT_SAAS_MENU_MANAGEMENT.md](../01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md)
- キッチン画面 → 別SSOT（未作成）

---

## 🖥️ 画面構成

### 画面一覧（2画面）

**ページパス**: Page Registry（`SSOT_PAGE_REGISTRY.md`）を参照（canonical）

| # | 画面パス | 画面名 | 主要機能 |
|:-:|:---------|:-------|:--------|
| 1 | `/menu` | メニュートップ | トップレベルカテゴリ一覧、おすすめメニュー |
| 2 | `/menu/category/[id]` | カテゴリ詳細 | 子カテゴリ展開、商品フィルタリング |

### 画面遷移フロー

```mermaid
graph TD
    A[/] --> B[/menu メニュートップ]
    B --> C[カテゴリカード選択]
    C --> D[/menu/category/[id] カテゴリ詳細]
    D --> E[子カテゴリ選択]
    E --> D
    D --> F[商品選択 → GUEST_ORDER_FLOW]
    B --> G[おすすめメニュー選択 → GUEST_ORDER_FLOW]
```

---

## 🎨 UIデザイン

### Netflix型デザイン適用

**参照**: [SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md](../00_foundation/SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md)

#### 特徴

```yaml
レイアウト:
  - カード型グリッドレイアウト
  - 横スクロールカルーセル（カテゴリー別）
  - 大きな画像とホバーエフェクト
  - レスポンシブグリッド（自動調整）

インタラクション:
  - ホバー時に拡大・詳細表示
  - スムーズなアニメーション（duration-300）
  - 画像遅延読み込み（Lazy Loading）
  - 無限スクロール対応（Phase 3）

パーソナライゼーション:
  - "あなたにおすすめ" セクション（Phase 2）
  - 滞在スタイル分析ベースの提案（Phase 2）
  - 人気商品の自動表示（実装済み）
```

#### 日本の伝統色パレット

```typescript
colors: {
  // 主要カラー
  primary: '#E54848',      // 琥珀色（価格・CTA）
  primaryDark: '#C23737',  // 琥珀色（濃）
  
  // テキストカラー
  textPrimary: '#165E83',  // 深藍（見出し）
  textSecondary: '#4A5568', // グレー（本文）
  
  // 背景カラー
  bgPrimary: '#F5F7FA',    // 白群（背景）
  bgCard: '#FFFFFF',       // 白（カード）
  
  // アクセント
  accent: '#F59E0B',       // アンバー（バッジ）
  success: '#10B981',      // グリーン（在庫あり）
  warning: '#EF4444'       // レッド（在庫なし）
}
```

---

## 📄 画面詳細仕様

### 1. メニュートップ（canonical: `/menu`）

#### 画面構成

```vue
<template>
  <div class="menu-top-page">
    <!-- ヘッダー -->
    <header class="header">
      <h1 class="text-2xl font-bold text-[#165E83]">メニュー一覧</h1>
      <div class="header-actions">
        <button class="btn-search">🔍 検索</button>
        <button class="btn-language">🌐 Language</button>
      </div>
    </header>
    
    <!-- おすすめセクション（Phase 2強化） -->
    <section class="recommended-section">
      <h2 class="text-xl font-bold mb-4 text-[#165E83]">
        ✨ あなたにおすすめ
      </h2>
      <div class="carousel horizontal-scroll">
        <MenuCard
          v-for="item in recommendedItems"
          :key="item.id"
          :item="item"
          class="min-w-[280px]"
        />
      </div>
    </section>
    
    <!-- トップレベルカテゴリ一覧 -->
    <section class="categories-section">
      <h2 class="text-xl font-bold mb-4 text-[#165E83]">
        カテゴリから選ぶ
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NuxtLink
          v-for="category in topLevelCategories"
          :key="category.id"
          :to="`/menu/category/${category.id}`"
          class="category-card"
        >
          <img
            v-if="category.imageUrl"
            :src="category.imageUrl"
            class="w-full h-48 object-cover rounded-t-lg"
          />
          <div class="p-4">
            <h3 class="text-xl font-bold text-[#165E83]">
              {{ category.name }}
            </h3>
            <p class="text-gray-600 text-sm mt-2">
              {{ category.description }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </section>
    
    <!-- AIチャットボタン（Phase 2） -->
    <button class="fixed bottom-20 right-6 btn-ai-chat">
      <Icon name="heroicons:sparkles" class="w-6 h-6" />
    </button>
  </div>
</template>
```

#### 主要機能

1. **トップレベルカテゴリ表示**
   - `parentId`がnullのカテゴリを抽出
   - グリッドレイアウト（1-3列、レスポンシブ）
   - カテゴリ画像・名前・説明を表示

2. **おすすめメニュー表示**
   - API: `GET /api/v1/menu/recommended`
   - 横スクロールカルーセル形式
   - `isFeatured=true`の商品を優先表示

3. **ローディング状態管理**
   - `LoadingBlock`コンポーネント使用
   - エラー時の適切なメッセージ表示

#### データ取得

```typescript
// Composition API
const { isLoading: loading } = useLoading(true)
const categories = ref<Category[]>([])
const recommendedItems = ref<MenuItem[]>([])

// トップレベルカテゴリ
const topLevelCategories = computed(() => {
  return categories.value.filter(category => !category.parentId)
})

// カテゴリ取得
const fetchMenu = async () => {
  const response = await fetch('/api/v1/menu/categories')
  const data = await response.json()
  categories.value = data.categories
}

// おすすめメニュー取得
const fetchRecommended = async () => {
  const response = await fetch('/api/v1/menu/recommended')
  const data = await response.json()
  recommendedItems.value = data.items
}
```

---

### 2. カテゴリ詳細（canonical: `/menu/category/[id]`）

#### 画面構成

```vue
<template>
  <div class="category-detail-page">
    <!-- パンくずリスト（Phase 2追加予定） -->
    <nav class="breadcrumb">
      <NuxtLink to="/menu">メニュー</NuxtLink>
      <span> > </span>
      <span>{{ currentCategory?.name }}</span>
    </nav>
    
    <!-- カテゴリヘッダー -->
    <header class="category-header">
      <h1 class="text-2xl font-bold text-[#165E83]">
        {{ currentCategory?.name }}
      </h1>
      <p v-if="currentCategory?.description" class="text-gray-600 mt-2">
        {{ currentCategory.description }}
      </p>
    </header>
    
    <!-- 子カテゴリ展開（ある場合） -->
    <section v-if="hasChildren" class="child-categories mb-8">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <NuxtLink
          v-for="category in childCategories"
          :key="category.id"
          :to="`/menu/category/${category.id}`"
          class="child-category-card"
        >
          <h2 class="font-bold text-[#165E83]">{{ category.name }}</h2>
          <p v-if="category.description" class="text-sm text-gray-600 mt-2">
            {{ category.description }}
          </p>
        </NuxtLink>
      </div>
    </section>
    
    <!-- フィルタ・ソートバー（Phase 2追加予定） -->
    <div class="filter-bar">
      <button
        v-for="filter in culturalFilters"
        :key="filter.value"
        @click="toggleFilter(filter.value)"
        :class="{ active: activeFilters.includes(filter.value) }"
        class="filter-btn"
      >
        {{ filter.icon }} {{ filter.label }}
      </button>
    </div>
    
    <!-- 商品グリッド -->
    <section class="items-grid">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="menu-item-card"
        >
          <!-- 動画 or 画像 -->
          <video
            v-if="item.videoUrl"
            :src="item.videoUrl"
            class="w-full h-48 object-cover rounded-t-lg"
            autoplay
            muted
            loop
          />
          <img
            v-else
            :src="item.imageUrl"
            class="w-full h-48 object-cover rounded-t-lg"
          />
          
          <div class="p-4">
            <h3 class="font-bold text-lg text-[#165E83]">{{ item.name }}</h3>
            <p class="text-gray-600 text-sm mt-2 line-clamp-2">
              {{ item.description }}
            </p>
            <div class="mt-4 flex justify-between items-center">
              <span class="text-xl font-bold text-[#E54848]">
                ¥{{ item.price.toLocaleString() }}
              </span>
              <button
                v-if="item.available"
                @click="openItemDetail(item)"
                class="bg-[#E54848] text-white px-4 py-2 rounded-lg hover:bg-[#C23737]"
              >
                選択
              </button>
              <span v-else class="text-gray-500">準備中</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
```

#### 主要機能

1. **子カテゴリ展開表示**
   - `parentId`が現在のカテゴリIDと一致するカテゴリを抽出
   - グリッド表示（2-3列）

2. **タグベース商品フィルタリング**
   - カテゴリに関連する全タグを取得
   - 商品の`tags`フィールドでフィルタリング

3. **文化的配慮フィルター（Phase 2）**
   - ハラール対応
   - ベジタリアン
   - ビーガン
   - 豚肉不使用
   - 牛肉不使用
   - アルコール不使用

#### データ取得・フィルタリング

```typescript
const route = useRoute()
const categoryId = route.params.id as string

// メニューデータ取得
const { data: menuData } = await useFetch('/api/v1/order/menu')
const { categories, items } = menuData.value

// 現在のカテゴリ
const currentCategory = computed(() => {
  return categories.find(c => c.id === categoryId)
})

// 子カテゴリ確認
const hasChildren = computed(() => {
  return categories.some(c => c.parentId === categoryId)
})

// 子カテゴリ一覧
const childCategories = computed(() => {
  return categories.filter(c => c.parentId === categoryId)
})

// タグベースフィルタリング
const relatedTags = computed(() => {
  return getAllRelatedTags(categories, categoryId)
})

const filteredItems = computed(() => {
  let result = items.filter(item => {
    return item.tags.some(tag => relatedTags.value.includes(tag))
  })
  
  // 文化的配慮フィルター適用
  if (activeFilters.value.includes('halal')) {
    result = result.filter(item => item.isHalal)
  }
  if (activeFilters.value.includes('vegetarian')) {
    result = result.filter(item => item.isVegetarian)
  }
  
  return result
})
```

---

## 🧩 コンポーネント設計

### 1. CategoryTabs.vue（3階層カテゴリナビゲーション）

**ファイルパス**: `components/menu/CategoryTabs.vue`

#### 機能概要

- 3階層カテゴリ（L1/L2/L3）のナビゲーションUI
- アニメーション付き展開/折りたたみ
- 選択インジケーター表示
- スクロールバー非表示デザイン

#### Props

```typescript
defineProps<{
  tags: Tag[]  // 全タグデータ
}>()
```

#### Emits

```typescript
emit('select', path: string)  // カテゴリ選択時
```

#### 主要機能

1. **Level 1カテゴリ（大カテゴリ）**
   - ボタン形式
   - 横スクロール
   - 選択時: 琥珀色（#E54848）
   - 未選択時: 白背景

2. **Level 2カテゴリ（中カテゴリ）**
   - グリッド表示（2-4列）
   - 選択時: グラデーション背景
   - チェックマークアイコン

3. **Level 3カテゴリ（小カテゴリ）**
   - グリッド表示（3-5列）
   - 小さめサイズ
   - 選択時: 琥珀色

---

### 2. MenuCard.vue（商品カード）

**ファイルパス**: `components/menu/MenuCard.vue`

#### Props

```typescript
defineProps<{
  item: MenuItem
  badge?: string
  badgeColor?: string
}>()
```

#### 表示内容

- 商品画像 or 動画
- 商品名
- 商品説明（2行で切り捨て）
- 価格
- バッジ（オプション）
- 在庫状況

#### ホバーエフェクト

```css
.menu-card {
  transition: all 0.3s ease;
}

.menu-card:hover {
  transform: scale(1.05);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

---

### 3. AvailabilityMask.vue（提供時間外マスク）

**ファイルパス**: `components/menu/AvailabilityMask.vue`

#### 機能

商品の提供時間外に半透明マスクを表示

#### Props

```typescript
defineProps<{
  timeRestrictions: TimeRestriction[]
  currentTime: Date
}>()
```

---

### 4. GachaMenuCard.vue（ガチャ機能）

**ファイルパス**: `components/menu/GachaMenuCard.vue`

#### 機能

- 今日のラッキーメニュー
- ガチャ演出
- ポイント2倍表示

#### Phase 2強化案

- デイリーチャレンジ機能追加
- ウィークリーミッション追加
- Member連携でスタンプラリー（Phase 4）

---

## 🔌 API設計

### API一覧（7エンドポイント）

**APIパス（canonical）**: `SSOT_API_REGISTRY.md` を参照（Guest API）

| # | メソッド | パス | 機能 |
|:-:|:--------|:-----|:-----|
| 1 | GET | `/api/v1/guest/categories` | カテゴリ一覧取得 |
| 2 | GET | `/api/v1/guest/menus` | 全メニューデータ取得 |
| 3 | GET | `/api/v1/guest/menus/:id` | メニュー詳細取得 |

### API詳細仕様

#### 1. 全メニューデータ取得

**エンドポイント**: `GET /api/v1/order/menu`

**レスポンス**:
```json
{
  "tags": [
    { "path": "food", "name": "食べ物", "nameJa": "食べ物", "nameEn": "Food" }
  ],
  "items": [
    {
      "id": 1,
      "nameJa": "和牛ステーキ",
      "nameEn": "Wagyu Steak",
      "price": 3800,
      "imageUrl": "/uploads/steak.jpg",
      "videoUrl": "/uploads/steak.mp4",
      "tags": ["food", "food/western-food"],
      "isFeatured": true,
      "isHalal": false,
      "isVegetarian": false,
      "isVegan": false,
      "allergens": ["beef"],
      "available": true,
      "timeRestrictions": [
        { "start": "17:00", "end": "23:00" }
      ]
    }
  ]
}
```

#### 2. カテゴリ一覧取得

**エンドポイント**: `GET /api/v1/menu/categories`

**レスポンス**:
```json
{
  "categories": [
    {
      "id": "cat_001",
      "name": "食べ物",
      "description": "ルームサービスの食事メニュー",
      "parentId": null,
      "imageUrl": "/uploads/food-category.jpg",
      "sortOrder": 1
    }
  ]
}
```

---

## 🔍 検索・フィルタリング

### Phase 2実装機能

#### A. メニュー検索（Phase 2）

**API仕様**:
```typescript
// GET /api/v1/menus/search?q={keyword}
Response: {
  items: MenuItem[]
  totalCount: number
  searchTerm: string
}
```

**実装箇所**: ヘッダーの検索ボタン

---

#### B. 文化的配慮フィルター（Phase 2）

**管理画面での設定**:
- メニュー登録時に宗教的配慮フラグを設定
- アレルギー情報を選択式で登録

**客室端末での表示**:
```vue
<template>
  <div class="filter-buttons">
    <button
      v-for="filter in culturalFilters"
      :key="filter.value"
      @click="toggleFilter(filter.value)"
      :class="{ active: activeFilters.includes(filter.value) }"
    >
      {{ filter.icon }} {{ filter.label }}
    </button>
  </div>
</template>

<script setup>
const culturalFilters = [
  { value: 'halal', label: 'ハラール対応', icon: '🕌' },
  { value: 'vegetarian', label: 'ベジタリアン', icon: '🥗' },
  { value: 'vegan', label: 'ビーガン', icon: '🌱' },
  { value: 'no-pork', label: '豚肉不使用', icon: '🚫🐷' },
  { value: 'no-beef', label: '牛肉不使用', icon: '🚫🐮' },
  { value: 'alcohol-free', label: 'アルコール不使用', icon: '🚫🍷' }
]
</script>
```

---

## 🤖 AI機能統合

### A. ✅ AIチャットコンシェルジュ連携（Phase 2 - 最優先）

#### 実装方針

既存のAIコンシェルジュ機能（hotel-common）と統合

#### 実装箇所

**フローティングボタン**:
```vue
<template>
  <button
    class="fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-lg"
    @click="openAIChat"
  >
    <Icon name="heroicons:sparkles" class="w-6 h-6 text-white" />
    <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
  </button>
</template>
```

#### メニューコンテキスト

```typescript
// AIにメニューコンテキストを渡す
const menuContext = computed(() => ({
  currentPage: 'menu',
  viewingCategory: currentCategory.value?.name,
  cartItems: cartStore.items,
  guestPreferences: {
    dietary: guestProfile.value?.dietary,
    allergies: guestProfile.value?.allergies
  }
}))
```

#### 質問例

- 「辛くない料理はありますか？」
- 「子供でも食べられるメニューは？」
- 「このステーキの量はどれくらい？」
- 「ベジタリアンメニューを教えて」
- 「おすすめのワインはありますか？」

#### hotel-common連携

**API**: `POST /api/v1/ai/chat`

```json
{
  "message": "辛くない料理はありますか？",
  "context": {
    "page": "menu",
    "category": "food",
    "availableItems": [...],
    "guestProfile": {...}
  }
}
```

---

### B. ✅ 滞在スタイル分析型レコメンド（Phase 2）

#### 機能概要

滞在パターンを分析し、宿泊中の全体的な提案を行う

#### 滞在スタイル分析

```typescript
interface StayPattern {
  type: 'business' | 'leisure' | 'family' | 'couple' | 'solo'
  checkInTime: string
  lastOrderTime: string
  orderFrequency: number
  averageSpending: number
  activeHours: string[]
}

// 分析ロジック
const analyzeStayPattern = (guestData: GuestData): StayPattern => {
  // チェックイン時間から推測
  const checkInHour = new Date(guestData.checkInTime).getHours()
  
  // 注文パターンから推測
  const orderTimes = guestData.orders.map(o => new Date(o.createdAt).getHours())
  
  // ビジネス判定: 平日・早朝チェックイン・深夜注文多
  if (isWeekday && checkInHour < 10 && orderTimes.some(h => h >= 22)) {
    return { type: 'business', ...}
  }
  
  // ファミリー判定: 子供向けメニュー注文あり
  if (guestData.orders.some(o => o.items.some(i => i.tags.includes('kids')))) {
    return { type: 'family', ...}
  }
  
  // カップル判定: 記念日・2名予約
  if (guestData.occasion === 'anniversary' || guestData.guestCount === 2) {
    return { type: 'couple', ...}
  }
  
  return { type: 'leisure', ...}
}
```

#### パターン別レコメンド

```typescript
const getRecommendations = (pattern: StayPattern) => {
  switch (pattern.type) {
    case 'business':
      return {
        menu: ['朝食セット', 'クイックランチ', '深夜軽食'],
        timing: '早朝6:00-8:00、深夜22:00-24:00',
        message: 'お仕事お疲れ様です。すぐにお召し上がりいただけるメニューをご用意しました。'
      }
      
    case 'family':
      return {
        menu: ['お子様ランチ', 'ファミリーセット', 'アレルギー対応'],
        timing: '18:00-19:00のディナー',
        message: 'ご家族でのお食事を楽しんでいただけるメニューをご用意しました。'
      }
      
    case 'couple':
      return {
        menu: ['記念日ケーキ', 'シャンパン', 'ペアディナー'],
        timing: '20:00-21:00のディナー',
        message: '特別な時間をより素敵に。おふたりのためのメニューをご用意しました。'
      }
  }
}
```

---

### C. ⚠️ ゲストプロファイル設定（Phase 2）

#### 実装方針

国籍データに依存せず、ゲスト自身が手動登録

#### 初回アクセス時のプロファイル設定モーダル

```vue
<template>
  <div v-if="!guestProfile" class="profile-modal">
    <div class="modal-content">
      <h2 class="text-xl font-bold text-[#165E83] mb-4">
        🍽️ 食事の好みを教えてください
      </h2>
      <p class="text-sm text-gray-600 mb-6">
        より快適なメニュー体験のため、任意でご登録ください
      </p>
      
      <!-- アレルギー情報 -->
      <div class="form-group mb-6">
        <h3 class="font-medium mb-2">アレルギー情報</h3>
        <div class="checkbox-grid grid grid-cols-2 gap-2">
          <label v-for="allergen in allergenList" :key="allergen.value">
            <input type="checkbox" v-model="profile.allergies" :value="allergen.value" />
            {{ allergen.label }}
          </label>
        </div>
      </div>
      
      <!-- 食事制限 -->
      <div class="form-group mb-6">
        <h3 class="font-medium mb-2">食事制限</h3>
        <select v-model="profile.dietary" class="w-full">
          <option value="">指定なし</option>
          <option value="halal">ハラール</option>
          <option value="kosher">コーシャ</option>
          <option value="vegetarian">ベジタリアン</option>
          <option value="vegan">ビーガン</option>
        </select>
      </div>
      
      <div class="flex gap-4">
        <button @click="saveProfile" class="btn-primary flex-1">
          設定を保存
        </button>
        <button @click="skipProfile" class="btn-secondary flex-1">
          スキップ
        </button>
      </div>
    </div>
  </div>
</template>
```

#### 警告表示

```vue
<template>
  <!-- 商品詳細モーダル内 -->
  <div v-if="hasConflict(item)" class="alert bg-red-50 border-l-4 border-red-600 p-4 mb-4">
    <div class="flex items-start gap-3">
      <Icon name="heroicons:exclamation-triangle" class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <p class="font-bold text-red-800">⚠️ ご注意ください</p>
        <p class="text-red-700 mt-1">
          この商品には「{{ conflictAllergen }}」が含まれています。
        </p>
        <p class="text-sm text-red-600 mt-2">
          あなたのプロファイルでは「{{ conflictAllergen }}」アレルギーが登録されています。
        </p>
      </div>
    </div>
  </div>
</template>
```

---

## 🎬 動画コンテンツ

### A. ✅ メニュー動画対応（Phase 2）

#### データベース拡張

**menu_items テーブル**:
```prisma
model MenuItem {
  // 既存フィールド
  imageUrl    String?  @map("image_url")
  
  // Phase 2追加フィールド
  videoUrl    String?  @map("video_url")  // 動画URL
  
  @@map("menu_items")
}
```

#### 管理画面での設定

```vue
<template>
  <div class="menu-video-section">
    <h3 class="font-medium mb-2">メニュー動画</h3>
    
    <!-- 動画アップロード -->
    <input
      type="file"
      accept="video/*"
      @change="uploadVideo"
      class="mb-4"
    />
    
    <!-- または動画URL -->
    <input
      v-model="menuData.videoUrl"
      placeholder="動画URL (YouTube/Vimeo/直接URL)"
      class="w-full mb-4"
    />
    
    <!-- プレビュー -->
    <video
      v-if="menuData.videoUrl"
      :src="menuData.videoUrl"
      controls
      class="w-full rounded-lg"
    />
  </div>
</template>
```

#### 客室端末での表示

```vue
<template>
  <div class="menu-card">
    <!-- 動画優先、なければ画像 -->
    <video
      v-if="item.videoUrl"
      :src="item.videoUrl"
      class="w-full h-48 object-cover rounded-t-lg"
      autoplay
      muted
      loop
      playsinline
    />
    <img
      v-else
      :src="item.imageUrl"
      class="w-full h-48 object-cover rounded-t-lg"
    />
  </div>
</template>
```

---

### B. ✅ サンクスムービー（Phase 2）

#### 実装箇所

注文完了モーダル（GUEST_ORDER_FLOW内）

#### テナント設定

**tenant_settings テーブル拡張**:
```prisma
model TenantSettings {
  // 既存フィールド
  
  // Phase 2追加
  thankYouVideoUrl  String?  @map("thank_you_video_url")
  
  @@map("tenant_settings")
}
```

#### 表示

```vue
<template>
  <div class="order-complete-modal">
    <!-- サンクスムービー -->
    <video
      v-if="thankYouVideo"
      :src="thankYouVideo"
      autoplay
      class="w-full rounded-lg mb-4"
    />
    
    <!-- メッセージ -->
    <h2 class="text-2xl font-bold text-[#165E83] text-center">
      ご注文ありがとうございます
    </h2>
    <p class="text-gray-600 text-center mt-2">
      心を込めてお作りいたします
    </p>
  </div>
</template>
```

---

### C. 🔮 AI動画生成（Phase 5以降 - メモ）

#### 将来構想

Sora 2 API統合による動画自動生成

#### コンセプト（管理画面）

```vue
<template>
  <div class="ai-video-generation">
    <h3 class="font-medium mb-2">🎬 AI動画生成（Sora 2）</h3>
    <p class="text-sm text-gray-600 mb-4">
      ※ プレミアムプラン限定機能
    </p>
    
    <button @click="generateVideo" class="btn-ai-generate mb-4">
      <Icon name="heroicons:sparkles" />
      このメニューの動画をAI生成
    </button>
    
    <textarea
      v-model="videoPrompt"
      placeholder="例: シェフが鉄板でステーキを焼いているシーン、湯気が立ち上る様子、美味しそうな焼き目"
      class="w-full h-24"
    />
  </div>
</template>
```

**メモ**: Phase 5以降の実装、コスト・API安定性を見て判断

---

## 🛠️ 実装ガイド

### Phase 1: 既存機能確認（完了）

**実装内容**:
- ✅ 2画面の実装（85-90%完成）
- ✅ 5コンポーネントの実装（95-100%完成）
- ✅ 4 APIの実装（完成）

### Phase 2: AI・動画機能追加（2週間）

**Week 1: AI機能**

1. **AIチャットコンシェルジュ連携**（2日）
   - フローティングボタン追加
   - ChatInterfaceコンポーネント統合
   - メニューコンテキスト連携

2. **滞在スタイル分析**（3日）
   - 滞在パターン分析ロジック実装
   - パターン別レコメンド実装
   - おすすめセクション強化

3. **ゲストプロファイル設定**（2日）
   - プロファイル設定モーダル実装
   - アレルギー・食事制限警告表示
   - プロファイルデータ保存API

**Week 2: 文化的配慮・動画**

4. **文化的配慮フィルター**（2日）
   - 管理画面でのフラグ設定UI
   - 客室端末でのフィルターボタン
   - フィルタリングロジック実装

5. **メニュー動画対応**（2日）
   - データベースマイグレーション
   - 管理画面での動画アップロード
   - 客室端末での動画表示

6. **サンクスムービー**（1日）
   - テナント設定拡張
   - 注文完了モーダルに統合

7. **既存ガチャメニュー強化**（1日）
   - デイリーチャレンジ追加
   - ウィークリーミッション追加

**Phase 2合計工数**: 13日

### Phase 3: 検索・フィルタ強化（1週間）

8. **メニュー検索機能**（2日）
9. **パンくずリスト**（0.5日）
10. **ソート機能**（1日）
11. **AI翻訳（管理画面）**（3日）

### Phase 4: Member連携（hotel-member完成後）

12. **AIパーソナライズ学習**（5日）
13. **スタンプラリー**（3日）
14. **会員ランク別メニュー**（2日）

### Phase 5: 高度な機能（要エビデンス）

15. **AI画像認識検索**（5日、利用データ次第）
16. **AI動画生成（Sora 2）**（未定、API安定性次第）

---

## 🔐 セキュリティ

### デバイス自動認証

**実装場所**: `middleware/device-guard.ts`

**認証フロー**:
```typescript
// ✅ APIパス（canonical）: SSOT_API_REGISTRY.md を参照
// hotel-common: GET /api/v1/guest/device/status?ip=auto
// 必須ヘッダー: x-tenant-id

const tenantId = event.context.tenantId
if (!tenantId) {
  return sendRedirect(event, '/unauthorized-device', 302)
}

try {
  const response = await callHotelCommonAPI(event, '/api/v1/guest/device/status', {
    method: 'GET',
    headers: { 'x-tenant-id': tenantId },
    params: { ip: 'auto' }
  })

  const roomId = response.data?.roomId
  if (!roomId) {
    return sendRedirect(event, '/unauthorized-device', 302)
  }

  // コンテキストに設定
  event.context.roomId = roomId
  event.context.deviceId = response.data?.deviceId || null
} catch (error: any) {
  // 404: 未登録/非アクティブ/他テナント（列挙耐性） → 未認証として扱う
  return sendRedirect(event, '/unauthorized-device', 302)
}
```

**hotel-common側API**:
```typescript
// GET /api/v1/guest/device/status?ip=auto
// - tenantId は x-tenant-id（またはホスト名）から解決
// - device_rooms を (MAC優先 → IP) で検索し、isActive=true のみ許可
// - 未登録/非アクティブ/他テナントは 404（列挙耐性）
return createSuccessResponse({
  roomId: device.roomId,
  deviceId: device.deviceId
})
```

### XSS対策

- ✅ Vue 3のデフォルトエスケープ機能
- ✅ `v-html`使用禁止
- ✅ ユーザー入力のバリデーション

### CSRF対策

- ✅ SameSite Cookie属性
- ✅ Nuxt 3のCSRF保護

### データ保護

- ✅ テナントID必須フィルタ
- ✅ セッションベースのデータ分離
- ✅ ゲストプロファイルはローカルストレージ（暗号化）

---

## 🧭 Page Registry 参照（必須）

- ページパス（canonical）は `SSOT_PAGE_REGISTRY.md` を参照すること。
- 進捗・実装ギャップは Plane / reports 側で管理し、本SSOTには記載しない。

---

## 🆕 MVP機能対応（追記）

### F02: 在庫・時間帯コンテキスト連携
- 関連COM: COM-241（[MVP] TVメニュー閲覧）
- 概要: 提供不可商品はマスク表示 or 非表示。提供可否は在庫・提供時間帯で判定。
- Accept:
  - [ ] 提供不可商品の「選択」ボタンを表示しない（または無効化＋理由表示）
  - [ ] 現在時刻が提供外の商品のカードに半透明マスク＋バッジ

### F05: Top3レコメンド（Stage 1）
- 関連COM: COM-257（[Stage 1] 時間帯Top3レコメンド）
- 概要: 初期は静的Top3枠をメニュートップに表示（時間帯/在庫反映はStage 1で強化）
- Accept:
  - [ ] メニュートップ上部にTop3セクションが表示される
  - [ ] 枠は在庫切れ商品を除外して3件を表示（不足時は埋め草テキスト）

---

## 🎯 関連SSOT

### 必読SSOT
- [SSOT_GUEST_ORDER_FLOW.md](./SSOT_GUEST_ORDER_FLOW.md) - 注文フロー
- [SSOT_SAAS_MENU_MANAGEMENT.md](../01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md) - メニュー管理
- [SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md](../00_foundation/SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md) - UIデザイン原則

### 関連SSOT
- [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md) - 多言語化
- [SSOT_MULTICULTURAL_AI.md](../00_foundation/SSOT_MULTICULTURAL_AI.md) - 多文化AI
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ

---

**バージョン履歴**:
- v1.0.0 (2025-10-14): 初版作成。既存実装の完全文書化、Phase 2-4機能詳細仕様追加、AI・動画・MVVベース機能統合。


