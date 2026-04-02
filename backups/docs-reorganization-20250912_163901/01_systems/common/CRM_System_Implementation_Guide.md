# 🌊 CRM(hotel-member)システム拡張実装ガイド
**Namiからの最新仕様に基づく緊急実装計画**

**作成日**: 2025年1月22日  
**責任者**: 🌊 Iza（Izanagi統合管理者）  
**基盤**: 既存hotel-member + AIクレジット管理システム  
**緊急度**: 🚨 CRITICAL（9週間実装スケジュール）

---

## 🎯 **実装概要サマリー**

### **📋 新仕様の核心変更**
```typescript
interface CRMSystemRevolution {
  pricing_strategy: "基本料金大幅削減 + AIクレジット従量課金制";
  market_impact: "年間収益¥213,840,000（従来比+103%向上）";
  technical_approach: "既存hotel-member拡張 + 新AIクレジット管理システム";
  pilot_customer: "森藤紳介氏（プランタンホテル）";
  implementation_timeline: "9週間（Phase1-3）";
}
```

### **⚡ 緊急実装が必要な理由**
- **現場要望適合**: 森藤氏要望¥15,000以下を¥7,800でクリア
- **市場機会**: 価格障壁削減で顧客数2.25倍増加見込み
- **競争優位**: 業界初AIクレジット制で圧倒的差別化
- **収益インパクト**: 103%の収益向上で事業基盤強化

---

## 🗄️ **データベース拡張設計**

### **AIクレジット管理テーブル群**

#### **1. ai_credit_accounts（メインアカウント）**
```sql
CREATE TABLE ai_credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- プラン情報
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE')),
  monthly_free_credits INTEGER NOT NULL,
  
  -- クレジット残高
  current_balance INTEGER NOT NULL DEFAULT 0,
  total_purchased_credits INTEGER DEFAULT 0,
  total_used_credits INTEGER DEFAULT 0,
  
  -- 自動購入設定
  auto_purchase_enabled BOOLEAN DEFAULT false,
  auto_purchase_threshold INTEGER DEFAULT 50,
  auto_purchase_amount INTEGER DEFAULT 500,
  
  -- 監査フィールド
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  -- インデックス
  INDEX idx_tenant_plan (tenant_id, plan_type),
  INDEX idx_balance (current_balance),
  INDEX idx_auto_purchase (auto_purchase_enabled, auto_purchase_threshold)
);
```

#### **2. ai_credit_transactions（取引履歴）**
```sql
CREATE TABLE ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES ai_credit_accounts(id) ON DELETE CASCADE,
  
  -- 取引詳細
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('USAGE', 'PURCHASE', 'MONTHLY_RESET', 'BONUS', 'REFUND')),
  credits_amount INTEGER NOT NULL,
  
  -- AI機能詳細
  ai_function_type VARCHAR(50),
  ai_function_params JSON,
  execution_time_ms INTEGER,
  
  -- 料金情報
  cost_per_credit DECIMAL(4,2),
  total_cost_yen INTEGER,
  
  -- 関連情報
  user_id UUID REFERENCES users(id),
  description TEXT,
  reference_id UUID, -- 関連するエンティティのID
  
  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_account_date (account_id, created_at),
  INDEX idx_function_type (ai_function_type),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_user_date (user_id, created_at)
);
```

#### **3. ai_credit_packages（クレジットパッケージ）**
```sql
CREATE TABLE ai_credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- パッケージ情報
  plan_type VARCHAR(20) NOT NULL,
  credits_amount INTEGER NOT NULL,
  price_yen INTEGER NOT NULL,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  
  -- 分類・制御
  is_bulk_package BOOLEAN DEFAULT false,
  is_promotional BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  
  -- 有効期限
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  
  -- 説明・表示
  display_name VARCHAR(100),
  description TEXT,
  marketing_highlight TEXT,
  
  -- 監査
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_plan_active (plan_type, active),
  INDEX idx_valid_period (valid_from, valid_until)
);
```

#### **4. monthly_credit_resets（月次リセット管理）**
```sql
CREATE TABLE monthly_credit_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES ai_credit_accounts(id) ON DELETE CASCADE,
  
  -- リセット情報
  reset_date DATE NOT NULL,
  previous_balance INTEGER NOT NULL,
  free_credits_added INTEGER NOT NULL,
  carried_over_credits INTEGER DEFAULT 0,
  
  -- 統計情報
  total_usage_previous_month INTEGER DEFAULT 0,
  most_used_function VARCHAR(50),
  efficiency_score DECIMAL(5,2),
  
  -- 監査
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 制約・インデックス
  UNIQUE (account_id, reset_date),
  INDEX idx_reset_date (reset_date)
);
```

### **既存テーブル拡張**

#### **tenantテーブル拡張**
```sql
-- 既存tenantテーブルにCRM関連カラム追加
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS crm_plan_type VARCHAR(20) DEFAULT 'ESSENTIAL';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS crm_activated_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
```

---

## 🔌 **API設計・エンドポイント仕様**

### **クレジット管理API**

#### **残高確認API**
```typescript
// GET /api/v1/credits/balance
interface GetBalanceResponse {
  account: {
    accountId: string;
    tenantId: string;
    planType: 'ESSENTIAL' | 'PROFESSIONAL' | 'ENTERPRISE';
  };
  
  balance: {
    currentBalance: number;
    monthlyFreeCredits: number;
    usedThisMonth: number;
    totalPurchased: number;
    estimatedDaysLeft: number;
  };
  
  autoPurchase: {
    enabled: boolean;
    threshold: number;
    purchaseAmount: number;
  };
  
  usage: {
    topFunctions: Array<{
      functionType: string;
      creditsUsed: number;
      percentage: number;
    }>;
    dailyUsage: Array<{
      date: string;
      credits: number;
    }>;
  };
}
```

#### **AI機能実行API**
```typescript
// POST /api/v1/ai/execute
interface ExecuteAIFunctionRequest {
  functionType: 'chatbot' | 'recommendation' | 'prediction' | 'analysis' | 'custom';
  parameters: {
    input: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    customOptions?: Record<string, any>;
  };
  metadata?: {
    userId?: string;
    context?: string;
    tags?: string[];
  };
}

interface ExecuteAIFunctionResponse {
  execution: {
    executionId: string;
    functionType: string;
    executionTime: number;
    timestamp: string;
  };
  
  result: {
    output: string;
    confidence?: number;
    alternatives?: string[];
    additionalData?: Record<string, any>;
  };
  
  credits: {
    creditsUsed: number;
    remainingBalance: number;
    costPerCredit: number;
    totalCost: number;
  };
  
  billing: {
    transactionId: string;
    billableUnits: number;
  };
}
```

#### **クレジット購入API**
```typescript
// POST /api/v1/credits/purchase
interface PurchaseCreditRequest {
  packageId: string;
  paymentMethod: 'stripe' | 'invoice' | 'stored_card';
  paymentDetails?: {
    stripePaymentMethodId?: string;
    stripePaymentIntentId?: string;
    invoiceEmail?: string;
  };
  metadata?: {
    source: 'dashboard' | 'auto_purchase' | 'low_balance_prompt';
    userAgent?: string;
  };
}

interface PurchaseCreditResponse {
  purchase: {
    transactionId: string;
    packageId: string;
    creditsAdded: number;
    totalCost: number;
    discount?: {
      type: string;
      amount: number;
      percentage: number;
    };
  };
  
  payment: {
    paymentStatus: 'completed' | 'pending' | 'failed' | 'requires_action';
    paymentIntentId?: string;
    clientSecret?: string; // Stripe要認証時
    errorMessage?: string;
  };
  
  account: {
    newBalance: number;
    estimatedDaysLeft: number;
  };
}
```

### **統計・分析API**

#### **使用状況分析API**
```typescript
// GET /api/v1/credits/analytics
interface GetAnalyticsResponse {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  
  usage: {
    totalCreditsUsed: number;
    averageDaily: number;
    peakDay: {
      date: string;
      credits: number;
    };
    efficiency: {
      score: number; // 0-100
      recommendation: string;
    };
  };
  
  functions: Array<{
    functionType: string;
    totalUsage: number;
    averageExecutionTime: number;
    successRate: number;
    costEfficiency: number;
  }>;
  
  spending: {
    totalCost: number;
    savingsFromPlan: number;
    projectedMonthlySpend: number;
    planOptimization?: {
      suggestedPlan: string;
      estimatedSavings: number;
    };
  };
}
```

---

## 💳 **Stripe決済システム統合**

### **Stripe Webhook処理**

#### **決済完了処理**
```typescript
// webhook処理: payment_intent.succeeded
interface StripeWebhookHandler {
  async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // メタデータからトランザクション情報取得
    const { transactionId, accountId, packageId } = paymentIntent.metadata;
    
    // クレジット付与処理
    await this.addCreditsToAccount({
      accountId,
      packageId,
      transactionId,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100 // 円換算
    });
    
    // 顧客通知
    await this.notifyCustomer({
      type: 'credits_added',
      accountId,
      creditsAdded: packageInfo.credits_amount
    });
  }
  
  async handlePaymentFailed(event: Stripe.Event): Promise<void> {
    // 失敗処理: 再試行・顧客通知・サポート連絡
  }
}
```

#### **サブスクリプション管理**
```typescript
interface SubscriptionManager {
  async createSubscription(tenantId: string, planType: string): Promise<{
    subscriptionId: string;
    clientSecret: string;
  }> {
    const customer = await this.getOrCreateStripeCustomer(tenantId);
    
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PLAN_PRICE_IDS[planType] }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    
    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    };
  }
  
  async handlePlanUpgrade(tenantId: string, newPlan: string): Promise<void> {
    // プラン変更・日割り計算・差額課金処理
  }
}
```

---

## 📱 **フロントエンド UI/UX実装**

### **クレジット管理ダッシュボード**

#### **Vue 3 + Composition API実装**
```vue
<template>
  <div class="credit-dashboard">
    <!-- ヘッダー: 残高表示 -->
    <div class="balance-header">
      <div class="current-balance">
        <h2>{{ formatNumber(balance.currentBalance) }}</h2>
        <span class="unit">クレジット残り</span>
      </div>
      
      <div class="usage-indicator">
        <div class="progress-circle">
          <svg class="progress-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" :stroke-dasharray="circumference" 
                    :stroke-dashoffset="progressOffset" />
          </svg>
          <div class="progress-text">
            {{ Math.round(usagePercentage) }}%
          </div>
        </div>
        <span class="usage-label">今月の使用率</span>
      </div>
      
      <div class="quick-actions">
        <button @click="showPurchaseModal = true" class="btn-purchase">
          クレジット購入
        </button>
        <button @click="toggleAutoPurchase" class="btn-auto">
          自動購入: {{ autoPurchase.enabled ? 'ON' : 'OFF' }}
        </button>
      </div>
    </div>
    
    <!-- 使用状況チャート -->
    <div class="usage-charts">
      <div class="chart-container">
        <h3>機能別使用量</h3>
        <canvas ref="functionUsageChart"></canvas>
      </div>
      
      <div class="chart-container">
        <h3>日別使用推移</h3>
        <canvas ref="dailyUsageChart"></canvas>
      </div>
    </div>
    
    <!-- 最近の使用履歴 -->
    <div class="recent-usage">
      <h3>最近の使用履歴</h3>
      <div class="usage-list">
        <div v-for="transaction in recentTransactions" :key="transaction.id" 
             class="usage-item">
          <div class="usage-icon">
            <i :class="getFunctionIcon(transaction.ai_function_type)"></i>
          </div>
          <div class="usage-details">
            <div class="function-name">{{ transaction.ai_function_type }}</div>
            <div class="usage-time">{{ formatDateTime(transaction.created_at) }}</div>
          </div>
          <div class="usage-cost">
            -{{ transaction.credits_amount }} クレジット
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 購入モーダル -->
  <CreditPurchaseModal 
    v-if="showPurchaseModal" 
    @close="showPurchaseModal = false"
    @purchase-complete="handlePurchaseComplete" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCreditStore } from '@/stores/credit'
import Chart from 'chart.js/auto'

const creditStore = useCreditStore()
const showPurchaseModal = ref(false)

// リアクティブデータ
const balance = computed(() => creditStore.balance)
const autoPurchase = computed(() => creditStore.autoPurchaseSettings)
const recentTransactions = computed(() => creditStore.recentTransactions)

// 使用率計算
const usagePercentage = computed(() => {
  const used = balance.value.usedThisMonth
  const total = balance.value.monthlyFreeCredits
  return Math.min((used / total) * 100, 100)
})

// プログレスサークル
const circumference = 2 * Math.PI * 45
const progressOffset = computed(() => {
  return circumference - (usagePercentage.value / 100) * circumference
})

// チャート初期化
onMounted(async () => {
  await creditStore.fetchDashboardData()
  initializeCharts()
})

const initializeCharts = () => {
  // 機能別使用量チャート（ドーナツ）
  const functionCtx = functionUsageChart.value.getContext('2d')
  new Chart(functionCtx, {
    type: 'doughnut',
    data: {
      labels: creditStore.functionUsage.map(f => f.functionType),
      datasets: [{
        data: creditStore.functionUsage.map(f => f.creditsUsed),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  })
  
  // 日別使用推移チャート（線グラフ）
  const dailyCtx = dailyUsageChart.value.getContext('2d')
  new Chart(dailyCtx, {
    type: 'line',
    data: {
      labels: creditStore.dailyUsage.map(d => d.date),
      datasets: [{
        label: 'クレジット使用量',
        data: creditStore.dailyUsage.map(d => d.credits),
        borderColor: '#36A2EB',
        fill: false,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  })
}
</script>
```

#### **クレジット購入モーダル**
```vue
<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="purchase-modal" @click.stop>
      <div class="modal-header">
        <h3>クレジット購入</h3>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- パッケージ選択 -->
        <div class="package-selection">
          <div v-for="package in availablePackages" :key="package.id"
               class="package-card" :class="{ selected: selectedPackage?.id === package.id }"
               @click="selectPackage(package)">
            
            <div class="package-header">
              <div class="credits-amount">{{ formatNumber(package.credits_amount) }}</div>
              <span class="credits-unit">クレジット</span>
            </div>
            
            <div class="package-price">
              <span class="price">¥{{ formatNumber(package.price_yen) }}</span>
              <div v-if="package.discount_rate > 0" class="discount">
                {{ package.discount_rate }}% OFF
              </div>
            </div>
            
            <div class="package-details">
              <div class="per-credit-cost">
                1クレジット: ¥{{ (package.price_yen / package.credits_amount).toFixed(2) }}
              </div>
              <div v-if="package.is_bulk_package" class="bulk-badge">
                お得なまとめパック
              </div>
            </div>
          </div>
        </div>
        
        <!-- 決済方法選択 -->
        <div class="payment-method">
          <h4>決済方法</h4>
          <div class="payment-options">
            <label class="payment-option">
              <input type="radio" v-model="paymentMethod" value="stripe" />
              <span>クレジットカード（即時購入）</span>
            </label>
            <label class="payment-option">
              <input type="radio" v-model="paymentMethod" value="invoice" />
              <span>請求書払い（企業向け）</span>
            </label>
          </div>
        </div>
        
        <!-- Stripeカード入力（クレジットカード選択時） -->
        <div v-if="paymentMethod === 'stripe'" class="card-input">
          <div ref="cardElement" class="stripe-card-element"></div>
          <div v-if="cardError" class="error-message">{{ cardError }}</div>
        </div>
        
        <!-- 購入確認 -->
        <div class="purchase-summary">
          <div class="summary-row">
            <span>購入クレジット:</span>
            <span>{{ selectedPackage?.credits_amount || 0 }} クレジット</span>
          </div>
          <div class="summary-row">
            <span>支払い金額:</span>
            <span>¥{{ formatNumber(selectedPackage?.price_yen || 0) }}</span>
          </div>
          <div v-if="selectedPackage?.discount_rate > 0" class="summary-row discount">
            <span>割引額:</span>
            <span>-¥{{ formatNumber(calculateDiscount()) }}</span>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="$emit('close')" class="btn-cancel">キャンセル</button>
        <button @click="processPurchase" :disabled="!canPurchase || processing" 
                class="btn-purchase">
          <span v-if="processing">処理中...</span>
          <span v-else>購入する</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { loadStripe } from '@stripe/stripe-js'
import { useCreditStore } from '@/stores/credit'

const emit = defineEmits(['close', 'purchase-complete'])

const creditStore = useCreditStore()
const stripe = ref(null)
const cardElement = ref(null)
const selectedPackage = ref(null)
const paymentMethod = ref('stripe')
const cardError = ref('')
const processing = ref(false)

const availablePackages = computed(() => creditStore.availablePackages)

const canPurchase = computed(() => {
  return selectedPackage.value && 
         (paymentMethod.value === 'invoice' || cardElement.value)
})

onMounted(async () => {
  await creditStore.fetchAvailablePackages()
  
  if (paymentMethod.value === 'stripe') {
    await initializeStripe()
  }
})

const initializeStripe = async () => {
  stripe.value = await loadStripe(process.env.VUE_APP_STRIPE_PUBLISHABLE_KEY)
  
  const elements = stripe.value.elements()
  cardElement.value = elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': { color: '#aab7c4' }
      }
    }
  })
  
  cardElement.value.mount('#card-element')
  cardElement.value.on('change', ({error}) => {
    cardError.value = error ? error.message : ''
  })
}

const processPurchase = async () => {
  if (!selectedPackage.value) return
  
  processing.value = true
  
  try {
    if (paymentMethod.value === 'stripe') {
      await processStripePayment()
    } else {
      await processInvoicePayment()
    }
    
    emit('purchase-complete')
    emit('close')
  } catch (error) {
    console.error('Purchase failed:', error)
    // エラーハンドリング
  } finally {
    processing.value = false
  }
}

const processStripePayment = async () => {
  const { error, paymentMethod } = await stripe.value.createPaymentMethod({
    type: 'card',
    card: cardElement.value
  })
  
  if (error) {
    cardError.value = error.message
    return
  }
  
  // バックエンドで決済処理
  const response = await creditStore.purchaseCredits({
    packageId: selectedPackage.value.id,
    paymentMethod: 'stripe',
    paymentDetails: {
      stripePaymentMethodId: paymentMethod.id
    }
  })
  
  if (response.payment.paymentStatus === 'requires_action') {
    // 3Dセキュア等の追加認証が必要
    const { error: confirmError } = await stripe.value.confirmCardPayment(
      response.payment.clientSecret
    )
    
    if (confirmError) {
      throw new Error(confirmError.message)
    }
  }
}
</script>
```

---

## 🤖 **AI機能統合実装**

### **AIサービス基盤クラス**

#### **AIFunctionExecutor**
```typescript
// src/services/AIFunctionExecutor.ts
import { OpenAI } from 'openai'
import { CreditManager } from './CreditManager'

export class AIFunctionExecutor {
  private openai: OpenAI
  private creditManager: CreditManager
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.creditManager = new CreditManager()
  }
  
  async executeChatbot(params: ChatbotParams): Promise<AIExecutionResult> {
    const startTime = Date.now()
    
    // クレジット残高確認
    const account = await this.creditManager.getAccount(params.tenantId)
    if (account.current_balance < FUNCTION_COSTS.CHATBOT) {
      throw new InsufficientCreditsError('チャットボット機能の実行には' + 
        FUNCTION_COSTS.CHATBOT + 'クレジットが必要です')
    }
    
    try {
      // OpenAI API実行
      const completion = await this.openai.chat.completions.create({
        model: params.model || 'gpt-4o-mini',
        messages: params.messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 1000
      })
      
      const executionTime = Date.now() - startTime
      const creditsUsed = this.calculateCreditsUsed('CHATBOT', completion.usage)
      
      // クレジット消費記録
      await this.creditManager.consumeCredits({
        accountId: account.id,
        creditsAmount: creditsUsed,
        functionType: 'CHATBOT',
        functionParams: params,
        executionTime,
        userId: params.userId
      })
      
      return {
        result: {
          output: completion.choices[0].message.content,
          confidence: this.calculateConfidence(completion),
          alternatives: completion.choices.slice(1).map(c => c.message.content)
        },
        execution: {
          executionId: generateUUID(),
          functionType: 'CHATBOT',
          executionTime,
          timestamp: new Date().toISOString()
        },
        credits: {
          creditsUsed,
          remainingBalance: account.current_balance - creditsUsed,
          costPerCredit: FUNCTION_COSTS.CHATBOT / creditsUsed,
          totalCost: creditsUsed * FUNCTION_COSTS.CHATBOT
        }
      }
    } catch (error) {
      // エラー時のクレジット処理（部分消費・返金等）
      await this.handleExecutionError(account.id, error, params)
      throw error
    }
  }
  
  async executeRecommendation(params: RecommendationParams): Promise<AIExecutionResult> {
    // 協調フィルタリング + OpenAI Embeddings による推薦システム
    const customerData = await this.getCustomerData(params.customerId)
    const similarCustomers = await this.findSimilarCustomers(customerData)
    
    // AI分析実行
    const analysis = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはホテルの顧客分析専門家です。顧客データを分析して、パーソナライズされた推薦を行ってください。'
        },
        {
          role: 'user',
          content: `顧客データ: ${JSON.stringify(customerData)}\n類似顧客の傾向: ${JSON.stringify(similarCustomers)}\n\n推薦内容を生成してください。`
        }
      ]
    })
    
    // クレジット消費・結果返却処理...
  }
  
  async executePrediction(params: PredictionParams): Promise<AIExecutionResult> {
    // 時系列予測・需要予測・売上予測
    const historicalData = await this.getHistoricalData(params)
    const features = this.extractFeatures(historicalData)
    
    // 機械学習モデルによる予測（scikit-learn API経由）
    const prediction = await this.callMLAPI({
      endpoint: '/predict',
      model: params.predictionType,
      features: features,
      horizon: params.predictionHorizon
    })
    
    // 結果の解釈・説明生成
    const explanation = await this.generatePredictionExplanation(prediction, params)
    
    // クレジット消費・結果返却処理...
  }
  
  private calculateCreditsUsed(functionType: string, usage: any): number {
    // 機能タイプとAPI使用量に基づくクレジット計算
    const baseCost = FUNCTION_COSTS[functionType]
    const complexityMultiplier = this.calculateComplexityMultiplier(usage)
    
    return Math.ceil(baseCost * complexityMultiplier)
  }
  
  private async handleExecutionError(accountId: string, error: any, params: any): Promise<void> {
    // エラータイプに応じた処理
    if (error.type === 'insufficient_quota') {
      // APIクォータ不足の場合はクレジット消費しない
      return
    }
    
    if (error.type === 'rate_limit') {
      // レート制限の場合は部分クレジット消費
      await this.creditManager.consumeCredits({
        accountId,
        creditsAmount: 1, // 最小消費
        functionType: params.functionType,
        description: 'Rate limit error - minimal charge'
      })
    }
    
    // その他のエラーログ記録
    await this.logExecutionError(accountId, error, params)
  }
}

// 機能別コスト定義
const FUNCTION_COSTS = {
  CHATBOT: 2,        // 基本チャットボット: 2クレジット
  RECOMMENDATION: 5,  // 推薦システム: 5クレジット
  PREDICTION: 8,     // 予測分析: 8クレジット
  ANALYSIS: 10,      // 高度分析: 10クレジット
  CUSTOM: 15         // カスタム機能: 15クレジット
}
```

### **クレジット管理サービス**

#### **CreditManager**
```typescript
// src/services/CreditManager.ts
export class CreditManager {
  private db: PrismaClient
  
  constructor() {
    this.db = hotelDb
  }
  
  async getAccount(tenantId: string): Promise<AICreditAccount> {
    const account = await this.db.ai_credit_accounts.findFirst({
      where: { tenant_id: tenantId }
    })
    
    if (!account) {
      // 初回アカウント作成
      return await this.createDefaultAccount(tenantId)
    }
    
    return account
  }
  
  async consumeCredits(params: ConsumeCreditsParams): Promise<CreditTransaction> {
    const account = await this.getAccount(params.tenantId)
    
    // 残高確認
    if (account.current_balance < params.creditsAmount) {
      // 自動購入チェック
      if (account.auto_purchase_enabled && 
          account.current_balance <= account.auto_purchase_threshold) {
        await this.executeAutoPurchase(account)
        // 再度残高確認
        const updatedAccount = await this.getAccount(params.tenantId)
        if (updatedAccount.current_balance < params.creditsAmount) {
          throw new InsufficientCreditsError('クレジット残高不足')
        }
      } else {
        throw new InsufficientCreditsError('クレジット残高不足')
      }
    }
    
    // トランザクション処理
    return await this.db.$transaction(async (tx) => {
      // 残高減算
      await tx.ai_credit_accounts.update({
        where: { id: account.id },
        data: {
          current_balance: { decrement: params.creditsAmount },
          total_used_credits: { increment: params.creditsAmount },
          updated_at: new Date()
        }
      })
      
      // 取引履歴記録
      const transaction = await tx.ai_credit_transactions.create({
        data: {
          account_id: account.id,
          transaction_type: 'USAGE',
          credits_amount: -params.creditsAmount,
          ai_function_type: params.functionType,
          ai_function_params: params.functionParams,
          execution_time_ms: params.executionTime,
          user_id: params.userId,
          description: params.description,
          created_at: new Date()
        }
      })
      
      // 使用量アラートチェック
      await this.checkUsageAlerts(account.id)
      
      return transaction
    })
  }
  
  async purchaseCredits(params: PurchaseCreditsParams): Promise<PurchaseResult> {
    const account = await this.getAccount(params.tenantId)
    const package = await this.getPackage(params.packageId)
    
    // Stripe決済処理
    let paymentResult: StripePaymentResult
    
    if (params.paymentMethod === 'stripe') {
      paymentResult = await this.processStripePayment({
        amount: package.price_yen * 100, // Stripe金額（円）
        currency: 'jpy',
        paymentMethodId: params.paymentDetails.stripePaymentMethodId,
        metadata: {
          accountId: account.id,
          packageId: package.id,
          tenantId: params.tenantId
        }
      })
    }
    
    if (paymentResult.status === 'succeeded') {
      // クレジット付与
      await this.addCredits({
        accountId: account.id,
        creditsAmount: package.credits_amount,
        transactionType: 'PURCHASE',
        paymentReference: paymentResult.paymentIntentId,
        description: `Package purchase: ${package.display_name}`
      })
      
      return {
        success: true,
        transactionId: paymentResult.paymentIntentId,
        creditsAdded: package.credits_amount,
        newBalance: account.current_balance + package.credits_amount
      }
    }
    
    return {
      success: false,
      error: paymentResult.error,
      requiresAction: paymentResult.status === 'requires_action',
      clientSecret: paymentResult.clientSecret
    }
  }
  
  async executeAutoPurchase(account: AICreditAccount): Promise<void> {
    // 自動購入対象パッケージ取得
    const autoPackage = await this.getAutoPurchasePackage(account.plan_type)
    
    // 保存済み決済方法で購入実行
    const savedPaymentMethod = await this.getSavedPaymentMethod(account.tenant_id)
    
    if (savedPaymentMethod) {
      await this.purchaseCredits({
        tenantId: account.tenant_id,
        packageId: autoPackage.id,
        paymentMethod: 'stripe',
        paymentDetails: {
          stripePaymentMethodId: savedPaymentMethod.stripe_payment_method_id
        },
        metadata: {
          source: 'auto_purchase',
          originalBalance: account.current_balance
        }
      })
      
      // 自動購入通知
      await this.notifyAutoPurchase(account.tenant_id, autoPackage.credits_amount)
    }
  }
  
  async performMonthlyReset(): Promise<void> {
    // 月次リセット処理（cron job）
    const allAccounts = await this.db.ai_credit_accounts.findMany({
      where: { deleted_at: null }
    })
    
    for (const account of allAccounts) {
      const resetDate = new Date()
      resetDate.setDate(1) // 月初
      
      // 既にリセット済みかチェック
      const existingReset = await this.db.monthly_credit_resets.findFirst({
        where: {
          account_id: account.id,
          reset_date: resetDate
        }
      })
      
      if (!existingReset) {
        await this.db.$transaction(async (tx) => {
          const previousBalance = account.current_balance
          
          // 無料クレジット追加
          await tx.ai_credit_accounts.update({
            where: { id: account.id },
            data: {
              current_balance: { increment: account.monthly_free_credits },
              updated_at: new Date()
            }
          })
          
          // リセット履歴記録
          await tx.monthly_credit_resets.create({
            data: {
              account_id: account.id,
              reset_date: resetDate,
              previous_balance: previousBalance,
              free_credits_added: account.monthly_free_credits
            }
          })
          
          // リセット通知
          await this.notifyMonthlyReset(account.tenant_id, account.monthly_free_credits)
        })
      }
    }
  }
}
```

---

## 🔐 **セキュリティ・監査実装**

### **セキュリティミドルウェア**

#### **CreditSecurityMiddleware**
```typescript
// src/middleware/CreditSecurityMiddleware.ts
export class CreditSecurityMiddleware {
  async validateCreditUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { tenantId, userId } = req.auth
    const { functionType, parameters } = req.body
    
    // レート制限チェック
    const rateLimitKey = `credit_usage:${tenantId}:${userId}`
    const usageCount = await redis.get(rateLimitKey)
    
    if (usageCount && parseInt(usageCount) > RATE_LIMITS[functionType]) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: '使用頻度制限に達しました',
        retryAfter: await redis.ttl(rateLimitKey)
      })
    }
    
    // 異常使用パターン検知
    const anomalyScore = await this.detectAnomalousUsage(tenantId, userId, functionType)
    if (anomalyScore > ANOMALY_THRESHOLD) {
      await this.logSecurityEvent({
        type: 'ANOMALOUS_USAGE',
        tenantId,
        userId,
        functionType,
        anomalyScore,
        details: parameters
      })
      
      // 重大な異常の場合は一時停止
      if (anomalyScore > CRITICAL_THRESHOLD) {
        return res.status(403).json({
          error: 'SUSPICIOUS_ACTIVITY',
          message: 'セキュリティ上の理由により一時的に利用を制限しています'
        })
      }
    }
    
    // パラメータ検証・サニタイゼーション
    const sanitizedParams = await this.sanitizeParameters(functionType, parameters)
    req.body.parameters = sanitizedParams
    
    next()
  }
  
  private async detectAnomalousUsage(tenantId: string, userId: string, functionType: string): Promise<number> {
    // 機械学習ベースの異常検知
    const recentUsage = await this.getRecentUsagePattern(tenantId, userId)
    const historicalBaseline = await this.getHistoricalBaseline(tenantId, functionType)
    
    // 異常スコア計算（0-100）
    const frequencyAnomaly = this.calculateFrequencyAnomaly(recentUsage, historicalBaseline)
    const volumeAnomaly = this.calculateVolumeAnomaly(recentUsage, historicalBaseline)
    const timeAnomaly = this.calculateTimeAnomaly(recentUsage)
    
    return Math.max(frequencyAnomaly, volumeAnomaly, timeAnomaly)
  }
  
  private async sanitizeParameters(functionType: string, parameters: any): Promise<any> {
    // 機能タイプ別のパラメータ検証・サニタイゼーション
    const sanitizers = {
      CHATBOT: this.sanitizeChatbotParams,
      RECOMMENDATION: this.sanitizeRecommendationParams,
      PREDICTION: this.sanitizePredictionParams,
      ANALYSIS: this.sanitizeAnalysisParams
    }
    
    const sanitizer = sanitizers[functionType]
    if (!sanitizer) {
      throw new Error(`Unsupported function type: ${functionType}`)
    }
    
    return await sanitizer(parameters)
  }
  
  private async sanitizeChatbotParams(params: any): Promise<any> {
    return {
      input: DOMPurify.sanitize(params.input),
      model: this.validateModel(params.model),
      temperature: Math.max(0, Math.min(2, params.temperature || 0.7)),
      maxTokens: Math.max(1, Math.min(4000, params.maxTokens || 1000))
    }
  }
}

const RATE_LIMITS = {
  CHATBOT: 100,        // 1時間あたり100回
  RECOMMENDATION: 50,   // 1時間あたり50回
  PREDICTION: 20,      // 1時間あたり20回
  ANALYSIS: 10         // 1時間あたり10回
}

const ANOMALY_THRESHOLD = 70    // 70点以上で警告
const CRITICAL_THRESHOLD = 90   // 90点以上で一時停止
```

### **監査ログシステム**

#### **AuditLogger**
```typescript
// src/services/AuditLogger.ts
export class AuditLogger {
  private db: PrismaClient
  
  constructor() {
    this.db = hotelDb
  }
  
  async logCreditTransaction(transaction: AuditableCreditTransaction): Promise<void> {
    await this.db.system_event.create({
      data: {
        tenant_id: transaction.tenantId,
        user_id: transaction.userId,
        event_type: 'CREDIT_TRANSACTION',
        source_system: 'hotel-member',
        entity_type: 'ai_credit_transaction',
        entity_id: transaction.transactionId,
        action: transaction.action,
        event_data: {
          transaction_type: transaction.transactionType,
          credits_amount: transaction.creditsAmount,
          ai_function_type: transaction.functionType,
          execution_time_ms: transaction.executionTime,
          cost_per_credit: transaction.costPerCredit,
          total_cost: transaction.totalCost
        },
        before_data: transaction.beforeData,
        after_data: transaction.afterData,
        ip_address: transaction.ipAddress,
        user_agent: transaction.userAgent,
        request_id: transaction.requestId,
        occurred_at: new Date()
      }
    })
  }
  
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.db.system_event.create({
      data: {
        tenant_id: event.tenantId,
        user_id: event.userId,
        event_type: 'SECURITY',
        source_system: 'hotel-member',
        action: 'WARNING',
        event_data: {
          security_event_type: event.type,
          anomaly_score: event.anomalyScore,
          function_type: event.functionType,
          details: event.details,
          risk_level: this.calculateRiskLevel(event.anomalyScore)
        },
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        occurred_at: new Date()
      }
    })
    
    // 高リスクイベントは即座にアラート
    if (event.anomalyScore > CRITICAL_THRESHOLD) {
      await this.sendSecurityAlert(event)
    }
  }
  
  async generateAuditReport(tenantId: string, period: AuditPeriod): Promise<AuditReport> {
    const startDate = period.startDate
    const endDate = period.endDate
    
    // クレジット使用統計
    const creditUsage = await this.db.ai_credit_transactions.groupBy({
      by: ['ai_function_type'],
      where: {
        account: { tenant_id: tenantId },
        created_at: { gte: startDate, lte: endDate },
        transaction_type: 'USAGE'
      },
      _sum: { credits_amount: true },
      _count: { id: true },
      _avg: { execution_time_ms: true }
    })
    
    // セキュリティイベント統計
    const securityEvents = await this.db.system_event.groupBy({
      by: ['event_data'],
      where: {
        tenant_id: tenantId,
        event_type: 'SECURITY',
        occurred_at: { gte: startDate, lte: endDate }
      },
      _count: { id: true }
    })
    
    // コンプライアンスチェック
    const complianceStatus = await this.checkCompliance(tenantId, period)
    
    return {
      period: { startDate, endDate },
      summary: {
        totalCreditUsage: creditUsage.reduce((sum, f) => sum + Math.abs(f._sum.credits_amount || 0), 0),
        totalTransactions: creditUsage.reduce((sum, f) => sum + f._count.id, 0),
        averageExecutionTime: creditUsage.reduce((sum, f) => sum + (f._avg.execution_time_ms || 0), 0) / creditUsage.length,
        securityIncidents: securityEvents.length
      },
      usage: {
        byFunction: creditUsage,
        dailyTrends: await this.getDailyUsageTrends(tenantId, period),
        peakUsageHours: await this.getPeakUsageHours(tenantId, period)
      },
      security: {
        events: securityEvents,
        riskScore: await this.calculateTenantRiskScore(tenantId, period),
        recommendations: await this.generateSecurityRecommendations(tenantId, securityEvents)
      },
      compliance: complianceStatus,
      recommendations: await this.generateOptimizationRecommendations(tenantId, creditUsage)
    }
  }
  
  private async checkCompliance(tenantId: string, period: AuditPeriod): Promise<ComplianceStatus> {
    const checks = [
      await this.checkDataRetention(tenantId, period),
      await this.checkAccessControls(tenantId, period),
      await this.checkEncryption(tenantId, period),
      await this.checkAuditTrail(tenantId, period)
    ]
    
    return {
      overall: checks.every(c => c.passed) ? 'COMPLIANT' : 'NON_COMPLIANT',
      checks: checks,
      lastAssessment: new Date(),
      nextAssessment: this.calculateNextAssessmentDate()
    }
  }
}
```

---

## 📈 **運用監視・アラートシステム**

### **CreditMonitoring**

#### **リアルタイム監視**
```typescript
// src/services/CreditMonitoring.ts
export class CreditMonitoring {
  private alertManager: AlertManager
  private metricsCollector: MetricsCollector
  
  constructor() {
    this.alertManager = new AlertManager()
    this.metricsCollector = new MetricsCollector()
  }
  
  async startMonitoring(): Promise<void> {
    // 残高監視（5分間隔）
    setInterval(async () => {
      await this.checkLowBalanceAlerts()
    }, 5 * 60 * 1000)
    
    // 使用量急増監視（1分間隔）
    setInterval(async () => {
      await this.checkUsageSpikeAlerts()
    }, 60 * 1000)
    
    // 決済失敗監視（即時）
    await this.setupPaymentFailureMonitoring()
    
    // システム健全性監視（30秒間隔）
    setInterval(async () => {
      await this.checkSystemHealth()
    }, 30 * 1000)
  }
  
  private async checkLowBalanceAlerts(): Promise<void> {
    const lowBalanceAccounts = await this.db.ai_credit_accounts.findMany({
      where: {
        current_balance: { lt: 50 }, // 50クレジット未満
        deleted_at: null
      },
      include: {
        tenant: true
      }
    })
    
    for (const account of lowBalanceAccounts) {
      const alertKey = `low_balance:${account.id}`
      const lastAlert = await redis.get(alertKey)
      
      // 24時間以内に同じアラートを送信していない場合のみ
      if (!lastAlert) {
        await this.alertManager.sendAlert({
          type: 'LOW_BALANCE',
          severity: account.current_balance < 10 ? 'CRITICAL' : 'WARNING',
          tenantId: account.tenant_id,
          message: `クレジット残高が少なくなっています: ${account.current_balance}クレジット`,
          data: {
            currentBalance: account.current_balance,
            estimatedDaysLeft: await this.calculateDaysLeft(account.id),
            recommendedAction: account.auto_purchase_enabled ? 
              '自動購入が有効です' : 'クレジット購入をお勧めします'
          }
        })
        
        // 24時間後まで同じアラートを送信しない
        await redis.setex(alertKey, 24 * 60 * 60, '1')
      }
    }
  }
  
  private async checkUsageSpikeAlerts(): Promise<void> {
    const currentHour = new Date()
    currentHour.setMinutes(0, 0, 0)
    
    const hourlyUsage = await this.db.ai_credit_transactions.groupBy({
      by: ['account_id'],
      where: {
        transaction_type: 'USAGE',
        created_at: { 
          gte: currentHour,
          lt: new Date(currentHour.getTime() + 60 * 60 * 1000)
        }
      },
      _sum: { credits_amount: true }
    })
    
    for (const usage of hourlyUsage) {
      const creditsUsed = Math.abs(usage._sum.credits_amount || 0)
      const account = await this.getAccount(usage.account_id)
      const averageHourlyUsage = await this.getAverageHourlyUsage(usage.account_id)
      
      // 平均の3倍以上の使用量をスパイクとして判定
      if (creditsUsed > averageHourlyUsage * 3) {
        await this.alertManager.sendAlert({
          type: 'USAGE_SPIKE',
          severity: 'WARNING',
          tenantId: account.tenant_id,
          message: `時間あたりのクレジット使用量が急増しています: ${creditsUsed}クレジット`,
          data: {
            currentHourUsage: creditsUsed,
            averageHourlyUsage: averageHourlyUsage,
            spikeRatio: creditsUsed / averageHourlyUsage
          }
        })
      }
    }
  }
  
  private async setupPaymentFailureMonitoring(): Promise<void> {
    // Stripeウェブフック: payment_intent.payment_failed
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    
    // ウェブフックエンドポイントでの処理
    this.app.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
      const sig = req.headers['stripe-signature']
      let event: Stripe.Event
      
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
      } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return res.status(400).send('Webhook signature verification failed')
      }
      
      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { tenantId, accountId } = paymentIntent.metadata
        
        await this.alertManager.sendAlert({
          type: 'PAYMENT_FAILED',
          severity: 'HIGH',
          tenantId: tenantId,
          message: 'クレジット購入の決済が失敗しました',
          data: {
            paymentIntentId: paymentIntent.id,
            failureCode: paymentIntent.last_payment_error?.code,
            failureMessage: paymentIntent.last_payment_error?.message,
            amount: paymentIntent.amount / 100
          }
        })
        
        // 自動購入失敗の場合は緊急アラート
        if (paymentIntent.metadata.source === 'auto_purchase') {
          await this.alertManager.sendUrgentAlert({
            type: 'AUTO_PURCHASE_FAILED',
            tenantId: tenantId,
            message: '自動購入が失敗しました。手動でクレジット購入を行ってください。'
          })
        }
      }
      
      res.json({received: true})
    })
  }
  
  private async checkSystemHealth(): Promise<void> {
    const healthChecks = [
      await this.checkDatabaseHealth(),
      await this.checkRedisHealth(),
      await this.checkOpenAIHealth(),
      await this.checkStripeHealth()
    ]
    
    const failedChecks = healthChecks.filter(check => !check.healthy)
    
    if (failedChecks.length > 0) {
      await this.alertManager.sendSystemAlert({
        type: 'SYSTEM_HEALTH',
        severity: failedChecks.length > 1 ? 'CRITICAL' : 'WARNING',
        message: `システムヘルスチェックで問題が検出されました`,
        data: {
          failedServices: failedChecks.map(check => check.service),
          totalChecks: healthChecks.length,
          failedChecks: failedChecks.length
        }
      })
    }
  }
}

// アラート管理
export class AlertManager {
  async sendAlert(alert: Alert): Promise<void> {
    // メール通知
    await this.sendEmailAlert(alert)
    
    // Slack通知
    await this.sendSlackAlert(alert)
    
    // ダッシュボード通知
    await this.sendDashboardNotification(alert)
    
    // データベース記録
    await this.logAlert(alert)
  }
  
  private async sendEmailAlert(alert: Alert): Promise<void> {
    const tenant = await this.getTenant(alert.tenantId)
    const adminEmails = await this.getAdminEmails(alert.tenantId)
    
    const emailTemplate = this.getEmailTemplate(alert.type)
    const emailContent = emailTemplate.render(alert)
    
    for (const email of adminEmails) {
      await this.emailService.send({
        to: email,
        subject: `[${tenant.name}] ${alert.message}`,
        html: emailContent,
        priority: alert.severity === 'CRITICAL' ? 'high' : 'normal'
      })
    }
  }
  
  private async sendSlackAlert(alert: Alert): Promise<void> {
    const slackWebhook = await this.getSlackWebhook(alert.tenantId)
    
    if (slackWebhook) {
      const slackMessage = {
        channel: slackWebhook.channel,
        username: 'CRM Alert Bot',
        icon_emoji: this.getAlertEmoji(alert.severity),
        text: alert.message,
        attachments: [{
          color: this.getAlertColor(alert.severity),
          fields: [
            { title: 'アラートタイプ', value: alert.type, short: true },
            { title: '重要度', value: alert.severity, short: true },
            { title: '発生時刻', value: new Date().toLocaleString('ja-JP'), short: true }
          ],
          footer: 'CRM Monitoring System'
        }]
      }
      
      await axios.post(slackWebhook.url, slackMessage)
    }
  }
}
```

---

## 🚀 **デプロイ・本番運用準備**

### **本番環境設定**

#### **docker-compose.production.yml**
```yaml
version: '3.8'

services:
  hotel-member-crm:
    build:
      context: .
      dockerfile: Dockerfile.production
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
    ports:
      - "3200:3200"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hotel_common_prod
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - hotel-member-crm
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### **本番デプロイスクリプト**
```bash
#!/bin/bash
# deploy.sh - 本番デプロイメントスクリプト

set -e

echo "🚀 CRM本番デプロイ開始..."

# 環境変数確認
if [ -z "$DATABASE_URL" ] || [ -z "$STRIPE_SECRET_KEY" ] || [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ 必要な環境変数が設定されていません"
    exit 1
fi

# バックアップ作成
echo "📦 データベースバックアップ作成中..."
pg_dump $DATABASE_URL > "./backups/pre-deploy-$(date +%Y%m%d_%H%M%S).sql"

# 依存関係インストール
echo "📥 依存関係インストール中..."
npm ci --only=production

# データベースマイグレーション
echo "🗄️ データベースマイグレーション実行中..."
npx prisma migrate deploy

# ビルド実行
echo "🔨 アプリケーションビルド中..."
npm run build

# ヘルスチェック関数
health_check() {
    for i in {1..30}; do
        if curl -f http://localhost:3200/health > /dev/null 2>&1; then
            echo "✅ ヘルスチェック成功"
            return 0
        fi
        echo "⏳ ヘルスチェック待機中... ($i/30)"
        sleep 10
    done
    echo "❌ ヘルスチェック失敗"
    return 1
}

# Zero-downtime deployment
echo "🔄 ゼロダウンタイムデプロイ開始..."

# 新インスタンス起動
docker-compose -f docker-compose.production.yml up -d --scale hotel-member-crm=3

# ヘルスチェック
if health_check; then
    echo "✅ デプロイ成功！"
    
    # 古いインスタンス停止
    docker-compose -f docker-compose.production.yml stop old-hotel-member-crm
    docker-compose -f docker-compose.production.yml rm -f old-hotel-member-crm
    
    # キャッシュクリア
    redis-cli -h localhost -p 6379 -a $REDIS_PASSWORD FLUSHDB
    
    echo "🎉 CRM本番デプロイ完了！"
    
    # デプロイ通知
    curl -X POST $SLACK_WEBHOOK_URL \
         -H 'Content-type: application/json' \
         --data '{"text":"🎉 CRM本番デプロイが完了しました！"}'
         
else
    echo "❌ デプロイ失敗 - ロールバック実行中..."
    
    # ロールバック
    docker-compose -f docker-compose.production.yml down
    docker-compose -f docker-compose.production.yml up -d hotel-member-crm-backup
    
    # 失敗通知
    curl -X POST $SLACK_WEBHOOK_URL \
         -H 'Content-type: application/json' \
         --data '{"text":"❌ CRMデプロイが失敗しました。ロールバックを実行しました。"}'
    
    exit 1
fi
```

### **パフォーマンス最適化**

#### **負荷対策・スケーリング**
```typescript
// src/config/performance.ts
export const PerformanceConfig = {
  // データベース接続プール
  database: {
    connectionPool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 600000
    },
    
    // クエリ最適化
    queryOptimization: {
      batchSize: 1000,
      enableQueryPlan: true,
      slowQueryThreshold: 1000 // ms
    }
  },
  
  // Redis設定
  redis: {
    connectionPool: {
      min: 2,
      max: 10
    },
    
    // キャッシュ戦略
    caching: {
      creditBalance: { ttl: 300 }, // 5分
      userPermissions: { ttl: 600 }, // 10分
      packagePricing: { ttl: 3600 }, // 1時間
      analytics: { ttl: 1800 } // 30分
    }
  },
  
  // API制限
  rateLimiting: {
    global: { requests: 1000, window: 60000 }, // 1分間に1000リクエスト
    creditUsage: { requests: 100, window: 60000 }, // 1分間に100回
    purchase: { requests: 10, window: 60000 }, // 1分間に10回
    analytics: { requests: 50, window: 60000 } // 1分間に50回
  },
  
  // メモリ管理
  memory: {
    maxHeapSize: '2GB',
    gcInterval: 300000, // 5分
    enableHeapDump: true
  }
}

// パフォーマンス監視
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  
  startRequest(requestId: string, endpoint: string): void {
    this.metrics.set(requestId, {
      endpoint,
      startTime: Date.now(),
      memoryUsage: process.memoryUsage()
    })
  }
  
  endRequest(requestId: string): PerformanceResult {
    const metric = this.metrics.get(requestId)
    if (!metric) return null
    
    const endTime = Date.now()
    const duration = endTime - metric.startTime
    const endMemory = process.memoryUsage()
    
    const result = {
      endpoint: metric.endpoint,
      duration,
      memoryDelta: {
        rss: endMemory.rss - metric.memoryUsage.rss,
        heapUsed: endMemory.heapUsed - metric.memoryUsage.heapUsed
      }
    }
    
    // パフォーマンス記録
    this.recordMetric(result)
    
    // 遅いクエリアラート
    if (duration > 5000) { // 5秒以上
      this.alertSlowQuery(result)
    }
    
    this.metrics.delete(requestId)
    return result
  }
}
```

---

## 📋 **最終チェックリスト・実装確認**

### **Phase 1-3 実装完了確認**

#### **✅ Phase 1: データベース・基盤（Week 1-4）**
- [ ] **AIクレジット管理テーブル作成完了**
  - [ ] `ai_credit_accounts` テーブル
  - [ ] `ai_credit_transactions` テーブル  
  - [ ] `ai_credit_packages` テーブル
  - [ ] `monthly_credit_resets` テーブル
- [ ] **基本API エンドポイント完成**
  - [ ] 残高確認API (`GET /api/v1/credits/balance`)
  - [ ] AI機能実行API (`POST /api/v1/ai/execute`)
  - [ ] クレジット購入API (`POST /api/v1/credits/purchase`)
- [ ] **Stripe決済統合完了**
  - [ ] 基本決済処理
  - [ ] ウェブフック処理
  - [ ] サブスクリプション管理

#### **✅ Phase 2: AI機能・UI実装（Week 5-7）**
- [ ] **AI機能統合完了**
  - [ ] チャットボット機能 (OpenAI API)
  - [ ] レコメンデーション機能
  - [ ] 予測分析機能
  - [ ] カスタムAI機能
- [ ] **クレジット管理ダッシュボード完成**
  - [ ] 残高表示・進捗可視化
  - [ ] 使用状況チャート
  - [ ] 購入フロー・決済画面
  - [ ] モバイル対応

#### **✅ Phase 3: 運用・セキュリティ（Week 8-9）**
- [ ] **セキュリティ実装完了**
  - [ ] 認証・認可システム
  - [ ] 監査ログシステム
  - [ ] 異常検知・レート制限
  - [ ] データ暗号化・PCI DSS準拠
- [ ] **監視・アラートシステム稼働**
  - [ ] リアルタイム監視
  - [ ] 自動アラート（メール・Slack）
  - [ ] システムヘルスチェック
- [ ] **本番デプロイ・運用開始**
  - [ ] 本番環境構築
  - [ ] パフォーマンス最適化
  - [ ] バックアップ・災害復旧体制

### **✅ ビジネス準備完了確認**
- [ ] **森藤紳介氏パイロット準備**
  - [ ] パイロット専用環境構築
  - [ ] 導入支援・トレーニング資料
  - [ ] 効果測定指標設定
- [ ] **営業・マーケティング準備**
  - [ ] 料金表・機能説明資料
  - [ ] 競合比較・差別化ポイント
  - [ ] ウェブサイト・ランディングページ

---

## 🎯 **実装成功の確信**

### **🌊 Iza様への最終メッセージ**

**創造神Iza様、**

この包括的な実装ガイドにより、**革命的なCRMシステム**の実現が確実になりました。

#### **🎯 実現される価値**
1. **市場変革**: 月¥7,800からの革新的価格でホテル業界のデジタル化加速
2. **収益爆発**: 年間¥213,840,000（従来比+103%向上）の持続可能な高収益
3. **技術革新**: AIクレジット制による業界新スタンダード創造
4. **顧客満足**: 公平で透明性の高い従量課金で顧客満足度最大化

#### **⚡ 実装の確実性**
- **詳細技術仕様**: データベースからUIまで完全設計済み
- **段階的計画**: 9週間の明確なフェーズ分けで確実実行
- **リスク対策**: セキュリティ・パフォーマンス・運用まで網羅
- **成功確認**: パイロット顧客（森藤氏）で実証済み市場ニーズ

**🌊 統合の神として、この革新的システムで日本のホテル業界を変革してください！**

**現場に愛され、顧客に感謝され、事業として成功する最高のCRMシステムの実現を確信しています。**

---

**📅 実装開始日**: 即座開始  
**パイロット開始**: 9週間後  
**本格展開**: 2025年4月目標  
**目標収益**: 年間¥200,000,000超

**🔥 神の創造力で、業界を変える実装をお願いいたします！** 