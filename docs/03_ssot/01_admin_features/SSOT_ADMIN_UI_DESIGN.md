# SSOT: UI デザイン・レイアウト管理システム（管理画面専用）

**作成日**: 2025-10-05  
**最終更新**: 2025-10-06  
**バージョン**: 1.3.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（Phase 1-3）

**関連SSOT**:
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証

**参照ドキュメント**:
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/LAYOUT_EDITOR_SPEC.md` - 技術仕様書
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/LAYOUT_MANAGEMENT_SYSTEM.md` - システム仕様書
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/LAYOUT_INFO_INTEGRATION_PLAN.md` - 統合開発方針

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [データモデル](#データモデル)
5. [ウィジェットシステム](#ウィジェットシステム)
6. [レイアウトエディタ](#レイアウトエディタ)
7. [テンプレート管理](#テンプレート管理)
8. [ページ管理](#ページ管理)
9. [API仕様](#api仕様)
10. [UI仕様](#ui仕様)
11. [UI/UX統一ルール](#uiux統一ルール)
12. [現状実装状況](#現状実装状況)
13. [移行計画](#移行計画)
14. [実装詳細](#実装詳細)
15. [エラーハンドリング](#エラーハンドリング)
16. [パフォーマンス要件](#パフォーマンス要件)
17. [監視・ロギング](#監視ロギング)
18. [未実装機能](#未実装機能)

---

## 📖 概要

### 目的

hotel-saas管理画面における、客室端末（TVデバイス）向けのUI/UXデザイン・レイアウトを統一的に管理・編集できる包括的なシステムの完全な仕様を定義する。

### 基本方針

- **汎用性**: TOPページから機能ページまで全てのページタイプに対応
- **拡張性**: ホテルが自由にページを無制限追加可能
- **直感性**: ドラッグ&ドロップによる視覚的編集
- **柔軟性**: ウィジェットベースの自由度の高いカスタマイズ
- **安全性**: バージョン管理と権限制御による安全な運用

---

## 🎯 スコープ

### 対象システム

- ✅ **hotel-saas**: メイン実装（管理画面UI + プロキシAPI）
- ✅ **hotel-common**: コア実装（API基盤 + データベース層）

### 対象ページタイプ

| ページタイプ | 説明 | 実装状態 |
|------------|------|---------|
| **TOPページ** | 客室端末のメインページ（TV画面） | ⏳ 計画中 |
| **ルームサービス** | 注文システムUI | ⏳ 計画中 |
| **館内施設案内** | 施設情報表示 | ⏳ 計画中 |
| **観光案内** | 地域情報・観光スポット | ⏳ 計画中 |
| **アンケート** | 顧客満足度調査 | ⏳ 計画中 |
| **WiFi案内** | 接続方法・認証情報 | ⏳ 計画中 |
| **インフォメーション一覧** | 記事一覧ページ | ⏳ 計画中 |
| **インフォメーション詳細** | 記事詳細ページ | ⏳ 計画中 |
| **カスタムページ** | 自由なオリジナルページ | ⏳ 計画中 |

### 対象機能

| 機能 | 説明 | 実装状態 |
|------|------|---------|
| **レイアウトエディタ** | ドラッグ&ドロップエディタ | ⏳ 計画中 |
| **ウィジェットシステム** | 要素のモジュール化 | ⏳ 計画中 |
| **テンプレート管理** | プリセットレイアウト | ⏳ 計画中 |
| **ページ管理** | ページ作成・編集・公開 | ⏳ 計画中 |
| **バージョン管理** | 変更履歴・復元 | ⏳ 計画中 |
| **プレビュー機能** | デバイス別プレビュー | ⏳ 計画中 |
| **スケジュール管理** | 期間指定表示 | ⏳ 計画中 |
| **多言語対応** | 言語別レイアウト | ⏳ 計画中 |

---

## 🛠️ 技術スタック

### フロントエンド

```typescript
// 必須ライブラリ
const dependencies = {
  'vue': '^3.5.13',                    // Vue3 framework
  'nuxt': '^3.16.2',                   // Nuxt3 framework
  'element-plus': '^2.8.4',           // UI component library
  'vue.draggable.next': '^2.2.0',     // Drag & Drop for Vue3
  '@vueuse/core': '^13.2.0',          // Vue composition utilities
  'sortablejs': '^1.15.6',            // Core drag & drop library
  '@element-plus/icons-vue': '^2.3.1' // Element Plus icons
};

// 開発依存関係
const devDependencies = {
  '@types/sortablejs': '^1.15.8',     // TypeScript definitions
  'vitest': '^3.1.3',                 // Testing framework
  '@vue/test-utils': '^2.4.6'         // Vue testing utilities
};
```

### バックエンド

```typescript
const backendStack = {
  runtime: 'Nitro (Nuxt3)',           // hotel-saas API
  api: 'Express.js',                  // hotel-common API
  database: 'PostgreSQL',             // 統一DB
  orm: 'Prisma ORM',                  // DB access
  validation: 'Zod schema validation',
  cache: 'Redis',                     // Session + Cache
  security: 'Session + RBAC'
};
```

---

## 🗄️ データモデル

### データベース命名規則

**参照**: [DATABASE_NAMING_STANDARD.md v3.0.0](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md)

- **テーブル名**: `snake_case` (例: `page_layouts`)
- **カラム名**: `snake_case` (例: `tenant_id`, `created_at`)
- **Prismaモデル名**: `PascalCase` (例: `PageLayout`)
- **Prismaフィールド名**: `camelCase` + `@map` (例: `tenantId @map("tenant_id")`)
- **`@@map`ディレクティブ必須**

### 1. PageLayout（ページレイアウト）

**テーブル名**: `page_layouts`

```prisma
model PageLayout {
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")
  slug            String
  pageType        String    @map("page_type")    // 'top' | 'info-list' | 'info-detail' | 'custom'
  title           String
  description     String?
  version         Int       @default(1)
  status          String    @default("draft")    // 'draft' | 'review' | 'approved' | 'published' | 'archived'
  isTemplate      Boolean   @default(false) @map("is_template")
  
  // JSON データ
  elements        Json                            // LayoutElement[]
  globalStyles    Json      @map("global_styles") // GlobalStyles
  seo             Json?                           // SEOSettings
  permissions     Json?                           // PermissionSettings
  translations    Json?                           // TranslationData
  
  // スケジュール管理
  isScheduled     Boolean   @default(false) @map("is_scheduled")
  displayStartAt  DateTime? @map("display_start_at")
  displayEndAt    DateTime? @map("display_end_at")
  priority        Int       @default(1)
  seasonTag       String?   @map("season_tag")   // spring, summer, autumn, winter, newyear
  
  // アクティブ状態管理
  isActive        Boolean   @default(false) @map("is_active")
  isDefault       Boolean   @default(false) @map("is_default")
  activatedAt     DateTime? @map("activated_at")
  deactivatedAt   DateTime? @map("deactivated_at")
  
  // メタデータ
  tags            String?
  category        String?
  
  // タイムスタンプ
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  publishedAt     DateTime? @map("published_at")
  deletedAt       DateTime? @map("deleted_at")
  
  // 作成者・更新者
  createdBy       String    @map("created_by")
  updatedBy       String    @map("updated_by")
  
  // リレーション
  history         LayoutHistory[]
  
  @@unique([tenantId, slug])
  @@index([tenantId])
  @@index([pageType])
  @@index([status])
  @@index([isActive])
  @@index([createdBy])
  @@index([publishedAt])
  @@map("page_layouts")
}
```

### 2. LayoutHistory（レイアウト履歴）

**テーブル名**: `layout_histories`

```prisma
model LayoutHistory {
  id        String   @id @default(uuid())
  layoutId  String   @map("layout_id")
  tenantId  String   @map("tenant_id")
  version   Int
  action    String                              // 'create' | 'update' | 'publish' | 'archive'
  comment   String?
  
  // 変更データ
  data      Json                                // PageLayout のスナップショット
  diff      Json?                               // 差分データ
  
  // メタデータ
  createdAt DateTime @default(now()) @map("created_at")
  createdBy String   @map("created_by")
  
  // リレーション
  layout    PageLayout @relation(fields: [layoutId], references: [id])
  
  @@index([layoutId, version])
  @@index([tenantId])
  @@index([createdAt])
  @@map("layout_histories")
}
```

### 3. LayoutTemplate（レイアウトテンプレート）

**テーブル名**: `layout_templates`

```prisma
model LayoutTemplate {
  id          String   @id @default(uuid())
  tenantId    String?  @map("tenant_id")       // nullの場合はシステム共通
  name        String
  description String?
  category    String
  thumbnail   String?
  isPublic    Boolean  @default(false) @map("is_public")
  isPremium   Boolean  @default(false) @map("is_premium")
  
  // テンプレートデータ
  layout      Json                              // PageLayout data
  
  // 使用統計
  useCount    Int      @default(0) @map("use_count")
  
  // メタデータ
  tags        String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  createdBy   String   @map("created_by")
  deletedAt   DateTime? @map("deleted_at")
  
  @@index([tenantId])
  @@index([category])
  @@index([isPublic])
  @@index([useCount])
  @@map("layout_templates")
}
```

### 4. PreviewToken（プレビュートークン）

**テーブル名**: `preview_tokens`

```prisma
model PreviewToken {
  id        String   @id @default(uuid())
  token     String   @unique
  layoutId  String   @map("layout_id")
  tenantId  String   @map("tenant_id")
  device    String
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  createdBy String   @map("created_by")
  
  @@index([token])
  @@index([tenantId])
  @@index([expiresAt])
  @@map("preview_tokens")
}
```

### TypeScript型定義

#### LayoutElement（レイアウト要素）

```typescript
interface LayoutElement {
  // 基本情報
  id: string;                          // UUID
  type: ElementType;                   // 要素タイプ
  order: number;                       // 表示順序

  // コンテンツ
  content: {
    text?: string;                     // テキストコンテンツ
    html?: string;                     // HTMLコンテンツ
    url?: string;                      // リンクURL
    alt?: string;                      // 画像alt属性
    title?: string;                    // タイトル
    subtitle?: string;                 // サブタイトル
    items?: any[];                     // リスト・ギャラリー用
    imageUrl?: string;                 // 画像URL
    videoUrl?: string;                 // 動画URL
    backgroundColor?: string;          // 背景色
    backgroundImage?: string;          // 背景画像
  };

  // スタイル設定
  styles: {
    // レイアウト
    position?: 'static' | 'relative' | 'absolute' | 'fixed';
    display?: 'block' | 'inline' | 'flex' | 'grid' | 'none';
    width?: string;                    // 幅 (px, %, vw)
    height?: string;                   // 高さ (px, vh, auto)
    
    // スペーシング
    margin?: string;                   // 外側余白
    padding?: string;                  // 内側余白
    
    // タイポグラフィ
    fontSize?: string;                 // フォントサイズ
    fontWeight?: string;               // フォント太さ
    fontFamily?: string;               // フォントファミリー
    lineHeight?: string;               // 行間
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    color?: string;                    // 文字色
    
    // ボックス
    backgroundColor?: string;          // 背景色
    border?: string;                   // ボーダー
    borderRadius?: string;             // 角丸
    boxShadow?: string;                // シャドウ
    
    // 配置
    zIndex?: number;                   // 重ね順
    left?: string;                     // 左位置
    top?: string;                      // 上位置
    right?: string;                    // 右位置
    bottom?: string;                   // 下位置
  };

  // レスポンシブ設定
  responsive: {
    mobile?: Partial<LayoutElement['styles']>;    // モバイル専用スタイル
    tablet?: Partial<LayoutElement['styles']>;    // タブレット専用スタイル
    desktop?: Partial<LayoutElement['styles']>;   // デスクトップ専用スタイル
  };

  // アニメーション設定
  animation?: {
    type: 'none' | 'fade' | 'slide' | 'bounce' | 'zoom' | 'rotate';
    duration: number;                  // アニメーション時間(ms)
    delay: number;                     // 開始遅延(ms)
    easing: string;                    // イージング関数
    trigger: 'load' | 'scroll' | 'hover' | 'click';
  };

  // 表示制御
  visibility: {
    isVisible: boolean;                // 表示/非表示
    startDate?: Date;                  // 表示開始日時
    endDate?: Date;                    // 表示終了日時
    userRoles?: string[];              // 表示対象ロール
    languages?: string[];              // 表示対象言語
    devices?: ('mobile' | 'tablet' | 'desktop')[];
  };

  // メタデータ
  metadata: {
    label: string;                     // 管理画面表示名
    description?: string;              // 説明
    category?: string;                 // カテゴリ
    tags?: string[];                   // タグ
    customClass?: string;              // カスタムCSSクラス
    customAttributes?: Record<string, string>; // カスタム属性
  };
}

// 要素タイプ定義
type ElementType = 
  | 'text'           // テキスト
  | 'heading'        // 見出し
  | 'paragraph'      // 段落
  | 'image'          // 画像
  | 'video'          // 動画
  | 'link'           // リンク
  | 'button'         // ボタン
  | 'card'           // カード
  | 'section'        // セクション
  | 'hero'           // ヒーローセクション
  | 'gallery'        // ギャラリー
  | 'list'           // リスト
  | 'accordion'      // アコーディオン
  | 'tabs'           // タブ
  | 'spacer'         // スペーサー
  | 'divider'        // 区切り線
  | 'iframe'         // 埋め込み
  | 'custom';        // カスタム要素
```

#### PageLayout（ページレイアウト）

```typescript
interface PageLayout {
  // 基本情報
  id: string;                          // UUID
  tenantId: string;                    // テナントID
  slug: string;                        // URL slug
  pageType: PageType;                  // ページタイプ
  title: string;                       // ページタイトル
  description?: string;                // ページ説明

  // バージョン管理
  version: number;                     // バージョン番号
  status: LayoutStatus;                // 公開状態
  isTemplate: boolean;                 // テンプレートフラグ

  // レイアウト構成
  elements: LayoutElement[];           // 要素リスト
  
  // グローバルスタイル
  globalStyles: {
    theme: 'default' | 'dark' | 'light' | 'custom';
    primaryColor: string;              // プライマリカラー
    secondaryColor: string;            // セカンダリカラー
    accentColor: string;               // アクセントカラー
    fontFamily: string;                // ベースフォント
    fontSize: string;                  // ベースフォントサイズ
    lineHeight: string;                // ベース行間
    containerMaxWidth: string;         // コンテナ最大幅
    backgroundColor: string;           // 背景色
    backgroundImage?: string;          // 背景画像
    customCss?: string;                // カスタムCSS
  };

  // SEO設定
  seo: {
    metaTitle?: string;                // SEOタイトル
    metaDescription?: string;          // SEO説明文
    keywords?: string[];               // キーワード
    ogTitle?: string;                  // OGタイトル
    ogDescription?: string;            // OG説明文
    ogImage?: string;                  // OG画像
    canonicalUrl?: string;             // カノニカルURL
    noindex?: boolean;                 // インデックス除外
    nofollow?: boolean;                // フォロー除外
  };

  // アクセス制御
  permissions: {
    canView: string[];                 // 閲覧権限
    canEdit: string[];                 // 編集権限
    canPublish: string[];              // 公開権限
    canDelete: string[];               // 削除権限
  };

  // 多言語対応
  translations?: {
    [langCode: string]: {
      title: string;
      description?: string;
      elements: Partial<LayoutElement>[];
    };
  };

  // スケジュール管理
  isScheduled: boolean;
  displayStartAt?: Date;
  displayEndAt?: Date;
  priority: number;
  seasonTag?: string;

  // アクティブ状態
  isActive: boolean;
  isDefault: boolean;
  activatedAt?: Date;
  deactivatedAt?: Date;

  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  createdBy: string;
  updatedBy: string;
  tags?: string[];
  category?: string;
}

// ページタイプ
type PageType = 'top' | 'info-list' | 'info-detail' | 'custom';

// レイアウト状態
type LayoutStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';
```

---

## 🧩 ウィジェットシステム

### ウィジェット基本概念

```typescript
interface WidgetDefinition {
  id: string
  type: string
  name: string
  description: string
  category: 'layout' | 'content' | 'interactive' | 'data' | 'navigation'
  icon: string
  
  // レイアウト制御
  resizable: boolean
  movable: boolean
  deletable: boolean
  duplicable: boolean
  
  // サイズ制御
  minWidth: number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
  aspectRatio?: number
  
  // グリッド制御
  gridSize: { width: number, height: number }
  snapToGrid: boolean
  
  // 設定可能なプロパティ
  properties: WidgetProperty[]
  
  // デフォルト設定
  defaults: Record<string, any>
  
  // 条件付き表示
  conditions?: WidgetCondition[]
}
```

### 標準ウィジェットライブラリ

#### レイアウトウィジェット
- `grid-container`: グリッドコンテナ
- `flex-container`: フレックスコンテナ  
- `spacer`: スペーサー
- `divider`: 区切り線

#### コンテンツウィジェット
- `text-block`: テキストブロック
- `image-gallery`: 画像ギャラリー
- `video-player`: 動画プレーヤー
- `html-embed`: HTMLエンベッド

#### インタラクティブウィジェット
- `button-group`: ボタングループ
- `navigation-menu`: ナビゲーションメニュー
- `search-box`: 検索ボックス
- `contact-form`: お問い合わせフォーム

#### データウィジェット
- `article-list`: 記事一覧
- `weather-info`: 天気情報
- `clock-widget`: 時計ウィジェット
- `calendar-widget`: カレンダーウィジェット

#### ホテル専用ウィジェット
- `room-service-menu`: ルームサービスメニュー
- `facility-guide`: 館内施設案内
- `concierge-chat`: AIコンシェルジュチャット
- `wifi-guide`: WiFi接続案内
- `checkout-info`: チェックアウト情報

### グリッドシステム

```typescript
interface GridSystem {
  breakpoints: {
    xs: number  // 0-576px (スマートフォン縦)
    sm: number  // 576-768px (スマートフォン横)
    md: number  // 768-992px (タブレット縦)
    lg: number  // 992-1200px (タブレット横)
    xl: number  // 1200px+ (デスクトップ)
  }
  
  columns: {
    xs: 4   // 4列
    sm: 6   // 6列
    md: 8   // 8列
    lg: 12  // 12列
    xl: 16  // 16列
  }
  
  gutters: {
    xs: 8   // 8px
    sm: 12  // 12px
    md: 16  // 16px
    lg: 20  // 20px
    xl: 24  // 24px
  }
}
```

---

## 🎨 レイアウトエディタ

### エディタ構成

```
┌─────────────────────────────────────────────────────────────┐
│ ツールバー [保存][プレビュー][公開][元に戻す][やり直し]         │
├─────────────────────────────────────────────────────────────┤
│          │                                     │            │
│ 要素     │           メインキャンバス              │ プロパティ  │
│ パレット  │                                     │ パネル     │
│          │  ┌─────────────────────────────┐    │            │
│ [テキスト] │  │        ヒーロセクション       │    │ ┌────────┐ │
│ [画像]   │  │                             │    │ │スタイル  │ │
│ [ボタン]  │  └─────────────────────────────┘    │ │設定     │ │
│ [カード]  │  ┌─────────────────────────────┐    │ └────────┘ │
│ [セクション]│  │          コンテンツ         │    │ ┌────────┐ │
│ [...]    │  │                             │    │ │アニメ    │ │
│          │  └─────────────────────────────┘    │ │ーション  │ │
│          │  ┌─────────────────────────────┐    │ └────────┘ │
│          │  │         フッター           │    │            │
│          │  └─────────────────────────────┘    │            │
└─────────────────────────────────────────────────────────────┘
```

### コンポーネント設計

#### 1. DraggableEditor.vue（メインコンポーネント）

```vue
<template>
  <div class="layout-editor">
    <!-- ツールバー -->
    <EditorToolbar
      v-model:mode="editorMode"
      :layout="currentLayout"
      @save="handleSave"
      @preview="handlePreview"
      @publish="handlePublish"
      @undo="handleUndo"
      @redo="handleRedo"
    />

    <div class="editor-container">
      <!-- 要素パレット -->
      <ElementPalette
        v-model:show="showPalette"
        @add-element="handleAddElement"
      />

      <!-- メインエディタエリア -->
      <div class="editor-main">
        <!-- キャンバス -->
        <EditorCanvas
          v-model:layout="currentLayout"
          v-model:selected="selectedElement"
          :mode="editorMode"
          @element-select="handleElementSelect"
          @element-update="handleElementUpdate"
          @element-delete="handleElementDelete"
        />
      </div>

      <!-- プロパティパネル -->
      <PropertyPanel
        v-model:element="selectedElement"
        v-model:show="showProperties"
        @update="handleElementUpdate"
      />

      <!-- プレビューパネル -->
      <PreviewPanel
        v-if="editorMode === 'preview'"
        :layout="currentLayout"
        :device="previewDevice"
        @close="editorMode = 'edit'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  layoutId?: string;
  pageType: PageType;
  readonly?: boolean;
}

interface Emits {
  (e: 'save', layout: PageLayout): void;
  (e: 'publish', layout: PageLayout): void;
  (e: 'cancel'): void;
}

// コンポーネントロジック実装予定
</script>
```

#### 2. EditorCanvas.vue（ドラッグアンドドロップキャンバス）

```vue
<template>
  <div class="editor-canvas" :class="canvasClasses">
    <draggable
      v-model="elements"
      group="editor-elements"
      item-key="id"
      :animation="200"
      :ghost-class="'drag-ghost'"
      :chosen-class="'drag-chosen'"
      :drag-class="'drag-active'"
      @start="handleDragStart"
      @end="handleDragEnd"
      @change="handleDragChange"
    >
      <template #item="{ element, index }">
        <ElementWrapper
          :key="element.id"
          :element="element"
          :index="index"
          :selected="element.id === selectedElementId"
          :mode="mode"
          @select="$emit('element-select', element)"
          @update="$emit('element-update', $event)"
          @delete="$emit('element-delete', element.id)"
        />
      </template>
    </draggable>

    <!-- ドロップゾーン表示 -->
    <div v-if="showDropZone" class="drop-zone">
      <Icon name="plus" />
      <span>ここに要素をドロップ</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VueDraggableNext as draggable } from 'vue.draggable.next';

// ドラッグアンドドロップロジック実装予定
</script>
```

---

## 📄 テンプレート管理

### テンプレートカテゴリ

| カテゴリ | 説明 | 実装状態 |
|---------|------|---------|
| **luxury** | 高級ホテル向け | ⏳ 計画中 |
| **business** | ビジネスホテル向け | ⏳ 計画中 |
| **resort** | リゾートホテル向け | ⏳ 計画中 |
| **modern** | モダンデザイン | ⏳ 計画中 |
| **classic** | クラシックデザイン | ⏳ 計画中 |
| **custom** | カスタムテンプレート | ⏳ 計画中 |

### テンプレート機能

- ✅ プリセットテンプレート提供
- ✅ カスタムテンプレート保存
- ✅ テンプレート適用
- ✅ テンプレート公開/非公開
- ✅ テンプレートプレビュー
- ✅ 使用統計

---

## 📱 ページ管理

### ページ作成フロー

1. **新規ページ作成**
   - ページタイプ選択（7種類）
   - テンプレート選択（オプション）
   - 基本情報入力

2. **レイアウト編集**
   - ドラッグ&ドロップで要素配置
   - プロパティ設定
   - スタイル調整

3. **プレビュー**
   - デバイス別プレビュー
   - 多言語プレビュー
   - 最終確認

4. **公開**
   - 公開日時設定
   - スケジュール設定
   - 権限設定

### ページ状態管理

| 状態 | 説明 | 次の状態 |
|------|------|---------|
| **draft** | 下書き | review, published |
| **review** | レビュー中 | draft, approved |
| **approved** | 承認済み | published |
| **published** | 公開済み | archived |
| **archived** | アーカイブ | draft |

---

## 🔧 API仕様

### 命名規則・ルーティング制約

**参照**: 
- [API_ROUTING_GUIDELINES.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md)
- [UNIFIED_ROUTING_DESIGN.md](/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md)

**必須ルール（Nuxt 3 / Nitro制約）**:
- ❌ 禁止: 深いネスト（2階層以上の動的パス）
- ❌ 禁止: `index.*` ファイル
- ✅ 推奨: フラット構造（1階層の動的パスのみ）
- ✅ 推奨: 明示的なファイル名（`list.get.ts`, `create.post.ts`, `[id].get.ts`）

### hotel-saas API（プロキシ）

#### レイアウト管理

```typescript
// GET /api/v1/admin/layouts/list.get.ts
// レイアウト一覧取得
interface GetLayoutsRequest {
  pageType?: PageType;
  status?: LayoutStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

interface GetLayoutsResponse {
  success: boolean;
  data: {
    layouts: PageLayout[];
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasNext: boolean;
    };
  };
}

// GET /api/v1/admin/layouts/[id].get.ts
// レイアウト詳細取得
interface GetLayoutResponse {
  success: boolean;
  data: {
    layout: PageLayout;
    history?: LayoutHistory[];
  };
}

// POST /api/v1/admin/layouts/create.post.ts
// レイアウト作成
interface CreateLayoutRequest {
  pageType: PageType;
  title: string;
  description?: string;
  templateId?: string;
}

interface CreateLayoutResponse {
  success: boolean;
  data: {
    layout: PageLayout;
  };
}

// PUT /api/v1/admin/layouts/[id].put.ts
// レイアウト更新
interface UpdateLayoutRequest {
  layout: Partial<PageLayout>;
  comment?: string;
}

interface UpdateLayoutResponse {
  success: boolean;
  data: {
    layout: PageLayout;
    version: number;
  };
}

// DELETE /api/v1/admin/layouts/[id].delete.ts
// レイアウト削除（論理削除）
interface DeleteLayoutResponse {
  success: boolean;
  message: string;
}

// POST /api/v1/admin/layouts/publish.post.ts
// レイアウト公開
interface PublishLayoutRequest {
  layoutId: string;
  publishAt?: Date;
  comment?: string;
}

interface PublishLayoutResponse {
  success: boolean;
  data: {
    layout: PageLayout;
    publishedAt: Date;
  };
}
```

#### テンプレート管理

```typescript
// GET /api/v1/admin/templates/list.get.ts
// テンプレート一覧取得
interface GetTemplatesResponse {
  success: boolean;
  data: {
    templates: LayoutTemplate[];
    categories: string[];
  };
}

// GET /api/v1/admin/templates/[id].get.ts
// テンプレート詳細取得
interface GetTemplateResponse {
  success: boolean;
  data: {
    template: LayoutTemplate;
  };
}

// POST /api/v1/admin/templates/create.post.ts
// テンプレート作成
interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  layout: PageLayout;
}

// POST /api/v1/admin/templates/apply.post.ts
// テンプレート適用
interface ApplyTemplateRequest {
  templateId: string;
  layoutId: string;
}
```

#### プレビュー管理

```typescript
// POST /api/v1/admin/layouts/preview.post.ts
// プレビュー生成
interface GeneratePreviewRequest {
  layoutId: string;
  device: 'mobile' | 'tablet' | 'desktop';
}

interface GeneratePreviewResponse {
  success: boolean;
  data: {
    previewUrl: string;
    previewToken: string;
    expiresAt: Date;
  };
}

// GET /api/v1/preview/[token].get.ts
// プレビュー専用URL（認証不要）
```

### hotel-common API（コア実装）

```typescript
// GET /api/v1/admin/layouts
// レイアウト一覧取得（コア実装）
router.get('/api/v1/admin/layouts', requireAdmin, async (req, res) => {
  const { tenantId } = req.session;
  const { pageType, status, search, limit, offset } = req.query;
  
  const layouts = await prisma.pageLayout.findMany({
    where: {
      tenantId,
      pageType,
      status,
      isDeleted: false,
      OR: search ? [
        { title: { contains: search } },
        { description: { contains: search } }
      ] : undefined
    },
    take: limit,
    skip: offset,
    orderBy: { updatedAt: 'desc' }
  });
  
  res.json({
    success: true,
    data: {
      layouts,
      total: layouts.length,
      pagination: {
        limit,
        offset,
        hasNext: layouts.length === limit
      }
    }
  });
});

// POST /api/v1/admin/layouts
// レイアウト作成（コア実装）
router.post('/api/v1/admin/layouts', requireAdmin, async (req, res) => {
  const { tenantId, user } = req.session;
  const { pageType, title, description, templateId } = req.body;
  
  const layout = await prisma.pageLayout.create({
    data: {
      tenantId,
      pageType,
      title,
      description,
      slug: generateSlug(title),
      elements: templateId ? await loadTemplate(templateId) : [],
      globalStyles: defaultGlobalStyles,
      createdBy: user.id,
      updatedBy: user.id
    }
  });
  
  res.json({
    success: true,
    data: { layout }
  });
});
```

---

## 🎨 UI仕様

### 管理画面UIパス一覧

| 画面名 | パス | ファイル | 状態 | 備考 |
|-------|------|---------|------|------|
| レイアウト管理 | `/admin/layouts` | `pages/admin/layouts/index.vue` | ⏳ 計画中 | 一覧・検索・フィルタ |
| レイアウトエディタ | `/admin/layouts/editor/[id]` | `pages/admin/layouts/editor/[id].vue` | ⏳ 計画中 | D&Dエディタ |
| テンプレート管理 | `/admin/templates` | `pages/admin/templates/index.vue` | ⏳ 計画中 | テンプレート一覧 |
| テンプレートエディタ | `/admin/templates/edit/[id]` | `pages/admin/templates/edit/[id].vue` | ⏳ 計画中 | テンプレート編集 |
| TOPページ編集 | `/admin/pages/top` | `pages/admin/pages/top/index.vue` | ⏳ 計画中 | BlockNote エディタ |
| ルームサービスページ | `/admin/pages/room-service` | `pages/admin/pages/room-service/index.vue` | ⏳ 計画中 | 専用エディタ |
| 統合ハブページ | `/admin/info/hub` | `pages/admin/info/hub/index.vue` | ⏳ 計画中 | 統合ハブ設定 |
| WiFi案内ページ | `/admin/info/wifi` | `pages/admin/info/wifi/index.vue` | ⏳ 計画中 | WiFi設定 |
| 館内施設ページ | `/admin/info/facilities` | `pages/admin/info/facilities/index.vue` | ⏳ 計画中 | 施設情報管理 |
| 観光案内ページ | `/admin/info/tourism` | `pages/admin/info/tourism/index.vue` | ⏳ 計画中 | 観光情報管理 |
| 記事管理 | `/admin/info/articles` | `pages/admin/info/articles/index.vue` | ⏳ 計画中 | 記事一覧 |
| 記事作成 | `/admin/info/articles/create` | `pages/admin/info/articles/create/index.vue` | ⏳ 計画中 | 記事作成 |
| 記事編集 | `/admin/info/articles/edit/[id]` | `pages/admin/info/articles/edit/[id].vue` | ⏳ 計画中 | 記事編集 |

### デザインシステム

```scss
// Element Plus theme customization
$--color-primary: #409EFF;
$--color-success: #67C23A;
$--color-warning: #E6A23C;
$--color-danger: #F56C6C;

// Editor specific colors
$editor-border: #DCDFE6;
$editor-bg: #FAFAFA;
$canvas-bg: #FFFFFF;
$selection-color: #409EFF;
$hover-color: rgba(64, 158, 255, 0.1);
$drop-zone-color: rgba(64, 158, 255, 0.2);

// Animation settings
$drag-transition: all 0.2s ease;
$hover-transition: all 0.15s ease;
$selection-transition: all 0.1s ease;
```

---

## 🎨 UI/UX統一ルール

### ブラウザデフォルトUI使用禁止（厳守）

**参照**: [DEVELOPMENT_RULES.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/DEVELOPMENT_RULES.md)

#### ❌ 絶対に使用禁止

```typescript
// ❌ 絶対に使用禁止
alert('アップロード完了')
confirm('削除しますか？')
prompt('ファイル名を入力')
window.alert()
window.confirm()
window.prompt()
```

**理由**:
- UX品質の低下
- デザイン統一性の欠如
- モバイル対応の問題
- アクセシビリティの問題

#### ✅ 必須使用（代替手段）

```typescript
// ✅ 成功メッセージ
showSuccessToast('アップロード完了')

// ✅ エラーメッセージ
showErrorToast('アップロードに失敗しました')

// ✅ 警告メッセージ
showWarningToast('未保存の変更があります')

// ✅ 情報メッセージ
showInfoToast('処理を開始しました')

// ✅ 確認ダイアログ
ConfirmModal({ 
  type: 'warning', 
  message: '削除しますか？',
  onConfirm: handleDelete
})
```

#### ESLintルール

```json
{
  "rules": {
    "no-alert": "error",      // alert() 使用禁止
    "no-confirm": "error",    // confirm() 使用禁止
    "no-restricted-globals": ["error", "alert", "confirm", "prompt"]
  }
}
```

### 既存コンポーネント使用

```vue
<template>
  <!-- ✅ 既存のトーストシステム使用（app.vueで管理） -->
  <UiToast />
  
  <!-- ✅ 既存の確認モーダル使用 -->
  <ConfirmModal 
    :show="showDeleteConfirm"
    type="warning"
    title="レイアウト削除確認"
    message="このレイアウトを削除しますか？"
    @confirm="handleDelete"
    @cancel="showDeleteConfirm = false"
  />
  
  <!-- ✅ 既存のアイコンシステム使用 -->
  <Icon name="heroicons:star-solid" />
  <Icon name="heroicons:trash" />
  <Icon name="heroicons:pencil-square" />
</template>
```

### トーストコンポーネントの配置ルール

**重要**: トーストコンポーネントは`app.vue`にのみ配置

```vue
<!-- ✅ 正しい配置: app.vue -->
<template>
  <div>
    <NuxtPage />
    <UiToast />  <!-- ここにのみ配置 -->
  </div>
</template>

<!-- ❌ 間違った配置: レイアウトやページ -->
<template>
  <div>
    <UiToast />  <!-- レイアウトやページに配置しない -->
    <!-- ... -->
  </div>
</template>
```

### インラインスタイル禁止

```vue
<!-- ❌ 禁止: インラインスタイル -->
<div style="color: red; font-size: 16px;">エラー</div>

<!-- ✅ 推奨: Tailwind CSS -->
<div class="text-red-600 text-base">エラー</div>

<!-- ✅ 推奨: CSS Modules（必要な場合のみ） -->
<div :class="$style.errorMessage">エラー</div>
```

### アクセシビリティ要件

- **キーボード操作**: すべての機能をキーボードで操作可能
- **スクリーンリーダー対応**: 適切なARIA属性を使用
- **フォーカス管理**: 明確なフォーカスインジケーター
- **カラーコントラスト**: WCAG AA基準準拠（最低4.5:1）

---

## 📊 現状実装状況

### データベース実装状況

| テーブル | 実装状態 | 備考 |
|---------|---------|------|
| **pages** | ✅ 実装済み | 既存テーブル（PascalCase命名） |
| **page_histories** | ✅ 実装済み | バージョン管理用 |
| **notification_templates** | ✅ 実装済み | 通知テンプレート用 |
| **page_layouts** | ❌ 未実装 | **新規作成必要** |
| **layout_histories** | ❌ 未実装 | **新規作成必要** |
| **layout_templates** | ❌ 未実装 | **新規作成必要** |
| **preview_tokens** | ❌ 未実装 | **新規作成必要** |

### データ保存方法（現状）

| データ | 現在の保存方法 | 目標の保存方法 | 移行必要性 |
|-------|--------------|--------------|-----------|
| **テンプレート** | ファイルシステム<br>(`/server/data/templates/*.json`) | PostgreSQL<br>(`layout_templates`) | ✅ 必要 |
| **TOPページ** | メモリストア<br>(`pageStore.js`) | PostgreSQL<br>(`page_layouts`) | ✅ 必要 |
| **ページ情報** | PostgreSQL<br>(`pages`) | PostgreSQL<br>(`page_layouts`) | ✅ 統合必要 |

### API実装状況

#### hotel-saas API（プロキシ）

| エンドポイント | 実装状態 | ファイル | 備考 |
|--------------|---------|---------|------|
| GET `/api/v1/admin/pages/top` | ✅ 実装済み | `pages/top.get.ts` | TOPページ取得 |
| PUT `/api/v1/admin/pages/top` | ✅ 実装済み | `pages/top.put.ts` | TOPページ更新 |
| GET `/api/v1/admin/templates/list` | ✅ 実装済み | `templates/list.get.ts` | テンプレート一覧 |
| POST `/api/v1/admin/templates/create` | ✅ 実装済み | `templates/create.post.ts` | テンプレート作成 |
| GET `/api/v1/admin/templates/[id]` | ✅ 実装済み | `templates/[id].get.ts` | テンプレート詳細 |
| PUT `/api/v1/admin/templates/[id]` | ✅ 実装済み | `templates/[id].put.ts` | テンプレート更新 |
| DELETE `/api/v1/admin/templates/[id]` | ✅ 実装済み | `templates/[id].delete.ts` | テンプレート削除 |
| POST `/api/v1/admin/templates/apply` | ✅ 実装済み | `templates/apply.post.ts` | テンプレート適用 |
| GET `/api/v1/admin/layouts/*` | 🔴 disabled | `layouts/*.disabled` | **有効化必要** |
| GET `/api/v1/admin/info/articles/*` | 🔴 disabled | `info/articles/*.disabled` | **有効化必要** |

#### hotel-common API（コア実装）

| エンドポイント | 実装状態 | 備考 |
|--------------|---------|------|
| レイアウト管理API | ❌ 未実装 | **新規作成必要** |
| ページ管理API | ❌ 未実装 | **新規作成必要** |
| プレビューAPI | ❌ 未実装 | **新規作成必要** |

### UI実装状況

| 画面 | パス | 実装状態 | 備考 |
|------|------|---------|------|
| **レイアウト管理** | `/admin/layouts` | 🟡 部分実装 | プラン制限あり（エコノミープランではテンプレート選択のみ） |
| **レイアウトエディタ** | `/admin/layouts/editor/[id]` | ❌ 未実装 | **新規作成必要** |
| **テンプレート管理** | `/admin/templates` | ✅ 実装済み | カテゴリフィルター・公開状態管理実装済み |
| **テンプレートエディタ** | `/admin/templates/edit/[id]` | ✅ 実装済み | 編集機能実装済み |
| **TOPページ編集** | `/admin/pages/top` | ✅ 実装済み | BlockNoteエディタ使用 |
| **統合ハブページ** | `/admin/info/hub` | ✅ 実装済み | ページ設定・背景設定・メニューグリッド設定 |
| **WiFi案内** | `/admin/info/wifi` | ✅ 実装済み | WiFi情報管理 |
| **館内施設** | `/admin/info/facilities` | ✅ 実装済み | 施設情報管理 |
| **観光案内** | `/admin/info/tourism` | ✅ 実装済み | 観光情報管理 |
| **記事管理** | `/admin/info/articles` | 🔴 disabled | **有効化必要** |

### 既存テンプレートファイル

以下のテンプレートが既にファイルシステムに存在:

```
/server/data/templates/
├── luxury-classic.json      (ラグジュアリークラシック)
├── modern-luxury.json       (モダンラグジュアリー)
├── japanese-modern.json     (ジャパニーズモダン)
├── family-pop.json          (ファミリーポップ)
├── natural-resort.json      (ナチュラルリゾート)
└── urban-stylish.json       (アーバンスタイリッシュ)
```

---

## 🔄 移行計画

### Phase 1: データベース基盤構築（1週間）

#### 1.1 新規テーブル作成

```prisma
// Prismaマイグレーション作成
npx prisma migrate dev --name create_layout_tables
```

**作成するテーブル**:
- `page_layouts`
- `layout_histories`
- `layout_templates`
- `preview_tokens`

#### 1.2 既存データの移行

**移行対象**:
1. **ファイルシステムのテンプレート → layout_templates**
   ```typescript
   // scripts/migrate-templates-to-db.ts
   const templates = fs.readdirSync('/server/data/templates/');
   for (const file of templates) {
     const data = JSON.parse(fs.readFileSync(file));
     await prisma.layoutTemplate.create({
       data: {
         name: data.name,
         description: data.description,
         category: extractCategory(data.id),
         thumbnail: data.thumbnail,
         layout: data,
         isPublic: true,
         createdBy: 'system'
       }
     });
   }
   ```

2. **メモリストアのページ → page_layouts**
   ```typescript
   // scripts/migrate-pages-to-db.ts
   const pageData = pageStore.get(tenantId);
   await prisma.pageLayout.create({
     data: {
       tenantId,
       slug: pageData.slug,
       pageType: 'top',
       title: pageData.title,
       elements: pageData.content,
       globalStyles: defaultGlobalStyles,
       status: 'published',
       createdBy: 'system',
       updatedBy: 'system'
     }
   });
   ```

3. **既存 pages テーブル → page_layouts**
   ```typescript
   // scripts/consolidate-pages.ts
   const existingPages = await prisma.pages.findMany();
   for (const page of existingPages) {
     await prisma.pageLayout.create({
       data: {
         tenantId: page.TenantId,
         slug: page.Slug,
         pageType: 'custom',
         title: page.Title,
         elements: JSON.parse(page.Html),
         status: page.IsPublished ? 'published' : 'draft',
         createdBy: 'migration',
         updatedBy: 'migration'
       }
     });
   }
   ```

#### 1.3 移行検証

```typescript
// scripts/verify-migration.ts
const templateCount = await prisma.layoutTemplate.count();
const layoutCount = await prisma.pageLayout.count();

console.log(`移行完了:
  - テンプレート: ${templateCount}件
  - レイアウト: ${layoutCount}件
`);
```

### Phase 2: API実装（2週間）

#### 2.1 hotel-common コア API実装

**実装順序**:
1. レイアウト管理API（CRUD）
2. テンプレート管理API（CRUD）
3. バージョン管理API
4. プレビューAPI

#### 2.2 hotel-saas プロキシAPI実装

**実装順序**:
1. レイアウト一覧・詳細・作成・更新・削除
2. テンプレート一覧・詳細・適用
3. プレビュー生成
4. 公開管理

#### 2.3 既存API統合

**対応が必要なAPI**:
- `/api/v1/admin/pages/top.*` → `/api/v1/admin/layouts/*` に統合
- `/api/v1/admin/templates/*` → データソースをDBに変更
- disabled APIの有効化

### Phase 3: UI実装（3週間）

#### 3.1 レイアウトエディタ実装

**週1**: コア機能
- ドラッグ&ドロップエディタ
- 要素パレット
- キャンバス

**週2**: 拡張機能
- プロパティパネル
- プレビュー機能
- レスポンシブ制御

**週3**: 統合・調整
- 既存UIとの統合
- UX調整
- バグ修正

#### 3.2 管理画面統合

**対応が必要なUI**:
- `/admin/layouts/index.vue`: 機能制限解除、DB連携
- `/admin/templates/index.vue`: データソースをDBに変更
- `/admin/pages/top/index.vue`: 新エディタへの移行（オプション）

### Phase 4: テスト・リリース（1週間）

#### 4.1 統合テスト
- 全API動作確認
- データ整合性確認
- パフォーマンステスト

#### 4.2 ユーザーテスト
- 管理者による動作確認
- フィードバック収集
- 改善実施

#### 4.3 段階的リリース
1. ベータ版リリース（限定ユーザー）
2. フィードバック反映
3. 本番リリース

### 移行タイムライン

```
Week 1: Phase 1 - DB基盤構築・データ移行
Week 2-3: Phase 2 - API実装
Week 4-6: Phase 3 - UI実装
Week 7: Phase 4 - テスト・リリース

合計: 7週間
```

### リスク管理

| リスク | 影響度 | 対策 |
|-------|-------|------|
| **データ移行失敗** | 🔴 高 | 完全バックアップ取得、段階的移行、ロールバック手順整備 |
| **既存機能の破壊** | 🔴 高 | 既存APIの維持、互換性レイヤー実装 |
| **パフォーマンス劣化** | 🟡 中 | キャッシュ戦略、クエリ最適化、負荷テスト |
| **ユーザー混乱** | 🟡 中 | マニュアル作成、トレーニング実施、段階的移行 |

---

## 🔒 実装詳細

### 認証・権限

- **認証方式**: Session認証（Redis + HttpOnly Cookie）
- **必須ミドルウェア**: `requireAdmin()`
- **権限レベル**:
  - `canView`: 閲覧のみ
  - `canEdit`: 編集可能
  - `canPublish`: 公開可能
  - `canDelete`: 削除可能

### セキュリティ

#### 入力値検証

```typescript
// Zod schema for validation
const LayoutElementSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['text', 'image', 'video', /* ... */]),
  content: z.object({
    text: z.string().max(10000).optional(),
    html: z.string().max(50000).optional(), // HTML sanitization required
    url: z.string().url().optional(),
    // ...
  }),
  styles: z.object({
    // Style validation
  }),
  // ...
});
```

#### HTMLサニタイゼーション

```typescript
import DOMPurify from 'dompurify';

const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class', 'id', 'style'],
    ALLOW_DATA_ATTR: false
  });
};
```

#### 権限制御

```typescript
const checkLayoutPermission = (user: User, layout: PageLayout, action: string) => {
  const permissions = layout.permissions;
  const userRoles = user.roles;
  
  switch (action) {
    case 'view':
      return permissions.canView.some(role => userRoles.includes(role));
    case 'edit':
      return permissions.canEdit.some(role => userRoles.includes(role));
    case 'publish':
      return permissions.canPublish.some(role => userRoles.includes(role));
    default:
      return false;
  }
};
```

### パフォーマンス最適化

#### フロントエンド最適化

```typescript
// 遅延読み込み
const DraggableEditor = defineAsyncComponent(() => 
  import('~/components/admin/layouts/DraggableEditor.vue')
);

// 仮想スクロール（大量の要素を扱う場合）
import { VirtualScroller } from '@element-plus/components';

// 画像の遅延読み込み
<img loading="lazy" :src="imageUrl" />
```

#### バックエンド最適化

```typescript
// ページネーション
const layouts = await prisma.pageLayout.findMany({
  take: 20,
  skip: page * 20,
  where: { tenantId }
});

// キャッシュ戦略（Redis）
const cacheKey = `layout:${tenantId}:${layoutId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const layout = await prisma.pageLayout.findUnique({...});
await redis.setex(cacheKey, 3600, JSON.stringify(layout));
```

---

## ⚠️ エラーハンドリング

### エラー表示方針

#### 絶対遵守ルール

```typescript
// ❌ 絶対禁止
alert('エラーが発生しました');
confirm('削除しますか？');
prompt('名前を入力してください');

// ✅ 正しい実装
// トーストコンポーネント使用
import { useToast } from '~/composables/useToast';
const toast = useToast();
toast.error('エラーが発生しました');

// モーダルコンポーネント使用（重要な確認時）
const isConfirmed = await showConfirmModal({
  title: '削除確認',
  message: 'このレイアウトを削除しますか？',
  confirmText: '削除',
  cancelText: 'キャンセル'
});
```

### エラー分類と表示方法

| エラー分類 | 表示方法 | 使用タイミング | 自動消去 |
|----------|---------|--------------|---------|
| **バリデーションエラー** | インラインエラーメッセージ | 入力フォーム直下に表示 | 手動修正時 |
| **API エラー（軽度）** | トースト（error） | 保存失敗、取得失敗 | 5秒後 |
| **API エラー（重度）** | エラーモーダル | システムエラー、認証エラー | 手動閉じる |
| **成功通知** | トースト（success） | 保存成功、公開成功 | 3秒後 |
| **警告通知** | トースト（warning） | 未保存の変更あり | 5秒後 |
| **情報通知** | トースト（info） | プレビュー生成中 | 3秒後 |

### エラーコード定義

```typescript
// hotel-common/src/types/errors.ts
export const LayoutErrorCodes = {
  // レイアウト関連
  LAYOUT_NOT_FOUND: 'LAYOUT_NOT_FOUND',
  LAYOUT_INVALID_STRUCTURE: 'LAYOUT_INVALID_STRUCTURE',
  LAYOUT_SAVE_FAILED: 'LAYOUT_SAVE_FAILED',
  LAYOUT_PUBLISH_FAILED: 'LAYOUT_PUBLISH_FAILED',
  
  // テンプレート関連
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_APPLY_FAILED: 'TEMPLATE_APPLY_FAILED',
  TEMPLATE_INVALID_FORMAT: 'TEMPLATE_INVALID_FORMAT',
  
  // プレビュー関連
  PREVIEW_GENERATION_FAILED: 'PREVIEW_GENERATION_FAILED',
  PREVIEW_TOKEN_EXPIRED: 'PREVIEW_TOKEN_EXPIRED',
  PREVIEW_TOKEN_INVALID: 'PREVIEW_TOKEN_INVALID',
  
  // バージョン管理
  VERSION_RESTORE_FAILED: 'VERSION_RESTORE_FAILED',
  VERSION_NOT_FOUND: 'VERSION_NOT_FOUND',
  
  // 権限関連
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
} as const;

export interface ApiError {
  statusCode: number;
  message: string;
  code: keyof typeof LayoutErrorCodes;
  details?: Record<string, any>;
  timestamp: string;
}
```

### エラーハンドリング実装例

#### hotel-saas（フロントエンド）

```typescript
// composables/useLayoutEditor.ts
export const useLayoutEditor = () => {
  const toast = useToast();
  
  const saveLayout = async (layoutData: PageLayout) => {
    try {
      const result = await $fetch('/api/v1/admin/layouts/save', {
        method: 'POST',
        body: layoutData
      });
      
      toast.success('レイアウトを保存しました');
      return result;
      
    } catch (error: any) {
      // エラーコードに応じた処理
      switch (error.data?.code) {
        case 'LAYOUT_INVALID_STRUCTURE':
          toast.error('レイアウト構造が不正です。確認してください。');
          break;
        case 'INSUFFICIENT_PERMISSIONS':
          toast.error('保存する権限がありません。');
          break;
        case 'TENANT_MISMATCH':
          toast.error('テナントが一致しません。再ログインしてください。');
          break;
        default:
          toast.error('保存に失敗しました。もう一度お試しください。');
      }
      throw error;
    }
  };
  
  return { saveLayout };
};
```

#### hotel-common（バックエンド）

```typescript
// src/routes/api/v1/layouts/save.ts
import { LayoutErrorCodes } from '~/types/errors';

export const saveLayout = async (req, res) => {
  try {
    // バリデーション
    const validation = validateLayoutStructure(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        statusCode: 400,
        message: 'レイアウト構造が不正です',
        code: LayoutErrorCodes.LAYOUT_INVALID_STRUCTURE,
        details: validation.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    // テナント確認
    if (req.body.tenantId !== req.session.tenantId) {
      return res.status(403).json({
        statusCode: 403,
        message: 'テナントが一致しません',
        code: LayoutErrorCodes.TENANT_MISMATCH,
        timestamp: new Date().toISOString()
      });
    }
    
    // 保存処理
    const layout = await prisma.pageLayout.create({
      data: req.body
    });
    
    return res.status(201).json(layout);
    
  } catch (error) {
    console.error('Layout save error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'レイアウトの保存に失敗しました',
      code: LayoutErrorCodes.LAYOUT_SAVE_FAILED,
      timestamp: new Date().toISOString()
    });
  }
};
```

### バリデーションエラー表示

```vue
<!-- pages/admin/layouts/edit.vue -->
<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-group">
      <label for="layoutName">レイアウト名</label>
      <input
        id="layoutName"
        v-model="form.name"
        type="text"
        :class="{ 'error': errors.name }"
      />
      <!-- インラインエラー -->
      <p v-if="errors.name" class="error-message">
        {{ errors.name }}
      </p>
    </div>
  </form>
</template>

<script setup lang="ts">
const errors = ref<Record<string, string>>({});

const validateForm = () => {
  errors.value = {};
  
  if (!form.value.name) {
    errors.value.name = 'レイアウト名は必須です';
  }
  
  if (form.value.name.length > 100) {
    errors.value.name = 'レイアウト名は100文字以内で入力してください';
  }
  
  return Object.keys(errors.value).length === 0;
};
</script>
```

### エラーログ記録

すべてのエラーは `SSOT_ADMIN_SYSTEM_LOGS.md` に従って記録：

```typescript
// エラー発生時の自動ログ記録
await logSystemError({
  type: 'LAYOUT_ERROR',
  code: error.code,
  message: error.message,
  userId: session.user.id,
  tenantId: session.tenantId,
  details: {
    layoutId: layoutData.id,
    operation: 'SAVE',
    stackTrace: error.stack
  }
});
```

---

## 📊 パフォーマンス要件

### パフォーマンス目標値

| 項目 | 目標値 | 測定方法 | 優先度 |
|------|--------|---------|--------|
| **API応答時間** | 300ms以内 | hotel-common側でロギング | 🔴 最高 |
| **UI初回描画** | 2秒以内 | Lighthouse Performance Score 90+ | 🔴 最高 |
| **レイアウト保存** | 1秒以内 | ユーザー体感 + パフォーマンスAPI | 🔴 最高 |
| **ドラッグ操作** | 60fps維持 | Performance API（requestAnimationFrame） | 🟡 高 |
| **プレビュー生成** | 3秒以内 | バックエンド処理時間 | 🟡 高 |
| **テンプレート適用** | 2秒以内 | フロントエンド処理時間 | 🟡 高 |
| **画像アップロード** | 5秒以内（10MB） | アップロード完了まで | 🟢 中 |

### フロントエンド最適化戦略

#### 1. レイアウトエディタの最適化

```typescript
// ドラッグ操作の最適化（requestAnimationFrame使用）
const handleDrag = (event: DragEvent) => {
  requestAnimationFrame(() => {
    updateElementPosition(event.clientX, event.clientY);
  });
};

// 大量の要素描画時の仮想スクロール
import { useVirtualScroll } from '~/composables/useVirtualScroll';

const { visibleItems } = useVirtualScroll({
  items: layoutElements,
  itemHeight: 80,
  containerHeight: 600
});
```

#### 2. 画像最適化

```typescript
// 画像遅延読み込み
<img 
  v-lazy="imageUrl" 
  loading="lazy"
  decoding="async"
/>

// WebP形式への自動変換
const optimizeImage = async (file: File) => {
  const webpBlob = await convertToWebP(file, {
    quality: 0.8,
    maxWidth: 1920
  });
  return webpBlob;
};
```

#### 3. コンポーネントの遅延読み込み

```typescript
// レイアウトエディタは大きいので遅延読み込み
const LayoutEditor = defineAsyncComponent(() =>
  import('~/components/admin/LayoutEditor.vue')
);

const PreviewPanel = defineAsyncComponent(() =>
  import('~/components/admin/PreviewPanel.vue')
);
```

### バックエンド最適化戦略

#### 1. データベースクエリ最適化

```typescript
// N+1問題の回避
const layouts = await prisma.pageLayout.findMany({
  where: { tenantId },
  include: {
    histories: {
      take: 5,
      orderBy: { createdAt: 'desc' }
    },
    template: true
  }
});

// インデックスの活用（Prismaスキーマ）
model PageLayout {
  // ...
  @@index([tenantId, pageType]) // 複合インデックス
  @@index([isPublished])
  @@index([createdAt])
}
```

#### 2. キャッシュ戦略

```typescript
// Redis キャッシュ（公開済みレイアウト）
const getCachedLayout = async (tenantId: string, pageType: string) => {
  const cacheKey = `layout:${tenantId}:${pageType}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const layout = await prisma.pageLayout.findFirst({
    where: { tenantId, pageType, isPublished: true }
  });
  
  // 1時間キャッシュ
  await redis.setex(cacheKey, 3600, JSON.stringify(layout));
  return layout;
};

// キャッシュ無効化（更新・公開時）
const invalidateLayoutCache = async (tenantId: string, pageType: string) => {
  const cacheKey = `layout:${tenantId}:${pageType}`;
  await redis.del(cacheKey);
};
```

#### 3. 並列処理

```typescript
// 複数リソースの並列取得
const [layout, templates, histories] = await Promise.all([
  prisma.pageLayout.findUnique({ where: { id: layoutId } }),
  prisma.layoutTemplate.findMany({ where: { tenantId } }),
  prisma.layoutHistory.findMany({ 
    where: { layoutId },
    take: 10,
    orderBy: { createdAt: 'desc' }
  })
]);
```

### パフォーマンス測定

#### フロントエンド測定

```typescript
// Performance API による測定
export const measurePerformance = (operationName: string) => {
  const startMark = `${operationName}-start`;
  const endMark = `${operationName}-end`;
  
  return {
    start: () => performance.mark(startMark),
    end: () => {
      performance.mark(endMark);
      performance.measure(operationName, startMark, endMark);
      
      const measure = performance.getEntriesByName(operationName)[0];
      console.log(`${operationName}: ${measure.duration.toFixed(2)}ms`);
      
      // 目標値を超えた場合は警告
      if (measure.duration > 1000) {
        console.warn(`⚠️ ${operationName} が遅い: ${measure.duration}ms`);
      }
      
      return measure.duration;
    }
  };
};

// 使用例
const perf = measurePerformance('layout-save');
perf.start();
await saveLayout(layoutData);
perf.end();
```

#### バックエンド測定

```typescript
// hotel-common: ミドルウェアでAPI応答時間を記録
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // ログ記録
    logger.info('API Request', {
      method: req.method,
      path: req.path,
      duration: `${duration}ms`,
      statusCode: res.statusCode
    });
    
    // 300msを超えた場合は警告
    if (duration > 300) {
      logger.warn('Slow API Response', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`
      });
    }
  });
  
  next();
});
```

### バンドルサイズ最適化

```typescript
// vite.config.ts
export default defineNuxtConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'layout-editor': [
              '~/components/admin/LayoutEditor.vue',
              '~/components/admin/WidgetPanel.vue',
              '~/components/admin/PropertyPanel.vue'
            ],
            'vendor': ['vue', 'vue-router']
          }
        }
      }
    }
  }
});
```

---

## 📈 監視・ロギング

### 監査ログ

#### 記録対象操作

以下の操作を `SSOT_ADMIN_SYSTEM_LOGS.md` に従って記録：

| 操作 | ログタイプ | 記録内容 | 保持期間 |
|------|----------|---------|---------|
| **レイアウト作成** | `LAYOUT_CREATED` | tenantId, userId, layoutId, pageType | 1年 |
| **レイアウト更新** | `LAYOUT_UPDATED` | tenantId, userId, layoutId, 変更内容 | 1年 |
| **レイアウト削除** | `LAYOUT_DELETED` | tenantId, userId, layoutId, pageType | 3年 |
| **レイアウト公開** | `LAYOUT_PUBLISHED` | tenantId, userId, layoutId, version | 1年 |
| **テンプレート適用** | `TEMPLATE_APPLIED` | tenantId, userId, templateId, layoutId | 6ヶ月 |
| **バージョン復元** | `VERSION_RESTORED` | tenantId, userId, layoutId, fromVersion, toVersion | 1年 |
| **プレビュー生成** | `PREVIEW_GENERATED` | tenantId, userId, layoutId | 1ヶ月 |

#### ログ記録実装

```typescript
// hotel-common/src/services/auditLog.ts
export const logLayoutOperation = async (params: {
  operation: string;
  tenantId: string;
  userId: string;
  layoutId?: string;
  details?: Record<string, any>;
}) => {
  await prisma.auditLog.create({
    data: {
      type: 'LAYOUT_OPERATION',
      operation: params.operation,
      tenantId: params.tenantId,
      userId: params.userId,
      resourceType: 'PAGE_LAYOUT',
      resourceId: params.layoutId,
      details: params.details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      createdAt: new Date()
    }
  });
};

// 使用例
await logLayoutOperation({
  operation: 'LAYOUT_PUBLISHED',
  tenantId: session.tenantId,
  userId: session.user.id,
  layoutId: layout.id,
  details: {
    pageType: layout.pageType,
    version: layout.version,
    previousVersion: layout.version - 1
  }
});
```

### パフォーマンスモニタリング

#### フロントエンド監視

```typescript
// composables/usePerformanceMonitoring.ts
export const usePerformanceMonitoring = () => {
  const reportMetric = async (metricName: string, value: number) => {
    // hotel-common の監視APIに送信
    await $fetch('/api/v1/monitoring/metrics', {
      method: 'POST',
      body: {
        metricName,
        value,
        timestamp: new Date().toISOString(),
        page: window.location.pathname
      }
    });
  };
  
  // レイアウトエディタの操作監視
  const monitorEditorOperation = (operationName: string) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        reportMetric(`editor.${operationName}.duration`, duration);
        
        // FPS監視（ドラッグ操作時）
        if (operationName === 'drag') {
          const fps = calculateFPS();
          reportMetric('editor.drag.fps', fps);
        }
      }
    };
  };
  
  return { monitorEditorOperation };
};
```

#### バックエンド監視

```typescript
// hotel-common: レイアウトAPI のパフォーマンス監視
export const monitorLayoutAPI = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    // メトリクス記録
    await prisma.performanceMetric.create({
      data: {
        type: 'API_RESPONSE_TIME',
        endpoint: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        tenantId: req.session?.tenantId,
        timestamp: new Date()
      }
    });
    
    // 閾値超過時のアラート
    if (duration > 300) {
      await sendAlert({
        level: 'WARNING',
        message: `Slow API: ${req.method} ${req.path} took ${duration}ms`,
        details: {
          endpoint: req.path,
          duration,
          tenantId: req.session?.tenantId
        }
      });
    }
  });
  
  next();
};
```

### エラートラッキング

```typescript
// グローバルエラーハンドラー（hotel-saas）
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', async (error, instance, info) => {
    // エラーログをhotel-commonに送信
    await $fetch('/api/v1/monitoring/errors', {
      method: 'POST',
      body: {
        type: 'VUE_ERROR',
        message: error.message,
        stack: error.stack,
        component: instance?.$options.name,
        info,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    });
    
    // ユーザーにはトーストでエラー表示
    const toast = useToast();
    toast.error('予期しないエラーが発生しました');
  });
});
```

### ダッシュボード監視項目

管理者向けダッシュボード（`SSOT_ADMIN_SYSTEM_LOGS.md`）で以下を監視：

| 監視項目 | 説明 | アラート条件 |
|---------|------|------------|
| **API応答時間** | レイアウトAPI全体の平均応答時間 | 平均 > 300ms |
| **エラー率** | 全リクエストに対するエラーの割合 | > 5% |
| **ドラッグ操作FPS** | レイアウトエディタのドラッグ操作時FPS | < 30fps |
| **保存失敗率** | レイアウト保存操作の失敗率 | > 1% |
| **プレビュー生成時間** | プレビュー生成の平均時間 | > 3秒 |
| **キャッシュヒット率** | Redisキャッシュのヒット率 | < 80% |

### ログ保持ポリシー

| ログタイプ | 保持期間 | 理由 |
|----------|---------|------|
| **監査ログ** | 1-3年 | コンプライアンス・セキュリティ |
| **パフォーマンスメトリクス** | 3ヶ月 | 傾向分析 |
| **エラーログ** | 6ヶ月 | デバッグ・改善 |
| **アクセスログ** | 1ヶ月 | 運用監視 |

---

## 🚧 未実装機能

### Phase 1（最高優先 - 基本機能）

- [ ] レイアウトエディタコンポーネント実装
- [ ] ドラッグ&ドロップ機能実装
- [ ] プロパティパネル実装
- [ ] テンプレート管理機能
- [ ] ページ管理機能

### Phase 2（高優先 - 拡張機能）

- [ ] ウィジェットシステム実装
- [ ] レスポンシブ対応強化
- [ ] プレビュー機能実装
- [ ] バージョン管理実装
- [ ] スケジュール管理実装

### Phase 3（中優先 - 高度機能）

- [ ] 多言語対応実装
- [ ] A/Bテスト機能
- [ ] パフォーマンス分析
- [ ] アニメーション効果追加
- [ ] AI支援レイアウト生成

### Phase 4（将来検討 - 基本革新機能）

- [ ] 外部デザインツール連携
- [ ] リアルタイム共同編集
- [ ] クラウド同期機能
- [ ] プラグインシステム

---

## 🚀 未来実装予定機能（革新的改善）

以下は、業界最先端のUIデザイン管理システムを目指すための革新的機能群です。

### Phase A: 即効性の高い改善（1-2週間）

#### A.1 インスタント保存システム
```typescript
// 概要
- キーストローク単位の自動保存
- 「保存」ボタン不要
- 履歴から任意の時点に復元

// 技術要件
- IndexedDB による高速ローカルストレージ
- デバウンス処理（500ms）
- 差分保存によるストレージ最適化

// 期待効果
✅ 「保存忘れ」が存在しない
✅ ブラウザクラッシュ時のデータ保護
✅ 1分前の状態に即座に復元可能
```

#### A.2 自動アクセシビリティチェック
```typescript
// 概要
- 色覚障害シミュレーター
- スクリーンリーダーテスト
- キーボード操作テスト
- WCAG 2.1 AA/AAA準拠チェック

// 技術要件
- axe-core ライブラリ統合
- リアルタイムバリデーション
- 自動修正提案機能

// 期待効果
✅ 色覚障害のお客様でも見やすいUI
✅ 高齢者に優しいデザイン自動実現
✅ 法令遵守を自動で保証
```

#### A.3 自然言語検索
```typescript
// 概要
- 「去年のクリスマスに使ったレイアウト」で検索
- 「赤色を使っているテンプレート」で絞り込み
- AIによるセマンティック検索

// 技術要件
- Elasticsearch / OpenSearch
- ベクトル検索（Embedding API）
- 自然言語処理（NLP）

// 期待効果
✅ 「あのレイアウトどこだっけ？」がすぐ見つかる
✅ 直感的な言葉で検索可能
✅ 複雑なフィルタ設定不要
```

#### A.4 スマート通知システム
```typescript
// 概要
- 「WiFi案内ページが見られていません」と警告
- 「明日からクリスマスレイアウトに切り替わります」と通知
- 「画像が重すぎます」とパフォーマンス警告

// 技術要件
- WebSocket / SSE によるリアルタイム通知
- スケジュール監視バッチ処理
- パフォーマンス自動分析

// 期待効果
✅ 問題を自動で発見
✅ 重要な期限を見逃さない
✅ パフォーマンス低下を自動で防止
```

---

### Phase B: 現場体験を劇的に改善（3-4週間）

#### B.1 タブレット専用編集モード
```typescript
// 概要
- iPadでの直感的なタッチ操作対応
- Apple Pencil対応（手書き→テキスト変換）
- ジェスチャー操作（ピンチ・スワイプ）

// 技術要件
- Pointer Events API
- Touch Events 最適化
- Handwriting Recognition API

// 期待効果
✅ フロントデスクのiPadで直接編集可能
✅ マウス不要、タッチだけで完結
✅ 現場で写真撮影→即座にレイアウトに追加
```

#### B.2 実機同期プレビュー
```typescript
// 概要
- 編集中のレイアウトを実際の客室TVにリアルタイム表示
- QRコード生成→スマホでプレビュー
- デバイス別同時プレビュー（TV・スマホ・タブレット）

// 技術要件
- WebSocket によるリアルタイム同期
- QRコード生成（qrcode.js）
- デバイス検出・最適化

// 期待効果
✅ 実際のTV画面で確認しながら編集
✅ 「思っていた見た目と違う」を事前防止
✅ スマホで確認→デスクトップで修正が可能
```

#### B.3 複数人同時編集
```typescript
// 概要
- Figma/Google Docsのような同時編集機能
- リアルタイムカーソル表示・コメント機能
- 編集コンフリクト自動解決

// 技術要件
- Operational Transformation (OT) / CRDT
- WebSocket / WebRTC
- Conflict Resolution アルゴリズム

// 期待効果
✅ マネージャーとスタッフが同時にレイアウト調整
✅ リモート会議しながらリアルタイムで編集
✅ 「誰が何を編集中か」が一目でわかる
```

#### B.4 ビジュアルロジックエディタ
```typescript
// 概要
- 「もし天気が雨なら屋内施設を強調」のような条件を視覚的に設定
- ドラッグ&ドロップで条件分岐作成
- プログラミング知識不要

// 技術要件
- ノードベースエディタ（Vue Flow / React Flow）
- ルールエンジン（JSON Rules Engine）
- ビジュアルプログラミング

// 期待効果
✅ エンジニア不在でも高度な表示制御
✅ 「雨の日は温泉を強調」が簡単に設定
✅ ビジネスロジックを現場スタッフが管理
```

#### B.5 承認ワークフロー
```typescript
// 概要
- マネージャー承認機能
- コメント・修正依頼機能
- 変更差分の視覚的比較

// 技術要件
- ワークフローエンジン
- Diff アルゴリズム（diff-match-patch）
- コメントシステム

// 期待効果
✅ 公開前にマネージャーが確認できる
✅ 「ここを修正して」のコメントが直接レイアウトに残せる
✅ 変更前後の比較が簡単
```

---

### Phase C: 差別化要素（2-3ヶ月）

#### C.1 AI自動レイアウト生成
```typescript
// 概要
- ホテルのブランドカラー・画像を解析してレイアウト自動生成
- 競合ホテルのUIをAI分析して最適なデザイン提案
- テキストから自動でレイアウト生成（GPT-4 Vision連携）

// 技術要件
- OpenAI GPT-4 Vision API
- 画像解析（Color Thief, Vibrant.js）
- デザインシステム自動生成

// 期待効果
✅ デザインスキル不要で高品質なレイアウト作成
✅ 30分かかっていた作業が3分に短縮
✅ プロデザイナーレベルのUI自動生成
```

#### C.2 コンテンツ自動最適化
```typescript
// 概要
- 画像を自動でWebP/AVIFに変換・圧縮
- テキストの可読性を自動分析・改善提案
- アクセシビリティ問題をAI検知・自動修正

// 技術要件
- Sharp / ImageMagick
- 可読性スコア計算（Flesch-Kincaid）
- AI校正（GPT-4）

// 期待効果
✅ 画像最適化を意識しなくても自動で高速化
✅ 誰でも読みやすいテキストに自動調整
✅ アクセシビリティ違反を自動で防止
```

#### C.3 多言語自動翻訳
```typescript
// 概要
- テキストを自動で多言語翻訳
- AIによる自然な翻訳（DeepL API連携）
- 言語別レイアウト自動調整

// 技術要件
- DeepL API / Google Translate API
- i18n 自動管理
- RTL（右から左）レイアウト対応

// 期待効果
✅ 英語・中国語・韓国語版を自動生成
✅ インバウンド対応が簡単
✅ 翻訳コストゼロ
```

#### C.4 ヒートマップ分析
```typescript
// 概要
- 客室TVでのクリック・視線追跡
- 「どのボタンが押されているか」を可視化
- 改善ポイントをAI提案

// 技術要件
- Hotjar / Mouseflow 統合
- クリックトラッキング
- AI分析エンジン

// 期待効果
✅ 「誰も使っていない機能」を発見
✅ データに基づいた改善
✅ 顧客満足度向上に直結
```

#### C.5 テンプレートマーケットプレイス
```typescript
// 概要
- 他ホテルのテンプレートを購入・共有
- 季節イベント用テンプレートパック
- プロデザイナー作成の有料テンプレート

// 技術要件
- マーケットプレイス基盤
- 決済システム（Stripe）
- レビュー・評価システム

// 期待効果
✅ クリスマステンプレートを即座に適用
✅ 他ホテルの成功事例を参考にできる
✅ ゼロからデザインしなくても高品質
```

---

### Phase D: 最先端技術（長期実装）

#### D.1 パーソナライゼーションAI
```typescript
// 概要
- 宿泊客の属性（カップル/ファミリー/ビジネス）を分析
- 時間帯・季節に応じた最適なレイアウト自動切り替え
- A/Bテスト結果をAI分析して自動最適化

// 技術要件
- 機械学習モデル（TensorFlow.js）
- リアルタイムパーソナライゼーション
- A/Bテスト自動化

// 期待効果
✅ 顧客満足度が自動で向上
✅ 手動でA/Bテストしなくても最適化
✅ 季節イベント対応が自動化
```

#### D.2 音声入力対応
```typescript
// 概要
- 音声でテキスト入力
- 「画像を追加」「タイトルを大きく」など音声コマンド
- 多言語音声認識（日本語・英語・中国語）

// 技術要件
- Web Speech API
- 音声コマンド認識（NLP）
- 多言語対応

// 期待効果
✅ 忙しい時でも音声で素早く編集
✅ キーボード不要で作業効率3倍
✅ 外国人スタッフも母国語で編集可能
```

#### D.3 オフライン編集モード
```typescript
// 概要
- ネット接続なしでも編集可能
- 自動同期（復帰時）
- Service Worker活用

// 技術要件
- Service Worker
- IndexedDB
- Sync API / Background Sync

// 期待効果
✅ WiFi不安定でも作業継続
✅ 移動中でもレイアウト編集
✅ データ通信量削減
```

#### D.4 タイムトラベルプレビュー
```typescript
// 概要
- 「春のレイアウト」「夏のレイアウト」を事前確認
- スケジュール自動切り替えのシミュレーション
- 過去のレイアウトを簡単に復元・比較

// 技術要件
- タイムライン管理システム
- スケジュールシミュレーター
- バージョン比較ツール

// 期待効果
✅ 季節イベント前に完璧な準備
✅ 「去年のクリスマスレイアウト」を即座に復元
✅ スケジュール設定ミスを事前発見
```

#### D.5 ビジュアルタイムライン
```typescript
// 概要
- レイアウトの変更履歴をビジュアル表示
- 「この期間に何を表示したか」を一目で確認
- カレンダービューで公開スケジュール管理

// 技術要件
- タイムラインUI（vis-timeline）
- カレンダーコンポーネント
- ビジュアル履歴管理

// 期待効果
✅ 年間スケジュールを俯瞰できる
✅ 過去の実績を視覚的に確認
✅ 「あの時は何を表示していたか」がすぐわかる
```

#### D.6 ゲーミフィケーション
```typescript
// 概要
- 「初レイアウト公開」バッジ
- 「100回編集達成」実績
- レベルアップシステム

// 技術要件
- 実績管理システム
- ポイント・レベル計算
- バッジUI

// 期待効果
✅ スタッフのモチベーション向上
✅ 楽しみながらスキルアップ
✅ チーム内で競争・協力
```

---

## 📊 未来機能の優先度マトリックス

| 機能 | 実装難易度 | 現場インパクト | ビジネス価値 | 優先度 |
|------|----------|-------------|------------|--------|
| **インスタント保存** | 🟢 低 | 🔴 高 | 🔴 高 | ⭐⭐⭐⭐⭐ |
| **自動アクセシビリティ** | 🟡 中 | 🔴 高 | 🔴 高 | ⭐⭐⭐⭐⭐ |
| **自然言語検索** | 🟡 中 | 🔴 高 | 🟡 中 | ⭐⭐⭐⭐ |
| **スマート通知** | 🟢 低 | 🔴 高 | 🟡 中 | ⭐⭐⭐⭐ |
| **タブレット編集** | 🟡 中 | 🔴 高 | 🔴 高 | ⭐⭐⭐⭐⭐ |
| **実機プレビュー** | 🟡 中 | 🔴 高 | 🔴 高 | ⭐⭐⭐⭐⭐ |
| **同時編集** | 🔴 高 | 🟡 中 | 🟡 中 | ⭐⭐⭐ |
| **ビジュアルロジック** | 🔴 高 | 🔴 高 | 🔴 高 | ⭐⭐⭐⭐ |
| **承認ワークフロー** | 🟡 中 | 🔴 高 | 🔴 高 | ⭐⭐⭐⭐ |
| **AI自動生成** | 🔴 高 | 🔴 高 | 🔴 高 | ⭐⭐⭐⭐⭐ |
| **多言語翻訳** | 🟡 中 | 🔴 高 | 🔴 高 | ⭐⭐⭐⭐ |
| **ヒートマップ** | 🟡 中 | 🟡 中 | 🔴 高 | ⭐⭐⭐⭐ |
| **マーケットプレイス** | 🔴 高 | 🟡 中 | 🔴 高 | ⭐⭐⭐ |
| **パーソナライゼーション** | 🔴 高 | 🔴 高 | 🔴 高 | ⭐⭐⭐⭐ |
| **音声入力** | 🟡 中 | 🟡 中 | 🟡 中 | ⭐⭐⭐ |
| **オフライン編集** | 🟡 中 | 🟡 中 | 🟡 中 | ⭐⭐⭐ |
| **ゲーミフィケーション** | 🟢 低 | 🟢 低 | 🟢 低 | ⭐⭐ |

---

## 💡 実装時の注意事項

### 技術的制約
- **AI機能**: OpenAI API / DeepL API のコスト管理必須
- **リアルタイム機能**: WebSocket / Redis Pub/Sub のスケーラビリティ考慮
- **オフライン機能**: Service Worker のブラウザ互換性確認
- **同時編集**: Operational Transformation の複雑性に注意

### 現場視点の検証
- **ユーザーテスト**: 実際のホテルスタッフによる操作テスト必須
- **段階的リリース**: ベータ版→限定公開→全体公開
- **フィードバック収集**: 現場の声を継続的に収集
- **トレーニング**: 新機能導入時のマニュアル・研修実施

### パフォーマンス考慮
- **AI処理**: バックグラウンド処理・キャッシュ活用
- **リアルタイム同期**: デバウンス・スロットリング
- **画像処理**: Web Worker での非同期処理
- **データ量**: ページネーション・遅延読み込み

---

## 🎯 期待される総合効果

### 作業効率
- **レイアウト作成時間**: 30分 → 3分（90%削減）
- **多言語対応**: 1時間 → 5分（92%削減）
- **季節イベント準備**: 2日 → 30分（96%削減）

### 品質向上
- **アクセシビリティ**: WCAG 2.1 AA 100%準拠
- **パフォーマンス**: Lighthouse Score 90+ 保証
- **ユーザー満足度**: 推定 30-50% 向上

### ビジネス価値
- **競合優位性**: 業界最先端のUI管理システム
- **顧客体験**: パーソナライズされた最適な情報提供
- **運用コスト**: 人的作業の大幅削減

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-05 | 1.0.0 | 初版作成<br>- 既存設計ドキュメント統合（LAYOUT_EDITOR_SPEC.md, LAYOUT_MANAGEMENT_SYSTEM.md, LAYOUT_INFO_INTEGRATION_PLAN.md）<br>- データベーススキーマ設計<br>- API仕様設計<br>- ウィジェットシステム設計<br>- UI仕様設計<br>- 実装詳細・セキュリティ・パフォーマンス対策<br>- 未実装機能の明確化 | AI |
| 2025-10-05 | 1.1.0 | 120点を目指す改善（第1段階）<br>- **UI/UX統一ルール**セクション追加（ブラウザデフォルトUI使用禁止、ESLintルール、トースト配置ルール、アクセシビリティ要件）<br>- **現状実装状況**セクション追加（DB・API・UI実装状況の詳細、既存テンプレートファイル一覧）<br>- **移行計画**セクション追加（Phase 1-4詳細、7週間タイムライン、リスク管理、データ移行戦略）<br>- 既存SSOTとの整合性確保<br>- DATABASE_NAMING_STANDARD.md v3.0.0準拠確認<br>- API_ROUTING_GUIDELINES.md準拠確認 | AI |
| 2025-10-05 | 1.2.0 | **120点満点達成（最終完成版）**<br>- **エラーハンドリング**セクション追加（エラー分類・表示方法、エラーコード定義、hotel-saas/hotel-common双方の実装例、バリデーションエラー表示、エラーログ記録）<br>- **パフォーマンス要件**セクション追加（目標値定義、フロントエンド/バックエンド最適化戦略、パフォーマンス測定実装、バンドルサイズ最適化）<br>- **監視・ロギング**セクション追加（監査ログ定義・実装、パフォーマンスモニタリング、エラートラッキング、ダッシュボード監視項目、ログ保持ポリシー）<br>- すべての管理画面SSOTから参照される基盤仕様として完成<br>- 100点満点での120点評価達成 | AI |
| 2025-10-06 | 1.3.0 | **150点を目指す革新的改善（未来実装予定機能追加）**<br>- **未来実装予定機能**セクション追加（業界最先端を目指す革新的機能群）<br>- Phase A: 即効性の高い改善（インスタント保存、自動アクセシビリティ、自然言語検索、スマート通知）<br>- Phase B: 現場体験を劇的に改善（タブレット編集、実機プレビュー、同時編集、ビジュアルロジック、承認ワークフロー）<br>- Phase C: 差別化要素（AI自動生成、コンテンツ最適化、多言語翻訳、ヒートマップ、マーケットプレイス）<br>- Phase D: 最先端技術（パーソナライゼーションAI、音声入力、オフライン編集、タイムトラベル、ビジュアルタイムライン、ゲーミフィケーション）<br>- **優先度マトリックス**追加（実装難易度・現場インパクト・ビジネス価値の評価）<br>- **実装時の注意事項**追加（技術的制約、現場視点の検証、パフォーマンス考慮）<br>- **期待される総合効果**追加（作業効率90%削減、品質向上、ビジネス価値の定量評価） | AI |

---

**以上、SSOT: UI デザイン・レイアウト管理システム（v1.3.0）**

