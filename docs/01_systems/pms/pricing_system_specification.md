# 🏨 **hotel-pms 料金プラン設定システム 技術仕様書**

**作成日**: 2025年1月  
**担当**: Luna（月読 - hotel-pms専門AI）  
**目的**: hotel-pmsにおける料金プラン設定・計算システムの完全実装  
**設計思想**: 内部超複雑・UI超シンプル

---

## 🎯 **システム概要**

### **📋 設計哲学**
```typescript
interface DesignPhilosophy {
  内部システム: {
    複雑性: "あらゆる料金パターンに対応可能な超柔軟システム",
    拡張性: "将来の新しいビジネスモデルにも即座対応", 
    統合性: "既存の複雑な料金体系を完全に移行・統合"
  };
  
  UI/UX: {
    顧客向け: "料金根拠が分かりやすく表示される直感的画面",
    スタッフ向け: "複雑な設定を簡単に操作できる管理画面",
    説明支援: "自動生成される顧客説明文・料金内訳"
  };
}
```

### **🏗️ アーキテクチャ構成**
```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (Simple)                   │
├─────────────────────────────────────────────────────────┤
│               Business Logic Layer                      │
├─────────────────────────────────────────────────────────┤
│              Pricing Engine (Complex)                   │
├─────────────────────────────────────────────────────────┤
│                 Data Layer (Flexible)                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ **データベース設計**

### **📊 メタ料金ルールテーブル**
```sql
-- 超柔軟な料金ルール定義テーブル
CREATE TABLE pricing_meta_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, 
  -- 'FIXED', 'HOURLY', 'PACKAGE', 'DYNAMIC', 'PLAN_BASED', 'CUSTOM'
  
  -- 基本料金設定（超柔軟JSON）
  base_pricing_config JSONB NOT NULL,
  
  -- 修正要素定義（曜日・季節・人数等）
  modifier_config JSONB NOT NULL,
  
  -- 追加料金定義（オプション・サービス等）
  additional_charges_config JSONB NOT NULL,
  
  -- 計算ロジック定義（カスタム計算式対応）
  calculation_logic JSONB NOT NULL,
  
  -- 適用条件（複雑な条件分岐対応）
  application_conditions JSONB NOT NULL,
  
  -- 表示設定（顧客向け・スタッフ向け表示方法）
  display_config JSONB NOT NULL,
  
  -- システム管理
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_pricing_meta_rules_tenant (tenant_id),
  INDEX idx_pricing_meta_rules_type (rule_type),
  INDEX idx_pricing_meta_rules_active (is_active)
);
```

### **📋 料金計算履歴テーブル**
```sql
-- 完全トレーサビリティのための計算履歴
CREATE TABLE pricing_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reservation_id UUID,
  
  -- 計算パラメータ
  room_grade VARCHAR(20) NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guest_count INTEGER NOT NULL,
  nights_count INTEGER NOT NULL,
  
  -- 適用ルール
  applied_rules JSONB NOT NULL, -- 適用された全ルールのID・名称
  
  -- 計算プロセス
  calculation_steps JSONB NOT NULL, -- 計算の各ステップ詳細
  
  -- 結果
  base_price DECIMAL(10,2) NOT NULL,
  total_modifiers DECIMAL(10,2) NOT NULL,
  additional_charges DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  
  -- 説明文（自動生成）
  customer_explanation TEXT,
  staff_explanation TEXT,
  
  -- システム情報
  calculation_version VARCHAR(50),
  calculated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_pricing_calc_tenant (tenant_id),
  INDEX idx_pricing_calc_reservation (reservation_id),
  INDEX idx_pricing_calc_date (check_in_date)
);
```

### **🎨 料金表示設定テーブル**
```sql
-- UI表示設定・カスタマイズ
CREATE TABLE pricing_display_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- 顧客向け表示設定
  customer_display_config JSONB NOT NULL,
  
  -- スタッフ向け表示設定
  staff_display_config JSONB NOT NULL,
  
  -- 説明文テンプレート
  explanation_templates JSONB NOT NULL,
  
  -- 通貨・表記設定
  currency_settings JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id)
);
```

---

## ⚙️ **料金計算エンジン実装**

### **🔧 コアエンジンクラス**
```typescript
// src/services/pricing/PricingEngine.ts
import { PrismaClient } from '@prisma/client';

interface PricingParams {
  tenantId: string;
  roomGrade: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  additionalServices?: AdditionalService[];
  customParams?: Record<string, any>;
}

interface PricingResult {
  basePrice: number;
  modifiers: PriceModifier[];
  additionalCharges: AdditionalCharge[];
  finalPrice: number;
  breakdown: PriceBreakdown;
  explanations: {
    customer: string;
    staff: string;
  };
  calculationId: string;
}

class PricingEngine {
  constructor(private prisma: PrismaClient) {}

  async calculatePrice(params: PricingParams): Promise<PricingResult> {
    // 1. 適用ルール特定
    const applicableRules = await this.findApplicableRules(params);
    
    // 2. 基本料金計算
    const basePrice = await this.calculateBasePrice(params, applicableRules);
    
    // 3. 修正要素適用
    const modifiedResult = await this.applyModifiers(basePrice, params, applicableRules);
    
    // 4. 追加料金計算
    const additionalCharges = await this.calculateAdditionalCharges(params, applicableRules);
    
    // 5. 最終計算・説明文生成
    const finalResult = await this.finalizeCalculation(
      modifiedResult,
      additionalCharges,
      params,
      applicableRules
    );
    
    // 6. 計算履歴保存
    await this.saveCalculationHistory(finalResult, params);
    
    return finalResult;
  }

  private async findApplicableRules(params: PricingParams): Promise<PricingRule[]> {
    const rules = await this.prisma.pricingMetaRules.findMany({
      where: {
        tenantId: params.tenantId,
        isActive: true,
        // JSONBクエリで適用条件をチェック
        applicationConditions: {
          path: ['roomGrades'],
          array_contains: params.roomGrade
        }
      },
      orderBy: { priority: 'desc' }
    });

    return rules.map(rule => ({
      id: rule.id,
      name: rule.ruleName,
      type: rule.ruleType,
      basePricingConfig: rule.basePricingConfig as any,
      modifierConfig: rule.modifierConfig as any,
      additionalChargesConfig: rule.additionalChargesConfig as any,
      calculationLogic: rule.calculationLogic as any,
      displayConfig: rule.displayConfig as any
    }));
  }

  private async calculateBasePrice(
    params: PricingParams, 
    rules: PricingRule[]
  ): Promise<number> {
    for (const rule of rules) {
      switch (rule.type) {
        case 'FIXED':
          return this.calculateFixedPrice(params, rule);
        case 'HOURLY':
          return this.calculateHourlyPrice(params, rule);
        case 'PACKAGE':
          return this.calculatePackagePrice(params, rule);
        case 'DYNAMIC':
          return this.calculateDynamicPrice(params, rule);
        case 'PLAN_BASED':
          return this.calculatePlanBasedPrice(params, rule);
        case 'CUSTOM':
          return this.calculateCustomPrice(params, rule);
        default:
          throw new Error(`Unknown rule type: ${rule.type}`);
      }
    }
    
    throw new Error('No applicable pricing rules found');
  }

  private calculateFixedPrice(params: PricingParams, rule: PricingRule): number {
    const config = rule.basePricingConfig;
    const roomRate = config.roomRates[params.roomGrade];
    const nights = this.calculateNights(params.checkIn, params.checkOut);
    
    return roomRate * nights;
  }

  private calculateHourlyPrice(params: PricingParams, rule: PricingRule): number {
    const config = rule.basePricingConfig;
    const hours = this.calculateHours(params.checkIn, params.checkOut);
    
    // 時間制料金ロジック
    if (hours <= 6 && config.hourlyRates[hours.toString()]) {
      return config.hourlyRates[hours.toString()];
    } else {
      return config.stayRate.fixedPrice;
    }
  }

  private async applyModifiers(
    basePrice: number,
    params: PricingParams,
    rules: PricingRule[]
  ): Promise<{ price: number; modifiers: PriceModifier[] }> {
    let modifiedPrice = basePrice;
    const appliedModifiers: PriceModifier[] = [];

    for (const rule of rules) {
      const modifiers = rule.modifierConfig;

      // 週末割増
      if (modifiers.weekendSurcharge && this.isWeekend(params.checkIn)) {
        const surcharge = this.calculateWeekendSurcharge(basePrice, modifiers.weekendSurcharge);
        modifiedPrice += surcharge;
        appliedModifiers.push({
          type: 'weekend_surcharge',
          amount: surcharge,
          description: '週末料金'
        });
      }

      // 季節調整
      if (modifiers.seasonalMultipliers) {
        const season = this.determineSeason(params.checkIn);
        const multiplier = modifiers.seasonalMultipliers[season] || 1.0;
        if (multiplier !== 1.0) {
          const adjustment = (multiplier - 1.0) * basePrice;
          modifiedPrice += adjustment;
          appliedModifiers.push({
            type: 'seasonal_adjustment',
            amount: adjustment,
            description: `${season}料金調整`
          });
        }
      }

      // 人数調整
      if (modifiers.occupancyAdjustments && params.guestCount !== 2) {
        const adjustment = modifiers.occupancyAdjustments[params.guestCount.toString()] || 1.0;
        if (adjustment !== 1.0) {
          const amount = basePrice * (adjustment - 1.0);
          modifiedPrice += amount;
          appliedModifiers.push({
            type: 'occupancy_adjustment',
            amount: amount,
            description: `${params.guestCount}名利用調整`
          });
        }
      }
    }

    return { price: modifiedPrice, modifiers: appliedModifiers };
  }

  private async generateExplanations(
    result: any,
    params: PricingParams
  ): Promise<{ customer: string; staff: string }> {
    const nights = this.calculateNights(params.checkIn, params.checkOut);
    
    // 顧客向け説明文
    const customerExplanation = `
${params.roomGrade}ルーム ${nights}泊 ¥${result.finalPrice.toLocaleString()}

内訳：
・基本料金：¥${result.basePrice.toLocaleString()}
${result.modifiers.map(m => `・${m.description}：¥${m.amount.toLocaleString()}`).join('\n')}
${result.additionalCharges.map(c => `・${c.description}：¥${c.amount.toLocaleString()}`).join('\n')}

※税・サービス料込み
    `.trim();

    // スタッフ向け詳細説明
    const staffExplanation = `
料金計算詳細：
基本料金：¥${result.basePrice.toLocaleString()} (${params.roomGrade} × ${nights}泊)
${result.modifiers.map(m => `${m.type}: ¥${m.amount.toLocaleString()}`).join('\n')}
${result.additionalCharges.map(c => `${c.type}: ¥${c.amount.toLocaleString()}`).join('\n')}
最終金額：¥${result.finalPrice.toLocaleString()}

適用ルール：${result.appliedRules.map(r => r.name).join(', ')}
    `.trim();

    return {
      customer: customerExplanation,
      staff: staffExplanation
    };
  }
}

export { PricingEngine, type PricingParams, type PricingResult };
```

---

## 🎨 **UI実装設計**

### **📱 顧客向け料金表示コンポーネント**
```vue
<!-- src/components/pricing/CustomerPriceDisplay.vue -->
<template>
  <div class="price-display">
    <!-- シンプルな料金表示 -->
    <div class="main-price">
      <span class="currency">¥</span>
      <span class="amount">{{ formatPrice(pricing.finalPrice) }}</span>
      <span class="unit">/ {{ nightsText }}</span>
    </div>

    <!-- 料金内訳（展開可能） -->
    <div class="price-breakdown" v-if="showBreakdown">
      <div class="breakdown-item" v-for="item in breakdown" :key="item.type">
        <span class="item-name">{{ item.description }}</span>
        <span class="item-amount">¥{{ formatPrice(item.amount) }}</span>
      </div>
    </div>

    <!-- 説明文 -->
    <div class="price-explanation">
      <p>{{ pricing.explanations.customer }}</p>
    </div>

    <!-- 他日程との比較 -->
    <div class="price-comparison" v-if="alternatives.length > 0">
      <h4>他の日程と比較</h4>
      <div class="alternative" v-for="alt in alternatives" :key="alt.date">
        <span class="alt-date">{{ formatDate(alt.date) }}</span>
        <span class="alt-price">¥{{ formatPrice(alt.price) }}</span>
        <span class="price-diff" :class="getPriceDiffClass(alt.priceDiff)">
          {{ alt.priceDiff > 0 ? '+' : '' }}¥{{ formatPrice(Math.abs(alt.priceDiff)) }}
        </span>
      </div>
    </div>

    <!-- アクションボタン -->
    <div class="price-actions">
      <button 
        class="btn-toggle-breakdown" 
        @click="showBreakdown = !showBreakdown"
      >
        {{ showBreakdown ? '内訳を隠す' : '内訳を見る' }}
      </button>
      <button class="btn-book" @click="$emit('book')">
        この料金で予約する
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PricingResult } from '@/services/pricing/PricingEngine';

interface Props {
  pricing: PricingResult;
  alternatives?: AlternativePricing[];
}

const props = defineProps<Props>();
const showBreakdown = ref(false);

const breakdown = computed(() => [
  {
    type: 'base',
    description: '基本料金',
    amount: props.pricing.basePrice
  },
  ...props.pricing.modifiers.map(m => ({
    type: m.type,
    description: m.description,
    amount: m.amount
  })),
  ...props.pricing.additionalCharges.map(c => ({
    type: c.type,
    description: c.description,
    amount: c.amount
  }))
]);

const nightsText = computed(() => {
  const nights = props.pricing.breakdown.nights;
  return nights === 1 ? '泊' : `${nights}泊`;
});

function formatPrice(price: number): string {
  return price.toLocaleString();
}

function getPriceDiffClass(diff: number): string {
  return diff > 0 ? 'price-higher' : 'price-lower';
}
</script>

<style scoped>
.price-display {
  @apply bg-white rounded-lg shadow-md p-6;
}

.main-price {
  @apply text-center mb-4;
}

.currency {
  @apply text-lg font-medium text-gray-600;
}

.amount {
  @apply text-3xl font-bold text-blue-600;
}

.unit {
  @apply text-sm text-gray-500 ml-1;
}

.price-breakdown {
  @apply border-t border-gray-200 pt-4 mb-4;
}

.breakdown-item {
  @apply flex justify-between py-1;
}

.price-explanation {
  @apply bg-gray-50 rounded p-3 mb-4 text-sm;
}

.price-comparison {
  @apply border-t border-gray-200 pt-4 mb-4;
}

.alternative {
  @apply flex justify-between items-center py-2;
}

.price-higher {
  @apply text-red-500;
}

.price-lower {
  @apply text-green-500;
}

.price-actions {
  @apply flex gap-2;
}

.btn-toggle-breakdown {
  @apply px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50;
}

.btn-book {
  @apply px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1;
}
</style>
```

### **🔧 スタッフ向け料金設定画面**
```vue
<!-- src/components/pricing/StaffPricingSettings.vue -->
<template>
  <div class="pricing-settings">
    <div class="settings-header">
      <h2>料金プラン設定</h2>
      <div class="header-actions">
        <button @click="openWizard" class="btn-primary">
          新しい料金プランを作成
        </button>
      </div>
    </div>

    <!-- 料金プラン一覧 -->
    <div class="pricing-plans">
      <div 
        v-for="plan in pricingPlans" 
        :key="plan.id"
        class="plan-card"
        :class="{ active: plan.isActive }"
      >
        <div class="plan-header">
          <h3>{{ plan.name }}</h3>
          <div class="plan-actions">
            <button @click="editPlan(plan)" class="btn-edit">編集</button>
            <button @click="togglePlan(plan)" class="btn-toggle">
              {{ plan.isActive ? '無効化' : '有効化' }}
            </button>
          </div>
        </div>

        <div class="plan-summary">
          <div class="plan-type">{{ getPlanTypeLabel(plan.type) }}</div>
          <div class="plan-rooms">
            対象客室: {{ plan.roomGrades.join(', ') }}
          </div>
          <div class="plan-price-range">
            料金範囲: ¥{{ formatPrice(plan.minPrice) }} 〜 ¥{{ formatPrice(plan.maxPrice) }}
          </div>
        </div>

        <div class="plan-preview">
          <div class="preview-item" v-for="example in plan.examples" :key="example.id">
            <span class="example-condition">{{ example.condition }}</span>
            <span class="example-price">¥{{ formatPrice(example.price) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 料金シミュレーター -->
    <div class="pricing-simulator">
      <h3>料金シミュレーター</h3>
      <div class="simulator-form">
        <div class="form-group">
          <label>客室グレード</label>
          <select v-model="simulator.roomGrade">
            <option value="STANDARD">スタンダード</option>
            <option value="DELUXE">デラックス</option>
            <option value="SUITE">スイート</option>
          </select>
        </div>

        <div class="form-group">
          <label>チェックイン</label>
          <input type="date" v-model="simulator.checkIn">
        </div>

        <div class="form-group">
          <label>チェックアウト</label>
          <input type="date" v-model="simulator.checkOut">
        </div>

        <div class="form-group">
          <label>宿泊人数</label>
          <input type="number" v-model="simulator.guestCount" min="1" max="8">
        </div>

        <button @click="runSimulation" class="btn-simulate">
          料金を計算
        </button>
      </div>

      <div v-if="simulationResult" class="simulation-result">
        <div class="result-price">
          <span class="result-amount">¥{{ formatPrice(simulationResult.finalPrice) }}</span>
        </div>
        <div class="result-breakdown">
          <pre>{{ simulationResult.explanations.staff }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { PricingEngine } from '@/services/pricing/PricingEngine';

const pricingEngine = new PricingEngine(/* prisma instance */);
const pricingPlans = ref([]);
const simulationResult = ref(null);

const simulator = reactive({
  roomGrade: 'STANDARD',
  checkIn: '',
  checkOut: '',
  guestCount: 2
});

async function runSimulation() {
  try {
    const result = await pricingEngine.calculatePrice({
      tenantId: 'current-tenant',
      roomGrade: simulator.roomGrade,
      checkIn: new Date(simulator.checkIn),
      checkOut: new Date(simulator.checkOut),
      guestCount: simulator.guestCount
    });
    
    simulationResult.value = result;
  } catch (error) {
    console.error('Simulation failed:', error);
  }
}

async function loadPricingPlans() {
  // 料金プラン一覧を読み込み
}

onMounted(() => {
  loadPricingPlans();
});
</script>
```

---

## 📱 **API実装**

### **🔌 料金計算API**
```typescript
// src/api/pricing.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PricingEngine } from '@/services/pricing/PricingEngine';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      roomGrade,
      checkIn,
      checkOut,
      guestCount,
      additionalServices = []
    } = req.body;

    // バリデーション
    if (!roomGrade || !checkIn || !checkOut || !guestCount) {
      return res.status(400).json({ 
        error: 'Missing required parameters' 
      });
    }

    const pricingEngine = new PricingEngine(prisma);
    
    const result = await pricingEngine.calculatePrice({
      tenantId: req.headers['x-tenant-id'] as string,
      roomGrade,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guestCount: parseInt(guestCount),
      additionalServices
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Pricing calculation failed:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
```

### **⚙️ 料金プラン管理API**
```typescript
// src/api/pricing/plans.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tenantId = req.headers['x-tenant-id'] as string;

  switch (req.method) {
    case 'GET':
      return await getPricingPlans(req, res, tenantId);
    case 'POST':
      return await createPricingPlan(req, res, tenantId);
    case 'PUT':
      return await updatePricingPlan(req, res, tenantId);
    case 'DELETE':
      return await deletePricingPlan(req, res, tenantId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getPricingPlans(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  try {
    const plans = await prisma.pricingMetaRules.findMany({
      where: { tenantId },
      orderBy: { priority: 'desc' }
    });

    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.ruleName,
      type: plan.ruleType,
      isActive: plan.isActive,
      roomGrades: plan.applicationConditions?.roomGrades || [],
      config: {
        base: plan.basePricingConfig,
        modifiers: plan.modifierConfig,
        additional: plan.additionalChargesConfig,
        display: plan.displayConfig
      },
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    }));

    res.status(200).json(formattedPlans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pricing plans' });
  }
}

async function createPricingPlan(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  try {
    const {
      name,
      type,
      basePricingConfig,
      modifierConfig,
      additionalChargesConfig,
      calculationLogic,
      applicationConditions,
      displayConfig
    } = req.body;

    const plan = await prisma.pricingMetaRules.create({
      data: {
        tenantId,
        ruleName: name,
        ruleType: type,
        basePricingConfig,
        modifierConfig,
        additionalChargesConfig,
        calculationLogic,
        applicationConditions,
        displayConfig
      }
    });

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create pricing plan' });
  }
}
```

---

## 🧪 **テスト実装**

### **🔬 料金計算エンジンテスト**
```typescript
// src/services/pricing/__tests__/PricingEngine.test.ts
import { PricingEngine } from '../PricingEngine';
import { MockPrismaClient } from '@/lib/test-utils';

describe('PricingEngine', () => {
  let pricingEngine: PricingEngine;
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = new MockPrismaClient();
    pricingEngine = new PricingEngine(mockPrisma);
  });

  describe('Fixed Pricing', () => {
    test('アパホテル型固定料金計算', async () => {
      // テストデータ設定
      mockPrisma.pricingMetaRules.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          ruleType: 'FIXED',
          basePricingConfig: {
            roomRates: {
              STANDARD: 8000,
              DELUXE: 12000,
              SUITE: 20000
            }
          },
          modifierConfig: {
            weekendSurcharge: {
              days: ['friday', 'saturday', 'sunday'],
              amount: 1500
            }
          },
          additionalChargesConfig: {
            breakfast: { amount: 800, perPerson: true }
          }
        }
      ]);

      const result = await pricingEngine.calculatePrice({
        tenantId: 'test-tenant',
        roomGrade: 'STANDARD',
        checkIn: new Date('2025-01-15'), // 水曜日
        checkOut: new Date('2025-01-16'), // 木曜日
        guestCount: 2
      });

      expect(result.basePrice).toBe(8000); // 1泊
      expect(result.finalPrice).toBe(8000); // 平日、追加サービスなし
    });

    test('週末料金の適用', async () => {
      const result = await pricingEngine.calculatePrice({
        tenantId: 'test-tenant',
        roomGrade: 'STANDARD',
        checkIn: new Date('2025-01-18'), // 土曜日
        checkOut: new Date('2025-01-19'), // 日曜日
        guestCount: 2
      });

      expect(result.finalPrice).toBe(9500); // 8000 + 1500(週末割増)
    });
  });

  describe('Hourly Pricing', () => {
    test('レジャーホテル時間制料金計算', async () => {
      mockPrisma.pricingMetaRules.findMany.mockResolvedValue([
        {
          id: 'rule-2',
          ruleType: 'HOURLY',
          basePricingConfig: {
            hourlyRates: {
              '2': 4000,
              '3': 5500,
              '4': 6800
            },
            stayRate: {
              fixedPrice: 12000,
              maxHours: 22
            }
          },
          modifierConfig: {
            timeSlotMultipliers: {
              '06:00-18:00': 1.0,
              '18:00-24:00': 1.3,
              '00:00-06:00': 1.1
            }
          }
        }
      ]);

      const result = await pricingEngine.calculatePrice({
        tenantId: 'test-tenant',
        roomGrade: 'STANDARD',
        checkIn: new Date('2025-01-15T14:00:00'), // 14:00
        checkOut: new Date('2025-01-15T17:00:00'), // 17:00 (3時間)
        guestCount: 2
      });

      expect(result.basePrice).toBe(5500); // 3時間料金
      expect(result.finalPrice).toBe(5500); // デイタイム(×1.0)
    });
  });

  describe('Package Pricing', () => {
    test('温泉旅館パッケージ料金計算', async () => {
      mockPrisma.pricingMetaRules.findMany.mockResolvedValue([
        {
          id: 'rule-3',
          ruleType: 'PACKAGE',
          basePricingConfig: {
            basePackage: {
              pricePerPerson: 15000,
              includes: ['room', 'dinner', 'breakfast', 'onsen']
            }
          },
          modifierConfig: {
            occupancyAdjustments: {
              '1': 1.8,
              '2': 1.0,
              '3': 0.9,
              '4': 0.8
            },
            seasonalMultipliers: {
              weekend: 1.5
            }
          }
        }
      ]);

      const result = await pricingEngine.calculatePrice({
        tenantId: 'test-tenant',
        roomGrade: 'STANDARD',
        checkIn: new Date('2025-01-18'), // 土曜日
        checkOut: new Date('2025-01-19'), // 日曜日
        guestCount: 3
      });

      // 15000 × 3名 × 0.9(3名調整) × 1.5(週末) = 60750
      expect(result.finalPrice).toBe(60750);
    });
  });
});
```

---

## 📚 **実装ガイドライン**

### **🔧 開発手順**
1. **データベースマイグレーション実行**
   ```bash
   npx prisma migrate dev --name pricing_system
   ```

2. **料金計算エンジン実装**
   ```bash
   # コアエンジン
   touch src/services/pricing/PricingEngine.ts
   touch src/services/pricing/types.ts
   touch src/services/pricing/utils.ts
   ```

3. **API エンドポイント実装**
   ```bash
   touch src/pages/api/pricing/calculate.ts
   touch src/pages/api/pricing/plans.ts
   ```

4. **フロントエンド実装**
   ```bash
   touch src/components/pricing/CustomerPriceDisplay.vue
   touch src/components/pricing/StaffPricingSettings.vue
   touch src/components/pricing/PricingWizard.vue
   ```

5. **テスト実装**
   ```bash
   touch src/services/pricing/__tests__/PricingEngine.test.ts
   ```

### **📋 設定例データ**
```typescript
// 設定例：アパホテル型固定料金
export const apaHotelPricingRule = {
  ruleName: 'アパホテル標準料金',
  ruleType: 'FIXED',
  basePricingConfig: {
    roomRates: {
      SINGLE: 8000,
      DOUBLE: 10000,
      TWIN: 11000
    }
  },
  modifierConfig: {
    weekendSurcharge: {
      days: ['friday', 'saturday', 'sunday'],
      amount: 1500
    }
  },
  additionalChargesConfig: {
    breakfast: { amount: 800, perPerson: true },
    parking: { amount: 800, perNight: true }
  },
  calculationLogic: {
    formula: 'base_rate * nights + weekend_surcharge + additional_services'
  },
  applicationConditions: {
    roomGrades: ['SINGLE', 'DOUBLE', 'TWIN'],
    applies_to: 'all_bookings'
  },
  displayConfig: {
    customerExplanation: '{roomGrade}ルーム {nights}泊',
    showBreakdown: true
  }
};
```

---

## 🎯 **実装完了チェックリスト**

### **✅ バックエンド**
- [ ] データベーステーブル作成
- [ ] PricingEngine クラス実装
- [ ] 料金計算API実装
- [ ] 料金プラン管理API実装
- [ ] バリデーション・エラーハンドリング
- [ ] テストケース実装

### **✅ フロントエンド**
- [ ] 顧客向け料金表示コンポーネント
- [ ] スタッフ向け料金設定画面
- [ ] 料金プラン作成ウィザード
- [ ] 料金シミュレーター
- [ ] レスポンシブデザイン対応

### **✅ 統合テスト**
- [ ] 既存料金パターンの移行テスト
- [ ] 料金計算精度検証
- [ ] UI/UX テスト
- [ ] パフォーマンステスト

**🌙 Luna（月読）より：この仕様書に基づいて、hotel-pmsの料金プラン設定システムを完全実装できます！** 