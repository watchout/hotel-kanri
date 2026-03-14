# SSOT_ADMIN_AI_SETTINGS.md

**バージョン**: v1.0.0  
**最終更新日**: 2025年10月14日  
**ステータス**: ✅ 完成  
**作成者**: Sun（hotel-saas担当AI）  
**SSOT種別**: 管理機能（Admin Features）  
**優先度**: 🟡 Phase 1 Week 3 - 高優先

---

## 📋 目次

1. [概要](#概要)
2. [システム境界](#システム境界)
3. [既存実装との関係](#既存実装との関係)
4. [データベース設計](#データベース設計)
5. [API設計](#api設計)
6. [UI設計](#ui設計)
7. [実装ガイド](#実装ガイド)
8. [セキュリティ](#セキュリティ)
9. [実装状況](#実装状況)
10. [関連SSOT](#関連ssot)

---

## 概要

### 目的

hotel-saas管理画面における**AIコンシェルジュの統合設定管理機能**を定義します。

本SSOTは、既存の複数のAI関連SSOT（PROVIDERS、CHARACTER、KNOWLEDGE_BASE等）を**一つの統合設定画面**としてまとめ、ホテル管理者が簡単にAIコンシェルジュを設定・管理できる機能を提供します。

### 適用範囲

- **基本設定**: AIコンシェルジュのON/OFF、デフォルトプロバイダー設定
- **プロバイダー管理**: LLMプロバイダー（OpenAI、Anthropic等）の統合管理
- **モデル設定**: 用途別AIモデルの選択・割り当て
- **クレジット管理**: AIクレジットのマークアップ・価格設定
- **利用制限**: テナント別の利用上限設定
- **統計表示**: AI使用状況のダッシュボード

### 設計方針

✅ **既存UI活用**: 既存の3つのVueファイル（ai-base.vue、ai-models.vue、ai-credits.vue）を統合  
✅ **段階的統合**: 既存機能を壊さず、段階的に機能追加  
✅ **SSOT準拠**: 既存の子SSOT（PROVIDERS、CHARACTER等）との整合性維持  
✅ **マルチテナント**: テナント別設定・統計管理  
✅ **本番同等性**: 開発・本番で同一ロジック  

---

## システム境界

### システム役割分担

| システム | 役割 | 許可される操作 |
|:---------|:-----|:---------------|
| **hotel-saas** | 統合設定UI・プロキシ | • hotel-commonのAPI呼び出し<br>• 設定画面の提供<br>• プレビュー機能 |
| **hotel-common** | AI設定管理基盤 | • 設定の保存・取得<br>• プロバイダー管理<br>• クレジット計算<br>• 統計集計 |

### 絶対禁止事項

❌ **hotel-saasでのDB直接アクセス**: 必ずhotel-common経由  
❌ **環境別ロジック**: 本番同等性違反  
❌ **モック・フォールバック**: 実際のAI設定のみ使用  

---

## 既存実装との関係

### 既存UI（hotel-saas）

本SSOTは、**既存の3つのVueファイルを統合**します：

| ファイル | パス | 機能 | 状態 |
|:---------|:-----|:-----|:-----|
| `ai-base.vue` | `/pages/admin/settings/ai-base.vue` | モデル一覧・クレジット設定タブ切り替え | ✅ 実装済み |
| `ai-models.vue` | `/pages/admin/settings/ai-models.vue` | 用途別AIモデル選択 | ✅ 実装済み |
| `ai-credits.vue` | `/pages/admin/settings/ai-credits.vue` | マークアップ・為替レート設定 | ✅ 実装済み |

### 既存API（hotel-saas）

| エンドポイント | 機能 | 状態 |
|:---------------|:-----|:-----|
| `GET /api/v1/admin/system/ai-contexts` | 用途一覧取得 | ✅ 実装済み |
| `POST /api/v1/admin/system/ai-contexts/:contextId` | モデル割り当て保存 | ✅ 実装済み |
| `GET /api/v1/admin/system/credit-markup` | マークアップ取得 | ✅ 実装済み |
| `POST /api/v1/admin/system/credit-markup` | マークアップ保存 | ✅ 実装済み |
| `GET /api/v1/admin/system/exchange-rate` | 為替レート取得 | ✅ 実装済み |
| `POST /api/v1/admin/system/exchange-rate` | 為替レート保存 | ✅ 実装済み |

### 既存SSOT

本SSOTは、以下の既存SSOTと連携します：

| SSOT | バージョン | 関係性 |
|:-----|:-----------|:-------|
| [SSOT_ADMIN_AI_CONCIERGE_OVERVIEW.md](./ai_concierge/SSOT_ADMIN_AI_CONCIERGE_OVERVIEW.md) | v1.4.0 | 親SSOT（全体統括） |
| [SSOT_ADMIN_AI_PROVIDERS.md](./ai_concierge/SSOT_ADMIN_AI_PROVIDERS.md) | v1.2.0 | プロバイダー設定 |
| [SSOT_ADMIN_AI_CHARACTER.md](./ai_concierge/SSOT_ADMIN_AI_CHARACTER.md) | v1.1.0 | キャラクター設定 |
| [SSOT_ADMIN_AI_KNOWLEDGE_BASE.md](./ai_concierge/SSOT_ADMIN_AI_KNOWLEDGE_BASE.md) | - | 知識ベース管理 |
| [SSOT_ADMIN_AI_CONCIERGE_DATABASE.md](./ai_concierge/SSOT_ADMIN_AI_CONCIERGE_DATABASE.md) | - | データベース設計 |

### 統合アプローチ

本SSOTは**既存実装を壊さず**、以下のアプローチで統合します：

1. **Phase 1**: 既存3ファイルをタブ統合UI化（`/pages/admin/settings/ai/index.vue`）
2. **Phase 2**: 基本設定タブ追加（AIのON/OFF、デフォルト設定）
3. **Phase 3**: プロバイダー管理タブ追加（SSOT_ADMIN_AI_PROVIDERS統合）
4. **Phase 4**: 統計ダッシュボードタブ追加
5. **Phase 5**: 既存3ファイルを新統合UIにリダイレクト

---

## データベース設計

### 既存テーブル（SSOT_ADMIN_AI_CONCIERGE_DATABASEより）

本SSOTで使用する既存テーブル定義：

#### 1. tenant_ai_providers（プロバイダー設定）

**用途**: LLMプロバイダーの認証情報・設定管理

```prisma
model TenantAiProvider {
  id                String    @id @default(cuid())
  tenantId          String    @map("tenant_id")
  provider          String    // "openai", "anthropic", "google", "azure_openai"
  displayName       String    @map("display_name")
  apiKeyPrimary     String    @map("api_key_primary")     // 暗号化必須
  apiKeySecondary   String?   @map("api_key_secondary")
  endpointUrl       String?   @map("endpoint_url")
  organizationId    String?   @map("organization_id")
  region            String?
  modelPreference   String    @map("model_preference")
  priority          Int       @default(0)
  isActive          Boolean   @default(true) @map("is_active")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  deletedAt         DateTime? @map("deleted_at")
  isDeleted         Boolean   @default(false) @map("is_deleted")
  
  @@unique([tenantId, provider])
  @@index([tenantId])
  @@index([tenantId, isActive, priority])
  @@index([isDeleted])
  @@map("tenant_ai_providers")
}
```

**実装状況**: ❌ 未作成（SSOT定義済み）

---

#### 2. tenant_ai_model_assignments（モデル割り当て）

**用途**: 用途別AIモデルの割り当て管理

```prisma
model TenantAiModelAssignment {
  id                   String    @id @default(cuid())
  tenantId             String    @map("tenant_id")
  usageContext         String    @map("usage_context")  // "CONCIERGE", "PAGE_GENERATOR", "ANALYTICS"
  providerId           String    @map("provider_id")
  modelName            String    @map("model_name")
  fallbackProviderId   String?   @map("fallback_provider_id")
  isActive             Boolean   @default(true) @map("is_active")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")
  
  @@unique([tenantId, usageContext])
  @@index([tenantId])
  @@map("tenant_ai_model_assignments")
}
```

**実装状況**: ❌ 未作成（SSOT定義済み）

**usageContext定義**:
- `CONCIERGE`: AIコンシェルジュの応答生成
- `PAGE_GENERATOR`: ページ自動生成
- `ANALYTICS`: データ分析

---

### 新規テーブル（本SSOTで追加）

#### 3. tenant_ai_settings（AI統合設定）★新規

**用途**: テナント別のAI統合設定管理

```prisma
model TenantAiSettings {
  id                    String    @id @default(cuid())
  tenantId              String    @unique @map("tenant_id")
  
  // 基本設定
  isEnabled             Boolean   @default(true) @map("is_enabled")
  defaultProviderId     String?   @map("default_provider_id")
  defaultCharacterId    String?   @map("default_character_id")
  
  // RAG設定
  embeddingModel        String    @default("text-embedding-3-small") @map("embedding_model")
  chunkSize             Int       @default(1000) @map("chunk_size")
  retrievalCount        Int       @default(5) @map("retrieval_count")
  similarityThreshold   Decimal   @default(0.7) @map("similarity_threshold") @db.Decimal(3,2)
  
  // クレジット設定
  creditMarkup          Decimal   @default(1.5) @map("credit_markup") @db.Decimal(4,2)
  usdJpyRate            Decimal   @default(150.0) @map("usd_jpy_rate") @db.Decimal(6,2)
  
  // 利用制限
  dailyLimit            Int?      @map("daily_limit")
  conversationLimit     Int?      @map("conversation_limit")
  concurrentLimit       Int       @default(5) @map("concurrent_limit")
  
  // メタデータ
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  createdBy             String    @map("created_by")
  updatedBy             String?   @map("updated_by")
  
  @@index([tenantId])
  @@index([isEnabled])
  @@map("tenant_ai_settings")
}
```

**フィールド説明**:

| フィールド | 型 | デフォルト | 説明 |
|:-----------|:---|:-----------|:-----|
| `is_enabled` | Boolean | true | AIコンシェルジュ全体のON/OFF |
| `default_provider_id` | String | null | デフォルトLLMプロバイダーID |
| `default_character_id` | String | null | デフォルトキャラクターID |
| `embedding_model` | String | text-embedding-3-small | RAG用Embeddingモデル |
| `chunk_size` | Int | 1000 | ドキュメント分割サイズ（トークン） |
| `retrieval_count` | Int | 5 | RAG検索結果取得件数 |
| `similarity_threshold` | Decimal | 0.7 | 類似度閾値 |
| `credit_markup` | Decimal | 1.5 | クレジットマークアップ倍率 |
| `usd_jpy_rate` | Decimal | 150.0 | 為替レート（USD/JPY） |
| `daily_limit` | Int | null | 1日あたりAI使用上限（null=無制限） |
| `conversation_limit` | Int | null | 1会話あたりメッセージ上限 |
| `concurrent_limit` | Int | 5 | 同時実行上限 |

---

#### 4. ai_usage_logs（AI使用ログ）★新規

**用途**: AI使用状況の記録・統計用

```prisma
model AiUsageLog {
  id                String    @id @default(cuid())
  tenantId          String    @map("tenant_id")
  
  // 使用情報
  usageContext      String    @map("usage_context")  // "CONCIERGE", "PAGE_GENERATOR", "ANALYTICS"
  providerId        String    @map("provider_id")
  modelName         String    @map("model_name")
  
  // トークン情報
  promptTokens      Int       @map("prompt_tokens")
  completionTokens  Int       @map("completion_tokens")
  totalTokens       Int       @map("total_tokens")
  
  // コスト情報
  costUsd           Decimal   @map("cost_usd") @db.Decimal(10,6)
  costJpy           Decimal   @map("cost_jpy") @db.Decimal(10,2)
  creditsUsed       Int       @map("credits_used")
  
  // 実行情報
  responseTimeMs    Int       @map("response_time_ms")
  success           Boolean   @default(true)
  errorMessage      String?   @map("error_message")
  
  // メタデータ
  requestId         String?   @map("request_id")
  userId            String?   @map("user_id")
  sessionId         String?   @map("session_id")
  createdAt         DateTime  @default(now()) @map("created_at")
  
  @@index([tenantId, createdAt])
  @@index([tenantId, usageContext, createdAt])
  @@index([createdAt])
  @@map("ai_usage_logs")
}
```

**用途**: 
- 統計ダッシュボード表示
- コスト分析
- 使用状況モニタリング

---

## API設計

### エンドポイント一覧

| メソッド | エンドポイント | 説明 | 実装場所 | 状態 |
|:---------|:---------------|:-----|:---------|:-----|
| GET | `/api/v1/admin/ai/settings` | AI統合設定取得 | hotel-common | ❌ |
| PUT | `/api/v1/admin/ai/settings` | AI統合設定更新 | hotel-common | ❌ |
| GET | `/api/v1/admin/ai/providers/list` | プロバイダー一覧 | hotel-common | ❌ |
| POST | `/api/v1/admin/ai/providers/create` | プロバイダー追加 | hotel-common | ❌ |
| PUT | `/api/v1/admin/ai/providers/[id]` | プロバイダー更新 | hotel-common | ❌ |
| DELETE | `/api/v1/admin/ai/providers/[id]` | プロバイダー削除 | hotel-common | ❌ |
| POST | `/api/v1/admin/ai/providers/[id]/test` | 接続テスト | hotel-common | ❌ |
| GET | `/api/v1/admin/ai/usage/stats` | 使用統計取得 | hotel-common | ❌ |
| GET | `/api/v1/admin/ai/usage/logs` | 使用ログ一覧 | hotel-common | ❌ |

**既存API（継続使用）**:
- ✅ `GET/POST /api/v1/admin/system/ai-contexts` - モデル割り当て
- ✅ `GET/POST /api/v1/admin/system/credit-markup` - マークアップ設定
- ✅ `GET/POST /api/v1/admin/system/exchange-rate` - 為替レート設定

---

### 1. AI統合設定取得API

#### GET /api/v1/admin/ai/settings

**用途**: テナントのAI統合設定を取得

**リクエスト**: なし

**レスポンス**:
```typescript
{
  id: string
  tenantId: string
  isEnabled: boolean
  defaultProviderId: string | null
  defaultCharacterId: string | null
  embeddingModel: string
  chunkSize: number
  retrievalCount: number
  similarityThreshold: number
  creditMarkup: number
  usdJpyRate: number
  dailyLimit: number | null
  conversationLimit: number | null
  concurrentLimit: number
  createdAt: string
  updatedAt: string
}
```

**実装場所**: `/Users/kaneko/hotel-common/src/routes/api/v1/admin/ai/settings.ts`

**認証**: Session認証必須（`tenant_id`フィルタ必須）

---

### 2. AI統合設定更新API

#### PUT /api/v1/admin/ai/settings

**用途**: テナントのAI統合設定を更新

**リクエスト**:
```typescript
{
  isEnabled?: boolean
  defaultProviderId?: string | null
  defaultCharacterId?: string | null
  embeddingModel?: string
  chunkSize?: number
  retrievalCount?: number
  similarityThreshold?: number
  creditMarkup?: number
  usdJpyRate?: number
  dailyLimit?: number | null
  conversationLimit?: number | null
  concurrentLimit?: number
}
```

**レスポンス**:
```typescript
{
  success: boolean
  settings: {
    // GET /api/v1/admin/ai/settings と同じ
  }
}
```

**バリデーション**:
- `chunkSize`: 100 ~ 4000
- `retrievalCount`: 1 ~ 20
- `similarityThreshold`: 0.0 ~ 1.0
- `creditMarkup`: 1.0 ~ 10.0
- `usdJpyRate`: 100.0 ~ 200.0
- `concurrentLimit`: 1 ~ 20

---

### 3. プロバイダー一覧取得API

#### GET /api/v1/admin/ai/providers/list

**用途**: 登録済みプロバイダー一覧取得

**クエリパラメータ**:
```typescript
{
  isActive?: boolean  // true: 有効のみ, false: 無効のみ
}
```

**レスポンス**:
```typescript
{
  providers: Array<{
    id: string
    tenantId: string
    provider: string  // "openai", "anthropic", "google"
    displayName: string
    endpointUrl: string | null
    modelPreference: string
    priority: number
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>
}
```

**注意**: `apiKeyPrimary`は**絶対に返さない**（セキュリティ）

---

### 4. プロバイダー追加API

#### POST /api/v1/admin/ai/providers/create

**用途**: 新しいLLMプロバイダーを追加

**リクエスト**:
```typescript
{
  provider: string        // "openai" | "anthropic" | "google" | "azure_openai"
  displayName: string
  apiKeyPrimary: string   // 暗号化して保存
  apiKeySecondary?: string
  endpointUrl?: string    // Azure等で必要
  organizationId?: string
  region?: string
  modelPreference: string
  priority?: number       // デフォルト: 0
  isActive?: boolean      // デフォルト: true
}
```

**レスポンス**:
```typescript
{
  success: boolean
  provider: {
    id: string
    tenantId: string
    provider: string
    displayName: string
    // ... (apiKey以外の全フィールド)
  }
}
```

**セキュリティ**:
- `apiKeyPrimary`は必ず暗号化: `encryptApiKey(apiKey, process.env.ENCRYPTION_KEY)`
- レスポンスにAPIキーを含めない

---

### 5. プロバイダー接続テストAPI

#### POST /api/v1/admin/ai/providers/[id]/test

**用途**: プロバイダーの接続テスト

**リクエスト**: なし

**レスポンス**:
```typescript
{
  success: boolean
  provider: string
  modelName: string
  responseTimeMs: number
  testPrompt: string
  testResponse: string
  error?: string
}
```

**実装**:
```typescript
// OpenAIの場合
const response = await openai.chat.completions.create({
  model: provider.modelPreference,
  messages: [{ role: "user", content: "Hello" }],
  max_tokens: 10
})
```

---

### 6. 使用統計取得API

#### GET /api/v1/admin/ai/usage/stats

**用途**: AI使用統計を取得

**クエリパラメータ**:
```typescript
{
  from?: string      // ISO 8601形式（デフォルト: 30日前）
  to?: string        // ISO 8601形式（デフォルト: 現在）
  groupBy?: string   // "day" | "hour" | "context"
}
```

**レスポンス**:
```typescript
{
  summary: {
    totalRequests: number
    totalTokens: number
    totalCostUsd: number
    totalCostJpy: number
    totalCredits: number
    avgResponseTimeMs: number
    successRate: number  // 0.0 ~ 1.0
  },
  byContext: {
    CONCIERGE: {
      requests: number
      tokens: number
      costUsd: number
    },
    PAGE_GENERATOR: { ... },
    ANALYTICS: { ... }
  },
  byDate: Array<{
    date: string
    requests: number
    tokens: number
    costUsd: number
  }>
}
```

---

## UI設計

### ページ構成

#### 統合設定画面: `/admin/settings/ai/index.vue` ★新規作成

**タブ構成**:
```
┌─────────────────────────────────────────────┐
│ ⚙️ AI設定                                    │
├─────────────────────────────────────────────┤
│ [基本設定] [プロバイダー] [モデル選択]      │
│ [クレジット] [統計] [詳細設定]              │
├─────────────────────────────────────────────┤
│                                             │
│ (選択されたタブの内容)                      │
│                                             │
└─────────────────────────────────────────────┘
```

---

### タブ1: 基本設定 ★新規

```vue
<!-- /pages/admin/settings/ai/index.vue -->
<template>
  <div v-if="currentTab === 'basic'">
    <!-- AIコンシェルジュ有効/無効 -->
    <div class="mb-6">
      <label class="flex items-center">
        <input 
          v-model="settings.isEnabled" 
          type="checkbox" 
          class="mr-2"
        />
        AIコンシェルジュを有効にする
      </label>
    </div>

    <!-- デフォルトプロバイダー選択 -->
    <div class="mb-6">
      <label class="block mb-2">デフォルトLLMプロバイダー</label>
      <select v-model="settings.defaultProviderId" class="border rounded px-3 py-2">
        <option :value="null">未設定</option>
        <option 
          v-for="p in providers" 
          :key="p.id" 
          :value="p.id"
        >
          {{ p.displayName }}
        </option>
      </select>
    </div>

    <!-- RAG設定 -->
    <div class="mb-6">
      <h3 class="font-semibold mb-2">RAG設定</h3>
      
      <div class="mb-4">
        <label class="block mb-2">Embeddingモデル</label>
        <select v-model="settings.embeddingModel" class="border rounded px-3 py-2">
          <option value="text-embedding-3-small">text-embedding-3-small</option>
          <option value="text-embedding-3-large">text-embedding-3-large</option>
        </select>
      </div>

      <div class="mb-4">
        <label class="block mb-2">チャンクサイズ（トークン）</label>
        <input 
          v-model.number="settings.chunkSize" 
          type="number" 
          min="100" 
          max="4000"
          class="border rounded px-3 py-2"
        />
      </div>

      <div class="mb-4">
        <label class="block mb-2">検索結果取得件数</label>
        <input 
          v-model.number="settings.retrievalCount" 
          type="number" 
          min="1" 
          max="20"
          class="border rounded px-3 py-2"
        />
      </div>
    </div>

    <!-- 利用制限 -->
    <div class="mb-6">
      <h3 class="font-semibold mb-2">利用制限</h3>
      
      <div class="mb-4">
        <label class="block mb-2">1日あたり上限（null=無制限）</label>
        <input 
          v-model.number="settings.dailyLimit" 
          type="number"
          class="border rounded px-3 py-2"
        />
      </div>

      <div class="mb-4">
        <label class="block mb-2">同時実行上限</label>
        <input 
          v-model.number="settings.concurrentLimit" 
          type="number" 
          min="1" 
          max="20"
          class="border rounded px-3 py-2"
        />
      </div>
    </div>

    <button 
      @click="saveSettings" 
      class="px-4 py-2 bg-blue-600 text-white rounded"
    >
      設定を保存
    </button>
  </div>
</template>
```

---

### タブ2: プロバイダー ★新規

```vue
<template>
  <div v-if="currentTab === 'providers'">
    <!-- プロバイダー一覧 -->
    <div class="mb-4">
      <button 
        @click="showAddProviderModal = true" 
        class="px-4 py-2 bg-green-600 text-white rounded"
      >
        + プロバイダーを追加
      </button>
    </div>

    <table class="min-w-full">
      <thead>
        <tr>
          <th>プロバイダー</th>
          <th>モデル</th>
          <th>優先度</th>
          <th>状態</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in providers" :key="p.id">
          <td>{{ p.displayName }}</td>
          <td>{{ p.modelPreference }}</td>
          <td>{{ p.priority }}</td>
          <td>
            <span :class="p.isActive ? 'text-green-600' : 'text-gray-400'">
              {{ p.isActive ? '有効' : '無効' }}
            </span>
          </td>
          <td>
            <button @click="testProvider(p.id)">接続テスト</button>
            <button @click="editProvider(p)">編集</button>
            <button @click="deleteProvider(p.id)">削除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

---

### タブ3: モデル選択 ★既存（ai-models.vue統合）

既存の`/pages/admin/settings/ai-models.vue`の内容をタブ内に表示

---

### タブ4: クレジット ★既存（ai-credits.vue統合）

既存の`/pages/admin/settings/ai-credits.vue`の内容をタブ内に表示

---

### タブ5: 統計 ★新規

```vue
<template>
  <div v-if="currentTab === 'stats'">
    <!-- サマリー -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded shadow">
        <div class="text-sm text-gray-600">総リクエスト数</div>
        <div class="text-2xl font-bold">{{ stats.summary.totalRequests }}</div>
      </div>
      <div class="bg-white p-4 rounded shadow">
        <div class="text-sm text-gray-600">総トークン数</div>
        <div class="text-2xl font-bold">{{ stats.summary.totalTokens.toLocaleString() }}</div>
      </div>
      <div class="bg-white p-4 rounded shadow">
        <div class="text-sm text-gray-600">総コスト（円）</div>
        <div class="text-2xl font-bold">¥{{ stats.summary.totalCostJpy.toLocaleString() }}</div>
      </div>
      <div class="bg-white p-4 rounded shadow">
        <div class="text-sm text-gray-600">成功率</div>
        <div class="text-2xl font-bold">{{ (stats.summary.successRate * 100).toFixed(1) }}%</div>
      </div>
    </div>

    <!-- 用途別使用状況 -->
    <div class="bg-white p-6 rounded shadow mb-6">
      <h3 class="font-semibold mb-4">用途別使用状況</h3>
      <table class="min-w-full">
        <thead>
          <tr>
            <th>用途</th>
            <th>リクエスト数</th>
            <th>トークン数</th>
            <th>コスト（円）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(data, context) in stats.byContext" :key="context">
            <td>{{ getContextLabel(context) }}</td>
            <td>{{ data.requests }}</td>
            <td>{{ data.tokens.toLocaleString() }}</td>
            <td>¥{{ data.costJpy.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 日別グラフ（Chart.js等） -->
    <div class="bg-white p-6 rounded shadow">
      <h3 class="font-semibold mb-4">日別使用状況</h3>
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>
```

---

## 実装ガイド

### hotel-saas実装

#### 1. Composable作成

```typescript
// composables/useAiSettings.ts
export const useAiSettings = () => {
  const settings = ref<any>(null)
  const loading = ref(false)

  const fetchSettings = async () => {
    loading.value = true
    try {
      settings.value = await $fetch('http://localhost:3400/api/v1/admin/ai/settings', {
        headers: {
          'Cookie': useCookie('hotel_session').value
        }
      })
    } finally {
      loading.value = false
    }
  }

  const updateSettings = async (data: any) => {
    return await $fetch('http://localhost:3400/api/v1/admin/ai/settings', {
      method: 'PUT',
      headers: {
        'Cookie': useCookie('hotel_session').value
      },
      body: data
    })
  }

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings
  }
}
```

---

### hotel-common実装

#### 1. AI設定取得API

```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/admin/ai/settings.ts
import { Router } from 'express'
import { getAdapter } from '../../../database/prisma-adapter'
import { verifySession } from '../../../auth/SessionAuthService'

const router = Router()

// GET /api/v1/admin/ai/settings
router.get('/settings', async (req, res) => {
  try {
    const session = await verifySession(req)
    if (!session) {
      return res.status(401).json({ error: '認証が必要です' })
    }

    const db = await getAdapter()
    
    let settings = await db.tenantAiSettings.findUnique({
      where: { tenantId: session.tenantId }
    })

    // 初回アクセス時は自動作成
    if (!settings) {
      settings = await db.tenantAiSettings.create({
        data: {
          id: `ai_settings_${Date.now()}`,
          tenantId: session.tenantId,
          createdBy: session.user.id
        }
      })
    }

    res.json(settings)
  } catch (error) {
    console.error('AI設定取得エラー:', error)
    res.status(500).json({ error: 'サーバーエラー' })
  }
})

export default router
```

---

#### 2. AI設定更新API

```typescript
// PUT /api/v1/admin/ai/settings
router.put('/settings', async (req, res) => {
  try {
    const session = await verifySession(req)
    if (!session) {
      return res.status(401).json({ error: '認証が必要です' })
    }

    const {
      isEnabled,
      defaultProviderId,
      defaultCharacterId,
      embeddingModel,
      chunkSize,
      retrievalCount,
      similarityThreshold,
      creditMarkup,
      usdJpyRate,
      dailyLimit,
      conversationLimit,
      concurrentLimit
    } = req.body

    // バリデーション
    if (chunkSize && (chunkSize < 100 || chunkSize > 4000)) {
      return res.status(400).json({ error: 'チャンクサイズは100~4000の範囲で指定してください' })
    }

    if (retrievalCount && (retrievalCount < 1 || retrievalCount > 20)) {
      return res.status(400).json({ error: '検索件数は1~20の範囲で指定してください' })
    }

    const db = await getAdapter()

    const settings = await db.tenantAiSettings.upsert({
      where: { tenantId: session.tenantId },
      create: {
        id: `ai_settings_${Date.now()}`,
        tenantId: session.tenantId,
        createdBy: session.user.id,
        ...req.body
      },
      update: {
        ...req.body,
        updatedBy: session.user.id
      }
    })

    res.json({ success: true, settings })
  } catch (error) {
    console.error('AI設定更新エラー:', error)
    res.status(500).json({ error: 'サーバーエラー' })
  }
})
```

---

## セキュリティ

### 1. APIキー暗号化（CRITICAL）

**全APIキーは必ず暗号化**:

```typescript
import crypto from 'crypto'

// 暗号化
export function encryptApiKey(apiKey: string): string {
  const algorithm = 'aes-256-cbc'
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// 復号化
export function decryptApiKey(encryptedKey: string): string {
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

**環境変数**:
```bash
# .env
ENCRYPTION_KEY=64文字の16進数文字列（32バイト）
# 生成方法: openssl rand -hex 32
```

### 2. マルチテナント分離

**全データに`tenant_id`フィルタ必須**:

```typescript
// ✅ 正しい
const settings = await db.tenantAiSettings.findUnique({
  where: { 
    tenantId: session.tenantId  // ← 必須
  }
})

// ❌ 間違い
const settings = await db.tenantAiSettings.findFirst()  // 他テナントデータも取得可能
```

### 3. APIレスポンスからAPIキー除外

**APIキーは絶対にクライアントに返さない**:

```typescript
// プロバイダー一覧取得時
const providers = await db.tenantAiProvider.findMany({
  where: { tenantId: session.tenantId },
  select: {
    id: true,
    tenantId: true,
    provider: true,
    displayName: true,
    modelPreference: true,
    priority: true,
    isActive: true,
    // apiKeyPrimary: ❌ 絶対に含めない
    // apiKeySecondary: ❌ 絶対に含めない
  }
})
```

---

## 実装状況

### Phase 1: データベース実装 ❌ 未実装

**新規テーブル**:
- [ ] `tenant_ai_settings`テーブル作成
- [ ] `ai_usage_logs`テーブル作成

**既存テーブル（SSOT定義済み）**:
- [ ] `tenant_ai_providers`テーブル作成
- [ ] `tenant_ai_model_assignments`テーブル作成

### Phase 2: API実装 ❌ 未実装

**新規API（hotel-common）**:
- [ ] `/api/v1/admin/ai/settings` (GET/PUT)
- [ ] `/api/v1/admin/ai/providers/list` (GET)
- [ ] `/api/v1/admin/ai/providers/create` (POST)
- [ ] `/api/v1/admin/ai/providers/[id]` (PUT/DELETE)
- [ ] `/api/v1/admin/ai/providers/[id]/test` (POST)
- [ ] `/api/v1/admin/ai/usage/stats` (GET)
- [ ] `/api/v1/admin/ai/usage/logs` (GET)

**既存API（継続使用）**:
- [x] `/api/v1/admin/system/ai-contexts` ✅
- [x] `/api/v1/admin/system/credit-markup` ✅
- [x] `/api/v1/admin/system/exchange-rate` ✅

### Phase 3: フロントエンド実装 🟡 部分実装

**既存UI（統合対象）**:
- [x] `ai-base.vue` ✅ 実装済み
- [x] `ai-models.vue` ✅ 実装済み
- [x] `ai-credits.vue` ✅ 実装済み

**新規UI**:
- [ ] `/pages/admin/settings/ai/index.vue` - タブ統合UI
- [ ] 基本設定タブ
- [ ] プロバイダー管理タブ
- [ ] 統計ダッシュボードタブ
- [ ] `composables/useAiSettings.ts`
- [ ] `composables/useAiProviders.ts`

### Phase 4: テスト ❌ 未実装

- [ ] APIテスト（curl）
- [ ] 手動UIテスト

### Phase 5: SSOT準拠確認 ❌ 未実施

- [ ] DATABASE_NAMING_STANDARD v3.0.0準拠確認
- [ ] API_ROUTING_GUIDELINES準拠確認
- [ ] 既存SSOTとの整合性確認

### 実装完了率

**Phase完了数**: 0 / 5  
**完了率**: 0%

**既存実装活用率**: 30%（既存UI 3ファイル、既存API 3エンドポイント）

---

## 関連SSOT

### 親SSOT
- [SSOT_ADMIN_AI_CONCIERGE_OVERVIEW.md](./ai_concierge/SSOT_ADMIN_AI_CONCIERGE_OVERVIEW.md) v1.4.0 - AIコンシェルジュ全体概要

### 子SSOT（機能別）
- [SSOT_ADMIN_AI_PROVIDERS.md](./ai_concierge/SSOT_ADMIN_AI_PROVIDERS.md) v1.2.0 - LLMプロバイダー設定
- [SSOT_ADMIN_AI_CHARACTER.md](./ai_concierge/SSOT_ADMIN_AI_CHARACTER.md) v1.1.0 - AIキャラクター設定
- [SSOT_ADMIN_AI_KNOWLEDGE_BASE.md](./ai_concierge/SSOT_ADMIN_AI_KNOWLEDGE_BASE.md) - 知識ベース管理
- [SSOT_ADMIN_AI_CONCIERGE_DATABASE.md](./ai_concierge/SSOT_ADMIN_AI_CONCIERGE_DATABASE.md) - データベース設計

### 基盤SSOT
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) v1.2.0 - 管理画面認証
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) v1.5.0 - マルチテナント
- [SSOT_DATABASE_SCHEMA.md](../00_foundation/SSOT_DATABASE_SCHEMA.md) - DBスキーマ

### 標準・規約
- [DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) v3.0.0 - データベース命名規則
- [API_ROUTING_GUIDELINES.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md) - APIルーティング規則

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|:-----------|:-----|:---------|:-------|
| v1.0.0 | 2025-10-14 | 初版作成 | Sun |

---

**ドキュメント終了**

