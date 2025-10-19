# 🚀 販売戦略実装計画書 - マルチテナント化連携版

## 概要
ハイパーパワーマーケティング戦略の技術的実装計画。マルチテナント化と同時進行で、3WAY紹介システム、代理店プログラム、リスクリバーサル機能を段階的に実装する。

---

## 🎯 実装目標

### 短期目標（3ヶ月）
- マルチテナント基盤構築完了
- 代理店管理システム基本機能実装
- 紹介追跡システム実装
- 料金プラン管理システム実装

### 中期目標（6ヶ月）
- 3WAY紹介システム完全実装
- リスクリバーサル機能実装
- 代理店ポータル完成
- PMSメーカー連携API実装

### 長期目標（12ヶ月）
- 全機能統合・最適化完了
- KPI監視ダッシュボード実装
- 自動化ワークフロー完成
- 海外展開準備完了

---

## 📋 Phase 1: マルチテナント基盤構築（4-6週間）

### 1.1 データベーススキーマ設計

#### **テナント管理テーブル**
```sql
-- テナント（ホテル）情報
CREATE TABLE tenants (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  plan_type VARCHAR(50) NOT NULL, -- 'LEISURE_ECONOMY', 'OMOTENASU_PROFESSIONAL', etc.
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly', 'biennial'
  discount_rate DECIMAL(5,2) DEFAULT 0.00, -- 年払い割引率
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- プラン定義
CREATE TABLE subscription_plans (
  id VARCHAR(36) PRIMARY KEY,
  plan_code VARCHAR(50) UNIQUE NOT NULL, -- 'LEISURE_ECONOMY', 'OMOTENASU_PRO'
  plan_name VARCHAR(100) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  max_rooms INTEGER NOT NULL,
  features JSON, -- プラン別機能制限
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- テナント別設定
CREATE TABLE tenant_settings (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, setting_key)
);
```

#### **代理店管理テーブル**
```sql
-- 代理店情報
CREATE TABLE agents (
  id VARCHAR(36) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  rank VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum', 'diamond'
  status VARCHAR(20) DEFAULT 'active',
  territory VARCHAR(255), -- 独占エリア（Diamond限定）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 代理店ランク設定
CREATE TABLE agent_rank_settings (
  id VARCHAR(36) PRIMARY KEY,
  rank VARCHAR(20) UNIQUE NOT NULL,
  first_year_margin DECIMAL(5,2) NOT NULL, -- 初年度マージン率
  continuing_margin DECIMAL(5,2) NOT NULL, -- 継続マージン率
  annual_sales_requirement DECIMAL(12,2), -- 年間売上条件
  benefits JSON -- 特典内容
);

-- 代理店売上実績
CREATE TABLE agent_sales (
  id VARCHAR(36) PRIMARY KEY,
  agent_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  contract_start_date DATE NOT NULL,
  monthly_amount DECIMAL(10,2) NOT NULL,
  first_year_commission DECIMAL(10,2) NOT NULL,
  continuing_commission DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

#### **紹介システムテーブル**
```sql
-- 紹介記録
CREATE TABLE referrals (
  id VARCHAR(36) PRIMARY KEY,
  referrer_type VARCHAR(20) NOT NULL, -- 'agent', 'customer', 'pms_vendor'
  referrer_id VARCHAR(36) NOT NULL,
  referred_tenant_id VARCHAR(36) NOT NULL,
  referral_code VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'converted', 'cancelled'
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_duration_months INTEGER DEFAULT 12,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  converted_at TIMESTAMP NULL,
  FOREIGN KEY (referred_tenant_id) REFERENCES tenants(id)
);

-- 紹介報酬支払い履歴
CREATE TABLE referral_payments (
  id VARCHAR(36) PRIMARY KEY,
  referral_id VARCHAR(36) NOT NULL,
  payment_month DATE NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (referral_id) REFERENCES referrals(id)
);
```

### 1.2 認証・権限システム拡張

#### **マルチテナント認証**
```typescript
// middleware/tenant-auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const tenantId = getTenantFromDomain(to.host)
  const user = useAuthUser()
  
  // テナント固有のアクセス制御
  if (!user.value?.tenants?.includes(tenantId)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied to this tenant'
    })
  }
  
  // テナント情報をコンテキストに設定
  useTenant().value = await getTenantById(tenantId)
})
```

#### **プラン別機能制限**
```typescript
// composables/usePlanRestrictions.ts
export const usePlanRestrictions = () => {
  const tenant = useTenant()
  
  const checkFeatureAccess = (feature: string): boolean => {
    const plan = tenant.value?.plan_type
    const planConfig = PLAN_FEATURES[plan]
    return planConfig?.features?.includes(feature) || false
  }
  
  const getRoomLimit = (): number => {
    const plan = tenant.value?.plan_type
    return PLAN_CONFIGS[plan]?.max_rooms || 0
  }
  
  return {
    checkFeatureAccess,
    getRoomLimit,
    canUseAIVoice: () => checkFeatureAccess('ai_voice'),
    canUsePremiumSupport: () => checkFeatureAccess('premium_support')
  }
}
```

### 1.3 API層のテナント分離

#### **テナント分離ミドルウェア**
```typescript
// server/middleware/tenant-isolation.ts
export default defineEventHandler(async (event) => {
  if (event.node.req.url?.startsWith('/api/v1/')) {
    const tenantId = getTenantFromRequest(event)
    
    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tenant ID required'
      })
    }
    
    // テナントIDをコンテキストに設定
    event.context.tenantId = tenantId
    
    // Prismaクエリの自動フィルタリング設定
    event.context.prisma = prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            args.where = { ...args.where, tenantId }
            return query(args)
          }
        }
      }
    })
  }
})
```

---

## 📋 Phase 2: 代理店管理システム（4-5週間）

### 2.1 代理店ポータル開発

#### **代理店ダッシュボード**
```vue
<!-- pages/agent/dashboard.vue -->
<template>
  <div class="agent-dashboard">
    <div class="stats-grid">
      <StatCard title="今月の売上" :value="monthlyStats.revenue" />
      <StatCard title="成約件数" :value="monthlyStats.contracts" />
      <StatCard title="今月の報酬" :value="monthlyStats.commission" />
      <StatCard title="現在のランク" :value="agent.rank" />
    </div>
    
    <div class="referral-section">
      <h2>紹介管理</h2>
      <ReferralCodeGenerator />
      <ReferralList :referrals="referrals" />
    </div>
    
    <div class="resources-section">
      <h2>営業資料</h2>
      <SalesResourcesLibrary :rank="agent.rank" />
    </div>
  </div>
</template>
```

#### **紹介コード生成・追跡**
```typescript
// server/api/v1/agent/referrals/generate.post.ts
export default defineEventHandler(async (event) => {
  const agentId = event.context.user.agentId
  const body = await readBody(event)
  
  const referralCode = generateUniqueCode()
  
  const referral = await prisma.referrals.create({
    data: {
      referrer_type: 'agent',
      referrer_id: agentId,
      referral_code: referralCode,
      commission_rate: getAgentCommissionRate(agentId),
      commission_duration_months: 12,
      metadata: {
        campaign: body.campaign,
        notes: body.notes
      }
    }
  })
  
  return { referralCode, trackingUrl: `${DOMAIN}/signup?ref=${referralCode}` }
})
```

### 2.2 報酬計算システム

#### **自動報酬計算**
```typescript
// server/cron/calculate-commissions.ts
export default defineCronHandler('0 1 * * *', async () => {
  const activeReferrals = await prisma.referrals.findMany({
    where: { status: 'converted' },
    include: { referred_tenant: true }
  })
  
  for (const referral of activeReferrals) {
    const tenant = referral.referred_tenant
    const monthlyAmount = calculateMonthlyAmount(tenant)
    
    const commissionAmount = calculateCommission(
      referral,
      monthlyAmount,
      getContractMonth(referral.converted_at)
    )
    
    await createCommissionPayment(referral.id, commissionAmount)
  }
})

function calculateCommission(referral: Referral, monthlyAmount: number, contractMonth: number): number {
  const isFirstYear = contractMonth <= 12
  const rate = isFirstYear ? referral.first_year_rate : referral.continuing_rate
  return monthlyAmount * (rate / 100)
}
```

---

## 📋 Phase 3: 既存顧客紹介システム（3-4週間）

### 3.1 顧客紹介インターフェース

#### **紹介ページ**
```vue
<!-- pages/customer/referral.vue -->
<template>
  <div class="customer-referral">
    <div class="referral-benefits">
      <h1>お友達を紹介して特典をゲット！</h1>
      <div class="benefits-grid">
        <BenefitCard 
          title="紹介報酬" 
          description="成功報酬として月額の5%を12ヶ月間"
          :amount="calculateReferralReward()"
        />
        <BenefitCard 
          title="紹介者特典" 
          description="あなたの月額料金が10%割引（6ヶ月間）"
          :amount="calculateOwnDiscount()"
        />
      </div>
    </div>
    
    <div class="referral-form">
      <h2>紹介フォーム</h2>
      <CustomerReferralForm @submit="handleReferralSubmit" />
    </div>
    
    <div class="referral-history">
      <h2>紹介履歴</h2>
      <ReferralHistoryTable :referrals="customerReferrals" />
    </div>
  </div>
</template>
```

### 3.2 VIP顧客特典システム

#### **VIP特典管理**
```typescript
// composables/useVipBenefits.ts
export const useVipBenefits = () => {
  const customer = useCustomer()
  
  const checkVipStatus = async (): Promise<VipStatus> => {
    const referralCount = await $fetch('/api/v1/customer/referrals/count')
    const accountAge = getAccountAge(customer.value.created_at)
    
    return {
      isVip: referralCount >= 1 || accountAge >= 365,
      benefits: getVipBenefits(referralCount, accountAge),
      nextTierRequirements: getNextTierRequirements(referralCount)
    }
  }
  
  const getVipBenefits = (referralCount: number, accountAge: number) => {
    const benefits = []
    
    if (referralCount >= 1) {
      benefits.push('priority_support', 'beta_access')
    }
    if (referralCount >= 3) {
      benefits.push('free_consultation', 'slack_access')
    }
    if (accountAge >= 365) {
      benefits.push('loyalty_discount')
    }
    
    return benefits
  }
  
  return { checkVipStatus }
}
```

---

## 📋 Phase 4: PMSメーカー連携システム（5-6週間）

### 4.1 PMS連携API開発

#### **統合API設計**
```typescript
// server/api/v1/pms/integration/[vendor].post.ts
export default defineEventHandler(async (event) => {
  const vendor = getRouterParam(event, 'vendor') // 'cloudbeds', 'mews', 'opera'
  const body = await readBody(event)
  
  const integrationConfig = PMS_INTEGRATIONS[vendor]
  
  if (!integrationConfig) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported PMS vendor'
    })
  }
  
  // PMS固有の認証・接続処理
  const connection = await establishPmsConnection(vendor, body.credentials)
  
  // データ同期設定
  await setupDataSync(event.context.tenantId, vendor, connection)
  
  return { status: 'connected', vendor, features: integrationConfig.features }
})
```

#### **データ同期システム**
```typescript
// server/services/pms-sync.ts
export class PmsSyncService {
  async syncRoomStatus(tenantId: string, vendor: string) {
    const connection = await getPmsConnection(tenantId, vendor)
    const roomData = await connection.getRoomStatus()
    
    // OmotenasuAIのデータベースに同期
    await prisma.rooms.updateMany({
      where: { tenantId },
      data: roomData.map(room => ({
        room_number: room.number,
        status: room.status,
        guest_name: room.guest?.name,
        check_in: room.check_in,
        check_out: room.check_out
      }))
    })
  }
  
  async syncReservations(tenantId: string, vendor: string) {
    const connection = await getPmsConnection(tenantId, vendor)
    const reservations = await connection.getReservations()
    
    // 予約データの同期処理
    for (const reservation of reservations) {
      await syncReservationData(tenantId, reservation)
    }
  }
}
```

### 4.2 共同販売プログラム

#### **PMSベンダー管理**
```sql
-- PMSベンダー情報
CREATE TABLE pms_vendors (
  id VARCHAR(36) PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  api_endpoint VARCHAR(500),
  commission_rate DECIMAL(5,2) DEFAULT 20.00,
  status VARCHAR(20) DEFAULT 'active',
  partnership_level VARCHAR(20) DEFAULT 'basic', -- 'basic', 'preferred', 'strategic'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PMS連携実績
CREATE TABLE pms_integrations (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  vendor_id VARCHAR(36) NOT NULL,
  integration_type VARCHAR(50) NOT NULL, -- 'room_status', 'reservations', 'billing'
  status VARCHAR(20) DEFAULT 'active',
  last_sync_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (vendor_id) REFERENCES pms_vendors(id)
);
```

---

## 📋 Phase 5: リスクリバーサル機能（4-5週間）

### 5.1 返金保証システム

#### **返金申請処理**
```typescript
// server/api/v1/customer/refund-request.post.ts
export default defineEventHandler(async (event) => {
  const tenantId = event.context.tenantId
  const body = await readBody(event)
  
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    include: { subscription_plan: true }
  })
  
  // 返金保証期間チェック
  const guaranteePeriod = getGuaranteePeriod(tenant.plan_type)
  const contractAge = getContractAge(tenant.created_at)
  
  if (contractAge > guaranteePeriod) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Refund guarantee period expired'
    })
  }
  
  // 返金申請作成
  const refundRequest = await prisma.refund_requests.create({
    data: {
      tenant_id: tenantId,
      request_type: body.type, // 'full_refund', 'roi_compensation'
      reason: body.reason,
      amount_requested: calculateRefundAmount(tenant, body.type),
      status: 'pending'
    }
  })
  
  // 自動承認ロジック（条件に応じて）
  if (shouldAutoApprove(refundRequest)) {
    await processAutoRefund(refundRequest.id)
  }
  
  return refundRequest
})
```

### 5.2 ROI測定・補填システム

#### **ROI測定ダッシュボード**
```vue
<!-- pages/admin/roi-tracking.vue -->
<template>
  <div class="roi-tracking">
    <div class="roi-overview">
      <h1>ROI測定・補填管理</h1>
      <div class="metrics-grid">
        <MetricCard title="平均ROI" :value="averageRoi" suffix="%" />
        <MetricCard title="補填対象" :value="compensationCases" suffix="件" />
        <MetricCard title="補填総額" :value="totalCompensation" prefix="¥" />
      </div>
    </div>
    
    <div class="roi-analysis">
      <RoiAnalysisChart :data="roiData" />
      <CompensationQueue :cases="pendingCompensations" />
    </div>
  </div>
</template>
```

#### **自動ROI計算**
```typescript
// server/cron/calculate-roi.ts
export default defineCronHandler('0 2 * * 0', async () => {
  const tenants = await prisma.tenants.findMany({
    where: {
      created_at: {
        gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // 6ヶ月前
      }
    }
  })
  
  for (const tenant of tenants) {
    const roi = await calculateTenantRoi(tenant.id)
    
    await prisma.roi_measurements.create({
      data: {
        tenant_id: tenant.id,
        measurement_period: '6_months',
        roi_percentage: roi.percentage,
        cost_savings: roi.costSavings,
        revenue_increase: roi.revenueIncrease,
        calculated_at: new Date()
      }
    })
    
    // ROI補填判定
    if (roi.percentage < getGuaranteedRoi(tenant.plan_type)) {
      await createCompensationCase(tenant.id, roi)
    }
  }
})
```

---

## 📋 Phase 6: 統合・最適化（継続）

### 6.1 KPI監視ダッシュボード

#### **経営ダッシュボード**
```vue
<!-- pages/admin/executive-dashboard.vue -->
<template>
  <div class="executive-dashboard">
    <div class="kpi-overview">
      <KpiCard title="月次ARR" :value="monthlyArr" :target="arrTarget" />
      <KpiCard title="顧客獲得コスト" :value="cac" :target="cacTarget" />
      <KpiCard title="解約率" :value="churnRate" :target="churnTarget" />
      <KpiCard title="NPS" :value="nps" :target="npsTarget" />
    </div>
    
    <div class="sales-channels">
      <SalesChannelChart :data="salesChannelData" />
      <AgentPerformanceTable :agents="topAgents" />
    </div>
    
    <div class="growth-metrics">
      <GrowthDriversChart :data="growthData" />
      <RevenueProjection :projection="revenueProjection" />
    </div>
  </div>
</template>
```

### 6.2 自動化ワークフロー

#### **顧客ライフサイクル自動化**
```typescript
// server/workflows/customer-lifecycle.ts
export class CustomerLifecycleWorkflow {
  async onCustomerSignup(tenantId: string) {
    // オンボーディングメール送信
    await sendOnboardingEmail(tenantId)
    
    // 30日後にROI測定スケジュール
    await scheduleRoiMeasurement(tenantId, 30)
    
    // 紹介プログラム案内（1週間後）
    await scheduleReferralInvitation(tenantId, 7)
  }
  
  async onContractRenewal(tenantId: string) {
    // ロイヤリティ特典付与
    await grantLoyaltyBenefits(tenantId)
    
    // アップセル提案
    await scheduleUpsellProposal(tenantId)
  }
  
  async onChurnRisk(tenantId: string, riskScore: number) {
    if (riskScore > 0.7) {
      // 緊急介入
      await triggerChurnPreventionIntervention(tenantId)
    } else {
      // 定期フォローアップ
      await scheduleRetentionFollowup(tenantId)
    }
  }
}
```

---

## 🎯 実装スケジュール

| Phase | 期間 | 主要成果物 | 依存関係 |
|-------|------|-----------|---------|
| **Phase 1** | 4-6週間 | マルチテナント基盤 | - |
| **Phase 2** | 4-5週間 | 代理店管理システム | Phase 1 |
| **Phase 3** | 3-4週間 | 顧客紹介システム | Phase 1 |
| **Phase 4** | 5-6週間 | PMS連携システム | Phase 1 |
| **Phase 5** | 4-5週間 | リスクリバーサル機能 | Phase 1, 2 |
| **Phase 6** | 継続 | 統合・最適化 | Phase 1-5 |

### 🚀 クリティカルパス
1. **マルチテナント基盤** → **代理店システム** → **3WAY統合**
2. **料金プラン管理** → **リスクリバーサル** → **ROI測定**
3. **API基盤** → **PMS連携** → **統合ダッシュボード**

---

## 📊 成功指標

### 技術指標
- システム稼働率: 99.9%以上
- API応答時間: 200ms以下
- データ同期遅延: 5分以内

### ビジネス指標
- 代理店登録数: 50社（6ヶ月）
- 紹介経由売上: 25%（1年）
- 顧客満足度: NPS 50以上

**結論**: この実装計画により、技術基盤とビジネス戦略を同時進行で構築し、ハイパーパワーマーケティング戦略の完全実現を目指す。 