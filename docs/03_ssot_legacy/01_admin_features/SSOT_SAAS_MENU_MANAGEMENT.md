# SSOT: メニュー管理システム（管理画面専用）

**作成日**: 2025-10-02  
**バージョン**: 2.2.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（Phase 1）  
**最終更新**: 2025-10-03（APIパスを/admin/menu/*に統一）

**対象ユーザー**: 🔐 **スタッフのみ（管理画面）**

**関連SSOT**:
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証（必須）
- [SSOT_SAAS_ORDER_MANAGEMENT.md](./SSOT_SAAS_ORDER_MANAGEMENT.md) - 注文管理（メニュー参照）
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤

---

## ⚠️ 重要: このSSOTのスコープ

### ✅ このSSOTが対象とするもの
- 🔐 **管理画面からのメニュー管理**（CRUD操作）
- 🔐 Session認証必須（スタッフのみ）
- 🔐 メニュー作成・更新・削除・在庫管理

### ❌ このSSOTが対象外とするもの
- 📱 **客室端末からのメニュー閲覧** → [SSOT_GUEST_MENU_VIEW.md](../02_guest_features/SSOT_GUEST_MENU_VIEW.md) を参照
- 📱 ゲスト向けUI → 上記SSOTを参照

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [データモデル](#データモデル)
5. [API仕様](#api仕様)
6. [システム間連携](#システム間連携)
7. [実装詳細](#実装詳細)
8. [既存実装状況](#既存実装状況)
9. [未実装機能](#未実装機能)

---

## 📖 概要

### 目的
ホテルスタッフがルームサービス用メニュー・カテゴリを管理するための**管理画面専用システム**を提供する。メニュー項目の作成・更新・削除、カテゴリ管理、在庫管理、多言語対応を実現する。

### 基本方針
- **管理画面専用**: スタッフによるCRUD操作のみ対象
- **Session認証必須**: hotel-saas管理画面からのアクセスのみ
- **統一API**: hotel-common がメニュー管理の中心
- **hotel-saas**: API プロキシ + 管理画面UI
- **多言語対応**: 日本語（必須）+ 英語（任意）
- **マルチテナント**: テナントごとの完全分離
- **在庫管理**: リアルタイム在庫追跡（将来実装）

### アーキテクチャ概要
```
[管理画面（スタッフ）] 🔐 Session認証必須
  ↓ メニューCRUD操作
[hotel-saas API (Proxy)]
  ↓ POST/PUT/DELETE /api/v1/admin/menu/*
[hotel-common API (Core)]
  ↓ Prisma ORM
[PostgreSQL (統一DB)]
  ├─ menu_items テーブル
  └─ menu_categories テーブル
```

---

## 🎯 スコープ

### 対象システム
- ✅ **hotel-common**: コア実装（メニューCRUD、ビジネスロジック）
- ✅ **hotel-saas**: プロキシAPI + 管理画面UI
- ❌ **hotel-pms**: 対象外（将来連携：料金連動）
- ❌ **hotel-member**: 対象外

### 機能範囲

#### ✅ 実装済み
- メニュー取得API（`/api/v1/admin/menu/items`）
- カテゴリ取得API（`/api/v1/admin/menu/categories`）
- hotel-saas プロキシAPI（`menuApi.getItems`, `menuApi.getCategories`）
- データベーステーブル（`menu_items`, `menu_categories`）

#### 🚧 部分実装
- メニュー作成・更新・削除API（`menuApi.createItem`, `menuApi.updateItem`, `menuApi.deleteItem` は定義済みだが実装未確認）

#### ❌ 未実装
- カテゴリ作成・更新・削除API
- 在庫管理機能
- セットメニュー機能
- 裏メニュー機能
- 期間限定メニュー機能
- メニューランキング機能
- 画像・動画アセット管理
- タグ管理

---

## 🌐 多言語対応

### 概要

メニュー管理システムは、日本語・英語を含む**15言語対応**をサポートします。

### 対象フィールド

| フィールド | 翻訳対象 | 既存カラム | 新規システム |
|-----------|---------|----------|------------|
| メニュー名 | ✅ | `name_ja`, `name_en` | `translations` |
| 説明文 | ✅ | `description_ja`, `description_en` | `translations` |
| アレルギー情報 | ✅ | （未実装） | `translations` |
| カテゴリ名 | ✅ | `name_ja`, `name_en` | `translations` |

### 実装方式

#### 統一翻訳テーブル方式

**参照SSOT**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

**アーキテクチャ**:
```
hotel-saas (管理画面)
  ↓ メニュー作成・更新
hotel-common (API)
  ↓ 自動翻訳ジョブ作成
translations テーブル (PostgreSQL)
  ↓ ベクトル化・保存
```

### データベース設計の拡張

#### 既存テーブル構造（維持）

```sql
-- menu_items（既存構造は変更なし）
CREATE TABLE menu_items (
  -- 基本情報（多言語）- 既存カラムは Phase 5まで維持
  name_ja         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  description_ja  TEXT,
  description_en  TEXT,
  
  -- ⚠️ 注: Phase 5（3-6ヶ月後）で削除予定
  --    新規開発では translations テーブルを使用すること
  
  -- ... 他のフィールド（変更なし）
);
```

#### translationsテーブル連携

```sql
-- 新規: 統一翻訳テーブル（hotel-common が管理）
-- 詳細は SSOT_MULTILINGUAL_SYSTEM.md を参照

-- エンティティタイプ
entity_type = 'menu_item'       -- メニュー項目
entity_type = 'menu_category'   -- メニューカテゴリ

-- フィールド名
field_name = 'name'             -- メニュー名
field_name = 'description'      -- 説明文
field_name = 'allergen_info'    -- アレルギー情報
```

### API仕様の拡張

#### 既存API（変更なし）

```typescript
// GET /api/v1/admin/menu/items
// 既存のレスポンス形式は維持
{
  menuItems: [
    {
      nameJa: "ハンバーグステーキ",
      nameEn: "Hamburger Steak",
      // ...
    }
  ]
}
```

#### 多言語対応API（新規追加）

```typescript
// GET /api/v1/admin/menu/items?lang=ko
// 多言語対応レスポンス（オプション）
{
  menuItems: [
    {
      id: 1,
      
      // 既存カラム（Phase 3まで）
      nameJa: "ハンバーグステーキ",
      nameEn: "Hamburger Steak",
      descriptionJa: "自家製ソースで...",
      descriptionEn: "With homemade sauce...",
      
      // 新規: translations テーブルから取得（Phase 2以降）
      translations: {
        name: {
          ja: "ハンバーグステーキ",
          en: "Hamburger Steak",
          ko: "특제 함박 스테이크",
          'zh-CN': "特制汉堡牛排"
        },
        description: {
          ja: "自家製ソースで...",
          en: "With homemade sauce...",
          ko: "국산 소고기 100% 사용의 특제 함박...",
          'zh-CN': "使用国产牛肉100%的特制汉堡..."
        }
      }
    }
  ]
}
```

### 新規登録時の動作

#### 管理画面でのメニュー作成フロー

```
1. スタッフが日本語でメニューを登録
   ↓
2. hotel-common がメニューを作成
   - menu_items テーブルに保存（name_ja, name_en）
   - translations テーブルに日本語を保存（entity_type='menu_item', language_code='ja'）
   ↓
3. hotel-common が翻訳ジョブを作成
   - translation_jobs テーブルに保存
   - status: 'pending'
   ↓
4. バックグラウンドで15言語へ自動翻訳
   - Google Translate API 呼び出し
   - translations テーブルに保存
   ↓
5. 翻訳完了
   - status: 'completed'
   - 管理画面にトースト通知
```

**所要時間**: 14言語 × 3フィールド = 42タスク → 1-2分

### フロントエンド実装

#### 言語切り替えUI

**実装箇所**: `/pages/admin/menu/index.vue`（既存ページへの追加）

```vue
<template>
  <div>
    <!-- 既存のメニュー一覧UI -->
    
    <!-- 新規: 言語切り替え -->
    <select v-model="selectedLang">
      <option value="ja">日本語</option>
      <option value="en">English</option>
      <option value="ko">한국어</option>
      <!-- ... 15言語 -->
    </select>
    
    <!-- メニュー表示（翻訳対応） -->
    <div v-for="item in menuItems" :key="item.id">
      <h3>{{ getTranslatedName(item) }}</h3>
      <p>{{ getTranslatedDescription(item) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const selectedLang = ref('ja')

const getTranslatedName = (item: MenuItem) => {
  // フォールバック戦略
  return item.translations?.name?.[selectedLang.value]  // 1. translations テーブル
    || (selectedLang.value === 'ja' ? item.nameJa : item.nameEn)  // 2. 既存カラム
    || item.nameJa  // 3. デフォルト（日本語）
}
</script>
```

### マイグレーション計画

#### Phase 1: 翻訳テーブル作成（Week 1）

**担当**: hotel-common (Iza AI)

- [ ] `translations` テーブル作成
- [ ] `translation_jobs` テーブル作成
- [ ] 翻訳エンジン実装

#### Phase 2: 既存データ移行（Week 1-2）

**担当**: hotel-common (Iza AI)

```sql
-- menu_items の name_ja, name_en を translations へ移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'menu_item',
  id::TEXT,
  'ja',
  'name',
  name_ja,
  'manual'
FROM menu_items
WHERE name_ja IS NOT NULL;

-- 同様に name_en, description_ja, description_en を移行
```

#### Phase 3: 既存カラム非推奨化（Week 2-4）

**担当**: hotel-common (Iza AI)

```sql
COMMENT ON COLUMN menu_items.name_ja IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください（entity_type=menu_item, field_name=name, language_code=ja）';
```

**重要**: 既存カラムは**削除しない**（Phase 5まで維持）

#### Phase 4: 15言語拡張（Week 4-6）

**担当**: hotel-common (Iza AI)

- バックグラウンドで既存データの残り13言語への翻訳実行
- 全言語での表示確認
- パフォーマンス最適化

#### Phase 5: 既存カラム削除（3-6ヶ月後）

**担当**: hotel-common (Iza AI)

```sql
-- 十分な移行期間後に既存カラムを削除
ALTER TABLE menu_items 
  DROP COLUMN name_ja,
  DROP COLUMN name_en,
  DROP COLUMN description_ja,
  DROP COLUMN description_en;
```

### 実装チェックリスト

#### hotel-common

- [ ] translationsテーブル作成
- [ ] translation_jobsテーブル作成
- [ ] TranslationEngineクラス実装
- [ ] バックグラウンド翻訳ジョブ実装
- [ ] API拡張（`?lang=ko`対応）

#### hotel-saas

- [ ] 言語切り替えUI実装
- [ ] フォールバックロジック実装
- [ ] 翻訳進捗表示UI
- [ ] 既存APIとの互換性確認

### 詳細仕様

**完全な仕様**: [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

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

## 📊 データモデル

### menu_items（メニュー項目）

#### PostgreSQL DDL

```sql
CREATE TABLE menu_items (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  
  -- 基本情報（多言語）
  name_ja         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  description_ja  TEXT,
  description_en  TEXT,
  
  -- 価格情報
  price           INTEGER NOT NULL,
  cost            INTEGER DEFAULT 0,
  
  -- カテゴリ
  category_id     INTEGER REFERENCES menu_categories(id),
  
  -- 表示制御
  image_url       VARCHAR(500),
  is_available    BOOLEAN DEFAULT true,
  is_featured     BOOLEAN DEFAULT false,
  is_hidden       BOOLEAN DEFAULT false,
  display_order   INTEGER DEFAULT 0,
  
  -- 販売制御
  start_time      TIME,
  end_time        TIME,
  age_restricted  BOOLEAN DEFAULT false,
  
  -- 在庫管理
  stock_available BOOLEAN DEFAULT true,
  stock_quantity  INTEGER,
  low_stock_threshold INTEGER DEFAULT 5,
  
  -- メタデータ
  tags            JSONB DEFAULT '[]',
  images          JSONB DEFAULT '[]',
  nutritional_info JSONB DEFAULT '{}',
  allergens       JSONB DEFAULT '[]',
  
  -- 共通フィールド
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  is_deleted      BOOLEAN DEFAULT false,
  deleted_at      TIMESTAMP,
  deleted_by      TEXT,
  
  CONSTRAINT fk_menu_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id)
);

-- インデックス
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(tenant_id, category_id);
CREATE INDEX idx_menu_items_available ON menu_items(tenant_id, is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(tenant_id, is_featured);
CREATE INDEX idx_menu_items_is_deleted ON menu_items(is_deleted);
```

#### Prismaモデル

```prisma
model MenuItem {
  id              Int       @id @default(autoincrement())
  tenantId        String    @map("tenant_id")
  
  // 基本情報（多言語）
  nameJa          String    @map("name_ja")
  nameEn          String?   @map("name_en")
  descriptionJa   String?   @map("description_ja")
  descriptionEn   String?   @map("description_en")
  
  // 価格情報
  price           Int
  cost            Int       @default(0)
  
  // カテゴリ
  categoryId      Int?      @map("category_id")
  
  // 表示制御
  imageUrl        String?   @map("image_url")
  isAvailable     Boolean   @default(true) @map("is_available")
  isFeatured      Boolean   @default(false) @map("is_featured")
  isHidden        Boolean   @default(false) @map("is_hidden")
  displayOrder    Int       @default(0) @map("display_order")
  
  // 販売制御
  startTime       DateTime? @map("start_time") @db.Time
  endTime         DateTime? @map("end_time") @db.Time
  ageRestricted   Boolean   @default(false) @map("age_restricted")
  
  // 在庫管理
  stockAvailable  Boolean   @default(true) @map("stock_available")
  stockQuantity   Int?      @map("stock_quantity")
  lowStockThreshold Int     @default(5) @map("low_stock_threshold")
  
  // メタデータ
  tags            Json      @default("[]")
  images          Json      @default("[]")
  nutritionalInfo Json      @default("{}") @map("nutritional_info")
  allergens       Json      @default("[]")
  
  // 共通フィールド
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  isDeleted       Boolean   @default(false) @map("is_deleted")
  deletedAt       DateTime? @map("deleted_at")
  deletedBy       String?   @map("deleted_by")
  
  // リレーション
  category        MenuCategory? @relation(fields: [categoryId], references: [id])
  
  @@index([tenantId], map: "idx_menu_items_tenant_id")
  @@index([tenantId, categoryId], map: "idx_menu_items_category_id")
  @@index([tenantId, isAvailable], map: "idx_menu_items_available")
  @@index([tenantId, isFeatured], map: "idx_menu_items_featured")
  @@index([isDeleted], map: "idx_menu_items_is_deleted")
  @@map("menu_items")
}
```

#### フィールド詳細

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `id` | Int | ✅ | メニュー項目ID（自動採番） |
| `tenantId` | String | ✅ | テナントID（マルチテナント分離） |
| `nameJa` | String | ✅ | メニュー名（日本語） |
| `nameEn` | String | ❌ | メニュー名（英語） |
| `descriptionJa` | String | ❌ | 説明（日本語） |
| `descriptionEn` | String | ❌ | 説明（英語） |
| `price` | Int | ✅ | 価格（税込・円） |
| `cost` | Int | ❌ | 原価（円） |
| `categoryId` | Int | ❌ | カテゴリID |
| `imageUrl` | String | ❌ | 画像URL |
| `isAvailable` | Boolean | ✅ | 提供可能フラグ |
| `isFeatured` | Boolean | ✅ | おすすめフラグ |
| `isHidden` | Boolean | ✅ | 非表示フラグ |
| `displayOrder` | Int | ✅ | 表示順序 |
| `startTime` | Time | ❌ | 提供開始時刻 |
| `endTime` | Time | ❌ | 提供終了時刻 |
| `ageRestricted` | Boolean | ✅ | 年齢制限フラグ |
| `stockAvailable` | Boolean | ✅ | 在庫ありフラグ |
| `stockQuantity` | Int | ❌ | 在庫数量（null=無制限） |
| `lowStockThreshold` | Int | ✅ | 在庫少閾値 |
| `tags` | Json | ✅ | タグ配列 |
| `images` | Json | ✅ | 画像配列 |
| `nutritionalInfo` | Json | ✅ | 栄養情報 |
| `allergens` | Json | ✅ | アレルゲン情報 |

---

### menu_categories（メニューカテゴリ）

**📝 Note**: `campaign_categories`等、他カテゴリとの衝突を避けるため`menu_categories`に命名

#### PostgreSQL DDL

```sql
CREATE TABLE menu_categories (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  
  -- 基本情報（多言語）
  name_ja         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  description_ja  TEXT,
  description_en  TEXT,
  
  -- 階層構造
  parent_id       INTEGER REFERENCES menu_categories(id),
  
  -- 表示制御
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  
  -- 共通フィールド
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  is_deleted      BOOLEAN DEFAULT false,
  deleted_at      TIMESTAMP,
  deleted_by      TEXT,
  
  CONSTRAINT fk_menu_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_menu_categories_parent FOREIGN KEY (parent_id) REFERENCES menu_categories(id)
);

-- インデックス
CREATE INDEX idx_menu_categories_tenant_id ON menu_categories(tenant_id);
CREATE INDEX idx_menu_categories_parent_id ON menu_categories(tenant_id, parent_id);
CREATE INDEX idx_menu_categories_is_active ON menu_categories(tenant_id, is_active);
CREATE INDEX idx_menu_categories_is_deleted ON menu_categories(is_deleted);
```

#### Prismaモデル

```prisma
model MenuCategory {
  id              Int             @id @default(autoincrement())
  tenantId        String          @map("tenant_id")
  
  // 基本情報（多言語）
  nameJa          String          @map("name_ja")
  nameEn          String?         @map("name_en")
  descriptionJa   String?         @map("description_ja")
  descriptionEn   String?         @map("description_en")
  
  // 階層構造
  parentId        Int?            @map("parent_id")
  
  // 表示制御
  sortOrder       Int             @default(0) @map("sort_order")
  isActive        Boolean         @default(true) @map("is_active")
  
  // 共通フィールド
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")
  isDeleted       Boolean         @default(false) @map("is_deleted")
  deletedAt       DateTime?       @map("deleted_at")
  deletedBy       String?         @map("deleted_by")
  
  // リレーション
  parent          MenuCategory?   @relation("MenuCategoryHierarchy", fields: [parentId], references: [id])
  children        MenuCategory[]  @relation("MenuCategoryHierarchy")
  menuItems       MenuItem[]
  
  @@index([tenantId], map: "idx_menu_categories_tenant_id")
  @@index([tenantId, parentId], map: "idx_menu_categories_parent_id")
  @@index([tenantId, isActive], map: "idx_menu_categories_is_active")
  @@index([isDeleted], map: "idx_menu_categories_is_deleted")
  @@map("menu_categories")
}
```

#### フィールド詳細

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `id` | Int | ✅ | カテゴリID（自動採番） |
| `tenantId` | String | ✅ | テナントID |
| `nameJa` | String | ✅ | カテゴリ名（日本語） |
| `nameEn` | String | ❌ | カテゴリ名（英語） |
| `descriptionJa` | String | ❌ | 説明（日本語） |
| `descriptionEn` | String | ❌ | 説明（英語） |
| `parentId` | Int | ❌ | 親カテゴリID（階層構造） |
| `sortOrder` | Int | ✅ | 表示順序 |
| `isActive` | Boolean | ✅ | 有効フラグ |

---

## 🔌 API仕様

### ⚠️ 認証要件の前提

#### hotel-common API
- **GET /api/v1/admin/menu/items**: Session認証が必要
- **POST/PUT/DELETE /api/v1/admin/menu/***: Session認証が必須（スタッフのみ）

#### hotel-saas API（プロキシ）
- **管理画面**: Session認証必須（`event.context.user`）

**重要**: メニューAPIは**管理画面専用API**。必ず認証を経由してアクセスされる。

---

### 1. メニュー一覧取得

**エンドポイント**: `GET /api/v1/admin/menu/items`

**実装箇所**:
- hotel-common: `/api/v1/admin/menu/items`（実装済み）
- hotel-saas: `menuApi.getItems()`（プロキシ実装済み）

**認証要件**:
- **管理画面**: Session認証必須

**リクエスト**:
```typescript
// Query Parameters
{
  categoryId?: number       // カテゴリIDフィルタ
  isAvailable?: boolean     // 提供可能のみ
  isFeatured?: boolean      // おすすめのみ
  limit?: number           // ページネーション（デフォルト: 100）
  offset?: number          // オフセット（デフォルト: 0）
}

// Headers（管理画面）
{
  'Authorization': 'Bearer {sessionId}',  // Session認証
  'X-Tenant-ID': '{tenantId}',
  'Content-Type': 'application/json'
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    menuItems: [
      {
        id: 1,
        tenantId: "tenant-xxx",
        nameJa: "ハンバーグステーキ",
        nameEn: "Hamburger Steak",
        descriptionJa: "自家製ソースで...",
        descriptionEn: "With homemade sauce...",
        price: 1200,
        cost: 600,
        categoryId: 10,
        imageUrl: "https://cdn.example.com/menu/1.jpg",
        isAvailable: true,
        isFeatured: true,
        isHidden: false,
        displayOrder: 1,
        startTime: null,
        endTime: null,
        ageRestricted: false,
        stockAvailable: true,
        stockQuantity: null,
        lowStockThreshold: 5,
        tags: ["洋食", "メイン"],
        images: [],
        nutritionalInfo: { calories: 450 },
        allergens: ["小麦", "乳"],
        createdAt: "2025-10-01T10:00:00Z",
        updatedAt: "2025-10-02T12:00:00Z"
      },
      // ...
    ],
    total: 50,
    limit: 100,
    offset: 0
  }
}
```

**実装状況**: ✅ 実装済み（hotel-common + hotel-saas プロキシ）

---

### 2. カテゴリ一覧取得

**エンドポイント**: `GET /api/v1/admin/menu/categories`

**実装箇所**:
- hotel-common: `/api/v1/admin/menu/categories`（実装済み）
- hotel-saas: `menuApi.getCategories()`（プロキシ実装済み）

**リクエスト**:
```typescript
// Query Parameters
{
  parentId?: number         // 親カテゴリIDフィルタ
  isActive?: boolean        // 有効のみ
}

// Headers（同上）
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    categories: [
      {
        id: 10,
        tenantId: "tenant-xxx",
        nameJa: "洋食",
        nameEn: "Western",
        descriptionJa: "洋食メニュー",
        descriptionEn: "Western dishes",
        parentId: null,
        sortOrder: 1,
        isActive: true,
        createdAt: "2025-10-01T10:00:00Z",
        updatedAt: "2025-10-02T12:00:00Z",
        children: [
          {
            id: 11,
            nameJa: "メイン",
            nameEn: "Main",
            parentId: 10,
            sortOrder: 1
          },
          // ...
        ]
      },
      // ...
    ],
    total: 20
  }
}
```

**実装状況**: ✅ 実装済み（hotel-common + hotel-saas プロキシ）

---

### 3. メニュー作成

**エンドポイント**: `POST /api/v1/admin/menu/items`

**実装箇所**:
- hotel-common: `/api/v1/admin/menu/items`（未実装または要確認）
- hotel-saas: `menuApi.createItem()`（API定義済み、実装要確認）

**リクエスト**:
```typescript
{
  nameJa: "新メニュー",          // 必須
  nameEn: "New Menu",            // 任意
  descriptionJa: "説明",         // 任意
  descriptionEn: "Description",  // 任意
  price: 1500,                   // 必須
  cost: 750,                     // 任意
  categoryId: 10,                // 任意
  imageUrl: "https://...",       // 任意
  isAvailable: true,             // デフォルト: true
  isFeatured: false,             // デフォルト: false
  displayOrder: 10,              // デフォルト: 0
  stockQuantity: 100,            // 任意（null=無制限）
  tags: ["洋食", "メイン"],      // 任意
  allergens: ["小麦", "乳"]      // 任意
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
    menuItem: {
      id: 100,
      tenantId: "tenant-xxx",
      nameJa: "新メニュー",
      // ... 全フィールド
      createdAt: "2025-10-02T15:00:00Z",
      updatedAt: "2025-10-02T15:00:00Z"
    }
  }
}
```

**バリデーション**:
- `nameJa` は必須（1-255文字）
- `price` は必須（0以上の整数）
- `tenantId` はリクエストヘッダーから取得
- `categoryId` が指定された場合、存在チェック

**実装状況**: 🚧 部分実装（API定義済み、実装要確認）

---

### 4. メニュー更新

**エンドポイント**: `PUT /api/v1/admin/menu/items/:id`

**実装箇所**:
- hotel-common: `/api/v1/admin/menu/items/:id`（未実装または要確認）
- hotel-saas: `menuApi.updateItem()`（API定義済み、実装要確認）

**リクエスト**:
```typescript
// Path Parameter
id: number

// Body（更新したいフィールドのみ）
{
  nameJa?: string,
  price?: number,
  isAvailable?: boolean,
  // ... その他のフィールド
}

// Headers（同上）
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    menuItem: {
      id: 1,
      // ... 更新後の全フィールド
      updatedAt: "2025-10-02T16:00:00Z"
    }
  }
}
```

**バリデーション**:
- メニュー項目の存在チェック
- テナント分離チェック（自テナントのメニューのみ更新可能）
- 権限チェック（スタッフのみ）

**実装状況**: 🚧 部分実装（API定義済み、実装要確認）

---

### 5. メニュー削除（論理削除）

**エンドポイント**: `DELETE /api/v1/admin/menu/items/:id`

**実装箇所**:
- hotel-common: `/api/v1/admin/menu/items/:id`（未実装または要確認）
- hotel-saas: `menuApi.deleteItem()`（API定義済み、実装要確認）

**リクエスト**:
```typescript
// Path Parameter
id: number

// Headers（同上）
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    message: "メニューを削除しました",
    menuItem: {
      id: 1,
      isDeleted: true,
      deletedAt: "2025-10-02T17:00:00Z",
      deletedBy: "staff-xxx"
    }
  }
}
```

**ビジネスロジック**:
- 物理削除ではなく論理削除（`isDeleted = true`）
- `deletedAt`、`deletedBy` を設定
- 削除済みメニューは一覧取得時に除外

**実装状況**: 🚧 部分実装（API定義済み、実装要確認）

---

### 6. メニュー取得（単体）

**エンドポイント**: `GET /api/v1/admin/menu/items/:id`

**実装箇所**: 未実装（要作成）

**リクエスト**:
```typescript
// Path Parameter
id: number

// Headers（同上）
```

**レスポンス**: メニューオブジェクト（詳細）

**実装状況**: ❌ 未実装

---

### 7. カテゴリ作成

**エンドポイント**: `POST /api/v1/admin/menu/categories`

**実装箇所**: 未実装（要作成）

**リクエスト**:
```typescript
{
  nameJa: "新カテゴリ",          // 必須
  nameEn: "New Category",        // 任意
  descriptionJa: "説明",         // 任意
  descriptionEn: "Description",  // 任意
  parentId: null,                // 任意（階層構造）
  sortOrder: 10,                 // デフォルト: 0
  isActive: true                 // デフォルト: true
}

// Headers（同上）
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    category: {
      id: 50,
      tenantId: "tenant-xxx",
      nameJa: "新カテゴリ",
      // ... 全フィールド
      createdAt: "2025-10-02T15:00:00Z"
    }
  }
}
```

**実装状況**: ❌ 未実装

---

### 8. カテゴリ更新

**エンドポイント**: `PUT /api/v1/admin/menu/categories/:id`

**実装箇所**: 未実装（要作成）

**実装状況**: ❌ 未実装

---

### 9. カテゴリ削除（論理削除）

**エンドポイント**: `DELETE /api/v1/admin/menu/categories/:id`

**実装箇所**: 未実装（要作成）

**実装状況**: ❌ 未実装

---

## 🔗 システム間連携

### hotel-saas → hotel-common

#### 認証ヘッダー

**すべてのAPIリクエストに付与**:
```typescript
headers: {
  'Authorization': `Bearer ${user.sessionId}`,  // スタッフ認証の場合
  'X-Tenant-ID': tenantId,                      // テナントID
  'Content-Type': 'application/json'
}
```

**実装例**（hotel-saas）:
```typescript
// hotel-saas/server/api/v1/admin/phone-order/menu.get.ts (line 14-26)
export default defineEventHandler(async (event) => {
  const authUser = event.context.user
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId
  
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`  // user.sessionId も可
  }
  
  // hotel-commonのメニューAPIを呼び出し
  const [catRes, itemRes] = await Promise.all([
    menuApi.getCategories(upstreamHeaders),
    menuApi.getItems({ headers: upstreamHeaders })
  ])
  
  return { success: true, categories: catRes, menuItems: itemRes }
})
```

---

### hotel-saas: 共通APIクライアント

**実装箇所**: `/Users/kaneko/hotel-saas/server/utils/api-client.ts`

#### menuApi定義（line 327-389）

```typescript
export const menuApi = {
  // カテゴリ一覧取得
  getCategories: async (headers?: any) => {
    return safeApiCall(
      apiClient('/api/v1/admin/menu/categories', {
        method: 'GET',
        headers
      })
    );
  },

  // メニュー一覧取得
  getItems: async (params: any = {}) => {
    const { headers, ...queryParams } = params;
    return safeApiCall(
      apiClient('/api/v1/admin/menu/items', {
        method: 'GET',
        params: queryParams,
        headers
      })
    );
  },

  // 集約メニューAPI
  getAggregatedMenu: async (headers?: any) => {
    return safeApiCall(
      apiClient('/api/v1/order/menu', {
        method: 'GET',
        headers
      })
    );
  },

  // メニュー作成
  createItem: async (itemData: any, headers?: any) => {
    return safeApiCall(
      apiClient('/api/v1/admin/menu/items', {
        method: 'POST',
        body: itemData,
        headers
      })
    );
  },

  // メニュー更新
  updateItem: async (itemId: string, itemData: any, headers?: any) => {
    return safeApiCall(
      apiClient(`/api/v1/admin/menu/items/${itemId}`, {
        method: 'PUT',
        body: itemData,
        headers
      })
    );
  },

  // メニュー削除
  deleteItem: async (itemId: string, headers?: any) => {
    return safeApiCall(
      apiClient(`/api/v1/admin/menu/items/${itemId}`, {
        method: 'DELETE',
        headers
      })
    );
  }
};
```

---

## 💻 実装詳細

### hotel-saas（プロキシAPI）

#### ディレクトリ構成

```
/Users/kaneko/hotel-saas/
├── server/
│   ├── api/
│   │   └── v1/
│   │       ├── menu/
│   │       │   ├── items.get.ts          ❌ 未作成（要実装）
│   │       │   ├── items.post.ts         ❌ 未作成（要実装）
│   │       │   ├── [id].get.ts          ❌ 未作成（要実装）
│   │       │   ├── [id].put.ts          ❌ 未作成（要実装）
│   │       │   └── [id].delete.ts       ❌ 未作成（要実装）
│   │       ├── order/
│   │       │   └── menu.get.ts           ✅ 実装済み（集約API）
│   │       └── admin/
│   │           └── phone-order/
│   │               └── menu.get.ts       ✅ 実装済み（電話注文用）
│   └── utils/
│       └── api-client.ts                 ✅ menuApi定義済み
└── composables/
    └── useMenu.ts                         ❌ 未作成（要実装）
```

---

#### 実装済みAPI

##### 1. 電話注文用メニュー取得

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/phone-order/menu.get.ts`

**重要な実装ポイント**:
```typescript
// line 6-21: 認証 + テナントID取得
const authUser = event.context.user
if (!authUser) {
  throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
}

const headersIn = getRequestHeaders(event)
const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

const upstreamHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Tenant-ID': tenantId,
  'Authorization': `Bearer ${authUser.token}`
}

// line 24-27: hotel-commonのメニューAPI並行呼び出し
const [catRes, itemRes] = await Promise.all([
  menuApi.getCategories(upstreamHeaders),
  menuApi.getItems({ headers: upstreamHeaders })
])

// line 29-30: レスポンス正規化
const categories = (catRes?.data || catRes?.categories || catRes || []) as any[]
const items = (itemRes?.data || itemRes?.items || itemRes?.menuItems || itemRes || []) as any[]

// line 36-54: カテゴリの階層整形
const tags: any[] = []
const byId: Record<string | number, any> = {}
for (const c of categories) {
  const id = c.id || c.categoryId || c.uuid
  const nameJa = c.name_ja || c.nameJa || c.label_ja || c.label || c.name || ''
  const nameEn = c.name || c.name_en || c.code || nameJa
  const parentId = c.parentId || c.parent_id || null
  const path = slug(parentId ? `${c.parentPath || ''}/${nameEn}` : nameEn)
  const tag = {
    path,
    nameJa,
    nameEn,
    level: parentId ? 2 : 1,
    parentPath: parentId ? slug(c.parentPath || c.parentName || '') : undefined,
    categoryId: id
  }
  tags.push(tag)
  byId[id] = tag
}

// line 57-67: メニュー項目の整形
const menuItems = items.map((it: any) => {
  const id = it.id || it.menuItemId || it.menu_id
  const name = it.name_ja || it.nameJa || it.display_name || it.name || '商品'
  const description = it.description_ja || it.description || ''
  const price = it.price || it.unit_price || 0
  const categoryId = it.categoryId || it.category_id
  const imageUrl = it.imageUrl || it.image_url || it.thumbnail || ''
  const stockQty = it.stockQty ?? it.stock_qty ?? it.stock ?? null
  const tagPath = byId[categoryId]?.path ? [byId[categoryId].path] : []
  return { id, name, description, price, categoryId, imageUrl, stockQty, tags: tagPath }
})
```

**特記事項**:
- レスポンス構造が多様なため、複数のフィールド名を試行（`data`, `categories`, `items`, `menuItems` など）
- カテゴリを階層化してタグとして返す
- `slug`関数で英語名をパスに変換

---

#### 未実装API（要作成）

##### 1. Composable: useMenu

**ファイル**: `/Users/kaneko/hotel-saas/composables/useMenu.ts`（新規作成）

**実装イメージ**:
```typescript
export const useMenu = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // メニュー一覧取得
  const getMenuItems = async (params?: {
    categoryId?: number
    isAvailable?: boolean
    limit?: number
  }) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/v1/admin/menu/items', {
        method: 'GET',
        params
      })
      
      return response.data.menuItems
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch menu items'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  // カテゴリ一覧取得
  const getCategories = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/v1/admin/menu/categories')
      return response.data.categories
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch categories'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  // メニュー作成
  const createMenuItem = async (data: {
    nameJa: string
    nameEn?: string
    price: number
    categoryId?: number
    // ... その他のフィールド
  }) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/v1/admin/menu/items', {
        method: 'POST',
        body: data
      })
      
      return response.data.menuItem
    } catch (e: any) {
      error.value = e.message || 'Failed to create menu item'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  // メニュー更新
  const updateMenuItem = async (id: number, data: any) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch(`/api/v1/admin/menu/items/${id}`, {
        method: 'PUT',
        body: data
      })
      
      return response.data.menuItem
    } catch (e: any) {
      error.value = e.message || 'Failed to update menu item'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  // メニュー削除
  const deleteMenuItem = async (id: number) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch(`/api/v1/admin/menu/items/${id}`, {
        method: 'DELETE'
      })
      
      return response.data
    } catch (e: any) {
      error.value = e.message || 'Failed to delete menu item'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  return {
    loading,
    error,
    getMenuItems,
    getCategories,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem
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
                └── menu/
                    ├── items.ts          🚧 部分実装（GET実装済み、POST/PUT/DELETE要確認）
                    ├── items/
                    │   └── [id].ts       ❌ 未実装（GET/PUT/DELETE要作成）
                    └── categories.ts     🚧 部分実装（GET実装済み、POST/PUT/DELETE未実装）
```

---

#### 実装必須API

##### 1. メニュー一覧取得API

**ファイル**: `/Users/kaneko/hotel-common/src/routes/api/v1/admin/menu/items.ts`（要確認）

**実装イメージ**:
```typescript
import { Router } from 'express'
import { prisma } from '../../../database/prisma'

const router = Router()

// GET /api/v1/admin/menu/items
router.get('/menu/items', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const {
      categoryId,
      isAvailable,
      isFeatured,
      limit = 100,
      offset = 0
    } = req.query
    
    // バリデーション
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      })
    }
    
    // クエリ構築
    const where: any = {
      tenantId,
      isDeleted: false
    }
    
    if (categoryId) where.categoryId = Number(categoryId)
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true'
    if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true'
    
    // メニュー取得
    const [menuItems, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'desc' }
        ],
        take: Number(limit),
        skip: Number(offset),
        include: {
          category: true
        }
      }),
      prisma.menuItem.count({ where })
    ])
    
    res.json({
      success: true,
      data: {
        menuItems,
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    })
    
  } catch (error) {
    console.error('メニュー一覧取得エラー:', error)
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
| menuApi定義 | `hotel-saas/server/utils/api-client.ts` | hotel-saas |
| 電話注文用メニュー取得API | `hotel-saas/server/api/v1/admin/phone-order/menu.get.ts` | hotel-saas |
| データベーステーブル | `hotel-common/prisma/schema.prisma` | hotel-common |

### 🚧 部分実装

| 項目 | ファイル | 状態 |
|------|---------|------|
| メニュー一覧取得API | `hotel-common/src/routes/api/v1/admin/menu/items.ts` | 実装済みと推定（要確認） |
| カテゴリ一覧取得API | `hotel-common/src/routes/api/v1/admin/menu/categories.ts` | 実装済みと推定（要確認） |
| メニュー作成API | `hotel-common/src/routes/api/v1/admin/menu/items.ts` | 実装未確認 |
| メニュー更新API | `hotel-common/src/routes/api/v1/admin/menu/items/:id.ts` | 実装未確認 |
| メニュー削除API | `hotel-common/src/routes/api/v1/admin/menu/items/:id.ts` | 実装未確認 |

### ❌ 未実装

| 項目 | 優先度 | 実装必要ファイル |
|------|--------|----------------|
| メニュー取得API（単体） | 🔴 最高 | hotel-common + hotel-saas |
| カテゴリCRUD API | 🟡 高 | hotel-common + hotel-saas |
| useMenu composable | 🔴 最高 | hotel-saas |
| メニュー管理画面UI | 🔴 最高 | hotel-saas |
| 在庫管理機能 | 🟢 中 | hotel-common |
| セットメニュー機能 | 🟢 中 | hotel-common |
| 裏メニュー機能 | 🟢 低 | hotel-common + hotel-saas |
| 期間限定メニュー | 🟢 低 | hotel-common |

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
const menuItems = await prisma.menuItem.findMany({
  where: {
    tenantId,        // 必須
    isDeleted: false
  }
})
```

---

### 認証

**このSSOTは管理画面専用です**

**認証要件**:
- 🔐 **Session認証必須**（Redis + HttpOnly Cookie）
- 🔐 `Authorization: Bearer {sessionId}` ヘッダー
- 🔐 `/api/v1/admin/menu/*` への全操作（GET/POST/PUT/DELETE）

**アクセス制御**:
- ✅ スタッフのみアクセス可能
- ✅ 管理画面からのアクセスのみ
- ❌ パブリックAPIではない

---

### バリデーション

**メニュー作成時**:
1. `nameJa` の存在確認（必須）
2. `price` の妥当性チェック（0以上）
3. `categoryId` の存在確認
4. テナントIDの一致確認

---

## 📊 パフォーマンス

### データベースインデックス

**必須インデックス**（定義済み）:
```sql
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(tenant_id, category_id);
CREATE INDEX idx_menu_items_available ON menu_items(tenant_id, is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(tenant_id, is_featured);

CREATE INDEX idx_menu_categories_tenant_id ON menu_categories(tenant_id);
CREATE INDEX idx_menu_categories_parent_id ON menu_categories(tenant_id, parent_id);
CREATE INDEX idx_menu_categories_is_active ON menu_categories(tenant_id, is_active);
```

---

### ページネーション

**デフォルト値**:
- `limit`: 100（メニュー一覧）
- `offset`: 0

**最大値**:
- `limit`: 200（超過した場合は200に制限）

---

### キャッシュ戦略

**推奨**:
- メニュー一覧：Redis 5分キャッシュ
- カテゴリ一覧：Redis 10分キャッシュ
- メニュー更新時：該当キャッシュを削除

---

## 🗄️ データベースマイグレーション

### 前提条件

**テーブル作成が必要な理由**:
- `menu_items` テーブルが存在しない
- `menu_categories` テーブルが存在しない

### マイグレーション手順

#### 1. 事前準備

##### 1.1. データベースのバックアップ（必須）
```bash
pg_dump -h localhost -U hotel_app -d hotel_unified_db > backup_before_menu_$(date +%Y%m%d_%H%M%S).sql
```

##### 1.2. hotel-commonの最新コード取得
```bash
cd /Users/kaneko/hotel-common
git pull origin main
npm install
```

---

#### 2. マイグレーションSQLの実行

##### 2.1. マイグレーションSQLファイル内容

```sql
-- マイグレーション: menu_items, menu_categories テーブル新規作成
-- 作成日: 2025-10-02
-- 理由: SSOT_SAAS_MENU_MANAGEMENT仕様に基づくメニュー管理機能の実装

BEGIN;

-- 1. menu_categoriesテーブル作成
CREATE TABLE IF NOT EXISTS menu_categories (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  
  -- 基本情報（多言語）
  name_ja         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  description_ja  TEXT,
  description_en  TEXT,
  
  -- 階層構造
  parent_id       INTEGER REFERENCES menu_categories(id),
  
  -- 表示制御
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  
  -- 共通フィールド
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  is_deleted      BOOLEAN DEFAULT false,
  deleted_at      TIMESTAMP,
  deleted_by      TEXT,
  
  CONSTRAINT fk_menu_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_menu_categories_parent FOREIGN KEY (parent_id) REFERENCES menu_categories(id)
);

-- menu_categoriesインデックス
CREATE INDEX idx_menu_categories_tenant_id ON menu_categories(tenant_id);
CREATE INDEX idx_menu_categories_parent_id ON menu_categories(tenant_id, parent_id);
CREATE INDEX idx_menu_categories_is_active ON menu_categories(tenant_id, is_active);
CREATE INDEX idx_menu_categories_is_deleted ON menu_categories(is_deleted);

-- 2. menu_itemsテーブル作成
CREATE TABLE IF NOT EXISTS menu_items (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  
  -- 基本情報（多言語）
  name_ja         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  description_ja  TEXT,
  description_en  TEXT,
  
  -- 価格情報
  price           INTEGER NOT NULL,
  cost            INTEGER DEFAULT 0,
  
  -- カテゴリ
  category_id     INTEGER REFERENCES menu_categories(id),
  
  -- 表示制御
  image_url       VARCHAR(500),
  is_available    BOOLEAN DEFAULT true,
  is_featured     BOOLEAN DEFAULT false,
  is_hidden       BOOLEAN DEFAULT false,
  display_order   INTEGER DEFAULT 0,
  
  -- 販売制御
  start_time      TIME,
  end_time        TIME,
  age_restricted  BOOLEAN DEFAULT false,
  
  -- 在庫管理
  stock_available BOOLEAN DEFAULT true,
  stock_quantity  INTEGER,
  low_stock_threshold INTEGER DEFAULT 5,
  
  -- メタデータ
  tags            JSONB DEFAULT '[]',
  images          JSONB DEFAULT '[]',
  nutritional_info JSONB DEFAULT '{}',
  allergens       JSONB DEFAULT '[]',
  
  -- 共通フィールド
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  is_deleted      BOOLEAN DEFAULT false,
  deleted_at      TIMESTAMP,
  deleted_by      TEXT,
  
  CONSTRAINT fk_menu_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id)
);

-- menu_itemsインデックス
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(tenant_id, category_id);
CREATE INDEX idx_menu_items_available ON menu_items(tenant_id, is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(tenant_id, is_featured);
CREATE INDEX idx_menu_items_is_deleted ON menu_items(is_deleted);

COMMIT;
```

##### 2.2. SQLスクリプトの実行
```bash
# ファイルに保存
cat > /Users/kaneko/hotel-common/prisma/migrations/$(date +%Y%m%d%H%M%S)_create_menu_tables.sql << 'EOF'
# 上記のSQLをペースト
EOF

# 実行
psql -h localhost -U hotel_app -d hotel_unified_db -f /Users/kaneko/hotel-common/prisma/migrations/*_create_menu_tables.sql
```

---

#### 3. Prismaスキーマの更新

##### 3.1. `hotel-common/prisma/schema.prisma`の編集

上記のPrismaモデル定義（`MenuItem`と`MenuCategory`）をschema.prismaに追加します。

##### 3.2. Prismaクライアントの再生成
```bash
cd /Users/kaneko/hotel-common
npx prisma generate
npm run type-check  # 型エラーがないか確認
```

---

#### 4. 動作確認

##### 4.1. テーブルの存在確認
```bash
psql -h localhost -U hotel_app -d hotel_unified_db -c "\dt menu_*"
```

**期待される出力**:
```
                List of relations
 Schema |       Name       | Type  |   Owner    
--------+------------------+-------+------------
 public | menu_categories  | table | hotel_app
 public | menu_items       | table | hotel_app
```

##### 4.2. インデックスの確認
```bash
psql -h localhost -U hotel_app -d hotel_unified_db -c "\di idx_menu_*"
```

**期待される出力**:
```
                            List of relations
 Schema |             Name              | Type  |   Owner   |     Table      
--------+-------------------------------+-------+-----------+----------------
 public | idx_menu_categories_is_active | index | hotel_app | menu_categories
 public | idx_menu_categories_is_deleted| index | hotel_app | menu_categories
 public | idx_menu_categories_parent_id | index | hotel_app | menu_categories
 public | idx_menu_categories_tenant_id | index | hotel_app | menu_categories
 public | idx_menu_items_available      | index | hotel_app | menu_items
 public | idx_menu_items_category_id    | index | hotel_app | menu_items
 public | idx_menu_items_featured       | index | hotel_app | menu_items
 public | idx_menu_items_is_deleted     | index | hotel_app | menu_items
 public | idx_menu_items_tenant_id      | index | hotel_app | menu_items
```

##### 4.3. hotel-commonサーバーの起動
```bash
cd /Users/kaneko/hotel-common
npm run dev
```

##### 4.4. Prisma Studioでデータ確認
```bash
npx prisma studio
```

ブラウザで `http://localhost:5555` にアクセスし、`menu_categories` と `menu_items` テーブルが表示されることを確認します。

---

#### 5. ロールバック手順

##### 5.1. テーブルの削除（緊急時のみ）
```bash
psql -h localhost -U hotel_app -d hotel_unified_db << 'EOF'
BEGIN;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
COMMIT;
EOF
```

##### 5.2. データベースの完全復元
```bash
# データベースのドロップ（注意: すべてのデータが削除されます）
dropdb -h localhost -U hotel_app hotel_unified_db

# データベースの再作成
createdb -h localhost -U hotel_app hotel_unified_db

# バックアップからの復元
psql -h localhost -U hotel_app -d hotel_unified_db -f backup_before_menu_YYYYMMDD_HHMMSS.sql
```

---

#### 6. トラブルシューティング

##### エラー: `relation "tenants" does not exist`
**原因**: `tenants` テーブルが存在しない

**解決策**:
1. `SSOT_SAAS_MULTITENANT.md` に従って `tenants` テーブルを先に作成
2. または、一時的に外部キー制約を削除してマイグレーション実行

##### エラー: `permission denied for table menu_items`
**原因**: PostgreSQLユーザー権限不足

**解決策**:
```bash
# スーパーユーザーで接続
sudo -u postgres psql hotel_unified_db

# 権限付与
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hotel_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hotel_app;
```

##### エラー: Prismaクライアント生成失敗
**原因**: schema.prismaの構文エラー

**解決策**:
```bash
# 構文チェック
npx prisma validate

# フォーマット
npx prisma format
```

---

## 📋 実装チェックリスト

### Phase 0: データベースマイグレーション（必須）
- [ ] データベースバックアップ作成
- [ ] マイグレーションSQL実行（`menu_categories`, `menu_items`）
- [ ] Prismaスキーマ更新
- [ ] Prismaクライアント再生成
- [ ] テーブル・インデックス存在確認
- [ ] hotel-commonサーバー起動確認

### Phase 1: コアAPI実装（Week 1）

#### hotel-common
- [ ] メニュー一覧取得API確認・修正（`GET /api/v1/admin/menu/items`）
- [ ] メニュー作成API実装（`POST /api/v1/admin/menu/items`）
- [ ] メニュー取得API実装（`GET /api/v1/admin/menu/items/:id`）
- [ ] メニュー更新API実装（`PUT /api/v1/admin/menu/items/:id`）
- [ ] メニュー削除API実装（`DELETE /api/v1/admin/menu/items/:id`）
- [ ] カテゴリ一覧取得API確認・修正（`GET /api/v1/admin/menu/categories`）
- [ ] カテゴリCRUD API実装（`POST/PUT/DELETE /api/v1/admin/menu/categories`）

#### hotel-saas
- [ ] プロキシAPI実装（上記7つのエンドポイント）
- [ ] `useMenu` composable実装

---

### Phase 2: 管理画面UI（Week 2）

- [ ] メニュー一覧画面
- [ ] メニュー作成・編集フォーム
- [ ] カテゴリ管理画面
- [ ] 画像アップロード機能
- [ ] 表示順変更機能

---

### Phase 3: 高度な機能（Week 3-4）

- [ ] 在庫管理機能
- [ ] セットメニュー機能
- [ ] 裏メニュー機能
- [ ] 期間限定メニュー機能
- [ ] メニューランキング機能
- [ ] 一括インポート・エクスポート

---

## 🔗 関連SSOT

- [SSOT_SAAS_ORDER_MANAGEMENT.md](./SSOT_SAAS_ORDER_MANAGEMENT.md) - 注文管理（メニュー参照）
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_GUEST_MENU_VIEW.md](../02_guest_features/SSOT_GUEST_MENU_VIEW.md) - 客室端末用メニュー閲覧

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-03 | 2.2.0 | 全APIパスを`/api/v1/admin/menu/*`に統一（管理画面専用APIとして明確化） | Iza |
| 2025-10-03 | 2.1.0 | 客室端末関連の記述を全て除外（管理画面専用に特化） | Iza |
| 2025-10-03 | 2.0.0 | 管理画面専用に明確化 | Iza |
| 2025-10-02 | 1.1.0 | データベースマイグレーション手順を追加 | AI |
| 2025-10-02 | 1.0.0 | 初版作成 | AI |

---

**以上、SSOT: メニュー管理システム**

