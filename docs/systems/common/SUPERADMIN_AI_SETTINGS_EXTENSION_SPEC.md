# ⚙️ SuperAdmin AI設定管理拡張仕様書

**作成日**: 2025年1月19日  
**対象システム**: hotel-common（統合基盤）  
**既存基盤**: hotel-member SuperAdmin設定管理機能  
**優先度**: 🔴 **最高優先度**

---

## 📋 **概要**

既存のSuperAdmin設定管理機能を拡張し、**AIクレジット管理・為替レート設定・画像補正設定**を統合した包括的な管理システムの設計仕様書です。

---

## 🏗️ **既存基盤の活用**

### **1. 既存system_settingsテーブル拡張**

```sql
-- 既存テーブル構造（保持）
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,  -- 'llm', 'smtp', 'storage'
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,           -- 暗号化された値
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category, key)
);

-- 新規カテゴリ追加
INSERT INTO system_settings (category, key, value, description, is_encrypted) VALUES
-- AI設定
('ai_services', 'openai_api_key', 'encrypted_key', 'OpenAI APIキー', true),
('ai_services', 'openai_organization', 'org-xxx', 'OpenAI Organization ID', false),
('ai_services', 'default_model', 'gpt-4-vision-preview', 'デフォルトAIモデル', false),
('ai_services', 'max_tokens_per_request', '4000', '1リクエスト最大トークン数', false),
('ai_services', 'temperature', '0.7', 'AI生成の創造性レベル', false),
('ai_services', 'timeout_seconds', '30', 'API タイムアウト時間', false),

-- 為替・料金設定
('currency', 'usd_jpy_rate', '150.00', 'USD/JPY為替レート', false),
('currency', 'eur_jpy_rate', '165.00', 'EUR/JPY為替レート', false),
('currency', 'auto_update_rates', 'true', '為替レート自動更新', false),
('currency', 'rate_update_interval', '3600', '更新間隔（秒）', false),
('currency', 'rate_api_provider', 'exchangerate-api', '為替API提供者', false),
('currency', 'rate_api_key', 'encrypted_key', '為替API キー', true),

-- AIクレジット料金設定
('ai_pricing', 'credit_base_price_jpy', '10', '1クレジット基本価格（円）', false),
('ai_pricing', 'markup_percentage', '20.0', 'OpenAI料金マークアップ率（%）', false),
('ai_pricing', 'bulk_discount_1000', '10.0', '1000クレジット以上割引率（%）', false),
('ai_pricing', 'bulk_discount_5000', '20.0', '5000クレジット以上割引率（%）', false),
('ai_pricing', 'bulk_discount_10000', '30.0', '10000クレジット以上割引率（%）', false),

-- 画像補正設定
('image_enhancement', 'food_basic_credits', '5', '料理画像基本補正クレジット', false),
('image_enhancement', 'food_premium_credits', '12', '料理画像高品質補正クレジット', false),
('image_enhancement', 'room_basic_credits', '4', '客室画像基本補正クレジット', false),
('image_enhancement', 'room_premium_credits', '10', '客室画像高品質補正クレジット', false),
('image_enhancement', 'facility_basic_credits', '6', '施設画像基本補正クレジット', false),
('image_enhancement', 'facility_premium_credits', '15', '施設画像高品質補正クレジット', false),
('image_enhancement', 'cache_duration_hours', '24', '処理結果キャッシュ時間', false),
('image_enhancement', 'max_image_size_mb', '10', '最大画像サイズ（MB）', false),

-- システム制限設定
('system_limits', 'daily_credit_limit_basic', '50', 'BASIC プラン日次制限', false),
('system_limits', 'daily_credit_limit_standard', '200', 'STANDARD プラン日次制限', false),
('system_limits', 'daily_credit_limit_premium', '1000', 'PREMIUM プラン日次制限', false),
('system_limits', 'monthly_credit_limit_basic', '500', 'BASIC プラン月次制限', false),
('system_limits', 'monthly_credit_limit_standard', '2000', 'STANDARD プラン月次制限', false),
('system_limits', 'monthly_credit_limit_premium', '10000', 'PREMIUM プラン月次制限', false);
```

### **2. 既存SuperAdmin権限システム拡張**

```typescript
// 既存権限に追加
interface SuperAdminPermissions {
  // 既存権限（保持）
  system_management: boolean;
  tenant_management: boolean;
  agent_management: boolean;
  
  // 新規AI関連権限
  ai_settings_management: boolean;
  ai_credit_management: boolean;
  currency_rate_management: boolean;
  image_enhancement_settings: boolean;
  ai_usage_analytics: boolean;
}
```

---

## 🎛️ **SuperAdmin管理画面拡張**

### **1. AI設定管理セクション**

```typescript
// SuperAdmin AI設定管理UI
interface AISettingsManagementUI {
  // OpenAI API設定
  openaiSettings: {
    apiKey: EncryptedInput;
    organizationId: TextInput;
    defaultModel: SelectInput<'gpt-4-vision-preview' | 'gpt-4' | 'gpt-3.5-turbo'>;
    maxTokens: NumberInput;
    temperature: SliderInput<0, 1>;
    timeout: NumberInput;
    testConnection: Button; // API接続テスト
  };
  
  // 画像補正設定
  imageEnhancementSettings: {
    categoryPricing: {
      food: {
        basicCredits: NumberInput;
        premiumCredits: NumberInput;
        professionalCredits: NumberInput;
      };
      room: {
        basicCredits: NumberInput;
        premiumCredits: NumberInput;
        professionalCredits: NumberInput;
      };
      facility: {
        basicCredits: NumberInput;
        premiumCredits: NumberInput;
        professionalCredits: NumberInput;
      };
    };
    processingSettings: {
      cacheHours: NumberInput;
      maxImageSizeMB: NumberInput;
      batchProcessingEnabled: ToggleInput;
      fallbackEnabled: ToggleInput;
    };
  };
  
  // システム制限設定
  systemLimits: {
    planLimits: {
      basic: {
        dailyCredits: NumberInput;
        monthlyCredits: NumberInput;
        perRequestCredits: NumberInput;
      };
      standard: {
        dailyCredits: NumberInput;
        monthlyCredits: NumberInput;
        perRequestCredits: NumberInput;
      };
      premium: {
        dailyCredits: NumberInput;
        monthlyCredits: NumberInput;
        perRequestCredits: NumberInput;
      };
    };
  };
}
```

### **2. 為替レート管理セクション**

```typescript
// 為替レート管理UI
interface CurrencyRateManagementUI {
  // 現在レート表示
  currentRates: {
    usdJpy: {
      rate: DisplayValue;
      lastUpdated: DisplayValue;
      source: DisplayValue;
      trend: TrendIndicator; // 上昇・下降・横ばい
    };
    eurJpy: {
      rate: DisplayValue;
      lastUpdated: DisplayValue;
      source: DisplayValue;
      trend: TrendIndicator;
    };
  };
  
  // レート設定
  rateSettings: {
    autoUpdate: ToggleInput;
    updateInterval: SelectInput<'300' | '900' | '1800' | '3600' | '7200'>; // 秒
    apiProvider: SelectInput<'exchangerate-api' | 'fixer' | 'currencylayer' | 'manual'>;
    apiKey: EncryptedInput;
    manualRates: {
      usdJpy: NumberInput;
      eurJpy: NumberInput;
    };
    testRateAPI: Button; // API接続テスト
  };
  
  // レート履歴
  rateHistory: {
    chart: LineChart; // 過去30日の推移
    table: DataTable; // 詳細履歴
    export: Button; // CSV エクスポート
  };
  
  // 影響分析
  impactAnalysis: {
    revenueImpact: {
      currentMonth: DisplayValue;
      projectedMonth: DisplayValue;
      yearToDate: DisplayValue;
    };
    tenantImpact: {
      affectedTenants: DisplayValue;
      averageImpact: DisplayValue;
      topImpacted: DataTable;
    };
  };
}
```

### **3. AIクレジット料金管理セクション**

```typescript
// AIクレジット料金管理UI
interface AICreditPricingUI {
  // 基本料金設定
  basePricing: {
    creditBasePrice: NumberInput; // 円
    markupPercentage: SliderInput<0, 100>;
    bulkDiscounts: {
      tier1000: NumberInput; // %
      tier5000: NumberInput; // %
      tier10000: NumberInput; // %
    };
  };
  
  // プラン別設定
  planPricing: {
    basic: {
      monthlyPrice: NumberInput;
      includedCredits: NumberInput;
      overageRate: NumberInput;
    };
    standard: {
      monthlyPrice: NumberInput;
      includedCredits: NumberInput;
      overageRate: NumberInput;
    };
    premium: {
      monthlyPrice: NumberInput;
      includedCredits: NumberInput;
      overageRate: NumberInput;
    };
  };
  
  // 料金シミュレーター
  pricingSimulator: {
    inputs: {
      monthlyImages: NumberInput;
      qualityMix: {
        basic: SliderInput<0, 100>;
        standard: SliderInput<0, 100>;
        premium: SliderInput<0, 100>;
      };
    };
    outputs: {
      totalCredits: DisplayValue;
      monthlyCost: DisplayValue;
      recommendedPlan: DisplayValue;
      savings: DisplayValue;
    };
  };
  
  // 収益分析
  revenueAnalytics: {
    monthlyRevenue: DisplayValue;
    creditsSold: DisplayValue;
    averageRevenuePerTenant: DisplayValue;
    topRevenueGenerators: DataTable;
  };
}
```

---

## 🔧 **API拡張設計**

### **1. SuperAdmin設定管理API拡張**

```typescript
// 既存API拡張
interface SuperAdminSettingsAPI {
  // 既存エンドポイント（保持）
  'GET /api/superadmin/settings': ExistingSettingsResponse;
  'PUT /api/superadmin/settings': ExistingSettingsRequest;
  
  // 新規AI設定エンドポイント
  'GET /api/superadmin/ai-settings': {
    response: {
      openai: OpenAISettings;
      imageEnhancement: ImageEnhancementSettings;
      systemLimits: SystemLimitsSettings;
    };
  };
  
  'PUT /api/superadmin/ai-settings': {
    request: Partial<AISettingsRequest>;
    response: AISettingsResponse;
  };
  
  'POST /api/superadmin/ai-settings/test-connection': {
    request: { provider: 'openai'; apiKey: string; };
    response: { success: boolean; latency: number; error?: string; };
  };
  
  // 為替レート管理エンドポイント
  'GET /api/superadmin/currency-rates': {
    response: {
      current: CurrencyRates;
      history: RateHistory[];
      settings: RateSettings;
    };
  };
  
  'PUT /api/superadmin/currency-rates/settings': {
    request: RateSettingsRequest;
    response: RateSettingsResponse;
  };
  
  'POST /api/superadmin/currency-rates/update': {
    request: { force?: boolean; };
    response: { updated: boolean; newRates: CurrencyRates; };
  };
  
  'POST /api/superadmin/currency-rates/test-api': {
    request: { provider: string; apiKey: string; };
    response: { success: boolean; sampleRates: CurrencyRates; };
  };
  
  // AIクレジット料金管理エンドポイント
  'GET /api/superadmin/ai-pricing': {
    response: {
      basePricing: BasePricingSettings;
      planPricing: PlanPricingSettings;
      analytics: PricingAnalytics;
    };
  };
  
  'PUT /api/superadmin/ai-pricing': {
    request: PricingSettingsRequest;
    response: PricingSettingsResponse;
  };
  
  'POST /api/superadmin/ai-pricing/simulate': {
    request: PricingSimulationRequest;
    response: PricingSimulationResponse;
  };
}
```

### **2. 設定変更通知システム**

```typescript
// 設定変更時の自動通知・適用
export class SuperAdminSettingsNotificationSystem {
  /**
   * 設定変更時の影響範囲通知
   */
  async notifySettingsChange(
    category: SettingsCategory,
    changes: SettingsChange[]
  ): Promise<void> {
    
    // 1. 影響範囲分析
    const impact = await this.analyzeImpact(category, changes);
    
    // 2. 関連システムに通知
    await Promise.all([
      this.notifyHotelSaaS(impact.saasImpact),
      this.notifyHotelPMS(impact.pmsImpact),
      this.notifyHotelMember(impact.memberImpact)
    ]);
    
    // 3. テナントへの影響通知
    if (impact.tenantImpact.length > 0) {
      await this.notifyAffectedTenants(impact.tenantImpact);
    }
    
    // 4. 管理者への変更完了通知
    await this.notifyAdmins({
      category,
      changes,
      impact,
      appliedAt: new Date()
    });
  }
  
  /**
   * 為替レート変更の自動適用
   */
  async applyCurrencyRateChanges(newRates: CurrencyRates): Promise<void> {
    // 1. 全テナントの料金再計算
    await this.recalculateTenantPricing(newRates);
    
    // 2. 進行中の請求への影響確認
    await this.checkBillingImpact(newRates);
    
    // 3. 価格表示の更新
    await this.updatePriceDisplays(newRates);
    
    // 4. 分析データの更新
    await this.updateRevenueAnalytics(newRates);
  }
  
  /**
   * AIクレジット料金変更の適用
   */
  async applyAICreditPricingChanges(
    newPricing: AICreditPricing
  ): Promise<void> {
    // 1. 既存テナントへの影響分析
    const impact = await this.analyzePricingImpact(newPricing);
    
    // 2. 段階的適用（新規契約から）
    await this.scheduleGradualPricingUpdate(newPricing, impact);
    
    // 3. テナント通知（事前告知）
    await this.notifyPricingChanges(impact.affectedTenants, newPricing);
    
    // 4. 収益予測の更新
    await this.updateRevenueForecasts(newPricing);
  }
}
```

---

## 📊 **監視・分析機能**

### **1. リアルタイム監視ダッシュボード**

```typescript
// SuperAdmin監視ダッシュボード
interface SuperAdminMonitoringDashboard {
  // AI使用量監視
  aiUsageMonitoring: {
    realTimeMetrics: {
      activeRequests: number;
      requestsPerMinute: number;
      averageProcessingTime: number;
      errorRate: number;
    };
    costMetrics: {
      hourlySpend: number;
      dailySpend: number;
      monthlySpend: number;
      projectedMonthlySpend: number;
    };
    systemHealth: {
      openaiApiStatus: 'healthy' | 'degraded' | 'down';
      processingQueueLength: number;
      cacheHitRate: number;
      fallbackActivations: number;
    };
  };
  
  // 為替レート監視
  currencyMonitoring: {
    rateAlerts: {
      significantChanges: RateAlert[];
      thresholdBreaches: RateAlert[];
      apiFailures: RateAlert[];
    };
    impactMetrics: {
      revenueImpact: number;
      affectedTenants: number;
      priceAdjustmentsNeeded: number;
    };
  };
  
  // テナント影響分析
  tenantImpactAnalysis: {
    highUsageTenants: TenantUsageData[];
    costOptimizationOpportunities: OptimizationRecommendation[];
    supportTicketTrends: SupportTicketData[];
  };
}
```

### **2. 自動アラートシステム**

```typescript
// 自動アラート設定
interface SuperAdminAlertSystem {
  // AI関連アラート
  aiAlerts: {
    highCostAlert: {
      threshold: number; // 時間当たりコスト
      recipients: string[];
      escalation: EscalationRule[];
    };
    apiFailureAlert: {
      failureRate: number; // %
      duration: number; // 分
      action: 'notify' | 'fallback' | 'suspend';
    };
    unusualUsageAlert: {
      deviationThreshold: number; // 標準偏差
      comparisonPeriod: 'hour' | 'day' | 'week';
    };
  };
  
  // 為替レートアラート
  currencyAlerts: {
    significantChange: {
      threshold: number; // %
      timeframe: number; // 分
    };
    apiFailure: {
      retryAttempts: number;
      fallbackToManual: boolean;
    };
    revenueImpact: {
      threshold: number; // 円
      notificationLevel: 'info' | 'warning' | 'critical';
    };
  };
}
```

---

## 🔐 **セキュリティ強化**

### **1. 設定値暗号化**

```typescript
// 機密設定の暗号化管理
export class SecureSettingsManager {
  /**
   * 機密設定の暗号化保存
   */
  async encryptAndStore(
    category: string,
    key: string,
    value: string
  ): Promise<void> {
    
    // 1. AES-256-GCM暗号化
    const encrypted = await this.encrypt(value);
    
    // 2. データベース保存
    await this.database.query(`
      INSERT INTO system_settings (category, key, value, is_encrypted)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (category, key) 
      DO UPDATE SET value = $3, updated_at = NOW()
    `, [category, key, encrypted]);
    
    // 3. 監査ログ記録
    await this.auditLog.record({
      action: 'SETTING_UPDATED',
      category,
      key,
      encrypted: true,
      timestamp: new Date()
    });
  }
  
  /**
   * 機密設定の復号化取得
   */
  async decryptAndRetrieve(
    category: string,
    key: string
  ): Promise<string> {
    
    // 1. データベース取得
    const result = await this.database.query(`
      SELECT value, is_encrypted FROM system_settings
      WHERE category = $1 AND key = $2
    `, [category, key]);
    
    if (!result.rows[0]) {
      throw new Error(`Setting not found: ${category}.${key}`);
    }
    
    // 2. 復号化（必要に応じて）
    const { value, is_encrypted } = result.rows[0];
    return is_encrypted ? await this.decrypt(value) : value;
  }
}
```

### **2. 変更履歴・監査ログ**

```sql
-- 設定変更履歴テーブル
CREATE TABLE system_settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id INTEGER NOT NULL REFERENCES system_settings(id),
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL, -- SuperAdmin user ID
  change_reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 設定アクセスログ
CREATE TABLE system_settings_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'READ', 'UPDATE', 'DELETE'
  accessed_by UUID NOT NULL,
  ip_address VARCHAR(45),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 **実装計画**

### **Phase 1: 基盤拡張（Week 1-2）**
- [ ] 既存system_settingsテーブルへの新規カテゴリ追加
- [ ] SuperAdmin権限システム拡張
- [ ] 暗号化・セキュリティ機能強化
- [ ] 基本API エンドポイント実装

### **Phase 2: UI実装（Week 2-3）**
- [ ] AI設定管理画面実装
- [ ] 為替レート管理画面実装
- [ ] AIクレジット料金管理画面実装
- [ ] リアルタイム監視ダッシュボード

### **Phase 3: 自動化・通知（Week 3-4）**
- [ ] 設定変更通知システム実装
- [ ] 為替レート自動更新機能
- [ ] 自動アラートシステム実装
- [ ] 影響分析・レポート機能

### **Phase 4: 統合テスト（Week 4-5）**
- [ ] 全システム統合テスト
- [ ] セキュリティ監査
- [ ] パフォーマンステスト
- [ ] 運用マニュアル整備

---

## 🎯 **期待効果**

### **運用効率化**
- **一元管理**: 全AI・為替設定の統一管理
- **自動化**: 為替レート更新・影響分析の自動化
- **監視強化**: リアルタイム監視・アラート機能

### **コスト最適化**
- **透明性**: 全AIコストの完全可視化
- **制御**: 動的料金調整・制限管理
- **予測**: 収益・コスト予測の高精度化

### **セキュリティ向上**
- **暗号化**: 機密設定の完全暗号化
- **監査**: 全変更履歴の完全記録
- **アクセス制御**: 権限別アクセス制限

---

**作成者**: hotel-kanri統合管理システム  
**承認**: システム統括責任者  
**関連文書**: AI_CREDIT_MANAGEMENT_SYSTEM_SPEC.md, SYSTEM_ADMIN_SPEC.md
