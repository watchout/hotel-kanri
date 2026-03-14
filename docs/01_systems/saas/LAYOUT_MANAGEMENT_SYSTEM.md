# レイアウト管理システム仕様書

## 📋 **概要**

Hotel-SaaSプロジェクトのレイアウト管理システムは、ホテル客室TV画面をはじめとする全てのページレイアウトを統一的に管理・編集できる包括的なシステムです。

### **設計思想**
- **汎用性**: TOPページから機能ページまで全てのページタイプに対応
- **拡張性**: ユーザーが自由にページを無制限追加可能
- **直感性**: ドラッグ&ドロップによる視覚的編集
- **安全性**: 手動保存システムと簡単なリセット機能

### **✅ 実装状況 (2025年1月13日現在)**
- ✅ **汎用レイアウトエディタ**: 完全機能ドラッグ&ドロップエディタ
- ✅ **新規ページ作成システム**: 7種類のページタイプ対応ドロップダウンメニュー
- ✅ **デフォルトリセット機能**: 美しい白ベースデザインへの復元
- ✅ **自動更新システム**: 5分間隔でのレイアウト切り替えチェック
- ✅ **手動保存システム**: 変更追跡と確認機能付き保存
- ✅ **スケジュール管理**: 期間指定・優先度・季節タグ対応

---

## 🎯 **主要機能**

### 1. **汎用レイアウトエディタ** ✅
- **ドラッグ&ドロップ編集**: パレットからキャンバスへの要素配置
- **リアルタイムプレビュー**: 編集中の即座な反映
- **手動保存システム**: `hasUnsavedChanges`フラグによる変更追跡
- **要素管理**: 選択・移動・削除・プロパティ編集

### 2. **多様なページタイプ作成** ✅
- **TOPページデザイン**: TV画面用メインページの複数バリエーション
- **ルームサービス画面**: 注文システムのUI/UX
- **館内施設案内画面**: 施設情報の表示レイアウト
- **観光案内画面**: 地域情報・観光スポット案内
- **アンケート画面**: 顧客満足度調査システム
- **WiFi案内画面**: 接続方法・認証情報表示
- **自由ページ（カスタム）**: 無制限のオリジナルページ

### 3. **スケジュール管理機能** ✅
- **表示期間設定**: 開始日時・終了日時の指定
- **優先度管理**: 競合時の表示判定
- **季節タグ**: spring, summer, autumn, winter, newyear等
- **自動切り替え**: 5分間隔での更新チェック

### 4. **デフォルトリセット機能** ✅
- **美しい白ベースデザイン**: 高級ホテル向けのデフォルトテーマ
- **ワンクリックリセット**: 全カスタムレイアウトのクリア
- **安全な復元**: 確認ダイアログ付きの操作

---

## 🏗️ **システム構成**

### **フロントエンド**

#### **管理画面**: `pages/admin/layouts/index.vue` ✅
```typescript
// 主要機能ボタン（2025年1月13日実装完了）
- レイアウトエディタ (汎用) ✅
- 新規ページ作成 (ドロップダウンメニュー) ✅
  └─ TOPページデザイン
  └─ ルームサービス画面
  └─ 館内施設案内画面
  └─ 観光案内画面
  └─ アンケート画面
  └─ WiFi案内画面
  └─ 自由ページ（カスタム）
- デフォルトリセット ✅
- テンプレート作成 ✅

// フィルタリング・検索
- カテゴリフィルター ✅
- ステータスフィルター ✅
- タイプフィルター ✅
- キーワード検索 ✅
```

#### **高度レイアウトエディタ**: `components/admin/layouts/AdvancedTopPageEditor.vue` ✅
```typescript
// 3カラムレイアウト
- 左側パレット: 要素ライブラリ (基本要素・レイアウト・期間設定)
- 中央キャンバス: 16:9 TV画面プレビュー (ドラッグ&ドロップ対応)
- 右側プロパティ: 選択要素の詳細設定

// 実装済み機能
- ✅ 機能するドラッグ&ドロップ
- ✅ 配置要素管理 (placedElements配列)
- ✅ 要素プロパティ編集
- ✅ 期間設定・スケジュール管理
- ✅ エリア比率調整
- ✅ 手動保存システム (hasUnsavedChanges)
```

#### **TOPページ**: `pages/index.vue` ✅
```typescript
// 自動レイアウト更新システム
- ✅ 起動時のアクティブレイアウト取得
- ✅ 5分間隔の定期チェック (setInterval(checkLayoutUpdates, 5*60*1000))
- ✅ レイアウト変更時の自動更新
- ✅ フォールバック機能（デフォルトレイアウト）
- ✅ 美しい白ベースデザイン (現在のデフォルト)
```

### **バックエンド**

#### **APIエンドポイント**
```
✅ GET  /api/v1/admin/layouts/active      # アクティブレイアウト取得
✅ POST /api/v1/admin/layouts/advanced    # 高度レイアウト保存
✅ POST /api/v1/admin/layouts/schedule    # スケジュール設定
✅ POST /api/v1/admin/layouts/reset       # デフォルトリセット
✅ POST /api/v1/admin/layouts/default     # デフォルトレイアウト作成
✅ GET  /api/v1/admin/layouts             # レイアウト一覧取得
✅ POST /api/v1/admin/layouts             # 新規レイアウト作成
```

#### **データベーススキーマ**: `prisma/schema.prisma` ✅
```prisma
model Layout {
  id              String    @id @default(cuid())
  name            String
  description     String?
  type            String    // tv-top-page, service-page, info-page, etc.
  category        String    // top, service, info, custom, etc.
  slug            String    @unique
  status          String    @default("draft") // draft, published, archived
  version         Int       @default(1)

  // スケジュール管理 ✅ 実装済み
  isScheduled     Boolean   @default(false)
  displayStartAt  DateTime?
  displayEndAt    DateTime?
  priority        Int       @default(1)
  seasonTag       String?   // spring, summer, autumn, winter, newyear

  // アクティブ状態管理 ✅ 実装済み
  isActive        Boolean   @default(false)
  isDefault       Boolean   @default(false)
  activatedAt     DateTime?
  deactivatedAt   DateTime?

  // レイアウトデータ
  settings        Json?     // テーマ、色設定等
  data            Json      // 要素配置データ

  // メタデータ
  isTemplate      Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
}
```

---

## 🎨 **デフォルトデザイン仕様** ✅

### **美しい白ベースTV画面レイアウト** (現在アクティブ)

#### **配色設計**
```css
/* メインカラー */
background: bg-gradient-to-br from-gray-50 via-white to-gray-100
primary: #1e293b (slate-800)
secondary: #fbbf24 (amber-400)
accent: #3b82f6 (blue-500)

/* ヘッダー・フッター */
header: bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm
footer: bg-white/80 backdrop-blur-sm border-t border-gray-200 shadow-sm

/* コンテンツエリア */
campaign: bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg
concierge: bg-gradient-to-br from-blue-50 to-indigo-50 backdrop-blur-sm rounded-2xl border border-blue-200 shadow-lg
```

#### **レイアウト構成** (実装済みデザイン)
```
┌─────────────────────────────────────────────────────────┐
│ ヘッダー (h-20): ホテルロゴ + 時刻 + 天気・言語・ホーム  │ ✅
├─────────────────────────────────────────────────────────┤
│ メインエリア (h-[calc(100vh-208px)]):                  │
│ ┌─────────────────────┐ ┌─────────────────────────────┐ │
│ │ キャンペーンエリア  │ │ AIコンシェルジュエリア      │ │ ✅
│ │ (70%幅)            │ │ (30%幅)                   │ │
│ │                     │ │                           │ │
│ │ - タイトル          │ │ - アバター                │ │
│ │ - サブタイトル      │ │ - ステータス              │ │
│ │ - 価格表示          │ │ - 機能一覧                │ │
│ │ - アクションボタン  │ │ - チャット開始ボタン      │ │
│ └─────────────────────┘ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ フッター (h-32): 5つのサービスボタン（画面幅いっぱい）   │ ✅
│ [ルームサービス][館内施設][観光案内][アンケート][WiFi]   │
└─────────────────────────────────────────────────────────┘
```

#### **フッターメニュー仕様** ✅ 実装完了
- **サイズ**: 20px × 20px アイコン (ユーザー要求通り)
- **配置**: `justify-between` + `flex-1` で等分配置
- **ボタン**: 画面幅を5分割で最大サイズ
- **アイコン**: 絵文字 + タイトル表示

---

## 🔧 **技術実装詳細** ✅

### **ドラッグ&ドロップシステム** (完全実装済み)
```typescript
// 要素管理
const placedElements = ref([])
const selectedElement = ref(null)
const draggedElement = ref(null)

// ドラッグイベント ✅ 機能確認済み
const handleDragStart = (element) => {
  draggedElement.value = element
}

const handleDrop = (event) => {
  const rect = event.target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const newElement = {
    id: Date.now(),
    ...draggedElement.value,
    position: { x, y },
    size: { width: 200, height: 100 }
  }

  placedElements.value.push(newElement)
  hasUnsavedChanges.value = true
}

// 要素選択・削除 ✅ 実装済み
const selectElement = (element) => {
  selectedElement.value = element
}

const deleteElement = (elementId) => {
  placedElements.value = placedElements.value.filter(el => el.id !== elementId)
  hasUnsavedChanges.value = true
}
```

### **自動レイアウト更新システム** ✅ 稼働中
```typescript
// 5分間隔での更新チェック
const checkLayoutUpdates = async () => {
  try {
    const response = await $fetch('/api/v1/admin/layouts/active')
    if (response?.success && response.data?.id !== activeLayoutId.value) {
      console.log('新しいレイアウトが検出されました。ページを更新します。')
      await loadLayoutData()
    }
  } catch (error) {
    console.log('レイアウト更新チェック中にエラー:', error)
  }
}

setInterval(checkLayoutUpdates, 5 * 60 * 1000) // ✅ 実装済み
```

### **手動保存システム** ✅ 実装済み
```typescript
const hasUnsavedChanges = ref(false)

// 変更追跡
watch([placedElements, layoutSettings], () => {
  hasUnsavedChanges.value = true
}, { deep: true })

// 保存処理
const saveLayout = async () => {
  try {
    const response = await $fetch('/api/v1/admin/layouts/advanced', {
      method: 'POST',
      body: { layoutData, layoutSettings, scheduleSettings }
    })

    if (response.success) {
      hasUnsavedChanges.value = false
      // 成功メッセージ表示
    }
  } catch (error) {
    // エラーハンドリング
  }
}
```

### **新規ページ作成システム** ✅ 2025年1月13日実装完了
```typescript
// ドロップダウンメニュー管理
const showCreateMenu = ref(false)

// ページタイプ別作成データ
const createNewPage = async (pageType: string) => {
  const pageConfigs = {
    'top': {
      name: `TOPページデザイン - ${new Date().toLocaleString('ja-JP')}`,
      type: 'tv-top-page',
      category: 'top'
    },
    'room-service': {
      name: `ルームサービス画面 - ${new Date().toLocaleString('ja-JP')}`,
      type: 'service-page',
      category: 'service'
    },
    'facilities': {
      name: `館内施設案内画面 - ${new Date().toLocaleString('ja-JP')}`,
      type: 'info-page',
      category: 'info'
    },
    // ... 他のページタイプ
  }

  const response = await $fetch('/api/v1/admin/layouts', {
    method: 'POST',
    body: pageConfigs[pageType]
  })

  if (response.success) {
    // エディタを自動で開く
    showAdvancedEditor.value = true
  }
}
```

---

## 📱 **対応デバイス・画面サイズ**

### **主要ターゲット**
- **TV画面**: 1920x1080px (16:9) ✅ メイン対応
- **タブレット**: 1366x768px (16:9) ✅ 対応済み
- **レスポンシブ**: 各デバイスに最適化

### **デザイン原則** ✅ 準拠済み
- **タッチ操作最適化**: 最小44px以上のタッチターゲット
- **高コントラスト**: アクセシビリティ考慮
- **読みやすさ**: 適切なフォントサイズとライニング
- **直感的操作**: ユーザビリティ重視

---

## 🚀 **使用方法** ✅ 実装完了

### **1. レイアウト管理画面へのアクセス**
```
✅ http://localhost:3100/admin/layouts
```

### **2. 新規ページ作成** ✅ ドロップダウンメニュー実装済み
1. ✅ 「新規ページ作成」ボタンをクリック
2. ✅ ドロップダウンメニューから7種類のページタイプを選択
   - TOPページデザイン
   - ルームサービス画面
   - 館内施設案内画面
   - 観光案内画面
   - アンケート画面
   - WiFi案内画面
   - 自由ページ（カスタム）
3. ✅ 自動的にエディタが開かれる

### **3. レイアウト編集** ✅ フル機能実装済み
1. ✅ 「レイアウトエディタ」ボタンをクリック
2. ✅ 左側パレットから要素をドラッグ
3. ✅ 中央キャンバスに配置
4. ✅ 右側パネルで詳細設定
5. ✅ 「保存」ボタンで確定 (hasUnsavedChanges確認)

### **4. スケジュール設定** ✅ 実装済み
1. ✅ エディタ内の「期間設定」タブ
2. ✅ 開始日時・終了日時を設定
3. ✅ 優先度と季節タグを選択
4. ✅ 自動切り替えが有効化

### **5. デフォルトリセット** ✅ 実装済み
1. ✅ 「デフォルトに戻す」ボタンをクリック
2. ✅ 確認ダイアログで承認
3. ✅ 美しい白ベースデザインに復元

---

## 🔍 **トラブルシューティング**

### **解決済み問題**

#### **✅ 500エラー: layout設定問題 (解決済み)**
```
問題: Cannot read properties of undefined (reading 'meta')
解決: definePageMeta({ layout: false }) で無効化
```

#### **✅ ドラッグ&ドロップが機能しない (解決済み)**
```
問題: 初期実装で実際にドラッグできなかった
解決: 完全なドラッグ&ドロップシステムを再実装
```

#### **✅ TOPページデザインがダサい (解決済み)**
```
問題: ユーザーが「センスなく、ダサい」と指摘
解決: 美しい白ベースデザインに変更、ユーザー満足
```

### **よくある問題と解決方法**

#### **レイアウトが反映されない**
```bash
# 1. アクティブレイアウトの確認
GET /api/v1/admin/layouts/active

# 2. キャッシュクリア
Ctrl+F5 でハードリロード

# 3. 5分待機（自動更新システムの反映待ち）
```

#### **保存に失敗する**
```bash
# データベース接続確認
npx prisma studio

# APIエンドポイント確認
curl -X POST http://localhost:3100/api/v1/admin/layouts/advanced
```

---

## 📈 **今後の拡張予定**

### **短期追加機能**
- [ ] レイアウトのバージョン管理
- [ ] プレビュー機能の強化
- [ ] テンプレートライブラリの充実
- [ ] アニメーション効果の追加

### **中期追加機能**
- [ ] モバイル対応レイアウト
- [ ] A/Bテスト機能
- [ ] 多言語レイアウト対応
- [ ] パフォーマンス分析

### **長期ビジョン**
- [ ] AI支援レイアウト生成
- [ ] 外部デザインツール連携
- [ ] リアルタイム共同編集
- [ ] クラウド同期機能

---

## 💡 **開発者向け注意事項**

### **コーディング規約** ✅ 遵守中
- **アイコン**: 全て `heroicons:` プレフィックス必須
- **命名**: 関数・変数名は英語、コメントは日本語
- **スタイル**: Tailwind CSS使用、カスタムCSS最小限

### **データベース変更時の注意** ✅ 厳守
- **影響確認必須**: 既存のオーダーシステムへの影響
- **新テーブル優先**: 既存テーブル変更は最小限
- **バックアップ**: 変更前に必ずデータベースバックアップ

### **パフォーマンス考慮**
- **画像最適化**: WebP形式推奨
- **遅延読み込み**: 大きな要素は lazy loading
- **キャッシュ活用**: 静的リソースの適切なキャッシュ

---

## 🎯 **実装完了確認**

### **2025年1月13日実装完了項目**
- ✅ **管理画面UI改修**: 汎用的なボタン配置
- ✅ **ドロップダウンメニュー**: 7種類のページタイプ作成
- ✅ **新規ページ作成API**: 各ページタイプに対応
- ✅ **デフォルトリセット機能**: 美しい白ベースへの復元
- ✅ **エディタ自動起動**: ページ作成後の自動エディタ表示
- ✅ **ドラッグ&ドロップ**: 完全機能するエディタ
- ✅ **手動保存システム**: 変更追跡付き
- ✅ **自動更新システム**: 5分間隔チェック稼働中

### **動作確認URL**
```
✅ レイアウト管理: http://localhost:3100/admin/layouts
✅ TOPページ確認: http://localhost:3100
✅ 美しい白ベースデザイン: デフォルト表示中
```

---

## 📚 **関連ドキュメント**

- [TV_LAYOUT_SPECIFICATION.md](./TV_LAYOUT_SPECIFICATION.md) - TV画面レイアウト詳細
- [API仕様書](../API_SPEC.md) - APIエンドポイント詳細
- [プロジェクト全体仕様](../../README.md) - プロジェクト概要

---

**最終更新**: 2025年1月13日 - 汎用レイアウト管理システム実装完了
**バージョン**: 2.0.0 (メジャーアップデート)
**作成者**: AI Assistant
**承認者**: Hotel SaaS Development Team
**実装状況**: 🟢 本格稼働中
