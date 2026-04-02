# マルチテナント化技術仕様書

## 概要
Hotel SaaSプラットフォームのマルチテナント化により、単一インフラで複数ホテルへのサービス提供を実現する。

## アーキテクチャ設計

### 1. データベース設計

#### テナント分離方式
- **方式**: Row Level Security (RLS) + tenantId方式
- **理由**: コスト効率とパフォーマンスのバランス

```sql
-- 全テーブルにtenantId追加
ALTER TABLE orders ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE menu_items ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE categories ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE devices ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE places ADD COLUMN tenant_id VARCHAR(36) NOT NULL;

-- RLSポリシー設定例
CREATE POLICY tenant_isolation_policy ON orders
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id'));
```

#### 新規テーブル
```sql
-- テナント管理
CREATE TABLE tenants (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  plan_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- プラン管理
CREATE TABLE subscription_plans (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) REFERENCES tenants(id),
  plan_type VARCHAR(50) NOT NULL,
  device_limit INTEGER,
  features JSON,
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. 認証システム

#### テナント識別
```typescript
// middleware/tenant-resolver.ts
export default defineNuxtRouteMiddleware((to) => {
  const subdomain = getSubdomain(to.headers.host)
  const tenant = await getTenantBySubdomain(subdomain)
  
  if (!tenant) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Tenant not found'
    })
  }
  
  // テナントIDをコンテキストに設定
  setTenantContext(tenant.id)
})
```

#### API層での分離
```typescript
// server/utils/tenant-context.ts
export function withTenantIsolation<T>(
  handler: (event: H3Event, tenantId: string) => Promise<T>
) {
  return async (event: H3Event): Promise<T> => {
    const tenantId = await getTenantIdFromRequest(event)
    
    if (!tenantId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Tenant authentication required'
      })
    }
    
    return handler(event, tenantId)
  }
}
```

### 3. サービス分離設計

#### ドメイン構成
```
hotel-saas.com (メインサイト)
├── app.hotel-saas.com (Room Service)
├── members.hotel-saas.com (会員システム)
├── pms.hotel-saas.com (PMS)
└── admin.hotel-saas.com (管理画面)
```

#### 管理画面モジュール
```typescript
// composables/useAdminModules.ts
export const useAdminModules = () => {
  const { tenant } = useTenant()
  
  const availableModules = computed(() => {
    const plan = tenant.value?.plan_type
    
    return {
      roomService: ['economy', 'professional', 'enterprise'].includes(plan),
      memberSystem: ['member-only', 'professional', 'enterprise'].includes(plan),
      pms: ['pms-only', 'professional', 'enterprise'].includes(plan),
      aiConcierge: ['professional', 'enterprise'].includes(plan)
    }
  })
  
  return { availableModules }
}
```

### 4. プラン制限システム

#### デバイス制限
```typescript
// server/api/v1/devices/create.post.ts
export default withTenantIsolation(async (event, tenantId) => {
  const subscription = await getSubscription(tenantId)
  const currentDeviceCount = await getDeviceCount(tenantId)
  
  if (currentDeviceCount >= subscription.device_limit) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Device limit exceeded'
    })
  }
  
  // デバイス作成処理
})
```

#### 機能制限
```typescript
// middleware/feature-gate.ts
export const featureGate = (requiredFeature: string) => {
  return defineNuxtRouteMiddleware(async () => {
    const { hasFeature } = await usePlanFeatures()
    
    if (!hasFeature(requiredFeature)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Feature not available in current plan'
      })
    }
  })
}
```

## 実装フェーズ

### Phase 1: データベース移行
1. tenantIdカラム追加
2. 既存データの移行スクリプト作成
3. RLSポリシー設定

### Phase 2: 認証・API改修
1. テナント識別ミドルウェア
2. API層でのテナント分離
3. 管理画面の認証改修

### Phase 3: サービス分離
1. サブドメイン設定
2. モジュラー管理画面
3. プラン制限システム

### Phase 4: 決済統合
1. Stripe連携
2. サブスクリプション管理
3. 自動プロビジョニング

## セキュリティ考慮事項

### データ分離
- RLSによる確実なテナント分離
- APIレベルでの二重チェック
- 管理者権限の適切な分離

### アクセス制御
- サブドメインベースの認証
- 機能レベルでの権限管理
- 監査ログの実装

## パフォーマンス最適化

### データベース
- tenantId + 主キーでの複合インデックス
- パーティショニングの検討（大規模時）
- 接続プールの最適化

### キャッシュ戦略
- テナント別キャッシュ
- 静的リソースのCDN配信
- API レスポンスキャッシュ

## 運用・監視

### メトリクス
- テナント別の利用状況
- パフォーマンスメトリクス
- エラー率の監視

### バックアップ
- テナント別バックアップ戦略
- ポイントインタイム復旧
- 災害復旧計画 