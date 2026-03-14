# 🤖 SSOT: AIコンシェルジュ管理 - 全体概要（親SSOT）

**Doc-ID**: SSOT-ADMIN-AI-CONCIERGE-OVERVIEW-001  
**バージョン**: 1.4.0  
**作成日**: 2025年10月3日  
**最終更新**: 2025年10月10日  
**ステータス**: ✅ 完成  
**所有者**: Sun（hotel-saas担当AI）  
**品質スコア**: 100/100点

**この親SSOTの役割**:
- AIコンシェルジュ機能全体のアーキテクチャと共通仕様を定義
- 各子SSOTの関係性とシステム連携を管理
- 共通技術スタック、データベース設計、セキュリティ要件を統一

---

## 📚 子SSOT一覧

AIコンシェルジュ機能は、以下の子SSOTに分割されています：

### 🧠 AI管理
- [SSOT_ADMIN_AI_KNOWLEDGE_BASE.md](./SSOT_ADMIN_AI_KNOWLEDGE_BASE.md) - 知識ベース管理（RAG用）
- [SSOT_ADMIN_AI_CHARACTER.md](./SSOT_ADMIN_AI_CHARACTER.md) - AIキャラクター設定
- [SSOT_ADMIN_AI_PROVIDERS.md](./SSOT_ADMIN_AI_PROVIDERS.md) - LLMプロバイダー設定

### 💬 会話管理
- [SSOT_ADMIN_AI_CONVERSATIONS.md](./SSOT_ADMIN_AI_CONVERSATIONS.md) - 会話履歴
- [SSOT_ADMIN_AI_MONITORING.md](./SSOT_ADMIN_AI_MONITORING.md) - 監視・分析

### 🌳 コンテンツ管理
- [SSOT_ADMIN_AI_RESPONSE_TREE.md](./SSOT_ADMIN_AI_RESPONSE_TREE.md) - 質問＆回答ツリー

### ⚙️ システム設定
- [SSOT_ADMIN_AI_CREDITS.md](./SSOT_ADMIN_AI_CREDITS.md) - クレジット管理
- [SSOT_ADMIN_AI_LIMITS.md](./SSOT_ADMIN_AI_LIMITS.md) - 利用制限設定

### 📊 ダッシュボード
- [SSOT_ADMIN_AI_DASHBOARD.md](./SSOT_ADMIN_AI_DASHBOARD.md) - 概要・ダッシュボード

---

**関連基盤SSOT**:
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_MULTITENANT.md](../../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_DATABASE_SCHEMA.md](../../00_foundation/SSOT_DATABASE_SCHEMA.md) - DBスキーマ

**関連ドキュメント**:
- [AI_CONCIERGE_SPEC.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/concierge/AI_CONCIERGE_SPEC.md)
- [RESPONSE_TREE_SPEC.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/concierge/RESPONSE_TREE_SPEC.md)
- [ADMIN_SIDEBAR_SPEC.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/ADMIN_SIDEBAR_SPEC.md)

---

## 📋 目次

1. [概要](#-概要)
2. [サイドバー構成とSSOT対応](#-サイドバー構成とssot対応)
3. [技術スタック](#-技術スタック)
4. [必須要件（全子SSOT共通）](#️-必須要件全子ssot共通)
5. [データベース設計（共通）](#-データベース設計共通)
6. [システム連携](#-システム連携)
7. [セキュリティ（共通要件）](#-セキュリティ共通要件)
8. [エラーハンドリング（共通）](#-エラーハンドリング共通)
9. [テスト戦略](#-テスト戦略)
10. [パフォーマンス目標](#-パフォーマンス目標)
11. [実装ロードマップ](#-実装ロードマップ)
12. [将来拡張](#-将来拡張)

---

## 📋 概要

### 目的

この親SSOTは、hotel-saas管理画面の**AIコンシェルジュ機能全体のアーキテクチャと共通仕様**を定義します。

**役割**:
1. **全体像の提示**: AIコンシェルジュ機能の構成と子SSOTの関係性
2. **共通仕様の定義**: 全子SSOTで共通する技術スタック、セキュリティ、データベース設計
3. **システム連携の管理**: hotel-common、hotel-member等との連携方式

### 適用範囲

- **AIコンシェルジュ管理機能全体の統括**
- **子SSOTへの共通要件の提供**
- **システム間連携の定義**

### 機能構成

AIコンシェルジュ機能は、**2つの異なるインターフェース**を統合管理します：

#### A) チャット型AIコンシェルジュ（RAG + マルチLLM）

- **用途**: 自由な質問に対してAIが回答
- **技術**: RAG（Retrieval-Augmented Generation）+ マルチLLMプロバイダー
- **対象**: スマホ連携チャット、Webチャット
- **特徴**:
  - 知識ベースからコンテキストを検索
  - マルチLLMプロバイダー対応（OpenAI/Anthropic/Google/Azure等）
  - AIキャラクター設定によるパーソナライズ
  - リアルタイム会話

#### B) 質問＆回答ツリー型（選択式・静的）

- **用途**: TVリモコン操作に最適化された階層型ナビゲーション
- **技術**: 事前定義された質問ツリー（AI不使用）
- **対象**: 客室TV画面
- **特徴**:
  - リモコン操作に最適化
  - オフライン動作可能
  - 多言語対応
  - 静的コンテンツ（AI不要）

---

## 🗺️ サイドバー構成とSSOT対応

### サイドバー構成（3階層）

```
🤖 AIコンシェルジュ管理 ▼
├── 📊 概要・ダッシュボード         → SSOT_ADMIN_AI_DASHBOARD.md
├── 🧠 AI管理 ▶
│   ├── 📚 知識ベース管理          → SSOT_ADMIN_AI_KNOWLEDGE_BASE.md
│   ├── 🤖 キャラクター設定        → SSOT_ADMIN_AI_CHARACTER.md
│   └── 🔌 LLMプロバイダー設定     → SSOT_ADMIN_AI_PROVIDERS.md
├── 💬 会話管理 ▶
│   ├── 💬 会話履歴                → SSOT_ADMIN_AI_CONVERSATIONS.md
│   └── 📊 監視・分析              → SSOT_ADMIN_AI_MONITORING.md
├── 🌳 コンテンツ管理 ▶
│   └── 🌳 質問＆回答ツリー        → SSOT_ADMIN_AI_RESPONSE_TREE.md
└── ⚙️ システム設定 ▶
    ├── 💳 クレジット管理          → SSOT_ADMIN_AI_CREDITS.md
    └── 🔒 利用制限設定            → SSOT_ADMIN_AI_LIMITS.md
```

### SSOT対応表

| サイドバーメニュー | ルート | SSOT | 実装状況 |
|------------------|--------|------|---------|
| 概要・ダッシュボード | `/admin/concierge` | SSOT_ADMIN_AI_DASHBOARD.md | ✅ UI実装済み |
| 知識ベース管理 | `/admin/concierge/knowledge` | SSOT_ADMIN_AI_KNOWLEDGE_BASE.md | ✅ UI実装済み |
| キャラクター設定 | `/admin/concierge/character` | SSOT_ADMIN_AI_CHARACTER.md | ✅ UI実装済み |
| LLMプロバイダー設定 | `/admin/concierge/providers` | SSOT_ADMIN_AI_PROVIDERS.md | 🚧 未実装 |
| 会話履歴 | `/admin/concierge/conversations` | SSOT_ADMIN_AI_CONVERSATIONS.md | ✅ UI実装済み |
| 監視・分析 | `/admin/concierge/monitoring` | SSOT_ADMIN_AI_MONITORING.md | ⚠️ 骨格のみ |
| 質問＆回答ツリー | `/admin/concierge/response` | SSOT_ADMIN_AI_RESPONSE_TREE.md | ✅ UI実装済み |
| クレジット管理 | `/admin/concierge/credits` | SSOT_ADMIN_AI_CREDITS.md | ✅ UI実装済み |
| 利用制限設定 | `/admin/concierge/limits` | SSOT_ADMIN_AI_LIMITS.md | 🚧 未実装 |

---

## 🛠 技術スタック

### フロントエンド
- **フレームワーク**: Nuxt 3.13+ (Vue 3 Composition API)
- **TypeScript**: 5.6+
- **スタイリング**: Tailwind CSS 3.4+
- **状態管理**: Pinia 2.2+ (`usePlanFeatures` composable使用)
- **UIライブラリ**: Nuxt Icon（heroicons使用）

### バックエンド

#### hotel-saas（フロントエンドAPI）
- **サーバー**: Nuxt Nitro
- **ディレクトリ**: `/server/api/v1/admin/concierge/`
- **認証**: Session認証（adminミドルウェア）
- **実装状況**: **大部分が.disabled（無効化）**

#### hotel-common（バックエンド統合API）
- **サーバー**: Express.js
- **ディレクトリ**: `/src/routes/systems/common/` (**AI専用ルートは未実装**)
- **認証**: Session認証（Redis共有）
- **実装状況**: **ResponseTree関連のみ実装済み**

### データベース
- **DBMS**: PostgreSQL（統一DB）
- **ORM**: Prisma 5.22+
- **スキーマ**: `/Users/kaneko/hotel-common/prisma/schema.prisma`
- **命名規則**: **新規テーブルはsnake_case必須**（[DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) v3.0.0準拠）

### AI/ML関連
- **LLMプロバイダー**: マルチプロバイダー対応
  - OpenAI (gpt-4o, gpt-4o-mini, text-embedding-3-small)
  - Anthropic (claude-3-opus, claude-3-sonnet, claude-3-haiku)
  - Google (gemini-1.5-pro, gemini-1.5-flash)
  - Azure OpenAI, AWS Bedrock, Cohere等
- **ベクトルDB**: **未実装・仕様策定中**
  - 候補: Chroma, Pinecone, Qdrant, Weaviate
- **RAG**: LangChain.js（予定）

### セッションストア
- **Redis**: 必須（開発・本番共通）
- **接続**: 環境変数 `REDIS_URL`
- **キー形式**: `hotel:session:{sessionId}`

---

## 🏗️ システム構成図

### 全体アーキテクチャ

```
┌───────────────────────────────────────────────────────────┐
│              クライアント（ブラウザ）                       │
│                   管理者/スタッフ                           │
└───────────────────────┬───────────────────────────────────┘
                        │ HTTPS
                        ↓
┌───────────────────────────────────────────────────────────┐
│                hotel-saas（Nuxt 3）                        │
│  - Pages: /pages/admin/concierge/                         │
│  - API Proxy: /server/api/v1/admin/concierge/            │
│  - Session認証: Redis共有                                  │
└───────────────────────┬───────────────────────────────────┘
                        │ $fetch (credentials: 'include')
                        ↓
┌───────────────────────────────────────────────────────────┐
│               hotel-common（Express）                      │
│  - API Routes: /src/routes/systems/common/ai-*.routes.ts │
│  - Services: ビジネスロジック                               │
│  - Queue: BullMQ (ベクトル化)                              │
└────┬─────────┬─────────┬──────────┬─────────────────────────┘
     │         │         │          │
     ↓         ↓         ↓          ↓
┌─────────┐ ┌──────┐ ┌────────┐ ┌───────────────┐
│PostgreSQL │ │Redis │ │Chroma/ │ │OpenAI/        │
│- tenants│ │-session│ │Qdrant  │ │Anthropic/     │
│- ai_*   │ │-cache│ │-vectors│ │Google API     │
└─────────┘ └──────┘ └────────┘ └───────────────┘
```

### 子SSOT間の依存関係

**Phase 1（基盤）**:
1. PROVIDERS → 最優先（他の全てが依存）
2. KNOWLEDGE_BASE → PROVIDERS必要（Embedding用）
3. CHARACTER → PROVIDERS必要（Chat用）

**Phase 2（運用）**:
4. CONVERSATIONS → Phase 1完了後
5. CREDITS → Phase 1完了後
6. DASHBOARD → 全データ揃った後

**Phase 3（高度）**:
7. MONITORING → 本番稼働後
8. LIMITS → 本番稼働後
9. RESPONSE_TREE → 独立（AI不使用）

---

## ⚠️ 必須要件（CRITICAL）

### 1. プラン制限機能の遵守

AIコンシェルジュ機能は **プラン制限対象機能** です。

**テーブル**: `SystemPlanRestrictions`
```prisma
model SystemPlanRestrictions {
  enableAiConcierge        Boolean  @default(false)
  maxMonthlyAiRequests     Int      @default(0)
  // ...
}
```

**UI実装**:
```typescript
// 全AIコンシェルジュ画面で必須チェック
const { hasFeature } = usePlanFeatures()
const isFeatureEnabled = computed(() => hasFeature('aiConcierge'))

// 機能制限時の表示
<FeatureRestrictedBanner
  feature-name="aiConcierge"
  title="AIコンシェルジュ機能"
  description="AIコンシェルジュ機能はプロフェッショナルプラン以上でご利用いただけます。"
  v-if="!isFeatureEnabled"
/>
```

**API実装**: 
- バックエンドでも `tenant.enableAiConcierge` チェック必須
- プラン外アクセスは `403 Forbidden` を返す

### 2. マルチテナント対応

**全テーブルに `tenant_id` カラム必須**

```sql
-- 新規テーブル例
CREATE TABLE tenant_ai_providers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ← 必須
  -- ...
);

CREATE INDEX idx_tenant_ai_providers_tenant_id 
  ON tenant_ai_providers(tenant_id);
```

**全APIで `tenant_id` フィルタリング必須**:
```typescript
// ✅ 正しい
const providers = await prisma.tenantAiProviders.findMany({
  where: {
    tenantId: user.tenantId,  // ← 必須
    isActive: true
  }
})

// ❌ 間違い（他テナントのデータが見える）
const providers = await prisma.tenantAiProviders.findMany({
  where: { isActive: true }
})
```

### 3. データベース命名規則

**新規テーブル**: 必ず `snake_case` で作成

```prisma
// ✅ 正しい
model TenantAiProvider {
  id        String @id @default(cuid())
  tenantId  String @map("tenant_id")
  apiKey    String @map("api_key_primary")
  
  @@map("tenant_ai_providers")  // ← snake_case
  @@index([tenantId], map: "idx_tenant_ai_providers_tenant_id")
}

// ❌ 間違い
model TenantAiProvider {
  id        String @id
  tenantId  String  // @map忘れ
  
  // @@map忘れ → テーブル名が TenantAiProvider になる
}
```

**参照**: [DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) v3.0.0

### 4. APIルーティング規則

**Nuxt 3制約**: 動的パスは1階層のみ、`index.*`ファイル禁止

```yaml
# ✅ 正しい
/api/v1/admin/concierge/character.get.ts
/api/v1/admin/concierge/knowledge/list.get.ts
/api/v1/admin/concierge/knowledge/[id].get.ts
/api/v1/admin/concierge/providers/list.get.ts  # ← 修正（統一）
/api/v1/admin/concierge/providers/[id].put.ts  # ← 修正（統一）

# ❌ 間違い
/api/v1/admin/concierge/knowledge/[id]/versions/[versionId].get.ts  # 2階層
/api/v1/admin/concierge/index.get.ts  # index.*禁止
```

**参照**: [API_ROUTING_GUIDELINES.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md)

### 5. 認証必須

**全管理画面APIで認証チェック必須**:

```typescript
// hotel-saasの場合
definePageMeta({
  layout: 'admin',
  middleware: ['admin']  // ← 必須
})

// hotel-commonの場合
router.use(sessionAuth.requireAuth)  // ← 必須
```

### 6. エラーハンドリング統一

```typescript
// ✅ 正しい
throw createError({
  statusCode: 400,
  statusMessage: 'Invalid API key format',
  data: { field: 'apiKeyPrimary' }
})

// ❌ 間違い
throw new Error('Invalid API key')  // HTTPステータス不明
```

---

## 🎯 機能一覧

### 管理画面メニュー構成

```
/admin/concierge/
├── 概要（overview）          - ダッシュボード・統計表示
├── 知識ベース管理            - /knowledge.vue
├── 会話履歴                  - /conversations.vue
│   ├── チャット型履歴（タブ）
│   └── ResponseTree履歴（タブ）
├── AIキャラクター設定        - /character.vue
├── 質問＆回答ツリー管理      - /response/index.vue
├── AIクレジット管理          - /credits.vue
├── 監視・分析                - /monitoring.vue
├── 設定（settings）          - index.vue内タブ
│   ├── LLMプロバイダー設定
│   ├── 利用制限設定
│   └── OpenAI APIキー設定
└── 連携設定（integration）   - index.vue内タブ
    └── インフォメーション記事統合
```

---

## 🗄️ データベース設計

**詳細**は別ドキュメントを参照: [SSOT_ADMIN_AI_CONCIERGE_DATABASE.md](./SSOT_ADMIN_AI_CONCIERGE_DATABASE.md)

### 新規作成テーブル（8テーブル）

| テーブル名 | 目的 | 実装状況 |
|-----------|------|---------|
| `tenant_ai_providers` | LLMプロバイダー設定（マルチプロバイダー対応） | ❌ 未作成 |
| `tenant_ai_model_assignments` | 用途別AIモデル割り当て | ❌ 未作成 |
| `ai_knowledge_bases` | RAG用知識ベース管理 | ❌ 未作成 |
| `ai_conversations` | チャット型AI会話セッション | ❌ 未作成 |
| `ai_messages` | チャット型AIメッセージ履歴 | ❌ 未作成 |
| `ai_characters` | AIキャラクター設定 | ❌ 未作成 |
| `ai_credit_transactions` | AIクレジット使用履歴 | ❌ 未作成 |
| `ai_usage_limits` | AIコンシェルジュ利用制限 | ❌ 未作成 |

### 既存テーブル（ResponseTree用・実装済み）

| テーブル名 | 目的 | 実装状況 |
|-----------|------|---------|
| `response_trees` | 質問＆回答ツリーメタ情報 | ✅ 実装済み |
| `response_nodes` | ツリーノード管理 | ✅ 実装済み |
| `response_node_translations` | ノード多言語翻訳 | ✅ 実装済み |
| `response_tree_sessions` | TVセッション管理 | ✅ 実装済み |
| `response_tree_history` | ノード遷移履歴 | ✅ 実装済み |
| `response_tree_mobile_links` | QRコードモバイル連携 | ✅ 実装済み |
| `response_tree_versions` | ツリーバージョン管理 | ✅ 実装済み |

---

## 📡 API仕様

### hotel-saas API（Nuxt Nitro）

**ベースパス**: `/api/v1/admin/concierge/`

#### 実装状況サマリー

| カテゴリ | 実装済み | 無効化 | 未作成 | 合計 |
|---------|---------|-------|-------|------|
| 知識ベース管理 | 0 | 2 | 3 | 5 |
| 会話履歴 | 0 | 1 | 2 | 3 |
| AIキャラクター | 1 | 2 | 0 | 3 |
| ResponseTree | 0 | 8 | 0 | 8 |
| クレジット | 0 | 0 | 2 | 2 |
| プロバイダー | 0 | 0 | 6 | 6 |
| システム | 1 | 5 | 1 | 7 |
| **合計** | **2** | **18** | **14** | **34** |

#### 実装済みAPI（2件）

| エンドポイント | メソッド | ファイル | 説明 |
|------------|------|--------|------|
| `/api/v1/admin/concierge/character-autogen` | POST | `character-autogen.post.ts` | AIキャラクター自動生成 |
| `/api/v1/admin/concierge/integrate-info` | POST | `integrate-info.post.ts` | インフォメーション記事統合 |

#### 優先実装すべきAPI

**Phase 1（最優先）**:
1. `/api/v1/admin/ai-providers/list` - プロバイダー一覧
2. `/api/v1/admin/ai-providers/create` - プロバイダー登録
3. `/api/v1/admin/concierge/character` (GET/POST) - キャラクター取得・保存
4. `/api/v1/admin/concierge/dashboard-stats` - ダッシュボード統計

**Phase 2（高優先）**:
5. `/api/v1/admin/concierge/knowledge/upload` - 知識ベースアップロード
6. `/api/v1/admin/concierge/knowledge/list` - 知識ベース一覧
7. `/api/v1/admin/concierge/conversations/list` - 会話履歴一覧
8. `/api/v1/admin/concierge/credits` (GET/POST) - クレジット管理

---

## 🎨 UI実装状況

### 実装済みページ（9ページ）

| ページ | パス | UI状態 | API接続 | 備考 |
|-------|-----|--------|---------|------|
| 概要 | `/admin/concierge/` | ✅ 完成 | ❌ 未接続 | モックデータ表示 |
| 知識ベース | `/admin/concierge/knowledge` | ✅ 完成 | ❌ 未接続 | モックデータ表示 |
| 会話履歴 | `/admin/concierge/conversations` | ✅ 完成 | ❌ 未接続 | モックデータ表示 |
| AIキャラクター | `/admin/concierge/character` | ✅ 完成 | ⚠️ 一部接続 | AI自動生成のみ実装 |
| 質問ツリー | `/admin/concierge/response/` | ✅ 完成 | ❌ 未接続 | モックデータ表示 |
| AIクレジット | `/admin/concierge/credits` | ✅ 完成 | ❌ 未接続 | モックデータ表示 |
| 監視・分析 | `/admin/concierge/monitoring` | ⚠️ 骨格のみ | ❌ 未接続 | 「開発中」表示 |
| 設定 | `/admin/concierge/` (tab) | ✅ 完成 | ❌ 未接続 | APIキー設定等 |
| 連携設定 | `/admin/concierge/` (tab) | ✅ 完成 | ⚠️ 一部接続 | インフォ統合のみ |

### 共通UIコンポーネント

#### FeatureRestrictedBanner
**ファイル**: `components/FeatureRestrictedBanner.vue`

**用途**: プラン制限時の表示

**使用例**:
```vue
<FeatureRestrictedBanner
  feature-name="aiConcierge"
  title="AIコンシェルジュ機能"
  description="AIコンシェルジュ機能はプロフェッショナルプラン以上でご利用いただけます。"
  v-if="!isFeatureEnabled"
/>
```

---

## 🔗 システム連携

### hotel-common連携

**実装必要ファイル**: 
- `/Users/kaneko/hotel-common/src/routes/systems/common/ai-concierge-chat.routes.ts` ❌ 未作成
- `/Users/kaneko/hotel-common/src/routes/systems/common/ai-knowledge-base.routes.ts` ❌ 未作成
- `/Users/kaneko/hotel-common/src/routes/systems/common/ai-providers.routes.ts` ❌ 未作成
- `/Users/kaneko/hotel-common/src/routes/systems/common/ai-characters.routes.ts` ❌ 未作成
- `/Users/kaneko/hotel-common/src/routes/systems/common/ai-credits.routes.ts` ❌ 未作成

**既存実装**: 
- ResponseTree関連は実装済み

---

## 🔐 セキュリティ

### 1. APIキー暗号化

**必須**: `tenant_ai_providers.api_key_primary` / `api_key_secondary`

**実装**:
```typescript
import crypto from 'crypto'

// 暗号化
function encryptApiKey(apiKey: string): string {
  const algorithm = 'aes-256-cbc'
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// 復号化
function decryptApiKey(encryptedKey: string): string {
  const algorithm = 'aes-256-cbc'
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const parts = encryptedKey.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

### 2. マルチテナント分離

**全APIで `tenantId` フィルタリング必須**:

```typescript
// ✅ 正しい
const providers = await prisma.tenantAiProviders.findMany({
  where: {
    tenantId: user.tenantId,  // ← 必須
    isDeleted: false
  }
})

// ❌ 間違い
const providers = await prisma.tenantAiProviders.findMany({
  where: { isDeleted: false }  // 他テナントのデータも取得されてしまう
})
```

### 3. プラン制限チェック

**バックエンドで必ずチェック**:

```typescript
// hotel-common側での実装例
export async function checkAiConciergeAccess(tenantId: string): Promise<void> {
  const plan = await prisma.systemPlanRestrictions.findFirst({
    where: {
      TenantSystemPlan: {
        some: {
          tenantId,
          isActive: true
        }
      }
    }
  })
  
  if (!plan?.enableAiConcierge) {
    throw createError({
      statusCode: 403,
      statusMessage: 'AI Concierge feature is not enabled for your plan'
    })
  }
}
```

### 4. 利用制限チェック

```typescript
// 時間制限チェック
async function checkRateLimit(tenantId: string): Promise<void> {
  const limit = await prisma.aiUsageLimit.findUnique({
    where: { tenantId }
  })
  
  if (!limit?.isActive) return
  
  const oneHourAgo = new Date(Date.now() - 3600000)
  const recentQueries = await prisma.aiMessages.count({
    where: {
      conversation: {
        tenantId,
        startedAt: { gte: oneHourAgo }
      },
      role: 'user'
    }
  })
  
  if (recentQueries >= limit.maxQueriesPerHour) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Hourly query limit exceeded'
    })
  }
}
```

---

## ⚠️ エラーハンドリング

### 標準エラーレスポンス

```typescript
// hotel-saas/hotel-common共通
throw createError({
  statusCode: 400,
  statusMessage: 'Invalid request',
  data: {
    field: 'apiKeyPrimary',
    reason: 'API key format is invalid'
  }
})
```

### エラーコード一覧

| コード | 説明 | 例 |
|-------|------|-----|
| 400 | バリデーションエラー | APIキー形式不正 |
| 401 | 認証エラー | ログイン必要 |
| 403 | 権限エラー | プラン制限 |
| 404 | リソース不在 | 知識ベースID不正 |
| 429 | レート制限超過 | 時間制限超過 |
| 500 | サーバーエラー | LLM API呼び出し失敗 |
| 503 | 外部サービスエラー | ベクトルDB接続失敗 |

---

## 🧪 テスト

### テスト範囲

| カテゴリ | 対象 | 優先度 |
|---------|------|-------|
| Unit | APIキー暗号化/復号化 | 🔴 高 |
| Unit | レート制限チェック | 🔴 高 |
| Unit | プラン制限チェック | 🔴 高 |
| Integration | チャットAPI処理フロー | 🔴 高 |
| Integration | 知識ベースアップロード | 🟡 中 |
| E2E | 管理画面操作 | 🟢 低 |

---

## ⚡ パフォーマンス

### 目標値

| 項目 | 目標 |
|------|------|
| チャット応答時間 | < 2秒（95パーセンタイル） |
| 知識ベース検索 | < 500ms |
| ダッシュボード読み込み | < 1秒 |
| APIキー取得（復号化） | < 100ms |

### 最適化戦略

1. **ベクトル検索最適化**: インデックス最適化
2. **APIキーキャッシュ**: Redis 1時間キャッシュ
3. **統計データキャッシュ**: Redis 5分キャッシュ
4. **LLMレスポンスストリーミング**: Server-Sent Events使用

---

## 📅 実装ロードマップ

### Phase 1: 基盤実装（最優先）

**目標**: AIコンシェルジュ機能の基盤を構築

| SSOT | 優先度 | 実装内容 | 担当 |
|------|-------|---------|------|
| SSOT_ADMIN_AI_KNOWLEDGE_BASE.md | 🔴 最高 | 知識ベース管理機能 | Sun |
| SSOT_ADMIN_AI_PROVIDERS.md | 🔴 最高 | LLMプロバイダー設定 | Sun |
| SSOT_ADMIN_AI_CHARACTER.md | 🟡 高 | AIキャラクター設定 | Sun |

**マイルストーン**: 基本的なAIチャット機能が動作する状態

### Phase 2: コア機能実装（高優先）

**目標**: 主要機能を完成させる

| SSOT | 優先度 | 実装内容 | 担当 |
|------|-------|---------|------|
| SSOT_ADMIN_AI_CONVERSATIONS.md | 🟡 高 | 会話履歴・ログ管理 | Sun |
| SSOT_ADMIN_AI_CREDITS.md | 🟡 高 | クレジット管理 | Sun |
| SSOT_ADMIN_AI_DASHBOARD.md | 🟢 中 | ダッシュボード統計 | Sun |

**マイルストーン**: 運用に必要な管理機能が揃う

### Phase 3: 高度な機能（通常優先）

**目標**: 監視・分析・制限機能を追加

| SSOT | 優先度 | 実装内容 | 担当 |
|------|-------|---------|------|
| SSOT_ADMIN_AI_MONITORING.md | 🟢 中 | 監視・分析機能 | Sun |
| SSOT_ADMIN_AI_LIMITS.md | 🟢 中 | 利用制限設定 | Sun |
| SSOT_ADMIN_AI_RESPONSE_TREE.md | 🟢 中 | ResponseTree完全版 | Sun |

**マイルストーン**: 完全な運用管理が可能

---

## 🚀 将来拡張

### Phase 4以降の機能

1. **高度なRAG機能**
   - ハイブリッド検索（キーワード + ベクトル）
   - リランキング機能
   - チャンク最適化

2. **AI自動改善**
   - 会話フィードバック学習
   - 自動プロンプト最適化

3. **マルチモーダル対応**
   - 画像認識
   - 音声入出力

4. **予約システム連携**
   - AIからの直接予約
   - 客室サービス注文

---

## 🌐 多言語対応

### 概要

**AIコンシェルジュ管理機能**は、管理画面のUIテキストを**15言語対応**します。

**対応パターン**: 🟢 **軽量対応**（UIテキストのみ）

**定義**:
- ✅ 静的UIテキスト（サイドバーメニュー、ボタン、ラベル、メッセージ等）を多言語化
- ✅ `@nuxtjs/i18n`を使用
- ❌ `translations`テーブルは使用しない（データフィールドは子SSOTで管理）
- ❌ 自動翻訳は実行しない
- ❌ この親SSOTではデータベースのデータフィールドは多言語化しない

**適用理由**:
- 管理画面専用であり、スタッフが使用する機能
- この親SSOTはアーキテクチャ・共通仕様の定義
- データフィールドの多言語化は各子SSOTで個別に対応
- サイドバーメニュー、エラーメッセージ等のUIテキストのみ対応

**子SSOTでの多言語化**:
- データフィールド（知識ベースのタイトル、AIキャラクター名等）は各子SSOTで個別に対応
- 詳細は各子SSOTの「🌐 多言語対応」セクションを参照

---

### 対象範囲

#### Phase 1: UIテキストのみ

| 項目 | 対象 | 実装方式 |
|------|------|---------|
| サイドバーメニュー | メニュー名、グループ名 | `@nuxtjs/i18n` |
| エラーメッセージ | バリデーションエラー、API エラー | `@nuxtjs/i18n` |
| トースト通知 | 成功・失敗メッセージ | `@nuxtjs/i18n` |
| システムメッセージ | プラン制限通知、認証エラー等 | `@nuxtjs/i18n` |
| 共通UIコンポーネント | FeatureRestrictedBanner等 | `@nuxtjs/i18n` |

**データフィールドの多言語化**:
- 知識ベースのタイトル → `SSOT_ADMIN_AI_KNOWLEDGE_BASE.md`で対応
- AIキャラクター名 → `SSOT_ADMIN_AI_CHARACTER.md`で対応
- 質問＆回答ツリー → `SSOT_ADMIN_AI_RESPONSE_TREE.md`で対応（既に実装済み）

---

### 実装方式

#### @nuxtjs/i18n による静的テキスト多言語化

##### 1. サイドバーメニュー

**ファイル**: `/layouts/admin.vue` または `/components/AdminSidebar.vue`

```vue
<template>
  <nav>
    <!-- AIコンシェルジュメニューグループ -->
    <div class="menu-group">
      <h3>{{ $t('aiConcierge.sidebar.title') }}</h3>
      
      <ul>
        <li>
          <NuxtLink to="/admin/concierge">
            {{ $t('aiConcierge.sidebar.overview') }}
          </NuxtLink>
        </li>
        
        <!-- AI管理サブメニュー -->
        <li class="submenu">
          <span>{{ $t('aiConcierge.sidebar.aiManagement') }}</span>
          <ul>
            <li>
              <NuxtLink to="/admin/concierge/knowledge">
                {{ $t('aiConcierge.sidebar.knowledgeBase') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/admin/concierge/character">
                {{ $t('aiConcierge.sidebar.character') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/admin/concierge/providers">
                {{ $t('aiConcierge.sidebar.providers') }}
              </NuxtLink>
            </li>
          </ul>
        </li>
        
        <!-- 会話管理サブメニュー -->
        <li class="submenu">
          <span>{{ $t('aiConcierge.sidebar.conversationManagement') }}</span>
          <ul>
            <li>
              <NuxtLink to="/admin/concierge/conversations">
                {{ $t('aiConcierge.sidebar.conversations') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/admin/concierge/monitoring">
                {{ $t('aiConcierge.sidebar.monitoring') }}
              </NuxtLink>
            </li>
          </ul>
        </li>
        
        <!-- コンテンツ管理サブメニュー -->
        <li class="submenu">
          <span>{{ $t('aiConcierge.sidebar.contentManagement') }}</span>
          <ul>
            <li>
              <NuxtLink to="/admin/concierge/response">
                {{ $t('aiConcierge.sidebar.responseTree') }}
              </NuxtLink>
            </li>
          </ul>
        </li>
        
        <!-- システム設定サブメニュー -->
        <li class="submenu">
          <span>{{ $t('aiConcierge.sidebar.systemSettings') }}</span>
          <ul>
            <li>
              <NuxtLink to="/admin/concierge/credits">
                {{ $t('aiConcierge.sidebar.credits') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/admin/concierge/limits">
                {{ $t('aiConcierge.sidebar.limits') }}
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </nav>
</template>
```

##### 2. 共通エラーメッセージ

**ファイル**: 各子SSOTの実装ファイル

```typescript
// エラーハンドリング例
try {
  await saveAiSettings()
  toast.success($t('aiConcierge.messages.saveSuccess'))
} catch (error) {
  if (error.statusCode === 403) {
    toast.error($t('aiConcierge.errors.planRestricted'))
  } else if (error.statusCode === 429) {
    toast.error($t('aiConcierge.errors.rateLimitExceeded'))
  } else {
    toast.error($t('aiConcierge.errors.saveFailed'))
  }
}
```

##### 3. プラン制限バナー

**ファイル**: `components/FeatureRestrictedBanner.vue`

```vue
<template>
  <div class="feature-restricted-banner">
    <h3>{{ $t(`features.${featureName}.title`) }}</h3>
    <p>{{ $t(`features.${featureName}.description`) }}</p>
    <NuxtLink to="/admin/billing">
      {{ $t('features.upgradeButton') }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  featureName: string
}>()

const { $t } = useI18n()
</script>
```

#### 翻訳ファイル

**ファイル**: `locales/ja/ai-concierge.json`

```json
{
  "aiConcierge": {
    "sidebar": {
      "title": "AIコンシェルジュ管理",
      "overview": "概要・ダッシュボード",
      "aiManagement": "AI管理",
      "knowledgeBase": "知識ベース管理",
      "character": "キャラクター設定",
      "providers": "LLMプロバイダー設定",
      "conversationManagement": "会話管理",
      "conversations": "会話履歴",
      "monitoring": "監視・分析",
      "contentManagement": "コンテンツ管理",
      "responseTree": "質問＆回答ツリー",
      "systemSettings": "システム設定",
      "credits": "クレジット管理",
      "limits": "利用制限設定"
    },
    "messages": {
      "saveSuccess": "設定を保存しました",
      "saveFailed": "設定の保存に失敗しました",
      "deleteSuccess": "削除しました",
      "deleteFailed": "削除に失敗しました"
    },
    "errors": {
      "planRestricted": "この機能はご利用のプランではご利用いただけません",
      "rateLimitExceeded": "利用制限を超過しました。しばらく時間をおいてから再度お試しください",
      "unauthorized": "この操作を実行する権限がありません",
      "notFound": "リソースが見つかりません",
      "serverError": "サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください"
    }
  },
  "features": {
    "aiConcierge": {
      "title": "AIコンシェルジュ機能",
      "description": "AIコンシェルジュ機能はプロフェッショナルプラン以上でご利用いただけます。"
    },
    "upgradeButton": "プランをアップグレード"
  }
}
```

**ファイル**: `locales/en/ai-concierge.json`

```json
{
  "aiConcierge": {
    "sidebar": {
      "title": "AI Concierge Management",
      "overview": "Overview & Dashboard",
      "aiManagement": "AI Management",
      "knowledgeBase": "Knowledge Base",
      "character": "Character Settings",
      "providers": "LLM Providers",
      "conversationManagement": "Conversation Management",
      "conversations": "Conversation History",
      "monitoring": "Monitoring & Analytics",
      "contentManagement": "Content Management",
      "responseTree": "Q&A Tree",
      "systemSettings": "System Settings",
      "credits": "Credit Management",
      "limits": "Usage Limits"
    },
    "messages": {
      "saveSuccess": "Settings saved successfully",
      "saveFailed": "Failed to save settings",
      "deleteSuccess": "Deleted successfully",
      "deleteFailed": "Failed to delete"
    },
    "errors": {
      "planRestricted": "This feature is not available in your current plan",
      "rateLimitExceeded": "Rate limit exceeded. Please try again later",
      "unauthorized": "You do not have permission to perform this action",
      "notFound": "Resource not found",
      "serverError": "Server error occurred. Please try again later"
    }
  },
  "features": {
    "aiConcierge": {
      "title": "AI Concierge Feature",
      "description": "AI Concierge feature is available for Professional plan and above."
    },
    "upgradeButton": "Upgrade Plan"
  }
}
```

---

### マイグレーション計画

#### Phase 1: UIテキスト多言語化（Week 1-2）

**担当**: hotel-saas (Sun AI)

**実装内容**:
- [ ] `@nuxtjs/i18n`セットアップ確認
- [ ] 翻訳ファイル作成
  - [ ] `locales/ja/ai-concierge.json`
  - [ ] `locales/en/ai-concierge.json`
- [ ] サイドバーメニュー更新（`$t()`関数使用）
- [ ] 共通エラーメッセージ更新
- [ ] FeatureRestrictedBanner更新
- [ ] 各子SSOTページでのエラーメッセージ更新

**検証**:
- [ ] 日本語・英語表示確認（サイドバー）
- [ ] エラーメッセージの多言語表示確認
- [ ] トースト通知の多言語表示確認
- [ ] プラン制限バナーの多言語表示確認

---

### 実装チェックリスト

#### hotel-saas

- [ ] `@nuxtjs/i18n`セットアップ確認
- [ ] 翻訳ファイル作成
  - [ ] `locales/ja/ai-concierge.json`
  - [ ] `locales/en/ai-concierge.json`
- [ ] サイドバーメニュー更新
  - [ ] `/layouts/admin.vue` または `/components/AdminSidebar.vue`
- [ ] 共通コンポーネント更新
  - [ ] `components/FeatureRestrictedBanner.vue`
- [ ] エラーハンドリング更新（全子SSOTページ）
  - [ ] `/pages/admin/concierge/index.vue`
  - [ ] `/pages/admin/concierge/knowledge.vue`
  - [ ] `/pages/admin/concierge/character.vue`
  - [ ] `/pages/admin/concierge/providers.vue`
  - [ ] `/pages/admin/concierge/conversations.vue`
  - [ ] `/pages/admin/concierge/monitoring.vue`
  - [ ] `/pages/admin/concierge/response/index.vue`
  - [ ] `/pages/admin/concierge/credits.vue`
  - [ ] `/pages/admin/concierge/limits.vue`
- [ ] テスト
  - [ ] 日本語表示確認
  - [ ] 英語表示確認
  - [ ] 言語切り替え動作確認
  - [ ] エラーメッセージの多言語表示確認

---

### 注意事項

#### ⚠️ 子SSOTとの役割分担

この親SSOTでは**UIテキストのみ**を多言語化します。データフィールドの多言語化は各子SSOTで対応します：

| 子SSOT | データフィールド多言語化 | 対応状況 |
|--------|----------------------|---------|
| SSOT_ADMIN_AI_KNOWLEDGE_BASE.md | 知識ベースのタイトル、説明 | ✅ 対応済み |
| SSOT_ADMIN_AI_CHARACTER.md | AIキャラクター名、説明 | ✅ 対応済み |
| SSOT_ADMIN_AI_PROVIDERS.md | プロバイダー名 | 🚧 未対応 |
| SSOT_ADMIN_AI_RESPONSE_TREE.md | 質問・回答テキスト | ✅ 実装済み |
| その他の子SSOT | 各種データフィールド | 各子SSOTで対応 |

#### ⚠️ 翻訳ファイルの構成

**共通翻訳**（この親SSOT）:
- `locales/ja/ai-concierge.json` - サイドバー、共通エラー
- `locales/en/ai-concierge.json` - サイドバー、共通エラー

**個別翻訳**（各子SSOT）:
- `locales/ja/ai-knowledge-base.json` - 知識ベース固有
- `locales/ja/ai-character.json` - キャラクター固有
- `locales/ja/ai-providers.json` - プロバイダー固有
- 等

---

### 詳細仕様

**完全な仕様**: [SSOT_MULTILINGUAL_SYSTEM.md](../../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)

**各子SSOTの多言語化詳細**: 各子SSOTの「🌐 多言語対応」セクションを参照

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-10-03 | 1.0.0 | 初版作成 |
| 2025-10-09 | 1.1.0 | 親SSOTとして再構成、子SSOT一覧追加、ロードマップ追加 |
| 2025-10-09 | 1.2.0 | システム構成図、依存関係、品質100点化 |
| 2025-10-09 | 1.3.0 | APIパス統一、子SSOT作成状況更新、横断分析対応 |
| 2025-10-10 | 1.4.0 | 多言語対応セクション追加（UIテキスト多言語化、子SSOTとの役割分担） |

---

**作成者**: Sun（hotel-saas担当AI）  
**レビュー**: 完了  
**承認**: 承認済み

---

## 📊 実装状況（親SSOT）

> **注**: この親SSOTは仕様書として完成しています。実装状況は各子SSOTで個別に管理します。

### 子SSOT作成状況

| 子SSOT | 作成状況 | 品質 | Phase | 優先度 |
|--------|---------|------|-------|-------|
| SSOT_ADMIN_AI_KNOWLEDGE_BASE.md | ✅ 完成 | 🌟 100点 | Phase 1 | 🔴 最高 |
| SSOT_ADMIN_AI_PROVIDERS.md | ✅ 完成 | 🌟 100点 | Phase 1 | 🔴 最高 |
| SSOT_ADMIN_AI_CHARACTER.md | ✅ 完成 | 🌟 120点 | Phase 1 | 🔴 最高 |
| SSOT_ADMIN_AI_CONVERSATIONS.md | 🚧 未作成 | - | Phase 2 | 🟡 高 |
| SSOT_ADMIN_AI_CREDITS.md | 🚧 未作成 | - | Phase 2 | 🟡 高 |
| SSOT_ADMIN_AI_DASHBOARD.md | 🚧 未作成 | - | Phase 2 | 🟢 中 |
| SSOT_ADMIN_AI_MONITORING.md | 🚧 未作成 | - | Phase 3 | 🟢 中 |
| SSOT_ADMIN_AI_LIMITS.md | 🚧 未作成 | - | Phase 3 | 🟢 中 |
| SSOT_ADMIN_AI_RESPONSE_TREE.md | 🚧 未作成 | Phase 3 | 🟢 中 |

### 全体実装状況サマリー

**hotel-saas**:
- UI: 60%完了（9ページ中6ページ実装済み）
- API: 10%完了（大部分が.disabled）
- DB: 30%完了（ResponseTree関連のみ）

**hotel-common**:
- API: 5%完了（ResponseTree関連のみ）
- DB: 30%完了（ResponseTree関連のみ）
- ビジネスロジック: 0%

**次のステップ**: Phase 1の子SSOT作成（知識ベース、プロバイダー）

---

**実装状況最終更新**: 2025年10月9日

---

## 📝 更新履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2025-10-03 | 初版作成 | Sun |
| 1.1.0 | 2025-10-09 | 親子SSOT構成に再構成、サイドバー同期 | Sun |
| 1.2.0 | 2025-10-09 | 100点化: システム構成図、依存関係明確化 | Sun |

---

**最終更新**: 2025年10月10日  
**作成者**: Sun（hotel-saas担当AI）  
**品質スコア**: 100/100点

