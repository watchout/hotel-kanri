# UIエディタ統一システム 包括仕様書

**作成日**: 2025年1月27日  
**バージョン**: 1.0  
**ステータス**: 開発継続・仕様確定  
**優先度**: 最高（MVP完成に向けて）

---

## 📋 システム概要

### 設計思想の転換
hotel-saasプロジェクトにおいて、従来の「インフォメーション機能」を廃止し、**UIエディタ機能に完全統一**します。これにより以下の効果を実現します：

- **シンプルな概念**: 情報もレイアウトも全てUIエディタで管理
- **統一されたUX**: 一つのツールで全てのコンテンツを作成
- **開発効率**: 機能重複を排除し、開発リソースを集中
- **ユーザビリティ**: 学習コストを削減し、直感的な操作を実現

### 統一後のシステム構成
```
UIエディタ統一システム
├── ページエディタ        # 全てのページ作成（TOPページ、情報ページ等）
├── ウィジェットライブラリ  # 豊富なウィジェット群
├── テンプレートシステム   # 用途別テンプレート
├── プラン別機能制限      # エコノミー・プロ・エンタープライズ
└── 統合管理画面         # 一元管理インターフェース
```

### 実装状況サマリー
- **ドラッグ&ドロップエディタ**: 90%完成
- **ウィジェットシステム**: 85%完成（15種類実装済み）
- **レイアウト管理**: 85%完成
- **統合管理画面**: 70%完成

---

## 🎯 主要機能

### 1. 統一UIエディタシステム ✅

#### 1.1 ページエディタ（全ページ対応）
```typescript
// 対応ページタイプ
const pageTypes = {
  'top-page': 'TOPページ（客室メイン画面）',
  'info-page': '情報ページ（旧インフォメーション）',
  'service-page': 'サービスページ（ルームサービス等）',
  'facility-page': '館内施設ページ',
  'tourism-page': '観光案内ページ',
  'campaign-page': 'キャンペーンページ',
  'custom-page': 'カスタムページ'
}

// 実装済みコンポーネント
const editorComponents = {
  'WidgetEditor.vue': 'メインエディタ',
  'WidgetCanvas.vue': 'ドラッグ&ドロップキャンバス',
  'WidgetPalette.vue': 'ウィジェットパレット',
  'PropertyPanel.vue': 'プロパティ編集パネル',
  'NoCodeEditor.vue': 'ノーコードエディタ',
  'EditorBlock.vue': 'エディタブロック'
}
```

#### 1.2 ウィジェットライブラリ（15種類実装済み）
| カテゴリ | ウィジェット | 実装状況 | 統一後の用途 |
|----------|-------------|----------|-------------|
| **コンテンツ** | テキストウィジェット | ✅ | 情報記事、見出し、説明文 |
| | 画像ウィジェット | ✅ | 施設写真、メニュー画像 |
| | 画像ギャラリー | ✅ | 館内施設紹介、観光スポット |
| | 動画ウィジェット | ✅ | プロモーション動画、案内動画 |
| **インタラクティブ** | ボタンウィジェット | ✅ | サービス予約、詳細ページ遷移 |
| | フォームウィジェット | ✅ | 問い合わせ、アンケート |
| **レイアウト** | コンテナウィジェット | ✅ | セクション分割、情報グループ化 |
| | カラムウィジェット | ✅ | 多列レイアウト、比較表示 |
| | スペーサー | ✅ | 適切な余白、視覚的分離 |
| | 区切り線 | ✅ | セクション区切り |
| **ナビゲーション** | ナビゲーション | ✅ | メニュー、ページ間遷移 |
| | パンくずリスト | ✅ | 階層表示、現在地表示 |
| **データ** | テーブルウィジェット | ✅ | 料金表、営業時間表 |
| | カードウィジェット | ✅ | サービス紹介、施設案内 |
| **特殊** | カスタムHTML | ✅ | 高度なカスタマイズ |

#### 1.3 エディタ機能
- **グリッドシステム**: 12列グリッド、スナップ機能
- **レスポンシブ対応**: 5つのブレークポイント（XS-XL）
- **履歴管理**: 無制限Undo/Redo
- **リアルタイムプレビュー**: 編集中の即座反映
- **自動保存**: 30秒間隔の自動保存

### 2. テンプレートシステム 🚧

#### 2.1 用途別テンプレート
```typescript
const templates = {
  // TOPページテンプレート
  'top-luxury': '高級ホテル向けTOPページ',
  'top-business': 'ビジネスホテル向けTOPページ',
  'top-resort': 'リゾートホテル向けTOPページ',
  
  // 情報ページテンプレート（旧インフォメーション）
  'info-campaign': 'キャンペーン告知ページ',
  'info-menu': 'メニュー紹介ページ',
  'info-facility': '施設案内ページ',
  'info-tourism': '観光案内ページ',
  'info-basic': '基本情報ページ',
  
  // サービスページテンプレート
  'service-room': 'ルームサービスページ',
  'service-spa': 'スパ・エステページ',
  'service-restaurant': 'レストランページ',
  
  // カスタムテンプレート
  'custom-event': 'イベントページ',
  'custom-wedding': 'ウェディングページ',
  'custom-meeting': '会議室ページ'
}
```

#### 2.2 テンプレート管理
- **カテゴリ分類**: 用途別の整理
- **プレビュー機能**: 選択前の確認
- **カスタマイズ**: テンプレートベースの編集
- **保存・共有**: 独自テンプレートの作成

### 3. プラン別機能制限システム 🚧

#### 3.1 エコノミープラン（¥29,800/月）
```typescript
const economyPlanLimits = {
  // エディタ機能
  pages: {
    maxPages: 10,
    allowedTypes: ['top-page', 'info-page', 'service-page'],
    customPages: false
  },
  
  widgets: {
    maxPerPage: 15,
    allowedTypes: ['text', 'image', 'button', 'container', 'spacer'],
    customHTML: false,
    animations: false
  },
  
  templates: {
    access: 'basic-only',
    customTemplates: false,
    templateSaving: false
  },
  
  features: {
    scheduling: false,
    analytics: 'basic',
    multiLanguage: ['ja', 'en'],
    backup: 'manual'
  }
}
```

#### 3.2 プロフェッショナルプラン（¥79,800/月）
```typescript
const professionalPlanLimits = {
  // エディタ機能
  pages: {
    maxPages: 50,
    allowedTypes: 'all',
    customPages: true
  },
  
  widgets: {
    maxPerPage: 30,
    allowedTypes: 'all-standard',
    customHTML: 'limited',
    animations: 'basic'
  },
  
  templates: {
    access: 'professional',
    customTemplates: true,
    templateSaving: true
  },
  
  features: {
    scheduling: true,
    analytics: 'advanced',
    multiLanguage: ['ja', 'en', 'ko', 'zh', 'th'],
    backup: 'auto-daily'
  }
}
```

#### 3.3 エンタープライズプラン（¥139,800/月）
```typescript
const enterprisePlanLimits = {
  // エディタ機能
  pages: {
    maxPages: 'unlimited',
    allowedTypes: 'all',
    customPages: true
  },
  
  widgets: {
    maxPerPage: 'unlimited',
    allowedTypes: 'all',
    customHTML: true,
    animations: 'advanced',
    customWidgets: true
  },
  
  templates: {
    access: 'enterprise',
    customTemplates: true,
    templateSaving: true,
    templateMarketplace: true
  },
  
  features: {
    scheduling: true,
    analytics: 'enterprise',
    multiLanguage: 'all-15',
    backup: 'auto-hourly',
    apiAccess: true,
    whiteLabel: true
  }
}
```

### 4. 統合管理画面 🚧

#### 4.1 管理画面構成
```
/admin/ui-editor/
├── pages/                # ページ管理
│   ├── index.vue        # ページ一覧
│   ├── create.vue       # ページ作成
│   ├── [id]/edit.vue    # ページ編集
│   └── templates.vue    # テンプレート管理
├── widgets/             # ウィジェット管理
│   ├── index.vue        # ウィジェット一覧
│   ├── custom.vue       # カスタムウィジェット
│   └── marketplace.vue  # ウィジェットマーケット
├── assets/              # アセット管理
│   ├── images.vue       # 画像管理
│   ├── videos.vue       # 動画管理
│   └── documents.vue    # ドキュメント管理
├── settings/            # 設定管理
│   ├── general.vue      # 一般設定
│   ├── themes.vue       # テーマ設定
│   └── restrictions.vue # プラン制限設定
└── analytics/           # 分析画面
    ├── pages.vue        # ページ分析
    ├── widgets.vue      # ウィジェット分析
    └── users.vue        # ユーザー分析
```

#### 4.2 ワークフロー管理
- **編集権限**: 役職別の編集権限
- **承認フロー**: 支配人承認制（オプション）
- **版数管理**: 変更履歴の追跡
- **公開制御**: 公開・非公開の管理

---

## 🛠️ 技術仕様

### フロントエンド
```typescript
// 主要技術スタック
const techStack = {
  framework: 'Vue 3 + Nuxt 3',
  ui: 'Tailwind CSS + Headless UI',
  dragDrop: 'VueDraggable.next',
  editor: 'Custom Widget System',
  icons: 'Heroicons',
  state: 'Pinia',
  validation: 'Vee-Validate',
  i18n: '@nuxtjs/i18n',
  charts: 'Chart.js',
  animations: 'Framer Motion'
}

// 主要コンポーザブル
const composables = {
  'useWidgetEditor': 'ウィジェットエディタ管理',
  'usePageManager': 'ページ管理',
  'useTemplateSystem': 'テンプレートシステム',
  'usePlanRestrictions': 'プラン制限管理',
  'useAssetManager': 'アセット管理',
  'useAnalytics': '分析機能'
}
```

### バックエンド
```typescript
// API構造（統一後）
const apiStructure = {
  // ページ管理
  '/api/v1/admin/pages/*': 'ページ管理（全種類統合）',
  
  // ウィジェット管理
  '/api/v1/admin/widgets/*': 'ウィジェット管理',
  
  // テンプレート管理
  '/api/v1/admin/templates/*': 'テンプレート管理',
  
  // アセット管理
  '/api/v1/admin/assets/*': 'アセット管理',
  
  // 客室UI用
  '/api/v1/guest/pages/*': '客室向けページ取得',
  
  // 分析用
  '/api/v1/analytics/*': '分析データ取得'
}
```

### データベース（統一後）
```sql
-- 主要テーブル（統一後）
- Page                 -- 全ページ統合管理
- PageRevision         -- ページ版数管理
- Widget               -- ウィジェット定義
- Template             -- テンプレート管理
- Asset                -- アセット管理
- PageAnalytics        -- ページ分析データ
- UserActivity         -- ユーザー活動ログ
```

---

## 🚀 開発計画

### Phase 1: 統一基盤構築（2週間）
- [ ] **データモデル統一**
  - [ ] Pageモデル実装（全ページタイプ統合）
  - [ ] 既存データ移行スクリプト
  - [ ] API統一設計

- [ ] **統一管理画面**
  - [ ] /admin/ui-editor/ 実装
  - [ ] ページタイプ別管理UI
  - [ ] テンプレート選択機能

### Phase 2: ウィジェットシステム強化（3週間）
- [ ] **高度ウィジェット**
  - [ ] チャートウィジェット（分析表示）
  - [ ] 地図ウィジェット（観光案内）
  - [ ] QRコードウィジェット（決済・予約）
  - [ ] カレンダーウィジェット（予約表示）

- [ ] **カスタムウィジェット**
  - [ ] ウィジェット作成ツール
  - [ ] JavaScript実行環境
  - [ ] セキュリティ制御

### Phase 3: テンプレートシステム（2週間）
- [ ] **用途別テンプレート**
  - [ ] 情報ページテンプレート（旧インフォメーション）
  - [ ] サービスページテンプレート
  - [ ] キャンペーンページテンプレート

- [ ] **テンプレート管理**
  - [ ] テンプレート作成ツール
  - [ ] カテゴリ分類
  - [ ] プレビュー機能

### Phase 4: プラン制限・分析（2週間）
- [ ] **制限ミドルウェア**
  - [ ] プラン別機能制限
  - [ ] 使用量監視
  - [ ] アップグレード誘導

- [ ] **分析システム**
  - [ ] ページ閲覧分析
  - [ ] ウィジェット使用統計
  - [ ] ユーザー行動分析

---

## 🔒 セキュリティ・パフォーマンス

### セキュリティ対策
```typescript
const securityMeasures = {
  // コンテンツセキュリティ
  xss: 'HTMLサニタイゼーション',
  csrf: 'CSRFトークン検証',
  injection: 'SQLインジェクション対策',
  
  // ウィジェットセキュリティ
  widgetSandbox: 'ウィジェット実行環境の分離',
  scriptValidation: 'カスタムスクリプトの検証',
  
  // ファイルセキュリティ
  fileValidation: 'ファイル形式・サイズ制限',
  virusScanning: 'ウイルススキャン',
  
  // API セキュリティ
  rateLimit: 'レート制限',
  authentication: 'JWT認証',
  authorization: 'ロールベースアクセス制御'
}
```

### パフォーマンス最適化
```typescript
const performanceOptimizations = {
  // エディタ最適化
  virtualScrolling: 'ウィジェットリストの仮想スクロール',
  lazyLoading: 'ウィジェットの遅延読み込み',
  caching: 'テンプレート・アセットキャッシュ',
  
  // レンダリング最適化
  componentCaching: 'コンポーネントキャッシュ',
  imageOptimization: '画像最適化',
  cdnIntegration: 'CDN統合',
  
  // データベース最適化
  indexOptimization: 'インデックス最適化',
  queryOptimization: 'クエリ最適化',
  connectionPooling: 'コネクションプーリング'
}
```

---

## 📊 KPI・測定指標

### 技術指標
- **エディタ使用率**: 月間アクティブユーザー数
- **ページ作成数**: 月間ページ作成数
- **ウィジェット使用統計**: 人気ウィジェットランキング
- **テンプレート利用率**: テンプレート使用率
- **レスポンス時間**: エディタ応答時間（目標: <300ms）
- **エラー率**: システムエラー発生率（目標: <0.1%）

### ビジネス指標
- **コンテンツ作成効率**: 作成時間の短縮率
- **アップグレード率**: エコノミー→プロフェッショナル転換率
- **ユーザー満足度**: エディタ使いやすさ評価
- **サポート問い合わせ**: 機能関連問い合わせ数の削減

---

## 🎯 今後の展開

### 短期目標（3ヶ月）
- [ ] 統一システム完成
- [ ] 用途別テンプレート充実
- [ ] プラン制限システム稼働
- [ ] 基本分析機能実装

### 中期目標（6ヶ月）
- [ ] カスタムウィジェット機能
- [ ] 高度なアニメーション
- [ ] A/Bテスト機能
- [ ] 詳細分析ダッシュボード

### 長期目標（12ヶ月）
- [ ] ウィジェットマーケットプレイス
- [ ] AI支援デザイン
- [ ] 外部システム連携
- [ ] 白ラベル機能

---

## 📝 統一による効果

### 開発効率の向上
- **コード重複削除**: インフォメーション機能の重複コード削除
- **開発リソース集中**: UIエディタ機能への集中投資
- **保守性向上**: 単一システムによる保守の簡素化

### ユーザー体験の向上
- **学習コスト削減**: 一つのツールで全て完結
- **操作の統一**: 一貫したUI/UX
- **機能の充実**: 集中開発による機能強化

### ビジネス価値の向上
- **差別化要因**: 業界最高水準のUIエディタ
- **アップセル促進**: 明確なプラン別価値提供
- **顧客満足度**: 直感的で強力なツール

---

## 🏁 まとめ

UIエディタ統一システムにより、hotel-saasプロジェクトは以下を実現します：

1. **シンプルな概念**: 全てのコンテンツをUIエディタで管理
2. **強力な機能**: 15種類のウィジェットと豊富なテンプレート
3. **明確な価値**: プラン別の機能差別化
4. **継続的成長**: 拡張可能なアーキテクチャ

この統一により、開発効率とユーザー体験の両方を大幅に向上させ、業界をリードするホテルSaaSプラットフォームを構築します。 