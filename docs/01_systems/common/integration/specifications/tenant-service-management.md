# 🏢 テナントサービス管理仕様書

**作成日**: 2025年7月31日  
**バージョン**: 1.0.0  
**対象システム**: hotel-common, hotel-member, hotel-pms, hotel-saas  
**基盤**: PostgreSQL 14+ + Prisma ORM

## 1. 概要

本仕様書は、テナントが利用可能なサービス（hotel-saas, hotel-pms, hotel-member）を明示的に管理するための設計を定義します。また、各サービスごとの個別プラン管理についても規定します。

### 1.1 現状の課題

1. **サービス利用状況の不明確さ**: 現在のデータモデルでは、テナントがどのサービスを利用しているかを直接示すフィールドやテーブルが存在しない
2. **一括プラン管理の限界**: 現在の `plan_restrictions` テーブルは全体を一括して制御する構造になっており、各サービス(saas, pms, member)ごとの個別管理ができていない

## 2. 新データモデル設計

### 2.1 テナントサービス管理テーブル

```sql
-- テナントサービス利用管理
CREATE TABLE tenant_services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  service_type TEXT NOT NULL, -- 'hotel-saas', 'hotel-pms', 'hotel-member'
  plan_type TEXT NOT NULL, -- 'economy', 'standard', 'premium'
  is_active BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 各サービス固有の設定
  service_config JSONB NOT NULL DEFAULT '{}',
  
  UNIQUE(tenant_id, service_type)
);
```

### 2.2 サービス別プラン制限テーブル

```sql
-- サービス別プラン制限
CREATE TABLE service_plan_restrictions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL, -- 'hotel-saas', 'hotel-pms', 'hotel-member'
  plan_type TEXT NOT NULL, -- 'economy', 'standard', 'premium'
  plan_category TEXT NOT NULL, -- 'omotenasuai', 'business', etc.
  
  -- 共通制限
  max_users INT NOT NULL DEFAULT 10,
  max_devices INT NOT NULL DEFAULT 5,
  
  -- サービス固有制限
  -- hotel-saas固有
  max_monthly_orders INT,
  enable_ai_concierge BOOLEAN,
  enable_multilingual BOOLEAN,
  
  -- hotel-pms固有
  max_rooms INT,
  enable_revenue_management BOOLEAN,
  
  -- hotel-member固有
  max_monthly_ai_requests INT,
  enable_ai_crm BOOLEAN,
  
  monthly_price INT NOT NULL DEFAULT 9800,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(service_type, plan_type, plan_category)
);
```

### 2.3 サービス利用統計テーブル

```sql
-- サービス利用統計
CREATE TABLE service_usage_statistics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  service_type TEXT NOT NULL, -- 'hotel-saas', 'hotel-pms', 'hotel-member'
  month TEXT NOT NULL, -- 'YYYY-MM'
  
  -- 共通統計
  active_users_count INT NOT NULL DEFAULT 0,
  active_devices_count INT NOT NULL DEFAULT 0,
  
  -- サービス固有統計
  usage_data JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(tenant_id, service_type, month)
);
```

## 3. Prismaスキーマ定義

```prisma
// tenant_services テーブル
model TenantService {
  id            String    @id @default(cuid())
  tenantId      String    @map("tenant_id")
  serviceType   String    @map("service_type")
  planType      String    @map("plan_type")
  isActive      Boolean   @default(true) @map("is_active")
  activatedAt   DateTime  @default(now()) @map("activated_at")
  expiresAt     DateTime? @map("expires_at")
  serviceConfig Json      @default("{}") @map("service_config")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, serviceType])
  @@map("tenant_services")
}

// service_plan_restrictions テーブル
model ServicePlanRestriction {
  id                   String   @id @default(cuid())
  serviceType          String   @map("service_type")
  planType             String   @map("plan_type")
  planCategory         String   @map("plan_category")
  
  // 共通制限
  maxUsers             Int      @default(10) @map("max_users")
  maxDevices           Int      @default(5) @map("max_devices")
  
  // サービス固有制限
  maxMonthlyOrders     Int?     @map("max_monthly_orders")
  enableAiConcierge    Boolean? @map("enable_ai_concierge")
  enableMultilingual   Boolean? @map("enable_multilingual")
  
  maxRooms             Int?     @map("max_rooms")
  enableRevenueManagement Boolean? @map("enable_revenue_management")
  
  maxMonthlyAiRequests Int?     @map("max_monthly_ai_requests")
  enableAiCrm          Boolean? @map("enable_ai_crm")
  
  monthlyPrice         Int      @default(9800) @map("monthly_price")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")
  
  @@unique([serviceType, planType, planCategory])
  @@map("service_plan_restrictions")
}

// service_usage_statistics テーブル
model ServiceUsageStatistic {
  id                String   @id @default(cuid())
  tenantId          String   @map("tenant_id")
  serviceType       String   @map("service_type")
  month             String
  
  activeUsersCount  Int      @default(0) @map("active_users_count")
  activeDevicesCount Int     @default(0) @map("active_devices_count")
  
  usageData         Json     @default("{}") @map("usage_data")
  
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, serviceType, month])
  @@map("service_usage_statistics")
}
```

## 4. 既存テナントテーブルの拡張

既存の `Tenant` モデルは変更せず、新しい `tenant_services` テーブルとのリレーションを追加します。これにより、既存のコードへの影響を最小限に抑えつつ、テナントのサービス利用状況を管理できます。

```prisma
model Tenant {
  // 既存フィールド...
  
  // 新規リレーション
  services TenantService[]
  usageStatistics ServiceUsageStatistic[]
}
```

## 5. サービス別プラン定義

### 5.1 hotel-saas (AIコンシェルジュ)

```typescript
const SAAS_PLANS = {
  economy: {
    maxMonthlyOrders: 500,
    enableAiConcierge: false,
    enableMultilingual: false,
    monthlyPrice: 9800
  },
  standard: {
    maxMonthlyOrders: 2000,
    enableAiConcierge: true,
    enableMultilingual: false,
    monthlyPrice: 29800
  },
  premium: {
    maxMonthlyOrders: 5000,
    enableAiConcierge: true,
    enableMultilingual: true,
    monthlyPrice: 49800
  }
};
```

### 5.2 hotel-pms (AIマネジメント)

```typescript
const PMS_PLANS = {
  economy: {
    maxRooms: 30,
    enableRevenueManagement: false,
    monthlyPrice: 19800
  },
  standard: {
    maxRooms: 100,
    enableRevenueManagement: false,
    monthlyPrice: 39800
  },
  premium: {
    maxRooms: 300,
    enableRevenueManagement: true,
    monthlyPrice: 59800
  }
};
```

### 5.3 hotel-member (AICRM)

```typescript
const MEMBER_PLANS = {
  economy: {
    maxMonthlyAiRequests: 100,
    enableAiCrm: false,
    monthlyPrice: 14800
  },
  standard: {
    maxMonthlyAiRequests: 500,
    enableAiCrm: true,
    monthlyPrice: 34800
  },
  premium: {
    maxMonthlyAiRequests: 1000,
    enableAiCrm: true,
    monthlyPrice: 54800
  }
};
```

## 6. 実装計画

1. **マイグレーションファイル作成**: 新規テーブル作成のためのマイグレーションファイル
2. **初期データ投入**: 各サービス別プラン制限の初期データ投入
3. **既存テナントデータ移行**: 現在のテナントに対して、利用中のサービス情報を追加
4. **APIエンドポイント実装**: テナントのサービス管理用APIの実装
5. **フロントエンド連携**: 管理画面でのサービス管理機能の実装

## 7. 移行戦略

1. **データベースマイグレーション**: 新規テーブルの追加（既存テーブルには影響なし）
2. **既存テナントデータ分析**: 現在のテナントがどのサービスを利用しているかを分析
3. **データ移行スクリプト**: 分析結果に基づいて、`tenant_services`テーブルに初期データを投入
4. **段階的機能展開**: 新しいサービス管理機能を段階的に展開

## 8. 結論

この設計により、テナントごとに利用可能なサービスを明示的に管理でき、各サービスごとに異なるプラン設定が可能になります。また、サービスごとの利用統計も取得できるようになり、より詳細な分析と請求管理が実現します。