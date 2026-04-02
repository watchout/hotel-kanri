---
title: ドラッグアンドドロップレイアウト編集機能 技術仕様書
version: 1.0
date: 2025-01-27
author: Development Team
status: Draft
---

# ドラッグアンドドロップレイアウト編集機能 技術仕様書

## 📋 概要

ホテル管理システムのTOPページとインフォメーションページのレイアウトを、管理画面でドラッグアンドドロップ操作により直感的に編集できる機能の技術仕様を定義します。

## 🎯 機能要件

### 基本機能
- **ドラッグアンドドロップ**: 要素の並び替え、移動
- **リアルタイムプレビュー**: 編集結果の即座反映
- **要素管理**: 追加、削除、複製、編集
- **レスポンシブ対応**: デバイス別レイアウト編集
- **保存・復元**: JSON形式でのレイアウト管理
- **テンプレート**: プリセットレイアウトの提供

### 対象ページ
- TOPページ (`/`)
- インフォメーション一覧ページ (`/info`)
- インフォメーション詳細ページ (`/info/[slug]`)
- カスタムページ（将来拡張）

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
// API技術スタック
const backendStack = {
  runtime: 'Nitro (Nuxt3)',
  database: 'SQLite + Prisma ORM',
  validation: 'Zod schema validation',
  storage: 'Local file system',
  security: 'JWT + RBAC'
};
```

## 📊 データ構造設計

### 1. LayoutElement Interface
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

### 2. PageLayout Interface
```typescript
interface PageLayout {
  // 基本情報
  id: string;                          // UUID
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

## 🎨 コンポーネント設計

### 1. DraggableEditor.vue (メインコンポーネント)
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

### 2. EditorCanvas.vue (ドラッグアンドドロップキャンバス)
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

### 3. ElementWrapper.vue (要素ラッパー)
```vue
<template>
  <div
    class="element-wrapper"
    :class="wrapperClasses"
    :style="elementStyles"
    @click="handleSelect"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 選択インジケーター -->
    <div v-if="selected && mode === 'edit'" class="selection-indicator">
      <div class="selection-border"></div>
      <div class="selection-handles">
        <div class="handle handle-nw"></div>
        <div class="handle handle-ne"></div>
        <div class="handle handle-sw"></div>
        <div class="handle handle-se"></div>
      </div>
      <div class="selection-toolbar">
        <el-button size="small" @click="$emit('delete')">
          <Icon name="delete" />
        </el-button>
        <el-button size="small" @click="handleDuplicate">
          <Icon name="copy" />
        </el-button>
      </div>
    </div>

    <!-- 要素コンテンツ -->
    <component
      :is="elementComponent"
      :element="element"
      :mode="mode"
      @update="$emit('update', $event)"
    />

    <!-- ホバーインジケーター -->
    <div v-if="hovered && !selected && mode === 'edit'" class="hover-indicator">
      <span class="element-label">{{ element.metadata.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// 要素ラッパーロジック実装予定
</script>
```

## 🔧 API設計

### 1. レイアウト管理API
```typescript
// GET /api/v1/admin/layouts
interface GetLayoutsRequest {
  pageType?: PageType;
  status?: LayoutStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

interface GetLayoutsResponse {
  layouts: PageLayout[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasNext: boolean;
  };
}

// POST /api/v1/admin/layouts
interface CreateLayoutRequest {
  pageType: PageType;
  title: string;
  description?: string;
  templateId?: string;
}

interface CreateLayoutResponse {
  layout: PageLayout;
}

// GET /api/v1/admin/layouts/[id]
interface GetLayoutResponse {
  layout: PageLayout;
  history?: LayoutHistory[];
}

// PUT /api/v1/admin/layouts/[id]
interface UpdateLayoutRequest {
  layout: Partial<PageLayout>;
  comment?: string;
}

interface UpdateLayoutResponse {
  layout: PageLayout;
  version: number;
}

// POST /api/v1/admin/layouts/[id]/publish
interface PublishLayoutRequest {
  publishAt?: Date;
  comment?: string;
}

interface PublishLayoutResponse {
  layout: PageLayout;
  publishedAt: Date;
}
```

### 2. プレビューAPI
```typescript
// POST /api/v1/admin/layouts/[id]/preview
interface GeneratePreviewRequest {
  layout: PageLayout;
  device: 'mobile' | 'tablet' | 'desktop';
}

interface GeneratePreviewResponse {
  previewUrl: string;
  previewToken: string;
  expiresAt: Date;
}

// GET /api/v1/preview/[token]
// プレビュー専用URL（認証不要）
```

### 3. テンプレートAPI
```typescript
// GET /api/v1/admin/layouts/templates
interface GetTemplatesResponse {
  templates: LayoutTemplate[];
  categories: string[];
}

interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  layout: PageLayout;
}

// POST /api/v1/admin/layouts/[id]/save-as-template
interface SaveAsTemplateRequest {
  name: string;
  description: string;
  category: string;
}
```

## 💾 データベース設計

### Prisma Schema拡張
```prisma
// レイアウト管理テーブル
model PageLayout {
  id          String   @id @default(uuid())
  slug        String   @unique
  pageType    String   // 'top' | 'info-list' | 'info-detail' | 'custom'
  title       String
  description String?
  version     Int      @default(1)
  status      String   @default("draft") // 'draft' | 'review' | 'approved' | 'published' | 'archived'
  isTemplate  Boolean  @default(false)
  
  // JSON データ
  elements      Json     // LayoutElement[]
  globalStyles  Json     // GlobalStyles
  seo          Json?    // SEOSettings
  permissions  Json?    // PermissionSettings
  translations Json?    // TranslationData
  
  // メタデータ
  tags         String?
  category     String?
  
  // タイムスタンプ
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  publishedAt  DateTime?
  
  // 作成者・更新者
  createdBy    String
  updatedBy    String
  
  // リレーション
  history      LayoutHistory[]
  
  @@index([pageType])
  @@index([status])
  @@index([createdBy])
  @@index([publishedAt])
}

// レイアウト履歴テーブル
model LayoutHistory {
  id        String   @id @default(uuid())
  layoutId  String
  version   Int
  action    String   // 'create' | 'update' | 'publish' | 'archive'
  comment   String?
  
  // 変更データ
  data      Json     // PageLayout のスナップショット
  diff      Json?    // 差分データ
  
  // メタデータ
  createdAt DateTime @default(now())
  createdBy String
  
  // リレーション
  layout    PageLayout @relation(fields: [layoutId], references: [id])
  
  @@index([layoutId, version])
  @@index([createdAt])
}

// レイアウトテンプレートテーブル
model LayoutTemplate {
  id          String   @id @default(uuid())
  name        String
  description String?
  category    String
  thumbnail   String?
  isPublic    Boolean  @default(false)
  
  // テンプレートデータ
  layout      Json     // PageLayout data
  
  // 使用統計
  useCount    Int      @default(0)
  
  // メタデータ
  tags        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  
  @@index([category])
  @@index([isPublic])
  @@index([useCount])
}

// プレビュートークンテーブル
model PreviewToken {
  id        String   @id @default(uuid())
  token     String   @unique
  layoutId  String
  device    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  createdBy String
  
  @@index([token])
  @@index([expiresAt])
}
```

## 🎨 UI/UXデザイン

### エディタレイアウト
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

## 🧪 テスト戦略

### 1. 単体テスト (Vitest)
```typescript
// DraggableEditor.test.ts
describe('DraggableEditor', () => {
  test('要素の並び替えができる', async () => {
    // テストケース実装
  });

  test('要素の追加ができる', async () => {
    // テストケース実装
  });

  test('要素の削除ができる', async () => {
    // テストケース実装
  });

  test('スタイルの変更が反映される', async () => {
    // テストケース実装
  });
});

// API tests
describe('Layout API', () => {
  test('レイアウトの作成ができる', async () => {
    // APIテスト実装
  });

  test('レイアウトの更新ができる', async () => {
    // APIテスト実装
  });
});
```

### 2. E2Eテスト (Playwright)
```typescript
// layout-editor.e2e.ts
test('レイアウトエディタの基本操作', async ({ page }) => {
  // 1. エディタページにアクセス
  await page.goto('/admin/layouts/editor/new');
  
  // 2. 要素を追加
  await page.click('[data-testid="add-text-element"]');
  
  // 3. 要素をドラッグ&ドロップで移動
  await page.dragAndDrop(
    '[data-testid="element-0"]',
    '[data-testid="drop-zone-1"]'
  );
  
  // 4. プレビューを確認
  await page.click('[data-testid="preview-button"]');
  
  // 5. 保存
  await page.click('[data-testid="save-button"]');
  
  // 6. 保存確認
  await expect(page.locator('.success-message')).toBeVisible();
});
```

## 🚀 実装スケジュール

### フェーズ1: 基盤構築 (1週間)
- [ ] **Day 1-2**: ライブラリ導入・環境設定
  - vue.draggable.next インストール
  - Element Plus セットアップ
  - TypeScript型定義作成
  
- [ ] **Day 3-4**: 基本コンポーネント作成
  - DraggableEditor.vue 骨組み
  - EditorCanvas.vue 基本機能
  - ElementWrapper.vue 実装
  
- [ ] **Day 5-7**: ドラッグアンドドロップ実装
  - 基本D&D機能
  - 要素の並び替え
  - 要素の追加・削除

### フェーズ2: 機能拡張 (1週間)
- [ ] **Day 1-2**: プロパティ編集
  - PropertyPanel.vue 実装
  - スタイル編集機能
  - リアルタイム反映
  
- [ ] **Day 3-4**: プレビュー機能
  - PreviewPanel.vue 実装
  - デバイス別プレビュー
  - レスポンシブ表示
  
- [ ] **Day 5-7**: 保存・読み込み
  - API統合
  - データベース保存
  - 履歴管理

### フェーズ3: 高度機能 (1週間)
- [ ] **Day 1-2**: テンプレート機能
  - プリセットテンプレート
  - カスタムテンプレート保存
  - テンプレート適用
  
- [ ] **Day 3-4**: アニメーション
  - 要素アニメーション設定
  - プレビューでの確認
  - パフォーマンス最適化
  
- [ ] **Day 5-7**: 管理画面統合
  - 既存管理画面への統合
  - 権限管理連携
  - UI/UX調整

## 🔒 セキュリティ考慮事項

### 入力値検証
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

### HTMLサニタイゼーション
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

### 権限制御
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

## 📈 パフォーマンス最適化

### フロントエンド最適化
```typescript
// 遅延読み込み
const DraggableEditor = defineAsyncComponent(() => 
  import('~/components/admin/layouts/D