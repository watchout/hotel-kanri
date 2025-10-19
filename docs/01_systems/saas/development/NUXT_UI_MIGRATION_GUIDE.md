# Nuxt UI 移行ガイド

**作成日**: 2025年7月15日
**ステータス**: 承認済み
**優先度**: 中

## 📋 概要

このドキュメントは、hotel-saasプロジェクトにおけるNuxt UIフレームワークの段階的導入に関するガイドラインを提供します。既存の独自UIコンポーネントを維持しながら、新規機能開発においてNuxt UIを活用する方針について説明します。

## 🎯 導入方針

### 1. 段階的アプローチ

- **新規機能開発のみ**: 新しく開発する機能やページについてのみNuxt UIを使用
- **既存コンポーネントの維持**: 既存のカスタムコンポーネントは当面そのまま使用
- **自然な更新サイクル**: 既存コンポーネントの大規模な修正が必要になったタイミングで置き換えを検討

### 2. ハイブリッドモード

- **共存を許容**: Nuxt UIコンポーネントとカスタムコンポーネントの混在を許容
- **デザイントークンの統一**: 視覚的一貫性を維持するためのデザイントークン設定
- **段階的統合**: 時間をかけて徐々に統一感のあるUIに移行

## 🛠️ 技術的実装

### インストールと設定

```bash
# Nuxt UIのインストール
npm install @nuxt/ui

# 必要に応じて追加パッケージ
npm install @nuxtjs/color-mode
```

### nuxt.config.tsの設定

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/color-mode', // オプション: ダークモード対応の場合
  ],

  // 既存の設定は維持
  devtools: { enabled: true },
  css: ["~/assets/css/tailwind.css", "~/assets/css/billing-fix.css", "~/assets/css/webview.css"],
  // ...その他の設定
})
```

### app.config.tsの作成

```typescript
// app.config.ts
export default defineAppConfig({
  ui: {
    // 日本の伝統色パレットをNuxt UIに適用
    colors: {
      primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#3A8FB7', // 天色
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
      },
      // 他のカラー設定も同様に
    },
    // コンポーネント固有のカスタマイズ
    button: {
      default: {
        color: 'primary',
        variant: 'solid',
        size: 'md',
      }
    },
    // 他のコンポーネント設定
  }
})
```

## 🔄 コンポーネント移行優先順位

| コンポーネント | 移行優先度 | 備考 |
|------------|--------|-----|
| Button     | 高     | 基本UIコンポーネントとして最初に置き換え |
| Input      | 高     | フォーム要素として優先的に置き換え |
| Modal      | 中     | 複雑な実装があるため段階的に移行 |
| Card       | 中     | 基本的なカードUIから置き換え |
| Table      | 中     | データ表示用コンポーネントとして重要 |
| ウィジェット系 | 低     | 既存の実装を維持、長期的に検討 |

## ⚠️ 注意事項

1. **ウィジェットエディタとの互換性**
   - 既存のドラッグ&ドロップエディタシステムとの互換性に注意
   - 必要に応じてアダプターパターンを検討

2. **アイコン使用ポリシー**
   - 引き続きHeroiconsを優先（Nuxt UIでも対応）
   - `heroicons:` プレフィックスの使用規則を維持

3. **デザインの一貫性**
   - 段階的移行中はデザインの一貫性を維持するよう注意
   - カラーパレット、余白、フォントサイズなどの統一

4. **パフォーマンス考慮**
   - バンドルサイズの増加に注意
   - 必要に応じて動的インポートを検討

## 📝 実装例

### Buttonコンポーネントの使用例

```vue
<template>
  <!-- Nuxt UIボタン -->
  <UButton
    label="保存"
    color="primary"
    icon="heroicons:check"
    @click="saveData"
  />

  <!-- 既存のカスタムボタン -->
  <Button
    variant="primary"
    @click="saveData"
  >
    保存
  </Button>
</template>
```

### Formコンポーネントの使用例

```vue
<template>
  <UForm :schema="formSchema" :state="formState" @submit="onSubmit">
    <UFormGroup label="デバイス名" name="deviceName">
      <UInput v-model="formState.deviceName" placeholder="デバイス名を入力" />
    </UFormGroup>

    <UFormGroup label="IPアドレス" name="ipAddress">
      <UInput v-model="formState.ipAddress" placeholder="例: 192.168.1.1" />
    </UFormGroup>

    <UButton type="submit" label="登録" />
  </UForm>
</template>

<script setup>
import { z } from 'zod'

const formSchema = z.object({
  deviceName: z.string().min(1, '必須項目です'),
  ipAddress: z.string().ip('有効なIPアドレスを入力してください')
})

const formState = ref({
  deviceName: '',
  ipAddress: ''
})

const onSubmit = (data) => {
  // 送信処理
}
</script>
```

## 📊 移行タイムライン

| フェーズ | 期間 | 内容 |
|--------|------|-----|
| 1      | 即時  | 新規機能開発でNuxt UIを使用開始 |
| 2      | 3ヶ月 | 基本コンポーネント（Button, Input等）の移行 |
| 3      | 6ヶ月 | 中規模コンポーネントの移行 |
| 4      | 未定  | ウィジェットシステムの再検討 |

## 🔗 参考リソース

- [Nuxt UI公式ドキュメント](https://ui.nuxt.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [hotel-saas UI Style Guide](../UI_STYLE_GUIDE.md)
