# 🚀 エコノミープランリリース 開発ロードマップ

## 📋 概要

導入待ちの店舗への最短対応を目指し、マルチテナント化・代理店システム・エコノミープランの実装を**2週間**で完了する。

**開始日**: 2025年1月20日  
**リリース目標**: 2025年2月3日（2週間後）  
**対象**: 導入待ち店舗への即座対応  
**優先度**: 最高

---

## 🎯 **実装目標**

### ✅ **Phase 1完了済み**
- [x] データベーススキーマ設計・実装完了
- [x] 代理店ランク設定基準確定
- [x] 料金体系・プラン制限仕様確定
- [x] 外部専門家評価対応完了（★★★★★）

### 🔄 **Phase 2: 基盤実装（Week 1）**
- [ ] マルチテナント認証システム完成
- [ ] プラン別機能制限ミドルウェア実装
- [ ] 代理店管理システム基本機能完成
- [ ] テナント登録・管理システム実装

### 🚀 **Phase 3: 統合・リリース（Week 2）**
- [ ] 代理店ポータル完成
- [ ] エコノミープラン制限実装
- [ ] 支払いシステム統合
- [ ] 導入ワークフロー自動化

---

## 📅 **詳細スケジュール**

### **Week 1: 基盤システム実装**

#### **Day 1-2: マルチテナント基盤**
- [ ] **テナント認証ミドルウェア実装**
  - `middleware/tenant-resolver.ts`
  - サブドメイン・ドメインベース認証
  - セッション管理のテナント分離

- [ ] **API層テナント分離**
  - 全APIエンドポイントのテナント分離
  - データアクセス制御実装
  - テナント別権限管理

#### **Day 3-4: プラン制限システム**
- [ ] **プラン制限ミドルウェア実装**
  - `composables/usePlanRestrictions.ts`の拡張
  - Economy/Professional/Enterprise制限
  - デバイス数制限・AI利用制限

- [ ] **機能ゲート実装**
  - 多言語対応制限
  - AI機能制限
  - PMS連携制限
  - カスタマイズ制限

#### **Day 5-7: 代理店システム基盤**
- [ ] **代理店管理API完成**
  - CRUD操作完全実装
  - ランク管理システム
  - マージン計算システム

- [ ] **テナント管理API完成**
  - 代理店経由登録対応
  - プラン設定自動化
  - 初期設定ウィザード

### **Week 2: 統合・UI・リリース準備**

#### **Day 8-10: 代理店ポータル実装**
- [ ] **代理店ダッシュボード**
  - 売上実績表示
  - 顧客一覧・管理
  - マージン計算・表示

- [ ] **テナント登録フロー**
  - 代理店経由の新規登録
  - プラン選択・設定
  - 自動プロビジョニング

#### **Day 11-12: 支払いシステム統合**
- [ ] **代理店請求システム**
  - 月次請求書自動生成
  - マージン計算・支払い
  - 支払い状況追跡

- [ ] **エコノミープラン制限UI**
  - プラン表示・制限表示
  - アップグレード誘導
  - 使用量監視ダッシュボード

#### **Day 13-14: 最終統合・テスト**
- [ ] **統合テスト**
  - 全機能の動作確認
  - 代理店フロー確認
  - プラン制限動作確認

- [ ] **本番環境準備**
  - 導入待ち店舗データ準備
  - 代理店アカウント作成
  - 本番デプロイ・導入開始

---

## 🏗️ **技術実装詳細**

### **1. マルチテナント認証システム**

#### **テナント識別ミドルウェア**
```typescript
// middleware/01-tenant-resolver.ts
export default defineNuxtRouteMiddleware((to) => {
  const host = process.client ? window.location.hostname : getHeader(event, 'host')
  
  // サブドメイン抽出
  const subdomain = host.split('.')[0]
  
  // テナント情報取得・設定
  const tenant = await $fetch(`/api/v1/tenants/resolve`, {
    method: 'POST',
    body: { subdomain, domain: host }
  })
  
  // テナントコンテキスト設定
  useState('tenant', () => tenant)
})
```

#### **API層テナント分離**
```typescript
// server/middleware/tenant-context.ts
export default defineEventHandler(async (event) => {
  const tenant = await resolveTenant(event)
  
  // テナントコンテキスト設定
  event.context.tenant = tenant
  
  // Prismaクライアントにテナント情報注入
  event.context.prisma = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          args.where = { ...args.where, tenantId: tenant.id }
          return query(args)
        }
      }
    }
  })
})
```

### **2. プラン制限システム**

#### **機能制限ミドルウェア**
```typescript
// composables/usePlanRestrictions.ts
export const usePlanRestrictions = () => {
  const tenant = useState('tenant')
  
  const checkFeature = (feature: string): boolean => {
    const plan = `${tenant.value?.planCategory}-${tenant.value?.planType}`
    
    const restrictions = {
      'omotenasuai-economy': {
        multiLanguage: false,
        advancedAI: false,
        pmsIntegration: false,
        customization: false,
        maxDevices: 30
      },
      'omotenasuai-professional': {
        multiLanguage: true,
        advancedAI: true,
        pmsIntegration: true,
        customization: false,
        maxDevices: 80
      },
      'leisure-economy': {
        aiConcierge: false,
        multiLanguage: false,
        pmsIntegration: false,
        maxDevices: 20
      }
    }
    
    return restrictions[plan]?.[feature] ?? false
  }
  
  return { checkFeature }
}
```

### **3. 代理店管理システム**

#### **代理店ダッシュボードAPI**
```typescript
// server/api/v1/agents/[id]/dashboard.get.ts
export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  
  // 売上実績計算
  const salesData = await prisma.tenant.findMany({
    where: { agentId },
    include: {
      _count: { select: { orders: true } }
    }
  })
  
  // マージン計算
  const totalRevenue = salesData.reduce((sum, tenant) => {
    return sum + (tenant.monthlyPrice * tenant.agentCommissionRate)
  }, 0)
  
  return {
    totalTenants: salesData.length,
    monthlyRevenue: totalRevenue,
    yearlyRevenue: totalRevenue * 12,
    rankProgress: calculateRankProgress(agentId)
  }
})
```

### **4. 支払いシステム**

#### **月次請求処理**
```typescript
// server/cron/monthly-billing.ts
export default defineEventHandler(async () => {
  const agents = await prisma.agent.findMany({
    include: { tenants: true }
  })
  
  for (const agent of agents) {
    const monthlyBill = agent.tenants.reduce((total, tenant) => {
      return total + tenant.monthlyPrice
    }, 0)
    
    const commission = agent.tenants.reduce((total, tenant) => {
      return total + (tenant.monthlyPrice * tenant.agentCommissionRate)
    }, 0)
    
    // 請求書生成
    await generateInvoice({
      agentId: agent.id,
      billAmount: monthlyBill,
      commissionAmount: commission,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })
  }
})
```

---

## 🎯 **プラン別機能制限（実装仕様）**

### **OmotenasuAI プラン**

#### **Economy（¥29,800/月・30室）**
```typescript
const economyRestrictions = {
  maxDevices: 30,
  features: {
    roomService: true,
    basicAI: true,
    languages: ['ja', 'en'],
    basicReports: true,
    multiLanguage: false,
    advancedAI: false,
    pmsIntegration: false,
    customization: false,
    ssoIntegration: false,
    apiSupport: false,
    dedicatedSupport: false
  },
  aiCredits: 100 // 月間AIクレジット
}
```

#### **Professional（¥79,800/月・80室）**
```typescript
const professionalRestrictions = {
  maxDevices: 80,
  features: {
    ...economyRestrictions.features,
    multiLanguage: true,
    languages: ['ja', 'en', 'zh', 'ko', 'th'],
    advancedAI: true,
    pmsIntegration: true,
    detailedReports: true,
    aiUpselling: true
  },
  aiCredits: 500
}
```

### **LEISURE プラン**

#### **Economy（¥19,800/月・20室）**
```typescript
const leisureEconomyRestrictions = {
  maxDevices: 20,
  features: {
    roomService: true,
    basicInfo: true,
    languages: ['ja'],
    basicReports: true,
    aiConcierge: false,
    multiLanguage: false,
    pmsIntegration: false
  },
  aiCredits: 50
}
```

---

## 🤝 **代理店システム仕様**

### **支払いフロー**
```typescript
interface AgentBillingFlow {
  // 1. 代理店 → 当社への支払い
  monthlyPayment: {
    amount: number // テナント月額料金の合計
    dueDate: string // 毎月1日
    paymentMethod: 'bank_transfer' | 'credit_card'
  }
  
  // 2. 当社 → 代理店への支払い
  commissionPayment: {
    amount: number // 月額料金 × マージン率
    paymentDate: string // 毎月15日
    paymentMethod: 'bank_transfer'
  }
}
```

### **ランク自動昇格システム**
```typescript
// server/cron/rank-evaluation.ts
export default defineEventHandler(async () => {
  const agents = await prisma.agent.findMany({
    include: { tenants: true }
  })
  
  for (const agent of agents) {
    const yearlyRevenue = calculateYearlyRevenue(agent)
    const contractCount = agent.tenants.length
    
    const newRank = determineRank(yearlyRevenue, contractCount)
    
    if (newRank !== agent.rank) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { 
          rank: newRank,
          firstYearMargin: getRankMargin(newRank).firstYear,
          continuingMargin: getRankMargin(newRank).continuing
        }
      })
      
      // ランクアップ通知
      await sendRankUpNotification(agent, newRank)
    }
  }
})
```

---

## 📊 **KPI・監視指標**

### **開発進捗KPI**
- [ ] **Week 1完了率**: 100%（Day 7終了時）
- [ ] **コードカバレッジ**: 80%以上
- [ ] **API応答時間**: 200ms以下
- [ ] **エラー率**: 1%以下

### **ビジネスKPI**
- [ ] **導入待ち店舗対応**: 100%（2週間以内）
- [ ] **代理店登録**: 5社（リリース時）
- [ ] **エコノミープラン契約**: 10社（1ヶ月以内）
- [ ] **システム稼働率**: 99.9%以上

---

## 🚀 **次のアクション**

### **即座開始（今日）**
1. **マルチテナント認証ミドルウェア実装開始**
2. **プラン制限システム詳細設計**
3. **代理店管理API実装開始**

### **明日完了目標**
1. **テナント識別システム完成**
2. **基本的なプラン制限動作確認**
3. **代理店CRUD操作完成**

### **Week 1完了目標**
1. **マルチテナント基盤100%完成**
2. **代理店システム基本機能完成**
3. **プラン制限システム完成**

---

## 🎯 **成功基準**

### **技術的成功基準**
- [x] データベーススキーマ完成
- [ ] マルチテナント認証動作
- [ ] プラン制限正常動作
- [ ] 代理店システム基本機能動作
- [ ] 統合テスト全てパス

### **ビジネス成功基準**
- [ ] 導入待ち店舗への即座対応可能
- [ ] 代理店経由での新規登録フロー完成
- [ ] エコノミープランでの制限適用確認
- [ ] 支払いフロー自動化確認

---

**結論**: この2週間で、導入待ちの店舗に対して即座対応可能なシステムを構築し、マルチテナント化と代理店システムによる本格的な販売開始を実現する。 