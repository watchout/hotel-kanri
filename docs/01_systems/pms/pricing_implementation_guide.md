# 🚀 **hotel-pms 料金システム実装ガイド**

**作成日**: 2025年1月  
**担当**: Luna（月読 - hotel-pms専門AI）  
**目的**: 料金プラン設定システムの段階的実装手順

---

## 📋 **実装フェーズ**

### **Phase 1: 基盤構築（2週間）**
- [x] データベース設計・マイグレーション
- [x] 基本料金計算エンジン
- [x] 固定料金制サポート
- [x] 基本API実装

### **Phase 2: UI構築（2週間）**
- [ ] 顧客向け料金表示
- [ ] スタッフ向け設定画面
- [ ] 料金シミュレーター
- [ ] レスポンシブ対応

### **Phase 3: 高度機能（3週間）**
- [ ] 時間制料金サポート
- [ ] パッケージ料金サポート
- [ ] 動的料金調整
- [ ] 業態特化機能

### **Phase 4: 統合・テスト（1週間）**
- [ ] 既存システム統合
- [ ] 包括的テスト
- [ ] パフォーマンス最適化
- [ ] 本番環境デプロイ

---

## 🗄️ **Phase 1: データベース実装**

### **1. Prismaスキーマ更新**
```prisma
// prisma/schema.prisma
model PricingMetaRule {
  id                        String   @id @default(cuid())
  tenantId                  String   @map("tenant_id")
  ruleName                  String   @map("rule_name")
  ruleType                  String   @map("rule_type")
  
  // JSON fields for flexibility
  basePricingConfig         Json     @map("base_pricing_config")
  modifierConfig            Json     @map("modifier_config")
  additionalChargesConfig   Json     @map("additional_charges_config")
  calculationLogic          Json     @map("calculation_logic")
  applicationConditions     Json     @map("application_conditions")
  displayConfig             Json     @map("display_config")
  
  priority                  Int      @default(100)
  isActive                  Boolean  @default(true) @map("is_active")
  createdAt                 DateTime @default(now()) @map("created_at")
  updatedAt                 DateTime @updatedAt @map("updated_at")

  @@map("pricing_meta_rules")
  @@index([tenantId])
  @@index([ruleType])
  @@index([isActive])
}

model PricingCalculation {
  id                String   @id @default(cuid())
  tenantId          String   @map("tenant_id")
  reservationId     String?  @map("reservation_id")
  
  // Calculation parameters
  roomGrade         String   @map("room_grade")
  checkInDate       DateTime @map("check_in_date")
  checkOutDate      DateTime @map("check_out_date")
  guestCount        Int      @map("guest_count")
  nightsCount       Int      @map("nights_count")
  
  // Applied rules and calculation process
  appliedRules      Json     @map("applied_rules")
  calculationSteps  Json     @map("calculation_steps")
  
  // Results
  basePrice         Decimal  @map("base_price") @db.Decimal(10,2)
  totalModifiers    Decimal  @map("total_modifiers") @db.Decimal(10,2)
  additionalCharges Decimal  @map("additional_charges") @db.Decimal(10,2)
  finalPrice        Decimal  @map("final_price") @db.Decimal(10,2)
  
  // Explanations
  customerExplanation String? @map("customer_explanation") @db.Text
  staffExplanation    String? @map("staff_explanation") @db.Text
  
  calculationVersion String? @map("calculation_version")
  calculatedAt      DateTime @default(now()) @map("calculated_at")

  @@map("pricing_calculations")
  @@index([tenantId])
  @@index([reservationId])
  @@index([checkInDate])
}

model PricingDisplaySetting {
  id                     String   @id @default(cuid())
  tenantId               String   @unique @map("tenant_id")
  
  customerDisplayConfig  Json     @map("customer_display_config")
  staffDisplayConfig     Json     @map("staff_display_config")
  explanationTemplates   Json     @map("explanation_templates")
  currencySettings       Json     @map("currency_settings")
  
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("pricing_display_settings")
}
```

### **2. マイグレーション実行**
```bash
# マイグレーション作成
npx prisma migrate dev --name add_pricing_system

# Prisma Client再生成
npx prisma generate
```

### **3. シードデータ作成**
```typescript
// prisma/seed-pricing.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPricingData() {
  // アパホテル型固定料金
  await prisma.pricingMetaRule.create({
    data: {
      tenantId: 'demo-tenant',
      ruleName: 'アパホテル標準料金',
      ruleType: 'FIXED',
      basePricingConfig: {
        roomRates: {
          SINGLE: 8000,
          DOUBLE: 10000,
          TWIN: 11000,
          SUITE: 20000
        },
        currency: 'JPY',
        perNight: true
      },
      modifierConfig: {
        weekendSurcharge: {
          days: ['friday', 'saturday', 'sunday'],
          amount: 1500,
          type: 'fixed_addition'
        }
      },
      additionalChargesConfig: {
        breakfast: { amount: 800, perPerson: true },
        parking: { amount: 800, perNight: true },
        lateCheckout: { amount: 1000, perHour: true }
      },
      calculationLogic: {
        formula: 'base_rate * nights + weekend_surcharge + additional_services',
        rounding: 'none'
      },
      applicationConditions: {
        roomGrades: ['SINGLE', 'DOUBLE', 'TWIN', 'SUITE'],
        appliesTo: 'all_bookings'
      },
      displayConfig: {
        customerTemplate: '{roomGrade}ルーム {nights}泊 ¥{finalPrice}',
        showBreakdown: true,
        showComparison: true
      }
    }
  });

  // レジャーホテル時間制料金
  await prisma.pricingMetaRule.create({
    data: {
      tenantId: 'demo-tenant',
      ruleName: 'レジャーホテル時間制',
      ruleType: 'HOURLY',
      basePricingConfig: {
        hourlyRates: {
          '2': 4000,
          '3': 5500,
          '4': 6800,
          '5': 8000,
          '6': 9000
        },
        stayRate: {
          type: 'overnight',
          maxHours: 22,
          fixedPrice: 12000
        },
        extensionRate: {
          per30min: 800,
          gracePeriod: 10
        }
      },
      modifierConfig: {
        timeSlotMultipliers: {
          '06:00-18:00': 1.0,
          '18:00-24:00': 1.3,
          '00:00-06:00': 1.1
        }
      },
      additionalChargesConfig: {},
      calculationLogic: {
        formula: 'IF(hours <= 6) THEN hourly_rates[hours] * time_multiplier ELSE stay_rate',
        extensionFormula: 'CEILING((actual_minutes - booked_minutes - grace_period) / 30) * extension_rate'
      },
      applicationConditions: {
        roomGrades: ['STANDARD', 'DELUXE'],
        bookingType: 'hourly_or_stay'
      },
      displayConfig: {
        customerTemplate: '{hours}時間利用 ¥{finalPrice}',
        showTimeSlotInfo: true
      }
    }
  });

  console.log('Pricing seed data created successfully');
}

seedPricingData()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

---

## ⚙️ **Phase 2: 料金計算エンジン実装**

### **1. 基本型定義**
```typescript
// src/types/pricing.ts
export interface PricingParams {
  tenantId: string;
  roomGrade: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  additionalServices?: AdditionalService[];
  customParams?: Record<string, any>;
}

export interface PricingResult {
  calculationId: string;
  basePrice: number;
  modifiers: PriceModifier[];
  additionalCharges: AdditionalCharge[];
  finalPrice: number;
  breakdown: PriceBreakdown;
  explanations: {
    customer: string;
    staff: string;
  };
  appliedRules: AppliedRule[];
}

export interface PriceModifier {
  type: string;
  name: string;
  description: string;
  amount: number;
  calculation: string;
}

export interface AdditionalCharge {
  serviceCode: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface PriceBreakdown {
  nights: number;
  hours?: number;
  guestCount: number;
  roomGrade: string;
  checkIn: Date;
  checkOut: Date;
}

export interface AppliedRule {
  id: string;
  name: string;
  type: string;
  priority: number;
}
```

### **2. 料金計算エンジンコア実装**
```typescript
// src/services/pricing/PricingEngine.ts
import { PrismaClient } from '@prisma/client';
import type { PricingParams, PricingResult, PriceModifier } from '@/types/pricing';

export class PricingEngine {
  constructor(private prisma: PrismaClient) {}

  async calculatePrice(params: PricingParams): Promise<PricingResult> {
    // 1. 適用ルール検索
    const applicableRules = await this.findApplicableRules(params);
    
    if (applicableRules.length === 0) {
      throw new Error('No applicable pricing rules found');
    }

    // 2. 基本料金計算
    const basePrice = await this.calculateBasePrice(params, applicableRules);
    
    // 3. 修正要素適用
    const modifiedResult = await this.applyModifiers(basePrice, params, applicableRules);
    
    // 4. 追加料金計算
    const additionalCharges = await this.calculateAdditionalCharges(params, applicableRules);
    
    // 5. 最終計算
    const finalPrice = modifiedResult.price + additionalCharges.reduce((sum, charge) => sum + charge.totalAmount, 0);
    
    // 6. 説明文生成
    const explanations = await this.generateExplanations({
      basePrice,
      modifiers: modifiedResult.modifiers,
      additionalCharges,
      finalPrice,
      appliedRules: applicableRules
    }, params);

    // 7. 計算履歴保存
    const calculationId = await this.saveCalculationHistory({
      params,
      basePrice,
      modifiers: modifiedResult.modifiers,
      additionalCharges,
      finalPrice,
      appliedRules: applicableRules,
      explanations
    });

    return {
      calculationId,
      basePrice,
      modifiers: modifiedResult.modifiers,
      additionalCharges,
      finalPrice,
      breakdown: {
        nights: this.calculateNights(params.checkIn, params.checkOut),
        hours: this.calculateHours(params.checkIn, params.checkOut),
        guestCount: params.guestCount,
        roomGrade: params.roomGrade,
        checkIn: params.checkIn,
        checkOut: params.checkOut
      },
      explanations,
      appliedRules: applicableRules.map(rule => ({
        id: rule.id,
        name: rule.ruleName,
        type: rule.ruleType,
        priority: rule.priority
      }))
    };
  }

  private async findApplicableRules(params: PricingParams) {
    const rules = await this.prisma.pricingMetaRule.findMany({
      where: {
        tenantId: params.tenantId,
        isActive: true
      },
      orderBy: { priority: 'desc' }
    });

    return rules.filter(rule => {
      const conditions = rule.applicationConditions as any;
      
      // 客室グレード条件チェック
      if (conditions.roomGrades && !conditions.roomGrades.includes(params.roomGrade)) {
        return false;
      }

      // その他の条件チェック（必要に応じて追加）
      return true;
    });
  }

  private async calculateBasePrice(params: PricingParams, rules: any[]) {
    const primaryRule = rules[0]; // 最高優先度のルール

    switch (primaryRule.ruleType) {
      case 'FIXED':
        return this.calculateFixedPrice(params, primaryRule);
      case 'HOURLY':
        return this.calculateHourlyPrice(params, primaryRule);
      case 'PACKAGE':
        return this.calculatePackagePrice(params, primaryRule);
      default:
        throw new Error(`Unsupported rule type: ${primaryRule.ruleType}`);
    }
  }

  private calculateFixedPrice(params: PricingParams, rule: any): number {
    const config = rule.basePricingConfig;
    const roomRate = config.roomRates[params.roomGrade];
    const nights = this.calculateNights(params.checkIn, params.checkOut);
    
    if (!roomRate) {
      throw new Error(`No rate found for room grade: ${params.roomGrade}`);
    }

    return roomRate * nights;
  }

  private calculateHourlyPrice(params: PricingParams, rule: any): number {
    const config = rule.basePricingConfig;
    const hours = this.calculateHours(params.checkIn, params.checkOut);
    
    // 時間制料金ロジック
    if (hours <= 6 && config.hourlyRates[hours.toString()]) {
      return config.hourlyRates[hours.toString()];
    } else if (config.stayRate) {
      return config.stayRate.fixedPrice;
    } else {
      throw new Error('No applicable hourly or stay rate found');
    }
  }

  private calculatePackagePrice(params: PricingParams, rule: any): number {
    const config = rule.basePricingConfig;
    const basePackage = config.basePackage;
    
    if (!basePackage) {
      throw new Error('Package configuration not found');
    }

    return basePackage.pricePerPerson * params.guestCount;
  }

  private async applyModifiers(basePrice: number, params: PricingParams, rules: any[]) {
    let modifiedPrice = basePrice;
    const appliedModifiers: PriceModifier[] = [];

    for (const rule of rules) {
      const modifiers = rule.modifierConfig;

      // 週末割増
      if (modifiers.weekendSurcharge && this.isWeekend(params.checkIn)) {
        const surcharge = modifiers.weekendSurcharge.amount;
        modifiedPrice += surcharge;
        appliedModifiers.push({
          type: 'weekend_surcharge',
          name: '週末料金',
          description: '週末宿泊による割増料金',
          amount: surcharge,
          calculation: `+¥${surcharge}`
        });
      }

      // 季節調整
      if (modifiers.seasonalMultipliers) {
        const season = this.determineSeason(params.checkIn);
        const multiplier = modifiers.seasonalMultipliers[season];
        
        if (multiplier && multiplier !== 1.0) {
          const adjustment = basePrice * (multiplier - 1.0);
          modifiedPrice += adjustment;
          appliedModifiers.push({
            type: 'seasonal_adjustment',
            name: `${season}料金調整`,
            description: `${season}期間による料金調整`,
            amount: adjustment,
            calculation: `×${multiplier}`
          });
        }
      }

      // 人数調整
      if (modifiers.occupancyAdjustments && params.guestCount !== 2) {
        const adjustment = modifiers.occupancyAdjustments[params.guestCount.toString()];
        
        if (adjustment && adjustment !== 1.0) {
          const amount = basePrice * (adjustment - 1.0);
          modifiedPrice += amount;
          appliedModifiers.push({
            type: 'occupancy_adjustment',
            name: `${params.guestCount}名利用調整`,
            description: `${params.guestCount}名利用による料金調整`,
            amount: amount,
            calculation: `×${adjustment}`
          });
        }
      }
    }

    return { price: modifiedPrice, modifiers: appliedModifiers };
  }

  private async calculateAdditionalCharges(params: PricingParams, rules: any[]) {
    const charges = [];

    if (!params.additionalServices || params.additionalServices.length === 0) {
      return charges;
    }

    for (const rule of rules) {
      const additionalConfig = rule.additionalChargesConfig;

      for (const service of params.additionalServices) {
        const serviceConfig = additionalConfig[service.serviceCode];
        
        if (serviceConfig) {
          const unitPrice = serviceConfig.amount;
          const quantity = serviceConfig.perPerson ? params.guestCount : 1;
          const totalAmount = unitPrice * quantity;

          charges.push({
            serviceCode: service.serviceCode,
            name: service.name || service.serviceCode,
            description: serviceConfig.description || `${service.serviceCode}の追加料金`,
            quantity,
            unitPrice,
            totalAmount
          });
        }
      }
    }

    return charges;
  }

  private async generateExplanations(result: any, params: PricingParams) {
    const nights = this.calculateNights(params.checkIn, params.checkOut);
    
    // 顧客向け説明文
    const customerParts = [
      `${params.roomGrade}ルーム ${nights}泊`,
      `¥${result.finalPrice.toLocaleString()}`,
      '',
      '内訳：',
      `・基本料金：¥${result.basePrice.toLocaleString()}`
    ];

    result.modifiers.forEach(modifier => {
      customerParts.push(`・${modifier.name}：¥${modifier.amount.toLocaleString()}`);
    });

    result.additionalCharges.forEach(charge => {
      customerParts.push(`・${charge.name}：¥${charge.totalAmount.toLocaleString()}`);
    });

    customerParts.push('', '※税・サービス料込み');

    // スタッフ向け詳細説明
    const staffParts = [
      '料金計算詳細：',
      `基本料金：¥${result.basePrice.toLocaleString()} (${params.roomGrade} × ${nights}泊)`,
      ''
    ];

    result.modifiers.forEach(modifier => {
      staffParts.push(`${modifier.type}: ¥${modifier.amount.toLocaleString()} (${modifier.calculation})`);
    });

    result.additionalCharges.forEach(charge => {
      staffParts.push(`${charge.serviceCode}: ¥${charge.totalAmount.toLocaleString()} (${charge.quantity} × ¥${charge.unitPrice})`);
    });

    staffParts.push('', `最終金額：¥${result.finalPrice.toLocaleString()}`);
    staffParts.push(`適用ルール：${result.appliedRules.map(r => r.name).join(', ')}`);

    return {
      customer: customerParts.join('\n'),
      staff: staffParts.join('\n')
    };
  }

  private async saveCalculationHistory(data: any): Promise<string> {
    const calculation = await this.prisma.pricingCalculation.create({
      data: {
        tenantId: data.params.tenantId,
        roomGrade: data.params.roomGrade,
        checkInDate: data.params.checkIn,
        checkOutDate: data.params.checkOut,
        guestCount: data.params.guestCount,
        nightsCount: this.calculateNights(data.params.checkIn, data.params.checkOut),
        appliedRules: data.appliedRules.map(r => ({ id: r.id, name: r.name, type: r.type })),
        calculationSteps: {
          basePrice: data.basePrice,
          modifiers: data.modifiers,
          additionalCharges: data.additionalCharges
        },
        basePrice: data.basePrice,
        totalModifiers: data.modifiers.reduce((sum, m) => sum + m.amount, 0),
        additionalCharges: data.additionalCharges.reduce((sum, c) => sum + c.totalAmount, 0),
        finalPrice: data.finalPrice,
        customerExplanation: data.explanations.customer,
        staffExplanation: data.explanations.staff,
        calculationVersion: '1.0'
      }
    });

    return calculation.id;
  }

  // ユーティリティメソッド
  private calculateNights(checkIn: Date, checkOut: Date): number {
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  private calculateHours(checkIn: Date, checkOut: Date): number {
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60));
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 5 || day === 6; // 日曜日、金曜日、土曜日
  }

  private determineSeason(date: Date): string {
    const month = date.getMonth() + 1;
    
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }
}
```

### **3. 料金計算API実装**
```typescript
// src/pages/api/pricing/calculate.ts
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
        error: 'Missing required parameters',
        required: ['roomGrade', 'checkIn', 'checkOut', 'guestCount']
      });
    }

    // 日付バリデーション
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ 
        error: 'Check-out date must be after check-in date' 
      });
    }

    // テナントID取得（実際の認証システムに応じて修正）
    const tenantId = req.headers['x-tenant-id'] as string || 'demo-tenant';

    const pricingEngine = new PricingEngine(prisma);
    
    const result = await pricingEngine.calculatePrice({
      tenantId,
      roomGrade,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guestCount: parseInt(guestCount),
      additionalServices
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Pricing calculation failed:', error);
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}
```

---

## 🎨 **Phase 3: フロントエンド実装**

### **1. 顧客向け料金表示コンポーネント**
```vue
<!-- src/components/pricing/PriceDisplay.vue -->
<template>
  <div class="price-display-container">
    <!-- メイン料金表示 -->
    <div class="main-price-card">
      <div class="price-header">
        <h3>{{ roomGradeLabel }}</h3>
        <div class="date-range">
          {{ formatDateRange(checkIn, checkOut) }}
        </div>
      </div>

      <div class="price-amount">
        <span class="currency">¥</span>
        <span class="amount">{{ formatPrice(pricing.finalPrice) }}</span>
        <span class="unit">/ {{ nightsText }}</span>
      </div>

      <!-- 内訳表示（折りたたみ可能） -->
      <div class="price-breakdown" v-if="showBreakdown">
        <div class="breakdown-header">
          <h4>料金内訳</h4>
          <button @click="toggleBreakdown" class="toggle-btn">
            {{ showBreakdownDetails ? '閉じる' : '詳細を見る' }}
          </button>
        </div>

        <div v-if="showBreakdownDetails" class="breakdown-details">
          <div class="breakdown-item base-price">
            <span class="item-label">基本料金</span>
            <span class="item-amount">¥{{ formatPrice(pricing.basePrice) }}</span>
          </div>

          <div 
            v-for="modifier in pricing.modifiers" 
            :key="modifier.type"
            class="breakdown-item modifier"
          >
            <span class="item-label">{{ modifier.name }}</span>
            <span class="item-amount" :class="{ positive: modifier.amount > 0, negative: modifier.amount < 0 }">
              {{ modifier.amount > 0 ? '+' : '' }}¥{{ formatPrice(Math.abs(modifier.amount)) }}
            </span>
          </div>

          <div 
            v-for="charge in pricing.additionalCharges" 
            :key="charge.serviceCode"
            class="breakdown-item additional"
          >
            <span class="item-label">{{ charge.name }}</span>
            <span class="item-amount">+¥{{ formatPrice(charge.totalAmount) }}</span>
          </div>

          <div class="breakdown-total">
            <span class="total-label">合計</span>
            <span class="total-amount">¥{{ formatPrice(pricing.finalPrice) }}</span>
          </div>
        </div>
      </div>

      <!-- 説明文 -->
      <div class="price-explanation">
        <div class="explanation-content">
          {{ pricing.explanations.customer }}
        </div>
      </div>

      <!-- アクションボタン -->
      <div class="price-actions">
        <button 
          v-if="!showBreakdown"
          @click="showBreakdown = true" 
          class="btn-secondary btn-show-breakdown"
        >
          料金詳細を見る
        </button>
        <button @click="$emit('book', pricing)" class="btn-primary btn-book">
          この料金で予約する
        </button>
      </div>
    </div>

    <!-- 比較表示 -->
    <div v-if="alternatives && alternatives.length > 0" class="price-alternatives">
      <h4>他の日程と比較</h4>
      <div class="alternatives-list">
        <div 
          v-for="alt in alternatives" 
          :key="alt.id"
          class="alternative-item"
          @click="$emit('select-alternative', alt)"
        >
          <div class="alt-date">{{ formatDate(alt.checkIn) }}</div>
          <div class="alt-price">¥{{ formatPrice(alt.price) }}</div>
          <div class="alt-diff" :class="getDiffClass(alt.priceDiff)">
            {{ formatPriceDiff(alt.priceDiff) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PricingResult } from '@/types/pricing';

interface Props {
  pricing: PricingResult;
  roomGradeLabel: string;
  checkIn: Date;
  checkOut: Date;
  alternatives?: AlternativePricing[];
}

interface AlternativePricing {
  id: string;
  checkIn: Date;
  checkOut: Date;
  price: number;
  priceDiff: number;
}

const props = defineProps<Props>();
const showBreakdown = ref(false);
const showBreakdownDetails = ref(false);

const nightsText = computed(() => {
  const nights = props.pricing.breakdown.nights;
  return nights === 1 ? '泊' : `${nights}泊`;
});

function toggleBreakdown() {
  showBreakdownDetails.value = !showBreakdownDetails.value;
}

function formatPrice(price: number): string {
  return price.toLocaleString();
}

function formatDateRange(checkIn: Date, checkOut: Date): string {
  const checkInStr = checkIn.toLocaleDateString('ja-JP', { 
    month: 'short', 
    day: 'numeric' 
  });
  const checkOutStr = checkOut.toLocaleDateString('ja-JP', { 
    month: 'short', 
    day: 'numeric' 
  });
  return `${checkInStr} 〜 ${checkOutStr}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', { 
    month: 'short', 
    day: 'numeric',
    weekday: 'short'
  });
}

function getDiffClass(diff: number): string {
  if (diff > 0) return 'price-higher';
  if (diff < 0) return 'price-lower';
  return 'price-same';
}

function formatPriceDiff(diff: number): string {
  if (diff === 0) return '同額';
  const sign = diff > 0 ? '+' : '';
  return `${sign}¥${Math.abs(diff).toLocaleString()}`;
}

defineEmits(['book', 'select-alternative']);
</script>

<style scoped>
.price-display-container {
  @apply space-y-6;
}

.main-price-card {
  @apply bg-white rounded-lg shadow-lg p-6 border border-gray-200;
}

.price-header {
  @apply mb-4;
}

.price-header h3 {
  @apply text-xl font-semibold text-gray-800;
}

.date-range {
  @apply text-sm text-gray-600 mt-1;
}

.price-amount {
  @apply text-center mb-6 py-4 bg-blue-50 rounded-lg;
}

.currency {
  @apply text-lg font-medium text-gray-600;
}

.amount {
  @apply text-4xl font-bold text-blue-600 mx-1;
}

.unit {
  @apply text-base text-gray-500;
}

.price-breakdown {
  @apply border-t border-gray-200 pt-4 mb-4;
}

.breakdown-header {
  @apply flex justify-between items-center mb-3;
}

.breakdown-header h4 {
  @apply text-lg font-medium;
}

.toggle-btn {
  @apply text-sm text-blue-600 hover:text-blue-800;
}

.breakdown-details {
  @apply space-y-2;
}

.breakdown-item {
  @apply flex justify-between py-1;
}

.item-label {
  @apply text-gray-700;
}

.item-amount.positive {
  @apply text-red-600;
}

.item-amount.negative {
  @apply text-green-600;
}

.breakdown-total {
  @apply flex justify-between py-2 border-t border-gray-200 font-semibold;
}

.price-explanation {
  @apply bg-gray-50 rounded-lg p-4 mb-4;
}

.explanation-content {
  @apply text-sm text-gray-700 whitespace-pre-line;
}

.price-actions {
  @apply flex gap-3;
}

.btn-show-breakdown {
  @apply flex-shrink-0;
}

.btn-book {
  @apply flex-1;
}

.btn-primary {
  @apply px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.btn-secondary {
  @apply px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors;
}

.price-alternatives {
  @apply bg-white rounded-lg shadow p-4;
}

.price-alternatives h4 {
  @apply text-lg font-medium mb-3;
}

.alternatives-list {
  @apply space-y-2;
}

.alternative-item {
  @apply flex justify-between items-center p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer;
}

.alt-price {
  @apply font-medium;
}

.alt-diff.price-higher {
  @apply text-red-600;
}

.alt-diff.price-lower {
  @apply text-green-600;
}

.alt-diff.price-same {
  @apply text-gray-500;
}
</style>
```

### **2. 料金計算フック**
```typescript
// src/composables/usePricing.ts
import { ref, computed } from 'vue';
import type { PricingParams, PricingResult } from '@/types/pricing';

export function usePricing() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pricing = ref<PricingResult | null>(null);

  const calculatePrice = async (params: PricingParams) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'demo-tenant' // 実際の認証に応じて修正
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to calculate price');
      }

      const result = await response.json();
      pricing.value = result.data;
      
      return result.data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const hasPrice = computed(() => pricing.value !== null);
  
  const priceBreakdown = computed(() => {
    if (!pricing.value) return null;
    
    return {
      base: pricing.value.basePrice,
      modifiers: pricing.value.modifiers.reduce((sum, m) => sum + m.amount, 0),
      additional: pricing.value.additionalCharges.reduce((sum, c) => sum + c.totalAmount, 0),
      total: pricing.value.finalPrice
    };
  });

  return {
    loading,
    error,
    pricing,
    hasPrice,
    priceBreakdown,
    calculatePrice
  };
}
```

---

## 🧪 **Phase 4: テスト実装**

### **1. ユニットテスト**
```typescript
// src/services/pricing/__tests__/PricingEngine.test.ts
import { PricingEngine } from '../PricingEngine';
import { mockPrisma } from '@/lib/test-utils';

describe('PricingEngine', () => {
  let pricingEngine: PricingEngine;

  beforeEach(() => {
    pricingEngine = new PricingEngine(mockPrisma);
  });

  describe('Fixed Pricing', () => {
    beforeEach(() => {
      mockPrisma.pricingMetaRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          tenantId: 'test-tenant',
          ruleName: 'テスト固定料金',
          ruleType: 'FIXED',
          basePricingConfig: {
            roomRates: {
              STANDARD: 10000,
              DELUXE: 15000
            }
          },
          modifierConfig: {
            weekendSurcharge: {
              days: ['friday', 'saturday', 'sunday'],
              amount: 2000
            }
          },
          additionalChargesConfig: {
            breakfast: { amount: 1000, perPerson: true }
          },
          calculationLogic: {},
          applicationConditions: {
            roomGrades: ['STANDARD', 'DELUXE']
          },
          displayConfig: {},
          priority: 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    });

    test('平日の基本料金計算', async () => {
      mockPrisma.pricingCalculation.create.mockResolvedValue({
        id: 'calc-1'
      });

      const result = await pricingEngine.calculatePrice({
        tenantId: 'test-tenant',
        roomGrade: 'STANDARD',
        checkIn: new Date('2025-01-15'), // 水曜日
        checkOut: new Date('2025-01-16'), // 木曜日
        guestCount: 2
      });

      expect(result.basePrice).toBe(10000);
      expect(result.finalPrice).toBe(10000);
      expect(result.modifiers).toHaveLength(0);
    });

    test('週末料金の適用', async () => {
      mockPrisma.pricingCalculation.create.mockResolvedValue({
        id: 'calc-2'
      });

      const result = await pricingEngine.calculatePrice({
        tenantId: 'test-tenant',
        roomGrade: 'STANDARD',
        checkIn: new Date('2025-01-18'), // 土曜日
        checkOut: new Date('2025-01-19'), // 日曜日
        guestCount: 2
      });

      expect(result.basePrice).toBe(10000);
      expect(result.finalPrice).toBe(12000); // 10000 + 2000(週末割増)
      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0].type).toBe('weekend_surcharge');
      expect(result.modifiers[0].amount).toBe(2000);
    });

    test('追加サービスの料金計算', async () => {
      mockPrisma.pricingCalculation.create.mockResolvedValue({
        id: 'calc-3'
      });

      const result = await pricingEngine.calculatePrice({
        tenantId: 'test-tenant',
        roomGrade: 'STANDARD',
        checkIn: new Date('2025-01-15'),
        checkOut: new Date('2025-01-16'),
        guestCount: 2,
        additionalServices: [
          { serviceCode: 'breakfast', name: '朝食' }
        ]
      });

      expect(result.basePrice).toBe(10000);
      expect(result.additionalCharges).toHaveLength(1);
      expect(result.additionalCharges[0].totalAmount).toBe(2000); // 1000 × 2名
      expect(result.finalPrice).toBe(12000);
    });
  });

  describe('Error Handling', () => {
    test('適用ルールが見つからない場合', async () => {
      mockPrisma.pricingMetaRule.findMany.mockResolvedValue([]);

      await expect(
        pricingEngine.calculatePrice({
          tenantId: 'test-tenant',
          roomGrade: 'UNKNOWN',
          checkIn: new Date('2025-01-15'),
          checkOut: new Date('2025-01-16'),
          guestCount: 2
        })
      ).rejects.toThrow('No applicable pricing rules found');
    });

    test('客室グレードの料金が見つからない場合', async () => {
      mockPrisma.pricingMetaRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          ruleType: 'FIXED',
          basePricingConfig: {
            roomRates: {
              STANDARD: 10000
            }
          },
          applicationConditions: {
            roomGrades: ['STANDARD', 'DELUXE']
          }
        }
      ]);

      await expect(
        pricingEngine.calculatePrice({
          tenantId: 'test-tenant',
          roomGrade: 'DELUXE', // 料金設定なし
          checkIn: new Date('2025-01-15'),
          checkOut: new Date('2025-01-16'),
          guestCount: 2
        })
      ).rejects.toThrow('No rate found for room grade: DELUXE');
    });
  });
});
```

### **2. 統合テスト**
```typescript
// src/__tests__/api/pricing/calculate.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/pricing/calculate';
import { prismaMock } from '@/lib/test-utils';

describe('/api/pricing/calculate', () => {
  test('正常な料金計算', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'X-Tenant-ID': 'test-tenant'
      },
      body: {
        roomGrade: 'STANDARD',
        checkIn: '2025-01-15',
        checkOut: '2025-01-16',
        guestCount: 2
      }
    });

    // モックデータ設定
    prismaMock.pricingMetaRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        ruleType: 'FIXED',
        basePricingConfig: {
          roomRates: { STANDARD: 10000 }
        },
        modifierConfig: {},
        additionalChargesConfig: {},
        applicationConditions: {
          roomGrades: ['STANDARD']
        }
      }
    ]);

    prismaMock.pricingCalculation.create.mockResolvedValue({
      id: 'calc-1'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.basePrice).toBe(10000);
    expect(data.data.finalPrice).toBe(10000);
  });

  test('必須パラメータ不足', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        roomGrade: 'STANDARD'
        // checkIn, checkOut, guestCount が不足
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Missing required parameters');
  });

  test('無効な日付', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        roomGrade: 'STANDARD',
        checkIn: '2025-01-16',
        checkOut: '2025-01-15', // チェックアウトがチェックインより前
        guestCount: 2
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Check-out date must be after check-in date');
  });
});
```

---

## 📚 **実装チェックリスト**

### **✅ Phase 1: 基盤構築**
- [ ] Prismaスキーマ更新
- [ ] データベースマイグレーション実行
- [ ] シードデータ作成
- [ ] 料金計算エンジン実装
- [ ] 料金計算API実装
- [ ] 基本テスト作成

### **✅ Phase 2: UI実装**
- [ ] 顧客向け料金表示コンポーネント
- [ ] 料金計算フック実装
- [ ] スタッフ向け料金設定画面
- [ ] レスポンシブデザイン調整
- [ ] アクセシビリティ対応

### **✅ Phase 3: 高度機能**
- [ ] 時間制料金サポート
- [ ] パッケージ料金サポート
- [ ] 動的料金調整
- [ ] 料金プラン管理機能
- [ ] 料金履歴・分析機能

### **✅ Phase 4: 統合・最適化**
- [ ] 既存PMSシステムとの統合
- [ ] パフォーマンス最適化
- [ ] セキュリティ監査
- [ ] 包括的テスト実行
- [ ] 本番環境デプロイ

### **📋 実装時の注意点**
1. **段階的実装**: 一度にすべて実装せず、段階的にリリース
2. **互換性確保**: 既存データとの互換性を常に維持
3. **パフォーマンス**: 大量計算時の性能を監視
4. **エラーハンドリング**: 料金計算エラーの適切な処理
5. **セキュリティ**: 料金データの暗号化・アクセス制御

**🌙 Luna（月読）より：この実装ガイドに沿って、段階的に確実な料金システムを構築していきましょう！** 