# UIコンポーネントライブラリ展開ガイド

**作成日**: 2025-10-14  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0  
**対象システム**: hotel-pms, hotel-member  
**参照SSOT**: [SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md](./SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md)

---

## 📋 目次

1. [概要](#概要)
2. [hotel-pmsへの展開手順](#hotel-pmsへの展開手順)
3. [hotel-memberへの展開手順](#hotel-memberへの展開手順)
4. [共通設定](#共通設定)
5. [トラブルシューティング](#トラブルシューティング)

---

## 📖 概要

### 目的

hotel-saasで作成した基本コンポーネントライブラリを、hotel-pmsとhotel-memberでも使用できるようにします。

### 前提条件

✅ **既に完了している設定**:
- Tailwind CSS設定（カラーパレット定義済み）
- CSS変数定義（hotel-saasのみ）
- 基本コンポーネント3つ（hotel-saas/components/Ui/）

### 展開するコンポーネント

1. **UiButton** - 統一ボタン
2. **UiCard** - Netflix型・Material Design型カード
3. **UiInput** - 入力フィールド

---

## 🏨 hotel-pmsへの展開手順

### Step 1: コンポーネントファイルをコピー

```bash
# hotel-pmsのcomponentsディレクトリにUiフォルダを作成
mkdir -p /Users/kaneko/hotel-pms/src/components/Ui

# hotel-saasから3つのコンポーネントをコピー
cp /Users/kaneko/hotel-saas/components/Ui/UiButton.vue /Users/kaneko/hotel-pms/src/components/Ui/
cp /Users/kaneko/hotel-saas/components/Ui/UiCard.vue /Users/kaneko/hotel-pms/src/components/Ui/
cp /Users/kaneko/hotel-saas/components/Ui/UiInput.vue /Users/kaneko/hotel-pms/src/components/Ui/

# READMEもコピー
cp /Users/kaneko/hotel-saas/components/Ui/README.md /Users/kaneko/hotel-pms/src/components/Ui/
```

### Step 2: CSS変数を追加（必要な場合）

hotel-pmsにグローバルCSSファイルを作成：

```bash
# CSSディレクトリ作成
mkdir -p /Users/kaneko/hotel-pms/src/assets/css
```

`/Users/kaneko/hotel-pms/src/assets/css/variables.css`:

```css
/**
 * 世界最高峰UIデザイン原則 - 日本の伝統色パレット
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md
 */

:root {
  /* プライマリーカラー（天色・藍色系） */
  --color-primary: #3A8FB7;
  --color-primary-hover: #2E7392;
  --color-primary-dark: #165E83;
  --color-primary-light: #EBF3F7;
  
  /* アクセントカラー（緋色・赤紅系） */
  --color-accent: #E54848;
  --color-accent-hover: #CB4042;
  --color-accent-dark: #B53030;
  
  /* ステータスカラー */
  --color-success: #2E8232;
  --color-warning: #E69B3A;
  --color-error: #E54848;
  
  /* ニュートラルカラー */
  --color-neutral-bg: #FFFFF4;
  --color-trust-bg: #EBF3F7;
  
  /* シャドウ */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.3);
  
  /* トランジション */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}
```

### Step 3: main.tsでCSSをインポート

`/Users/kaneko/hotel-pms/src/main.ts`:

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Tailwind CSS
import './assets/css/tailwind.css' // 既存
import './assets/css/variables.css' // 追加

const app = createApp(App)
app.use(router)
app.mount('#app')
```

### Step 4: 動作確認用デモページ作成（オプション）

`/Users/kaneko/hotel-pms/src/views/DemoComponents.vue`:

```vue
<template>
  <div class="p-8 bg-neutral-50 min-h-screen">
    <h1 class="text-3xl font-bold text-primary-800 mb-8">
      UIコンポーネントデモ（hotel-pms）
    </h1>

    <!-- UiButton -->
    <section class="bg-white rounded-xl shadow-card p-6 mb-8">
      <h2 class="text-xl font-bold mb-4">UiButton</h2>
      <div class="flex gap-4">
        <UiButton variant="primary">Primary</UiButton>
        <UiButton variant="accent">Accent</UiButton>
        <UiButton variant="secondary">Secondary</UiButton>
      </div>
    </section>

    <!-- UiCard -->
    <section class="bg-white rounded-xl shadow-card p-6 mb-8">
      <h2 class="text-xl font-bold mb-4">UiCard</h2>
      <div class="grid grid-cols-3 gap-4">
        <UiCard type="material" title="予約数">
          <p class="text-4xl font-bold text-primary-500">24</p>
        </UiCard>
        <UiCard type="material" title="チェックイン">
          <p class="text-4xl font-bold text-accent-500">8</p>
        </UiCard>
        <UiCard type="material" title="空室">
          <p class="text-4xl font-bold text-success-500">12</p>
        </UiCard>
      </div>
    </section>

    <!-- UiInput -->
    <section class="bg-white rounded-xl shadow-card p-6">
      <h2 class="text-xl font-bold mb-4">UiInput</h2>
      <div class="max-w-md space-y-4">
        <UiInput
          v-model="testInput"
          label="顧客名"
          placeholder="山田太郎"
          icon-left="heroicons:user"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiCard from '@/components/Ui/UiCard.vue'
import UiInput from '@/components/Ui/UiInput.vue'

const testInput = ref('')
</script>
```

---

## 👥 hotel-memberへの展開手順

### Step 1: コンポーネントファイルをコピー

```bash
# hotel-memberのcomponentsディレクトリにUiフォルダを作成
mkdir -p /Users/kaneko/hotel-member/src/components/Ui

# hotel-saasから3つのコンポーネントをコピー
cp /Users/kaneko/hotel-saas/components/Ui/UiButton.vue /Users/kaneko/hotel-member/src/components/Ui/
cp /Users/kaneko/hotel-saas/components/Ui/UiCard.vue /Users/kaneko/hotel-member/src/components/Ui/
cp /Users/kaneko/hotel-saas/components/Ui/UiInput.vue /Users/kaneko/hotel-member/src/components/Ui/

# READMEもコピー
cp /Users/kaneko/hotel-saas/components/Ui/README.md /Users/kaneko/hotel-member/src/components/Ui/
```

### Step 2: CSS変数を追加

hotel-saasと同様の手順でCSS変数ファイルを作成します。

### Step 3: 動作確認

hotel-pmsと同様の手順でデモページを作成して動作確認します。

---

## 🔧 共通設定

### Tailwind設定確認

すべてのシステムで以下が設定済みであることを確認：

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { /* 天色パレット */ },
        accent: { /* 緋色パレット */ },
        success: { /* 常磐 */ },
        warning: { /* 鬱金 */ },
        neutral: { /* 胡粉・千草 */ },
      }
    }
  }
}
```

### アイコンライブラリ

すべてのコンポーネントは **Heroicons** を使用しています。

**Nuxt 3の場合**（hotel-saas）:
```bash
npm install @nuxt/icon
```

**Vue 3の場合**（hotel-pms, hotel-member）:
```bash
npm install @iconify/vue
```

---

## 🎯 使用例

### hotel-pms（予約管理画面）

```vue
<template>
  <div class="admin-layout">
    <!-- サイドバー -->
    <aside class="sidebar">
      <nav>
        <UiButton 
          variant="ghost" 
          icon-left="heroicons:home"
          full-width
        >
          ダッシュボード
        </UiButton>
      </nav>
    </aside>

    <!-- メインコンテンツ -->
    <main>
      <div class="grid grid-cols-3 gap-6">
        <UiCard type="material" title="今日の予約">
          <p class="text-4xl font-bold text-primary-500">24</p>
        </UiCard>
      </div>

      <!-- 検索フォーム -->
      <div class="mt-8">
        <UiInput
          v-model="searchQuery"
          placeholder="予約番号で検索..."
          icon-left="heroicons:magnifying-glass"
          :clearable="true"
        />
      </div>
    </main>
  </div>
</template>
```

### hotel-member（会員登録フォーム）

```vue
<template>
  <div class="registration-form">
    <UiCard type="material" title="会員登録">
      <form @submit.prevent="register" class="space-y-6">
        <UiInput
          v-model="form.name"
          label="氏名"
          :required="true"
          :error="errors.name"
        />

        <UiInput
          v-model="form.email"
          type="email"
          label="メールアドレス"
          icon-left="heroicons:envelope"
          :required="true"
          :error="errors.email"
        />

        <UiInput
          v-model="form.password"
          type="password"
          label="パスワード"
          :required="true"
          :error="errors.password"
        />

        <UiButton type="submit" full-width :loading="isSubmitting">
          登録
        </UiButton>
      </form>
    </UiCard>
  </div>
</template>
```

---

## 🐛 トラブルシューティング

### 1. コンポーネントが認識されない

**原因**: Vue 3の自動インポートが設定されていない

**解決方法**:
```vue
<script setup>
// 手動インポート
import UiButton from '@/components/Ui/UiButton.vue'
</script>
```

### 2. アイコンが表示されない

**原因**: アイコンライブラリがインストールされていない

**解決方法**:
```bash
# Nuxt 3の場合
npm install @nuxt/icon

# Vue 3の場合
npm install @iconify/vue
```

### 3. カラーが正しく表示されない

**原因**: Tailwind設定が正しく読み込まれていない

**確認事項**:
- `tailwind.config.js`にカラーパレットが定義されているか
- Tailwind CSSが正しくインポートされているか

### 4. CSS変数が効かない

**原因**: グローバルCSSファイルがインポートされていない

**解決方法**:
```typescript
// main.ts
import './assets/css/variables.css'
```

---

## 📊 展開チェックリスト

### hotel-pms

- [ ] Tailwind設定確認（✅ 完了）
- [ ] コンポーネントファイルコピー
- [ ] CSS変数ファイル作成
- [ ] main.tsでインポート
- [ ] デモページで動作確認

### hotel-member

- [ ] Tailwind設定確認（✅ 完了）
- [ ] コンポーネントファイルコピー
- [ ] CSS変数ファイル作成
- [ ] 動作確認

---

## 📚 参考資料

### SSOT

- [SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md](./SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md) - デザイン原則
- [UI_DESIGN_IMPLEMENTATION_GUIDE.md](./UI_DESIGN_IMPLEMENTATION_GUIDE.md) - 実装ガイド

### 実装済みファイル

**hotel-saas**:
- `/Users/kaneko/hotel-saas/components/Ui/UiButton.vue`
- `/Users/kaneko/hotel-saas/components/Ui/UiCard.vue`
- `/Users/kaneko/hotel-saas/components/Ui/UiInput.vue`
- `/Users/kaneko/hotel-saas/components/Ui/README.md`
- `/Users/kaneko/hotel-saas/pages/demo/ui-components.vue`

**Tailwind設定**:
- `/Users/kaneko/hotel-saas/tailwind.config.js` ✅
- `/Users/kaneko/hotel-pms/tailwind.config.js` ✅
- `/Users/kaneko/hotel-member/tailwind.config.js` ✅

---

## 🎯 次回開発時の手順

### 1. Luna（hotel-pms担当）が開発を開始する時

```bash
# 1. このガイドを確認
cat /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/UI_COMPONENTS_DEPLOYMENT_GUIDE.md

# 2. コンポーネントをコピー
mkdir -p /Users/kaneko/hotel-pms/src/components/Ui
cp /Users/kaneko/hotel-saas/components/Ui/*.vue /Users/kaneko/hotel-pms/src/components/Ui/

# 3. 動作確認
# デモページを作成して確認
```

### 2. Suno（hotel-member担当）が開発を開始する時

```bash
# 1. このガイドを確認
cat /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/UI_COMPONENTS_DEPLOYMENT_GUIDE.md

# 2. コンポーネントをコピー
mkdir -p /Users/kaneko/hotel-member/src/components/Ui
cp /Users/kaneko/hotel-saas/components/Ui/*.vue /Users/kaneko/hotel-member/src/components/Ui/

# 3. 動作確認
# デモページを作成して確認
```

---

## ✅ 完了確認

すべてのシステムで以下が使用可能になります：

```vue
<UiButton variant="primary">ボタン</UiButton>
<UiCard type="material" title="カード">内容</UiCard>
<UiInput v-model="value" label="入力" />
```

---

**作成者**: Iza（統合管理者）  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0


