# 💳 AIクレジット管理システム設計仕様書

**作成日**: 2025年1月19日  
**対象システム**: hotel-common（統合基盤）  
**優先度**: 🔴 **最高優先度**  
**実装担当**: 統合開発チーム

---

## 📋 **概要**

OpenAI APIを活用したAI画像補正機能において、**テナント別AIクレジット消費・管理・課金システム**の包括的設計仕様書です。

---

## 🏗️ **システム設計**

### **1. AIクレジット管理アーキテクチャ**

```typescript
// AIクレジット管理システム
interface AICreditManagementSystem {
  // クレジット管理
  creditManager: {
    balance: CreditBalanceManager;
    consumption: CreditConsumptionTracker;
    billing: CreditBillingSystem;
    limits: CreditLimitController;
  };
  
  // AI処理管理
  aiProcessingManager: {
    queue: AIProcessingQueue;
    optimizer: CostOptimizer;
    cache: AIResultCache;
    fallback: FallbackProcessor;
  };
  
  // 監視・分析
  analytics: {
    usage: UsageAnalytics;
    cost: CostAnalytics;
    optimization: OptimizationRecommendations;
  };
}
```

### **2. データベース設計**

```sql
-- テナント別AIクレジット残高
CREATE TABLE ai_credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- クレジット残高
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  reserved_balance DECIMAL(12,2) NOT NULL DEFAULT 0, -- 処理中予約分
  total_purchased DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_consumed DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- プラン・制限
  plan_type ai_plan_type NOT NULL DEFAULT 'BASIC',
  monthly_limit DECIMAL(12,2),
  daily_limit DECIMAL(12,2),
  per_request_limit DECIMAL(12,2),
  
  -- 自動チャージ
  auto_recharge_enabled BOOLEAN DEFAULT false,
  auto_recharge_threshold DECIMAL(12,2),
  auto_recharge_amount DECIMAL(12,2),
  
  -- ステータス
  status credit_status DEFAULT 'ACTIVE',
  suspended_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AIクレジット消費履歴
CREATE TABLE ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- 取引情報
  transaction_type credit_transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  
  -- AI処理詳細
  ai_service ai_service_type,
  processing_details JSONB,
  input_tokens INTEGER,
  output_tokens INTEGER,
  processing_time_ms INTEGER,
  
  -- 関連情報
  source_system system_type_enum,
  source_user_id UUID REFERENCES users(id),
  related_media_id UUID,
  request_id UUID,
  
  -- コスト詳細
  openai_cost_usd DECIMAL(10,4),
  markup_percentage DECIMAL(5,2) DEFAULT 20.00,
  final_cost_jpy DECIMAL(12,2),
  
  -- メタデータ
  api_endpoint VARCHAR(200),
  model_used VARCHAR(100),
  quality_settings JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- AIクレジット購入履歴
CREATE TABLE ai_credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- 購入情報
  purchase_amount DECIMAL(12,2) NOT NULL,
  credit_amount DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(8,4) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- 支払い情報
  payment_method payment_method_type,
  payment_reference VARCHAR(200),
  payment_status payment_status_type DEFAULT 'PENDING',
  
  -- 請求情報
  invoice_number VARCHAR(100),
  invoice_date DATE,
  due_date DATE,
  
  -- 有効期限
  expires_at TIMESTAMP,
  auto_renewal BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI使用量分析
CREATE TABLE ai_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- 期間
  analysis_date DATE NOT NULL,
  analysis_hour INTEGER CHECK (analysis_hour BETWEEN 0 AND 23),
  
  -- 使用量統計
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  cached_requests INTEGER DEFAULT 0,
  
  -- コスト統計
  total_cost DECIMAL(12,2) DEFAULT 0,
  openai_cost DECIMAL(12,2) DEFAULT 0,
  markup_cost DECIMAL(12,2) DEFAULT 0,
  
  -- 処理統計
  avg_processing_time_ms INTEGER,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  
  -- 品質統計
  avg_quality_improvement DECIMAL(4,2),
  user_satisfaction_score DECIMAL(3,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT ai_usage_analytics_unique 
    UNIQUE (tenant_id, analysis_date, analysis_hour)
);

-- ENUM定義
CREATE TYPE ai_plan_type AS ENUM (
  'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE', 'UNLIMITED'
);

CREATE TYPE credit_status AS ENUM (
  'ACTIVE', 'SUSPENDED', 'EXPIRED', 'DEPLETED'
);

CREATE TYPE credit_transaction_type AS ENUM (
  'PURCHASE', 'CONSUMPTION', 'REFUND', 'BONUS', 'ADJUSTMENT'
);

CREATE TYPE ai_service_type AS ENUM (
  'IMAGE_ENHANCEMENT', 'IMAGE_GENERATION', 'TEXT_ANALYSIS', 'TRANSLATION'
);

CREATE TYPE payment_method_type AS ENUM (
  'CREDIT_CARD', 'BANK_TRANSFER', 'INVOICE', 'AUTO_CHARGE'
);

CREATE TYPE payment_status_type AS ENUM (
  'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'
);
```

---

## 💰 **AIクレジット経済システム**

### **1. 料金体系設計**

```typescript
// AI処理料金体系
interface AIPricingStructure {
  // 画像補正料金（カテゴリ別）
  imageEnhancement: {
    FOOD: {
      basicEnhancement: 5,      // 5クレジット
      premiumEnhancement: 12,   // 12クレジット
      professionalEnhancement: 25 // 25クレジット
    },
    ROOM: {
      basicEnhancement: 4,
      premiumEnhancement: 10,
      professionalEnhancement: 20
    },
    FACILITY: {
      basicEnhancement: 6,
      premiumEnhancement: 15,
      professionalEnhancement: 30
    }
  };
  
  // プラン別月額制限
  planLimits: {
    BASIC: {
      monthlyCredits: 500,
      dailyCredits: 50,
      perRequestCredits: 10,
      price: 5000 // JPY
    },
    STANDARD: {
      monthlyCredits: 2000,
      dailyCredits: 200,
      perRequestCredits: 25,
      price: 15000
    },
    PREMIUM: {
      monthlyCredits: 10000,
      dailyCredits: 1000,
      perRequestCredits: 50,
      price: 50000
    },
    ENTERPRISE: {
      monthlyCredits: 50000,
      dailyCredits: 5000,
      perRequestCredits: 100,
      price: 200000
    }
  };
  
  // 従量課金レート
  payAsYouGo: {
    creditPrice: 10, // 1クレジット = 10円
    bulkDiscounts: {
      '1000+': 0.9,   // 10%割引
      '5000+': 0.8,   // 20%割引
      '10000+': 0.7   // 30%割引
    }
  };
}
```

### **2. クレジット消費制御**

```typescript
// AIクレジット消費管理
export class AICreditConsumptionManager {
  /**
   * AI処理前のクレジット確認・予約
   */
  async reserveCredits(
    tenantId: string,
    aiService: AIServiceType,
    estimatedCost: number
  ): Promise<CreditReservation> {
    
    // 1. 現在残高確認
    const balance = await this.getCreditBalance(tenantId);
    
    // 2. 制限チェック
    await this.checkLimits(tenantId, estimatedCost);
    
    // 3. クレジット予約
    if (balance.current_balance >= estimatedCost) {
      const reservation = await this.createReservation(tenantId, estimatedCost);
      await this.updateReservedBalance(tenantId, estimatedCost);
      return reservation;
    }
    
    // 4. 不足時の処理
    throw new InsufficientCreditsError({
      required: estimatedCost,
      available: balance.current_balance,
      suggestions: await this.getSuggestions(tenantId)
    });
  }
  
  /**
   * AI処理完了後のクレジット確定消費
   */
  async consumeCredits(
    reservationId: string,
    actualCost: number,
    processingResult: AIProcessingResult
  ): Promise<CreditTransaction> {
    
    const reservation = await this.getReservation(reservationId);
    
    // 1. 実際のコスト計算
    const finalCost = await this.calculateFinalCost(actualCost, processingResult);
    
    // 2. 予約分との差額調整
    const adjustment = reservation.amount - finalCost;
    
    // 3. クレジット消費記録
    const transaction = await this.recordConsumption({
      tenantId: reservation.tenant_id,
      amount: finalCost,
      aiService: reservation.ai_service,
      processingDetails: processingResult,
      openaiCost: processingResult.openaiCost,
      processingTime: processingResult.processingTime
    });
    
    // 4. 予約解除・残高調整
    await this.releaseReservation(reservationId, adjustment);
    
    return transaction;
  }
  
  /**
   * 動的コスト計算
   */
  async calculateFinalCost(
    baseCost: number,
    result: AIProcessingResult
  ): Promise<number> {
    
    let finalCost = baseCost;
    
    // 品質向上度による調整
    if (result.qualityImprovement > 0.8) {
      finalCost *= 1.2; // 高品質向上時は20%増し
    }
    
    // 処理時間による調整
    if (result.processingTime > 30000) { // 30秒超過
      finalCost *= 1.1; // 長時間処理は10%増し
    }
    
    // 失敗時の割引
    if (result.success === false) {
      finalCost *= 0.1; // 失敗時は90%割引
    }
    
    return Math.round(finalCost);
  }
}
```

---

## 🚀 **AI処理最適化システム**

### **1. コスト最適化戦略**

```typescript
// AI処理コスト最適化
export class AICostOptimizer {
  /**
   * バッチ処理による効率化
   */
  async optimizeBatchProcessing(
    requests: AIProcessingRequest[]
  ): Promise<BatchOptimizationResult> {
    
    // 1. 類似画像のグループ化
    const groups = await this.groupSimilarImages(requests);
    
    // 2. バッチサイズ最適化
    const optimizedBatches = await this.optimizeBatchSizes(groups);
    
    // 3. 並列処理スケジューリング
    const schedule = await this.createProcessingSchedule(optimizedBatches);
    
    return {
      originalCost: this.calculateOriginalCost(requests),
      optimizedCost: this.calculateOptimizedCost(schedule),
      savings: this.calculateSavings(requests, schedule),
      processingTime: schedule.estimatedTime
    };
  }
  
  /**
   * キャッシュ戦略
   */
  async implementCacheStrategy(
    request: AIProcessingRequest
  ): Promise<CacheResult> {
    
    // 1. 画像ハッシュ生成
    const imageHash = await this.generateImageHash(request.image);
    
    // 2. キャッシュ確認
    const cached = await this.checkCache(imageHash, request.category);
    
    if (cached) {
      return {
        hit: true,
        result: cached.result,
        cost: 0, // キャッシュヒットはコスト0
        processingTime: 50 // 50ms
      };
    }
    
    // 3. 新規処理後キャッシュ保存
    const result = await this.processWithAI(request);
    await this.saveToCache(imageHash, request.category, result);
    
    return {
      hit: false,
      result,
      cost: result.cost,
      processingTime: result.processingTime
    };
  }
  
  /**
   * 品質レベル自動調整
   */
  async autoAdjustQuality(
    tenantId: string,
    request: AIProcessingRequest
  ): Promise<QualityAdjustment> {
    
    // 1. テナントの使用パターン分析
    const usage = await this.analyzeUsagePattern(tenantId);
    
    // 2. 残クレジット状況確認
    const balance = await this.getCreditBalance(tenantId);
    
    // 3. 品質レベル自動調整
    let qualityLevel = request.qualityLevel || 'STANDARD';
    
    if (balance.current_balance < 100) {
      qualityLevel = 'BASIC'; // 残高少ない時は基本品質
    } else if (usage.averageQualityImprovement < 0.3) {
      qualityLevel = 'BASIC'; // 効果が低い場合は基本品質
    } else if (balance.current_balance > 1000 && usage.satisfactionScore > 0.8) {
      qualityLevel = 'PREMIUM'; // 余裕がある場合は高品質
    }
    
    return {
      originalLevel: request.qualityLevel,
      adjustedLevel: qualityLevel,
      reason: this.getAdjustmentReason(qualityLevel),
      costDifference: this.calculateCostDifference(request.qualityLevel, qualityLevel)
    };
  }
}
```

### **2. フォールバック戦略**

```typescript
// AI処理フォールバック
export class AIFallbackProcessor {
  /**
   * 段階的フォールバック処理
   */
  async processWithFallback(
    request: AIProcessingRequest
  ): Promise<ProcessingResult> {
    
    try {
      // 1. OpenAI GPT-4 Vision (最高品質)
      return await this.processWithGPT4Vision(request);
      
    } catch (error) {
      if (error.code === 'INSUFFICIENT_CREDITS') {
        
        try {
          // 2. OpenAI GPT-3.5 Vision (標準品質)
          return await this.processWithGPT35Vision(request);
          
        } catch (fallbackError) {
          
          try {
            // 3. ローカルAI処理 (基本品質)
            return await this.processWithLocalAI(request);
            
          } catch (localError) {
            
            // 4. 従来の画像処理 (最低限)
            return await this.processWithTraditional(request);
          }
        }
      }
      
      throw error;
    }
  }
  
  /**
   * ローカルAI処理（コスト0）
   */
  async processWithLocalAI(
    request: AIProcessingRequest
  ): Promise<ProcessingResult> {
    
    // Sharp.jsによる基本的な画像処理
    const enhanced = await sharp(request.image)
      .normalize() // 正規化
      .sharpen() // シャープ化
      .modulate({
        brightness: 1.1,
        saturation: 1.2
      })
      .toBuffer();
    
    return {
      success: true,
      enhancedImage: enhanced,
      qualityImprovement: 0.3, // 30%改善
      processingTime: 500,
      cost: 0, // ローカル処理はコスト0
      method: 'LOCAL_AI'
    };
  }
}
```

---

## 📊 **使用量分析・監視システム**

### **1. リアルタイム監視**

```typescript
// AIクレジット監視システム
export class AICreditMonitoringSystem {
  /**
   * リアルタイム使用量監視
   */
  async monitorUsage(tenantId: string): Promise<UsageMonitoring> {
    
    const current = await this.getCurrentUsage(tenantId);
    const limits = await this.getLimits(tenantId);
    
    // 閾値チェック
    const alerts = [];
    
    if (current.dailyUsage > limits.dailyLimit * 0.8) {
      alerts.push({
        type: 'DAILY_LIMIT_WARNING',
        message: '日次制限の80%に達しました',
        severity: 'WARNING'
      });
    }
    
    if (current.balance < 50) {
      alerts.push({
        type: 'LOW_BALANCE',
        message: 'クレジット残高が不足しています',
        severity: 'CRITICAL'
      });
    }
    
    return {
      currentUsage: current,
      limits,
      alerts,
      recommendations: await this.generateRecommendations(tenantId, current)
    };
  }
  
  /**
   * 使用量予測
   */
  async predictUsage(
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<UsagePrediction> {
    
    const historical = await this.getHistoricalUsage(tenantId, period);
    const trends = await this.analyzeTrends(historical);
    
    return {
      predictedUsage: trends.predicted,
      confidence: trends.confidence,
      factors: trends.influencingFactors,
      recommendations: await this.generateOptimizationRecommendations(trends)
    };
  }
}
```

### **2. コスト分析ダッシュボード**

```typescript
// AIコスト分析
interface AICostAnalytics {
  overview: {
    totalSpent: number;
    creditsRemaining: number;
    monthlyBudget: number;
    projectedMonthlySpend: number;
  };
  
  breakdown: {
    byService: {
      imageEnhancement: number;
      textAnalysis: number;
      translation: number;
    };
    byCategory: {
      FOOD: number;
      ROOM: number;
      FACILITY: number;
    };
    byQuality: {
      BASIC: number;
      STANDARD: number;
      PREMIUM: number;
    };
  };
  
  efficiency: {
    averageCostPerImage: number;
    averageQualityImprovement: number;
    costEfficiencyScore: number;
    optimizationOpportunities: string[];
  };
  
  trends: {
    dailyUsage: Array<{
      date: string;
      usage: number;
      cost: number;
    }>;
    hourlyPattern: Array<{
      hour: number;
      averageUsage: number;
    }>;
  };
}
```

---

## 🔧 **実装統合**

### **1. 透明プロキシ統合**

```typescript
// AI機能付き透明プロキシ
export class AIEnhancedTransparentProxy {
  async handleImageUpload(
    event: H3Event,
    sourceSystem: SystemType
  ): Promise<Response> {
    
    const file = await readMultipartFormData(event);
    const tenantId = await this.extractTenantId(event);
    
    // 1. AIクレジット確認
    const creditCheck = await this.creditManager.checkAvailability(
      tenantId,
      'IMAGE_ENHANCEMENT',
      this.estimateCost(file, sourceSystem)
    );
    
    if (!creditCheck.available) {
      // クレジット不足時のフォールバック
      return await this.fallbackProcessor.processWithTraditional(file);
    }
    
    // 2. クレジット予約
    const reservation = await this.creditManager.reserveCredits(
      tenantId,
      'IMAGE_ENHANCEMENT',
      creditCheck.estimatedCost
    );
    
    try {
      // 3. AI処理実行
      const result = await this.aiProcessor.enhance(file, {
        category: this.detectCategory(file, sourceSystem),
        qualityLevel: await this.determineQualityLevel(tenantId)
      });
      
      // 4. クレジット消費確定
      await this.creditManager.consumeCredits(
        reservation.id,
        result.actualCost,
        result
      );
      
      // 5. 既存形式でレスポンス
      return this.formatAsOriginalResponse(result, sourceSystem);
      
    } catch (error) {
      // エラー時は予約解除
      await this.creditManager.releaseReservation(reservation.id);
      throw error;
    }
  }
}
```

### **2. システム別統合**

```typescript
// hotel-saas統合
export class SaaSAIIntegration {
  async integrateWithExistingAPI(): Promise<void> {
    // 既存の /api/v1/uploads/image にAI機能追加
    this.router.post('/api/v1/uploads/image', async (event) => {
      return await this.aiProxy.handleImageUpload(event, 'hotel-saas');
    });
  }
}

// hotel-pms統合
export class PMSAIIntegration {
  async integrateWithHandoverSystem(): Promise<void> {
    // 申し送り画像にAI補正を自動適用
    this.router.post('/api/pms/handover/media', async (event) => {
      return await this.aiProxy.handleImageUpload(event, 'hotel-pms');
    });
  }
}
```

---

## 💡 **運用・管理**

### **1. 管理画面機能**

```typescript
// AIクレジット管理画面
interface AICreditManagementUI {
  dashboard: {
    currentBalance: number;
    monthlyUsage: number;
    costTrends: ChartData;
    alerts: Alert[];
  };
  
  settings: {
    planManagement: PlanSettings;
    autoRecharge: AutoRechargeSettings;
    limits: LimitSettings;
    notifications: NotificationSettings;
  };
  
  analytics: {
    usageAnalytics: UsageAnalytics;
    costAnalytics: CostAnalytics;
    optimizationRecommendations: OptimizationRecommendations;
  };
  
  billing: {
    invoiceHistory: Invoice[];
    paymentMethods: PaymentMethod[];
    billingSettings: BillingSettings;
  };
}
```

### **2. 自動最適化**

```typescript
// 自動最適化システム
export class AutoOptimizationSystem {
  async runDailyOptimization(tenantId: string): Promise<void> {
    // 1. 使用パターン分析
    const patterns = await this.analyzeUsagePatterns(tenantId);
    
    // 2. 最適化提案生成
    const recommendations = await this.generateOptimizations(patterns);
    
    // 3. 自動適用（設定に基づく）
    await this.applyAutomaticOptimizations(tenantId, recommendations);
    
    // 4. レポート生成・通知
    await this.sendOptimizationReport(tenantId, recommendations);
  }
}
```

---

## 🎯 **期待効果**

### **コスト管理効果**
- **透明性**: 全AI使用量の完全可視化
- **制御**: テナント別制限・予算管理
- **最適化**: 自動コスト削減（平均30%削減）

### **品質向上効果**
- **適応性**: 使用パターンに応じた品質調整
- **効率性**: キャッシュ・バッチ処理による高速化
- **信頼性**: フォールバック機能による安定性

### **ビジネス効果**
- **収益化**: AIクレジット販売による新収益源
- **差別化**: 高度なAI機能による競争優位
- **顧客満足**: 高品質画像による魅力向上

---

**作成者**: hotel-kanri統合管理システム  
**承認**: システム統括責任者  
**関連文書**: AI_IMAGE_ENHANCEMENT_SYSTEM_SPEC.md, UNIFIED_IMAGE_MANAGEMENT_SPEC.md
