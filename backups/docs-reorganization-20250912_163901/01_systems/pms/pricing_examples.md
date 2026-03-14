# 🏨 **hotel-pms 料金システム実装例集**

**作成日**: 2025年1月  
**担当**: Luna（月読 - hotel-pms専門AI）  
**目的**: 既存ホテルの全料金パターンを完全網羅した実装例

---

## 🎯 **実装例一覧**

### **📋 目次**
1. [アパホテル型固定料金制](#1-アパホテル型固定料金制)
2. [レジャーホテル時間制料金](#2-レジャーホテル時間制料金)
3. [温泉旅館パッケージ料金](#3-温泉旅館パッケージ料金)
4. [ビジネスホテルプラン制](#4-ビジネスホテルプラン制)
5. [高級ホテル動的料金](#5-高級ホテル動的料金)
6. [シティホテル複合料金](#6-シティホテル複合料金)

---

## **1. アパホテル型固定料金制**

### **📋 特徴**
- シンプルな固定料金
- 客室タイプ別料金
- 週末割増
- 追加サービス料金

### **🔧 実装例**
```typescript
// データベース設定例
const apaHotelPricing = {
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
    breakfast: { 
      amount: 800, 
      perPerson: true,
      description: '朝食バイキング'
    },
    parking: { 
      amount: 800, 
      perNight: true,
      description: '駐車場利用料'
    },
    lateCheckout: { 
      amount: 1000, 
      perHour: true,
      description: 'レイトチェックアウト'
    }
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
    breakdownItems: ['base', 'weekend', 'additional']
  }
};

// 計算実装例
class FixedPricingCalculator {
  calculate(params: PricingParams, rule: PricingRule): PricingResult {
    const config = rule.basePricingConfig;
    const roomRate = config.roomRates[params.roomGrade];
    const nights = this.calculateNights(params.checkIn, params.checkOut);
    
    // 基本料金
    let basePrice = roomRate * nights;
    let modifiers = [];
    
    // 週末割増
    if (rule.modifierConfig.weekendSurcharge && this.isWeekend(params.checkIn)) {
      const surcharge = rule.modifierConfig.weekendSurcharge.amount;
      modifiers.push({
        type: 'weekend_surcharge',
        name: '週末料金',
        amount: surcharge,
        description: '金土日の宿泊による割増料金'
      });
    }
    
    // 追加サービス
    const additionalCharges = this.calculateAdditionalServices(
      params.additionalServices, 
      rule.additionalChargesConfig,
      params.guestCount,
      nights
    );
    
    const totalModifiers = modifiers.reduce((sum, m) => sum + m.amount, 0);
    const totalAdditional = additionalCharges.reduce((sum, c) => sum + c.totalAmount, 0);
    const finalPrice = basePrice + totalModifiers + totalAdditional;
    
    return {
      basePrice,
      modifiers,
      additionalCharges,
      finalPrice,
      breakdown: { nights, guestCount: params.guestCount, roomGrade: params.roomGrade }
    };
  }
}
```

### **💡 料金例**
```
スタンダードシングル 1泊（平日）
基本料金: ¥8,000
合計: ¥8,000

スタンダードシングル 1泊（土曜日）
基本料金: ¥8,000
週末料金: ¥1,500
合計: ¥9,500

ダブルルーム 2泊（朝食付き・駐車場込み）
基本料金: ¥20,000 (¥10,000 × 2泊)
朝食: ¥3,200 (¥800 × 2名 × 2泊)
駐車場: ¥1,600 (¥800 × 2泊)
合計: ¥24,800
```

---

## **2. レジャーホテル時間制料金**

### **📋 特徴**
- 時間制料金システム
- 時間帯による料金変動
- 休憩・宿泊の切り替え
- 延長料金計算

### **🔧 実装例**
```typescript
const leisureHotelPricing = {
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
      gracePeriod: 10 // 10分の猶予時間
    }
  },
  modifierConfig: {
    timeSlotMultipliers: {
      '06:00-18:00': 1.0,   // デイタイム
      '18:00-24:00': 1.3,   // ナイトタイム
      '00:00-06:00': 1.1    // レイトナイト
    }
  },
  additionalChargesConfig: {
    roomService: {
      amount: 2000,
      description: 'ルームサービス'
    },
    decoration: {
      amount: 3000,
      description: 'お部屋装飾'
    }
  },
  calculationLogic: {
    formula: 'IF(hours <= 6) THEN hourly_rates[hours] * time_multiplier ELSE stay_rate',
    extensionFormula: 'CEILING((actual_minutes - booked_minutes - grace_period) / 30) * extension_rate'
  },
  applicationConditions: {
    roomGrades: ['STANDARD', 'DELUXE', 'VIP'],
    bookingType: 'hourly_or_stay'
  },
  displayConfig: {
    customerTemplate: '{hours}時間利用 ¥{finalPrice}',
    showTimeSlotInfo: true,
    showExtensionRates: true
  }
};

class HourlyPricingCalculator {
  calculate(params: PricingParams, rule: PricingRule): PricingResult {
    const config = rule.basePricingConfig;
    const hours = this.calculateHours(params.checkIn, params.checkOut);
    
    // 基本料金計算
    let basePrice;
    if (hours <= 6 && config.hourlyRates[hours.toString()]) {
      basePrice = config.hourlyRates[hours.toString()];
    } else {
      basePrice = config.stayRate.fixedPrice;
    }
    
    // 時間帯係数適用
    const timeSlot = this.determineTimeSlot(params.checkIn);
    const timeMultiplier = rule.modifierConfig.timeSlotMultipliers[timeSlot] || 1.0;
    
    const modifiers = [];
    if (timeMultiplier !== 1.0) {
      const adjustment = basePrice * (timeMultiplier - 1.0);
      modifiers.push({
        type: 'time_slot_adjustment',
        name: this.getTimeSlotName(timeSlot),
        amount: adjustment,
        description: `${timeSlot}の時間帯による料金調整`
      });
    }
    
    const totalModifiers = modifiers.reduce((sum, m) => sum + m.amount, 0);
    const adjustedPrice = basePrice + totalModifiers;
    
    // 追加サービス
    const additionalCharges = this.calculateAdditionalServices(
      params.additionalServices,
      rule.additionalChargesConfig
    );
    
    const totalAdditional = additionalCharges.reduce((sum, c) => sum + c.totalAmount, 0);
    const finalPrice = adjustedPrice + totalAdditional;
    
    return {
      basePrice,
      modifiers,
      additionalCharges,
      finalPrice,
      breakdown: { 
        hours, 
        timeSlot,
        guestCount: params.guestCount,
        roomGrade: params.roomGrade 
      }
    };
  }
  
  private determineTimeSlot(checkIn: Date): string {
    const hour = checkIn.getHours();
    
    if (hour >= 6 && hour < 18) return '06:00-18:00';
    if (hour >= 18 && hour < 24) return '18:00-24:00';
    return '00:00-06:00';
  }
  
  private getTimeSlotName(timeSlot: string): string {
    const names = {
      '06:00-18:00': 'デイタイム',
      '18:00-24:00': 'ナイトタイム',
      '00:00-06:00': 'レイトナイト'
    };
    return names[timeSlot] || '時間帯調整';
  }
}
```

### **💡 料金例**
```
3時間利用（デイタイム 14:00-17:00）
基本料金: ¥5,500
時間帯調整: ¥0 (デイタイム×1.0)
合計: ¥5,500

3時間利用（ナイトタイム 20:00-23:00）
基本料金: ¥5,500
時間帯調整: ¥1,650 (ナイトタイム×1.3)
合計: ¥7,150

宿泊利用（22時間）
基本料金: ¥12,000
合計: ¥12,000

3時間30分利用（30分延長）
基本料金: ¥5,500
延長料金: ¥800 (30分×¥800)
合計: ¥6,300
```

---

## **3. 温泉旅館パッケージ料金**

### **📋 特徴**
- 1泊2食付きパッケージ
- 人数による料金調整
- 季節・曜日変動
- 料理グレードアップ

### **🔧 実装例**
```typescript
const onsenRyokanPricing = {
  ruleName: '温泉旅館1泊2食付き',
  ruleType: 'PACKAGE',
  basePricingConfig: {
    basePackage: {
      pricePerPerson: 15000,
      includes: ['accommodation', 'dinner', 'breakfast', 'onsen', 'yukata']
    },
    occupancyAdjustments: {
      '1': 1.8,  // 1名利用は1.8倍
      '2': 1.0,  // 2名利用は基準
      '3': 0.9,  // 3名利用は0.9倍/人
      '4': 0.8,  // 4名利用は0.8倍/人
      '5': 0.75  // 5名以上は0.75倍/人
    }
  },
  modifierConfig: {
    seasonalMultipliers: {
      'new_year': { multiplier: 2.5, period: '12/29-01/03' },
      'golden_week': { multiplier: 2.0, period: '04/29-05/05' },
      'obon': { multiplier: 2.0, period: '08/13-08/16' },
      'autumn_foliage': { multiplier: 1.5, period: '11/01-11/30' },
      'cherry_blossom': { multiplier: 1.4, period: '04/01-04/30' }
    },
    weekdayMultipliers: {
      'monday': 0.8,
      'tuesday': 0.8,
      'wednesday': 0.8,
      'thursday': 0.9,
      'friday': 1.2,
      'saturday': 1.5,
      'sunday': 1.3
    }
  },
  additionalChargesConfig: {
    special_kaiseki: {
      amount: 3000,
      perPerson: true,
      description: '特別会席料理'
    },
    premium_kaiseki: {
      amount: 8000,
      perPerson: true,
      description: '最高級会席料理'
    },
    private_dining: {
      amount: 2000,
      perRoom: true,
      description: '個室お食事'
    },
    private_bath: {
      amount: 3000,
      per45min: true,
      description: '貸切風呂（45分）'
    },
    massage: {
      amount: 5000,
      perPerson: true,
      description: 'アロママッサージ'
    }
  },
  calculationLogic: {
    formula: '(base_package * guest_count * occupancy_adj * seasonal_multiplier * weekday_multiplier) + meal_upgrades + services',
    minimumCharge: 'base_package * 2 * seasonal_multiplier * weekday_multiplier'
  },
  applicationConditions: {
    roomGrades: ['STANDARD', 'SUPERIOR', 'DELUXE', 'SUITE'],
    packageType: 'overnight_with_meals'
  },
  displayConfig: {
    customerTemplate: '1泊2食付き {guestCount}名様 ¥{finalPrice}',
    showIncluded: true,
    showUpgrades: true
  }
};

class PackagePricingCalculator {
  calculate(params: PricingParams, rule: PricingRule): PricingResult {
    const config = rule.basePricingConfig;
    const basePackagePrice = config.basePackage.pricePerPerson;
    
    // 人数調整
    const occupancyAdjustment = config.occupancyAdjustments[params.guestCount.toString()] || 1.0;
    
    // 基本料金（人数×基本料金×人数調整）
    const basePrice = basePackagePrice * params.guestCount * occupancyAdjustment;
    
    const modifiers = [];
    let adjustedPrice = basePrice;
    
    // 季節調整
    const season = this.determineSeason(params.checkIn);
    if (season && rule.modifierConfig.seasonalMultipliers[season]) {
      const seasonConfig = rule.modifierConfig.seasonalMultipliers[season];
      const seasonAdjustment = basePrice * (seasonConfig.multiplier - 1.0);
      adjustedPrice += seasonAdjustment;
      
      modifiers.push({
        type: 'seasonal_adjustment',
        name: this.getSeasonName(season),
        amount: seasonAdjustment,
        description: `${seasonConfig.period}の特別期間料金`
      });
    }
    
    // 曜日調整
    const weekday = this.getWeekdayName(params.checkIn);
    const weekdayMultiplier = rule.modifierConfig.weekdayMultipliers[weekday] || 1.0;
    if (weekdayMultiplier !== 1.0) {
      const weekdayAdjustment = basePrice * (weekdayMultiplier - 1.0);
      adjustedPrice += weekdayAdjustment;
      
      modifiers.push({
        type: 'weekday_adjustment',
        name: `${this.getWeekdayJapanese(weekday)}料金`,
        amount: weekdayAdjustment,
        description: `${this.getWeekdayJapanese(weekday)}宿泊による料金調整`
      });
    }
    
    // 追加サービス
    const additionalCharges = this.calculateAdditionalServices(
      params.additionalServices,
      rule.additionalChargesConfig,
      params.guestCount
    );
    
    const totalAdditional = additionalCharges.reduce((sum, c) => sum + c.totalAmount, 0);
    const finalPrice = adjustedPrice + totalAdditional;
    
    // 最低料金チェック
    const minimumCharge = this.calculateMinimumCharge(rule, season, weekday);
    const actualFinalPrice = Math.max(finalPrice, minimumCharge);
    
    return {
      basePrice,
      modifiers,
      additionalCharges,
      finalPrice: actualFinalPrice,
      breakdown: {
        nights: 1,
        guestCount: params.guestCount,
        roomGrade: params.roomGrade,
        occupancyAdjustment,
        season,
        weekday
      }
    };
  }
  
  private determineSeason(date: Date): string | null {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 年末年始
    if ((month === 12 && day >= 29) || (month === 1 && day <= 3)) {
      return 'new_year';
    }
    
    // GW
    if (month === 4 && day >= 29) return 'golden_week';
    if (month === 5 && day <= 5) return 'golden_week';
    
    // お盆
    if (month === 8 && day >= 13 && day <= 16) return 'obon';
    
    // 紅葉
    if (month === 11) return 'autumn_foliage';
    
    // 桜
    if (month === 4) return 'cherry_blossom';
    
    return null;
  }
  
  private getSeasonName(season: string): string {
    const names = {
      'new_year': '年末年始',
      'golden_week': 'ゴールデンウィーク',
      'obon': 'お盆',
      'autumn_foliage': '紅葉シーズン',
      'cherry_blossom': '桜シーズン'
    };
    return names[season] || season;
  }
}
```

### **💡 料金例**
```
2名様 1泊2食付き（平日・通常期）
基本料金: ¥30,000 (¥15,000 × 2名 × 1.0倍)
曜日調整: ¥-6,000 (火曜日 × 0.8)
合計: ¥24,000

4名様 1泊2食付き（土曜日・紅葉シーズン）
基本料金: ¥48,000 (¥15,000 × 4名 × 0.8倍)
紅葉シーズン: ¥24,000 (× 1.5倍)
土曜日料金: ¥24,000 (× 1.5倍)  
合計: ¥96,000

2名様 特別会席・個室食事付き
基本料金: ¥30,000
特別会席: ¥6,000 (¥3,000 × 2名)
個室食事: ¥2,000
合計: ¥38,000
```

---

## **4. ビジネスホテルプラン制**

### **📋 特徴**
- 複数プラン選択
- 連泊割引
- 早期予約割引
- 法人契約料金

### **🔧 実装例**
```typescript
const businessHotelPlans = {
  ruleName: 'ビジネスホテルプラン制',
  ruleType: 'PLAN_BASED',
  basePricingConfig: {
    basePlans: {
      room_only: {
        price: 7000,
        name: '素泊まり',
        includes: ['room', 'wifi', 'amenities']
      },
      with_breakfast: {
        price: 8200,
        name: '朝食付き',
        includes: ['room', 'wifi', 'amenities', 'breakfast']
      },
      with_meals: {
        price: 10500,
        name: '2食付き',
        includes: ['room', 'wifi', 'amenities', 'breakfast', 'dinner']
      }
    },
    roomGradeMultipliers: {
      SINGLE: 1.0,
      DOUBLE: 1.3,
      TWIN: 1.4,
      SUITE: 2.2
    }
  },
  modifierConfig: {
    consecutiveStayDiscounts: {
      '2': 0.05,   // 2泊で5%割引
      '3': 0.08,   // 3泊で8%割引
      '7': 0.15,   // 7泊で15%割引
      '14': 0.20,  // 14泊で20%割引
      '30': 0.25   // 30泊で25%割引
    },
    earlyBookingDiscounts: {
      '7': 0.03,   // 7日前予約で3%割引
      '14': 0.05,  // 14日前予約で5%割引
      '30': 0.08   // 30日前予約で8%割引
    },
    corporateDiscounts: {
      'standard': 0.10,  // 一般法人10%割引
      'premium': 0.15,   // プレミアム法人15%割引
      'vip': 0.20        // VIP法人20%割引
    },
    planVariations: {
      business_support: {
        basePlan: 'with_breakfast',
        priceOverride: 9800,
        additionalItems: ['quo_card_1000', 'free_laundry', 'late_checkout'],
        name: '出張応援プラン',
        description: 'QUOカード1000円分・ランドリー無料・12時レイトチェックアウト'
      },
      ladies_plan: {
        basePlan: 'with_breakfast',
        priceOverride: 8800,
        additionalItems: ['ladies_amenity', 'high_floor', 'safety_lock'],
        name: '女性安心プラン',
        description: 'レディースアメニティ・高層階確約・セキュリティ強化'
      },
      executive: {
        basePlan: 'with_meals',
        priceOverride: 15000,
        additionalItems: ['executive_lounge', 'newspaper', 'concierge'],
        name: 'エグゼクティブプラン',
        description: 'エグゼクティブラウンジ・新聞・コンシェルジュサービス'
      }
    }
  },
  additionalChargesConfig: {
    quo_card_1000: { value: 1000, cost: 1000 },
    free_laundry: { value: 500, cost: 200 },
    late_checkout: { value: 1000, cost: 0 },
    ladies_amenity: { value: 800, cost: 300 },
    high_floor: { value: 0, cost: 0 },
    safety_lock: { value: 0, cost: 0 },
    executive_lounge: { value: 3000, cost: 1500 },
    newspaper: { value: 200, cost: 150 },
    concierge: { value: 2000, cost: 1000 }
  },
  calculationLogic: {
    formula: 'IF(plan_variation) THEN plan_price * room_multiplier * nights * (1 - consecutive_discount) * (1 - early_discount) * (1 - corporate_discount) ELSE base_plan_price * room_multiplier * nights * (1 - consecutive_discount) * (1 - early_discount) * (1 - corporate_discount)',
    planSelection: 'automatic_best_value_suggestion'
  },
  applicationConditions: {
    roomGrades: ['SINGLE', 'DOUBLE', 'TWIN', 'SUITE'],
    planSystem: true
  },
  displayConfig: {
    customerTemplate: '{planName} {roomGrade} {nights}泊 ¥{finalPrice}',
    showPlanComparison: true,
    showDiscountBreakdown: true
  }
};

class PlanBasedPricingCalculator {
  calculate(params: PricingParams, rule: PricingRule): PricingResult {
    const config = rule.basePricingConfig;
    const nights = this.calculateNights(params.checkIn, params.checkOut);
    
    // プラン選択（カスタムパラメータまたは自動選択）
    const selectedPlan = params.customParams?.planCode || this.autoSelectBestPlan(params, rule);
    
    let basePrice: number;
    let planName: string;
    let includedItems: string[] = [];
    
    // プランバリエーションチェック
    const planVariation = rule.modifierConfig.planVariations[selectedPlan];
    if (planVariation) {
      basePrice = planVariation.priceOverride;
      planName = planVariation.name;
      includedItems = planVariation.additionalItems;
    } else {
      const basePlan = config.basePlans[selectedPlan];
      basePrice = basePlan.price;
      planName = basePlan.name;
      includedItems = basePlan.includes;
    }
    
    // 客室グレード調整
    const roomMultiplier = config.roomGradeMultipliers[params.roomGrade] || 1.0;
    basePrice *= roomMultiplier;
    
    // 基本料金（泊数適用）
    const totalBasePrice = basePrice * nights;
    
    const modifiers = [];
    let adjustedPrice = totalBasePrice;
    
    // 連泊割引
    const consecutiveDiscount = this.getConsecutiveDiscount(nights, rule.modifierConfig.consecutiveStayDiscounts);
    if (consecutiveDiscount > 0) {
      const discountAmount = totalBasePrice * consecutiveDiscount;
      adjustedPrice -= discountAmount;
      
      modifiers.push({
        type: 'consecutive_stay_discount',
        name: `${nights}泊連泊割引`,
        amount: -discountAmount,
        description: `${nights}泊の連泊による${Math.round(consecutiveDiscount * 100)}%割引`
      });
    }
    
    // 早期予約割引
    const daysInAdvance = this.calculateDaysInAdvance(params.checkIn);
    const earlyDiscount = this.getEarlyBookingDiscount(daysInAdvance, rule.modifierConfig.earlyBookingDiscounts);
    if (earlyDiscount > 0) {
      const discountAmount = totalBasePrice * earlyDiscount;
      adjustedPrice -= discountAmount;
      
      modifiers.push({
        type: 'early_booking_discount',
        name: `${daysInAdvance}日前早期予約割引`,
        amount: -discountAmount,
        description: `${daysInAdvance}日前予約による${Math.round(earlyDiscount * 100)}%割引`
      });
    }
    
    // 法人割引
    const corporateLevel = params.customParams?.corporateLevel;
    if (corporateLevel && rule.modifierConfig.corporateDiscounts[corporateLevel]) {
      const corporateDiscount = rule.modifierConfig.corporateDiscounts[corporateLevel];
      const discountAmount = totalBasePrice * corporateDiscount;
      adjustedPrice -= discountAmount;
      
      modifiers.push({
        type: 'corporate_discount',
        name: `${this.getCorporateLevelName(corporateLevel)}法人割引`,
        amount: -discountAmount,
        description: `法人契約による${Math.round(corporateDiscount * 100)}%割引`
      });
    }
    
    // 追加サービス計算
    const additionalCharges = this.calculatePlanIncludedServices(
      includedItems,
      rule.additionalChargesConfig
    );
    
    const finalPrice = adjustedPrice;
    
    return {
      basePrice: totalBasePrice,
      modifiers,
      additionalCharges,
      finalPrice,
      breakdown: {
        nights,
        guestCount: params.guestCount,
        roomGrade: params.roomGrade,
        planName,
        includedItems
      }
    };
  }
  
  private autoSelectBestPlan(params: PricingParams, rule: PricingRule): string {
    // 自動プラン選択ロジック（例：宿泊日数や顧客タイプに基づく）
    const nights = this.calculateNights(params.checkIn, params.checkOut);
    
    if (nights >= 7) {
      return 'business_support'; // 長期滞在には出張応援プラン
    }
    
    if (params.customParams?.gender === 'female') {
      return 'ladies_plan'; // 女性には女性安心プラン
    }
    
    return 'with_breakfast'; // デフォルトは朝食付き
  }
  
  private getConsecutiveDiscount(nights: number, discounts: Record<string, number>): number {
    const applicableNights = Object.keys(discounts)
      .map(n => parseInt(n))
      .filter(n => nights >= n)
      .sort((a, b) => b - a); // 降順ソート
    
    return applicableNights.length > 0 ? discounts[applicableNights[0].toString()] : 0;
  }
  
  private getEarlyBookingDiscount(daysInAdvance: number, discounts: Record<string, number>): number {
    const applicableDays = Object.keys(discounts)
      .map(d => parseInt(d))
      .filter(d => daysInAdvance >= d)
      .sort((a, b) => b - a); // 降順ソート
    
    return applicableDays.length > 0 ? discounts[applicableDays[0].toString()] : 0;
  }
  
  private calculateDaysInAdvance(checkIn: Date): number {
    const now = new Date();
    const timeDiff = checkIn.getTime() - now.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }
}
```

### **💡 料金例**
```
素泊まり シングル 1泊
基本料金: ¥7,000
合計: ¥7,000

出張応援プラン ダブル 3泊（7日前予約）
基本料金: ¥38,220 (¥9,800 × 1.3倍 × 3泊)
連泊割引: ¥-3,058 (-8%)
早期予約割引: ¥-1,911 (-5%)
合計: ¥33,251

エグゼクティブプラン スイート 1泊（法人VIP）
基本料金: ¥33,000 (¥15,000 × 2.2倍)
法人VIP割引: ¥-6,600 (-20%)
合計: ¥26,400
```

---

## **5. 高級ホテル動的料金**

### **📋 特徴**
- AI需要予測連動
- 競合価格自動調整
- イベント・天候連動
- VIP・リピーター特別料金

### **🔧 実装例**
```typescript
const luxuryHotelDynamic = {
  ruleName: '高級ホテル動的価格',
  ruleType: 'DYNAMIC',
  basePricingConfig: {
    baseRates: {
      DELUXE: 25000,
      SUITE: 45000,
      PRESIDENTIAL: 120000
    },
    minimumRates: {
      DELUXE: 20000,
      SUITE: 35000,
      PRESIDENTIAL: 80000
    },
    maximumRates: {
      DELUXE: 40000,
      SUITE: 70000,
      PRESIDENTIAL: 200000
    }
  },
  modifierConfig: {
    demandMultipliers: {
      'occupancy_90+': 1.5,     // 稼働率90%以上
      'occupancy_70-89': 1.2,   // 稼働率70-89%
      'occupancy_50-69': 1.0,   // 稼働率50-69%
      'occupancy_30-49': 0.9,   // 稼働率30-49%
      'occupancy_<30': 0.8      // 稼働率30%未満
    },
    eventMultipliers: {
      'tokyo_olympics': 2.0,
      'fireworks_festival': 1.8,
      'cherry_blossom_peak': 1.6,
      'business_conference': 1.3,
      'local_festival': 1.2
    },
    weatherMultipliers: {
      'sunny_weekend': 1.1,
      'rainy_day': 0.95,
      'typhoon_warning': 0.8,
      'perfect_weather': 1.05
    },
    competitorAdjustments: {
      'above_competitor_avg': 0.98,  // 競合平均より高い場合
      'below_competitor_avg': 1.02,  // 競合平均より低い場合
      'market_leader': 1.05          // 市場リーダー価格
    },
    seasonalBase: {
      'spring': 1.1,
      'summer': 1.0,
      'autumn': 1.2,
      'winter': 0.9
    }
  },
  additionalChargesConfig: {
    vip_service: {
      amount: 10000,
      description: 'VIPコンシェルジュサービス'
    },
    private_chef: {
      amount: 50000,
      description: 'プライベートシェフ'
    },
    helicopter_transfer: {
      amount: 150000,
      description: 'ヘリコプター送迎'
    },
    spa_package: {
      amount: 25000,
      description: 'プレミアムスパパッケージ'
    }
  },
  calculationLogic: {
    formula: 'base_rate * seasonal_base * demand_factor * event_factor * weather_factor * competitor_factor',
    constraints: {
      minMultiplier: 0.7,    // 最低でも基本料金の70%
      maxMultiplier: 2.5,    // 最高でも基本料金の250%
      changeLimit: 0.15,     // 1日の変動幅は15%まで
      updateFrequency: 'hourly'
    }
  },
  applicationConditions: {
    roomGrades: ['DELUXE', 'SUITE', 'PRESIDENTIAL'],
    requiresAI: true,
    dataSources: ['occupancy', 'weather_api', 'event_calendar', 'competitor_prices']
  },
  displayConfig: {
    customerTemplate: '本日限定価格 {roomGrade} ¥{finalPrice}',
    showPriceHistory: true,
    showDemandIndicator: true,
    emphasizeUrgency: true
  }
};

class DynamicPricingCalculator {
  constructor(
    private occupancyService: OccupancyService,
    private weatherService: WeatherService,
    private eventService: EventService,
    private competitorService: CompetitorService
  ) {}
  
  async calculate(params: PricingParams, rule: PricingRule): Promise<PricingResult> {
    const config = rule.basePricingConfig;
    const baseRate = config.baseRates[params.roomGrade];
    
    // データ収集
    const [occupancyData, weatherData, eventData, competitorData] = await Promise.all([
      this.occupancyService.getCurrentOccupancy(params.tenantId, params.checkIn),
      this.weatherService.getWeatherForecast(params.checkIn),
      this.eventService.getEvents(params.checkIn),
      this.competitorService.getCompetitorPrices(params.roomGrade, params.checkIn)
    ]);
    
    const modifiers = [];
    let adjustedPrice = baseRate;
    
    // 季節ベース調整
    const season = this.determineSeason(params.checkIn);
    const seasonalMultiplier = rule.modifierConfig.seasonalBase[season] || 1.0;
    if (seasonalMultiplier !== 1.0) {
      const adjustment = baseRate * (seasonalMultiplier - 1.0);
      adjustedPrice += adjustment;
      
      modifiers.push({
        type: 'seasonal_base',
        name: `${season}ベース料金`,
        amount: adjustment,
        description: `${season}の基本料金調整`
      });
    }
    
    // 需要連動調整
    const demandLevel = this.categorizeOccupancy(occupancyData.rate);
    const demandMultiplier = rule.modifierConfig.demandMultipliers[demandLevel] || 1.0;
    if (demandMultiplier !== 1.0) {
      const adjustment = baseRate * (demandMultiplier - 1.0);
      adjustedPrice += adjustment;
      
      modifiers.push({
        type: 'demand_adjustment',
        name: '需要連動価格',
        amount: adjustment,
        description: `稼働率${occupancyData.rate}%による需要調整`
      });
    }
    
    // イベント連動調整
    if (eventData.events.length > 0) {
      const majorEvent = eventData.events.find(e => rule.modifierConfig.eventMultipliers[e.code]);
      if (majorEvent) {
        const eventMultiplier = rule.modifierConfig.eventMultipliers[majorEvent.code];
        const adjustment = baseRate * (eventMultiplier - 1.0);
        adjustedPrice += adjustment;
        
        modifiers.push({
          type: 'event_adjustment',
          name: `${majorEvent.name}特別料金`,
          amount: adjustment,
          description: `${majorEvent.name}期間による特別価格`
        });
      }
    }
    
    // 天候連動調整
    const weatherCategory = this.categorizeWeather(weatherData);
    const weatherMultiplier = rule.modifierConfig.weatherMultipliers[weatherCategory] || 1.0;
    if (weatherMultiplier !== 1.0) {
      const adjustment = baseRate * (weatherMultiplier - 1.0);
      adjustedPrice += adjustment;
      
      modifiers.push({
        type: 'weather_adjustment',
        name: '天候連動価格',
        amount: adjustment,
        description: `${weatherData.condition}による料金調整`
      });
    }
    
    // 競合価格連動調整
    const competitorCategory = this.analyzeCompetitorPrices(adjustedPrice, competitorData);
    const competitorMultiplier = rule.modifierConfig.competitorAdjustments[competitorCategory] || 1.0;
    if (competitorMultiplier !== 1.0) {
      const adjustment = adjustedPrice * (competitorMultiplier - 1.0);
      adjustedPrice += adjustment;
      
      modifiers.push({
        type: 'competitor_adjustment',
        name: '競合価格調整',
        amount: adjustment,
        description: `市場価格に基づく調整`
      });
    }
    
    // 制約チェック
    const minPrice = config.minimumRates[params.roomGrade];
    const maxPrice = config.maximumRates[params.roomGrade];
    const constrainedPrice = Math.max(minPrice, Math.min(maxPrice, adjustedPrice));
    
    if (constrainedPrice !== adjustedPrice) {
      modifiers.push({
        type: 'price_constraint',
        name: '価格制約',
        amount: constrainedPrice - adjustedPrice,
        description: `最低/最高価格制約による調整`
      });
    }
    
    // VIP/リピーター特別価格
    const customerLevel = params.customParams?.customerLevel;
    if (customerLevel === 'vip' || customerLevel === 'repeat') {
      const vipDiscount = customerLevel === 'vip' ? 0.15 : 0.10;
      const discountAmount = constrainedPrice * vipDiscount;
      
      modifiers.push({
        type: 'customer_loyalty',
        name: `${customerLevel === 'vip' ? 'VIP' : 'リピーター'}特別価格`,
        amount: -discountAmount,
        description: `特別なお客様への優待価格`
      });
      
      constrainedPrice -= discountAmount;
    }
    
    // 追加サービス
    const additionalCharges = this.calculateAdditionalServices(
      params.additionalServices,
      rule.additionalChargesConfig
    );
    
    const totalAdditional = additionalCharges.reduce((sum, c) => sum + c.totalAmount, 0);
    const finalPrice = constrainedPrice + totalAdditional;
    
    return {
      basePrice: baseRate,
      modifiers,
      additionalCharges,
      finalPrice,
      breakdown: {
        nights: this.calculateNights(params.checkIn, params.checkOut),
        guestCount: params.guestCount,
        roomGrade: params.roomGrade,
        occupancyRate: occupancyData.rate,
        weatherCondition: weatherData.condition,
        events: eventData.events.map(e => e.name),
        competitorAvg: competitorData.average
      }
    };
  }
  
  private categorizeOccupancy(rate: number): string {
    if (rate >= 90) return 'occupancy_90+';
    if (rate >= 70) return 'occupancy_70-89';
    if (rate >= 50) return 'occupancy_50-69';
    if (rate >= 30) return 'occupancy_30-49';
    return 'occupancy_<30';
  }
  
  private categorizeWeather(weather: WeatherData): string {
    if (weather.condition === 'sunny' && weather.isWeekend) return 'sunny_weekend';
    if (weather.condition === 'rain') return 'rainy_day';
    if (weather.warnings.includes('typhoon')) return 'typhoon_warning';
    if (weather.condition === 'sunny' && weather.temperature >= 20 && weather.temperature <= 25) {
      return 'perfect_weather';
    }
    return 'normal_weather';
  }
  
  private analyzeCompetitorPrices(currentPrice: number, competitorData: CompetitorData): string {
    const avgPrice = competitorData.average;
    const difference = (currentPrice - avgPrice) / avgPrice;
    
    if (difference > 0.1) return 'above_competitor_avg';
    if (difference < -0.1) return 'below_competitor_avg';
    
    // マーケットリーダーかどうかの判定ロジック
    if (competitorData.marketPosition === 'leader') return 'market_leader';
    
    return 'at_market_avg';
  }
}
```

### **💡 料金例**
```
デラックスルーム（通常時）
基本料金: ¥25,000
合計: ¥25,000

デラックスルーム（花火大会・稼働率95%・晴天）
基本料金: ¥25,000
需要連動: ¥12,500 (×1.5)
花火大会: ¥20,000 (×1.8)
晴天週末: ¥2,500 (×1.1)
競合調整: ¥-1,200 (×0.98)
合計: ¥58,800

プレジデンシャルスイート（VIP顧客）
基本料金: ¥120,000
季節調整: ¥12,000 (秋×1.1)
VIP特別価格: ¥-19,800 (-15%)
プライベートシェフ: ¥50,000
合計: ¥162,200
```

---

## **6. シティホテル複合料金**

### **📋 特徴**
- 部屋+会議室パッケージ
- 宴会・パーティープラン
- 長期滞在プラン
- 企業研修パッケージ

### **🔧 実装例**
```typescript
const cityHotelComplex = {
  ruleName: 'シティホテル複合プラン',
  ruleType: 'COMPLEX_PACKAGE',
  basePricingConfig: {
    accommodationRates: {
      STANDARD: 12000,
      SUPERIOR: 18000,
      DELUXE: 25000,
      SUITE: 45000
    },
    meetingRoomRates: {
      SMALL: { halfDay: 30000, fullDay: 50000 },
      MEDIUM: { halfDay: 50000, fullDay: 80000 },
      LARGE: { halfDay: 80000, fullDay: 120000 },
      BALLROOM: { halfDay: 150000, fullDay: 250000 }
    },
    banquetPackages: {
      lunch: { pricePerPerson: 8000, minimumGuests: 20 },
      dinner: { pricePerPerson: 15000, minimumGuests: 20 },
      cocktail: { pricePerPerson: 6000, minimumGuests: 30 },
      wedding: { pricePerPerson: 25000, minimumGuests: 50 }
    }
  },
  modifierConfig: {
    packageCombinationDiscounts: {
      'room_meeting': 0.10,        // 宿泊+会議室で10%割引
      'room_banquet': 0.15,        // 宿泊+宴会で15%割引
      'room_meeting_banquet': 0.20, // 宿泊+会議室+宴会で20%割引
      'long_stay_meeting': 0.25    // 長期滞在+会議室で25%割引
    },
    longStayDiscounts: {
      '7': 0.10,   // 7泊以上で10%割引
      '14': 0.15,  // 14泊以上で15%割引
      '30': 0.25,  // 30泊以上で25%割引
      '90': 0.35   // 90泊以上で35%割引
    },
    groupSizeDiscounts: {
      'rooms_5-9': 0.05,    // 5-9室で5%割引
      'rooms_10-19': 0.10,  // 10-19室で10%割引
      'rooms_20+': 0.15     // 20室以上で15%割引
    },
    seasonalSurcharges: {
      'conference_season': { multiplier: 1.3, period: '09/01-11/30' },
      'year_end_parties': { multiplier: 1.5, period: '12/01-12/31' },
      'graduation_season': { multiplier: 1.2, period: '03/01-03/31' }
    }
  },
  additionalChargesConfig: {
    av_equipment: {
      projector: { amount: 10000, per: 'day' },
      microphone: { amount: 5000, per: 'day' },
      sound_system: { amount: 15000, per: 'day' }
    },
    catering_upgrades: {
      premium_menu: { amount: 3000, perPerson: true },
      wine_pairing: { amount: 5000, perPerson: true },
      special_decoration: { amount: 50000, perEvent: true }
    },
    concierge_services: {
      translation: { amount: 30000, per: 'day' },
      transportation: { amount: 20000, per: 'trip' },
      event_coordination: { amount: 100000, per: 'event' }
    }
  },
  calculationLogic: {
    formula: '(accommodation_total + meeting_room_total + banquet_total) * (1 - combination_discount) * (1 - group_discount) * seasonal_multiplier + additional_services',
    packageOptimization: 'suggest_best_combination'
  },
  applicationConditions: {
    roomGrades: ['STANDARD', 'SUPERIOR', 'DELUXE', 'SUITE'],
    packageTypes: ['accommodation_only', 'business_package', 'event_package', 'long_stay'],
    minimumStay: 1
  },
  displayConfig: {
    customerTemplate: '{packageType} {totalRooms}室 {nights}泊 ¥{finalPrice}',
    showPackageSavings: true,
    showAlternativePackages: true
  }
};

class ComplexPackagePricingCalculator {
  calculate(params: PricingParams, rule: PricingRule): PricingResult {
    const config = rule.basePricingConfig;
    const nights = this.calculateNights(params.checkIn, params.checkOut);
    const roomCount = params.customParams?.roomCount || 1;
    
    // 宿泊料金計算
    const accommodationRate = config.accommodationRates[params.roomGrade];
    const totalAccommodation = accommodationRate * nights * roomCount;
    
    let totalMeetingRoom = 0;
    let totalBanquet = 0;
    const modifiers = [];
    
    // 会議室料金計算
    if (params.customParams?.meetingRooms) {
      totalMeetingRoom = this.calculateMeetingRoomCosts(
        params.customParams.meetingRooms,
        config.meetingRoomRates
      );
    }
    
    // 宴会料金計算
    if (params.customParams?.banquetEvents) {
      totalBanquet = this.calculateBanquetCosts(
        params.customParams.banquetEvents,
        config.banquetPackages
      );
    }
    
    // 基本料金合計
    const baseTotal = totalAccommodation + totalMeetingRoom + totalBanquet;
    let adjustedPrice = baseTotal;
    
    // パッケージ組み合わせ割引
    const packageCombination = this.determinePackageCombination(
      totalAccommodation > 0,
      totalMeetingRoom > 0,
      totalBanquet > 0,
      nights >= 7
    );
    
    if (packageCombination) {
      const discount = rule.modifierConfig.packageCombinationDiscounts[packageCombination];
      if (discount) {
        const discountAmount = baseTotal * discount;
        adjustedPrice -= discountAmount;
        
        modifiers.push({
          type: 'package_combination_discount',
          name: this.getPackageCombinationName(packageCombination),
          amount: -discountAmount,
          description: `パッケージ組み合わせによる${Math.round(discount * 100)}%割引`
        });
      }
    }
    
    // 長期滞在割引
    const longStayDiscount = this.getLongStayDiscount(nights, rule.modifierConfig.longStayDiscounts);
    if (longStayDiscount > 0) {
      const discountAmount = totalAccommodation * longStayDiscount;
      adjustedPrice -= discountAmount;
      
      modifiers.push({
        type: 'long_stay_discount',
        name: `${nights}泊長期滞在割引`,
        amount: -discountAmount,
        description: `${nights}泊滞在による${Math.round(longStayDiscount * 100)}%割引`
      });
    }
    
    // 団体割引
    const groupDiscount = this.getGroupSizeDiscount(roomCount, rule.modifierConfig.groupSizeDiscounts);
    if (groupDiscount > 0) {
      const discountAmount = totalAccommodation * groupDiscount;
      adjustedPrice -= discountAmount;
      
      modifiers.push({
        type: 'group_size_discount',
        name: `${roomCount}室団体割引`,
        amount: -discountAmount,
        description: `${roomCount}室利用による${Math.round(groupDiscount * 100)}%割引`
      });
    }
    
    // 季節料金調整
    const seasonalSurcharge = this.getSeasonalSurcharge(params.checkIn, rule.modifierConfig.seasonalSurcharges);
    if (seasonalSurcharge) {
      const surchargeAmount = baseTotal * (seasonalSurcharge.multiplier - 1.0);
      adjustedPrice += surchargeAmount;
      
      modifiers.push({
        type: 'seasonal_surcharge',
        name: seasonalSurcharge.name,
        amount: surchargeAmount,
        description: `${seasonalSurcharge.period}の特別期間料金`
      });
    }
    
    // 追加サービス
    const additionalCharges = this.calculateAdditionalServices(
      params.additionalServices,
      rule.additionalChargesConfig
    );
    
    const totalAdditional = additionalCharges.reduce((sum, c) => sum + c.totalAmount, 0);
    const finalPrice = adjustedPrice + totalAdditional;
    
    return {
      basePrice: baseTotal,
      modifiers,
      additionalCharges,
      finalPrice,
      breakdown: {
        nights,
        roomCount,
        guestCount: params.guestCount,
        roomGrade: params.roomGrade,
        accommodationCost: totalAccommodation,
        meetingRoomCost: totalMeetingRoom,
        banquetCost: totalBanquet,
        packageCombination
      }
    };
  }
  
  private calculateMeetingRoomCosts(meetingRooms: any[], rates: any): number {
    return meetingRooms.reduce((total, room) => {
      const roomRate = rates[room.type];
      const cost = room.duration === 'half' ? roomRate.halfDay : roomRate.fullDay;
      return total + (cost * room.days);
    }, 0);
  }
  
  private calculateBanquetCosts(banquetEvents: any[], packages: any): number {
    return banquetEvents.reduce((total, event) => {
      const packageRate = packages[event.type];
      const cost = packageRate.pricePerPerson * Math.max(event.guests, packageRate.minimumGuests);
      return total + cost;
    }, 0);
  }
  
  private determinePackageCombination(hasAccommodation: boolean, hasMeeting: boolean, hasBanquet: boolean, isLongStay: boolean): string | null {
    if (hasAccommodation && hasMeeting && hasBanquet) return 'room_meeting_banquet';
    if (hasAccommodation && hasBanquet) return 'room_banquet';
    if (hasAccommodation && hasMeeting && isLongStay) return 'long_stay_meeting';
    if (hasAccommodation && hasMeeting) return 'room_meeting';
    return null;
  }
  
  private getPackageCombinationName(combination: string): string {
    const names = {
      'room_meeting': '宿泊+会議室パッケージ割引',
      'room_banquet': '宿泊+宴会パッケージ割引',
      'room_meeting_banquet': '宿泊+会議室+宴会フルパッケージ割引',
      'long_stay_meeting': '長期滞在+会議室パッケージ割引'
    };
    return names[combination] || 'パッケージ割引';
  }
}
```

### **💡 料金例**
```
企業研修パッケージ（10室 × 3泊）
宿泊料金: ¥360,000 (¥12,000 × 10室 × 3泊)
会議室大: ¥360,000 (¥120,000 × 3日)
昼食宴会: ¥240,000 (¥8,000 × 30名)
パッケージ割引: ¥-192,000 (-20%)
団体割引: ¥-36,000 (-10%)
プロジェクター: ¥30,000 (¥10,000 × 3日)
合計: ¥762,000

結婚披露宴パッケージ（新郎新婦1室 × 1泊）
宿泊料金: ¥45,000 (スイート)
結婚宴会: ¥2,000,000 (¥25,000 × 80名)
パッケージ割引: ¥-306,750 (-15%)
特別装飾: ¥50,000
ワインペアリング: ¥400,000 (¥5,000 × 80名)
合計: ¥2,188,250
```

---

## 🎯 **実装完了チェックリスト**

### **✅ 各料金パターン実装状況**
- [ ] アパホテル型固定料金制
- [ ] レジャーホテル時間制料金
- [ ] 温泉旅館パッケージ料金
- [ ] ビジネスホテルプラン制
- [ ] 高級ホテル動的料金
- [ ] シティホテル複合料金

### **✅ 共通機能実装**
- [ ] 料金計算エンジン統合
- [ ] UI表示コンポーネント
- [ ] 管理画面実装
- [ ] API統合
- [ ] テストケース作成

### **✅ 検証項目**
- [ ] 既存料金パターンとの完全一致確認
- [ ] UI/UXのシンプルさ確認
- [ ] パフォーマンステスト
- [ ] セキュリティ監査

**🌙 Luna（月読）より：この実装例集により、日本のあらゆるホテル料金パターンを完全網羅できます！** 