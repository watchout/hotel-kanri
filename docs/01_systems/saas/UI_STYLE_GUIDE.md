# 🎨 UI Style Guide – hotel‑saas (Tailwind CSS)

*Last updated: 2025‑05‑08*

---

## 0. 目的

* **AI (Devin / Cursor) が UI を実装するときの単一ソース**。
* デザイナーがいなくても **色・余白・タイポ・バッジなどを統一**。
* Tailwind の **`tailwind.config.js`** と 1:1 で対応する。

---

## 1. デザイントークン

| Token         | 値                            | Tailwind class                  | 用途例              |
| ------------- | ---------------------------- | ------------------------------- | ---------------- |
| **Primary**   | `#2563eb`                    | `bg-blue-600` / `text-blue-600` | CTA ボタン / 強調リンク  |
| **Secondary** | `#0ea5e9`                    | `bg-sky-500`                    | hover / アップセルバッジ |
| **Success**   | `#16a34a`                    | `bg-green-600`                  | 注文完了             |
| **Warning**   | `#f59e0b`                    | `bg-amber-500`                  | 調理中ステータス         |
| **Error**     | `#dc2626`                    | `bg-red-600`                    | バリデーション失敗        |
| **Gray‑bg**   | `#f3f4f6`                    | `bg-gray-100`                   | カード背景 / 提供時間外マスク |
| **Font base** | `"Noto Sans JP", sans-serif` | `font-sans`                     | 全体               |

> `tailwind.config.js` → `theme.extend.colors` に追記済み。

### 日本の伝統色パレット

| Token      | 値          | Tailwind class         | 名称     |
| ---------- | ---------- | ---------------------- | ------ |
| **Blue**   | `#3A8FB7`  | `text-blue-500`        | 天色     |
| **Red**    | `#E54848`  | `text-red-500`         | 赤      |
| **Green**  | `#2E8232`  | `text-green-500`       | 若竹色    |
| **Amber**  | `#E69B3A`  | `text-amber-500`       | 山吹色    |
| **Sky**    | `#58B2DC`  | `text-sky-500`         | 空色     |
| **Indigo** | `#6A6DA9`  | `text-indigo-500`      | 桔梗色    |
| **Rose**   | `#CB4042`  | `text-rose-500`        | 真紅     |

---

## 2. 余白 & レイアウト

| Token               | 値        | Tailwind          | 用途      |
| ------------------- | -------- | ----------------- | ------- |
| **Container Max‑W** | `1280px` | `max-w-screen-xl` | pages 等 |
| **Grid Gap**        | `1rem`   | `gap-4`           | メニューカード |
| **Card Padding**    | `1rem`   | `p-4`             | 全カード共通  |
| **Section padding** | `2rem`   | `py-8`            | パネル区切り  |

---

## 3. コンポーネントガイドライン

### 3.1 ボタン

```html
<button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow">
  アクション
</button>
```

* サイズ変種: `sm (px-3 py-1.5 text-sm)`, `lg (px-6 py-3 text-lg)`
* Disabled: `opacity-40 pointer-events-none`

### 3.2 カード (MenuCard)

```html
<div class="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
  <img src="..." class="h-40 w-full object-cover" />
  <div class="p-4 flex-1 flex flex-col justify-between">
    <h3 class="text-lg font-semibold">商品名</h3>
    <p class="mt-2 text-right font-bold">900円</p>
  </div>
</div>
```

### 3.3 タブ (CategoryTabs)

```html
<button
  :class="isActive ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'"
  class="px-4 py-2 font-medium">
  フード
</button>
```

* 下線アクティブ+カラー変更。

### 3.4 Toast Notification

```html
<div class="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded shadow-lg animate-slideIn">
  注文を送信しました！
</div>
```

`tailwind.config.js` に `@keyframes slideIn` を追加。

### 3.5 エラー表示とフォームバリデーション

#### エラー表示の原則

1. **ブラウザのアラート (`alert()`) の使用禁止**
   - すべてのエラーはUI内に統合して表示する

2. **リアルタイムバリデーション**
   - 入力中または入力直後にフィールドごとのバリデーションを実行
   - フォーカスが外れた時点（blur）でバリデーション実行

3. **フォーム送信ボタンの状態管理**
   - バリデーションエラーがある場合は送信ボタンを無効化（`disabled`）
   - 必須項目が未入力の場合も送信ボタンを無効化

4. **エラー表示位置**
   - フィールド単位のエラー: 対応する入力フィールドの直下
   - フォーム全体のエラー（API応答エラーなど）: フォームの先頭または送信ボタン上部

#### 実装例

```html
<!-- フィールド単位のエラー表示 -->
<div class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-1">デバイス名</label>
  <input
    type="text"
    v-model="deviceName"
    @blur="validateDeviceName"
    :class="errors.deviceName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'"
    class="w-full rounded-md shadow-sm focus:ring-2 focus:border-transparent"
  />
  <p v-if="errors.deviceName" class="mt-1 text-sm text-red-600">{{ errors.deviceName }}</p>
</div>

<!-- フォーム全体のエラー表示 -->
<div v-if="formError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
  <p class="text-red-600">{{ formError }}</p>
</div>

<!-- 送信ボタン -->
<button
  type="submit"
  :disabled="!isFormValid || isSubmitting"
  :class="!isFormValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'"
  class="px-4 py-2 bg-blue-600 text-white rounded-lg shadow"
>
  {{ isSubmitting ? '送信中...' : '登録' }}
</button>
```

#### 非同期バリデーション（API検証が必要な場合）

```js
// 例: IPアドレスやMACアドレスの重複チェック
const validateIPAddress = async () => {
  if (!formData.ipAddress) return true;

  try {
    const response = await $fetch('/api/v1/admin/devices/validate-ip', {
      method: 'POST',
      body: { ipAddress: formData.ipAddress }
    });

    if (!response.isValid) {
      errors.value.ipAddress = response.message || 'このIPアドレスは既に使用されています';
      return false;
    }

    errors.value.ipAddress = '';
    return true;
  } catch (error) {
    errors.value.ipAddress = 'バリデーションに失敗しました';
    return false;
  }
};
```

### 3.6 アイコン

#### 🎯 アイコン統一ルール（厳守）

**必須**: 全てのアイコンは **Heroicons** を使用し、`heroicons:` プレフィックスを付ける

```html
<!-- ✅ 正しい使用例 -->
<Icon name="heroicons:pencil-square" class="w-4 h-4" />
<Icon name="heroicons:trash" class="w-5 h-5" />

<!-- ❌ 間違った使用例 -->
<Icon name="pencil" class="w-4 h-4" />
<Icon name="mdi:pencil" class="w-4 h-4" />
<Icon name="fa:edit" class="w-4 h-4" />
```

#### アイコンの使用ガイドライン

1. **アイコンセット**: **Heroicons のみ使用**（`heroicons:` プレフィックス必須）
2. **共通スタイル**: アイコンは基本的にStrokeスタイル（塗りつぶしなし・線のみ）を使用
3. **サイズ**: 基本サイズは `w-5 h-5`（20px相当）とし、コンテキストに応じて調整
4. **色**: 基本色はテキスト色に合わせ、アクション要素では対応する意味論的な色を使用

#### 標準アイコンマッピング

| アクション | Heroicon名 | 使用例 | カラークラス |
| ------ | ---- | --- | ------ |
| **削除** | `heroicons:trash` | カート内商品の削除 | `text-red-500` |
| **編集** | `heroicons:pencil-square` | 編集ボタン | `text-indigo-500` |
| **複製** | `heroicons:document-duplicate` | コピー機能 | `text-green-500` |
| **表示** | `heroicons:eye` | プレビュー | `text-blue-500` |
| **追加** | `heroicons:plus` | 新規作成 | `text-blue-500` |
| **戻る** | `heroicons:arrow-left` | 前の画面に戻る | `text-gray-500` |
| **完了** | `heroicons:check` | 注文完了 | `text-green-500` |
| **閉じる** | `heroicons:x-mark` | モーダル閉じる | `text-gray-500` |
| **検索** | `heroicons:magnifying-glass` | 検索入力 | `text-gray-400` |
| **設定** | `heroicons:cog-6-tooth` | 設定画面 | `text-gray-500` |
| **警告** | `heroicons:exclamation-triangle` | エラー表示 | `text-red-500` |
| **情報** | `heroicons:information-circle` | 情報表示 | `text-blue-500` |
| **読み込み** | `heroicons:arrow-path` | ローディング | `text-indigo-500` |
| **メニュー** | `heroicons:bars-3` | ハンバーガーメニュー | `text-gray-500` |
| **レイアウト** | `heroicons:squares-2x2` | レイアウト管理 | `text-indigo-500` |

#### 実装例

```html
<!-- 削除ボタン -->
<button
  @click="removeItem(index)"
  class="text-red-500 hover:text-red-700"
  aria-label="削除"
>
  <Icon name="heroicons:trash" class="w-5 h-5" />
</button>

<!-- 編集ボタン -->
<NuxtLink
  :to="`/admin/items/${item.id}/edit`"
  class="text-indigo-500 hover:text-indigo-700"
  title="編集"
>
  <Icon name="heroicons:pencil-square" class="w-4 h-4" />
</NuxtLink>

<!-- ローディング状態 -->
<button :disabled="loading" class="px-4 py-2 bg-blue-600 text-white rounded">
  <Icon
    :name="loading ? 'heroicons:arrow-path' : 'heroicons:check'"
    :class="loading ? 'animate-spin' : ''"
    class="w-4 h-4 mr-2"
  />
  {{ loading ? '保存中...' : '保存' }}
</button>
```

#### ❌ 避けるべきアイコン使用例

```html
<!-- ❌ プレフィックスなし -->
<Icon name="pencil-square" class="w-4 h-4" />

<!-- ❌ 他のアイコンセット -->
<Icon name="mdi:pencil" class="w-4 h-4" />
<Icon name="fa:edit" class="w-4 h-4" />
<Icon name="tabler:edit" class="w-4 h-4" />

<!-- ❌ 直接SVGの使用 -->
<svg class="w-5 h-5">...</svg>
```

---

## 4. ブレークポイント

| 名称     | px   | Tailwind | 用途       |
| ------ | ---- | -------- | -------- |
| **sm** | 640  | `sm:`    | スマホ基準    |
| **md** | 768  | `md:`    | タブレット    |
| **lg** | 1024 | `lg:`    | 小型デスクトップ |
| **xl** | 1280 | `xl:`    | 大型デスクトップ |

グリッド列数: `sm:1 / md:2 / lg:3 / xl:4`。

---

## 5. アクセシビリティ

1. 文字コントラスト: AAA 準拠 (WCAG)
2. 画像 `alt` 必須 (`MenuItem.imageUrl` ⇒ `name_ja` 既定)
3. キーボードフォーカス: `focus:ring-2 focus:ring-blue-500`

---

## 6. Tailwind Config 拡張抜粋

```js
export default {
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#0ea5e9',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(100%)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
      animation: {
        slideIn: 'slideIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
```

---

## 7. Nuxt UI導入方針

*Last updated: 2025-07-15*

### 7.1 導入アプローチ

1. **段階的導入**
   - 既存UIコンポーネントは維持したまま、**新規機能開発のみNuxt UIを使用**
   - 既存コンポーネントは当面そのまま使用し、自然な更新タイミングで徐々に置き換え

2. **ハイブリッドモード**
   - Nuxt UIとカスタムコンポーネントの共存を許容
   - デザイントークンの統一により視覚的一貫性を維持

### 7.2 実装ガイドライン

```bash
# Nuxt UI導入手順
npm install @nuxt/ui

# nuxt.config.tsに追加
modules: [
  '@nuxt/ui'
]
```

```typescript
// app.config.tsでカスタマイズ
export default defineAppConfig({
  ui: {
    // 日本の伝統色パレットをNuxt UIに適用
    colors: {
      primary: {
        50: '#eef2ff',
        // ...他の階調
        500: '#3A8FB7', // 天色
        // ...他の階調
      },
      // 他のカラー設定
    }
  }
})
```

### 7.3 コンポーネント優先順位

| コンポーネント | 移行優先度 | 備考 |
| ---------- | ------ | --- |
| Button     | 高     | 基本UIコンポーネントとして最初に置き換え |
| Input      | 高     | フォーム要素として優先的に置き換え |
| Modal      | 中     | 複雑な実装があるため段階的に移行 |
| ウィジェット系  | 低     | 既存の実装を維持 |

### 7.4 注意事項

- 既存のウィジェットエディタシステムとの互換性に注意
- アイコン使用は引き続きHeroiconsを優先（Nuxt UIでも対応）
- 段階的移行中はデザインの一貫性を維持するよう注意

---

## 8. 未決事項

| ID   | 内容                         | 優先  |
| ---- | -------------------------- | --- |
| U-10 | ダークモード対応 (`class` variant) | ★★☆ |
| U-11 | DaisyUI / shadcn 併用可否      | ★☆☆ |
| U-12 | カラーブラインドセーフパレット            | ☆☆☆ |
| U-13 | Nuxt UI完全移行タイムライン         | ★★★ |

---

## 9. Devin / Cursor への指示テンプレ

```markdown
### UI Style Reference
Please follow `docs/UI_STYLE_GUIDE.md` for colors, spacing, and components.

```

