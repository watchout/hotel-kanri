# MVPエコノミープラン 最短実装ガイド

**作成日**: 2025年1月13日  
**目標**: エコノミープラン最短実装（1週間）  
**優先度**: 🔴 最高優先度

---

## 🎯 **MVP実装方針**

### **シンプル実装戦略**
```typescript
// 複雑なプラン管理システムは後回し
// 最短でエコノミープランを提供

interface MVPStrategy {
  approach: 'Fixed Economy Plan'; // 固定エコノミープラン
  complexity: 'Minimal'; // 最小限の複雑さ
  timeframe: '1 Week'; // 1週間で実装
  scalability: 'Later Enhancement'; // 後から拡張
}
```

---

## 📋 **最短実装タスク（7日間）**

### **Day 1-2: 基本設定**

#### **環境変数による機能制限**
```bash
# .env
PLAN_TYPE=economy
MAX_DEVICES=30
ADDITIONAL_DEVICE_COST=1200
MONTHLY_PRICE=29800

# 機能フラグ
ENABLE_AI_CONCIERGE=false
ENABLE_MULTILINGUAL=false
ENABLE_LAYOUT_EDITOR=false
ENABLE_FACILITY_GUIDE=false
ENABLE_AI_BUSINESS_SUPPORT=false
```

#### **機能制限ミドルウェア**
```typescript
// middleware/economy-plan.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const config = useRuntimeConfig();
  
  // AIコンシェルジュ制限
  if (to.path.includes('/concierge') && !config.public.enableAiConcierge) {
    throw createError({
      statusCode: 403,
      statusMessage: 'AIコンシェルジュ機能はプロフェッショナルプラン以上で利用可能です'
    });
  }
  
  // レイアウト編集制限
  if (to.path.includes('/layouts') && !config.public.enableLayoutEditor) {
    throw createError({
      statusCode: 403,
      statusMessage: 'レイアウト編集機能はプロフェッショナルプラン以上で利用可能です'
    });
  }
  
  // 館内施設案内制限
  if (to.path.includes('/info') && !config.public.enableFacilityGuide) {
    throw createError({
      statusCode: 403,
      statusMessage: '館内施設案内機能はプロフェッショナルプラン以上で利用可能です'
    });
  }
});
```

### **Day 3-4: 管理画面実装**

#### **プラン表示コンポーネント**
```vue
<!-- components/admin/PlanStatus.vue -->
<template>
  <div class="plan-status-card">
    <div class="plan-header">
      <h2>現在のプラン</h2>
      <span class="plan-badge economy">エコノミー</span>
    </div>
    
    <div class="plan-details">
      <div class="price">
        <span class="amount">¥29,800</span>
        <span class="period">/月</span>
      </div>
      
      <div class="device-usage">
        <div class="usage-info">
          <span>端末使用数</span>
          <span class="usage-count">{{ deviceCount }}/30</span>
        </div>
        <div class="progress-bar">
          <div 
            class="progress" 
            :style="{ width: `${(deviceCount / 30) * 100}%` }"
          />
        </div>
      </div>
    </div>
    
    <div class="features-list">
      <div class="feature enabled">
        <Icon name="heroicons:check" class="w-4 h-4 text-green-500" />
        <span>ルームサービス</span>
      </div>
      <div class="feature enabled">
        <Icon name="heroicons:check" class="w-4 h-4 text-green-500" />
        <span>キャンペーン機能</span>
      </div>
      <div class="feature disabled">
        <Icon name="heroicons:x-mark" class="w-4 h-4 text-red-500" />
        <span>AIコンシェルジュ</span>
      </div>
      <div class="feature disabled">
        <Icon name="heroicons:x-mark" class="w-4 h-4 text-red-500" />
        <span>多言語対応</span>
      </div>
      <div class="feature disabled">
        <Icon name="heroicons:x-mark" class="w-4 h-4 text-red-500" />
        <span>レイアウト編集</span>
      </div>
    </div>
    
    <div class="upgrade-section">
      <p class="upgrade-text">
        より多くの機能をご利用いただくには、プランのアップグレードをご検討ください。
      </p>
      <button class="upgrade-btn" @click="showUpgradeInfo">
        プランアップグレード情報
      </button>
    </div>
  </div>
</template>

<script setup>
const deviceCount = await $fetch('/api/v1/admin/devices/count');

const showUpgradeInfo = () => {
  // 将来のアップグレード情報表示
  alert('プランアップグレード機能は近日公開予定です。\n詳細はサポートまでお問い合わせください。');
};
</script>

<style scoped>
.plan-status-card {
  @apply bg-white rounded-lg shadow-md p-6 mb-6;
}

.plan-header {
  @apply flex justify-between items-center mb-4;
}

.plan-badge.economy {
  @apply bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium;
}

.price {
  @apply text-2xl font-bold mb-4;
}

.amount {
  @apply text-gray-900;
}

.period {
  @apply text-gray-500 text-lg;
}

.device-usage {
  @apply mb-4;
}

.usage-info {
  @apply flex justify-between items-center mb-2;
}

.usage-count {
  @apply font-semibold;
}

.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-2;
}

.progress {
  @apply bg-blue-500 h-2 rounded-full transition-all duration-300;
}

.features-list {
  @apply space-y-2 mb-6;
}

.feature {
  @apply flex items-center space-x-2;
}

.feature.enabled span {
  @apply text-gray-900;
}

.feature.disabled span {
  @apply text-gray-500;
}

.upgrade-section {
  @apply pt-4 border-t border-gray-200;
}

.upgrade-text {
  @apply text-gray-600 mb-3;
}

.upgrade-btn {
  @apply bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200;
}
</style>
```

### **Day 5-6: API実装**

#### **端末数制限API**
```typescript
// server/api/v1/admin/devices/count.get.ts
export default defineEventHandler(async (event) => {
  const count = await prisma.deviceRoom.count({
    where: {
      isDeleted: false,
      isActive: true
    }
  });
  
  return count;
});
```

```typescript
// server/api/v1/admin/devices/check-limit.get.ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const maxDevices = parseInt(config.maxDevices || '30');
  
  const currentCount = await prisma.deviceRoom.count({
    where: {
      isDeleted: false,
      isActive: true
    }
  });
  
  return {
    currentCount,
    maxDevices,
    canAddMore: currentCount < maxDevices,
    remaining: maxDevices - currentCount
  };
});
```

#### **デバイス追加時の制限チェック**
```typescript
// server/api/v1/admin/devices/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // 端末数制限チェック
  const limitCheck = await $fetch('/api/v1/admin/devices/check-limit');
  
  if (!limitCheck.canAddMore) {
    throw createError({
      statusCode: 403,
      statusMessage: `端末数の上限（${limitCheck.maxDevices}台）に達しています。追加するには、プランのアップグレードが必要です。`
    });
  }
  
  // 既存のデバイス作成処理
  const device = await prisma.deviceRoom.create({
    data: {
      ...body,
      isActive: true
    }
  });
  
  return device;
});
```

### **Day 7: 統合とテスト**

#### **管理画面にプラン表示を追加**
```vue
<!-- pages/admin/index.vue -->
<template>
  <div class="admin-dashboard">
    <!-- プラン状況表示 -->
    <PlanStatus />
    
    <!-- 既存のダッシュボード内容 -->
    <div class="dashboard-content">
      <!-- 既存のコンテンツ -->
    </div>
  </div>
</template>

<script setup>
// 既存のコード
</script>
```

#### **機能制限バナー**
```vue
<!-- components/admin/FeatureRestrictionBanner.vue -->
<template>
  <div v-if="showBanner" class="restriction-banner">
    <div class="banner-content">
      <Icon name="heroicons:information-circle" class="w-5 h-5 text-blue-500" />
      <span>{{ message }}</span>
      <button @click="showUpgradeInfo" class="upgrade-link">
        詳細を見る
      </button>
    </div>
    <button @click="dismissBanner" class="dismiss-btn">
      <Icon name="heroicons:x-mark" class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  feature: String,
  message: String
});

const showBanner = ref(true);

const dismissBanner = () => {
  showBanner.value = false;
};

const showUpgradeInfo = () => {
  // アップグレード情報表示
  alert('プランアップグレードで、この機能をご利用いただけます。\n詳細はサポートまでお問い合わせください。');
};
</script>

<style scoped>
.restriction-banner {
  @apply bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between;
}

.banner-content {
  @apply flex items-center space-x-3;
}

.upgrade-link {
  @apply text-blue-600 hover:text-blue-800 underline;
}

.dismiss-btn {
  @apply text-gray-400 hover:text-gray-600;
}
</style>
```

---

## 🚀 **実装の流れ**

### **1. 環境設定**
```bash
# 環境変数設定
echo "PLAN_TYPE=economy" >> .env
echo "MAX_DEVICES=30" >> .env
echo "ENABLE_AI_CONCIERGE=false" >> .env
echo "ENABLE_MULTILINGUAL=false" >> .env
echo "ENABLE_LAYOUT_EDITOR=false" >> .env
echo "ENABLE_FACILITY_GUIDE=false" >> .env
```

### **2. 機能制限の実装**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      planType: process.env.PLAN_TYPE || 'economy',
      maxDevices: process.env.MAX_DEVICES || '30',
      enableAiConcierge: process.env.ENABLE_AI_CONCIERGE === 'true',
      enableMultilingual: process.env.ENABLE_MULTILINGUAL === 'true',
      enableLayoutEditor: process.env.ENABLE_LAYOUT_EDITOR === 'true',
      enableFacilityGuide: process.env.ENABLE_FACILITY_GUIDE === 'true'
    }
  }
});
```

### **3. 制限対象ページの修正**
```vue
<!-- pages/admin/concierge/index.vue -->
<template>
  <div>
    <FeatureRestrictionBanner 
      v-if="!$config.public.enableAiConcierge"
      feature="aiConcierge"
      message="AIコンシェルジュ機能はプロフェッショナルプラン以上で利用可能です"
    />
    
    <div v-if="$config.public.enableAiConcierge">
      <!-- 既存のAIコンシェルジュ管理画面 -->
    </div>
    
    <div v-else class="feature-disabled">
      <div class="disabled-content">
        <Icon name="heroicons:lock-closed" class="w-16 h-16 text-gray-400 mb-4" />
        <h2 class="text-xl font-semibold text-gray-700 mb-2">AIコンシェルジュ機能</h2>
        <p class="text-gray-500 mb-4">
          この機能はプロフェッショナルプラン以上で利用可能です
        </p>
        <button @click="showUpgradeInfo" class="upgrade-btn">
          プランアップグレード
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const { $config } = useNuxtApp();

const showUpgradeInfo = () => {
  alert('プランアップグレードについては、サポートまでお問い合わせください。');
};
</script>

<style scoped>
.feature-disabled {
  @apply flex items-center justify-center min-h-96;
}

.disabled-content {
  @apply text-center;
}

.upgrade-btn {
  @apply bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors;
}
</style>
```

---

## 📋 **実装チェックリスト**

### **必須実装項目**
- [ ] 環境変数による機能制限設定
- [ ] プラン表示コンポーネント
- [ ] 端末数制限チェック
- [ ] 機能制限ミドルウェア
- [ ] 制限対象ページの修正
- [ ] 制限バナー表示

### **制限対象機能**
- [ ] AIコンシェルジュ機能
- [ ] 多言語対応機能
- [ ] レイアウト編集機能
- [ ] 館内施設案内機能
- [ ] AI業務サポート機能

### **動作確認**
- [ ] エコノミープラン表示
- [ ] 端末数制限（30台）
- [ ] 機能制限エラー表示
- [ ] アップグレード案内表示

---

## 🎯 **リリース準備**

### **本番環境設定**
```bash
# 本番環境用.env
PLAN_TYPE=economy
MAX_DEVICES=30
MONTHLY_PRICE=29800
ADDITIONAL_DEVICE_COST=1200

# 機能制限
ENABLE_AI_CONCIERGE=false
ENABLE_MULTILINGUAL=false
ENABLE_LAYOUT_EDITOR=false
ENABLE_FACILITY_GUIDE=false
ENABLE_AI_BUSINESS_SUPPORT=false
```

### **顧客向け説明資料**
```markdown
# エコノミープラン機能一覧

## ✅ 利用可能な機能
- ルームサービス注文システム
- キッチン・配膳管理
- フロント業務連携
- 基本統計・分析
- キャンペーン機能

## ❌ 制限されている機能
- AIコンシェルジュ（プロフェッショナルプラン以上）
- 多言語対応（オプション +¥3,000/月）
- レイアウト編集（プロフェッショナルプラン以上）
- 館内施設案内（プロフェッショナルプラン以上）
- AI業務サポート（プロフェッショナルプラン以上）

## 📱 端末制限
- 最大30台まで
- 追加端末: ¥1,200/台
```

---

**この実装により、1週間でエコノミープランの基本機能を提供し、将来的なプランアップグレードへの導線を確保できます。** 