---
# ============================================================
# YAML Front Matter（機械チェック対象）
# ============================================================
doc_id: SSOT-[CATEGORY]-[NAME]-001
title: [機能名]
version: 1.0.0
status: draft   # draft | review | approved | implemented | deprecated
owner: [担当者/チーム]
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD

# 適用システム
scope:
  - hotel-common
  - hotel-saas

# 依存関係
related_ssot:
  - SSOT-FOUNDATION-MARKETING-001
  - SSOT-FOUNDATION-DB-001
related_docs:
  - ADR-XXXX
tickets:
  - DEV-XXXX

# リスク・フラグ
risk_level: medium  # low | medium | high
requires_config: true       # Config First対象
requires_tracking: true     # Tracking by Default対象
depends_on:
  - tenant_settings         # 依存基盤テーブル
---

# 📋 SSOT: [機能名]

**関連SSOT**:
- [SSOT_MARKETING_INTEGRATION.md](../00_foundation/SSOT_MARKETING_INTEGRATION.md) - Config First / Tracking by Default
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DB設計

**関連ドキュメント**:
- [DOC_XXX.md](/path/to/DOC_XXX.md) - 説明

---

## 📋 目次

### A. 仕様の核
1. [概要](#-概要)
2. [ユーザーストーリー](#-ユーザーストーリー)
3. [必須要件（CRITICAL）](#-必須要件critical)
4. [合格条件（Acceptance Criteria）](#-合格条件acceptance-criteria)

### B. Config First / Tracking by Default
5. [Configuration（設定）](#-configuration設定)
6. [Analytics & Tracking](#-analytics--tracking)
7. [Observability（監視）](#-observability監視)

### C. 実装仕様
8. [データベース設計](#-データベース設計)
9. [API仕様](#-api仕様)
10. [フロントエンド実装](#-フロントエンド実装)
11. [セキュリティ](#-セキュリティ)

### D. 変更・移行・リリース
12. [Migration / Compatibility](#-migration--compatibility)
13. [Rollout Plan](#-rollout-plan)
14. [Risks & Edge Cases](#-risks--edge-cases)

### E. 進捗管理
15. [実装状況](#-実装状況)
16. [実装チェックリスト](#-実装チェックリスト)
17. [更新履歴](#-更新履歴)

---

# A. 仕様の核

---

## 📖 概要

### 目的

[この機能が解決する課題・提供する価値を記載]

### 非目的（スコープ外）

- [この機能で対応しないこと]
- [将来のフェーズに先送りすること]

### 適用範囲

| システム | 対象 | 備考 |
|:---------|:-----|:-----|
| hotel-common | API / DB | 実処理 |
| hotel-saas | UI / Proxy | 中継・表示 |

### 技術スタック

- **フロントエンド**: Vue 3 + Nuxt 3 + Vuetify 3
- **バックエンド**: Express.js (hotel-common) / Nuxt Nitro (hotel-saas)
- **データベース**: PostgreSQL + Prisma
- **認証**: Session認証（Redis + HttpOnly Cookie）
- **状態管理**: Composables

### 命名規則統一

- **データベース**: `snake_case` (例: `tenant_id`, `created_at`)
- **API/JSON**: `camelCase` (例: `tenantId`, `createdAt`)
- **変数名**: `camelCase` (JavaScript/TypeScript標準)

**重要**: 同じ概念は必ず同じ名称を使用
- テナントID: DB=`tenant_id`, API/JSON=`tenantId`
- セッションID: DB=`session_id`, API/JSON=`sessionId`

---

## 👤 ユーザーストーリー

### ゲスト向け

| ID | As a | I want to | So that |
|:---|:-----|:----------|:--------|
| US-G01 | ゲスト | [行動] | [価値] |
| US-G02 | ゲスト | [行動] | [価値] |

### スタッフ向け

| ID | As a | I want to | So that |
|:---|:-----|:----------|:--------|
| US-S01 | スタッフ | [行動] | [価値] |
| US-S02 | 管理者 | [行動] | [価値] |

---

## 🚨 必須要件（CRITICAL）

### 1. マルチテナント分離

**全てのクエリに`tenantId`を含めること**

**理由**: テナント間のデータ漏洩を防止

```typescript
// ❌ 禁止
const data = await prisma.table.findMany()

// ✅ 必須
const data = await prisma.table.findMany({
  where: { tenantId }
})
```

### 2. Config First（ハードコード禁止）

**設定値は`tenant_settings`から取得すること**

**理由**: テナント別カスタマイズ・運用変更に対応

```typescript
// ❌ 禁止
const timeout = 60

// ✅ 必須
const timeout = await getConfig<number>(tenantId, 'feature', 'timeout') ?? 60
```

### 3. [機能固有の必須要件]

**[要件内容]**

**理由**: [理由を記載]

---

## ✅ 合格条件（Acceptance Criteria）

### AC-001: [機能名1]

```gherkin
Given [前提条件]
  And [追加条件]
When [操作]
Then [期待結果]
  And [追加の期待結果]
```

### AC-002: [機能名2]

- [ ] [テスト可能な条件1]
- [ ] [テスト可能な条件2]
- [ ] [テスト可能な条件3]

### AC-003: エラーケース

```gherkin
Given ユーザーが認証されていない
When [操作]
Then 401エラーが返される
  And エラーメッセージが表示される
```

---

# B. Config First / Tracking by Default

---

## ⚙️ Configuration（設定）

> **Config First原則**: テキスト、パラメータ、価格等はすべて`tenant_settings`で管理

### 設定一覧

| category | key | type | default | scope | ui_exposed | description |
|:---------|:----|:-----|:--------|:------|:-----------|:------------|
| `[feature]` | `enabled` | boolean | `true` | tenant | true | 機能の有効化 |
| `[feature]` | `timeout_seconds` | number | `60` | tenant | true | タイムアウト秒数 |
| `[feature]` | `message` | string | `"デフォルト"` | tenant | true | 表示メッセージ |

### 取得方法（hotel-common）

```typescript
import { getConfig } from '@/services/config.service'

// 単一設定取得
const timeout = await getConfig<number>(tenantId, '[feature]', 'timeout_seconds') ?? 60

// カテゴリ一括取得
const settings = await getConfigsByCategory(tenantId, '[feature]')
```

### 管理画面（hotel-saas）

- 設定画面パス: `/admin/settings/[feature]`
- 権限: `settings:write`

---

## 📊 Analytics & Tracking

> **Tracking by Default原則**: ビジネスに価値のあるイベントは必ず記録

### イベント一覧

| event | analytics_id | when | payload_schema | pii | storage |
|:------|:-------------|:-----|:---------------|:----|:--------|
| `[feature]_started` | `ANL-XXX-001` | 機能開始時 | `{tenantId, userId}` | none | DB |
| `[feature]_completed` | `ANL-XXX-002` | 機能完了時 | `{tenantId, result}` | none | DB + GA4 |
| `[feature]_error` | `ANL-XXX-003` | エラー発生時 | `{tenantId, error}` | none | DB |

### フロントエンド発火

```vue
<template>
  <v-btn 
    data-analytics-id="ANL-XXX-001"
    @click="handleClick"
  >
    ボタン
  </v-btn>
</template>

<script setup>
const handleClick = () => {
  // analytics_idは自動収集される
}
</script>
```

### バックエンド記録

```typescript
import { logEvent } from '@/services/analytics.service'

await logEvent(tenantId, '[feature]_completed', {
  userId: user.id,
  result: 'success',
  duration: elapsedMs
})
```

---

## 🔍 Observability（監視）

### ログ出力

| レベル | 条件 | メッセージ例 |
|:-------|:-----|:-------------|
| INFO | 正常完了時 | `[Feature] completed: {id} in {ms}ms` |
| WARN | 警告条件時 | `[Feature] slow response: {ms}ms > threshold` |
| ERROR | エラー時 | `[Feature] failed: {error.message}` |

```typescript
import { logger } from '@/utils/logger'

logger.info('[Feature] completed', { id, duration: elapsedMs })
logger.warn('[Feature] slow response', { duration: elapsedMs, threshold })
logger.error('[Feature] failed', { error: error.message, stack: error.stack })
```

### アラート条件

| 条件 | 閾値 | 通知先 |
|:-----|:-----|:-------|
| エラー率 | > 5% / 5分 | Slack #alerts |
| レイテンシ p95 | > 2秒 | Slack #alerts |
| 失敗カウント | > 10件 / 1時間 | Email |

---

# C. 実装仕様

---

## 🗄️ データベース設計

### テーブル定義

```prisma
model ExampleTable {
  id        String   @id @default(cuid()) @map("id")
  tenantId  String   @map("tenant_id")
  name      String   @map("name")
  status    String   @default("pending") @map("status")
  metadata  Json?    @map("metadata")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relations
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, name])
  @@index([tenantId], map: "idx_example_table_tenant")
  @@index([tenantId, status], map: "idx_example_table_status")
  @@map("example_table")
}
```

### 命名規則

| 項目 | 規則 | 例 |
|:-----|:-----|:---|
| テーブル名 | `snake_case` | `example_table` |
| カラム名 | `snake_case` | `tenant_id` |
| Prismaフィールド | `camelCase` | `tenantId` |
| インデックス | `idx_テーブル_カラム` | `idx_example_table_tenant` |

### 必須カラム

全テーブルに必須:
- `tenant_id` - マルチテナント分離
- `created_at` - 作成日時
- `updated_at` - 更新日時

---

## 🔌 API仕様

### エンドポイント一覧

| Method | Path | 説明 | 認証 |
|:-------|:-----|:-----|:-----|
| GET | `/api/v1/admin/[resource]` | 一覧取得 | Session（Admin） |
| POST | `/api/v1/admin/[resource]` | 新規作成 | Session（Admin） |
| GET | `/api/v1/admin/[resource]/:id` | 詳細取得 | Session（Admin） |
| PUT | `/api/v1/admin/[resource]/:id` | 更新 | Session（Admin） |
| DELETE | `/api/v1/admin/[resource]/:id` | 削除 | Session（Admin） |

### hotel-common 実装

#### GET /api/v1/admin/[resource]

**実装ファイル**: `/Users/kaneko/hotel-common-rebuild/src/routes/admin/[resource].routes.ts`

**リクエスト**:
```typescript
// Query Parameters
interface ListQuery {
  page?: number      // default: 1
  limit?: number     // default: 20, max: 100
  status?: string    // フィルター
}
```

**レスポンス（成功）**:
```typescript
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "xxx",
        "name": "Example",
        "status": "active",
        "createdAt": "2026-01-23T10:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  },
  "meta": {
    "requestId": "req_xxx",
    "timestamp": "2026-01-23T15:00:00Z"
  }
}
```

**レスポンス（エラー）**:
```typescript
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  },
  "meta": {
    "requestId": "req_xxx",
    "timestamp": "2026-01-23T15:00:00Z"
  }
}
```

**エラーコード**:

| コード | ステータス | 説明 |
|:-------|:-----------|:-----|
| `UNAUTHORIZED` | 401 | 認証されていない |
| `FORBIDDEN` | 403 | 権限がない |
| `NOT_FOUND` | 404 | リソースが存在しない |
| `VALIDATION_ERROR` | 400 | バリデーションエラー |

### hotel-saas プロキシ

**実装ファイル**: `/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[resource].get.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/hotelCommon'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  return await callHotelCommonAPI(event, '/api/v1/admin/[resource]', {
    method: 'GET',
    query
  })
})
```

### システム間連携フロー

```
ブラウザ
  ↓ $fetch('/api/v1/admin/[resource]')
hotel-saas (Nuxt Nitro API)
  ↓ callHotelCommonAPI()
  ↓ Cookie: hotel_session={sessionId}
hotel-common (Express API)
  ↓ authMiddleware.authenticate()
  ↓ SessionService.validate()
Redis
  ← session data
hotel-common
  ↓ prisma.exampleTable.findMany()
PostgreSQL
  ← data
  ↓ Response
hotel-saas
  ↓ Response (透過)
ブラウザ
```

---

## 🎨 フロントエンド実装

### ページ一覧

| パス | 画面名 | 説明 |
|:-----|:-------|:-----|
| `/admin/[feature]` | 一覧画面 | データ一覧表示 |
| `/admin/[feature]/[id]` | 詳細画面 | 詳細表示・編集 |
| `/admin/[feature]/new` | 新規作成 | 新規データ作成 |

### Composable

**実装ファイル**: `/Users/kaneko/hotel-saas-rebuild/composables/use[Feature].ts`

```typescript
export function use[Feature]() {
  const items = ref<Item[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const fetchItems = async (params?: ListParams) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/v1/admin/[resource]', {
        query: params
      })
      if (response.success) {
        items.value = response.data.items
      }
    } catch (e: any) {
      error.value = e.data?.error?.message ?? 'エラーが発生しました'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  const createItem = async (data: CreateItemInput) => {
    loading.value = true
    try {
      const response = await $fetch('/api/v1/admin/[resource]', {
        method: 'POST',
        body: data
      })
      return response.data
    } finally {
      loading.value = false
    }
  }
  
  return {
    items,
    loading,
    error,
    fetchItems,
    createItem
  }
}
```

### バリデーション

| フィールド | ルール | エラーメッセージ |
|:-----------|:-------|:-----------------|
| name | 必須、1-100文字 | 名前は必須です |
| email | 必須、メール形式 | 有効なメールアドレスを入力してください |
| status | enum | 無効なステータスです |

---

## 🔐 セキュリティ

### 認証・認可

| 項目 | 仕様 |
|:-----|:-----|
| 認証方式 | Session認証（Redis + HttpOnly Cookie） |
| 認可 | RBAC（ロールベース） |
| 必要権限 | `[resource]:read`, `[resource]:write` |

### データ保護

| 項目 | 仕様 |
|:-----|:-----|
| PII | [あり/なし] |
| 暗号化対象 | [該当フィールド] |
| 保持期間 | [日数] |
| 監査ログ | 作成・更新・削除時 |

### 入力検証

```typescript
// hotel-common側でのバリデーション
import { z } from 'zod'

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  status: z.enum(['active', 'inactive']),
})

// 使用
const validated = CreateSchema.parse(req.body)
```

---

# D. 変更・移行・リリース

---

## 🔄 Migration / Compatibility

### 既存データ移行

```sql
-- 必要な場合のマイグレーションスクリプト
-- 例: 既存テーブルへのカラム追加
ALTER TABLE example_table ADD COLUMN new_field VARCHAR(255);

-- デフォルト値の設定
UPDATE example_table SET new_field = 'default' WHERE new_field IS NULL;
```

### 後方互換性

| 項目 | 対応 |
|:-----|:-----|
| API互換性 | 維持（新フィールドは任意） |
| DB互換性 | 新規カラム追加（既存に影響なし） |
| ロールバック | 可能（カラム削除で対応） |

### 既存機能への影響

- [影響1]: [対応方法]
- [影響2]: [対応方法]

---

## 🚀 Rollout Plan

### リリース戦略

| フェーズ | 対象 | 条件 | 期間 |
|:---------|:-----|:-----|:-----|
| Phase 1 | 開発環境 | テスト完了 | - |
| Phase 2 | ステージング | QA完了 | 1日 |
| Phase 3 | 本番（10%） | エラー率 < 1% | 1日 |
| Phase 4 | 本番（100%） | 問題なし | - |

### Feature Flag（任意）

```typescript
const isEnabled = await getConfig<boolean>(
  tenantId, 
  'feature_flags', 
  '[feature_name]_enabled'
) ?? false

if (!isEnabled) {
  throw createError({ statusCode: 404 })
}
```

### 成功判定

| 指標 | 目標値 | 測定方法 |
|:-----|:-------|:---------|
| エラー率 | < 1% | ログ分析 |
| レイテンシ p95 | < 500ms | メトリクス |
| 採用率 | > 50% / 7日 | Analytics |

### ロールバック手順

1. Feature Flagを`false`に設定
2. 必要に応じてDBマイグレーションをロールバック
3. 原因調査・修正
4. 再デプロイ

---

## ⚠️ Risks & Edge Cases

### リスク

| リスク | 影響度 | 発生確率 | 対策 |
|:-------|:------:|:--------:|:-----|
| [リスク1] | 高 | 低 | [対策] |
| [リスク2] | 中 | 中 | [対策] |

### エッジケース

| ケース | 期待動作 |
|:-------|:---------|
| 同時更新 | 後勝ち / 楽観的ロック |
| 大量データ | ページネーション必須 |
| タイムアウト | リトライ（最大3回、指数バックオフ） |
| データ不整合 | トランザクションでロールバック |

### 禁止事項

- ❌ `tenantId`なしのクエリ実行
- ❌ ハードコードされた設定値の使用
- ❌ 環境分岐による実装の変更
- ❌ `any`型の使用

---

# E. 進捗管理

---

## 📊 実装状況

> ⚠️ **未調査**: 実装状況は未調査です。実装作業開始時に調査します。

### 実装完了の定義

| 状態 | 条件 |
|:-----|:-----|
| ✅ 完了（100%） | 全Phaseが完了し、SSOT準拠確認済み |
| 🟢 部分実装（1-99%） | 一部のPhaseが完了 |
| ❌ 未実装（0%） | 未着手 |
| ❓ 未調査 | 実装状況未調査 |

### hotel-saas 実装状況

| バージョン | 状態 | 完了率 | 最終確認 | 備考 |
|:-----------|:----:|:------:|:---------|:-----|
| v1.0.0 | ❓ | 未調査 | - | 実装作業開始時に調査 |

### hotel-common 実装状況

| バージョン | 状態 | 完了率 | 最終確認 | 備考 |
|:-----------|:----:|:------:|:---------|:-----|
| v1.0.0 | ❓ | 未調査 | - | 実装作業開始時に調査 |

**実装状況最終更新**: YYYY-MM-DD

---

## ✅ 実装チェックリスト

### Phase 0: 準備

- [ ] 関連SSOT確認（SSOT_MARKETING_INTEGRATION.md等）
- [ ] 依存基盤の実装確認（`tenant_settings`テーブル等）
- [ ] 既存実装調査
- [ ] 本番同等性チェック（ハードコード検出）

### Phase 1: データベース

- [ ] Prismaスキーマ作成
- [ ] マイグレーション実行（`npx prisma migrate dev`）
- [ ] シードデータ作成（必要な場合）
- [ ] テーブル確認

### Phase 2: API（hotel-common）

- [ ] ルーター作成（`src/routes/admin/[resource].routes.ts`）
- [ ] サービス作成（`src/services/[resource].service.ts`）
- [ ] バリデーション実装
- [ ] エラーハンドリング
- [ ] ルーター登録（`src/server/index.ts`）
- [ ] 単体テスト

### Phase 3: プロキシ（hotel-saas）

- [ ] ディレクトリ作成（`server/api/v1/admin/[resource]/`）
- [ ] プロキシAPI実装
- [ ] 動作確認（curl / Postman）

### Phase 4: フロントエンド

- [ ] ページ作成（`pages/admin/[feature]/`）
- [ ] Composable作成（`composables/use[Feature].ts`）
- [ ] バリデーション実装
- [ ] UI/UXテスト
- [ ] Analytics発火確認

### Phase 5: 品質保証

- [ ] Config設定投入（`tenant_settings`）
- [ ] Tracking発火確認（イベントログ）
- [ ] 統合テスト
- [ ] SSOT準拠確認
- [ ] ReadLints実行・エラー修正

### Phase 6: リリース

- [ ] 開発環境デプロイ
- [ ] ステージング確認
- [ ] 本番リリース
- [ ] 成功判定確認
- [ ] 実装状況を「✅ 完了」に更新

---

## 📝 更新履歴

| バージョン | 日付 | 変更内容 | 担当 |
|:-----------|:-----|:---------|:-----|
| 1.0.0 | YYYY-MM-DD | 初版作成 | [担当] |

---

**最終更新**: YYYY-MM-DD  
**作成者**: [担当者]  
**レビュー**: 未実施 / 完了

---

# 📚 Appendix

## A. SSOTに準拠しないと発生する問題

### 🔴 問題1: テナント間データ漏洩

**症状**: 他テナントのデータが表示される

**原因**:
```typescript
// ❌ tenantId なしのクエリ
const data = await prisma.table.findMany()
```

**対応策**:
```typescript
// ✅ tenantId 必須
const data = await prisma.table.findMany({
  where: { tenantId }
})
```

### 🔴 問題2: 本番環境で設定変更不可

**症状**: 設定変更のためにコード修正が必要

**原因**:
```typescript
// ❌ ハードコード
const timeout = 60
```

**対応策**:
```typescript
// ✅ Config First
const timeout = await getConfig<number>(tenantId, 'feature', 'timeout') ?? 60
```

## B. 検証方法

```bash
# ビルド確認
cd /Users/kaneko/hotel-common-rebuild && npm run build
cd /Users/kaneko/hotel-saas-rebuild && npm run build

# API動作確認（管理画面）
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-admin.sh

# Redis確認
redis-cli ping

# セッション確認
redis-cli KEYS "hotel:session:*"
```

## C. 参考資料

- [SSOT作成ルール](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md)
- [本番同等ルール](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_PRODUCTION_PARITY_RULES.md)
- [Marketing Integration](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_MARKETING_INTEGRATION.md)
