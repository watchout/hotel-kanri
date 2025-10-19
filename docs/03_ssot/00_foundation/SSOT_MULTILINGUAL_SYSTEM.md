# SSOT: 多言語化システム（Multilingual System）

**作成日**: 2025-10-07  
**バージョン**: 2.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🟢 中優先（Phase 3-4）  
**最終更新**: 2025-10-07（既存実装との整合性確保、API設計修正）

**関連SSOT**:
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_DATABASE_SCHEMA.md](./SSOT_DATABASE_SCHEMA.md) - データベーススキーマ統一
- [SSOT_SAAS_MENU_MANAGEMENT.md](../01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md) - メニュー管理（既存実装）

**関連ドキュメント**:
- [DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) - 命名規則
- [API_ROUTING_GUIDELINES.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md) - APIルーティング

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [アーキテクチャ設計](#アーキテクチャ設計)
5. [対応言語](#対応言語)
6. [既存実装状況と移行戦略](#既存実装状況と移行戦略)
7. [データベース設計](#データベース設計)
8. [翻訳エンジン（hotel-common）](#翻訳エンジンhotel-common)
9. [API設計](#api設計)
10. [システム固有層](#システム固有層)
11. [翻訳実行フロー](#翻訳実行フロー)
12. [パフォーマンス最適化](#パフォーマンス最適化)
13. [品質管理](#品質管理)
14. [コスト管理](#コスト管理)
15. [マイグレーション計画](#マイグレーション計画)
16. [実装チェックリスト](#実装チェックリスト)

---

## 📖 概要

### 目的
hotel-kanriシステム全体（hotel-saas、hotel-pms、hotel-member）で統一された多言語対応を実現し、インバウンド対応の核心機能として訪日外国人観光客への対応を自動化する。

### 基本方針
- **共通エンジン方式**: hotel-commonに多言語化エンジンを構築し、各システムから共通利用
- **統一翻訳テーブル**: 汎用translationsテーブルで全エンティティを管理
- **段階的移行**: 既存の`_ja`, `_en`カラムから翻訳テーブルへ段階的に移行
- **自動翻訳**: テキスト登録・作成時に15言語へ自動変換、バックグラウンド処理
- **コスト最適化**: 事前翻訳方式で97%のコスト削減（月¥5,000 → ¥150）

### 設計原則
1. **DRY原則**: 共通機能は1箇所のみ実装（hotel-common）
2. **既存実装の尊重**: 既存の`menu_items`, `menu_categories`等のテーブル構造を維持
3. **拡張性**: 15言語以上への拡張が容易
4. **パフォーマンス**: キャッシュ戦略による高速応答
5. **品質保証**: 翻訳品質スコアリング、レビュー機能
6. **運用性**: 翻訳進捗監視、コスト追跡

---

## 🎯 スコープ

### 対象システム
- ✅ **hotel-common**: 多言語化エンジン（Core）、共通API
- ✅ **hotel-saas**: システム固有層（メニュー、施設案内、AI応答）
- ✅ **hotel-pms**: システム固有層（予約情報、客室情報、レポート）
- ✅ **hotel-member**: システム固有層（会員特典、ポイント説明）

### 翻訳対象データ

#### Layer 1: 静的UIテキスト（i18nファイル）
- ボタン、ラベル、メッセージ
- エラーメッセージ、バリデーションメッセージ
- システムメッセージ

#### Layer 2: 動的コンテンツ（データベース）
- **hotel-saas**:
  - メニュー商品（名前、説明、アレルギー情報）
  - メニューカテゴリ（名前、説明）
  - 施設案内（名前、説明）
  - 観光情報、FAQ
- **hotel-pms**:
  - 客室グレード（名前）
  - 予約特別リクエスト
  - レポート出力
- **hotel-member**:
  - 会員特典説明
  - ポイントルール説明

#### Layer 3: AI生成テキスト（リアルタイム）
- AIコンシェルジュの応答
- 動的FAQ応答

---

## 🛠️ 技術スタック

### フロントエンド
- **Vue 3 + Nuxt 3**: フレームワーク
- **@nuxtjs/i18n**: 静的テキスト多言語化
- **TypeScript**: 型安全性

### バックエンド
- **hotel-common**: Express + TypeScript（多言語化エンジン）
- **hotel-saas**: Nuxt 3 Server（プロキシ）
- **hotel-pms**: Express + TypeScript
- **hotel-member**: FastAPI + Python

### データベース・キャッシュ
- **PostgreSQL**: 翻訳データ保存
- **Prisma**: ORM
- **Redis**: 翻訳キャッシュ

### 翻訳API
- **Google Cloud Translation API**: 自動翻訳
- **レート制限**: Bottleneck（同時10リクエスト、100ms間隔）

---

## 🏗️ アーキテクチャ設計

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                    hotel-common                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         多言語化エンジン (Core)                         │ │
│  │  - 翻訳データ管理（統一translationsテーブル）          │ │
│  │  - Google Translate API統合                            │ │
│  │  - キャッシュ管理（Redis）                             │ │
│  │  - フォーマット処理（日付、数値、通貨）                │ │
│  │  - 翻訳品質管理                                         │ │
│  │  - 翻訳ジョブ管理                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         共通API                                          │ │
│  │  GET  /api/v1/translations/entity                       │ │
│  │  POST /api/v1/translations/translate                    │ │
│  │  GET  /api/v1/translations/jobs/[jobId].get.ts         │ │
│  │  GET  /api/v1/translations/languages/list.get.ts       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  hotel-saas   │     │  hotel-pms    │     │ hotel-member  │
│               │     │               │     │               │
│ ┌───────────┐ │     │ ┌───────────┐ │     │ ┌───────────┐ │
│ │ SaaS固有  │ │     │ │ PMS固有   │ │     │ │Member固有 │ │
│ │ 多言語層  │ │     │ │ 多言語層  │ │     │ │ 多言語層  │ │
│ │           │ │     │ │           │ │     │ │           │ │
│ │- UI翻訳   │ │     │ │- UI翻訳   │ │     │ │- UI翻訳   │ │
│ │- メニュー │ │     │ │- 予約情報 │ │     │ │- 顧客情報 │ │
│ │- 施設案内 │ │     │ │- 客室情報 │ │     │ │- 会員特典 │ │
│ │- AI応答   │ │     │ │- レポート │ │     │ │- ポイント │ │
│ └───────────┘ │     │ └───────────┘ │     │ └───────────┘ │
└───────────────┘     └───────────────┘     └───────────────┘
```

### 3層アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: 静的UIテキスト（i18nファイル）              │
│ - ボタン、ラベル、メッセージ等                       │
│ - ビルド時に含まれる                                 │
│ - 開発者が管理                                       │
│ - ファイル: locales/{lang}/common.json               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: 動的コンテンツ（データベース）              │
│ - メニュー商品、施設案内等                           │
│ - 管理画面で編集可能                                 │
│ - 自動翻訳対応                                       │
│ - テーブル: translations（統一テーブル）             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: AI生成テキスト（リアルタイム）              │
│ - AIコンシェルジュの応答                             │
│ - 動的に生成                                         │
│ - 言語別プロンプト                                   │
│ - API: OpenAI GPT-4o                                 │
└─────────────────────────────────────────────────────┘
```

---

## 🌐 対応言語

### 対応言語一覧（15言語）

| コード | 言語名 | ネイティブ名 | フラグ | 優先度 |
|--------|--------|-------------|--------|--------|
| `ja` | 日本語 | 日本語 | 🇯🇵 | ベース言語 |
| `en` | 英語 | English | 🇺🇸 | 必須 |
| `ko` | 韓国語 | 한국어 | 🇰🇷 | 高 |
| `zh-CN` | 中国語（簡体字） | 简体中文 | 🇨🇳 | 高 |
| `zh-TW` | 中国語（繁体字） | 繁體中文 | 🇹🇼 | 高 |
| `th` | タイ語 | ไทย | 🇹🇭 | 中 |
| `vi` | ベトナム語 | Tiếng Việt | 🇻🇳 | 中 |
| `id` | インドネシア語 | Bahasa Indonesia | 🇮🇩 | 中 |
| `ms` | マレー語 | Bahasa Melayu | 🇲🇾 | 中 |
| `tl` | フィリピン語 | Filipino | 🇵🇭 | 中 |
| `es` | スペイン語 | Español | 🇪🇸 | 低 |
| `fr` | フランス語 | Français | 🇫🇷 | 低 |
| `de` | ドイツ語 | Deutsch | 🇩🇪 | 低 |
| `it` | イタリア語 | Italiano | 🇮🇹 | 低 |
| `pt` | ポルトガル語 | Português | 🇵🇹 | 低 |

### フォールバック戦略

```
現在の言語 → 英語 (en) → 日本語 (ja) → [Translation Missing]
```

**例**:
- ユーザーが韓国語を選択
- 韓国語翻訳がない場合 → 英語を表示
- 英語翻訳もない場合 → 日本語を表示
- 日本語もない場合 → `[Translation Missing]`

---

## 📊 既存実装状況と移行戦略

### 既存実装の確認

#### ✅ 既存の多言語カラム

| テーブル | 英語カラム | 実装状況 |
|---------|-----------|---------|
| **menu_items** | `name_ja`, `name_en`, `description_ja`, `description_en` | ✅ 実装済み |
| **menu_categories** | `name_ja`, `name_en`, `description_ja`, `description_en` | ✅ 実装済み |
| **room_grades** | `grade_name_en` | ✅ 実装済み |

**参照**: [SSOT_SAAS_MENU_MANAGEMENT.md](../01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md)

### 移行戦略の決定

#### ❌ 旧方式（非推奨）
```sql
-- 各テーブルに言語別カラムを追加
ALTER TABLE menu_items ADD COLUMN name_ko TEXT;
ALTER TABLE menu_items ADD COLUMN name_zh_cn TEXT;
-- ... 15言語 × 複数フィールド = カラム数爆発
```

**問題点**:
- 言語追加時にスキーマ変更が必要
- カラム数が爆発（15言語 × 複数フィールド）
- NULL値が多い
- 拡張性がない
- バックグラウンド翻訳の実装が各テーブルごとに必要

#### ✅ 新方式（推奨）
```sql
-- 統一翻訳テーブルで全エンティティを管理
CREATE TABLE translations (
  entity_type TEXT NOT NULL,  -- エンティティタイプ（例）:
                              -- - menu_item (メニュー商品)
                              -- - menu_category (メニューカテゴリ)
                              -- - room_grade (客室グレード)
                              -- - ai_knowledge_base_item (AI知識ベース項目)
                              -- - order_item (注文アイテム - スナップショット用)
                              -- ※ 各システムで必要なエンティティタイプを追加可能
  entity_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  field_name TEXT NOT NULL,   -- 'name', 'description', 'grade_name', etc.
  translated_text TEXT NOT NULL,
  ...
);
```

**メリット**:
- 言語追加時にスキーマ変更不要
- 翻訳エンジン1箇所で完結
- 品質管理・レビューが統一
- 全翻訳の進捗・コストを一元管理

### 段階的移行計画

```
Phase 1: 翻訳テーブル作成（1週間）
  ├─ translationsテーブル作成
  ├─ translation_jobsテーブル作成
  └─ 翻訳エンジン実装

Phase 2: 既存データ移行（1週間）
  ├─ menu_items の name_ja/en → translations
  ├─ menu_categories の name_ja/en → translations
  └─ room_grades の grade_name_en → translations

Phase 3: 既存カラム非推奨化（2-3週間）
  ├─ 既存カラムにDEPRECATEDコメント追加
  ├─ 新規開発では翻訳テーブルのみ使用
  └─ 既存データは維持（削除しない）

Phase 4: 15言語拡張（2-3週間）
  ├─ 残り13言語の自動翻訳実行
  ├─ 全言語での表示確認
  └─ パフォーマンス最適化

Phase 5: 既存カラム削除（3-6ヶ月後）
  └─ 十分な移行期間後に既存カラムを削除
```

---

## 🗄️ データベース設計

### 設計方針

**採用方式**: 統一翻訳テーブル方式
- **全エンティティ**: 汎用translationsテーブルで一元管理
- **理由**: バックグラウンド翻訳の一元化、品質管理の統一、拡張性

### 統一翻訳テーブル

```sql
-- ========================================
-- 統一翻訳テーブル（全エンティティ対応）
-- ========================================

CREATE TABLE translations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,     -- エンティティタイプ:
                                 -- 'menu_item', 'menu_category', 'room_grade', 
                                 -- 'ai_knowledge_base_item', 'order_item', 'faq', etc.
  entity_id TEXT NOT NULL,        -- 対象レコードのID（文字列化）
  language_code TEXT NOT NULL,    -- 'ja', 'en', 'ko', 'zh-CN', ...
  field_name TEXT NOT NULL,       -- 'name', 'description', 'grade_name', etc.
  translated_text TEXT NOT NULL,
  
  -- メタデータ
  translation_method TEXT DEFAULT 'auto',  -- auto, manual, reviewed, professional
  quality_score REAL,                      -- 0.0-1.0
  reviewed_by TEXT,                        -- staff_id
  reviewed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id, language_code, field_name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_translations_entity ON translations(entity_type, entity_id);
CREATE INDEX idx_translations_lang ON translations(language_code);
CREATE INDEX idx_translations_entity_lang ON translations(entity_type, entity_id, language_code);
CREATE INDEX idx_translations_tenant ON translations(tenant_id);
CREATE INDEX idx_translations_quality ON translations(quality_score);

COMMENT ON TABLE translations IS '統一翻訳テーブル - 全エンティティの多言語テキストを管理';
COMMENT ON COLUMN translations.entity_type IS 'エンティティタイプ（menu_item, menu_category, room_grade, ai_knowledge_base_item, order_item等）';
COMMENT ON COLUMN translations.entity_id IS '対象レコードのID（Int型は文字列化）';
COMMENT ON COLUMN translations.field_name IS 'フィールド名（name, description等）';
```

### 翻訳ジョブ管理テーブル

```sql
-- ========================================
-- 翻訳ジョブ管理（バックグラウンド処理）
-- ========================================

CREATE TABLE translation_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_language TEXT DEFAULT 'ja',
  target_languages TEXT[] NOT NULL,  -- ['en', 'ko', 'zh-CN', ...]
  fields TEXT[] NOT NULL,            -- ['name', 'description']
  status TEXT DEFAULT 'pending',     -- pending, processing, completed, failed, partial
  total_tasks INTEGER NOT NULL,
  completed_tasks INTEGER DEFAULT 0,
  failed_tasks INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_status ON translation_jobs(status);
CREATE INDEX idx_jobs_target ON translation_jobs(entity_type, entity_id);
CREATE INDEX idx_jobs_tenant ON translation_jobs(tenant_id, created_at);
```

### 翻訳コスト追跡テーブル

```sql
-- ========================================
-- 翻訳コスト追跡（Google Translate API）
-- ========================================

CREATE TABLE translation_cost_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  job_id TEXT,
  language_code TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  estimated_cost REAL NOT NULL,  -- USD
  actual_cost REAL,              -- 実際のAPI課金額
  api_provider TEXT DEFAULT 'google',  -- google, deepl, openai
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES translation_jobs(id)
);

CREATE INDEX idx_cost_logs_tenant_date ON translation_cost_logs(tenant_id, created_at);
CREATE INDEX idx_cost_logs_job ON translation_cost_logs(job_id);
```

### 翻訳履歴テーブル

```sql
-- ========================================
-- 翻訳履歴（バージョン管理）
-- ========================================

CREATE TABLE translation_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id TEXT NOT NULL,
  previous_text TEXT NOT NULL,
  new_text TEXT NOT NULL,
  changed_by TEXT NOT NULL,  -- staff_id
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE CASCADE
);

CREATE INDEX idx_translation_history_id ON translation_history(translation_id);
CREATE INDEX idx_translation_history_date ON translation_history(created_at);
```

### Prismaスキーマ

```prisma
// ========================================
// hotel-common/prisma/schema.prisma
// ========================================

model Translation {
  id                String    @id @default(uuid())
  tenantId          String    @map("tenant_id")
  entityType        String    @map("entity_type")
  entityId          String    @map("entity_id")
  languageCode      String    @map("language_code")
  fieldName         String    @map("field_name")
  translatedText    String    @map("translated_text")
  translationMethod String    @default("auto") @map("translation_method")
  qualityScore      Float?    @map("quality_score")
  reviewedBy        String?   @map("reviewed_by")
  reviewedAt        DateTime? @map("reviewed_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  tenant  Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  history TranslationHistory[]
  
  @@unique([entityType, entityId, languageCode, fieldName])
  @@index([entityType, entityId])
  @@index([languageCode])
  @@index([tenantId])
  @@index([qualityScore])
  @@map("translations")
}

model TranslationJob {
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")
  entityType      String    @map("entity_type")
  entityId        String    @map("entity_id")
  sourceLanguage  String    @default("ja") @map("source_language")
  targetLanguages String[]  @map("target_languages")
  fields          String[]
  status          String    @default("pending")
  totalTasks      Int       @map("total_tasks")
  completedTasks  Int       @default(0) @map("completed_tasks")
  failedTasks     Int       @default(0) @map("failed_tasks")
  errorDetails    Json?     @map("error_details")
  startedAt       DateTime? @map("started_at")
  completedAt     DateTime? @map("completed_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  
  tenant   Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  costLogs TranslationCostLog[]
  
  @@index([status])
  @@index([entityType, entityId])
  @@index([tenantId, createdAt])
  @@map("translation_jobs")
}

model TranslationCostLog {
  id             String   @id @default(uuid())
  tenantId       String   @map("tenant_id")
  jobId          String?  @map("job_id")
  languageCode   String   @map("language_code")
  characterCount Int      @map("character_count")
  estimatedCost  Float    @map("estimated_cost")
  actualCost     Float?   @map("actual_cost")
  apiProvider    String   @default("google") @map("api_provider")
  createdAt      DateTime @default(now()) @map("created_at")
  
  tenant Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  job    TranslationJob? @relation(fields: [jobId], references: [id])
  
  @@index([tenantId, createdAt])
  @@index([jobId])
  @@map("translation_cost_logs")
}

model TranslationHistory {
  id            String   @id @default(uuid())
  translationId String   @map("translation_id")
  previousText  String   @map("previous_text")
  newText       String   @map("new_text")
  changedBy     String   @map("changed_by")
  changeReason  String?  @map("change_reason")
  createdAt     DateTime @default(now()) @map("created_at")
  
  translation Translation @relation(fields: [translationId], references: [id], onDelete: Cascade)
  
  @@index([translationId])
  @@index([createdAt])
  @@map("translation_history")
}
```

---

## ⚙️ 翻訳エンジン（hotel-common）

### TranslationEngine クラス

**ファイル**: `hotel-common/src/services/i18n/TranslationEngine.ts`

```typescript
export interface TranslationConfig {
  supportedLanguages: string[]
  defaultLanguage: string
  fallbackLanguage: string
  cacheEnabled: boolean
  cacheTTL: number
}

export class TranslationEngine {
  private prisma: PrismaClient
  private translate: Translate
  private redis: Redis
  private config: TranslationConfig
  
  constructor(config: TranslationConfig)
  
  /**
   * 翻訳取得（フォールバック対応）
   */
  async getTranslation(
    entityType: string,
    entityId: string,
    languageCode: string,
    fieldName: string
  ): Promise<string | null>
  
  /**
   * エンティティの全フィールド翻訳を取得
   */
  async getEntityTranslations(
    entityType: string,
    entityId: string,
    languageCode: string
  ): Promise<Record<string, string>>
  
  /**
   * 一括翻訳実行（バックグラウンドジョブ作成）
   */
  async translateEntity(
    entityType: string,
    entityId: string,
    sourceLanguage: string,
    sourceTexts: Record<string, string>,
    targetLanguages: string[]
  ): Promise<string>  // jobId
  
  /**
   * フォーマット処理
   */
  formatDate(date: Date, languageCode: string, format: 'short' | 'long'): string
  formatPrice(amount: number, languageCode: string, currency: string): string
  formatNumber(value: number, languageCode: string, decimals: number): string
}
```

---

## 🌐 API設計

### API設計原則

**遵守ルール**: [API_ROUTING_GUIDELINES.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md)

#### ❌ 禁止パターン
```
❌ GET /api/v1/translations/:entityType/:entityId
   理由: 動的パス2階層（Nuxt 3 / Nitro制約違反）
```

#### ✅ 推奨パターン
```
✅ GET /api/v1/translations/entity?type=menu_item&id=123&lang=ko
   理由: クエリパラメータ活用、フラット構造
```

### 共通API仕様

**ベースURL**: `http://localhost:3400/api/v1/translations`

#### 1. エンティティの翻訳を取得

```
GET /api/v1/translations/entity?type={entityType}&id={entityId}&lang={languageCode}
```

**リクエスト例**:
```bash
GET /api/v1/translations/entity?type=menu_item&id=123&lang=ko
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "name": "특제 함박 스테이크",
    "description": "국산 소고기 100% 사용의 특제 함박. 데미글라스 소스와의 궁합이 발군입니다.",
    "allergen_info": "밀, 계란, 유제품"
  }
}
```

#### 2. 翻訳を実行

```
POST /api/v1/translations/translate
```

**リクエストボディ**:
```json
{
  "entityType": "menu_item",
  "entityId": "123",
  "sourceLanguage": "ja",
  "sourceTexts": {
    "name": "特製ハンバーグステーキ",
    "description": "国産牛100%使用の特製ハンバーグ。デミグラスソースとの相性抜群です。",
    "allergen_info": "小麦、卵、乳製品"
  },
  "targetLanguages": ["en", "ko", "zh-CN", "zh-TW", "th", "vi", "id", "ms", "tl", "es", "fr", "de", "it", "pt"]
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123"
  }
}
```

#### 3. 翻訳ジョブの進捗を取得

```
GET /api/v1/translations/jobs/[jobId].get.ts
```

**ファイル名**: `hotel-common/src/routes/translations/jobs/[jobId].get.ts`

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "processing",
    "totalTasks": 42,
    "completedTasks": 28,
    "failedTasks": 0,
    "progress": 66.7
  }
}
```

#### 4. 対応言語一覧を取得

```
GET /api/v1/translations/languages/list.get.ts
```

**ファイル名**: `hotel-common/src/routes/translations/languages/list.get.ts`

**レスポンス**:
```json
{
  "success": true,
  "data": [
    { "code": "ja", "name": "日本語", "nativeName": "日本語", "flag": "🇯🇵" },
    { "code": "en", "name": "英語", "nativeName": "English", "flag": "🇺🇸" },
    ...
  ]
}
```

---

## 🔧 システム固有層

### hotel-saas: Composable

**ファイル**: `hotel-saas/composables/useI18n.ts`

```typescript
export const useI18n = () => {
  const { locale, t, setLocale } = useNuxtI18n()
  
  /**
   * データベースの翻訳を取得（hotel-common経由）
   */
  const getEntityTranslation = async (
    entityType: string,
    entityId: string,
    fieldName: string
  ): Promise<string> => {
    const response = await $fetch(
      'http://localhost:3400/api/v1/translations/entity',
      { 
        params: { 
          type: entityType,
          id: entityId,
          lang: locale.value 
        } 
      }
    )
    
    return response.success ? response.data[fieldName] || `[${fieldName}]` : `[${fieldName}]`
  }
  
  /**
   * メニュー商品の翻訳を取得（SaaS固有）
   */
  const getMenuItemTranslation = async (
    itemId: string,
    fieldName: 'name' | 'description' | 'allergen_info'
  ): Promise<string> => {
    return getEntityTranslation('menu_item', itemId, fieldName)
  }
  
  return {
    locale,
    t,
    setLocale,
    getEntityTranslation,
    getMenuItemTranslation
  }
}
```

### hotel-pms: Service

**ファイル**: `hotel-pms/src/services/i18n/PMSTranslationService.ts`

```typescript
export class PMSTranslationService {
  private commonApiUrl: string
  
  constructor() {
    this.commonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
  }
  
  /**
   * 客室グレードの翻訳を取得（PMS固有）
   */
  async getRoomGradeTranslation(
    gradeId: string,
    fieldName: 'grade_name',
    languageCode: string
  ): Promise<string> {
    const response = await axios.get(
      `${this.commonApiUrl}/api/v1/translations/entity`,
      { 
        params: { 
          type: 'room_grade',
          id: gradeId,
          lang: languageCode 
        } 
      }
    )
    
    return response.data.data[fieldName] || ''
  }
}
```

### hotel-member: Service

**ファイル**: `hotel-member/app/services/i18n/translation_service.py`

```python
class MemberTranslationService:
    def __init__(self):
        self.common_api_url = os.getenv('HOTEL_COMMON_API_URL', 'http://localhost:3400')
    
    async def get_member_benefit_translation(
        self,
        benefit_id: str,
        field_name: str,
        language_code: str
    ) -> str:
        """会員特典の翻訳を取得（Member固有）"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.common_api_url}/api/v1/translations/entity",
                params={
                    "type": "member_benefit",
                    "id": benefit_id,
                    "lang": language_code
                }
            )
            data = response.json()
            return data.get('data', {}).get(field_name, '')
```

---

## 🔄 翻訳実行フロー

### 1. 管理画面での登録フロー

```
1. スタッフがメニュー商品を登録（日本語）
   ↓
2. hotel-saas: POST /api/v1/admin/menu/items
   - name_ja, description_ja, allergen_info_ja
   - autoTranslate: true  // ← camelCase（API/JSON標準）
   ↓
3. hotel-common: メニュー商品を作成
   - menu_items テーブルに保存
   - translations テーブルに日本語を保存
     entity_type='menu_item', entity_id='123', language_code='ja'
   ↓
4. hotel-common: 翻訳ジョブを作成
   - translation_jobs テーブルに保存
   - status: 'pending'
   ↓
5. hotel-common: バックグラウンドで翻訳実行
   - Google Translate API呼び出し（14言語 × 3フィールド = 42タスク）
   - translations テーブルに保存
   - translation_cost_logs テーブルにコスト記録
   ↓
6. hotel-common: 翻訳完了
   - translation_jobs.status = 'completed'
   ↓
7. hotel-saas: SSEで進捗通知
   - リアルタイムで進捗を表示
   - 完了時にトースト通知
```

### 2. 客室端末での表示フロー

```
1. ゲストが言語を選択（例: 韓国語）
   ↓
2. hotel-saas: メニュー一覧を取得
   GET /api/v1/guest/menu/items?lang=ko
   ↓
3. hotel-common: 翻訳データを取得
   - menu_items + translations (entity_type='menu_item', language_code='ko')
   - Redisキャッシュから取得（キャッシュヒット時）
   ↓
4. hotel-saas: 表示
   - 韓国語の商品名・説明を表示
   - 翻訳がない場合は英語 → 日本語フォールバック
```

---

## ⚡ パフォーマンス最適化

### キャッシュ戦略

```typescript
// server/utils/translation-cache.ts
export class TranslationCache {
  static async getTranslations(
    entityType: string,
    entityId: string,
    language: string
  ) {
    const cacheKey = `translations:${entityType}:${entityId}:${language}`
    
    // 1. キャッシュチェック（Redis）
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }
    
    // 2. データベースから取得
    const translations = await prisma.translation.findMany({
      where: {
        entityType,
        entityId,
        languageCode: language
      }
    })
    
    // 3. キャッシュに保存（TTL: 1時間）
    await redis.setex(cacheKey, 3600, JSON.stringify(translations))
    
    return translations
  }
  
  static async invalidate(entityType: string, entityId: string) {
    const languages = ['ja', 'en', 'ko', 'zh-CN', 'zh-TW', /* ... */]
    const keys = languages.map(lang => 
      `translations:${entityType}:${entityId}:${lang}`
    )
    
    await redis.del(...keys)
  }
}
```

### データベースインデックス最適化

```sql
-- 翻訳取得の高速化
CREATE INDEX idx_translations_entity_lang ON translations(entity_type, entity_id, language_code);

-- 検索の高速化（全文検索インデックス）
CREATE INDEX idx_translations_text_fts ON translations USING gin(to_tsvector('simple', translated_text));
```

---

## 🎯 品質管理

### 翻訳品質スコアリング

```typescript
// server/utils/translation-quality.ts
export const calculateQualityScore = (
  sourceText: string,
  translatedText: string,
  targetLang: string
): number => {
  let score = 1.0
  
  // 基本チェック
  if (!translatedText || translatedText.length === 0) return 0
  
  // 長さの比率チェック
  const lengthRatio = translatedText.length / sourceText.length
  if (lengthRatio < 0.3 || lengthRatio > 3.0) {
    score -= 0.3
  }
  
  // 元のテキストがそのまま残っている場合
  if (translatedText === sourceText) {
    score -= 0.5
  }
  
  // 特殊文字のみの場合
  if (/^[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]+$/.test(translatedText)) {
    score -= 0.4
  }
  
  return Math.max(0, Math.min(1, score))
}
```

---

## 💰 コスト管理

### Google Translate API コスト

**料金**: $20 per 1M characters

**計算例**:
```
メニュー商品1件:
- 商品名: 20文字
- 説明: 100文字
- アレルギー情報: 20文字
合計: 140文字

14言語 × 140文字 = 1,960文字
1,960文字 × $0.00002 = $0.0392 (約¥6)

100商品 × ¥6 = ¥600
月間推定コスト: ¥150（新規商品が月25件の場合）
```

---

## 🔄 マイグレーション計画

### Phase 1: 翻訳テーブル作成（1週間）

```sql
-- ========================================
-- マイグレーション: 翻訳テーブル作成
-- ========================================

BEGIN;

-- 1. translationsテーブル作成
CREATE TABLE translations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  field_name TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  translation_method TEXT DEFAULT 'auto',
  quality_score REAL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id, language_code, field_name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_translations_entity ON translations(entity_type, entity_id);
CREATE INDEX idx_translations_lang ON translations(language_code);
CREATE INDEX idx_translations_entity_lang ON translations(entity_type, entity_id, language_code);
CREATE INDEX idx_translations_tenant ON translations(tenant_id);
CREATE INDEX idx_translations_quality ON translations(quality_score);

-- 2. translation_jobsテーブル作成
CREATE TABLE translation_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_language TEXT DEFAULT 'ja',
  target_languages TEXT[] NOT NULL,
  fields TEXT[] NOT NULL,
  status TEXT DEFAULT 'pending',
  total_tasks INTEGER NOT NULL,
  completed_tasks INTEGER DEFAULT 0,
  failed_tasks INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_status ON translation_jobs(status);
CREATE INDEX idx_jobs_target ON translation_jobs(entity_type, entity_id);
CREATE INDEX idx_jobs_tenant ON translation_jobs(tenant_id, created_at);

-- 3. translation_cost_logsテーブル作成
CREATE TABLE translation_cost_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  job_id TEXT,
  language_code TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  estimated_cost REAL NOT NULL,
  actual_cost REAL,
  api_provider TEXT DEFAULT 'google',
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES translation_jobs(id)
);

CREATE INDEX idx_cost_logs_tenant_date ON translation_cost_logs(tenant_id, created_at);
CREATE INDEX idx_cost_logs_job ON translation_cost_logs(job_id);

-- 4. translation_historyテーブル作成
CREATE TABLE translation_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id TEXT NOT NULL,
  previous_text TEXT NOT NULL,
  new_text TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE CASCADE
);

CREATE INDEX idx_translation_history_id ON translation_history(translation_id);
CREATE INDEX idx_translation_history_date ON translation_history(created_at);

COMMIT;
```

### Phase 2: 既存データ移行（1週間）

```sql
-- ========================================
-- マイグレーション: 既存データを翻訳テーブルへ移行
-- ========================================

BEGIN;

-- 1. menu_items の name_ja, name_en を移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'menu_item',
  id::TEXT,
  'ja',
  'name',
  name_ja,
  'manual'
FROM menu_items
WHERE name_ja IS NOT NULL;

INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'menu_item',
  id::TEXT,
  'en',
  'name',
  name_en,
  'manual'
FROM menu_items
WHERE name_en IS NOT NULL;

-- 2. menu_items の description_ja, description_en を移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'menu_item',
  id::TEXT,
  'ja',
  'description',
  description_ja,
  'manual'
FROM menu_items
WHERE description_ja IS NOT NULL;

INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'menu_item',
  id::TEXT,
  'en',
  'description',
  description_en,
  'manual'
FROM menu_items
WHERE description_en IS NOT NULL;

-- 3. menu_categories を同様に移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'menu_category',
  id::TEXT,
      'ja',
  'name',
  name_ja,
  'manual'
FROM menu_categories
WHERE name_ja IS NOT NULL;

INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'menu_category',
  id::TEXT,
  'en',
  'name',
  name_en,
  'manual'
FROM menu_categories
WHERE name_en IS NOT NULL;

-- 4. room_grades の grade_name_en を移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  tenant_id,
  'room_grade',
  id::TEXT,
  'en',
  'grade_name',
  grade_name_en,
  'manual'
FROM room_grades
WHERE grade_name_en IS NOT NULL;

COMMIT;
```

### Phase 3: 既存カラム非推奨化（2-3週間）

```sql
-- ========================================
-- 既存カラムにDEPRECATEDコメント追加
-- ========================================

COMMENT ON COLUMN menu_items.name_ja IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください（entity_type=menu_item, field_name=name, language_code=ja）';
COMMENT ON COLUMN menu_items.name_en IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください（entity_type=menu_item, field_name=name, language_code=en）';
COMMENT ON COLUMN menu_items.description_ja IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください（entity_type=menu_item, field_name=description, language_code=ja）';
COMMENT ON COLUMN menu_items.description_en IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください（entity_type=menu_item, field_name=description, language_code=en）';

-- menu_categories も同様
COMMENT ON COLUMN menu_categories.name_ja IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください';
COMMENT ON COLUMN menu_categories.name_en IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください';
COMMENT ON COLUMN menu_categories.description_ja IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください';
COMMENT ON COLUMN menu_categories.description_en IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください';

-- room_grades も同様
COMMENT ON COLUMN room_grades.grade_name_en IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください';
```

### Phase 4: 15言語拡張（2-3週間）

バックグラウンドで既存データの残り13言語への翻訳を実行

### Phase 5: 既存カラム削除（3-6ヶ月後）

```sql
-- ========================================
-- 既存カラム削除（十分な移行期間後）
-- ========================================

BEGIN;

ALTER TABLE menu_items 
  DROP COLUMN name_ja,
  DROP COLUMN name_en,
  DROP COLUMN description_ja,
  DROP COLUMN description_en;

ALTER TABLE menu_categories
  DROP COLUMN name_ja,
  DROP COLUMN name_en,
  DROP COLUMN description_ja,
  DROP COLUMN description_en;

ALTER TABLE room_grades
  DROP COLUMN grade_name_en;

COMMIT;
```

---

## ✅ 実装チェックリスト

### hotel-common
- [ ] TranslationEngineクラス実装
- [ ] 共通API実装（entity, translate, jobs, languages）
- [ ] Google Translate API統合
- [ ] Redisキャッシュ実装
- [ ] 翻訳ジョブ管理
- [ ] コスト追跡機能
- [ ] 品質スコアリング

### hotel-saas
- [ ] @nuxtjs/i18n設定
- [ ] 翻訳ファイル作成（15言語）
- [ ] useI18n composable実装
- [ ] LanguageSwitcherコンポーネント
- [ ] メニュー管理画面の多言語入力UI
- [ ] 翻訳進捗表示UI
- [ ] 客室端末の言語切り替え

### hotel-pms
- [ ] PMSTranslationService実装
- [ ] 客室グレードの多言語対応
- [ ] 予約情報の多言語対応
- [ ] レポート出力の多言語対応

### hotel-member
- [ ] MemberTranslationService実装
- [ ] 会員特典の多言語対応
- [ ] ポイント説明の多言語対応

### データベース
- [ ] translationsテーブル作成
- [ ] translation_jobsテーブル作成
- [ ] translation_cost_logsテーブル作成
- [ ] translation_historyテーブル作成
- [ ] インデックス作成
- [ ] 既存データ移行スクリプト実行

### テスト
- [ ] 各言語での表示確認
- [ ] 言語切り替えのE2Eテスト
- [ ] 翻訳API統合テスト
- [ ] キャッシュ動作確認
- [ ] パフォーマンステスト

---

## 🎯 成功基準

### 機能要件
- ✅ 15言語完全対応
- ✅ 自動翻訳（バックグラウンド処理）
- ✅ 翻訳品質スコアリング
- ✅ 翻訳進捗のリアルタイム表示
- ✅ コスト追跡・予算管理

### 非機能要件
- ✅ 翻訳取得: 50ms以内（キャッシュヒット時）
- ✅ 翻訳実行: 1-2分以内（14言語 × 3フィールド）
- ✅ 月間コスト: ¥150/店舗以内
- ✅ キャッシュヒット率: 90%以上

### 品質要件
- ✅ 翻訳品質スコア: 平均0.8以上
- ✅ 低品質翻訳の検出・通知
- ✅ 翻訳履歴管理（バージョン管理）

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 2.0.0 | 2025-10-07 | **大幅改訂**<br>- 既存実装（menu_items, menu_categories, room_grades）との整合性確保<br>- 統一翻訳テーブル方式への変更<br>- API設計をAPI_ROUTING_GUIDELINES.md準拠に修正<br>- 段階的移行計画の追加<br>- 既存_ja, _enカラムからの移行戦略明記<br>- ドキュメント長を1300行に削減（実装ガイドは別ドキュメント化推奨） |
| 1.1.0 | 2025-10-07 | 他機能実装時の必須ルール追加 |
| 1.0.0 | 2025-10-07 | 初版作成 |

---

**作成者**: Iza（統合管理者）  
**承認者**: -  
**次回レビュー予定**: Phase 1実装開始時

---

## 📚 関連ドキュメント

### 実装ガイド（別ドキュメント推奨）
以下の内容は別ドキュメント `MULTILINGUAL_IMPLEMENTATION_GUIDE.md` として分離することを推奨：

- UI/UX考慮事項（テキスト長変動、RTL対応、フォント最適化）
- フォーマット処理（日付、数値、通貨）
- 検索・ソート（多言語全文検索）
- 通知・メール（多言語対応）
- SEO対応（hreflangタグ等）
- 他機能実装時の必須ルール（詳細版）
- よくある間違いと修正方法
- トラブルシューティング

### 参照
- [SSOT_SAAS_MENU_MANAGEMENT.md](../01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md) - 既存menu_items実装
- [DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) - 命名規則
- [API_ROUTING_GUIDELINES.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md) - APIルーティング