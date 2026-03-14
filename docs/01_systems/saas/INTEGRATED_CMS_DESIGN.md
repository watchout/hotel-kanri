# 統合CMS設計仕様書

## 概要
インフォメーション機能とキャンペーン機能を統合し、ノーコードエディタに機能ブロックを組み込んだ統合CMS

## 設計方針

### 1. 統合データモデル
```typescript
interface ContentItem {
  id: string
  type: 'info' | 'campaign' | 'event' | 'facility' | 'tourism'
  title: string
  content: string
  category: string
  slug: string
  
  // 表示制御
  startAt?: Date
  endAt?: Date
  featured: boolean
  published: boolean
  
  // ノーコードエディタ用
  blocks: EditorBlock[]
  
  // キャンペーン固有
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  targetProducts?: string[]
  
  // 機能ブロック設定
  enabledFeatures: string[]
  
  // メタデータ
  viewCount: number
  tags: string[]
  authorId: string
  createdAt: Date
  updatedAt: Date
}
```

### 2. 機能ブロック定義

#### A. 館内施設案内ブロック
```typescript
interface FacilityBlock {
  type: 'facility-guide'
  props: {
    displayMode: 'list' | 'grid' | 'card'
    facilityTypes: string[] // ['restaurant', 'spa', 'gym', 'pool']
    showImages: boolean
    showHours: boolean
    showDescription: boolean
    maxItems: number
    sortBy: 'name' | 'floor' | 'category'
  }
}
```

#### B. 周辺観光案内ブロック
```typescript
interface TourismBlock {
  type: 'tourism-guide'
  props: {
    displayMode: 'list' | 'map' | 'card'
    categories: string[] // ['restaurant', 'sightseeing', 'shopping']
    radius: number // km
    showDistance: boolean
    showRating: boolean
    showImages: boolean
    maxItems: number
  }
}
```

#### C. メニュー連携ブロック
```typescript
interface MenuBlock {
  type: 'menu-showcase'
  props: {
    categoryIds: number[]
    displayMode: 'grid' | 'list' | 'featured'
    showPrices: boolean
    showImages: boolean
    enableOrder: boolean
    maxItems: number
  }
}
```

#### D. キャンペーンブロック
```typescript
interface CampaignBlock {
  type: 'campaign-banner'
  props: {
    campaignId: string
    displayMode: 'banner' | 'card' | 'popup'
    showCountdown: boolean
    showDiscount: boolean
    ctaText: string
    ctaAction: 'order' | 'info' | 'external'
  }
}
```

### 3. ノーコードエディタ拡張

#### A. 新しいブロックパレット
```typescript
const functionalBlocks = [
  {
    type: 'facility-guide',
    name: '館内施設案内',
    description: '登録された館内施設を表示',
    icon: 'heroicons:building-office-2',
    category: 'functional',
    defaultProps: {
      displayMode: 'grid',
      facilityTypes: ['restaurant', 'spa'],
      showImages: true,
      showHours: true,
      maxItems: 6
    }
  },
  {
    type: 'tourism-guide',
    name: '周辺観光案内',
    description: '周辺の観光スポットを表示',
    icon: 'heroicons:map-pin',
    category: 'functional',
    defaultProps: {
      displayMode: 'card',
      categories: ['restaurant', 'sightseeing'],
      radius: 5,
      showDistance: true,
      maxItems: 8
    }
  },
  {
    type: 'menu-showcase',
    name: 'メニュー紹介',
    description: 'メニューアイテムを表示',
    icon: 'heroicons:book-open',
    category: 'functional',
    defaultProps: {
      displayMode: 'grid',
      showPrices: true,
      showImages: true,
      enableOrder: true,
      maxItems: 12
    }
  },
  {
    type: 'campaign-banner',
    name: 'キャンペーン',
    description: 'キャンペーン情報を表示',
    icon: 'heroicons:megaphone',
    category: 'functional',
    defaultProps: {
      displayMode: 'banner',
      showCountdown: true,
      showDiscount: true,
      ctaText: '今すぐ注文',
      ctaAction: 'order'
    }
  }
]
```

#### B. プロパティパネル拡張
```typescript
const facilityBlockProperties = [
  {
    key: 'displayMode',
    label: '表示形式',
    type: 'select',
    options: [
      { value: 'list', label: 'リスト表示' },
      { value: 'grid', label: 'グリッド表示' },
      { value: 'card', label: 'カード表示' }
    ]
  },
  {
    key: 'facilityTypes',
    label: '施設タイプ',
    type: 'multi-select',
    options: [
      { value: 'restaurant', label: 'レストラン' },
      { value: 'spa', label: 'スパ・温泉' },
      { value: 'gym', label: 'ジム' },
      { value: 'pool', label: 'プール' },
      { value: 'lounge', label: 'ラウンジ' }
    ]
  },
  {
    key: 'showImages',
    label: '画像表示',
    type: 'checkbox'
  },
  {
    key: 'showHours',
    label: '営業時間表示',
    type: 'checkbox'
  },
  {
    key: 'maxItems',
    label: '最大表示数',
    type: 'number',
    min: 1,
    max: 20
  }
]
```

### 4. データ管理統合

#### A. 統一管理画面
```
/admin/content/
├── articles/          # 記事管理
├── campaigns/         # キャンペーン管理
├── facilities/        # 館内施設管理
├── tourism/          # 周辺案内管理
└── templates/        # テンプレート管理
```

#### B. API統合
```typescript
// 統合コンテンツAPI
GET /api/v1/admin/content/items
POST /api/v1/admin/content/items
PUT /api/v1/admin/content/items/:id
DELETE /api/v1/admin/content/items/:id

// 機能ブロック用データAPI
GET /api/v1/content/facilities
GET /api/v1/content/tourism
GET /api/v1/content/menu/:categoryId
GET /api/v1/content/campaigns/active
```

### 5. 実装フェーズ

#### Phase 1: 基盤統合（1週間）
- [ ] 統合データモデル実装
- [ ] 既存インフォメーション機能の統合
- [ ] 基本的な機能ブロック実装

#### Phase 2: 機能ブロック実装（1週間）
- [ ] 館内施設案内ブロック
- [ ] 周辺観光案内ブロック
- [ ] メニュー連携ブロック
- [ ] キャンペーンブロック

#### Phase 3: UI/UX改善（1週間）
- [ ] プロパティパネル拡張
- [ ] プレビュー機能強化
- [ ] 管理画面統合

## 利点

### 管理者側
- 統一されたUI/UXで学習コストを削減
- ドラッグ&ドロップで直感的なページ作成
- 機能ブロックで高度な機能を簡単に追加

### 開発側
- コードの重複を排除
- 保守性の向上
- 機能追加が容易

### 運用側
- 一元的なコンテンツ管理
- 効率的な更新作業
- 一貫性のあるデザイン

## 技術仕様

### データベース設計
```sql
-- 統合コンテンツテーブル
CREATE TABLE content_items (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT,
  blocks JSON NOT NULL,
  category VARCHAR(100),
  featured BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT FALSE,
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  enabled_features JSON,
  view_count INTEGER DEFAULT 0,
  tags JSON,
  author_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 機能ブロック設定テーブル
CREATE TABLE functional_blocks (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES content_items(id),
  block_type VARCHAR(50) NOT NULL,
  block_order INTEGER NOT NULL,
  props JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Vue.js コンポーネント構成
```
components/
├── editor/
│   ├── blocks/
│   │   ├── FacilityGuideBlock.vue
│   │   ├── TourismGuideBlock.vue
│   │   ├── MenuShowcaseBlock.vue
│   │   └── CampaignBannerBlock.vue
│   └── properties/
│       ├── FacilityBlockProperties.vue
│       ├── TourismBlockProperties.vue
│       ├── MenuBlockProperties.vue
│       └── CampaignBlockProperties.vue
└── content/
    ├── FacilityGuide.vue
    ├── TourismGuide.vue
    ├── MenuShowcase.vue
    └── CampaignBanner.vue
```

この設計により、統一されたCMSでありながら、機能性の高いページ作成が可能になります。 