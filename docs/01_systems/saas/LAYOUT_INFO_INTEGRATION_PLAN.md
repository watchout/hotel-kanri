# レイアウト機能とインフォメーション機能 統合開発方針

## 📋 概要

ユーザーが提供した客室UIのTOPレイアウトデザインを基に、現在実装済みのレイアウト機能とインフォメーション機能を統合し、**ウィジェットベースの自由度の高いカスタマイズ可能な**統一されたコンテンツ管理システムとして発展させる開発方針を定義します。

## 🎯 統合の目的

### 1. ウィジェットベースシステムの実現
- **ドラッグ&ドロップ**: 要素の自由な配置・入れ替え
- **リサイズ機能**: 要素のサイズを自由に変更
- **グリッドシステム**: 柔軟なレイアウト構築
- **モジュール化**: 機能ごとの独立したウィジェット

### 2. 高度なカスタマイズ機能
- **レスポンシブ対応**: デバイス別のレイアウト調整
- **テーマシステム**: 色・フォント・スタイルの統一管理
- **条件付き表示**: 時間・言語・ユーザー属性に応じた動的表示
- **インタラクション**: ホバー・クリック・アニメーション効果

### 3. 機能統合による効率化
- **レイアウト機能**: ドラッグ&ドロップによる視覚的編集
- **インフォメーション機能**: ホテル情報のコンテンツ管理
- **統合効果**: 一元化されたコンテンツ作成・管理システム

### 4. 客室UIの統一
- TOPページレイアウトの一元管理
- インフォメーション表示の柔軟なデザイン対応
- AIコンシェルジュとの連携強化

### 5. 運用効率の向上
- 一つのツールでレイアウトとコンテンツを管理
- 非技術者でも直感的に操作可能
- リアルタイムプレビューによる即座の確認

## 🧩 ウィジェットシステム設計

### ウィジェットの基本概念

#### 1. ウィジェットタイプ
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

#### 2. 標準ウィジェットライブラリ

**レイアウトウィジェット**
- `grid-container`: グリッドコンテナ
- `flex-container`: フレックスコンテナ  
- `spacer`: スペーサー
- `divider`: 区切り線

**コンテンツウィジェット**
- `text-block`: テキストブロック
- `image-gallery`: 画像ギャラリー
- `video-player`: 動画プレーヤー
- `html-embed`: HTMLエンベッド

**インタラクティブウィジェット**
- `button-group`: ボタングループ
- `navigation-menu`: ナビゲーションメニュー
- `search-box`: 検索ボックス
- `contact-form`: お問い合わせフォーム

**データウィジェット**
- `article-list`: 記事一覧
- `weather-info`: 天気情報
- `clock-widget`: 時計ウィジェット
- `calendar-widget`: カレンダーウィジェット

**ホテル専用ウィジェット**
- `room-service-menu`: ルームサービスメニュー
- `facility-guide`: 館内施設案内
- `concierge-chat`: AIコンシェルジュチャット
- `wifi-guide`: WiFi接続案内
- `checkout-info`: チェックアウト情報

### グリッドシステム設計

#### 1. レスポンシブグリッド
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

#### 2. ウィジェット配置システム
```typescript
interface WidgetPlacement {
  id: string
  widgetType: string
  
  // 位置情報（各ブレークポイント別）
  position: {
    xs: { x: number, y: number, w: number, h: number }
    sm: { x: number, y: number, w: number, h: number }
    md: { x: number, y: number, w: number, h: number }
    lg: { x: number, y: number, w: number, h: number }
    xl: { x: number, y: number, w: number, h: number }
  }
  
  // 表示制御
  visibility: {
    xs: boolean
    sm: boolean
    md: boolean
    lg: boolean
    xl: boolean
  }
  
  // Z-index
  zIndex: number
  
  // アニメーション
  animation?: {
    type: 'fade' | 'slide' | 'scale' | 'bounce'
    duration: number
    delay: number
    easing: string
  }
}
```

#### 3. ウィジェット設定システム
```typescript
interface WidgetProperty {
  name: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'url' | 'array'
  label: string
  description?: string
  required?: boolean
  default?: any
  
  // 条件付き表示
  condition?: {
    property: string
    operator: '==' | '!=' | '>' | '<' | 'includes'
    value: any
  }
  
  // バリデーション
  validation?: {
    min?: number
    max?: number
    pattern?: string
    options?: Array<{ value: any, label: string }>
  }
}

interface WidgetCondition {
  type: 'time' | 'language' | 'device' | 'user' | 'custom'
  operator: '==' | '!=' | 'in' | 'between' | 'gt' | 'lt'
  value: any
  action: 'show' | 'hide' | 'animate'
}
```

## 🏗️ 現在の実装状況分析

### ✅ レイアウト機能（85%完成）

#### 実装済み機能
- ドラッグ&ドロップエディタ（DraggableEditor）
- 8種類の要素タイプ（テキスト、画像、ボタン等）
- プロパティ編集パネル
- レイヤー管理
- 基本的なレスポンシブ対応
- データベース設計（Layout、LayoutRevision、LayoutAsset）
- API エンドポイント（CRUD操作）

#### 技術的特徴
- Vue 3 Composition API
- Prisma ORM
- TypeScript
- 高度なスタイリング機能

### ✅ インフォメーション機能（65%完成）

#### 実装済み機能
- 記事一覧・詳細表示（/info）
- カテゴリ別管理（5種類）
- 多言語対応（日本語・英語）
- 表示期間設定
- 基本的なCMS機能

#### 実装予定機能
- 管理画面での記事作成・編集
- AIコンシェルジュとの連携
- 翻訳機能の強化

## 🎨 提供されたTOPレイアウトデザイン分析

### デザイン構成要素
1. **ロゴエリア**: ホテルブランディング
2. **キャンペーンエリア**: 大きな中央スペース
3. **AIコンシェルジュ**: 右サイドエリア
4. **機能ボタンエリア**: 下部5つのボタン
   - ルームサービス
   - 館内施設
   - 観光案内
   - アンケート
   - WiFi接続案内
5. **ナビゲーション**: 上部（天気、言語、ホーム）

### レイアウト特徴
- **グリッドベース**: 整然とした配置
- **レスポンシブ**: タブレット横型最適化
- **視覚的階層**: 重要度に応じたサイズ配分
- **アクセシビリティ**: タッチ操作に最適化

## 🔄 統合開発方針

### Phase 1: 基盤統合（2週間）

#### 1.1 データモデル統合
```prisma
// 統合後のデータモデル
model ContentLayout {
  id          Int      @id @default(autoincrement())
  slug        String   @unique
  type        String   // 'top-page', 'info-article', 'campaign', 'custom'
  category    String?  // インフォメーション用カテゴリ
  title       String
  description String?
  
  // レイアウト情報
  elements    Json     // レイアウト要素データ
  styles      Json     // グローバルスタイル
  
  // インフォメーション情報
  content     String?  @db.Text
  excerpt     String?
  
  // 表示制御
  status      String   @default("draft") // draft, published, archived
  publishAt   DateTime?
  expireAt    DateTime?
  featured    Boolean  @default(false)
  
  // 多言語対応
  language    String   @default("ja")
  translations ContentLayoutTranslation[]
  
  // メタ情報
  seo         Json?    // SEO設定
  permissions Json?    // 権限設定
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  updatedBy   String
  
  @@map("content_layouts")
}

model ContentLayoutTranslation {
  id          Int           @id @default(autoincrement())
  layoutId    Int
  language    String
  title       String
  description String?
  content     String?       @db.Text
  excerpt     String?
  
  layout      ContentLayout @relation(fields: [layoutId], references: [id], onDelete: Cascade)
  
  @@unique([layoutId, language])
  @@map("content_layout_translations")
}
```

#### 1.2 API統合設計
```typescript
// 統合API エンドポイント
GET    /api/v1/content-layouts              // 一覧取得
GET    /api/v1/content-layouts/:id          // 詳細取得
POST   /api/v1/content-layouts              // 作成
PUT    /api/v1/content-layouts/:id          // 更新
DELETE /api/v1/content-layouts/:id          // 削除
POST   /api/v1/content-layouts/:id/duplicate // 複製
POST   /api/v1/content-layouts/:id/publish  // 公開
POST   /api/v1/content-layouts/:id/translate // 翻訳

// 客室UI用エンドポイント
GET    /api/v1/guest/top-page               // TOPページ取得
GET    /api/v1/guest/info/:category         // カテゴリ別情報取得
GET    /api/v1/guest/info/article/:slug     // 記事詳細取得
```

### Phase 2: ウィジェットシステム開発（4週間）

#### 2.1 ウィジェットエンジン開発（1.5週間）
```typescript
// ウィジェットレジストリ
class WidgetRegistry {
  private widgets = new Map<string, WidgetDefinition>()
  
  register(widget: WidgetDefinition) {
    this.widgets.set(widget.type, widget)
  }
  
  get(type: string): WidgetDefinition | undefined {
    return this.widgets.get(type)
  }
  
  getByCategory(category: string): WidgetDefinition[] {
    return Array.from(this.widgets.values())
      .filter(w => w.category === category)
  }
}

// ウィジェットレンダラー
class WidgetRenderer {
  render(placement: WidgetPlacement, config: Record<string, any>) {
    const widget = this.registry.get(placement.widgetType)
    if (!widget) return null
    
    return h(widget.component, {
      ...config,
      style: this.generateStyles(placement),
      class: this.generateClasses(placement)
    })
  }
  
  private generateStyles(placement: WidgetPlacement) {
    // レスポンシブスタイルの生成
    // グリッド位置の計算
    // アニメーション設定
  }
}
```

#### 2.2 ドラッグ&ドロップエディタ拡張（1.5週間）
```vue
<template>
  <div class="widget-editor">
    <!-- ウィジェットパレット -->
    <WidgetPalette 
      :widgets="availableWidgets"
      @drag-start="handleDragStart"
    />
    
    <!-- エディタキャンバス -->
    <div class="editor-canvas">
      <GridOverlay 
        :grid="currentGrid"
        :show="showGrid"
      />
      
      <DraggableWidget
        v-for="widget in canvasWidgets"
        :key="widget.id"
        :widget="widget"
        :grid="currentGrid"
        @resize="handleResize"
        @move="handleMove"
        @select="handleSelect"
        @delete="handleDelete"
      />
      
      <DropZone
        @drop="handleDrop"
        @drag-over="handleDragOver"
      />
    </div>
    
    <!-- プロパティパネル -->
    <WidgetPropertyPanel
      :widget="selectedWidget"
      @update="handlePropertyUpdate"
    />
    
    <!-- レスポンシブ制御 -->
    <ResponsiveControls
      :current-breakpoint="currentBreakpoint"
      @change="handleBreakpointChange"
    />
  </div>
</template>

<script setup lang="ts">
import { useWidgetEditor } from '~/composables/useWidgetEditor'

const {
  availableWidgets,
  canvasWidgets,
  selectedWidget,
  currentGrid,
  currentBreakpoint,
  showGrid,
  handleDragStart,
  handleDrop,
  handleResize,
  handleMove,
  handleSelect,
  handleDelete,
  handlePropertyUpdate,
  handleBreakpointChange
} = useWidgetEditor()
</script>
```

#### 2.3 レスポンシブ機能実装（1週間）
- ブレークポイント別レイアウト管理
- デバイスプレビュー機能
- 自動レイアウト調整
- タッチ操作最適化

#### 2.4 ウィジェットライブラリ開発（1週間）
```typescript
// 標準ウィジェットの実装
export const StandardWidgets: WidgetDefinition[] = [
  {
    type: 'hotel-logo',
    name: 'ホテルロゴ',
    category: 'content',
    resizable: true,
    movable: true,
    properties: [
      { name: 'logo', type: 'image', label: 'ロゴ画像' },
      { name: 'altText', type: 'text', label: '代替テキスト' },
      { name: 'link', type: 'url', label: 'リンクURL' }
    ]
  },
  
  {
    type: 'service-buttons',
    name: 'サービスボタン',
    category: 'interactive',
    resizable: true,
    movable: true,
    properties: [
      { name: 'buttons', type: 'array', label: 'ボタン一覧' },
      { name: 'layout', type: 'select', label: 'レイアウト', options: ['grid', 'list'] },
      { name: 'columns', type: 'number', label: '列数' }
    ]
  },
  
  {
    type: 'campaign-banner',
    name: 'キャンペーンバナー',
    category: 'content',
    resizable: true,
    movable: true,
    properties: [
      { name: 'title', type: 'text', label: 'タイトル' },
      { name: 'subtitle', type: 'text', label: 'サブタイトル' },
      { name: 'image', type: 'image', label: 'バナー画像' },
      { name: 'link', type: 'url', label: 'リンクURL' }
    ]
  }
  
  // ... その他のウィジェット定義
]
```

### Phase 3: 統合管理画面開発（2週間）

#### 3.1 統合管理画面設計
```
/admin/content-management/
├── layouts/           # レイアウト管理
├── articles/          # 記事管理
├── campaigns/         # キャンペーン管理
├── templates/         # テンプレート管理
└── settings/          # 設定管理
```

#### 3.2 ワークフロー機能
- 下書き → レビュー → 承認 → 公開
- 権限別アクセス制御
- 変更履歴管理

#### 3.3 プレビュー機能
- デバイス別プレビュー
- 多言語プレビュー
- 公開前確認

### Phase 4: AIコンシェルジュ連携（1週間）

#### 4.1 知識ベース統合
- インフォメーション記事をAI知識ベースに自動追加
- カテゴリ別の情報提供
- リアルタイム情報更新

#### 4.2 コンテンツ推奨機能
- ユーザーの質問に応じた関連記事提示
- 季節・時期に応じたコンテンツ表示
- パーソナライズされた情報提供

## 🛠️ 技術実装計画

### 1. マイグレーション戦略
```typescript
// 既存データの統合マイグレーション
export async function migrateToIntegratedSystem() {
  // 1. 既存レイアウトデータの移行
  const layouts = await prisma.layout.findMany()
  for (const layout of layouts) {
    await prisma.contentLayout.create({
      data: {
        type: 'custom',
        title: layout.title,
        elements: layout.content,
        styles: layout.styles,
        // ... その他のフィールド
      }
    })
  }
  
  // 2. 既存インフォメーション記事の移行
  const articles = await prisma.infoArticle.findMany()
  for (const article of articles) {
    await prisma.contentLayout.create({
      data: {
        type: 'info-article',
        category: article.category,
        title: article.title,
        content: article.content,
        // ... その他のフィールド
      }
    })
  }
}
```

### 2. エディタ統合
```vue
<template>
  <div class="integrated-editor">
    <!-- 統合エディタインターフェース -->
    <EditorToolbar />
    <div class="editor-workspace">
      <ElementPalette :elements="integratedElements" />
      <EditorCanvas :content="currentContent" />
      <PropertyPanel :selected="selectedElement" />
    </div>
    <EditorPreview :content="currentContent" />
  </div>
</template>

<script setup lang="ts">
import { useIntegratedEditor } from '~/composables/useIntegratedEditor'

const {
  currentContent,
  selectedElement,
  integratedElements
} = useIntegratedEditor()
</script>
```

### 3. 統合API設計
```typescript
// composables/useIntegratedContentApi.ts
export function useIntegratedContentApi() {
  const createContent = async (data: ContentLayoutCreate) => {
    return await $fetch('/api/v1/content-layouts', {
      method: 'POST',
      body: data
    })
  }
  
  const updateContent = async (id: string, data: ContentLayoutUpdate) => {
    return await $fetch(`/api/v1/content-layouts/${id}`, {
      method: 'PUT',
      body: data
    })
  }
  
  const publishContent = async (id: string) => {
    return await $fetch(`/api/v1/content-layouts/${id}/publish`, {
      method: 'POST'
    })
  }
  
  return {
    createContent,
    updateContent,
    publishContent
  }
}
```

## 🎯 客室UI実装

### 1. TOPページコンポーネント
```vue
<template>
  <div class="guest-top-page" :style="pageStyles">
    <component
      v-for="element in pageElements"
      :key="element.id"
      :is="getElementComponent(element.type)"
      :config="element"
      :style="getElementStyles(element)"
    />
  </div>
</template>

<script setup lang="ts">
import { useGuestTopPage } from '~/composables/useGuestTopPage'

const { pageElements, pageStyles } = await useGuestTopPage()
</script>
```

### 2. 動的コンテンツ表示
```typescript
// composables/useGuestTopPage.ts
export async function useGuestTopPage() {
  const { data: topPageData } = await $fetch('/api/v1/guest/top-page')
  
  const pageElements = computed(() => {
    return topPageData.elements.map(element => ({
      ...element,
      // 動的コンテンツの解決
      content: resolveElementContent(element)
    }))
  })
  
  return {
    pageElements,
    pageStyles: topPageData.styles
  }
}
```

## 📊 開発スケジュール

| Phase | 期間 | 主な成果物 | 担当 |
|-------|------|------------|------|
| **Phase 1** | 2週間 | データモデル統合、基本API | BE |
| **Phase 2** | 4週間 | ウィジェットシステム開発 | FE |
| **Phase 3** | 2週間 | 統合管理画面、ワークフロー | FE/BE |
| **Phase 4** | 1週間 | AIコンシェルジュ連携 | BE |
| **テスト・調整** | 1週間 | 統合テスト、UI/UX調整 | 全体 |

**合計開発期間**: 10週間

## 🎯 成功指標

### 機能指標
- [ ] **ウィジェットベースシステム**: 20種類以上のウィジェット提供
- [ ] **自由度の高いカスタマイズ**: ドラッグ&ドロップ・リサイズ・配置変更
- [ ] **レスポンシブ対応**: 5つのブレークポイントでの最適表示
- [ ] **TOPページの完全な動的生成**: テンプレートからのカスタマイズ
- [ ] **インフォメーション記事の視覚的編集**: ウィジェットベース編集
- [ ] **多言語コンテンツの一元管理**: 統合CMS
- [ ] **AIコンシェルジュとの情報連携**: 知識ベース統合

### 性能指標
- [ ] **ページ読み込み時間** < 2秒
- [ ] **エディタ操作レスポンス** < 300ms（ウィジェット操作）
- [ ] **リアルタイムプレビュー** < 500ms
- [ ] **同時編集ユーザー数** 10名以上
- [ ] **ウィジェット描画性能** 60fps維持

### ユーザビリティ指標
- [ ] **非技術者の操作成功率** > 95%（ウィジェットシステム）
- [ ] **編集作業時間の短縮** 60%短縮
- [ ] **コンテンツ更新頻度の向上** 3倍向上
- [ ] **学習時間** < 30分（基本操作習得）

### カスタマイズ指標
- [ ] **レイアウトパターン数** 無制限（ウィジェット組み合わせ）
- [ ] **デザインバリエーション** ホテルごとの完全カスタマイズ
- [ ] **機能拡張性** プラグイン形式でのウィジェット追加

## ⚠️ リスク管理

### 技術的リスク
1. **データ移行**: 既存データの整合性確保
2. **パフォーマンス**: 複雑なレイアウトでの描画性能
3. **ブラウザ互換性**: 各種ブラウザでの動作確認

### 運用リスク
1. **学習コスト**: 新システムへの移行コスト
2. **データ損失**: 移行時のデータ保護
3. **ダウンタイム**: システム更新時の影響

### 対策
- 段階的な移行計画
- 十分なテスト期間の確保
- バックアップ・復旧計画の策定
- ユーザートレーニングの実施

## 📝 まとめ

この統合開発方針により、レイアウト機能とインフォメーション機能を統一し、より効率的で使いやすいコンテンツ管理システムを構築します。提供されたTOPレイアウトデザインを基に、ホテル運営に最適化された統合システムの実現を目指します。
