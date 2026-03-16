# SSOT_DEV-0330_FAQ_KB_SYSTEM.md

**バージョン**: 1.0.0  
**最終更新**: 2026-01-23  
**ドキュメントID**: SSOT-GUEST-FAQKB-001  
**タスクID**: DEV-0330（親）, DEV-0331〜0334（サブタスク）

---

## 概要

- **目的**: よくある質問（FAQ）とナレッジベース（KB）を一元管理し、AIチャットの自動応答精度向上とスタッフの問い合わせ対応負荷軽減を実現する
- **適用範囲**: hotel-common（API/DB）、hotel-saas（管理UI/ゲストUI）
- **関連SSOT**:
  - `SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md`（FAQ自動応答）
  - `SSOT_GUEST_AI_HANDOFF.md`（ハンドオフ）
  - `SSOT_MARKETING_INTEGRATION.md`（Config First / Tracking by Default）

---

## 要件ID体系

- FAQ-001〜099: 機能要件
- FAQ-100〜199: 非機能要件
- FAQ-200〜299: UI/UX要件

---

## 機能要件（FR）

### FAQ-001: FAQ管理

- **説明**: FAQの作成・編集・削除・公開管理
- **Accept**:
  - 質問文、回答文、カテゴリ、タグを登録可能
  - 公開/非公開の切り替え
  - 表示順の設定
  - 多言語対応（Phase 2）

### FAQ-002: カテゴリ管理

- **説明**: FAQをカテゴリで整理
- **Accept**:
  - カテゴリの作成・編集・削除
  - カテゴリアイコン設定
  - カテゴリ表示順設定
  - デフォルトカテゴリ: 施設案内、サービス、周辺情報、トラブル対応

### FAQ-003: キーワード検索

- **説明**: 質問文・回答文・タグからFAQ検索
- **Accept**:
  - 部分一致検索
  - カテゴリフィルタ
  - 検索結果のハイライト表示

### FAQ-004: AIチャット連携

- **説明**: AIチャットがFAQを参照して自動応答
- **Accept**:
  - ゲストの質問に対してFAQから関連回答を検索
  - 一致度が高い場合は自動回答
  - 一致度が低い場合はハンドオフ提案
  - ディープリンクを回答に含める

### FAQ-005: 利用統計

- **説明**: FAQの利用状況を記録
- **Accept**:
  - FAQ表示回数
  - 「役に立った」評価
  - AI経由での表示回数
  - 検索キーワードログ

---

## 非機能要件（NFR）

### FAQ-100: パフォーマンス

- FAQ検索: 500ms以内
- FAQ一覧取得: 200ms以内

### FAQ-101: スケーラビリティ

- テナントあたり最大500件のFAQ
- カテゴリ最大20件

### FAQ-102: 可用性

- FAQデータはキャッシュ（Redis 5分TTL）
- DB障害時はキャッシュから返却

---

## API仕様

### エンドポイント一覧

**管理API**

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| GET | `/api/v1/admin/faq` | FAQ一覧取得 | Session認証 |
| POST | `/api/v1/admin/faq` | FAQ作成 | Session認証 |
| GET | `/api/v1/admin/faq/:id` | FAQ詳細取得 | Session認証 |
| PUT | `/api/v1/admin/faq/:id` | FAQ更新 | Session認証 |
| DELETE | `/api/v1/admin/faq/:id` | FAQ削除 | Session認証 |
| GET | `/api/v1/admin/faq/categories` | カテゴリ一覧 | Session認証 |
| POST | `/api/v1/admin/faq/categories` | カテゴリ作成 | Session認証 |
| PUT | `/api/v1/admin/faq/categories/:id` | カテゴリ更新 | Session認証 |
| DELETE | `/api/v1/admin/faq/categories/:id` | カテゴリ削除 | Session認証 |
| GET | `/api/v1/admin/faq/stats` | 統計情報取得 | Session認証 |

**ゲストAPI**

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| GET | `/api/v1/guest/faq` | 公開FAQ一覧 | デバイス認証 |
| GET | `/api/v1/guest/faq/search` | FAQ検索 | デバイス認証 |
| GET | `/api/v1/guest/faq/:id` | FAQ詳細 | デバイス認証 |
| POST | `/api/v1/guest/faq/:id/feedback` | フィードバック送信 | デバイス認証 |

**内部API（AIチャット用）**

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| POST | `/api/v1/internal/faq/match` | 質問マッチング | 内部認証 |

### リクエスト/レスポンス詳細

```json
// POST /api/v1/admin/faq
// Request
{
  "categoryId": "cat_facility",
  "question": "WiFiのパスワードを教えてください",
  "answer": "WiFiパスワードは「hotel2026」です。\\n\\n接続方法:\\n1. WiFi設定を開く\\n2. 「Hotel-Guest」を選択\\n3. パスワードを入力",
  "tags": ["wifi", "インターネット", "ネットワーク"],
  "deepLink": "/info/wifi",
  "isPublished": true,
  "sortOrder": 1
}

// Response
{
  "success": true,
  "data": {
    "id": "faq_wifi_001",
    "categoryId": "cat_facility",
    "question": "WiFiのパスワードを教えてください",
    "answer": "WiFiパスワードは「hotel2026」です...",
    "tags": ["wifi", "インターネット", "ネットワーク"],
    "deepLink": "/info/wifi",
    "isPublished": true,
    "sortOrder": 1,
    "viewCount": 0,
    "helpfulCount": 0,
    "createdAt": "2026-01-23T15:00:00+09:00"
  }
}

// POST /api/v1/internal/faq/match
// Request
{
  "query": "wifiの接続方法",
  "limit": 3
}

// Response
{
  "success": true,
  "data": {
    "matches": [
      {
        "faqId": "faq_wifi_001",
        "question": "WiFiのパスワードを教えてください",
        "answer": "WiFiパスワードは...",
        "score": 0.92,
        "deepLink": "/info/wifi"
      }
    ],
    "bestMatch": {
      "faqId": "faq_wifi_001",
      "score": 0.92,
      "isHighConfidence": true
    }
  }
}
```

---

## データベース設計

### Prismaスキーマ

```prisma
model FaqCategory {
  id          String   @id @default(cuid()) @map("id")
  tenantId    String   @map("tenant_id")
  name        String   @map("name")
  icon        String?  @map("icon")          // emoji or icon name
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  faqs        Faq[]
  
  @@index([tenantId], map: "idx_faq_categories_tenant")
  @@map("faq_categories")
}

model Faq {
  id          String      @id @default(cuid()) @map("id")
  tenantId    String      @map("tenant_id")
  categoryId  String      @map("category_id")
  question    String      @map("question")
  answer      String      @map("answer")       @db.Text
  tags        String[]    @map("tags")
  deepLink    String?     @map("deep_link")
  isPublished Boolean     @default(true) @map("is_published")
  sortOrder   Int         @default(0) @map("sort_order")
  viewCount   Int         @default(0) @map("view_count")
  helpfulCount Int        @default(0) @map("helpful_count")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  
  // Relations
  tenant      Tenant      @relation(fields: [tenantId], references: [id])
  category    FaqCategory @relation(fields: [categoryId], references: [id])
  
  @@index([tenantId, isPublished], map: "idx_faqs_tenant_published")
  @@index([categoryId], map: "idx_faqs_category")
  @@fulltext([question, answer, tags], map: "idx_faqs_search")
  @@map("faqs")
}

model FaqFeedback {
  id          String   @id @default(cuid()) @map("id")
  faqId       String   @map("faq_id")
  sessionId   String?  @map("session_id")
  isHelpful   Boolean  @map("is_helpful")
  comment     String?  @map("comment")
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@index([faqId], map: "idx_faq_feedback_faq")
  @@map("faq_feedbacks")
}
```

---

## UI/UX要件

### FAQ-200: 管理画面 - FAQ一覧

- パス: `/admin/faq`
- カテゴリタブ切り替え
- 検索バー
- 新規作成ボタン
- 一覧表示（質問、カテゴリ、公開状態、表示回数）
- ドラッグ&ドロップで並び替え

### FAQ-201: 管理画面 - FAQ編集

- 質問（必須）
- 回答（必須、Markdown対応）
- カテゴリ選択
- タグ入力（カンマ区切り or タグUI）
- ディープリンク入力
- 公開/非公開トグル
- プレビュー表示

### FAQ-202: ゲストUI - FAQブラウズ

- パス: `/faq`
- カテゴリ一覧（アイコン付き）
- カテゴリ内FAQ一覧
- アコーディオン形式で回答表示
- 「役に立ちましたか？」ボタン

### FAQ-203: ゲストUI - FAQ検索

- 検索バー（ヘッダーに常設）
- インクリメンタルサーチ
- 検索結果ハイライト
- 「見つかりませんでした」時はハンドオフ提案

---

## Config設定（Marketing Injection対応）

| 設定項目 | カテゴリ | キー | デフォルト値 |
|:---------|:---------|:-----|:------------|
| FAQ最大件数 | faq | max_faqs | 500 |
| カテゴリ最大数 | faq | max_categories | 20 |
| AI自動応答閾値 | faq | ai_match_threshold | 0.8 |
| キャッシュTTL秒 | faq | cache_ttl_seconds | 300 |

---

## Analytics追跡（Tracking by Default）

| イベント | analytics-id | 記録先 |
|:---------|:-------------|:-------|
| FAQ表示 | `faq-view` | DB必須 |
| FAQ検索 | `faq-search` | DB必須 |
| 役に立った | `faq-helpful-yes` | DB必須 |
| 役に立たなかった | `faq-helpful-no` | DB必須 |
| AI経由表示 | `faq-ai-shown` | DB必須 |

---

## 実装チェックリスト

### 🔴 MVP（DEV-0330スコープ）

- [ ] FaqCategory, Faq, FaqFeedback テーブル作成（マイグレーション）
- [ ] 管理API: FAQ CRUD実装
- [ ] 管理API: カテゴリCRUD実装
- [ ] ゲストAPI: FAQ一覧/詳細/検索実装
- [ ] 内部API: /faq/match 実装
- [ ] hotel-saas プロキシ実装
- [ ] 管理UI: FAQ一覧画面
- [ ] 管理UI: FAQ編集画面
- [ ] ゲストUI: FAQブラウズ画面
- [ ] AIチャットからのFAQ参照連携
- [ ] デフォルトFAQシードデータ

### 🟡 Phase 2

- [ ] 多言語対応
- [ ] 全文検索最適化（Elasticsearch等）
- [ ] FAQ利用レポート
- [ ] AI学習連携（低スコアFAQの改善提案）

---

## デフォルトFAQシードデータ

```typescript
const DEFAULT_FAQS = [
  {
    category: '施設案内',
    question: 'WiFiのパスワードを教えてください',
    answer: 'WiFiパスワードは客室内のカードに記載されています。\\n\\nネットワーク名: Hotel-Guest\\nパスワード: 各部屋のカードをご確認ください',
    tags: ['wifi', 'インターネット'],
    deepLink: '/info/wifi'
  },
  {
    category: '施設案内',
    question: 'チェックアウト時間は何時ですか？',
    answer: 'チェックアウト時間は11:00です。\\n\\nレイトチェックアウトをご希望の場合は、フロントデスクまでお問い合わせください。',
    tags: ['チェックアウト', '時間'],
    deepLink: null
  },
  {
    category: 'サービス',
    question: 'ルームサービスの営業時間は？',
    answer: 'ルームサービスは7:00〜23:00でご利用いただけます。\\n\\n深夜（23:00〜7:00）は軽食のみご提供しております。',
    tags: ['ルームサービス', '営業時間'],
    deepLink: '/menu'
  },
  // ... 追加
]
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-23 | 1.0.0 | 初版作成（DEV-0330: FAQ/KBシステム） |
