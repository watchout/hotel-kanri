# 📊 SSOT: システムログ管理（テナント管理者向け）

**Doc-ID**: SSOT-ADMIN-SYSTEM-LOGS-001  
**バージョン**: 1.1.0  
**作成日**: 2025年10月7日  
**ステータス**: 🔴 承認済み（最高権威）  
**所有者**: Iza（統合管理者）

**関連SSOT**:
- [SSOT_SAAS_SUPER_ADMIN.md](./SSOT_SAAS_SUPER_ADMIN.md) - スーパーアドミン機能（システムログ・サーバーログ管理）
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - スタッフログイン認証
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_PRODUCTION_PARITY_RULES.md](../00_foundation/SSOT_PRODUCTION_PARITY_RULES.md) - 本番同等ルール

---

## 📋 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2025-10-7 | 初版作成 | Iza |
| 1.1.0 | 2025-10-7 | 高度な機能を追加：①異常検知アラート機能（6パターン定義・通知方法・閾値設定・API仕様・DB設計）、②ログ保持期間の自動削除機能（S3アーカイブ・削除履歴記録・バッチ処理実装）、③ログ検索の高度化（Elasticsearch全文検索・複雑な条件検索・保存済み検索条件） | Iza |

---

## 🎯 目的とスコープ

### 目的

**テナント管理者が自社テナント内のシステムログを閲覧・検索・分析できる機能を提供する。**

### スコープ

#### 対象範囲 ✅

- **テナント内の操作ログ閲覧**（audit_logs）
- **認証ログ閲覧**（auth_logs）
- **AI操作ログ閲覧**（ai_operation_logs）
- **システム間連携ログ閲覧**（integration_logs）
- **ログ検索・フィルタリング機能**
- **ログエクスポート機能**（CSV/JSON）
- **ログ統計・ダッシュボード**
- **異常検知アラート表示**

#### 対象外 ❌

- **スーパーアドミン専用ログ**（super_admin_audit_logs） → `SSOT_SAAS_SUPER_ADMIN.md`
- **システムログ・サーバーログ**（system_logs, server_logs） → `SSOT_SAAS_SUPER_ADMIN.md`
- **ログの削除・改ざん**（監査証跡保護のため禁止）
- **他テナントのログ閲覧**（マルチテナント分離）

---

## ⚠️ 必須要件（CRITICAL）

### 1. テナント分離の徹底

**全てのログ閲覧はテナントIDでフィルタリング必須。**

#### 正しい実装
```typescript
// ✅ 正しい
const logs = await prisma.auditLogs.findMany({
  where: {
    tenantId: session.tenantId // 必須
  }
});
```

#### 禁止事項
```typescript
// ❌ 絶対禁止
const logs = await prisma.auditLogs.findMany(); // テナントIDフィルタなし
```

---

### 2. 読み取り専用

**ログの削除・改ざんは絶対禁止。**

#### 禁止事項
```typescript
// ❌ 絶対禁止
await prisma.auditLogs.delete({ where: { id } });
await prisma.auditLogs.update({ where: { id }, data: { ... } });
```

---

### 3. 機密情報のマスキング

**パスワード、トークン、クレジットカード番号等は表示しない。**

#### 正しい実装
```typescript
// ✅ 正しい
const sanitizedLog = {
  ...log,
  oldValues: maskSensitiveData(log.oldValues),
  newValues: maskSensitiveData(log.newValues)
};
```

---

## ❌ SSOTに準拠しないと発生する問題

### 1. テナント分離違反
**問題**: 他テナントのログが閲覧可能になる  
**影響**: 重大なセキュリティ侵害、個人情報漏洩  
**対策**: 全クエリに`tenantId`フィルタ必須

### 2. ログ改ざん
**問題**: ログの削除・変更が可能になる  
**影響**: 監査証跡の信頼性喪失、コンプライアンス違反  
**対策**: 読み取り専用APIのみ提供

### 3. 機密情報漏洩
**問題**: パスワード等がログに表示される  
**影響**: セキュリティ侵害、不正アクセスのリスク  
**対策**: 機密情報の自動マスキング

---

## 🗄️ データベース設計

### 既存テーブル（hotel-commonで管理）

#### `audit_logs`（操作ログ）

**Prismaスキーマ**:
```prisma
model AuditLog {
  id                String    @id @default(uuid())
  tenantId          String    @map("tenant_id")
  tableName         String    @map("table_name")
  operation         String    // 'INSERT' | 'UPDATE' | 'DELETE'
  recordId          String?   @map("record_id")
  userId            String?   @map("user_id")
  oldValues         Json?     @map("old_values")
  newValues         Json?     @map("new_values")
  changedFields     Json?     @map("changed_fields")
  // 拡張カラム
  operationCategory String?   @map("operation_category")  // 'menu' | 'order' | 'staff' | 'system'
  riskLevel         String?   @map("risk_level") @default("LOW")  // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  businessContext   Json?     @map("business_context")
  sessionId         String?   @map("session_id")
  approvalRequired  Boolean?  @map("approval_required") @default(false)
  approvedBy        String?   @map("approved_by")
  reason            String?
  ipAddress         String?   @map("ip_address")
  userAgent         String?   @map("user_agent")
  requestId         String?   @map("request_id")
  createdAt         DateTime  @default(now()) @map("created_at")

  tenant     Tenant  @relation(fields: [tenantId], references: [id])
  user       Staff?  @relation(fields: [userId], references: [id])
  approver   Staff?  @relation("AuditLogApprover", fields: [approvedBy], references: [id])

  @@index([tenantId, createdAt])
  @@index([tenantId, operationCategory, createdAt])
  @@index([tenantId, riskLevel, createdAt])
  @@index([tenantId, userId, createdAt])
  @@map("audit_logs")
}
```

**重要フィールド**:
- `operationCategory`: 操作カテゴリ（menu/order/staff/system）
- `riskLevel`: リスクレベル（LOW/MEDIUM/HIGH/CRITICAL）
- `businessContext`: 業務コンテキスト（JSON）
- `reason`: 操作理由（高リスク操作時は必須）

---

#### `auth_logs`（認証ログ）

**Prismaスキーマ**:
```prisma
model AuthLog {
  id            String    @id @default(uuid())
  tenantId      String    @map("tenant_id")
  userId        String?   @map("user_id")
  action        String    // 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'TOKEN_REFRESH'
  ipAddress     String?   @map("ip_address")
  userAgent     String?   @map("user_agent")
  sessionId     String?   @map("session_id")
  success       Boolean
  failureReason String?   @map("failure_reason")
  deviceInfo    Json?     @map("device_info")
  locationInfo  Json?     @map("location_info")
  createdAt     DateTime  @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   Staff? @relation(fields: [userId], references: [id])

  @@index([tenantId, createdAt])
  @@index([tenantId, userId, createdAt])
  @@index([tenantId, action, createdAt])
  @@index([tenantId, success, createdAt])
  @@map("auth_logs")
}
```

**重要フィールド**:
- `action`: 認証アクション（LOGIN_SUCCESS/LOGIN_FAILED/LOGOUT）
- `success`: 成功/失敗フラグ
- `failureReason`: 失敗理由（失敗時のみ）
- `deviceInfo`: デバイス情報（ブラウザ、OS等）

---

#### `ai_operation_logs`（AI操作ログ）

**Prismaスキーマ**:
```prisma
model AiOperationLog {
  id                String    @id @default(uuid())
  tenantId          String    @map("tenant_id")
  userId            String?   @map("user_id")
  operationType     String    @map("operation_type")  // 'CHAT' | 'IMAGE_GENERATION' | 'TRANSLATION'
  model             String    // 'gpt-4' | 'gpt-3.5-turbo' | 'dall-e-3'
  inputTokens       Int       @map("input_tokens")
  outputTokens      Int       @map("output_tokens")
  totalCost         Float     @map("total_cost")
  responseTime      Int       @map("response_time")  // ミリ秒
  status            String    // 'SUCCESS' | 'FAILED' | 'TIMEOUT'
  errorMessage      String?   @map("error_message")
  metadata          Json?     // リクエスト・レスポンスの要約
  createdAt         DateTime  @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   Staff? @relation(fields: [userId], references: [id])

  @@index([tenantId, createdAt])
  @@index([tenantId, operationType, createdAt])
  @@index([tenantId, status, createdAt])
  @@map("ai_operation_logs")
}
```

**重要フィールド**:
- `operationType`: AI操作タイプ（CHAT/IMAGE_GENERATION/TRANSLATION）
- `inputTokens/outputTokens`: トークン使用量
- `totalCost`: コスト（USD）
- `responseTime`: レスポンス時間（ミリ秒）

---

#### `integration_logs`（システム間連携ログ）

**Prismaスキーマ**:
```prisma
model IntegrationLog {
  id                String    @id @default(uuid())
  tenantId          String    @map("tenant_id")
  sourceSystem      String    @map("source_system")  // 'hotel-saas' | 'hotel-pms' | 'hotel-member' | 'hotel-common'
  targetSystem      String    @map("target_system")
  operation         String    // 'ROOM_STATUS_SYNC' | 'ORDER_NOTIFY' | 'USER_SYNC'
  endpoint          String?
  requestMethod     String?   @map("request_method")  // 'GET' | 'POST' | 'PUT' | 'DELETE'
  requestData       Json?     @map("request_data")
  responseData      Json?     @map("response_data")
  status            String    // 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'RETRY'
  responseCode      Int?      @map("response_code")
  responseTime      Int?      @map("response_time")  // ミリ秒
  retryCount        Int       @default(0) @map("retry_count")
  errorMessage      String?   @map("error_message")
  correlationId     String?   @map("correlation_id")
  createdAt         DateTime  @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, createdAt])
  @@index([tenantId, sourceSystem, targetSystem, createdAt])
  @@index([tenantId, operation, createdAt])
  @@index([tenantId, status, createdAt])
  @@map("integration_logs")
}
```

**重要フィールド**:
- `sourceSystem/targetSystem`: 送信元・送信先システム
- `operation`: 連携操作（ROOM_STATUS_SYNC/ORDER_NOTIFY等）
- `status`: ステータス（SUCCESS/FAILED/TIMEOUT/RETRY）
- `retryCount`: リトライ回数

---

## 🔧 API仕様

### 認証要件

**全てのAPIは認証必須**:
- ✅ Session認証（Redis + HttpOnly Cookie）
- ✅ `tenantId`の自動取得（セッションから）
- ✅ 管理者権限チェック

---

### 1. 操作ログ取得API

#### GET /api/v1/admin/logs/audit

**リクエスト**:
```
GET /api/v1/admin/logs/audit?category=menu&riskLevel=HIGH&userId=xxx&startDate=2025-10-01&endDate=2025-10-07&page=1&limit=50
```

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `category` | string | ❌ | 操作カテゴリ（menu/order/staff/system） |
| `riskLevel` | string | ❌ | リスクレベル（LOW/MEDIUM/HIGH/CRITICAL） |
| `userId` | string | ❌ | ユーザーID |
| `tableName` | string | ❌ | テーブル名 |
| `operation` | string | ❌ | 操作タイプ（INSERT/UPDATE/DELETE） |
| `startDate` | string | ❌ | 開始日（ISO 8601） |
| `endDate` | string | ❌ | 終了日（ISO 8601） |
| `page` | number | ❌ | ページ番号（デフォルト: 1） |
| `limit` | number | ❌ | 1ページあたりの件数（デフォルト: 50、最大: 1000） |

**レスポンス**:
```typescript
{
  success: true,
  data: {
    logs: Array<{
      id: string,
      tableName: string,
      operation: string,
      recordId: string | null,
      userId: string | null,
      user: {
        email: string,
        role: string
      } | null,
      oldValues: object | null,
      newValues: object | null,
      changedFields: string[] | null,
      operationCategory: string | null,
      riskLevel: string,
      businessContext: object | null,
      reason: string | null,
      ipAddress: string | null,
      userAgent: string | null,
      createdAt: string
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

---

### 2. 認証ログ取得API

#### GET /api/v1/admin/logs/auth

**リクエスト**:
```
GET /api/v1/admin/logs/auth?action=LOGIN_FAILED&userId=xxx&startDate=2025-10-01&endDate=2025-10-07&page=1&limit=50
```

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `action` | string | ❌ | 認証アクション（LOGIN_SUCCESS/LOGIN_FAILED/LOGOUT） |
| `userId` | string | ❌ | ユーザーID |
| `success` | boolean | ❌ | 成功/失敗フラグ |
| `ipAddress` | string | ❌ | IPアドレス |
| `startDate` | string | ❌ | 開始日（ISO 8601） |
| `endDate` | string | ❌ | 終了日（ISO 8601） |
| `page` | number | ❌ | ページ番号（デフォルト: 1） |
| `limit` | number | ❌ | 1ページあたりの件数（デフォルト: 50、最大: 1000） |

**レスポンス**:
```typescript
{
  success: true,
  data: {
    logs: Array<{
      id: string,
      userId: string | null,
      user: {
        email: string,
        role: string
      } | null,
      action: string,
      ipAddress: string | null,
      userAgent: string | null,
      sessionId: string | null,
      success: boolean,
      failureReason: string | null,
      deviceInfo: object | null,
      locationInfo: object | null,
      createdAt: string
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

---

### 3. AI操作ログ取得API

#### GET /api/v1/admin/logs/ai

**リクエスト**:
```
GET /api/v1/admin/logs/ai?operationType=CHAT&status=SUCCESS&startDate=2025-10-01&endDate=2025-10-07&page=1&limit=50
```

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `operationType` | string | ❌ | AI操作タイプ（CHAT/IMAGE_GENERATION/TRANSLATION） |
| `model` | string | ❌ | AIモデル（gpt-4/gpt-3.5-turbo/dall-e-3） |
| `status` | string | ❌ | ステータス（SUCCESS/FAILED/TIMEOUT） |
| `userId` | string | ❌ | ユーザーID |
| `startDate` | string | ❌ | 開始日（ISO 8601） |
| `endDate` | string | ❌ | 終了日（ISO 8601） |
| `page` | number | ❌ | ページ番号（デフォルト: 1） |
| `limit` | number | ❌ | 1ページあたりの件数（デフォルト: 50、最大: 1000） |

**レスポンス**:
```typescript
{
  success: true,
  data: {
    logs: Array<{
      id: string,
      userId: string | null,
      user: {
        email: string,
        role: string
      } | null,
      operationType: string,
      model: string,
      inputTokens: number,
      outputTokens: number,
      totalCost: number,
      responseTime: number,
      status: string,
      errorMessage: string | null,
      metadata: object | null,
      createdAt: string
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    },
    summary: {
      totalCost: number,
      totalTokens: number,
      averageResponseTime: number
    }
  }
}
```

---

### 4. システム間連携ログ取得API

#### GET /api/v1/admin/logs/integration

**リクエスト**:
```
GET /api/v1/admin/logs/integration?sourceSystem=hotel-saas&targetSystem=hotel-common&status=FAILED&startDate=2025-10-01&endDate=2025-10-07&page=1&limit=50
```

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `sourceSystem` | string | ❌ | 送信元システム（hotel-saas/hotel-pms/hotel-member/hotel-common） |
| `targetSystem` | string | ❌ | 送信先システム |
| `operation` | string | ❌ | 連携操作（ROOM_STATUS_SYNC/ORDER_NOTIFY/USER_SYNC） |
| `status` | string | ❌ | ステータス（SUCCESS/FAILED/TIMEOUT/RETRY） |
| `startDate` | string | ❌ | 開始日（ISO 8601） |
| `endDate` | string | ❌ | 終了日（ISO 8601） |
| `page` | number | ❌ | ページ番号（デフォルト: 1） |
| `limit` | number | ❌ | 1ページあたりの件数（デフォルト: 50、最大: 1000） |

**レスポンス**:
```typescript
{
  success: true,
  data: {
    logs: Array<{
      id: string,
      sourceSystem: string,
      targetSystem: string,
      operation: string,
      endpoint: string | null,
      requestMethod: string | null,
      requestData: object | null,
      responseData: object | null,
      status: string,
      responseCode: number | null,
      responseTime: number | null,
      retryCount: number,
      errorMessage: string | null,
      correlationId: string | null,
      createdAt: string
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

---

### 5. ログ統計API

#### GET /api/v1/admin/logs/stats

**リクエスト**:
```
GET /api/v1/admin/logs/stats?period=7d&groupBy=day
```

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `period` | string | ❌ | 期間（1d/7d/30d、デフォルト: 7d） |
| `groupBy` | string | ❌ | グループ化（hour/day/week、デフォルト: day） |

**レスポンス**:
```typescript
{
  success: true,
  data: {
    auditLogs: {
      total: number,
      byCategory: {
        menu: number,
        order: number,
        staff: number,
        system: number
      },
      byRiskLevel: {
        LOW: number,
        MEDIUM: number,
        HIGH: number,
        CRITICAL: number
      }
    },
    authLogs: {
      total: number,
      successCount: number,
      failureCount: number,
      byAction: {
        LOGIN_SUCCESS: number,
        LOGIN_FAILED: number,
        LOGOUT: number
      }
    },
    aiLogs: {
      total: number,
      totalCost: number,
      totalTokens: number,
      averageResponseTime: number,
      byOperationType: {
        CHAT: number,
        IMAGE_GENERATION: number,
        TRANSLATION: number
      }
    },
    integrationLogs: {
      total: number,
      successCount: number,
      failureCount: number,
      averageResponseTime: number
    },
    timeline: Array<{
      timestamp: string,
      auditCount: number,
      authCount: number,
      aiCount: number,
      integrationCount: number
    }>
  }
}
```

---

### 6. ログエクスポートAPI

#### GET /api/v1/admin/logs/export

**リクエスト**:
```
GET /api/v1/admin/logs/export?logType=audit&category=menu&startDate=2025-10-01&endDate=2025-10-07&format=csv
```

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `logType` | string | ✅ | ログタイプ（audit/auth/ai/integration） |
| `format` | string | ✅ | エクスポート形式（csv/json） |
| その他 | - | ❌ | 各ログタイプのフィルタパラメータ |

**レスポンス**:
- Content-Type: `text/csv` または `application/json`
- ファイルダウンロード

---

## 🎨 フロントエンド実装

### レイアウト

**ファイル**: `/Users/kaneko/hotel-saas/layouts/admin.vue`

```vue
<template>
  <div class="admin-layout">
    <AdminSidebar />
    <div class="main-content">
      <AdminHeader />
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>
```

---

### 画面一覧

#### 1. ログダッシュボード

- **パス**: `/admin/logs/dashboard`
- **ファイル**: `/pages/admin/logs/dashboard/index.vue`
- **内容**: ログ統計サマリー、リアルタイムアラート、異常検知

**主要コンポーネント**:
- ログ統計カード（操作ログ、認証ログ、AIログ、連携ログ）
- タイムラインチャート（時系列ログ推移）
- 高リスク操作一覧
- 認証失敗アラート
- AI使用量・コストサマリー
- システム間連携エラー一覧

---

#### 2. 操作ログ閲覧

- **パス**: `/admin/logs/audit`
- **ファイル**: `/pages/admin/logs/audit/index.vue`
- **内容**: 操作ログ一覧、詳細表示、検索・フィルタリング

**主要機能**:
- ログ一覧表示（テーブル形式）
- フィルター（カテゴリ、リスクレベル、ユーザー、日付範囲）
- 検索（テーブル名、操作タイプ）
- ソート（日時、リスクレベル）
- 詳細表示モーダル（変更前後の値、変更フィールド）
- CSVエクスポート

**UI構成**:
```vue
<template>
  <div class="p-6">
    <!-- ヘッダー -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">操作ログ</h1>
      <p class="text-gray-600">全ての操作履歴を確認できます</p>
    </div>

    <!-- フィルター・検索エリア -->
    <LogFilterPanel 
      v-model:category="filters.category"
      v-model:riskLevel="filters.riskLevel"
      v-model:userId="filters.userId"
      v-model:startDate="filters.startDate"
      v-model:endDate="filters.endDate"
      @apply="applyFilters"
      @reset="resetFilters"
    />

    <!-- エクスポートボタン -->
    <div class="mb-4 flex justify-end">
      <button @click="exportLogs" class="btn-primary">
        <DownloadIcon class="w-5 h-5 mr-2" />
        CSVエクスポート
      </button>
    </div>

    <!-- ログ一覧表示 -->
    <AuditLogTable
      :logs="logs"
      :loading="loading"
      @show-details="showLogDetails"
    />

    <!-- ページネーション -->
    <Pagination
      v-if="!loading && logs.length > 0"
      :current-page="currentPage"
      :total-pages="totalPages"
      :total-count="totalCount"
      @change-page="changePage"
    />

    <!-- 詳細表示モーダル -->
    <AuditLogDetailsModal
      v-if="selectedLog"
      :log="selectedLog"
      @close="selectedLog = null"
    />
  </div>
</template>
```

---

#### 3. 認証ログ閲覧

- **パス**: `/admin/logs/auth`
- **ファイル**: `/pages/admin/logs/auth/index.vue`
- **内容**: 認証ログ一覧、ログイン失敗アラート

**主要機能**:
- ログ一覧表示（テーブル形式）
- フィルター（アクション、ユーザー、成功/失敗、日付範囲）
- ログイン失敗の強調表示
- IPアドレス・デバイス情報表示
- CSVエクスポート

---

#### 4. AI操作ログ閲覧

- **パス**: `/admin/logs/ai`
- **ファイル**: `/pages/admin/logs/ai/index.vue`
- **内容**: AI操作ログ一覧、コスト・使用量サマリー

**主要機能**:
- ログ一覧表示（テーブル形式）
- フィルター（操作タイプ、モデル、ステータス、日付範囲）
- コスト・トークン使用量の集計表示
- レスポンス時間の統計
- CSVエクスポート

**UI構成**:
```vue
<template>
  <div class="p-6">
    <!-- ヘッダー -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">AI操作ログ</h1>
      <p class="text-gray-600">AI機能の使用履歴とコストを確認できます</p>
    </div>

    <!-- サマリーカード -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="総コスト" :value="`$${summary.totalCost.toFixed(2)}`" />
      <SummaryCard title="総トークン数" :value="summary.totalTokens.toLocaleString()" />
      <SummaryCard title="平均レスポンス時間" :value="`${summary.averageResponseTime}ms`" />
      <SummaryCard title="総リクエスト数" :value="summary.totalRequests.toLocaleString()" />
    </div>

    <!-- フィルター・検索エリア -->
    <LogFilterPanel 
      v-model:operationType="filters.operationType"
      v-model:model="filters.model"
      v-model:status="filters.status"
      v-model:startDate="filters.startDate"
      v-model:endDate="filters.endDate"
      @apply="applyFilters"
      @reset="resetFilters"
    />

    <!-- ログ一覧表示 -->
    <AiLogTable
      :logs="logs"
      :loading="loading"
      @show-details="showLogDetails"
    />

    <!-- ページネーション -->
    <Pagination
      v-if="!loading && logs.length > 0"
      :current-page="currentPage"
      :total-pages="totalPages"
      :total-count="totalCount"
      @change-page="changePage"
    />
  </div>
</template>
```

---

#### 5. システム間連携ログ閲覧

- **パス**: `/admin/logs/integration`
- **ファイル**: `/pages/admin/logs/integration/index.vue`
- **内容**: システム間連携ログ一覧、エラー詳細

**主要機能**:
- ログ一覧表示（テーブル形式）
- フィルター（送信元/送信先システム、操作、ステータス、日付範囲）
- エラーの強調表示
- リクエスト・レスポンスデータの表示
- CSVエクスポート

---

### Composables

#### `/composables/useLogs.ts`

```typescript
export const useLogs = () => {
  const config = useRuntimeConfig();
  const { $fetch } = useNuxtApp();

  /**
   * 操作ログ取得
   */
  const fetchAuditLogs = async (filters: AuditLogFilters) => {
    return await $fetch('/api/v1/admin/logs/audit', {
      method: 'GET',
      params: filters
    });
  };

  /**
   * 認証ログ取得
   */
  const fetchAuthLogs = async (filters: AuthLogFilters) => {
    return await $fetch('/api/v1/admin/logs/auth', {
      method: 'GET',
      params: filters
    });
  };

  /**
   * AI操作ログ取得
   */
  const fetchAiLogs = async (filters: AiLogFilters) => {
    return await $fetch('/api/v1/admin/logs/ai', {
      method: 'GET',
      params: filters
    });
  };

  /**
   * システム間連携ログ取得
   */
  const fetchIntegrationLogs = async (filters: IntegrationLogFilters) => {
    return await $fetch('/api/v1/admin/logs/integration', {
      method: 'GET',
      params: filters
    });
  };

  /**
   * ログ統計取得
   */
  const fetchLogStats = async (period: string, groupBy: string) => {
    return await $fetch('/api/v1/admin/logs/stats', {
      method: 'GET',
      params: { period, groupBy }
    });
  };

  /**
   * ログエクスポート
   */
  const exportLogs = async (logType: string, format: string, filters: any) => {
    const params = new URLSearchParams({
      logType,
      format,
      ...filters
    });
    window.open(`/api/v1/admin/logs/export?${params.toString()}`, '_blank');
  };

  return {
    fetchAuditLogs,
    fetchAuthLogs,
    fetchAiLogs,
    fetchIntegrationLogs,
    fetchLogStats,
    exportLogs
  };
};
```

---

## 🔒 セキュリティ要件

### 1. アクセス制御

**管理者権限必須**:
- ✅ 全てのログ閲覧APIは管理者権限必須
- ✅ セッション認証必須
- ✅ テナントIDの自動取得・検証

**権限チェック例**:
```typescript
// server/api/v1/admin/logs/audit.get.ts
export default defineEventHandler(async (event) => {
  const session = await getSession(event);
  
  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      message: '認証が必要です'
    });
  }
  
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    throw createError({
      statusCode: 403,
      message: '管理者権限が必要です'
    });
  }
  
  const tenantId = session.tenantId;
  // ... ログ取得処理
});
```

---

### 2. データマスキング

**機密情報の自動マスキング**:
```typescript
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'creditCardNumber',
  'cvv',
  'ssn'
];

function maskSensitiveData(data: any): any {
  if (!data) return data;
  
  const masked = { ...data };
  
  for (const field of SENSITIVE_FIELDS) {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  }
  
  return masked;
}
```

---

### 3. レート制限

**API呼び出し制限**:
- ✅ 1分あたり60リクエスト
- ✅ エクスポートは1分あたり5リクエスト
- ✅ 超過時は429エラー

---

## 📊 パフォーマンス要件

### 1. レスポンス時間

- ✅ ログ一覧取得: 300ms以内
- ✅ ログ統計取得: 500ms以内
- ✅ ログエクスポート: 5秒以内（1万件まで）

---

### 2. インデックス戦略

**必須インデックス**:
```sql
-- audit_logs
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_logs_tenant_category_created ON audit_logs(tenant_id, operation_category, created_at);
CREATE INDEX idx_audit_logs_tenant_risk_created ON audit_logs(tenant_id, risk_level, created_at);

-- auth_logs
CREATE INDEX idx_auth_logs_tenant_created ON auth_logs(tenant_id, created_at);
CREATE INDEX idx_auth_logs_tenant_action_created ON auth_logs(tenant_id, action, created_at);

-- ai_operation_logs
CREATE INDEX idx_ai_logs_tenant_created ON ai_operation_logs(tenant_id, created_at);
CREATE INDEX idx_ai_logs_tenant_type_created ON ai_operation_logs(tenant_id, operation_type, created_at);

-- integration_logs
CREATE INDEX idx_integration_logs_tenant_created ON integration_logs(tenant_id, created_at);
CREATE INDEX idx_integration_logs_tenant_systems_created ON integration_logs(tenant_id, source_system, target_system, created_at);
```

---

### 3. データ保持期間

| ログタイプ | 保持期間 | 理由 |
|----------|---------|------|
| 操作ログ（高リスク） | 7年 | コンプライアンス要件 |
| 操作ログ（一般） | 3年 | 監査要件 |
| 認証ログ | 2年 | セキュリティ要件 |
| AI操作ログ | 1年 | コスト分析 |
| システム間連携ログ | 6ヶ月 | トラブルシューティング |

---

## 🔍 高度な機能

### 1. 異常検知アラート機能

**目的**: 不正な操作や異常なアクセスパターンを自動検知し、管理者に通知する。

#### 異常パターン定義

**営業時間外の操作**:
- 対象時間: 22:00-06:00
- 対象操作: 高リスク操作（CRITICAL/HIGH）
- アラートレベル: MEDIUM

**短時間での大量操作**:
- 閾値: 5分間に100件以上の操作
- 対象: 全ての操作ログ
- アラートレベル: HIGH

**権限外操作の試行**:
- 閾値: 連続3回以上の失敗
- 対象: 認証ログ、操作ログ
- アラートレベル: HIGH

**異常な金額変更**:
- 閾値: 1回で10万円以上の価格変更
- 対象: メニュー価格変更、請求金額変更
- アラートレベル: CRITICAL

**複数システムでの同時操作**:
- パターン: 同一ユーザーが5秒以内に異なるシステムで操作
- 対象: システム間連携ログ
- アラートレベル: MEDIUM

**通常と異なるアクセス元**:
- パターン: 過去30日間未使用のIPアドレスからのアクセス
- 対象: 認証ログ
- アラートレベル: MEDIUM

---

#### アラート通知方法

**メール通知**:
- 送信先: テナント管理者全員
- 件名: `[アラート] 異常なログパターンを検知しました`
- 内容: アラート詳細、対象ログへのリンク
- 送信タイミング: リアルタイム（HIGH/CRITICAL）、1時間ごとのサマリー（MEDIUM）

**Slack通知**:
- チャンネル: `#security-alerts`
- メンション: @channel（CRITICAL）、@here（HIGH）
- フォーマット: リッチテキスト（色分け、リンク付き）
- 送信タイミング: リアルタイム

**管理画面内通知**:
- 表示場所: ヘッダーのベルアイコン
- バッジ表示: 未読アラート数
- 通知一覧: `/admin/logs/alerts`
- 保持期間: 30日間

---

#### アラート閾値設定

**設定画面**: `/admin/logs/alert-settings`

**設定項目**:
```typescript
interface AlertSettings {
  // 営業時間外アラート
  afterHoursAlert: {
    enabled: boolean;
    startTime: string;  // '22:00'
    endTime: string;    // '06:00'
    targetRiskLevels: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  };
  
  // 大量操作アラート
  bulkOperationAlert: {
    enabled: boolean;
    threshold: number;  // 件数
    timeWindow: number; // 分
  };
  
  // 権限外操作アラート
  unauthorizedAccessAlert: {
    enabled: boolean;
    threshold: number;  // 連続失敗回数
  };
  
  // 金額変更アラート
  priceChangeAlert: {
    enabled: boolean;
    threshold: number;  // 金額（円）
  };
  
  // 異常なアクセス元アラート
  unusualLocationAlert: {
    enabled: boolean;
    lookbackDays: number;  // 過去何日間のデータと比較するか
  };
  
  // 通知設定
  notifications: {
    email: {
      enabled: boolean;
      recipients: string[];  // メールアドレスのリスト
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
  };
}
```

**デフォルト設定**:
- 全てのアラート: 有効
- 営業時間外: 22:00-06:00
- 大量操作: 5分間に100件
- 権限外操作: 連続3回
- 金額変更: 10万円
- 異常なアクセス元: 過去30日間

---

#### データベース設計（アラート用）

**Prismaスキーマ**:
```prisma
model LogAlert {
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")
  alertType       String    @map("alert_type")  // 'AFTER_HOURS' | 'BULK_OPERATION' | 'UNAUTHORIZED_ACCESS' | 'PRICE_CHANGE' | 'UNUSUAL_LOCATION'
  severity        String    // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title           String
  description     String    @db.Text
  logIds          Json      @map("log_ids")  // 関連ログのIDリスト
  metadata        Json?     // 追加情報
  status          String    @default("UNREAD")  // 'UNREAD' | 'READ' | 'RESOLVED'
  resolvedBy      String?   @map("resolved_by")
  resolvedAt      DateTime? @map("resolved_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  resolver  Staff?  @relation(fields: [resolvedBy], references: [id])
  
  @@index([tenantId, status, createdAt])
  @@index([tenantId, severity, createdAt])
  @@index([tenantId, alertType, createdAt])
  @@map("log_alerts")
}

model LogAlertSettings {
  id                String    @id @default(uuid())
  tenantId          String    @unique @map("tenant_id")
  settings          Json      // AlertSettings型のJSON
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@map("log_alert_settings")
}
```

---

#### API仕様（アラート用）

**GET /api/v1/admin/logs/alerts**

アラート一覧取得

**リクエスト**:
```
GET /api/v1/admin/logs/alerts?status=UNREAD&severity=HIGH&page=1&limit=50
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    alerts: Array<{
      id: string,
      alertType: string,
      severity: string,
      title: string,
      description: string,
      logIds: string[],
      metadata: object | null,
      status: string,
      createdAt: string
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

---

**PUT /api/v1/admin/logs/alerts/[id]**

アラートステータス更新

**リクエスト**:
```typescript
{
  status: 'READ' | 'RESOLVED'
}
```

---

**GET /api/v1/admin/logs/alert-settings**

アラート設定取得

**レスポンス**:
```typescript
{
  success: true,
  data: AlertSettings
}
```

---

**PUT /api/v1/admin/logs/alert-settings**

アラート設定更新

**リクエスト**:
```typescript
{
  settings: AlertSettings
}
```

---

### 2. ログ保持期間の自動削除機能

**目的**: データベース容量を最適化し、コンプライアンス要件を満たす。

#### 自動削除バッチ処理

**実行タイミング**: 毎日午前3時（JST）

**削除対象**:

| ログタイプ | 保持期間 | 削除条件 |
|----------|---------|---------|
| 操作ログ（高リスク） | 7年 | `created_at < NOW() - INTERVAL '7 years' AND risk_level IN ('HIGH', 'CRITICAL')` |
| 操作ログ（一般） | 3年 | `created_at < NOW() - INTERVAL '3 years' AND risk_level IN ('LOW', 'MEDIUM')` |
| 認証ログ | 2年 | `created_at < NOW() - INTERVAL '2 years'` |
| AI操作ログ | 1年 | `created_at < NOW() - INTERVAL '1 year'` |
| システム間連携ログ | 6ヶ月 | `created_at < NOW() - INTERVAL '6 months'` |

---

#### 削除前のアーカイブ処理

**アーカイブ先**: AWS S3バケット（または互換ストレージ）

**バケット構造**:
```
s3://hotel-logs-archive/
  ├── {tenant_id}/
  │   ├── audit_logs/
  │   │   ├── 2024/
  │   │   │   ├── 01/
  │   │   │   │   └── audit_logs_2024-01.json.gz
  │   │   │   ├── 02/
  │   │   │   └── ...
  │   ├── auth_logs/
  │   ├── ai_operation_logs/
  │   └── integration_logs/
```

**アーカイブ形式**: JSON（gzip圧縮）

**アーカイブ保管期間**: 7年（法令遵守）

---

#### 削除ログの記録

**Prismaスキーマ**:
```prisma
model LogDeletionHistory {
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")
  logType         String    @map("log_type")  // 'audit' | 'auth' | 'ai' | 'integration'
  deletionDate    DateTime  @map("deletion_date")
  deletedCount    Int       @map("deleted_count")
  periodStart     DateTime  @map("period_start")
  periodEnd       DateTime  @map("period_end")
  archiveUrl      String?   @map("archive_url")  // S3バケットのURL
  executedBy      String    @default("SYSTEM") @map("executed_by")
  createdAt       DateTime  @default(now()) @map("created_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId, logType, deletionDate])
  @@map("log_deletion_history")
}
```

---

#### バッチ処理の実装

**ファイル**: `/Users/kaneko/hotel-common/src/batch/log-cleanup.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

const prisma = new PrismaClient();
const s3Client = new S3Client({ region: 'ap-northeast-1' });

/**
 * ログクリーンアップバッチ
 */
export async function runLogCleanup() {
  console.log('Starting log cleanup batch...');
  
  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' }
  });
  
  for (const tenant of tenants) {
    await cleanupTenantLogs(tenant.id);
  }
  
  console.log('Log cleanup batch completed.');
}

/**
 * テナントごとのログクリーンアップ
 */
async function cleanupTenantLogs(tenantId: string) {
  // 操作ログ（高リスク）: 7年
  await cleanupLogs({
    tenantId,
    logType: 'audit',
    table: 'audit_logs',
    retentionYears: 7,
    whereClause: { riskLevel: { in: ['HIGH', 'CRITICAL'] } }
  });
  
  // 操作ログ（一般）: 3年
  await cleanupLogs({
    tenantId,
    logType: 'audit',
    table: 'audit_logs',
    retentionYears: 3,
    whereClause: { riskLevel: { in: ['LOW', 'MEDIUM'] } }
  });
  
  // 認証ログ: 2年
  await cleanupLogs({
    tenantId,
    logType: 'auth',
    table: 'auth_logs',
    retentionYears: 2
  });
  
  // AI操作ログ: 1年
  await cleanupLogs({
    tenantId,
    logType: 'ai',
    table: 'ai_operation_logs',
    retentionYears: 1
  });
  
  // システム間連携ログ: 6ヶ月
  await cleanupLogs({
    tenantId,
    logType: 'integration',
    table: 'integration_logs',
    retentionMonths: 6
  });
}

/**
 * ログクリーンアップ処理
 */
async function cleanupLogs(config: {
  tenantId: string;
  logType: string;
  table: string;
  retentionYears?: number;
  retentionMonths?: number;
  whereClause?: any;
}) {
  const cutoffDate = new Date();
  
  if (config.retentionYears) {
    cutoffDate.setFullYear(cutoffDate.getFullYear() - config.retentionYears);
  } else if (config.retentionMonths) {
    cutoffDate.setMonth(cutoffDate.getMonth() - config.retentionMonths);
  }
  
  // 削除対象ログを取得
  const logsToDelete = await prisma[config.table].findMany({
    where: {
      tenantId: config.tenantId,
      createdAt: { lt: cutoffDate },
      ...config.whereClause
    }
  });
  
  if (logsToDelete.length === 0) {
    return;
  }
  
  // S3にアーカイブ
  const archiveUrl = await archiveLogsToS3({
    tenantId: config.tenantId,
    logType: config.logType,
    logs: logsToDelete
  });
  
  // ログを削除
  await prisma[config.table].deleteMany({
    where: {
      id: { in: logsToDelete.map(log => log.id) }
    }
  });
  
  // 削除履歴を記録
  await prisma.logDeletionHistory.create({
    data: {
      tenantId: config.tenantId,
      logType: config.logType,
      deletionDate: new Date(),
      deletedCount: logsToDelete.length,
      periodStart: logsToDelete[logsToDelete.length - 1].createdAt,
      periodEnd: logsToDelete[0].createdAt,
      archiveUrl
    }
  });
}

/**
 * ログをS3にアーカイブ
 */
async function archiveLogsToS3(config: {
  tenantId: string;
  logType: string;
  logs: any[];
}): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const key = `${config.tenantId}/${config.logType}/${year}/${month}/${config.logType}_${year}-${month}.json.gz`;
  
  // JSONに変換してgzip圧縮
  const jsonData = JSON.stringify(config.logs, null, 2);
  const compressed = await compressData(jsonData);
  
  // S3にアップロード
  await s3Client.send(new PutObjectCommand({
    Bucket: 'hotel-logs-archive',
    Key: key,
    Body: compressed,
    ContentType: 'application/json',
    ContentEncoding: 'gzip'
  }));
  
  return `s3://hotel-logs-archive/${key}`;
}

/**
 * データを圧縮
 */
async function compressData(data: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const gzip = createGzip();
    
    gzip.on('data', chunk => chunks.push(chunk));
    gzip.on('end', () => resolve(Buffer.concat(chunks)));
    gzip.on('error', reject);
    
    gzip.write(data);
    gzip.end();
  });
}
```

---

#### 管理画面での削除履歴確認

**パス**: `/admin/logs/deletion-history`

**表示内容**:
- 削除日
- ログタイプ
- 削除件数
- 対象期間
- アーカイブURL
- ダウンロードボタン

---

### 3. ログ検索の高度化

**目的**: 複雑な条件でのログ検索を可能にし、調査効率を向上させる。

#### 全文検索（Elasticsearch連携）

**実装方針**:
- Elasticsearchにログデータをインデックス化
- PostgreSQLとの二重書き込み（非同期）
- 全文検索はElasticsearch、詳細取得はPostgreSQL

**インデックス構造**:
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "tenant_id": { "type": "keyword" },
      "log_type": { "type": "keyword" },
      "created_at": { "type": "date" },
      "message": { 
        "type": "text",
        "analyzer": "japanese"
      },
      "user_email": { "type": "keyword" },
      "ip_address": { "type": "ip" },
      "metadata": { "type": "object" }
    }
  }
}
```

**検索API**:

**POST /api/v1/admin/logs/search**

```typescript
{
  query: string,  // 全文検索クエリ
  logTypes: string[],  // 'audit' | 'auth' | 'ai' | 'integration'
  startDate: string,
  endDate: string,
  page: number,
  limit: number
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    results: Array<{
      id: string,
      logType: string,
      message: string,
      highlight: string,  // ハイライトされた検索結果
      createdAt: string
    }>,
    pagination: { ... },
    took: number  // 検索時間（ミリ秒）
  }
}
```

---

#### 複雑な条件検索

**検索クエリビルダー**:

**UI構成**:
```vue
<template>
  <div class="search-query-builder">
    <!-- 条件グループ -->
    <div v-for="group in queryGroups" :key="group.id" class="query-group">
      <!-- AND/OR選択 -->
      <select v-model="group.operator">
        <option value="AND">AND</option>
        <option value="OR">OR</option>
      </select>
      
      <!-- 条件 -->
      <div v-for="condition in group.conditions" :key="condition.id" class="condition">
        <!-- フィールド選択 -->
        <select v-model="condition.field">
          <option value="user_id">ユーザー</option>
          <option value="operation">操作タイプ</option>
          <option value="risk_level">リスクレベル</option>
          <option value="ip_address">IPアドレス</option>
        </select>
        
        <!-- 演算子選択 -->
        <select v-model="condition.operator">
          <option value="equals">等しい</option>
          <option value="not_equals">等しくない</option>
          <option value="contains">含む</option>
          <option value="not_contains">含まない</option>
          <option value="greater_than">より大きい</option>
          <option value="less_than">より小さい</option>
          <option value="regex">正規表現</option>
        </select>
        
        <!-- 値入力 -->
        <input v-model="condition.value" type="text" />
        
        <!-- 削除ボタン -->
        <button @click="removeCondition(group.id, condition.id)">削除</button>
      </div>
      
      <!-- 条件追加ボタン -->
      <button @click="addCondition(group.id)">条件追加</button>
    </div>
    
    <!-- グループ追加ボタン -->
    <button @click="addGroup">グループ追加</button>
    
    <!-- 検索実行ボタン -->
    <button @click="executeSearch">検索</button>
  </div>
</template>
```

**検索クエリ例**:
```typescript
{
  operator: 'AND',
  groups: [
    {
      operator: 'OR',
      conditions: [
        { field: 'risk_level', operator: 'equals', value: 'HIGH' },
        { field: 'risk_level', operator: 'equals', value: 'CRITICAL' }
      ]
    },
    {
      operator: 'AND',
      conditions: [
        { field: 'created_at', operator: 'greater_than', value: '2025-10-01' },
        { field: 'ip_address', operator: 'regex', value: '^192\\.168\\.' }
      ]
    }
  ]
}
```

---

#### 保存済み検索条件

**目的**: よく使う検索条件を保存し、ワンクリックで再実行できるようにする。

**Prismaスキーマ**:
```prisma
model SavedLogSearch {
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")
  userId          String    @map("user_id")
  name            String
  description     String?
  query           Json      // 検索条件のJSON
  isShared        Boolean   @default(false) @map("is_shared")  // チーム内で共有するか
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   Staff  @relation(fields: [userId], references: [id])
  
  @@index([tenantId, userId])
  @@index([tenantId, isShared])
  @@map("saved_log_searches")
}
```

**API仕様**:

**GET /api/v1/admin/logs/saved-searches**

保存済み検索条件一覧取得

**POST /api/v1/admin/logs/saved-searches**

検索条件保存

**リクエスト**:
```typescript
{
  name: string,
  description?: string,
  query: object,
  isShared: boolean
}
```

**DELETE /api/v1/admin/logs/saved-searches/[id]**

検索条件削除

---

#### UI実装

**パス**: `/admin/logs/advanced-search`

**主要機能**:
- 複雑な条件検索ビルダー
- 保存済み検索条件の管理
- 検索結果のプレビュー
- 検索結果のエクスポート

---

## 🚀 実装ステータス

### hotel-common（API基盤）

| 項目 | ステータス | 備考 |
|-----|----------|------|
| `audit_logs`テーブル | ⏳ 部分実装 | 拡張カラム追加必要 |
| `auth_logs`テーブル | ❌ 未実装 | 新規作成必要 |
| `ai_operation_logs`テーブル | ❌ 未実装 | 新規作成必要 |
| `integration_logs`テーブル | ❌ 未実装 | 新規作成必要 |
| ログ取得API | ❌ 未実装 | 全API新規作成必要 |
| ログ統計API | ❌ 未実装 | 新規作成必要 |
| ログエクスポートAPI | ❌ 未実装 | 新規作成必要 |

---

### hotel-saas（フロントエンド）

| 項目 | ステータス | 備考 |
|-----|----------|------|
| ログダッシュボード | ❌ 未実装 | 新規作成必要 |
| 操作ログ閲覧画面 | ⏳ 部分実装 | 既存UI拡張必要 |
| 認証ログ閲覧画面 | ❌ 未実装 | 新規作成必要 |
| AI操作ログ閲覧画面 | ❌ 未実装 | 新規作成必要 |
| システム間連携ログ閲覧画面 | ❌ 未実装 | 新規作成必要 |
| Composables | ⏳ 部分実装 | 拡張必要 |

---

## ✅ 実装チェックリスト

### Phase 1: データベース（hotel-common）

- [ ] `audit_logs`テーブル拡張
  - [ ] 新規カラム追加（operation_category, risk_level等）
  - [ ] インデックス追加
  - [ ] マイグレーションスクリプト作成
- [ ] `auth_logs`テーブル作成
  - [ ] テーブル作成
  - [ ] インデックス追加
  - [ ] Prismaスキーマ更新
- [ ] `ai_operation_logs`テーブル作成
  - [ ] テーブル作成
  - [ ] インデックス追加
  - [ ] Prismaスキーマ更新
- [ ] `integration_logs`テーブル作成
  - [ ] テーブル作成
  - [ ] インデックス追加
  - [ ] Prismaスキーマ更新
- [ ] マイグレーション実行・検証

---

### Phase 2: API実装（hotel-common）

- [ ] 操作ログ取得API
  - [ ] `GET /api/v1/admin/logs/audit`
  - [ ] テナント分離の実装
  - [ ] フィルタリング機能
  - [ ] ページネーション
  - [ ] 機密情報マスキング
- [ ] 認証ログ取得API
  - [ ] `GET /api/v1/admin/logs/auth`
  - [ ] テナント分離の実装
  - [ ] フィルタリング機能
- [ ] AI操作ログ取得API
  - [ ] `GET /api/v1/admin/logs/ai`
  - [ ] テナント分離の実装
  - [ ] コスト・使用量集計
- [ ] システム間連携ログ取得API
  - [ ] `GET /api/v1/admin/logs/integration`
  - [ ] テナント分離の実装
  - [ ] フィルタリング機能
- [ ] ログ統計API
  - [ ] `GET /api/v1/admin/logs/stats`
  - [ ] 集計ロジック実装
- [ ] ログエクスポートAPI
  - [ ] `GET /api/v1/admin/logs/export`
  - [ ] CSV/JSON形式対応
  - [ ] ストリーミング処理

---

### Phase 3: フロントエンド実装（hotel-saas）

- [ ] Composables
  - [ ] `useLogs.ts`作成
  - [ ] API呼び出し関数実装
- [ ] ログダッシュボード
  - [ ] `/admin/logs/dashboard`ページ作成
  - [ ] 統計カード実装
  - [ ] タイムラインチャート実装
- [ ] 操作ログ閲覧画面
  - [ ] `/admin/logs/audit`ページ作成
  - [ ] フィルターパネル実装
  - [ ] ログ一覧テーブル実装
  - [ ] 詳細表示モーダル実装
  - [ ] CSVエクスポート機能
- [ ] 認証ログ閲覧画面
  - [ ] `/admin/logs/auth`ページ作成
  - [ ] フィルターパネル実装
  - [ ] ログ一覧テーブル実装
- [ ] AI操作ログ閲覧画面
  - [ ] `/admin/logs/ai`ページ作成
  - [ ] サマリーカード実装
  - [ ] ログ一覧テーブル実装
- [ ] システム間連携ログ閲覧画面
  - [ ] `/admin/logs/integration`ページ作成
  - [ ] フィルターパネル実装
  - [ ] ログ一覧テーブル実装

---

### Phase 4: 高度な機能実装

- [ ] 異常検知アラート機能
  - [ ] `log_alerts`テーブル作成
  - [ ] `log_alert_settings`テーブル作成
  - [ ] アラート検知バッチ処理実装
  - [ ] アラート一覧取得API（`GET /api/v1/admin/logs/alerts`）
  - [ ] アラートステータス更新API（`PUT /api/v1/admin/logs/alerts/[id]`）
  - [ ] アラート設定取得API（`GET /api/v1/admin/logs/alert-settings`）
  - [ ] アラート設定更新API（`PUT /api/v1/admin/logs/alert-settings`）
  - [ ] メール通知機能実装
  - [ ] Slack通知機能実装
  - [ ] アラート一覧画面（`/admin/logs/alerts`）
  - [ ] アラート設定画面（`/admin/logs/alert-settings`）
- [ ] ログ自動削除機能
  - [ ] `log_deletion_history`テーブル作成
  - [ ] S3連携実装
  - [ ] ログクリーンアップバッチ処理実装
  - [ ] 削除履歴閲覧画面（`/admin/logs/deletion-history`）
  - [ ] アーカイブダウンロード機能
- [ ] ログ検索高度化
  - [ ] Elasticsearch連携実装
  - [ ] 全文検索API（`POST /api/v1/admin/logs/search`）
  - [ ] `saved_log_searches`テーブル作成
  - [ ] 保存済み検索条件API実装
  - [ ] 複雑な条件検索ビルダーUI（`/admin/logs/advanced-search`）
  - [ ] 保存済み検索条件管理UI

---

### Phase 5: テスト・検証

- [ ] 単体テスト
  - [ ] API単体テスト
  - [ ] フロントエンド単体テスト
  - [ ] バッチ処理単体テスト
- [ ] 統合テスト
  - [ ] ログ記録→閲覧の統合テスト
  - [ ] フィルタリング機能テスト
  - [ ] エクスポート機能テスト
  - [ ] アラート検知→通知の統合テスト
  - [ ] ログ削除→アーカイブの統合テスト
  - [ ] 全文検索機能テスト
- [ ] パフォーマンステスト
  - [ ] 大量データでのレスポンス時間測定
  - [ ] インデックス効果検証
  - [ ] Elasticsearch検索速度測定
- [ ] セキュリティテスト
  - [ ] テナント分離の検証
  - [ ] 機密情報マスキングの検証
  - [ ] 権限チェックの検証

---

## 🔄 関連ドキュメント

### 設計書
- [UNIFIED_LOG_SYSTEM_DESIGN.md](/Users/kaneko/hotel-kanri/docs/01_systems/common/UNIFIED_LOG_SYSTEM_DESIGN.md) - 統合ログシステム設計
- [UNIFIED_LOGGING_STANDARDS.md](/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_LOGGING_STANDARDS.md) - ログレベル・粒度統一基準
- [ADMIN_CRUD_LOG_IMPLEMENTATION_GUIDE.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/ADMIN_CRUD_LOG_IMPLEMENTATION_GUIDE.md) - 管理画面CRUD操作ログ実装ガイド

### 実装ガイド
- [SAAS_LOG_IMPLEMENTATION_GUIDE.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/SAAS_LOG_IMPLEMENTATION_GUIDE.md) - hotel-saasログシステム実装ガイド
- [COMMON_LOG_IMPLEMENTATION_GUIDE.md](/Users/kaneko/hotel-kanri/docs/01_systems/common/COMMON_LOG_IMPLEMENTATION_GUIDE.md) - hotel-commonログシステム実装ガイド

### UI設計
- [LOG_UI_COMPREHENSIVE_DESIGN.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/LOG_UI_COMPREHENSIVE_DESIGN.md) - ログ確認UI包括設計書

---

**最終更新**: 2025年10月7日  
**作成者**: AI Assistant (Iza - 統合管理者)  
**承認者**: hotel-kanri統合管理

