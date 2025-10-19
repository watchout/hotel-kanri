# サブスクリプションプラン実装仕様書

**作成日**: 2025年1月13日  
**対象**: OmotenasuAI 料金プラン機能実装  
**目標**: MVPエコノミープラン最短実装

---

## 🎯 **実装概要**

### **対象プラン**
```typescript
interface PlanStructure {
  // OmotenasuAI（一般ホテル向け）
  omotenasuAI: {
    economy: {
      price: 29800;
      maxDevices: 30;
      additionalDeviceCost: 1200;
    };
    professional: {
      price: 79800;
      maxDevices: 80;
      additionalDeviceCost: 1000;
      aiCredits: 300000;
    };
    enterprise: {
      price: 139800;
      maxDevices: 200;
      additionalDeviceCost: 800;
      aiCredits: 700000;
    };
    ultimate: {
      price: 'custom';
      maxDevices: 'unlimited';
      additionalDeviceCost: 700;
      aiCredits: 1500000;
    };
  };
  
  // LEISURE（レジャーホテル特化）
  leisure: {
    economy: {
      price: 19800;
      maxDevices: 20;
      additionalDeviceCost: 1000;
    };
    professional: {
      price: 49800;
      maxDevices: 50;
      additionalDeviceCost: 900;
      aiCredits: 300000;
    };
    enterprise: {
      price: 99800;
      maxDevices: 100;
      additionalDeviceCost: 800;
      aiCredits: 700000;
    };
  };
}
```

### **機能対応表**
```typescript
interface FeatureMatrix {
  // 基本機能
  roomService: {
    economy: { enabled: true, recommendation: false };
    professional: { enabled: true, recommendation: true };
    enterprise: { enabled: true, recommendation: true };
    ultimate: { enabled: true, recommendation: true };
  };
  
  // AI機能
  aiConcierge: {
    economy: { enabled: false };
    professional: { enabled: true };
    enterprise: { enabled: true };
    ultimate: { enabled: true };
  };
  
  // 多言語対応
  multilingual: {
    economy: { 
      enabled: false, 
      upgradeOption: { price: 3000, languages: ['ja', 'en', 'zh'] }
    };
    professional: { 
      enabled: true, 
      languages: ['ja', 'en', 'ko', 'zh-CN', 'th'] 
    };
    enterprise: { 
      enabled: true, 
      languages: ['ja', 'en', 'ko', 'zh-CN', 'th', 'vi', 'id', 'ms', 'tl', 'es', 'fr', 'de', 'it', 'pt', 'ru'] 
    };
  };
  
  // レイアウト編集
  layoutEditor: {
    economy: { enabled: false };
    professional: { enabled: true };
    enterprise: { enabled: true };
    ultimate: { enabled: true };
  };
  
  // 館内施設案内
  facilityGuide: {
    economy: { enabled: false };
    professional: { enabled: true };
    enterprise: { enabled: true };
    ultimate: { enabled: true };
  };
  
  // AI業務サポート
  aiBusinessSupport: {
    economy: { enabled: false };
    professional: { enabled: true };
    enterprise: { enabled: true };
    ultimate: { enabled: true };
  };
}
```

---

## 🗃️ **データベース設計**

### **新規テーブル**

#### **SubscriptionPlan（サブスクリプションプラン）**
```prisma
model SubscriptionPlan {
  id                Int      @id @default(autoincrement())
  name              String   @unique // 'economy', 'professional', 'enterprise', 'ultimate'
  displayName       String   // 'エコノミー', 'プロフェッショナル'
  category          String   // 'omotenasuai', 'leisure'
  monthlyPrice      Int      // 月額料金（円）
  maxDevices        Int      // 最大端末数
  additionalDeviceCost Int   // 追加端末費用
  aiCredits         Int?     // AIクレジット数
  features          Json     // 機能有効化設定
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // リレーション
  subscriptions     Subscription[]
  
  @@index([category, name])
  @@index([isActive])
}
```

#### **Subscription（サブスクリプション）**
```prisma
model Subscription {
  id              Int      @id @default(autoincrement())
  planId          Int      // プランID
  companyName     String   // 契約会社名
  contactEmail    String   // 連絡先メール
  contactPhone    String?  // 連絡先電話
  startDate       DateTime // 契約開始日
  endDate         DateTime? // 契約終了日（null=継続中）
  status          String   @default('active') // 'active', 'suspended', 'cancelled'
  
  // 使用状況
  currentDevices  Int      @default(0) // 現在の端末数
  monthlyUsage    Json?    // 月間使用量データ
  
  // 請求情報
  lastBillingDate DateTime?
  nextBillingDate DateTime?
  
  // 特別設定
  customFeatures  Json?    // カスタム機能設定
  notes           String?  // 備考
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // リレーション
  plan            SubscriptionPlan @relation(fields: [planId], references: [id])
  devices         DeviceSubscription[]
  usageLogs       SubscriptionUsageLog[]
  
  @@index([status])
  @@index([startDate, endDate])
  @@index([planId])
}
```

#### **DeviceSubscription（デバイス-サブスクリプション関連）**
```prisma
model DeviceSubscription {
  id             Int      @id @default(autoincrement())
  subscriptionId Int      // サブスクリプションID
  deviceId       Int      // デバイスID
  placeId        Int      // 設置場所ID
  registeredAt   DateTime @default(now())
  lastActiveAt   DateTime?
  isActive       Boolean  @default(true)
  
  // リレーション
  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
  device         DeviceRoom   @relation(fields: [deviceId], references: [id])
  place          Place        @relation(fields: [placeId], references: [id])
  
  @@unique([subscriptionId, deviceId])
  @@index([subscriptionId])
  @@index([deviceId])
  @@index([placeId])
}
```

#### **SubscriptionUsageLog（使用量ログ）**
```prisma
model SubscriptionUsageLog {
  id             Int      @id @default(autoincrement())
  subscriptionId Int      // サブスクリプションID
  month          String   // 対象月 (YYYY-MM)
  deviceCount    Int      // 端末数
  orderCount     Int      // 注文数
  aiUsage        Int      @default(0) // AI使用量
  additionalCosts Json?   // 追加費用詳細
  createdAt      DateTime @default(now())
  
  // リレーション
  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
  
  @@unique([subscriptionId, month])
  @@index([subscriptionId])
  @@index([month])
}
```

---

## 🔧 **実装タスク**

### **Phase 1: データベース基盤（Week 1）**

#### **Task 1.1: Prismaスキーマ更新**
```bash
# マイグレーション作成
npx prisma migrate dev --name add_subscription_system
```

#### **Task 1.2: 初期データ投入**
```typescript
// scripts/seed-subscription-plans.ts
const planData = [
  // OmotenasuAI プラン
  {
    name: 'economy',
    displayName: 'エコノミー',
    category: 'omotenasuai',
    monthlyPrice: 29800,
    maxDevices: 30,
    additionalDeviceCost: 1200,
    features: {
      roomService: { enabled: true, recommendation: false },
      aiConcierge: { enabled: false },
      multilingual: { enabled: false, upgradeOption: { price: 3000 } },
      layoutEditor: { enabled: false },
      facilityGuide: { enabled: false },
      aiBusinessSupport: { enabled: false },
      campaign: { enabled: true }
    }
  },
  {
    name: 'professional',
    displayName: 'プロフェッショナル',
    category: 'omotenasuai',
    monthlyPrice: 79800,
    maxDevices: 80,
    additionalDeviceCost: 1000,
    aiCredits: 300000,
    features: {
      roomService: { enabled: true, recommendation: true },
      aiConcierge: { enabled: true },
      multilingual: { enabled: true, languages: ['ja', 'en', 'ko', 'zh-CN', 'th'] },
      layoutEditor: { enabled: true },
      facilityGuide: { enabled: true },
      aiBusinessSupport: { enabled: true },
      campaign: { enabled: true }
    }
  },
  // LEISURE プラン
  {
    name: 'economy',
    displayName: 'エコノミー',
    category: 'leisure',
    monthlyPrice: 19800,
    maxDevices: 20,
    additionalDeviceCost: 1000,
    features: {
      roomService: { enabled: true, recommendation: false },
      aiConcierge: { enabled: false },
      multilingual: { enabled: false, upgradeOption: { price: 3000 } },
      layoutEditor: { enabled: false },
      facilityGuide: { enabled: false },
      aiBusinessSupport: { enabled: false },
      campaign: { enabled: true }
    }
  }
];
```

### **Phase 2: 機能制限ミドルウェア（Week 2）**

#### **Task 2.1: プラン検証ミドルウェア**
```typescript
// middleware/plan-restrictions.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // プラン制限チェック
  const subscription = useSubscription();
  const planFeatures = subscription.value?.plan?.features;
  
  // AIコンシェルジュ制限
  if (to.path.includes('/concierge') && !planFeatures?.aiConcierge?.enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: 'AIコンシェルジュ機能はプロフェッショナルプラン以上で利用可能です'
    });
  }
  
  // レイアウト編集制限
  if (to.path.includes('/layouts') && !planFeatures?.layoutEditor?.enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: 'レイアウト編集機能はプロフェッショナルプラン以上で利用可能です'
    });
  }
  
  // 館内施設案内制限
  if (to.path.includes('/info') && !planFeatures?.facilityGuide?.enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: '館内施設案内機能はプロフェッショナルプラン以上で利用可能です'
    });
  }
});
```

#### **Task 2.2: API制限ミドルウェア**
```typescript
// server/middleware/subscription-check.ts
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  
  // 管理画面API制限
  if (url.pathname.startsWith('/api/v1/admin/')) {
    const subscription = await getCurrentSubscription(event);
    
    if (!subscription) {
      throw createError({
        statusCode: 403,
        statusMessage: 'サブスクリプションが必要です'
      });
    }
    
    // 端末数制限チェック
    if (url.pathname.includes('/devices') && event.node.req.method === 'POST') {
      const currentDevices = await getDeviceCount(subscription.id);
      if (currentDevices >= subscription.plan.maxDevices) {
        throw createError({
          statusCode: 403,
          statusMessage: `端末数の上限（${subscription.plan.maxDevices}台）に達しています`
        });
      }
    }
    
    // AI機能制限
    if (url.pathname.includes('/concierge') && !subscription.plan.features.aiConcierge?.enabled) {
      throw createError({
        statusCode: 403,
        statusMessage: 'AIコンシェルジュ機能は利用できません'
      });
    }
  }
});
```

### **Phase 3: 管理画面実装（Week 3）**

#### **Task 3.1: サブスクリプション管理画面**
```vue
<!-- pages/admin/subscription/index.vue -->
<template>
  <div class="subscription-management">
    <div class="header">
      <h1 class="text-2xl font-bold">サブスクリプション管理</h1>
      <div class="plan-info">
        <div class="current-plan">
          <h2>現在のプラン</h2>
          <div class="plan-card">
            <h3>{{ subscription.plan.displayName }}</h3>
            <p class="price">¥{{ subscription.plan.monthlyPrice.toLocaleString() }}/月</p>
            <div class="usage">
              <p>端末使用数: {{ subscription.currentDevices }}/{{ subscription.plan.maxDevices }}</p>
              <div class="progress-bar">
                <div 
                  class="progress" 
                  :style="{ width: `${(subscription.currentDevices / subscription.plan.maxDevices) * 100}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="features-grid">
      <div class="feature-card" v-for="feature in featureList" :key="feature.key">
        <div class="feature-header">
          <Icon :name="feature.icon" class="w-6 h-6" />
          <h3>{{ feature.name }}</h3>
          <div class="status">
            <span 
              v-if="isFeatureEnabled(feature.key)"
              class="badge enabled"
            >
              利用可能
            </span>
            <span 
              v-else
              class="badge disabled"
            >
              利用不可
            </span>
          </div>
        </div>
        <p class="feature-description">{{ feature.description }}</p>
        <div v-if="!isFeatureEnabled(feature.key)" class="upgrade-info">
          <p>この機能を利用するには、プランのアップグレードが必要です。</p>
          <button class="upgrade-btn" @click="showUpgradeModal = true">
            アップグレード
          </button>
        </div>
      </div>
    </div>
    
    <!-- プランアップグレードモーダル -->
    <UpgradeModal 
      v-if="showUpgradeModal"
      :current-plan="subscription.plan"
      @close="showUpgradeModal = false"
      @upgrade="handleUpgrade"
    />
  </div>
</template>

<script setup>
const subscription = await $fetch('/api/v1/admin/subscription/current');
const showUpgradeModal = ref(false);

const featureList = [
  {
    key: 'aiConcierge',
    name: 'AIコンシェルジュ',
    icon: 'heroicons:chat-bubble-left-right',
    description: '24時間対応のAI接客サービス'
  },
  {
    key: 'multilingual',
    name: '多言語対応',
    icon: 'heroicons:language',
    description: '15言語での自動翻訳機能'
  },
  {
    key: 'layoutEditor',
    name: 'レイアウト編集',
    icon: 'heroicons:paint-brush',
    description: '客室画面のカスタマイズ機能'
  },
  {
    key: 'facilityGuide',
    name: '館内施設案内',
    icon: 'heroicons:building-office',
    description: '館内施設・観光案内機能'
  }
];

const isFeatureEnabled = (featureKey) => {
  return subscription.plan.features[featureKey]?.enabled || false;
};

const handleUpgrade = async (newPlan) => {
  // アップグレード処理
  await $fetch('/api/v1/admin/subscription/upgrade', {
    method: 'POST',
    body: { planId: newPlan.id }
  });
  
  // ページリロード
  await refreshCookie('subscription');
  window.location.reload();
};
</script>
```

#### **Task 3.2: プランアップグレードモーダル**
```vue
<!-- components/admin/UpgradeModal.vue -->
<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>プランアップグレード</h2>
        <button @click="$emit('close')" class="close-btn">
          <Icon name="heroicons:x-mark" class="w-6 h-6" />
        </button>
      </div>
      
      <div class="plans-comparison">
        <div class="current-plan">
          <h3>現在のプラン</h3>
          <div class="plan-card current">
            <h4>{{ currentPlan.displayName }}</h4>
            <p class="price">¥{{ currentPlan.monthlyPrice.toLocaleString() }}/月</p>
          </div>
        </div>
        
        <div class="upgrade-options">
          <h3>アップグレードオプション</h3>
          <div class="plan-card" v-for="plan in upgradePlans" :key="plan.id">
            <h4>{{ plan.displayName }}</h4>
            <p class="price">¥{{ plan.monthlyPrice.toLocaleString() }}/月</p>
            <div class="features">
              <div v-for="feature in getNewFeatures(plan)" :key="feature">
                <Icon name="heroicons:check" class="w-4 h-4 text-green-500" />
                <span>{{ feature }}</span>
              </div>
            </div>
            <button 
              @click="selectPlan(plan)"
              class="select-btn"
              :class="{ selected: selectedPlan?.id === plan.id }"
            >
              {{ selectedPlan?.id === plan.id ? '選択中' : '選択' }}
            </button>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-btn">
          キャンセル
        </button>
        <button 
          @click="confirmUpgrade"
          :disabled="!selectedPlan"
          class="confirm-btn"
        >
          アップグレード実行
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps(['currentPlan']);
const emit = defineEmits(['close', 'upgrade']);

const selectedPlan = ref(null);
const upgradePlans = await $fetch('/api/v1/admin/subscription/upgrade-options');

const selectPlan = (plan) => {
  selectedPlan.value = plan;
};

const getNewFeatures = (plan) => {
  // 新機能の差分を計算
  const newFeatures = [];
  
  if (plan.features.aiConcierge?.enabled && !props.currentPlan.features.aiConcierge?.enabled) {
    newFeatures.push('AIコンシェルジュ');
  }
  
  if (plan.features.multilingual?.enabled && !props.currentPlan.features.multilingual?.enabled) {
    newFeatures.push('多言語対応');
  }
  
  if (plan.features.layoutEditor?.enabled && !props.currentPlan.features.layoutEditor?.enabled) {
    newFeatures.push('レイアウト編集');
  }
  
  if (plan.features.facilityGuide?.enabled && !props.currentPlan.features.facilityGuide?.enabled) {
    newFeatures.push('館内施設案内');
  }
  
  return newFeatures;
};

const confirmUpgrade = () => {
  if (selectedPlan.value) {
    emit('upgrade', selectedPlan.value);
  }
};
</script>
```

### **Phase 4: API実装（Week 4）**

#### **Task 4.1: サブスクリプション管理API**
```typescript
// server/api/v1/admin/subscription/current.get.ts
export default defineEventHandler(async (event) => {
  const subscription = await getCurrentSubscription(event);
  
  if (!subscription) {
    throw createError({
      statusCode: 404,
      statusMessage: 'サブスクリプションが見つかりません'
    });
  }
  
  return {
    id: subscription.id,
    plan: subscription.plan,
    currentDevices: subscription.currentDevices,
    status: subscription.status,
    startDate: subscription.startDate,
    nextBillingDate: subscription.nextBillingDate
  };
});
```

```typescript
// server/api/v1/admin/subscription/upgrade.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { planId } = body;
  
  const subscription = await getCurrentSubscription(event);
  const newPlan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId }
  });
  
  if (!newPlan) {
    throw createError({
      statusCode: 404,
      statusMessage: 'プランが見つかりません'
    });
  }
  
  // プランアップグレード実行
  const updatedSubscription = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      planId: newPlan.id,
      updatedAt: new Date()
    },
    include: {
      plan: true
    }
  });
  
  return {
    success: true,
    subscription: updatedSubscription
  };
});
```

#### **Task 4.2: 機能制限チェック関数**
```typescript
// server/utils/subscription.ts
export async function getCurrentSubscription(event: H3Event) {
  // 実装: 現在のサブスクリプションを取得
  // 一時的に固定値を返す（MVP用）
  return await prisma.subscription.findFirst({
    where: { status: 'active' },
    include: { plan: true }
  });
}

export async function checkFeatureAccess(event: H3Event, featureName: string) {
  const subscription = await getCurrentSubscription(event);
  
  if (!subscription) {
    return false;
  }
  
  const features = subscription.plan.features as any;
  return features[featureName]?.enabled || false;
}

export async function checkDeviceLimit(event: H3Event) {
  const subscription = await getCurrentSubscription(event);
  
  if (!subscription) {
    return false;
  }
  
  return subscription.currentDevices < subscription.plan.maxDevices;
}
```

### **Phase 5: フロントエンド機能制限（Week 5）**

#### **Task 5.1: 機能制限コンポーネント**
```vue
<!-- components/admin/FeatureGate.vue -->
<template>
  <div>
    <slot v-if="hasAccess" />
    <div v-else class="feature-locked">
      <div class="lock-icon">
        <Icon name="heroicons:lock-closed" class="w-8 h-8 text-gray-400" />
      </div>
      <h3>{{ feature }}機能</h3>
      <p>この機能は{{ requiredPlan }}プラン以上で利用可能です。</p>
      <button @click="showUpgradeModal = true" class="upgrade-btn">
        プランをアップグレード
      </button>
    </div>
    
    <UpgradeModal 
      v-if="showUpgradeModal"
      :current-plan="subscription.plan"
      @close="showUpgradeModal = false"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  feature: String,
  requiredPlan: String
});

const { $subscription } = useNuxtApp();
const subscription = await $subscription.getCurrent();
const showUpgradeModal = ref(false);

const hasAccess = computed(() => {
  const features = subscription.plan.features;
  return features[props.feature]?.enabled || false;
});
</script>
```

#### **Task 5.2: 使用例**
```vue
<!-- pages/admin/concierge/index.vue -->
<template>
  <div>
    <FeatureGate feature="aiConcierge" required-plan="プロフェッショナル">
      <!-- AIコンシェルジュ管理画面 -->
      <div class="concierge-management">
        <h1>AIコンシェルジュ管理</h1>
        <!-- 既存のコンテンツ -->
      </div>
    </FeatureGate>
  </div>
</template>
```

---

## 🚀 **MVP最短実装プラン**

### **最優先実装（1週間）**
1. **エコノミープラン固定実装**
   - データベースにエコノミープランを固定で作成
   - 機能制限は環境変数で管理
   - 管理画面でプラン表示のみ

2. **基本機能制限**
   - AIコンシェルジュ機能の無効化
   - 多言語機能の無効化
   - レイアウト編集機能の無効化

3. **端末数制限**
   - 30台までの制限実装
   - 超過時のエラー表示

### **段階的拡張（2-4週間）**
1. **プラン管理機能**
   - 複数プランの管理
   - プランアップグレード機能

2. **詳細機能制限**
   - 機能別の細かい制限
   - 使用量監視

3. **請求管理**
   - 使用量計算
   - 請求書生成

---

## 📋 **実装チェックリスト**

### **Week 1: 基盤構築**
- [ ] Prismaスキーマ更新
- [ ] 初期データ投入
- [ ] 基本API実装
- [ ] 機能制限ミドルウェア

### **Week 2: 管理画面**
- [ ] サブスクリプション管理画面
- [ ] プラン表示機能
- [ ] 機能制限表示

### **Week 3: プランアップグレード**
- [ ] アップグレードモーダル
- [ ] プラン比較機能
- [ ] アップグレード処理

### **Week 4: 最適化**
- [ ] パフォーマンス改善
- [ ] エラーハンドリング
- [ ] テスト実装

### **Week 5: 本番準備**
- [ ] 本番環境設定
- [ ] 監視設定
- [ ] ドキュメント更新

---

## 🎯 **成功指標**

### **技術指標**
- [ ] 全機能制限が正常に動作
- [ ] 端末数制限が正確に機能
- [ ] プランアップグレードが正常に完了
- [ ] パフォーマンス影響なし

### **ビジネス指標**
- [ ] エコノミープランでの基本機能提供
- [ ] プロフェッショナルプランへのアップグレード促進
- [ ] 収益向上への貢献

---

**このドキュメントに基づいて、MVPエコノミープランを最短で実装し、段階的に機能を拡張していきます。** 