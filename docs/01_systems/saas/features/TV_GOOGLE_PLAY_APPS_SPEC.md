# TV画面 Google Playアプリ選択機能 技術仕様書

## 📋 概要

ホテル客室TV画面のレイアウトエディタに、Google Playアプリを選択・配置できる機能を追加。
ホテル側が事前に承認したアプリを客室TV画面に表示し、ゲストが直接アクセスできるランチャー機能を提供。

## 🎯 目的

- **ホテル体験向上**: ゲストが使い慣れたアプリに簡単アクセス
- **収益機会創出**: アプリ利用促進による付加価値提供
- **運用効率化**: 一元的なアプリ管理とカスタマイズ

## ✅ 技術的実現可能性

### **法的・ライセンス面**
- ✅ **Google Play規約準拠**: アプリランチャー機能は明示的に許可
- ✅ **業界実例あり**: Viggo Smart Hotel、Accedo等が商用提供
- ✅ **Android TV Operator Tier対応**: Google公式サポート

### **技術的制約**
- ❌ **アプリ再配布禁止**: Google Playアプリの直接配布は不可
- ✅ **ランチャー経由アクセス**: Google Play Storeへのディープリンク
- ✅ **ゲスト認証**: ゲスト自身のアカウントでログイン

## 🏗️ システム設計

### **1. 既存レイアウトエディタとの統合**

#### **AdvancedTopPageEditor.vue の拡張**
```typescript
// 新規ブロックタイプの追加
const blockTypes = [
  // 既存ブロック
  { id: 'campaign', name: 'キャンペーン', icon: 'heroicons:megaphone' },
  { id: 'concierge', name: 'AIコンシェルジュ', icon: 'heroicons:chat-bubble-left-right' },
  
  // 🆕 Google Playアプリブロック
  { 
    id: 'google-play-launcher', 
    name: 'おすすめアプリ', 
    icon: 'heroicons:device-phone-mobile',
    category: 'entertainment',
    description: 'ゲスト向けアプリランチャー'
  },
  { 
    id: 'streaming-grid', 
    name: 'ストリーミングアプリ', 
    icon: 'heroicons:play-circle',
    category: 'entertainment',
    description: 'Netflix、YouTube等の配信アプリ'
  },
  { 
    id: 'utility-apps', 
    name: 'ユーティリティ', 
    icon: 'heroicons:wrench-screwdriver',
    category: 'utility',
    description: '天気、翻訳、地図等の便利アプリ'
  }
]
```

#### **ContentBlock インターフェース拡張**
```typescript
interface GooglePlayAppBlock extends ContentBlock {
  type: 'google-play-launcher' | 'streaming-grid' | 'utility-apps'
  appConfig: {
    selectedApps: GooglePlayApp[]
    layout: 'grid' | 'list' | 'carousel'
    showAppNames: boolean
    showDescriptions: boolean
    maxAppsDisplay: number
    autoLaunch: boolean
  }
}

interface GooglePlayApp {
  id: string
  packageName: string // com.netflix.mediaclient
  displayName: string // Netflix
  icon: string // アプリアイコンURL
  category: AppCategory
  isApproved: boolean
  deepLinkUrl: string // market://details?id=com.netflix.mediaclient
  customLabel?: string // ホテル独自のラベル
  priority: number // 表示優先度
}

type AppCategory = 
  | 'streaming' 
  | 'music' 
  | 'utility' 
  | 'travel' 
  | 'news' 
  | 'games' 
  | 'lifestyle'
```

### **2. アプリ選択UI**

#### **アプリ選択モーダル**
```vue
<!-- GooglePlayAppSelector.vue -->
<template>
  <div class="app-selector-modal">
    <div class="modal-header">
      <h3>Google Playアプリを選択</h3>
      <div class="search-bar">
        <input 
          v-model="searchQuery" 
          placeholder="アプリ名で検索..."
          class="search-input"
        />
      </div>
    </div>

    <div class="modal-body">
      <!-- カテゴリタブ -->
      <div class="category-tabs">
        <button 
          v-for="category in appCategories"
          :key="category.id"
          :class="['tab', { active: activeCategory === category.id }]"
          @click="activeCategory = category.id"
        >
          <Icon :name="category.icon" />
          {{ category.name }}
        </button>
      </div>

      <!-- アプリ一覧 -->
      <div class="apps-grid">
        <div 
          v-for="app in filteredApps"
          :key="app.id"
          :class="['app-item', { selected: selectedApps.includes(app.id) }]"
          @click="toggleAppSelection(app.id)"
        >
          <img :src="app.icon" :alt="app.displayName" class="app-icon" />
          <div class="app-info">
            <h4>{{ app.displayName }}</h4>
            <p>{{ app.description }}</p>
            <span class="category-badge">{{ app.category }}</span>
          </div>
          <div class="selection-indicator">
            <Icon name="heroicons:check" v-if="selectedApps.includes(app.id)" />
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <div class="selected-count">
        {{ selectedApps.length }}個のアプリを選択中
      </div>
      <div class="actions">
        <button @click="$emit('cancel')" class="btn-secondary">
          キャンセル
        </button>
        <button @click="confirmSelection" class="btn-primary">
          選択完了
        </button>
      </div>
    </div>
  </div>
</template>
```

### **3. データベース設計**

#### **新規テーブル**
```sql
-- Google Playアプリマスター
CREATE TABLE google_play_apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  category VARCHAR(50) NOT NULL,
  deep_link_url VARCHAR(500) NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ホテル別アプリ設定
CREATE TABLE hotel_app_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id INTEGER NOT NULL,
  app_id INTEGER NOT NULL,
  custom_label VARCHAR(255),
  priority INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (place_id) REFERENCES places(id),
  FOREIGN KEY (app_id) REFERENCES google_play_apps(id)
);

-- レイアウトブロック別アプリ設定
CREATE TABLE layout_app_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  layout_id INTEGER NOT NULL,
  block_id VARCHAR(100) NOT NULL,
  app_configs JSON NOT NULL, -- selectedApps, layout, maxAppsDisplay等
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (layout_id) REFERENCES layouts(id)
);
```

### **4. API設計**

#### **アプリ管理API**
```typescript
// GET /api/v1/admin/google-play-apps
interface GetAppsResponse {
  apps: GooglePlayApp[]
  categories: AppCategory[]
  total: number
}

// POST /api/v1/admin/google-play-apps/approve
interface ApproveAppRequest {
  packageName: string
  customLabel?: string
  category?: AppCategory
}

// GET /api/v1/admin/layouts/{id}/app-blocks
interface GetLayoutAppBlocksResponse {
  blocks: LayoutAppBlock[]
}

// PUT /api/v1/admin/layouts/{id}/app-blocks/{blockId}
interface UpdateAppBlockRequest {
  selectedApps: string[] // app IDs
  layout: 'grid' | 'list' | 'carousel'
  showAppNames: boolean
  maxAppsDisplay: number
}
```

### **5. フロントエンド実装**

#### **レイアウトエディタでの統合**
```typescript
// components/admin/layouts/AdvancedTopPageEditor.vue

// アプリブロック専用の設定パネル
const showAppConfigPanel = ref(false)
const selectedAppBlock = ref<GooglePlayAppBlock | null>(null)

const openAppSelector = (block: ContentBlock) => {
  if (block.type.includes('google-play')) {
    selectedAppBlock.value = block as GooglePlayAppBlock
    showAppConfigPanel.value = true
  }
}

const updateAppBlockConfig = (config: AppBlockConfig) => {
  if (selectedAppBlock.value) {
    selectedAppBlock.value.appConfig = config
    markAsChanged()
  }
}
```

#### **TV画面での表示**
```vue
<!-- GooglePlayAppLauncher.vue -->
<template>
  <div class="app-launcher" :class="`layout-${layout}`">
    <div class="apps-container">
      <div 
        v-for="app in displayApps"
        :key="app.id"
        class="app-item"
        @click="launchApp(app)"
      >
        <div class="app-icon-container">
          <img :src="app.icon" :alt="app.displayName" class="app-icon" />
        </div>
        <div v-if="showAppNames" class="app-name">
          {{ app.customLabel || app.displayName }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const launchApp = (app: GooglePlayApp) => {
  // Android TVでのアプリ起動
  if (window.Android && window.Android.launchApp) {
    window.Android.launchApp(app.packageName)
  } else {
    // フォールバック：Google Play Storeページを開く
    window.open(app.deepLinkUrl, '_blank')
  }
}
</script>
```

## 🔧 実装手順

### **Phase 1: データベース・API基盤**
1. ✅ テーブル作成マイグレーション
2. ✅ Google Play Apps マスターデータ投入
3. ✅ API エンドポイント実装

### **Phase 2: 管理画面機能**
1. ✅ アプリ選択モーダル実装
2. ✅ レイアウトエディタ統合
3. ✅ プロパティパネル拡張

### **Phase 3: TV画面表示**
1. ✅ アプリランチャーコンポーネント
2. ✅ Android TV連携機能
3. ✅ フォールバック処理

### **Phase 4: 運用機能**
1. ✅ アプリ承認ワークフロー
2. ✅ 使用状況分析
3. ✅ セキュリティ機能

## 📱 対応アプリ例

### **ストリーミング**
- Netflix (com.netflix.mediaclient)
- YouTube (com.google.android.youtube.tv)
- Amazon Prime Video (com.amazon.avod.thirdpartyclient)
- Disney+ (com.disney.disneyplus)

### **音楽**
- Spotify (com.spotify.tv.android)
- YouTube Music (com.google.android.apps.youtube.music)
- Apple Music (com.apple.android.music)

### **ユーティリティ**
- Google翻訳 (com.google.android.apps.translate)
- 天気 (com.google.android.googlequicksearchbox)
- Google Maps (com.google.android.apps.maps)

## 🔒 セキュリティ考慮事項

### **アプリ承認プロセス**
1. **事前審査**: ホテル管理者による承認必須
2. **カテゴリ制限**: 不適切なカテゴリの除外
3. **定期見直し**: 承認アプリの定期的な再評価

### **ゲストプライバシー**
1. **アカウント分離**: ゲスト退室時の自動ログアウト
2. **データ保護**: ゲスト情報の非保存
3. **セッション管理**: 時間制限付きアクセス

## 📊 運用・分析機能

### **使用状況追跡**
```typescript
interface AppUsageAnalytics {
  appId: string
  launchCount: number
  lastUsed: Date
  averageSessionTime: number
  popularityRank: number
}
```

### **管理ダッシュボード**
- 📈 アプリ別使用統計
- 🏆 人気アプリランキング
- 📊 カテゴリ別分析
- ⚠️ 問題アプリの検出

## 🎨 UI/UXガイドライン

### **TV画面最適化**
- **タッチターゲット**: 最小88px
- **フォーカス表示**: リモコン操作対応
- **高コントラスト**: 視認性重視
- **シンプル操作**: 直感的なナビゲーション

### **ブランド統一**
- **ホテルカラー**: カスタマイズ可能
- **ロゴ配置**: ブランド認知向上
- **統一感**: 既存UI要素との調和

## 📝 更新履歴

- **2025/01/13**: 初版作成
- **技術調査完了**: Google Play規約・実現可能性確認
- **設計完了**: データベース・API・UI設計 