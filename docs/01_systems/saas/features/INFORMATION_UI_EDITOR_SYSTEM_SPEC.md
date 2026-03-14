# インフォメーション・UIエディタ統合システム 包括仕様書

**作成日**: 2025年1月27日  
**バージョン**: 1.0  
**ステータス**: 開発継続・仕様確定  
**優先度**: 最高（MVP完成に向けて）

---

## 📋 システム概要

### 設計思想
hotel-saasプロジェクトにおけるインフォメーション機能は、単なる情報表示システムを超えて、**高度なUIエディタ機能**として発展しています。この統合システムは以下の特徴を持ちます：

- **ノーコード・ドラッグ&ドロップ**: 非技術者でも直感的に操作可能
- **ウィジェットベース**: 豊富なウィジェットによる柔軟なレイアウト構築
- **プラン別制限**: エコノミー・プロフェッショナル・エンタープライズ対応
- **多言語・多デバイス**: 15言語対応、レスポンシブデザイン
- **AIコンシェルジュ統合**: インフォメーション記事を知識ベースとして活用

### 実装状況サマリー
- **レイアウト機能**: 85%完成（ドラッグ&ドロップエディタ実装済み）
- **インフォメーション機能**: 65%完成（基本CMS機能実装済み）
- **ウィジェットシステム**: 70%完成（15種類のウィジェット実装済み）
- **統合管理画面**: 60%完成（基本管理機能実装済み）

---

## 🎯 主要機能

### 1. 統合UIエディタシステム ✅

#### 1.1 ドラッグ&ドロップエディタ
```typescript
// 実装済みコンポーネント
- WidgetEditor.vue      // メインエディタ
- WidgetCanvas.vue      // キャンバス
- WidgetPalette.vue     // ウィジェットパレット
- PropertyPanel.vue     // プロパティ編集
- NoCodeEditor.vue      // ノーコードエディタ
- EditorBlock.vue       // エディタブロック
```

#### 1.2 ウィジェットライブラリ（15種類実装済み）
| カテゴリ | ウィジェット | 実装状況 | 主要機能 |
|----------|-------------|----------|----------|
| **コンテンツ** | テキストウィジェット | ✅ | 見出し、段落、リッチテキスト |
| | 画像ウィジェット | ✅ | 画像表示、キャプション |
| | 画像ギャラリー | ✅ | 複数画像表示、グリッド |
| | 動画ウィジェット | ✅ | 動画埋め込み、コントロール |
| **インタラクティブ** | ボタンウィジェット | ✅ | アクションボタン、リンク |
| | フォームウィジェット | ✅ | 入力フォーム、バリデーション |
| **レイアウト** | コンテナウィジェット | ✅ | 要素グループ化 |
| | カラムウィジェット | ✅ | 多列レイアウト |
| | スペーサー | ✅ | 空白スペース |
| | 区切り線 | ✅ | 視覚的区切り |
| **ナビゲーション** | ナビゲーション | ✅ | メニュー、リンク |
| | パンくずリスト | ✅ | 階層表示 |
| **データ** | テーブルウィジェット | ✅ | データテーブル |
| | カードウィジェット | ✅ | カード形式表示 |
| **特殊** | カスタムHTML | ✅ | 独自HTML埋め込み |

#### 1.3 エディタ機能
- **グリッドシステム**: スナップ機能、ガイドライン
- **レスポンシブ対応**: 5つのブレークポイント（XS-XL）
- **履歴管理**: Undo/Redo機能
- **プレビュー**: リアルタイムプレビュー
- **保存システム**: 手動保存、自動保存

### 2. インフォメーション管理システム ✅

#### 2.1 記事管理
```typescript
// データベース構造
model InfoArticle {
  id          Int      @id @default(autoincrement())
  title       String
  content     String   @db.Text
  excerpt     String?
  category    String   // 5カテゴリ対応
  status      String   @default("draft")
  language    String   @default("ja")
  publishAt   DateTime?
  expireAt    DateTime?
  featured    Boolean  @default(false)
  viewCount   Int      @default(0)
  
  // レイアウト統合
  layoutId    Int?
  layout      Layout?  @relation(fields: [layoutId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 2.2 カテゴリシステム
| カテゴリ | 用途 | 実装状況 |
|----------|------|----------|
| **キャンペーン・イベント** | 期間限定情報 | ✅ |
| **新メニュー・季節限定** | メニュー告知 | ✅ |
| **ホテル基本情報** | 施設情報 | ✅ |
| **館内施設案内** | 施設利用案内 | ✅ |
| **周辺観光案内** | 地域情報 | ✅ |

#### 2.3 多言語対応
- **基本対応**: 日本語・英語
- **拡張対応**: 15言語（プラン別）
- **自動翻訳**: DeepL API、OpenAI GPT-4
- **翻訳管理**: 翻訳品質管理、手動修正

### 3. プラン別機能制限システム 🚧

#### 3.1 エコノミープラン（¥29,800/月）
```typescript
const economyPlanLimits = {
  // UIエディタ機能
  widgets: {
    maxPerPage: 10,
    allowedTypes: ['text', 'image', 'button', 'container'],
    customHTML: false,
    animations: false
  },
  
  // インフォメーション機能
  articles: {
    maxPerMonth: 20,
    categories: ['basic-info', 'campaigns'],
    languages: ['ja', 'en'],
    aiTranslation: false
  },
  
  // レイアウト機能
  layouts: {
    maxLayouts: 5,
    templates: 'basic-only',
    customCSS: false,
    scheduling: false
  }
}
```

#### 3.2 プロフェッショナルプラン（¥79,800/月）
```typescript
const professionalPlanLimits = {
  // UIエディタ機能
  widgets: {
    maxPerPage: 25,
    allowedTypes: 'all-basic',
    customHTML: 'limited',
    animations: 'basic'
  },
  
  // インフォメーション機能
  articles: {
    maxPerMonth: 100,
    categories: 'all',
    languages: ['ja', 'en', 'ko', 'zh', 'th'],
    aiTranslation: true
  },
  
  // レイアウト機能
  layouts: {
    maxLayouts: 25,
    templates: 'professional',
    customCSS: true,
    scheduling: true
  }
}
```

#### 3.3 エンタープライズプラン（¥139,800/月）
```typescript
const enterprisePlanLimits = {
  // UIエディタ機能
  widgets: {
    maxPerPage: 'unlimited',
    allowedTypes: 'all',
    customHTML: true,
    animations: 'advanced'
  },
  
  // インフォメーション機能
  articles: {
    maxPerMonth: 'unlimited',
    categories: 'all',
    languages: 'all-15',
    aiTranslation: true
  },
  
  // レイアウト機能
  layouts: {
    maxLayouts: 'unlimited',
    templates: 'enterprise',
    customCSS: true,
    scheduling: true,
    customWidgets: true
  }
}
```

### 4. 統合管理画面 🚧

#### 4.1 コンテンツ管理統合
```
/admin/content-management/
├── layouts/           # レイアウト管理
│   ├── index.vue     # レイアウト一覧
│   ├── create.vue    # レイアウト作成
│   └── [id]/edit.vue # レイアウト編集
├── articles/         # 記事管理
│   ├── index.vue     # 記事一覧
│   ├── create.vue    # 記事作成
│   └── [id]/edit.vue # 記事編集
├── widgets/          # ウィジェット管理
│   ├── index.vue     # ウィジェット一覧
│   └── custom.vue    # カスタムウィジェット
└── templates/        # テンプレート管理
    ├── index.vue     # テンプレート一覧
    └── create.vue    # テンプレート作成
```

#### 4.2 ワークフロー管理
- **承認フロー**: 支配人承認制
- **編集ロック**: 同時編集防止
- **版数管理**: 変更履歴追跡
- **プレビュー**: 公開前確認

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
  i18n: '@nuxtjs/i18n'
}

// 主要コンポーザブル
const composables = {
  'useWidgetEditor': 'ウィジェットエディタ管理',
  'useLayoutsApi': 'レイアウトAPI操作',
  'useLayoutsStore': 'レイアウト状態管理',
  'usePlanRestrictions': 'プラン制限管理',
  'useContentManagement': 'コンテンツ管理'
}
```

### バックエンド
```typescript
// API構造
const apiStructure = {
  // 統合コンテンツ管理
  '/api/v1/content-layouts/*': 'レイアウト・記事統合管理',
  
  // レイアウト管理
  '/api/v1/admin/layouts/*': 'レイアウト管理',
  
  // インフォメーション管理
  '/api/v1/admin/info/*': '記事管理',
  
  // ウィジェット管理
  '/api/v1/admin/widgets/*': 'ウィジェット管理',
  
  // 客室UI用
  '/api/v1/guest/info/*': '客室向け情報取得',
  '/api/v1/guest/layouts/*': '客室向けレイアウト取得'
}
```

### データベース
```sql
-- 主要テーブル
- Layout              -- レイアウト管理
- LayoutRevision      -- レイアウト版数管理
- LayoutAsset         -- レイアウト関連アセット
- InfoArticle         -- 記事管理
- InfoMediaFile       -- メディアファイル管理
- InfoTranslation     -- 翻訳管理
- ContentLayout       -- 統合コンテンツ管理（新規）
- ContentLayoutTranslation -- 統合翻訳管理（新規）
```

---

## 🚀 開発計画

### Phase 1: 統合基盤構築（2週間）
- [ ] **データモデル統合**
  - [ ] ContentLayoutモデル実装
  - [ ] 既存データ移行スクリプト
  - [ ] API統合設計

- [ ] **統合管理画面**
  - [ ] /admin/content-management/ 実装
  - [ ] レイアウト・記事統合UI
  - [ ] ワークフロー管理

### Phase 2: ウィジェットシステム強化（3週間）
- [ ] **高度ウィジェット**
  - [ ] チャートウィジェット
  - [ ] 地図ウィジェット
  - [ ] ソーシャルメディア埋め込み
  - [ ] 予約フォーム

- [ ] **カスタムウィジェット**
  - [ ] ウィジェット作成ツール
  - [ ] JavaScript実行環境
  - [ ] セキュリティ制御

### Phase 3: プラン制限システム（2週間）
- [ ] **制限ミドルウェア**
  - [ ] プラン別機能制限
  - [ ] 使用量監視
  - [ ] アップグレード誘導

- [ ] **課金システム統合**
  - [ ] Stripe連携
  - [ ] 使用量課金
  - [ ] 自動制限解除

### Phase 4: AIコンシェルジュ統合（2週間）
- [ ] **知識ベース統合**
  - [ ] 記事内容のベクトル化
  - [ ] 自動Q&A生成
  - [ ] 回答精度向上

- [ ] **多言語AI対応**
  - [ ] 15言語対応
  - [ ] 翻訳品質管理
  - [ ] 文脈理解向上

---

## 🔒 セキュリティ・パフォーマンス

### セキュリティ対策
```typescript
const securityMeasures = {
  // コンテンツセキュリティ
  xss: 'HTMLサニタイゼーション',
  csrf: 'CSRFトークン検証',
  injection: 'SQLインジェクション対策',
  
  // ファイルアップロード
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
  // フロントエンド
  codesplitting: 'コンポーネント分割',
  lazyLoading: '遅延読み込み',
  caching: 'ブラウザキャッシュ',
  
  // バックエンド
  dbOptimization: 'データベース最適化',
  apiCaching: 'APIレスポンスキャッシュ',
  cdnIntegration: 'CDN統合',
  
  // メディア
  imageOptimization: '画像最適化',
  videoCompression: '動画圧縮',
  lazyImageLoading: '画像遅延読み込み'
}
```

---

## 📊 KPI・測定指標

### 技術指標
- **エディタ使用率**: 月間アクティブユーザー数
- **ウィジェット使用統計**: 人気ウィジェットランキング
- **レスポンス時間**: API応答時間（目標: <200ms）
- **エラー率**: システムエラー発生率（目標: <0.1%）

### ビジネス指標
- **コンテンツ作成数**: 月間記事・レイアウト作成数
- **アップグレード率**: エコノミー→プロフェッショナル転換率
- **ユーザー満足度**: エディタ使いやすさ評価
- **サポート問い合わせ**: 機能関連問い合わせ数

---

## 🎯 今後の展開

### 短期目標（3ヶ月）
- [ ] 統合システム完成
- [ ] プラン制限システム稼働
- [ ] AIコンシェルジュ統合完了
- [ ] 多言語対応強化

### 中期目標（6ヶ月）
- [ ] カスタムウィジェット機能
- [ ] 高度なアニメーション
- [ ] A/Bテスト機能
- [ ] 詳細分析ダッシュボード

### 長期目標（12ヶ月）
- [ ] マーケットプレイス機能
- [ ] AI支援デザイン
- [ ] 外部システム連携
- [ ] 海外展開対応

---

## 📝 まとめ

インフォメーション・UIエディタ統合システムは、hotel-saasプロジェクトの核心機能として、単なる情報管理を超えた**高度なコンテンツ作成プラットフォーム**に発展しています。

### 開発方針
1. **既存実装の活用**: 85%完成のレイアウト機能を基盤とする
2. **段階的統合**: インフォメーション機能との段階的統合
3. **プラン別差別化**: 明確な機能制限によるアップセル促進
4. **AIコンシェルジュ統合**: 知識ベースとしての活用

### 成功要因
- **直感的UI**: 非技術者でも使いやすいインターフェース
- **豊富な機能**: 15種類のウィジェットと拡張可能性
- **プラン別価値**: 明確な機能差別化
- **継続的改善**: ユーザーフィードバックに基づく機能追加

この統合システムにより、hotel-saasは業界最高水準のコンテンツ管理プラットフォームとして差別化を図り、持続的な成長を実現します。 