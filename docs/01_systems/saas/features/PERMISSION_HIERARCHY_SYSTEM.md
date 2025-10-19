# OmotenasuAI 権限階層管理システム

## 概要

OmotenasuAIでは、3層の権限階層によってシステム全体のアクセス制御を行います。
各権限レベルで適切な機能制限とデータアクセス制御を実装し、セキュアなマルチテナント環境を提供します。

## 権限階層構造

### 1. 🏢 SuperAdmin (開発元・当社)
**役割**: システム全体の統括管理
**権限レベル**: `super_admin`

#### 主要権限
- ✅ **システム管理**
  - AIモデル設定・価格調整
  - 為替レート設定
  - システム全体の設定変更

- ✅ **代理店管理**
  - 代理店登録・削除
  - ランク設定・マージン調整
  - 売上分析・レポート

- ✅ **テナント管理**
  - 全テナントの監視・管理
  - プラン変更・課金設定
  - システム利用状況分析

- ✅ **技術管理**
  - データベース管理
  - セキュリティ設定
  - バックアップ・復旧

#### アクセス可能エリア
```
/admin/system/*          # システム設定
/admin/agents/*          # 代理店管理
/admin/tenants/*         # テナント管理
/admin/analytics/*       # 全体分析
/admin/billing/*         # 課金管理
```

### 2. 🤝 Agent (代理店)
**役割**: 担当ホテルの営業・サポート
**権限レベル**: `agent`

#### 主要権限
- ✅ **担当ホテル管理**
  - 新規ホテル登録
  - 契約管理・更新
  - プラン変更サポート

- ✅ **売上管理**
  - 自社売上・マージン確認
  - 月次・年次レポート
  - ランク進捗確認

- ✅ **顧客サポート**
  - 担当ホテルの技術サポート
  - 設定変更代行
  - 問い合わせ対応

#### アクセス制限
- ❌ システム設定変更不可
- ❌ 他代理店の情報アクセス不可
- ❌ 価格・マージン設定変更不可

#### アクセス可能エリア
```
/agent/dashboard         # 代理店ダッシュボード
/agent/hotels/*          # 担当ホテル管理
/agent/sales/*           # 売上・マージン
/agent/support/*         # サポート機能
```

### 3. 🏨 Hotel (ホテル管理者)
**役割**: 自ホテルの運営管理
**権限レベル**: `admin`

#### 主要権限
- ✅ **ホテル運営**
  - メニュー管理
  - 注文管理・履歴
  - デバイス設定

- ✅ **コンテンツ管理**
  - 館内施設案内
  - キャンペーン設定
  - 多言語対応

- ✅ **分析・レポート**
  - 売上分析
  - 人気商品分析
  - 利用統計

#### アクセス制限
- ❌ 他ホテルの情報アクセス不可
- ❌ システム設定変更不可
- ❌ 代理店情報アクセス不可

#### アクセス可能エリア
```
/admin/menu/*            # メニュー管理
/admin/orders/*          # 注文管理
/admin/devices/*         # デバイス管理
/admin/info/*            # 館内案内
/admin/statistics/*      # 分析・統計
```

## 技術実装

### 認証ミドルウェア

#### 1. テナント解決ミドルウェア
```typescript
// middleware/01-tenant-resolver.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const host = to.headers?.host
  const tenant = await resolveTenantFromHost(host)
  
  if (tenant) {
    setTenantContext(tenant.id)
  }
})
```

#### 2. 権限チェックミドルウェア
```typescript
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  const userRole = session?.user?.role
  
  // 権限レベルチェック
  if (requiresSuperAdmin(event.path) && userRole !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'SuperAdmin権限が必要です' })
  }
  
  if (requiresAgent(event.path) && !['agent', 'super_admin'].includes(userRole)) {
    throw createError({ statusCode: 403, statusMessage: '代理店権限が必要です' })
  }
})
```

### データベース分離

#### テナント分離クエリ
```typescript
// server/utils/tenant-context.ts
export function withTenantIsolation<T>(
  handler: (event: H3Event, tenantId: string) => Promise<T>
) {
  return async (event: H3Event): Promise<T> => {
    const tenantId = await getTenantIdFromRequest(event)
    
    // Prismaクエリにテナント条件を自動追加
    return handler(event, tenantId)
  }
}
```

## プラン制限システム

### Economy Plan制限
```typescript
// composables/usePlanRestrictions.ts
export const usePlanRestrictions = () => {
  const restrictions = {
    economy: {
      maxDevices: 30,
      aiConcierge: false,
      layoutEditor: false,
      multilingual: false,
      maxMonthlyOrders: 1000
    },
    professional: {
      maxDevices: 100,
      aiConcierge: true,
      layoutEditor: true,
      multilingual: true,
      maxMonthlyOrders: 5000
    },
    enterprise: {
      maxDevices: -1, // 無制限
      aiConcierge: true,
      layoutEditor: true,
      multilingual: true,
      maxMonthlyOrders: -1 // 無制限
    }
  }
}
```

## セキュリティ考慮事項

### 1. データアクセス制御
- **テナント分離**: 全てのデータベースクエリにテナントIDフィルタを自動適用
- **API分離**: エンドポイントレベルでの権限チェック
- **セッション管理**: JWTベースのセキュアな認証

### 2. 監査ログ
```typescript
// 権限変更・重要操作のログ記録
interface AuditLog {
  userId: number
  userRole: string
  action: string
  resource: string
  tenantId?: string
  timestamp: Date
  ipAddress: string
}
```

### 3. レート制限
- API呼び出し頻度制限
- プランに応じた機能制限
- 不正アクセス検知

## 代理店ランクシステム

### ランク階層
| Rank | Initial Margin | Continuing Margin | 年間売上条件 | 年間契約条件 |
|------|---------------|-------------------|------------|------------|
| **Bronze** | 35% | 15% | ¥0-¥4,000,000 | 3+ contracts |
| **Silver** | 45% | 20% | ¥4,000,000+ | 6+ contracts |
| **Gold** | 55% | 25% | ¥12,000,000+ | 12+ contracts |
| **Platinum** | 65% | 30% | ¥30,000,000+ | 24+ contracts |
| **Diamond** | 75% | 35% | ¥50,000,000+ | 50+ contracts |

### 自動ランク評価
```typescript
// server/api/v1/admin/agents/[id]/rank-evaluation.post.ts
export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  const performance = await calculateAgentPerformance(agentId)
  
  const newRank = evaluateRank(performance)
  await updateAgentRank(agentId, newRank)
  
  return { rank: newRank, performance }
})
```

## 運用フロー

### 1. 新規ホテル登録
```
SuperAdmin → 代理店登録 → 代理店 → ホテル登録 → 自動プロビジョニング
```

### 2. 権限昇格
```
申請 → SuperAdmin承認 → 権限変更 → 監査ログ記録
```

### 3. 問題対応
```
ホテル → 代理店 → SuperAdmin (エスカレーション)
```

## 今後の拡張予定

### Phase 2: 詳細権限制御
- 機能レベルでの細かい権限設定
- カスタム権限ロール作成
- 一時的権限付与機能

### Phase 3: 高度な分析
- 権限使用状況分析
- セキュリティリスク評価
- 自動権限最適化

---

**最終更新**: 2025年1月15日
**バージョン**: 1.0
**担当**: OmotenasuAI開発チーム 