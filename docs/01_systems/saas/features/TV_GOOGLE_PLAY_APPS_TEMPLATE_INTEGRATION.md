# Google Playアプリ テンプレート統合指示書

## 1. 概要

本指示書は、ホテル客室内のTVシステムにおけるGoogle Playアプリ表示機能を、既存のテンプレートシステムに統合するための設計・実装指針を定義します。テンプレートが入れ替わる環境下でのアプリ表示コンポーネントの実装に焦点を当てています。

## 2. 既存テンプレートシステムの理解

### 2.1 テンプレート構造

TV画面は以下の構造で構成されています：

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ロゴエリア                                                     天気 │言語│ホーム │
├─────────────────────────────────────────────────────┬───────────────────────────────────┤
│                                                     │                                   │
│                                                     │                                   │
│               キャンペーンエリア                     │         AIコンシェルジュ           │
│                                                     │                                   │
│                                                     │                                   │
├─────────────┬─────────────┬─────────────┬─────────────┼───────────────────────────────────┤
│ルームサービス │   館内施設   │   観光案内   │  アンケート  │        WiFi接続案内              │
└─────────────┴─────────────┴─────────────┴─────────────┴───────────────────────────────────┘
```

### 2.2 テンプレート切り替え機能

- テンプレートは `layouts/tv.vue` で基本構造が定義されています
- 各エリアの内容は動的に変更可能
- アプリ表示は主にコンテンツエリア内に配置されます

## 3. アプリコンポーネント設計

### 3.1 コンポーネント構造

既存の `GooglePlayAppLauncher.vue` コンポーネントをベースに、テンプレート統合に適した拡張を行います：

```
GooglePlayAppLauncher
├── コンテキスト対応表示機能
├── 最近使用したアプリ表示
├── カテゴリ別グループ表示
└── 複数レイアウト対応（grid/list/carousel）
```

### 3.2 プロパティ定義

```typescript
interface AppLauncherProps {
  // 基本設定
  placeId: string | number;  // 場所ID
  roomId?: string;           // 部屋ID（セッションデータ用）

  // テンプレート連携
  templateArea: 'main' | 'sidebar' | 'footer';  // 配置エリア

  // 表示設定
  blockConfig: {
    layout: 'grid' | 'list' | 'carousel' | 'compact';  // レイアウトタイプ
    showAppNames: boolean;                            // アプリ名表示
    showDescriptions: boolean;                        // 説明表示
    maxAppsDisplay: number;                           // 最大表示数
    selectedApps?: Array<any>;                        // 特定アプリ指定
    categoryFilter?: string;                          // カテゴリフィルター
    contextAware?: boolean;                           // コンテキスト対応表示
    showRecentApps?: boolean;                         // 最近使用したアプリ表示
  };

  // キャッシュ設定
  useCache?: boolean;  // キャッシュ使用
}
```

## 4. テンプレート別実装指針

### 4.1 メインコンテンツエリア実装

メインコンテンツエリア（キャンペーンエリア）に配置する場合：

```vue
<template>
  <div class="tv-main-content">
    <GooglePlayAppLauncher
      :placeId="placeId"
      :roomId="roomId"
      templateArea="main"
      :blockConfig="{
        layout: 'grid',
        showAppNames: true,
        showDescriptions: false,
        maxAppsDisplay: 12,
        contextAware: true,
        showRecentApps: true
      }"
    />
  </div>
</template>
```

### 4.2 サイドバーエリア実装

サイドバーエリア（AIコンシェルジュエリア）に配置する場合：

```vue
<template>
  <div class="tv-sidebar-content">
    <GooglePlayAppLauncher
      :placeId="placeId"
      :roomId="roomId"
      templateArea="sidebar"
      :blockConfig="{
        layout: 'list',
        showAppNames: true,
        showDescriptions: false,
        maxAppsDisplay: 5,
        contextAware: true,
        showRecentApps: true
      }"
    />
  </div>
</template>
```

### 4.3 フッターエリア実装

フッターエリアに配置する場合：

```vue
<template>
  <div class="tv-footer-content">
    <GooglePlayAppLauncher
      :placeId="placeId"
      :roomId="roomId"
      templateArea="footer"
      :blockConfig="{
        layout: 'carousel',
        showAppNames: true,
        showDescriptions: false,
        maxAppsDisplay: 8,
        contextAware: false,
        showRecentApps: false
      }"
    />
  </div>
</template>
```

## 5. レスポンシブ対応

### 5.1 テンプレートエリア別スタイル

各テンプレートエリアに応じたスタイル調整：

```css
/* メインエリア用スタイル */
.template-area-main .app-launcher {
  --app-icon-size: 6rem;
  --app-font-size: 1.25rem;
  --app-grid-columns: repeat(auto-fill, minmax(150px, 1fr));
}

/* サイドバーエリア用スタイル */
.template-area-sidebar .app-launcher {
  --app-icon-size: 3rem;
  --app-font-size: 1rem;
  --app-grid-columns: 1fr;
}

/* フッターエリア用スタイル */
.template-area-footer .app-launcher {
  --app-icon-size: 3.5rem;
  --app-font-size: 0.875rem;
  --app-grid-columns: repeat(auto-fill, minmax(100px, 1fr));
}
```

### 5.2 画面サイズ別最適化

```css
/* 大画面（1920x1080px）向け最適化 */
@media (min-width: 1600px) {
  .template-area-main .app-launcher {
    --app-icon-size: 7rem;
    --app-grid-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

/* 標準画面（1366x768px）向け最適化 */
@media (max-width: 1599px) {
  .template-area-main .app-launcher {
    --app-icon-size: 5rem;
    --app-grid-columns: repeat(auto-fill, minmax(130px, 1fr));
  }
}
```

## 6. コンテキスト対応表示の統合

### 6.1 テンプレートエリア別コンテキスト表示

各テンプレートエリアに応じたコンテキスト表示の最適化：

```typescript
// コンテキスト情報の表示調整
const getContextDisplayMode = () => {
  switch (props.templateArea) {
    case 'main':
      return 'full';     // フル表示（アイコン+テキスト）
    case 'sidebar':
      return 'compact';  // コンパクト表示（アイコンのみ）
    case 'footer':
      return 'none';     // 非表示
    default:
      return 'full';
  }
}
```

### 6.2 テンプレート切り替え時の対応

テンプレート切り替え時のデータ保持とスムーズな遷移：

```typescript
// テンプレート切り替え時のデータ保持
const handleTemplateChange = () => {
  // セッションストレージにコンテキスト状態を保存
  sessionStorage.setItem('app_context_state', JSON.stringify({
    activeRules: activeContextRules.value,
    recentApps: recentApps.value,
    timestamp: Date.now()
  }));
}

// テンプレート読み込み時のデータ復元
const restoreFromTemplateChange = () => {
  const savedState = sessionStorage.getItem('app_context_state');
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      // 5分以内のデータのみ復元
      if (Date.now() - state.timestamp < 5 * 60 * 1000) {
        activeContextRules.value = state.activeRules;
        recentApps.value = state.recentApps;
      }
    } catch (e) {
      console.error('状態復元エラー:', e);
    }
  }
}
```

## 7. 実装手順

### 7.1 基本コンポーネント拡張

1. 既存の `GooglePlayAppLauncher.vue` にテンプレートエリア対応を追加
2. コンテキスト対応表示機能を統合
3. テンプレートエリア別スタイル調整を実装

### 7.2 テンプレート統合

1. 各テンプレートエリアでのアプリ表示コンポーネント呼び出しを実装
2. テンプレート切り替え時のデータ保持機能を実装
3. レスポンシブ対応を確認

### 7.3 テスト項目

1. 各テンプレートエリアでの表示確認
2. テンプレート切り替え時のデータ保持確認
3. コンテキスト対応表示の動作確認
4. 各画面サイズでのレスポンシブ対応確認

## 8. 実装例

### 8.1 拡張GooglePlayAppLauncherコンポーネント

```vue
<template>
  <div
    class="app-launcher"
    :class="[
      `layout-${layout}`,
      `template-area-${templateArea}`,
      { 'context-aware': isContextAware }
    ]"
  >
    <!-- コンテキスト情報表示 -->
    <div v-if="isContextAware && contextDisplayMode !== 'none' && activeContextRules.length > 0"
         class="context-info"
         :class="`context-display-${contextDisplayMode}`">
      <div class="context-badge" v-for="rule in activeContextRules" :key="rule.id">
        <Icon :name="getContextIcon(rule.type)" class="context-icon" />
        <span v-if="contextDisplayMode === 'full'" class="context-name">{{ rule.name }}</span>
      </div>
    </div>

    <!-- 最近使用したアプリ -->
    <div v-if="showRecentApps && recentApps.length > 0" class="app-section recent-apps">
      <h3 v-if="showSectionTitles" class="section-title">最近使用したアプリ</h3>
      <div class="apps-container recent-apps-container">
        <div
          v-for="app in recentApps"
          :key="`recent-${app.id}`"
          class="app-item"
          @click="launchApp(app)"
          tabindex="0"
          @keyup.enter="launchApp(app)"
        >
          <div class="app-icon-container">
            <img :src="app.iconUrl || '/images/app-placeholder.png'" class="app-icon" :alt="app.displayName" />
          </div>
          <div v-if="showAppNames" class="app-name">
            {{ app.customLabel || app.displayName }}
          </div>
        </div>
      </div>
    </div>

    <!-- アプリグループ -->
    <div v-for="group in visibleAppGroups" :key="group.id" class="app-section">
      <h3 v-if="showSectionTitles" class="section-title">
        {{ group.name }}
        <span v-if="isContextAware && group.contextBoost > 1.2" class="context-boost-badge">
          <Icon name="heroicons:star" class="boost-icon" />
          おすすめ
        </span>
      </h3>

      <div class="apps-container">
        <div
          v-for="app in group.apps"
          :key="app.id"
          class="app-item"
          @click="launchApp(app)"
          tabindex="0"
          @keyup.enter="launchApp(app)"
        >
          <div class="app-icon-container">
            <img :src="app.iconUrl || '/images/app-placeholder.png'" class="app-icon" :alt="app.displayName" />
          </div>
          <div v-if="showAppNames" class="app-name">
            {{ app.customLabel || app.displayName }}
          </div>
          <div v-if="showDescriptions && app.description" class="app-description">
            {{ app.description }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 8.2 テンプレート統合実装例

```vue
<!-- pages/client/tv/index.vue -->
<template>
  <div class="tv-container">
    <div class="tv-header">
      <div class="logo-area">ホテルロゴ</div>
      <div class="function-buttons">
        <button class="function-button">天気</button>
        <button class="function-button">言語</button>
        <button class="function-button">ホーム</button>
      </div>
    </div>

    <div class="tv-content">
      <div class="main-area">
        <!-- メインエリアにアプリ表示 -->
        <GooglePlayAppLauncher
          :placeId="placeId"
          :roomId="roomId"
          templateArea="main"
          :blockConfig="{
            layout: 'grid',
            showAppNames: true,
            showDescriptions: false,
            maxAppsDisplay: 12,
            contextAware: true,
            showRecentApps: true,
            showSectionTitles: true
          }"
        />
      </div>

      <div class="sidebar-area">
        <!-- サイドバーエリア（AIコンシェルジュなど） -->
      </div>
    </div>

    <div class="tv-footer">
      <div class="footer-buttons">
        <button class="footer-button">ルームサービス</button>
        <button class="footer-button">館内施設</button>
        <button class="footer-button">観光案内</button>
        <button class="footer-button">アンケート</button>
      </div>
      <div class="wifi-info">
        WiFi接続案内
      </div>
    </div>
  </div>
</template>
```

## 9. 注意事項

1. **テンプレート切り替え時のパフォーマンス**
   - アプリデータのキャッシュを活用し、テンプレート切り替え時の読み込み時間を最小化

2. **TVリモコン操作の最適化**
   - フォーカス移動が自然に行えるよう、タブインデックスを適切に設定
   - 十字キーでの操作を優先的にサポート

3. **表示の一貫性**
   - 異なるテンプレートでもアプリの見た目と操作感を一貫させる
   - アイコンサイズやフォントサイズは相対単位で指定

4. **エラー処理**
   - APIやデータ取得エラー時の適切なフォールバック表示
   - オフライン時のキャッシュデータ活用

## 10. 今後の拡張性

1. **テンプレートプリセット**
   - 複数のテンプレートプリセットを用意し、管理画面から選択可能に

2. **カスタマイズオプション**
   - ホテル管理者がアプリの表示方法をカスタマイズできる機能

3. **テーマ連動**
   - ホテルブランドカラーに合わせたテーマ設定
   - 季節やイベントに応じたテーマ切り替え
