# 🔣 アイコンシステム統一ガイド

**作成日**: 2024年9月19日  
**バージョン**: 1.0.0  
**対象システム**: hotel-saas, hotel-pms, hotel-member, hotel-common

## 1. 概要

このガイドでは、ホテル統合システム全体で使用する統一アイコンシステムについて説明します。アイコンシステムは、ユーザーインターフェイスの一貫性を保ち、視覚的な統一感を提供するために重要です。

## 2. アイコンシステムの目的

- **視覚的一貫性**: 全システムで統一されたアイコンデザイン
- **開発効率化**: 共通コンポーネントによる実装の簡素化
- **メンテナンス性向上**: 一元管理によるアイコン資産の管理
- **アクセシビリティ**: 意味が明確で認識しやすいアイコン

## 3. 技術仕様

### 3.1 基本構成

- **ベースライブラリ**: Iconify
- **主要アイコンセット**:
  - Material Design Icons (mdi)
  - Font Awesome (fa)
  - Heroicons (heroicons)
  - システム固有アイコン (system)

### 3.2 ディレクトリ構造

```
src/
  ui/
    icons/
      components/
        Icon.ts        # 基本アイコンコンポーネント
        SystemIcon.ts  # システム専用アイコン
      constants/
        iconSets.ts    # アイコンセット定義
        systemIcons.ts # システムアイコン定義
      types/
        index.ts       # アイコン関連の型定義
      utils/
        iconLoader.ts  # アイコンロードユーティリティ
      index.ts         # エントリーポイント
```

## 4. 使用方法

### 4.1 基本的な使用方法

#### Vue.js / Nuxt.js での使用

```vue
<template>
  <div>
    <HotelIcon name="account" />
    <HotelIcon name="calendar" set="mdi" size="lg" color="primary" />
    <SystemIcon systemId="hotel-saas" size="xl" />
  </div>
</template>

<script setup lang="ts">
import { HotelIcon, SystemIcon } from '@/ui/icons';
</script>
```

#### グローバル登録（Vue.js / Nuxt.js）

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import IconSystem from '@/ui/icons';

const app = createApp(App);
app.use(IconSystem);
app.mount('#app');
```

### 4.2 アイコンプロパティ

| プロパティ | 型 | デフォルト | 説明 |
|------------|------|---------|------|
| name | string | - | アイコン名（必須） |
| set | string | 'mdi' | アイコンセット |
| size | string \| number | 'md' | アイコンサイズ |
| color | string | 'default' | アイコンカラー |
| className | string | '' | 追加CSSクラス |

### 4.3 サイズ定義

| サイズ | ピクセル値 | 用途 |
|-------|----------|------|
| xs | 12px | 小さな表示領域、補助的なアイコン |
| sm | 16px | テキスト内のインラインアイコン |
| md | 24px | 標準サイズ（デフォルト） |
| lg | 32px | 強調表示 |
| xl | 48px | 大きなボタンやヘッダー |
| 2xl | 64px | 特大表示、フィーチャーアイコン |

### 4.4 カラー定義

| カラー | CSS変数 | 用途 |
|-------|---------|------|
| primary | var(--color-primary, #667eea) | 主要アクション、強調 |
| secondary | var(--color-secondary, #764ba2) | 補助的なアクション |
| success | var(--color-success, #48bb78) | 成功、完了 |
| warning | var(--color-warning, #ed8936) | 警告、注意 |
| error | var(--color-error, #e53e3e) | エラー、重要な警告 |
| info | var(--color-info, #4299e1) | 情報提供 |
| default | currentColor | 現在のテキストカラー |

## 5. システムアイコン

各システムには専用のアイコンが定義されています：

| システム | アイコン | アイコンセット | 表示例 |
|---------|---------|--------------|-------|
| hotel-saas | sun | heroicons | ☀️ |
| hotel-pms | moon | heroicons | 🌙 |
| hotel-member | user-group | heroicons | 👥 |
| hotel-common | cog | heroicons | ⚙️ |

## 6. 機能アイコン

共通機能には標準アイコンを使用してください：

| 機能 | アイコン | アイコンセット |
|------|---------|--------------|
| 予約 | calendar | mdi |
| チェックイン | login | mdi |
| チェックアウト | logout | mdi |
| 顧客 | account | mdi |
| グループ | account-group | mdi |
| 部屋 | bed | mdi |
| 部屋タイプ | home-variant | mdi |
| 設定 | cog | mdi |
| 管理者 | shield-account | mdi |
| 通知 | bell | mdi |
| 検索 | magnify | mdi |
| ヘルプ | help-circle | mdi |

## 7. アイコン追加ガイドライン

新しいアイコンを追加する際は、以下のガイドラインに従ってください：

1. **既存アイコンの確認**: まず既存のアイコンで代用できないか確認する
2. **アイコンセットの選定**: 適切なアイコンセットから選択する
3. **一貫性の確保**: 既存アイコンとの視覚的一貫性を保つ
4. **定数の更新**: 必要に応じて`systemIcons.ts`を更新する
5. **ドキュメントの更新**: このガイドを更新する

## 8. アクセシビリティ考慮事項

- アイコン単体での使用を避け、テキストと組み合わせる
- 意味が明確なアイコンを選択する
- 色だけでなく形状でも意味が伝わるようにする
- 十分なコントラスト比を確保する

## 9. 今後の拡張計画

- SVGスプライト対応
- アニメーションアイコン対応
- カスタムアイコンの追加
- ダークモード対応

---

**注意**: このアイコンシステムは継続的に改善されます。フィードバックや提案は歓迎します。