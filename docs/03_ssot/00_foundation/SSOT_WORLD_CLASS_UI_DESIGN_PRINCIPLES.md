# SSOT: 世界最高峰UIデザイン原則（日本の伝統色統合）

**作成日**: 2025-10-14  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（全Phase）

**関連SSOT**:
- [STRATEGIC_VISION_GLOBAL_EXPANSION.md](./STRATEGIC_VISION_GLOBAL_EXPANSION.md) - グローバル展開戦略
- [SSOT_MULTILINGUAL_SYSTEM.md](./SSOT_MULTILINGUAL_SYSTEM.md) - 多言語化システム
- [SSOT_MULTICULTURAL_AI.md](./SSOT_MULTICULTURAL_AI.md) - 多文化おもてなしAI

**参照ドキュメント**:
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/UI_STYLE_GUIDE.md` - 既存UIガイド
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/Color.md` - カラートークン

---

## 📋 目次

1. [概要](#概要)
2. [世界最高峰UIデザイン原則](#世界最高峰uiデザイン原則)
3. [日本の伝統色パレット](#日本の伝統色パレット)
4. [コンポーネント設計](#コンポーネント設計)
5. [レスポンシブデザイン](#レスポンシブデザイン)
6. [アニメーション・トランジション](#アニメーショントランジション)
7. [実装ガイドライン](#実装ガイドライン)

---

## 📖 概要

### 目的

全システムにおいて、世界最高峰のUIデザイン原則を適用し、グローバル展開に相応しい高品質なユーザー体験を提供する。

### 基本方針

- **Netflix/Amazon型**: 商品・コンテンツ表示（ルームサービス、施設案内等）
- **OpenAI/Anthropic型**: AIコンシェルジュインターフェース
- **Google Material Design 3**: 管理画面
- **日本の伝統色**: 全システムで統一された色彩設計

### 適用範囲

| システム | 主要UIパターン | 優先度 |
|---------|--------------|-------|
| **hotel-saas（客室端末）** | Netflix型 + OpenAI型 | 🔴 最高 |
| **hotel-saas（管理画面）** | Google Material Design 3 | 🔴 最高 |
| **hotel-pms** | Google Material Design 3 | 🟡 高 |
| **hotel-member** | Google Material Design 3 | 🟡 高 |

---

## 🌟 世界最高峰UIデザイン原則

### 1. Netflix/Amazon型デザイン（商品・コンテンツ表示）

**適用箇所**: ルームサービス、施設案内、観光情報、商品カタログ

#### 特徴

```yaml
レイアウト:
  - カード型グリッドレイアウト
  - 横スクロールカルーセル（カテゴリー別）
  - 大きな画像とホバーエフェクト
  - レスポンシブグリッド（自動調整）

インタラクション:
  - ホバー時に拡大・詳細表示
  - スムーズなアニメーション
  - 画像遅延読み込み（Lazy Loading）
  - 無限スクロール対応

パーソナライゼーション:
  - "あなたにおすすめ" セクション
  - 閲覧履歴ベースの提案
  - 人気商品の自動表示
```

#### 実装例

```vue
<template>
  <!-- カルーセル形式のカテゴリー表示 -->
  <div class="category-carousel">
    <h2 class="text-2xl font-bold mb-4 text-[#165E83]">人気のルームサービス</h2>
    <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      <div
        v-for="item in items"
        :key="item.id"
        class="card min-w-[280px] bg-white rounded-xl shadow-md overflow-hidden 
               hover:scale-105 hover:shadow-xl transition-all duration-300"
      >
        <img :src="item.image" class="w-full h-40 object-cover" />
        <div class="p-4">
          <h3 class="text-lg font-semibold text-[#165E83]">{{ item.name }}</h3>
          <p class="text-[#E54848] font-bold mt-2">¥{{ item.price }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 2. OpenAI/Anthropic型デザイン（AIコンシェルジュ）

**適用箇所**: AIチャット、会話履歴、AI設定画面

#### 特徴

```yaml
レイアウト:
  - チャットインターフェース（左右分離）
  - クリーンで余白の多いデザイン
  - 会話履歴の明確な視覚的区別
  - コンテキスト表示エリア

インタラクション:
  - ストリーミング表示（リアルタイムテキスト生成）
  - タイピングインジケーター
  - メッセージ送信アニメーション
  - スムーズな自動スクロール

コンテンツ表示:
  - マークダウン対応（コード、リスト、表）
  - シンタックスハイライト
  - 画像・リンクのリッチ表示
  - コピーボタン（コードブロック）
```

#### 実装例

```vue
<template>
  <!-- AIチャットインターフェース -->
  <div class="chat-container h-screen flex flex-col bg-[#FFFFF4]">
    <!-- メッセージエリア -->
    <div class="flex-1 overflow-y-auto p-6 space-y-4">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
      >
        <div
          :class="[
            'max-w-2xl p-4 rounded-2xl',
            msg.role === 'user'
              ? 'bg-[#3A8FB7] text-white'
              : 'bg-white border border-gray-200 text-gray-800'
          ]"
        >
          <div v-html="renderMarkdown(msg.content)"></div>
        </div>
      </div>
    </div>

    <!-- 入力エリア -->
    <div class="border-t border-gray-200 p-4 bg-white">
      <div class="max-w-4xl mx-auto flex gap-4">
        <input
          v-model="input"
          @keyup.enter="sendMessage"
          class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 
                 focus:ring-[#3A8FB7] focus:border-transparent"
          placeholder="メッセージを入力..."
        />
        <button
          @click="sendMessage"
          class="px-6 py-3 bg-[#E54848] hover:bg-[#CB4042] text-white 
                 rounded-lg transition-colors"
        >
          送信
        </button>
      </div>
    </div>
  </div>
</template>
```

### 3. Google Material Design 3（管理画面）

**適用箇所**: 全管理画面（ダッシュボード、設定、データ管理）

#### 特徴

```yaml
レイアウト:
  - サイドバー + トップバー構成
  - カード型ダッシュボード
  - 階層的なナビゲーション
  - FAB（Floating Action Button）

インタラクション:
  - リップルエフェクト（クリック時）
  - スムーズな状態遷移
  - ドロワー（サイドバー開閉）
  - スナックバー（通知）

データ表示:
  - データテーブル（ソート、フィルター、ページネーション）
  - チャート・グラフ
  - ステータスチップ
  - プログレスインジケーター
```

#### 実装例

```vue
<template>
  <!-- Material Design 3 管理画面 -->
  <div class="admin-layout flex h-screen">
    <!-- サイドバー -->
    <aside class="w-64 bg-white border-r border-gray-200">
      <nav class="p-4 space-y-2">
        <a
          v-for="item in navItems"
          :key="item.path"
          :href="item.path"
          class="flex items-center gap-3 p-3 rounded-lg hover:bg-[#EBF3F7] 
                 transition-colors"
        >
          <Icon :name="item.icon" class="w-5 h-5 text-[#3A8FB7]" />
          <span class="text-gray-700">{{ item.label }}</span>
        </a>
      </nav>
    </aside>

    <!-- メインコンテンツ -->
    <main class="flex-1 overflow-y-auto bg-[#FFFFF4]">
      <!-- トップバー -->
      <header class="bg-white border-b border-gray-200 p-4">
        <h1 class="text-2xl font-bold text-[#165E83]">ダッシュボード</h1>
      </header>

      <!-- コンテンツエリア -->
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="card bg-white rounded-xl shadow-md p-6">
          <h3 class="text-lg font-semibold text-[#165E83] mb-2">今日の注文</h3>
          <p class="text-3xl font-bold text-[#E54848]">42件</p>
        </div>
      </div>
    </main>
  </div>
</template>
```

---

## 🎨 日本の伝統色パレット

### プライマリーカラー

| 色名 | 色値 | Tailwind | 用途 |
|-----|------|----------|------|
| **天色** | `#3A8FB7` | `primary-500` | プライマリーCTA、リンク、アクセント |
| **藍色** | `#165E83` | `primary-700` | 見出し、強調テキスト、ダークUI |

### アクションカラー

| 色名 | 色値 | Tailwind | 用途 |
|-----|------|----------|------|
| **緋色** | `#E54848` | `accent-500` | 重要なCTAボタン、削除アクション |
| **赤紅** | `#CB4042` | `accent-600` | ホバー時、エラー表示 |

### ステータスカラー

| 色名 | 色値 | Tailwind | 用途 |
|-----|------|----------|------|
| **常磐** | `#2E8232` | `success-500` | 成功、完了、承認 |
| **鬱金** | `#E69B3A` | `warning-500` | 警告、注意喚起 |

### ニュートラルカラー

| 色名 | 色値 | Tailwind | 用途 |
|-----|------|----------|------|
| **胡粉** | `#FFFFF4` | `neutral-50` | 背景色、ページ背景 |
| **千草** | `#EBF3F7` | `neutral-100` | カード背景、パネル |

### 追加カラー（拡張）

| 色名 | 色値 | Tailwind | 用途 |
|-----|------|----------|------|
| **桜色** | `#FEF4F4` | `rose-50` | 淡いアクセント、ホバー背景 |
| **抹茶** | `#BFD9B3` | `green-200` | サブ成功色、完了済み項目 |
| **桔梗色** | `#6A6DA9` | `indigo-500` | 情報表示、リンク |
| **山吹色** | `#E69B3A` | `amber-500` | 警告、注意 |

### カラーパレット定義

```typescript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        // プライマリー（天色・藍色系）
        primary: {
          50: '#EBF3F7',
          100: '#D6E7EF',
          200: '#ADCFDF',
          300: '#84B7CF',
          400: '#5B9FBF',
          500: '#3A8FB7', // 天色（メイン）
          600: '#2E7392',
          700: '#23576E',
          800: '#165E83', // 藍色（濃い）
          900: '#0C2A3A',
        },
        // アクセント（緋色・赤紅系）
        accent: {
          50: '#FEF2F2',
          100: '#FEE5E5',
          200: '#FDCBCB',
          300: '#FCB1B1',
          400: '#FB9797',
          500: '#E54848', // 緋色（メイン）
          600: '#CB4042', // 赤紅
          700: '#B53030',
          800: '#9F2020',
          900: '#891010',
        },
        // 成功（常磐）
        success: {
          500: '#2E8232',
        },
        // 警告（鬱金・山吹色）
        warning: {
          500: '#E69B3A',
        },
        // ニュートラル（胡粉・千草）
        neutral: {
          50: '#FFFFF4', // 胡粉
          100: '#EBF3F7', // 千草
        },
      },
    },
  },
}
```

---

## 🧩 コンポーネント設計

### ボタンコンポーネント

```vue
<!-- プライマリーボタン（天色） -->
<button class="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white 
               rounded-lg shadow-md transition-all duration-200">
  プライマリーアクション
</button>

<!-- アクセントボタン（緋色） -->
<button class="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white 
               rounded-lg shadow-md transition-all duration-200">
  重要なアクション
</button>

<!-- セカンダリーボタン -->
<button class="px-6 py-3 bg-white hover:bg-neutral-100 text-primary-700 
               border border-gray-300 rounded-lg transition-all duration-200">
  セカンダリー
</button>
```

### カードコンポーネント

```vue
<!-- Netflix型カード -->
<div class="card bg-white rounded-xl shadow-md overflow-hidden 
            hover:scale-105 hover:shadow-xl transition-all duration-300">
  <img src="..." class="w-full h-48 object-cover" />
  <div class="p-4">
    <h3 class="text-lg font-semibold text-primary-800">商品名</h3>
    <p class="text-accent-500 font-bold mt-2">¥2,000</p>
  </div>
</div>

<!-- Material Design 3型カード -->
<div class="card bg-white rounded-lg shadow-md p-6 
            hover:shadow-lg transition-shadow duration-200">
  <h3 class="text-lg font-semibold text-primary-800 mb-4">統計情報</h3>
  <p class="text-3xl font-bold text-accent-500">1,234</p>
</div>
```

---

## 📱 レスポンシブデザイン

### ブレークポイント

```typescript
const breakpoints = {
  sm: '640px',  // スマートフォン
  md: '768px',  // タブレット
  lg: '1024px', // デスクトップ
  xl: '1280px', // 大型デスクトップ
  '2xl': '1536px', // TV画面
}
```

### グリッドシステム

```vue
<!-- レスポンシブグリッド -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <!-- カードコンポーネント -->
</div>
```

---

## ✨ アニメーション・トランジション

### 標準アニメーション

```css
/* ホバーエフェクト */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

/* フェードイン */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* スライドイン */
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

---

## 📐 実装ガイドライン

### 1. Tailwind CSS設定

```bash
# 必要なパッケージ
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
```

### 2. グローバルCSS

```css
/* assets/css/global.css */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

@layer base {
  body {
    @apply bg-neutral-50 text-gray-900;
    font-family: 'Noto Sans JP', sans-serif;
  }
}
```

### 3. アイコンシステム

**必須**: Heroicons使用（`heroicons:` プレフィックス）

```vue
<Icon name="heroicons:trash" class="w-5 h-5 text-accent-500" />
<Icon name="heroicons:pencil-square" class="w-5 h-5 text-primary-500" />
```

### 4. アクセシビリティ

- **コントラスト比**: WCAG AAA準拠
- **キーボード操作**: 全インタラクティブ要素
- **ARIA属性**: 適切な使用
- **フォーカス表示**: `focus:ring-2 focus:ring-primary-500`

---

## 🎯 システム別適用ガイド

### hotel-saas（客室端末）

```yaml
TOP画面: Netflix型カルーセル + 大型カード
ルームサービス: Netflix型グリッド
AIコンシェルジュ: OpenAI型チャット
管理画面: Material Design 3
```

### hotel-saas（管理画面）

```yaml
ダッシュボード: Material Design 3 カード
データテーブル: Material Design 3 テーブル
フォーム: Material Design 3 入力コンポーネント
```

### hotel-pms / hotel-member

```yaml
全画面: Material Design 3
データ管理: テーブル + カード
フォーム: Material Design 3
```

---

## 📊 実装状況

### Phase 1: 基礎実装

| 項目 | hotel-saas | hotel-pms | hotel-member | 状態 |
|-----|-----------|-----------|--------------|------|
| カラーパレット定義 | ⏳ | ⏳ | ⏳ | 未実装 |
| Tailwind設定 | ⏳ | ⏳ | ⏳ | 未実装 |
| 基本コンポーネント | ⏳ | ⏳ | ⏳ | 未実装 |

### Phase 2: Netflix型実装

| 項目 | 状態 |
|-----|------|
| カルーセルコンポーネント | ⏳ 未実装 |
| カード型グリッド | ⏳ 未実装 |

### Phase 3: OpenAI型実装

| 項目 | 状態 |
|-----|------|
| チャットインターフェース | ⏳ 未実装 |
| マークダウン表示 | ⏳ 未実装 |

### Phase 4: Material Design 3実装

| 項目 | 状態 |
|-----|------|
| データテーブル | ⏳ 未実装 |
| ダッシュボードカード | ⏳ 未実装 |

---

**次のアクション**: Tailwind設定ファイルへのカラーパレット追加

**作成者**: Iza（統合管理者）  
**レビュー**: Sun（hotel-saas）、Luna（hotel-pms）、Suno（hotel-member）


