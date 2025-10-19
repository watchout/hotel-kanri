# テナント分離完全実装計画

## 概要

hotel-saasシステムのマルチテナント機能を強化し、テナント間のデータ分離を完全に実装するための計画書です。現在の基本的なテナント分離から、より堅牢で効率的なマルチテナント環境を構築します。

## 現状分析

### 現在のテナント分離実装

現在のhotel-saasシステムでは、以下のテナント分離メカニズムを実装しています：

1. **ミドルウェアによるテナント特定**
   - `tenant-context.ts`ミドルウェアでリクエストからテナントを特定
   - ホスト名やヘッダー情報からテナントIDを抽出

2. **Prisma拡張によるテナントフィルタリング**
   - `$extend`メソッドを使用してクエリにテナントフィルターを適用
   - 自動的にテナントIDによるWHERE条件を追加

3. **JWTトークンへのテナント情報埋め込み**
   - 認証時にテナント情報をJWTトークンに埋め込み
   - リクエスト間でテナント情報を維持

### 現状の課題

1. **一貫性の不足**: 一部のAPIエンドポイントでテナント分離が不完全
2. **パフォーマンスの問題**: テナントフィルタリングの最適化が不十分
3. **テナント間データ共有**: 一部のデータを複数テナントで共有する仕組みがない
4. **テナント管理機能**: テナントのライフサイクル管理が不十分
5. **テナント固有の設定**: テナントごとの設定管理が不十分

## 強化計画

### 1. テナント分離の完全実装

#### 1.1 統一テナントコンテキストの実装

```typescript
// server/utils/tenant-context.ts
import { H3Event } from 'h3'
import { prisma } from './prisma'

export interface TenantContext {
  tenantId: string
  tenant: {
    id: string
    name: string
    domain: string
    planType: string
    status: string
    settings: Record<string, any>
  } | null
}

export async function resolveTenantContext(event: H3Event): Promise<TenantContext> {
  // ホスト名からテナントを解決
  const host = getRequestHeader(event, 'host') || ''
  const tenantByHost = await resolveTenantFromHost(host)

  // ヘッダーからテナントを解決（APIキー認証など）
  const apiKey = getRequestHeader(event, 'x-api-key')
  const tenantByApiKey = apiKey ? await resolveTenantFromApiKey(apiKey) : null

  // JWTトークンからテナントを解決
  const authHeader = getRequestHeader(event, 'authorization')
  const tenantByToken = authHeader ? await resolveTenantFromToken(authHeader) : null

  // テナント情報の優先順位: トークン > APIキー > ホスト
  const tenantId = tenantByToken?.id || tenantByApiKey?.id || tenantByHost?.id || 'default'
  const tenant = tenantByToken || tenantByApiKey || tenantByHost

  return {
    tenantId,
    tenant
  }
}
```

#### 1.2 強化されたテナントフィルタリング

```typescript
// server/utils/prisma-tenant-filter.ts
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

// テナント分離が不要なモデルのリスト
const GLOBAL_MODELS = ['Tenant', 'GlobalSetting', 'SharedContent']

// テナントIDのカラム名が異なるモデルの対応表
const TENANT_ID_COLUMN_MAP: Record<string, string> = {
  Room: 'tenant_id',
  Order: 'tenant_id',
  MenuItem: 'tenant_id',
  // デフォルトは 'tenant_id'
}

export function createTenantFilteredPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, model, operation }) {
          // テナント分離が不要なモデルの場合はそのまま実行
          if (GLOBAL_MODELS.includes(model)) {
            return query(args)
          }

          // 単一レコード取得の場合はテナントチェックを後で行う
          if (operation === 'findUnique' || operation === 'findFirst') {
            const result = await query(args)

            // テナントチェック
            if (result) {
              const tenantIdColumn = TENANT_ID_COLUMN_MAP[model] || 'tenant_id'
              if (result[tenantIdColumn] !== tenantId) {
                return null // テナントが一致しない場合はnullを返す
              }
            }

            return result
          }

          // その他の操作の場合はクエリにテナントフィルターを追加
          const tenantIdColumn = TENANT_ID_COLUMN_MAP[model] || 'tenant_id'
          args.where = {
            ...args.where,
            [tenantIdColumn]: tenantId
          }

          return query(args)
        }
      }
    }
  })
}
```

#### 1.3 テナント間データ共有メカニズム

```typescript
// server/utils/shared-data.ts
import { prisma } from './prisma'

export enum SharingScope {
  NONE = 'none',         // 共有なし
  GROUP = 'group',       // グループ内で共有
  ALL = 'all'            // 全テナントで共有
}

export interface SharingOptions {
  scope: SharingScope
  groupIds?: string[]    // GROUP スコープの場合のグループID
  readOnly?: boolean     // 読み取り専用かどうか
}

export async function getSharedData(
  model: string,
  tenantId: string,
  options: {
    where?: any
    include?: any
    orderBy?: any
  } = {}
) {
  // テナント自身のデータを取得
  const ownData = await prisma[model].findMany({
    where: {
      ...options.where,
      tenant_id: tenantId
    },
    include: options.include,
    orderBy: options.orderBy
  })

  // 共有データを取得
  const sharedData = await prisma[`${model}Sharing`].findMany({
    where: {
      OR: [
        { scope: SharingScope.ALL },
        {
          scope: SharingScope.GROUP,
          groupIds: { has: await getTenantGroupId(tenantId) }
        }
      ]
    },
    include: {
      [model]: {
        where: options.where,
        include: options.include
      }
    },
    orderBy: options.orderBy
  })

  // 結果を結合
  return [
    ...ownData,
    ...sharedData.map(share => ({
      ...share[model],
      isShared: true,
      readOnly: share.readOnly
    }))
  ]
}
```

### 2. テナント管理機能の強化

#### 2.1 テナントライフサイクル管理

```typescript
// server/services/tenant-management.ts
import { prisma } from '../utils/prisma'

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  TRIAL = 'trial'
}

export interface TenantCreationParams {
  name: string
  domain: string
  planType: string
  contactEmail: string
  contactName: string
  initialSettings?: Record<string, any>
}

export async function createTenant(params: TenantCreationParams) {
  // トランザクション内でテナントを作成
  return await prisma.$transaction(async (tx) => {
    // テナントレコードを作成
    const tenant = await tx.tenant.create({
      data: {
        name: params.name,
        domain: params.domain,
        planType: params.planType,
        status: TenantStatus.ACTIVE,
        contactEmail: params.contactEmail,
        contactName: params.contactName
      }
    })

    // テナント設定を作成
    await tx.tenantSetting.create({
      data: {
        tenant_id: tenant.id,
        settings: params.initialSettings || {}
      }
    })

    // デフォルトのスタッフアカウントを作成
    await tx.staff.create({
      data: {
        tenant_id: tenant.id,
        email: params.contactEmail,
        name: params.contactName,
        role: 'admin',
        is_active: true,
        // パスワードリセットトークンを生成
        reset_token: generateResetToken(),
        reset_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間
      }
    })

    // テナント作成イベントを記録
    await tx.auditLog.create({
      data: {
        tenant_id: tenant.id,
        action: 'tenant_created',
        details: {
          name: tenant.name,
          domain: tenant.domain,
          planType: tenant.planType
        }
      }
    })

    return tenant
  })
}

export async function updateTenantStatus(tenantId: string, status: TenantStatus, reason?: string) {
  return await prisma.$transaction(async (tx) => {
    // テナントステータスを更新
    const tenant = await tx.tenant.update({
      where: { id: tenantId },
      data: { status }
    })

    // ステータス変更イベントを記録
    await tx.auditLog.create({
      data: {
        tenant_id: tenantId,
        action: `tenant_status_changed_to_${status}`,
        details: { previousStatus: tenant.status, reason }
      }
    })

    return tenant
  })
}
```

#### 2.2 テナント固有の設定管理

```typescript
// server/services/tenant-settings.ts
import { prisma } from '../utils/prisma'

export interface TenantSettings {
  appearance: {
    theme: string
    logo: string
    primaryColor: string
    secondaryColor: string
  }
  features: {
    enableConcierge: boolean
    enableStatistics: boolean
    enableAdvancedReporting: boolean
  }
  limits: {
    maxRooms: number
    maxMenuItems: number
    maxStaff: number
  }
  integrations: Record<string, any>
}

export async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
  // テナント設定を取得
  const settings = await prisma.tenantSetting.findUnique({
    where: { tenant_id: tenantId }
  })

  // テナントのプランタイプを取得
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { planType: true }
  })

  // プランタイプに基づくデフォルト設定を取得
  const defaultSettings = getDefaultSettingsForPlan(tenant?.planType || 'basic')

  // 設定をマージして返す
  return {
    ...defaultSettings,
    ...settings?.settings
  }
}

export async function updateTenantSettings(
  tenantId: string,
  settings: Partial<TenantSettings>,
  userId: string
) {
  // 現在の設定を取得
  const currentSettings = await getTenantSettings(tenantId)

  // 設定を更新
  const updatedSettings = await prisma.tenantSetting.upsert({
    where: { tenant_id: tenantId },
    update: {
      settings: {
        ...currentSettings,
        ...settings
      }
    },
    create: {
      tenant_id: tenantId,
      settings: {
        ...getDefaultSettingsForPlan('basic'),
        ...settings
      }
    }
  })

  // 設定変更イベントを記録
  await prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      action: 'tenant_settings_updated',
      details: {
        changedSettings: Object.keys(settings)
      }
    }
  })

  return updatedSettings
}
```

### 3. テナントデータの分析と監視

#### 3.1 テナント使用状況の監視

```typescript
// server/services/tenant-monitoring.ts
import { prisma } from '../utils/prisma'

export interface TenantUsageMetrics {
  activeUsers: number
  apiCalls: number
  storageUsed: number
  ordersProcessed: number
  lastActivity: Date | null
}

export async function getTenantUsageMetrics(tenantId: string): Promise<TenantUsageMetrics> {
  // アクティブユーザー数
  const activeUsers = await prisma.staff.count({
    where: {
      tenant_id: tenantId,
      is_active: true,
      last_login_at: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 過去30日
      }
    }
  })

  // API呼び出し数（過去24時間）
  const apiCalls = await prisma.apiLog.count({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 過去24時間
      }
    }
  })

  // ストレージ使用量
  const storageUsed = await calculateTenantStorageUsage(tenantId)

  // 処理されたオーダー数（過去30日）
  const ordersProcessed = await prisma.order.count({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 過去30日
      }
    }
  })

  // 最終アクティビティ
  const lastActivity = await prisma.auditLog.findFirst({
    where: {
      tenant_id: tenantId
    },
    orderBy: {
      created_at: 'desc'
    },
    select: {
      created_at: true
    }
  })

  return {
    activeUsers,
    apiCalls,
    storageUsed,
    ordersProcessed,
    lastActivity: lastActivity?.created_at || null
  }
}
```

#### 3.2 テナント間パフォーマンス分析

```typescript
// server/services/tenant-performance.ts
import { prisma } from '../utils/prisma'

export interface TenantPerformanceMetrics {
  averageResponseTime: number
  errorRate: number
  databaseQueryCount: number
  slowestEndpoints: {
    path: string
    method: string
    averageResponseTime: number
    callCount: number
  }[]
}

export async function analyzeTenantPerformance(
  tenantId: string,
  timeRange: { start: Date, end: Date }
): Promise<TenantPerformanceMetrics> {
  // 平均レスポンスタイム
  const responseTimeData = await prisma.apiLog.aggregate({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: timeRange.start,
        lte: timeRange.end
      }
    },
    _avg: {
      response_time: true
    }
  })

  // エラーレート
  const totalRequests = await prisma.apiLog.count({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: timeRange.start,
        lte: timeRange.end
      }
    }
  })

  const errorRequests = await prisma.apiLog.count({
    where: {
      tenant_id: tenantId,
      status_code: {
        gte: 400
      },
      created_at: {
        gte: timeRange.start,
        lte: timeRange.end
      }
    }
  })

  // 最も遅いエンドポイント
  const slowestEndpoints = await prisma.$queryRaw`
    SELECT
      path,
      method,
      AVG(response_time) as averageResponseTime,
      COUNT(*) as callCount
    FROM api_log
    WHERE tenant_id = ${tenantId}
      AND created_at >= ${timeRange.start}
      AND created_at <= ${timeRange.end}
    GROUP BY path, method
    ORDER BY averageResponseTime DESC
    LIMIT 5
  `

  return {
    averageResponseTime: responseTimeData._avg.response_time || 0,
    errorRate: totalRequests > 0 ? errorRequests / totalRequests : 0,
    databaseQueryCount: await getDatabaseQueryCount(tenantId, timeRange),
    slowestEndpoints
  }
}
```

## 実装計画

### フェーズ1: テナント分離の強化（2025年8月）

1. 統一テナントコンテキストの実装
2. 強化されたテナントフィルタリングの実装
3. テナント間データ共有メカニズムの実装

### フェーズ2: テナント管理機能の強化（2025年9月）

1. テナントライフサイクル管理の実装
2. テナント固有の設定管理の実装
3. テナント管理画面の実装

### フェーズ3: テナントデータの分析と監視（2025年10月）

1. テナント使用状況の監視機能の実装
2. テナント間パフォーマンス分析の実装
3. テナント分析ダッシュボードの実装

## リスク評価

| リスク | 影響度 | 発生確率 | 対策 |
|------|--------|---------|------|
| データ漏洩 | 高 | 低 | 厳格なテナントフィルタリングとテスト |
| パフォーマンス低下 | 中 | 中 | インデックス最適化とクエリキャッシュ |
| 移行の複雑さ | 高 | 中 | 段階的な移行と詳細なテスト |
| 既存機能への影響 | 高 | 中 | 後方互換性の維持 |

## 期待される効果

1. **データセキュリティの向上**: テナント間のデータ分離が強化され、データ漏洩リスクが低減
2. **運用効率の向上**: テナント管理機能の強化により、運用負荷が軽減
3. **柔軟性の向上**: テナント固有の設定により、各テナントのニーズに合わせたカスタマイズが可能
4. **スケーラビリティの向上**: 効率的なテナント分離により、多数のテナントを効率的に管理可能
5. **分析能力の向上**: テナントデータの分析と監視により、サービス品質の向上とビジネスインサイトの獲得

## 結論

テナント分離の完全実装により、hotel-saasシステムのセキュリティ、効率性、柔軟性が大幅に向上します。統一テナントコンテキスト、強化されたテナントフィルタリング、テナント間データ共有メカニズムにより、より堅牢なマルチテナント環境を構築します。テナント管理機能の強化とテナントデータの分析・監視により、運用効率の向上とサービス品質の向上を実現します。
