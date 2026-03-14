# UIエディタ統一システム 実装計画書

**作成日**: 2025年1月27日  
**バージョン**: 1.0  
**ステータス**: 実装準備完了  
**優先度**: 最高（MVP完成に向けて）

---

## 🎯 実装方針

### 統一戦略
インフォメーション機能を廃止し、UIエディタ機能に完全統一することで：
- **開発効率**: 機能重複を排除し、リソースを集中
- **ユーザー体験**: 一つのツールで全てのコンテンツを管理
- **保守性**: 単一システムによる保守の簡素化
- **拡張性**: 統一されたアーキテクチャによる機能追加の容易化

### 実装アプローチ
1. **既存実装の活用**: 85%完成のレイアウト機能を基盤とする
2. **段階的移行**: インフォメーション機能の段階的統合
3. **機能拡張**: ウィジェット・テンプレートの充実
4. **プラン別差別化**: 明確な機能制限によるアップセル

---

## 📋 実装タスク

### Phase 1: 基盤統一（2週間）

#### Week 1: データモデル統一
**目標**: 全ページタイプを統一モデルで管理

##### Task 1.1: データベーススキーマ統一
```sql
-- 統一Pageモデル
CREATE TABLE unified_pages (
  id INTEGER PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'top-page', 'info-page', 'service-page', etc.
  category VARCHAR(50), -- 'campaign', 'menu', 'facility', 'tourism', 'basic'
  content JSON NOT NULL, -- ウィジェット配置データ
  settings JSON, -- ページ設定
  template_id INTEGER, -- テンプレートID
  
  -- 表示制御
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  publish_at DATETIME,
  expire_at DATETIME,
  featured BOOLEAN DEFAULT FALSE,
  
  -- 多言語対応
  language VARCHAR(10) DEFAULT 'ja',
  
  -- メタ情報
  seo JSON, -- SEO設定
  analytics JSON, -- 分析データ
  
  -- 版数管理
  version INTEGER DEFAULT 1,
  parent_id INTEGER, -- 元ページID（複製時）
  
  -- 作成・更新情報
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  
  -- 削除管理
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at DATETIME,
  
  FOREIGN KEY (template_id) REFERENCES page_templates(id),
  FOREIGN KEY (parent_id) REFERENCES unified_pages(id)
);
```

##### Task 1.2: 移行スクリプト作成
```javascript
// 既存データ移行スクリプト
const migrateToUnifiedSystem = async () => {
  // 1. Layout → unified_pages 移行
  const layouts = await prisma.layout.findMany()
  for (const layout of layouts) {
    await prisma.unifiedPage.create({
      data: {
        slug: layout.slug,
        title: layout.name,
        type: layout.category === 'top' ? 'top-page' : 'custom-page',
        category: layout.category,
        content: layout.data,
        settings: layout.settings,
        status: layout.status,
        language: 'ja',
        createdAt: layout.createdAt,
        updatedAt: layout.updatedAt,
        createdBy: layout.authorId
      }
    })
  }
  
  // 2. InfoArticle → unified_pages 移行
  const articles = await prisma.infoArticle.findMany()
  for (const article of articles) {
    await prisma.unifiedPage.create({
      data: {
        slug: article.slug,
        title: article.title,
        type: 'info-page',
        category: article.category,
        content: convertArticleToWidgets(article.content),
        status: article.status,
        publishAt: article.publishAt,
        expireAt: article.expireAt,
        featured: article.featured,
        language: article.language,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      }
    })
  }
}
```

#### Week 2: API統一
**目標**: 全ページタイプに対応する統一API

##### Task 2.1: 統一APIエンドポイント
```typescript
// server/api/v1/admin/pages/index.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { type, category, status, search, page = 1, limit = 20 } = query
  
  const where = {
    isDeleted: false,
    ...(type && { type }),
    ...(category && { category }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { title: { contains: search } },
        { slug: { contains: search } }
      ]
    })
  }
  
  const [pages, total] = await Promise.all([
    prisma.unifiedPage.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        template: true,
        _count: { select: { revisions: true } }
      }
    }),
    prisma.unifiedPage.count({ where })
  ])
  
  return {
    pages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
```

##### Task 2.2: ページ操作API
```typescript
// server/api/v1/admin/pages/[id].put.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  
  // プラン制限チェック
  const restrictions = await getPlanRestrictions(event)
  validatePageUpdate(body, restrictions)
  
  // 版数管理
  const currentPage = await prisma.unifiedPage.findUnique({
    where: { id: parseInt(id) }
  })
  
  if (currentPage) {
    // 版数履歴保存
    await prisma.pageRevision.create({
      data: {
        pageId: currentPage.id,
        version: currentPage.version,
        content: currentPage.content,
        settings: currentPage.settings,
        createdBy: body.updatedBy
      }
    })
  }
  
  // ページ更新
  const updatedPage = await prisma.unifiedPage.update({
    where: { id: parseInt(id) },
    data: {
      ...body,
      version: { increment: 1 },
      updatedAt: new Date()
    }
  })
  
  return updatedPage
})
```

### Phase 2: 管理画面統一（1週間）

#### Task 2.1: 統一管理画面
```vue
<!-- pages/admin/ui-editor/index.vue -->
<template>
  <div class="ui-editor-admin">
    <div class="admin-header">
      <h1>UIエディタ管理</h1>
      <NuxtLink to="/admin/ui-editor/create" class="btn-primary">
        <Icon name="heroicons:plus" />
        新規ページ作成
      </NuxtLink>
    </div>
    
    <!-- フィルター -->
    <div class="filters">
      <select v-model="filters.type" @change="loadPages">
        <option value="">全てのタイプ</option>
        <option value="top-page">TOPページ</option>
        <option value="info-page">情報ページ</option>
        <option value="service-page">サービスページ</option>
        <option value="custom-page">カスタムページ</option>
      </select>
      
      <select v-model="filters.category" @change="loadPages">
        <option value="">全てのカテゴリ</option>
        <option value="campaign">キャンペーン</option>
        <option value="menu">メニュー</option>
        <option value="facility">施設案内</option>
        <option value="tourism">観光案内</option>
        <option value="basic">基本情報</option>
      </select>
      
      <input
        v-model="filters.search"
        @input="debounceSearch"
        placeholder="ページを検索..."
        class="search-input"
      />
    </div>
    
    <!-- ページ一覧 -->
    <div class="pages-grid">
      <div
        v-for="page in pages"
        :key="page.id"
        class="page-card"
      >
        <div class="page-preview">
          <PagePreview :page="page" />
        </div>
        
        <div class="page-info">
          <h3>{{ page.title }}</h3>
          <div class="page-meta">
            <span class="page-type">{{ getPageTypeName(page.type) }}</span>
            <span class="page-category">{{ page.category }}</span>
            <span class="page-status" :class="page.status">
              {{ page.status }}
            </span>
          </div>
          
          <div class="page-actions">
            <NuxtLink
              :to="`/admin/ui-editor/${page.id}/edit`"
              class="btn-edit"
            >
              <Icon name="heroicons:pencil-square" />
              編集
            </NuxtLink>
            
            <button
              @click="duplicatePage(page)"
              class="btn-duplicate"
            >
              <Icon name="heroicons:document-duplicate" />
              複製
            </button>
            
            <button
              @click="deletePage(page)"
              class="btn-delete"
            >
              <Icon name="heroicons:trash" />
              削除
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ページネーション -->
    <Pagination
      v-model:page="currentPage"
      :total="totalPages"
      @change="loadPages"
    />
  </div>
</template>

<script setup>
const { pages, totalPages, currentPage, filters, loadPages, duplicatePage, deletePage } = usePageManager()
const { debounce } = useUtils()

const debounceSearch = debounce(() => {
  loadPages()
}, 300)

onMounted(() => {
  loadPages()
})
</script>
```

#### Task 2.2: ページ作成画面
```vue
<!-- pages/admin/ui-editor/create.vue -->
<template>
  <div class="page-creator">
    <div class="creator-header">
      <h1>新規ページ作成</h1>
    </div>
    
    <!-- ページタイプ選択 -->
    <div class="creation-steps">
      <div class="step" :class="{ active: step === 1 }">
        <h2>1. ページタイプを選択</h2>
        <div class="page-types">
          <div
            v-for="type in pageTypes"
            :key="type.id"
            :class="['page-type-card', { selected: selectedType === type.id }]"
            @click="selectedType = type.id"
          >
            <Icon :name="type.icon" class="type-icon" />
            <h3>{{ type.name }}</h3>
            <p>{{ type.description }}</p>
          </div>
        </div>
      </div>
      
      <div class="step" :class="{ active: step === 2 }">
        <h2>2. テンプレートを選択</h2>
        <div class="templates">
          <div
            class="template-card blank"
            :class="{ selected: selectedTemplate === null }"
            @click="selectedTemplate = null"
          >
            <div class="template-preview blank-preview">
              <Icon name="heroicons:document-plus" />
            </div>
            <h3>空白から作成</h3>
            <p>何もない状態から自由に作成</p>
          </div>
          
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            :class="['template-card', { selected: selectedTemplate === template.id }]"
            @click="selectedTemplate = template.id"
          >
            <div class="template-preview">
              <img :src="template.thumbnail" :alt="template.name" />
            </div>
            <h3>{{ template.name }}</h3>
            <p>{{ template.description }}</p>
          </div>
        </div>
      </div>
      
      <div class="step" :class="{ active: step === 3 }">
        <h2>3. 基本情報を入力</h2>
        <form @submit.prevent="createPage">
          <div class="form-group">
            <label>ページタイトル</label>
            <input
              v-model="pageData.title"
              type="text"
              required
              placeholder="ページタイトルを入力"
            />
          </div>
          
          <div class="form-group">
            <label>スラッグ</label>
            <input
              v-model="pageData.slug"
              type="text"
              required
              placeholder="page-slug"
            />
          </div>
          
          <div class="form-group" v-if="selectedType === 'info-page'">
            <label>カテゴリ</label>
            <select v-model="pageData.category">
              <option value="campaign">キャンペーン</option>
              <option value="menu">メニュー</option>
              <option value="facility">施設案内</option>
              <option value="tourism">観光案内</option>
              <option value="basic">基本情報</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>説明</label>
            <textarea
              v-model="pageData.description"
              placeholder="ページの説明を入力"
            />
          </div>
          
          <div class="form-actions">
            <button type="button" @click="step--" class="btn-secondary">
              戻る
            </button>
            <button type="submit" class="btn-primary">
              作成してエディタを開く
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
const { pageTypes, templates, createPage } = usePageCreator()
const step = ref(1)
const selectedType = ref(null)
const selectedTemplate = ref(null)
const pageData = ref({
  title: '',
  slug: '',
  category: '',
  description: ''
})

const filteredTemplates = computed(() => {
  return templates.value.filter(t => t.type === selectedType.value)
})

watch(selectedType, () => {
  step.value = 2
  selectedTemplate.value = null
})

watch(selectedTemplate, () => {
  if (selectedTemplate.value !== null) {
    step.value = 3
  }
})
</script>
```

### Phase 3: ウィジェット拡張（2週間）

#### Task 3.1: 情報表示専用ウィジェット
```typescript
// 情報ページ向けウィジェット
const infoPageWidgets = {
  // キャンペーン表示ウィジェット
  'campaign-banner': {
    name: 'キャンペーンバナー',
    category: 'info',
    icon: 'heroicons:megaphone',
    properties: {
      title: { type: 'text', default: 'キャンペーンタイトル' },
      subtitle: { type: 'text', default: 'サブタイトル' },
      image: { type: 'image', default: null },
      discount: { type: 'text', default: '30% OFF' },
      period: { type: 'daterange', default: null },
      cta: { type: 'text', default: '詳細を見る' },
      link: { type: 'url', default: '' }
    }
  },
  
  // メニュー表示ウィジェット
  'menu-showcase': {
    name: 'メニューショーケース',
    category: 'info',
    icon: 'heroicons:clipboard-document-list',
    properties: {
      items: { type: 'array', default: [] },
      layout: { type: 'select', options: ['grid', 'list'], default: 'grid' },
      columns: { type: 'number', default: 3 },
      showPrice: { type: 'boolean', default: true },
      showDescription: { type: 'boolean', default: true }
    }
  },
  
  // 施設案内ウィジェット
  'facility-guide': {
    name: '施設案内',
    category: 'info',
    icon: 'heroicons:building-office',
    properties: {
      facilities: { type: 'array', default: [] },
      layout: { type: 'select', options: ['cards', 'timeline'], default: 'cards' },
      showHours: { type: 'boolean', default: true },
      showContact: { type: 'boolean', default: true }
    }
  },
  
  // 観光案内ウィジェット
  'tourism-guide': {
    name: '観光案内',
    category: 'info',
    icon: 'heroicons:map-pin',
    properties: {
      spots: { type: 'array', default: [] },
      showMap: { type: 'boolean', default: true },
      showDistance: { type: 'boolean', default: true },
      showRating: { type: 'boolean', default: true }
    }
  }
}
```

#### Task 3.2: ウィジェット実装
```vue
<!-- components/widgets/CampaignBanner.vue -->
<template>
  <div class="campaign-banner" :style="bannerStyles">
    <div class="banner-content">
      <div class="banner-text">
        <h2 class="banner-title">{{ properties.title }}</h2>
        <p class="banner-subtitle">{{ properties.subtitle }}</p>
        <div class="banner-discount">{{ properties.discount }}</div>
        <div class="banner-period" v-if="properties.period">
          {{ formatPeriod(properties.period) }}
        </div>
      </div>
      
      <div class="banner-image" v-if="properties.image">
        <img :src="properties.image" :alt="properties.title" />
      </div>
    </div>
    
    <div class="banner-actions">
      <button
        v-if="properties.cta"
        @click="handleCTA"
        class="cta-button"
      >
        {{ properties.cta }}
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  properties: {
    type: Object,
    required: true
  }
})

const bannerStyles = computed(() => ({
  background: `linear-gradient(135deg, ${props.properties.primaryColor || '#3B82F6'}, ${props.properties.secondaryColor || '#1E40AF'})`,
  color: props.properties.textColor || '#FFFFFF'
}))

const formatPeriod = (period) => {
  if (!period.start || !period.end) return ''
  return `${period.start} ～ ${period.end}`
}

const handleCTA = () => {
  if (props.properties.link) {
    window.open(props.properties.link, '_blank')
  }
}
</script>
```

### Phase 4: プラン制限システム（1週間）

#### Task 4.1: 制限ミドルウェア
```typescript
// composables/usePlanRestrictions.ts
export const usePlanRestrictions = () => {
  const { user } = useAuth()
  
  const planLimits = computed(() => {
    const plan = user.value?.subscription?.plan || 'economy'
    
    const limits = {
      economy: {
        maxPages: 10,
        maxWidgetsPerPage: 15,
        allowedWidgets: ['text', 'image', 'button', 'container', 'spacer'],
        customHTML: false,
        animations: false,
        templates: 'basic',
        languages: ['ja', 'en']
      },
      professional: {
        maxPages: 50,
        maxWidgetsPerPage: 30,
        allowedWidgets: 'all-standard',
        customHTML: 'limited',
        animations: 'basic',
        templates: 'professional',
        languages: ['ja', 'en', 'ko', 'zh', 'th']
      },
      enterprise: {
        maxPages: 'unlimited',
        maxWidgetsPerPage: 'unlimited',
        allowedWidgets: 'all',
        customHTML: true,
        animations: 'advanced',
        templates: 'enterprise',
        languages: 'all'
      }
    }
    
    return limits[plan]
  })
  
  const canCreatePage = computed(() => {
    const currentPageCount = user.value?.pageCount || 0
    return planLimits.value.maxPages === 'unlimited' || 
           currentPageCount < planLimits.value.maxPages
  })
  
  const canAddWidget = (currentWidgetCount) => {
    return planLimits.value.maxWidgetsPerPage === 'unlimited' || 
           currentWidgetCount < planLimits.value.maxWidgetsPerPage
  }
  
  const canUseWidget = (widgetType) => {
    if (planLimits.value.allowedWidgets === 'all') return true
    if (planLimits.value.allowedWidgets === 'all-standard') {
      return !['custom-html', 'advanced-chart', 'custom-widget'].includes(widgetType)
    }
    return planLimits.value.allowedWidgets.includes(widgetType)
  }
  
  const showUpgradePrompt = (feature) => {
    // アップグレード誘導UI表示
    const modal = useModal()
    modal.show('upgrade-prompt', {
      feature,
      currentPlan: user.value?.subscription?.plan,
      requiredPlan: getRequiredPlan(feature)
    })
  }
  
  return {
    planLimits,
    canCreatePage,
    canAddWidget,
    canUseWidget,
    showUpgradePrompt
  }
}
```

#### Task 4.2: 制限UI実装
```vue
<!-- components/admin/PlanRestrictionGuard.vue -->
<template>
  <div class="plan-restriction-guard">
    <div v-if="!canAccess" class="restriction-overlay">
      <div class="restriction-content">
        <Icon name="heroicons:lock-closed" class="restriction-icon" />
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        
        <div class="restriction-actions">
          <button
            @click="showUpgradeModal"
            class="btn-upgrade"
          >
            {{ currentPlan }}からアップグレード
          </button>
          
          <button
            @click="$emit('close')"
            class="btn-cancel"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
    
    <slot v-else />
  </div>
</template>

<script setup>
const props = defineProps({
  feature: String,
  title: String,
  message: String
})

const { canAccess, currentPlan, showUpgradeModal } = usePlanRestrictions()
</script>
```

---

## 📊 実装スケジュール

### 週次スケジュール
```
Week 1: データモデル統一
├── Mon-Tue: スキーマ設計・実装
├── Wed-Thu: 移行スクリプト作成・テスト
└── Fri: データ移行実行・検証

Week 2: API統一
├── Mon-Tue: 統一APIエンドポイント実装
├── Wed-Thu: ページ操作API実装
└── Fri: API統合テスト

Week 3: 管理画面統一
├── Mon-Tue: 統一管理画面実装
├── Wed-Thu: ページ作成画面実装
└── Fri: UI/UX調整・テスト

Week 4: ウィジェット拡張（前半）
├── Mon-Tue: 情報表示ウィジェット設計
├── Wed-Thu: キャンペーン・メニューウィジェット実装
└── Fri: 施設案内・観光案内ウィジェット実装

Week 5: ウィジェット拡張（後半）
├── Mon-Tue: ウィジェット統合・テスト
├── Wed-Thu: プロパティパネル拡張
└── Fri: ウィジェット最適化

Week 6: プラン制限システム
├── Mon-Tue: 制限ミドルウェア実装
├── Wed-Thu: 制限UI実装
└── Fri: 統合テスト・デバッグ
```

### マイルストーン
- **Week 2 End**: データ・API統一完了
- **Week 3 End**: 管理画面統一完了
- **Week 5 End**: ウィジェット拡張完了
- **Week 6 End**: プラン制限システム完了

---

## 🔍 品質保証

### テスト戦略
```typescript
// テスト項目
const testSuite = {
  // 単体テスト
  unit: {
    'widget-functionality': 'ウィジェット機能テスト',
    'api-endpoints': 'API エンドポイントテスト',
    'plan-restrictions': 'プラン制限テスト',
    'data-migration': 'データ移行テスト'
  },
  
  // 統合テスト
  integration: {
    'editor-workflow': 'エディタワークフローテスト',
    'page-creation': 'ページ作成フローテスト',
    'template-system': 'テンプレートシステムテスト',
    'multi-language': '多言語対応テスト'
  },
  
  // E2Eテスト
  e2e: {
    'complete-workflow': '完全ワークフローテスト',
    'user-scenarios': 'ユーザーシナリオテスト',
    'performance': 'パフォーマンステスト',
    'accessibility': 'アクセシビリティテスト'
  }
}
```

### パフォーマンス目標
- **エディタ起動時間**: < 2秒
- **ページ保存時間**: < 1秒
- **ウィジェット追加時間**: < 500ms
- **プレビュー更新時間**: < 300ms

---

## 🚀 リリース計画

### 段階的リリース
```
Phase 1 (Week 6): 内部テスト版
├── 基本機能の動作確認
├── 既存データの移行確認
└── パフォーマンステスト

Phase 2 (Week 7): ベータ版
├── 限定ユーザーでのテスト
├── フィードバック収集
└── 問題修正

Phase 3 (Week 8): 本番リリース
├── 全ユーザーへの展開
├── 監視・サポート体制
└── 継続的改善
```

### リリース後の改善
- **ユーザーフィードバック**: 使いやすさの改善
- **パフォーマンス最適化**: 応答時間の短縮
- **機能拡張**: 新ウィジェットの追加
- **バグ修正**: 発見された問題の修正

---

## 📈 成功指標

### 技術指標
- **移行成功率**: 100%（データ損失なし）
- **システム稼働率**: 99.9%以上
- **エラー率**: 0.1%以下
- **レスポンス時間**: 目標値以内

### ユーザー指標
- **エディタ使用率**: 月間80%以上
- **ページ作成数**: 移行前比150%
- **ユーザー満足度**: 4.5/5.0以上
- **サポート問い合わせ**: 移行前比50%削減

### ビジネス指標
- **アップグレード率**: 20%向上
- **新規登録数**: 30%向上
- **解約率**: 10%削減
- **収益**: 25%向上

---

## 🎯 まとめ

UIエディタ統一システムの実装により、hotel-saasプロジェクトは以下を実現します：

1. **開発効率の向上**: 機能重複の排除とリソース集中
2. **ユーザー体験の向上**: 統一されたインターフェースと直感的な操作
3. **ビジネス価値の向上**: 明確なプラン別価値提供とアップセル促進
4. **競争優位性の確立**: 業界最高水準のUIエディタ機能

この実装計画に従って、6週間で統一システムを完成させ、hotel-saasの核心機能として確立します。 