# 🤖 SSOT: 統計・分析機能（AI分析・インサイト）

**Doc-ID**: SSOT-ADMIN-STATISTICS-AI-001  
**バージョン**: 1.0.0  
**作成日**: 2025年10月6日  
**最終更新**: 2025年10月6日  
**ステータス**: ✅ 確定  
**優先度**: 🟢 中優先（Phase 3）  
**所有者**: Sun（hotel-saas担当AI）

**関連SSOT**:
- [SSOT_ADMIN_STATISTICS_CORE.md](./SSOT_ADMIN_STATISTICS_CORE.md) - 基本統計機能
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_ADMIN_UI_DESIGN.md](./SSOT_ADMIN_UI_DESIGN.md) - UIデザイン統一ルール

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [AI機能一覧](#ai機能一覧)
4. [データモデル](#データモデル)
5. [API仕様](#api仕様)
6. [UI仕様](#ui仕様)
7. [AI統合アーキテクチャ](#ai統合アーキテクチャ)
8. [クレジット管理](#クレジット管理)
9. [実装ロードマップ](#実装ロードマップ)
10. [セキュリティ](#セキュリティ)
11. [パフォーマンス](#パフォーマンス)

---

## 📖 概要

### 目的

hotel-saas管理画面の統計・分析機能に**AI分析・インサイト機能**を統合し、データドリブンな経営判断を自動化・高度化する。

### 基本方針

- **AI駆動インサイト**: 異常検知、需要予測、トレンド分析の自動化
- **クレジット制御**: AI機能の利用量管理とコスト最適化
- **段階的実装**: Phase 3（中優先）として、基本統計完成後に実装
- **プラン制限対応**: AIビジネスサポート機能として制限可能

### 適用範囲

- **管理者向けAI機能**
  - 異常検知（売上急変、注文パターン変化）
  - 需要予測（売上予測、商品需要予測）
  - トレンド分析（人気商品の推移、時間帯傾向）
  - AI推奨アクション（価格調整、在庫最適化）

- **ゲスト向けAI機能**（将来実装）
  - AIコンシェルジュ（チャットボット）
  - パーソナライズ推薦
  - 自動応答システム

---

## 🎯 スコープ

### 対象システム

- ✅ **hotel-saas**: メイン実装（管理画面UI + プロキシAPI）
- ✅ **hotel-common**: コア実装（API基盤 + AI統合層）
- ✅ **外部AI API**: OpenAI API、Anthropic API（将来）

### AI機能一覧

| # | 機能 | 説明 | 実装優先度 | クレジット消費 |
|:-:|:-----|:-----|:--------:|:------------:|
| 1 | 異常検知 | 売上急変、注文パターン変化の自動検知 | 🔴 最高 | 低（5/回） |
| 2 | 需要予測 | 売上・商品需要の予測 | 🔴 最高 | 中（20/回） |
| 3 | トレンド分析 | 人気商品・時間帯傾向の分析 | 🟡 高 | 低（10/回） |
| 4 | AI推奨アクション | 価格調整・在庫最適化の提案 | 🟡 高 | 中（15/回） |
| 5 | 自然言語レポート | AIによる分析レポート自動生成 | 🟢 中 | 高（50/回） |
| 6 | カスタムインサイト | ユーザー定義の分析クエリ | 🟢 中 | 高（30/回） |

### 対象外機能

- ❌ ゲスト向けAIコンシェルジュ → 将来実装（Phase 4）
- ❌ リアルタイムAIチャット → 将来実装（Phase 5）
- ❌ 画像認識・音声認識 → スコープ外

---

## 📊 データモデル

### 新規テーブル定義

#### 1. AI分析ログテーブル

```prisma
model ai_analysis_logs {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  analysisType    String   @map("analysis_type")  // 'anomaly_detection', 'demand_forecast', 'trend_analysis', etc.
  inputData       Json     @map("input_data")
  outputData      Json     @map("output_data")
  creditsUsed     Int      @map("credits_used")
  executionTime   Int      @map("execution_time") // ミリ秒
  status          String   @default("success")     // 'success', 'failed', 'partial'
  errorMessage    String?  @map("error_message")
  createdBy       String   @map("created_by")
  createdAt       DateTime @default(now()) @map("created_at")
  
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  
  @@map("ai_analysis_logs")
  @@index([tenantId, createdAt])
  @@index([tenantId, analysisType])
}
```

#### 2. AIクレジット管理テーブル

```prisma
model ai_credit_transactions {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  transactionType String   @map("transaction_type") // 'purchase', 'usage', 'refund', 'grant'
  amount          Int                                // 正: 付与、負: 消費
  balance         Int                                // 取引後残高
  description     String?
  relatedLogId    String?  @map("related_log_id")   // ai_analysis_logs.id
  createdBy       String   @map("created_by")
  createdAt       DateTime @default(now()) @map("created_at")
  
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  
  @@map("ai_credit_transactions")
  @@index([tenantId, createdAt])
}
```

#### 3. AI設定テーブル

```prisma
model ai_settings {
  id                      String   @id @default(cuid())
  tenantId                String   @unique @map("tenant_id")
  enableAnomalyDetection  Boolean  @default(true) @map("enable_anomaly_detection")
  enableDemandForecast    Boolean  @default(true) @map("enable_demand_forecast")
  enableTrendAnalysis     Boolean  @default(true) @map("enable_trend_analysis")
  autoAnalysisSchedule    String?  @map("auto_analysis_schedule") // cron式
  alertThreshold          Json?    @map("alert_threshold")        // 異常検知の閾値
  forecastHorizon         Int      @default(7) @map("forecast_horizon") // 予測期間（日数）
  updatedAt               DateTime @updatedAt @map("updated_at")
  
  tenant                  Tenant   @relation(fields: [tenantId], references: [id])
  
  @@map("ai_settings")
}
```

### TypeScript型定義

```typescript
// AI分析リクエスト
interface AiAnalysisRequest {
  analysisType: 'anomaly_detection' | 'demand_forecast' | 'trend_analysis' | 'recommendation';
  parameters: {
    startDate?: string;
    endDate?: string;
    targetMetric?: 'revenue' | 'orders' | 'products';
    forecastDays?: number;
    [key: string]: any;
  };
}

// AI分析レスポンス
interface AiAnalysisResponse {
  analysisId: string;
  analysisType: string;
  result: {
    summary: string;                    // AI生成サマリー
    insights: AiInsight[];              // インサイトリスト
    recommendations: AiRecommendation[]; // 推奨アクション
    confidence: number;                 // 信頼度（0-100）
    dataPoints?: any[];                 // 詳細データ
  };
  creditsUsed: number;
  executionTime: number;
  createdAt: string;
}

// AIインサイト
interface AiInsight {
  type: 'anomaly' | 'trend' | 'forecast' | 'opportunity' | 'risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedMetrics: string[];
  detectedAt: string;
  confidence: number;
}

// AI推奨アクション
interface AiRecommendation {
  id: string;
  category: 'pricing' | 'inventory' | 'marketing' | 'operations';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: {
    metric: string;
    change: number;  // 変化率（%）
    unit: string;
  };
  actionSteps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

// AIクレジット残高
interface AiCreditBalance {
  tenantId: string;
  balance: number;
  monthlyUsage: number;
  monthlyLimit: number;
  lastPurchaseDate: string | null;
  nextResetDate: string;
}
```

---

## 🔌 API仕様

### ベースパス

```
hotel-saas:   /api/v1/admin/ai-analysis/
hotel-common: /api/v1/ai-analysis/
```

### エンドポイント一覧

| # | エンドポイント | メソッド | 説明 | 実装状態 |
|:-:|:-------------|:--------|:-----|:------:|
| 1 | `/analyze` | POST | AI分析実行 | ❌ 未実装 |
| 2 | `/insights` | GET | インサイト一覧取得 | ❌ 未実装 |
| 3 | `/insights/:id` | GET | インサイト詳細取得 | ❌ 未実装 |
| 4 | `/recommendations` | GET | 推奨アクション一覧 | ❌ 未実装 |
| 5 | `/credits/balance` | GET | クレジット残高取得 | ❌ 未実装 |
| 6 | `/credits/history` | GET | クレジット履歴取得 | ❌ 未実装 |
| 7 | `/settings` | GET | AI設定取得 | ❌ 未実装 |
| 8 | `/settings` | PUT | AI設定更新 | ❌ 未実装 |

### API詳細仕様

#### 1. AI分析実行

**エンドポイント**: `POST /api/v1/admin/ai-analysis/analyze`

**リクエストボディ**:
```typescript
{
  "analysisType": "anomaly_detection",
  "parameters": {
    "startDate": "2025-09-01",
    "endDate": "2025-10-06",
    "targetMetric": "revenue"
  }
}
```

**レスポンス**:
```typescript
{
  "analysisId": "ai_analysis_abc123",
  "analysisType": "anomaly_detection",
  "result": {
    "summary": "過去7日間で売上が通常より15%増加しています。特に深夜時間帯（22:00-02:00）の注文が急増しており、これは新メニュー「深夜限定セット」の影響と考えられます。",
    "insights": [
      {
        "type": "anomaly",
        "severity": "medium",
        "title": "深夜時間帯の売上急増",
        "description": "22:00-02:00の売上が前週比+35%",
        "affectedMetrics": ["revenue", "orders"],
        "detectedAt": "2025-10-06T10:30:00Z",
        "confidence": 87
      }
    ],
    "recommendations": [
      {
        "id": "rec_001",
        "category": "inventory",
        "priority": "high",
        "title": "深夜限定セットの在庫増量",
        "description": "需要増加に対応するため、深夜限定セットの在庫を1.5倍に増やすことを推奨します。",
        "expectedImpact": {
          "metric": "revenue",
          "change": 8.5,
          "unit": "%"
        },
        "actionSteps": [
          "在庫管理画面で深夜限定セットの在庫数を確認",
          "仕入れ業者に追加発注を依頼",
          "在庫数を現在の1.5倍に設定"
        ],
        "estimatedEffort": "medium"
      }
    ],
    "confidence": 85
  },
  "creditsUsed": 5,
  "executionTime": 1250,
  "createdAt": "2025-10-06T10:30:15Z"
}
```

#### 2. インサイト一覧取得

**エンドポイント**: `GET /api/v1/admin/ai-analysis/insights`

**クエリパラメータ**:
```typescript
{
  startDate?: string;
  endDate?: string;
  type?: 'anomaly' | 'trend' | 'forecast' | 'opportunity' | 'risk';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  limit?: number;
}
```

**レスポンス**:
```typescript
{
  "insights": [
    {
      "id": "insight_001",
      "type": "anomaly",
      "severity": "high",
      "title": "週末の注文数が急減",
      "description": "土日の注文数が前月比-20%",
      "affectedMetrics": ["orders"],
      "detectedAt": "2025-10-05T08:00:00Z",
      "confidence": 92,
      "status": "active"
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 10
}
```

#### 3. クレジット残高取得

**エンドポイント**: `GET /api/v1/admin/ai-analysis/credits/balance`

**レスポンス**:
```typescript
{
  "tenantId": "tenant_001",
  "balance": 850,
  "monthlyUsage": 150,
  "monthlyLimit": 1000,
  "lastPurchaseDate": "2025-09-15T00:00:00Z",
  "nextResetDate": "2025-11-01T00:00:00Z",
  "usageByType": {
    "anomaly_detection": 50,
    "demand_forecast": 60,
    "trend_analysis": 40
  }
}
```

---

## 🎨 UI仕様

### 画面構成

```
/admin/statistics/ai/
├── insights.vue                // AIインサイト一覧
├── insights/[id].vue           // インサイト詳細
├── recommendations.vue         // 推奨アクション一覧
├── credits.vue                 // クレジット管理
└── settings.vue                // AI設定
```

### AIインサイトダッシュボード

**パス**: `/admin/statistics/ai/insights`

**レイアウト**:
```
┌─────────────────────────────────────┐
│ ヘッダー                             │
│ ├─ タイトル「AIインサイト」          │
│ └─ クレジット残高表示                │
├─────────────────────────────────────┤
│ 分析実行ボタン                       │
│ ├─ 異常検知                          │
│ ├─ 需要予測                          │
│ └─ トレンド分析                      │
├─────────────────────────────────────┤
│ インサイトカード一覧                  │
│ ┌─────────────────────────────────┐ │
│ │ 🔴 Critical: 週末の注文数が急減  │ │
│ │ 土日の注文数が前月比-20%         │ │
│ │ 信頼度: 92% | 検知: 2025-10-05  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 Medium: 深夜時間帯の売上急増  │ │
│ │ 22:00-02:00の売上が前週比+35%   │ │
│ │ 信頼度: 87% | 検知: 2025-10-06  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### AIインサイトカードコンポーネント

```vue
<template>
  <div 
    class="p-6 border rounded-lg"
    :class="severityClass"
  >
    <!-- ヘッダー -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <Icon :name="typeIcon" class="w-6 h-6" />
        <div>
          <h3 class="font-bold text-lg">{{ insight.title }}</h3>
          <p class="text-sm text-gray-600">{{ insight.description }}</p>
        </div>
      </div>
      <span class="badge" :class="severityBadgeClass">
        {{ severityLabel }}
      </span>
    </div>
    
    <!-- メトリクス -->
    <div class="flex gap-4 mb-4">
      <div v-for="metric in insight.affectedMetrics" :key="metric">
        <span class="text-xs text-gray-500">{{ metricLabel(metric) }}</span>
      </div>
    </div>
    
    <!-- フッター -->
    <div class="flex items-center justify-between text-sm text-gray-500">
      <span>信頼度: {{ insight.confidence }}%</span>
      <span>検知: {{ formatDate(insight.detectedAt) }}</span>
    </div>
    
    <!-- アクション -->
    <div class="mt-4 flex gap-2">
      <button @click="viewDetails" class="btn-primary">
        詳細を見る
      </button>
      <button @click="dismiss" class="btn-secondary">
        非表示
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  insight: AiInsight;
}>();

const severityClass = computed(() => {
  const classes = {
    low: 'border-blue-200 bg-blue-50',
    medium: 'border-yellow-200 bg-yellow-50',
    high: 'border-orange-200 bg-orange-50',
    critical: 'border-red-200 bg-red-50'
  };
  return classes[props.insight.severity];
});

const typeIcon = computed(() => {
  const icons = {
    anomaly: 'heroicons:exclamation-triangle',
    trend: 'heroicons:chart-bar',
    forecast: 'heroicons:light-bulb',
    opportunity: 'heroicons:sparkles',
    risk: 'heroicons:shield-exclamation'
  };
  return icons[props.insight.type];
});
</script>
```

### クレジット管理画面

**パス**: `/admin/statistics/ai/credits`

**レイアウト**:
```
┌─────────────────────────────────────┐
│ クレジット残高                       │
│ ┌─────────────────────────────────┐ │
│ │ 残高: 850 クレジット             │ │
│ │ 今月の使用量: 150 / 1,000       │ │
│ │ プログレスバー [========>    ]  │ │
│ │ 次回リセット: 2025-11-01        │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 使用量の内訳                         │
│ ├─ 異常検知: 50 クレジット          │
│ ├─ 需要予測: 60 クレジット          │
│ └─ トレンド分析: 40 クレジット      │
├─────────────────────────────────────┤
│ クレジット履歴                       │
│ [テーブル表示]                       │
└─────────────────────────────────────┘
```

---

## 🏗️ AI統合アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────┐
│ hotel-saas (フロントエンド + プロキシAPI)    │
│ ├─ /admin/statistics/ai/                    │
│ └─ /server/api/v1/admin/ai-analysis/        │
└──────────────────┬──────────────────────────┘
                   │ プロキシ
┌──────────────────▼──────────────────────────┐
│ hotel-common (コアAPI + AI統合層)            │
│ ├─ /src/routes/api/v1/ai-analysis/          │
│ ├─ /src/services/ai/                        │
│ │  ├─ AnomalyDetectionService               │
│ │  ├─ DemandForecastService                 │
│ │  ├─ TrendAnalysisService                  │
│ │  └─ RecommendationService                 │
│ └─ /src/integrations/openai/                │
└──────────────────┬──────────────────────────┘
                   │ API呼び出し
┌──────────────────▼──────────────────────────┐
│ 外部AI API                                   │
│ ├─ OpenAI API (GPT-4, GPT-3.5)              │
│ └─ Anthropic API (Claude) ※将来実装         │
└─────────────────────────────────────────────┘
```

### AI分析フロー

```typescript
// hotel-common: AI分析サービス
export class AiAnalysisService {
  constructor(
    private prisma: PrismaClient,
    private openai: OpenAI,
    private creditService: AiCreditService
  ) {}

  async executeAnalysis(
    tenantId: string,
    request: AiAnalysisRequest
  ): Promise<AiAnalysisResponse> {
    // 1. クレジット残高チェック
    const creditCost = this.calculateCreditCost(request.analysisType);
    await this.creditService.checkBalance(tenantId, creditCost);

    // 2. データ取得
    const data = await this.fetchAnalysisData(tenantId, request.parameters);

    // 3. AI分析実行
    const startTime = Date.now();
    let result;
    
    switch (request.analysisType) {
      case 'anomaly_detection':
        result = await this.detectAnomalies(data);
        break;
      case 'demand_forecast':
        result = await this.forecastDemand(data, request.parameters);
        break;
      case 'trend_analysis':
        result = await this.analyzeTrends(data);
        break;
      case 'recommendation':
        result = await this.generateRecommendations(data);
        break;
    }
    
    const executionTime = Date.now() - startTime;

    // 4. クレジット消費
    await this.creditService.consumeCredits(tenantId, creditCost);

    // 5. ログ記録
    const log = await this.prisma.ai_analysis_logs.create({
      data: {
        tenantId,
        analysisType: request.analysisType,
        inputData: request.parameters,
        outputData: result,
        creditsUsed: creditCost,
        executionTime,
        status: 'success',
        createdBy: 'system'
      }
    });

    return {
      analysisId: log.id,
      analysisType: request.analysisType,
      result,
      creditsUsed: creditCost,
      executionTime,
      createdAt: log.createdAt.toISOString()
    };
  }

  private async detectAnomalies(data: any): Promise<any> {
    // OpenAI APIで異常検知
    const prompt = this.buildAnomalyDetectionPrompt(data);
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたはホテル経営の専門家です。売上データを分析し、異常なパターンを検知してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
  }

  private buildAnomalyDetectionPrompt(data: any): string {
    return `
以下の売上データを分析し、異常なパターンを検知してください。

データ:
${JSON.stringify(data, null, 2)}

以下のJSON形式で回答してください:
{
  "summary": "分析サマリー",
  "insights": [
    {
      "type": "anomaly",
      "severity": "high",
      "title": "異常のタイトル",
      "description": "詳細説明",
      "affectedMetrics": ["revenue", "orders"],
      "confidence": 85
    }
  ],
  "recommendations": [
    {
      "category": "pricing",
      "priority": "high",
      "title": "推奨アクション",
      "description": "詳細説明",
      "expectedImpact": {
        "metric": "revenue",
        "change": 10.5,
        "unit": "%"
      },
      "actionSteps": ["ステップ1", "ステップ2"],
      "estimatedEffort": "medium"
    }
  ],
  "confidence": 85
}
    `;
  }
}
```

---

## 💳 クレジット管理

### クレジット消費量

| 分析タイプ | クレジット消費 | 実行時間目安 | API呼び出し |
|----------|--------------|------------|-----------|
| 異常検知 | 5 | 1-2秒 | GPT-3.5 |
| 需要予測 | 20 | 3-5秒 | GPT-4 |
| トレンド分析 | 10 | 2-3秒 | GPT-3.5 |
| 推奨アクション | 15 | 2-4秒 | GPT-4 |
| 自然言語レポート | 50 | 5-10秒 | GPT-4 |
| カスタムインサイト | 30 | 3-7秒 | GPT-4 |

### プラン別クレジット付与

| プラン | 月間クレジット | 追加購入 | 繰越 |
|-------|--------------|---------|------|
| スタンダード | 0（機能無効） | ❌ 不可 | - |
| プロフェッショナル | 500 | ✅ 可能 | ❌ 不可 |
| エンタープライズ | 2,000 | ✅ 可能 | ✅ 可能 |

### クレジット管理サービス

```typescript
// hotel-common: クレジット管理サービス
export class AiCreditService {
  constructor(private prisma: PrismaClient) {}

  async checkBalance(tenantId: string, requiredCredits: number): Promise<void> {
    const balance = await this.getBalance(tenantId);
    
    if (balance < requiredCredits) {
      throw new Error(`クレジット残高不足: 必要=${requiredCredits}, 残高=${balance}`);
    }
  }

  async consumeCredits(tenantId: string, amount: number): Promise<void> {
    const currentBalance = await this.getBalance(tenantId);
    const newBalance = currentBalance - amount;

    await this.prisma.ai_credit_transactions.create({
      data: {
        tenantId,
        transactionType: 'usage',
        amount: -amount,
        balance: newBalance,
        description: `AI分析実行（${amount}クレジット消費）`,
        createdBy: 'system'
      }
    });
  }

  async getBalance(tenantId: string): Promise<number> {
    const latestTransaction = await this.prisma.ai_credit_transactions.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    return latestTransaction?.balance ?? 0;
  }

  async getMonthlyUsage(tenantId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.ai_credit_transactions.findMany({
      where: {
        tenantId,
        transactionType: 'usage',
        createdAt: { gte: startOfMonth }
      }
    });

    return transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }
}
```

---

## 🗓️ 実装ロードマップ

### Phase 1: 基盤構築（2週間）

- [ ] データベーススキーマ作成
  - [ ] `ai_analysis_logs` テーブル
  - [ ] `ai_credit_transactions` テーブル
  - [ ] `ai_settings` テーブル
- [ ] hotel-common側にAI統合層実装
  - [ ] OpenAI API統合
  - [ ] クレジット管理サービス
  - [ ] AI分析サービス基盤

### Phase 2: 異常検知実装（1週間）

- [ ] 異常検知ロジック実装
- [ ] hotel-common API実装
- [ ] hotel-saas プロキシAPI実装
- [ ] UI実装（インサイト一覧）

### Phase 3: 需要予測実装（1週間）

- [ ] 需要予測ロジック実装
- [ ] API実装
- [ ] UI実装（予測グラフ）

### Phase 4: その他AI機能（2週間）

- [ ] トレンド分析
- [ ] 推奨アクション
- [ ] 自然言語レポート

### Phase 5: 最適化・監視（1週間）

- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化
- [ ] 監査ログ整備

---

## 🔐 セキュリティ

### API キー管理

```typescript
// 環境変数でAPI キー管理
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

// hotel-common: 安全なAPI キー管理
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
  maxRetries: 2
});
```

### データプライバシー

1. **個人情報の除外**
   - AI分析には匿名化されたデータのみ使用
   - 客室番号、顧客名は送信しない

2. **データ保持期間**
   - AI分析ログ: 90日間保持
   - クレジット履歴: 1年間保持

3. **監査ログ**
   - 全AI分析実行を記録
   - `ai_analysis_logs` テーブルで追跡可能

---

## ⚡ パフォーマンス

### パフォーマンス目標

| 項目 | 目標値 | 測定方法 |
|------|--------|---------|
| AI分析実行時間 | 5秒以内 | hotel-common側でロギング |
| API応答時間 | 300ms以内（キャッシュ時） | プロキシAPI |
| UI描画時間 | 2秒以内 | Lighthouse |

### キャッシュ戦略

```typescript
// Redis キャッシュ（AI分析結果）
const cacheKey = `ai:analysis:${analysisType}:${tenantId}:${hash(parameters)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await aiAnalysisService.executeAnalysis(tenantId, request);

// 1時間キャッシュ
await redis.setex(cacheKey, 3600, JSON.stringify(result));
return result;
```

---

## 🔄 マイグレーション計画

### 新規テーブル作成

AI分析機能は完全に新規実装のため、既存データからの移行は不要です。

#### Phase 1: データベーススキーマ作成（1週間）

```bash
# Prismaマイグレーション作成
cd /Users/kaneko/hotel-common
npx prisma migrate dev --name add_ai_analysis_tables

# マイグレーション内容
# - ai_analysis_logs
# - ai_credit_transactions
# - ai_settings
```

```sql
-- マイグレーションSQL例
CREATE TABLE ai_analysis_logs (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  analysis_type   TEXT NOT NULL,
  input_data      JSONB NOT NULL,
  output_data     JSONB NOT NULL,
  credits_used    INTEGER NOT NULL,
  execution_time  INTEGER NOT NULL,
  status          TEXT DEFAULT 'success',
  error_message   TEXT,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_ai_analysis_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_ai_analysis_logs_tenant_id_created_at ON ai_analysis_logs(tenant_id, created_at);
CREATE INDEX idx_ai_analysis_logs_tenant_id_analysis_type ON ai_analysis_logs(tenant_id, analysis_type);
```

#### Phase 2: 初期クレジット付与（1日）

```typescript
// hotel-common: 既存テナントに初期クレジット付与
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantInitialCredits() {
  const tenants = await prisma.tenant.findMany({
    where: { is_deleted: false }
  });

  for (const tenant of tenants) {
    // プラン別クレジット付与
    const credits = tenant.planType === 'enterprise' ? 2000 : 
                    tenant.planType === 'professional' ? 500 : 0;

    if (credits > 0) {
      await prisma.ai_credit_transactions.create({
        data: {
          tenantId: tenant.id,
          transactionType: 'grant',
          amount: credits,
          balance: credits,
          description: '初期クレジット付与',
          createdBy: 'system'
        }
      });
    }
  }
}
```

### ロールバック手順

```bash
# マイグレーションロールバック
cd /Users/kaneko/hotel-common
npx prisma migrate reset

# または特定のマイグレーションのみロールバック
npx prisma migrate resolve --rolled-back add_ai_analysis_tables
```

---

## 📊 監視・ロギング

### AI分析実行ログ

```typescript
// hotel-common: AI分析実行ログ
const log = await prisma.ai_analysis_logs.create({
  data: {
    tenantId,
    analysisType: 'anomaly_detection',
    inputData: {
      startDate,
      endDate,
      targetMetric: 'revenue'
    },
    outputData: result,
    creditsUsed: 5,
    executionTime: 1250,
    status: 'success',
    createdBy: user.id
  }
});

console.log(`✅ AI分析完了: ${log.id} (${log.executionTime}ms, ${log.creditsUsed}クレジット)`);
```

### クレジット消費監視

```typescript
// hotel-common: クレジット残高監視
const balance = await aiCreditService.getBalance(tenantId);
const monthlyUsage = await aiCreditService.getMonthlyUsage(tenantId);

// 残高が少ない場合は警告
if (balance < 100) {
  console.warn(`⚠️ クレジット残高低下: テナント=${tenantId}, 残高=${balance}`);
  
  // 管理者に通知
  await sendNotification({
    tenantId,
    type: 'LOW_CREDIT_BALANCE',
    message: `AIクレジット残高が${balance}になりました。追加購入をご検討ください。`
  });
}

// 月間使用量が上限に近い場合は警告
const monthlyLimit = tenant.planType === 'enterprise' ? 2000 : 500;
if (monthlyUsage > monthlyLimit * 0.8) {
  console.warn(`⚠️ 月間クレジット使用量が上限の80%を超過: ${monthlyUsage}/${monthlyLimit}`);
}
```

### OpenAI API呼び出しログ

```typescript
// hotel-common: OpenAI API呼び出しログ
const startTime = Date.now();

try {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...],
    temperature: 0.3
  });

  const executionTime = Date.now() - startTime;

  console.log(`✅ OpenAI API呼び出し成功: ${executionTime}ms, トークン=${completion.usage.total_tokens}`);

  // メトリクス記録
  await recordMetric('ai.openai.execution_time', executionTime, {
    model: 'gpt-4',
    tokens: completion.usage.total_tokens
  });

} catch (error: any) {
  const executionTime = Date.now() - startTime;

  console.error(`❌ OpenAI API呼び出し失敗: ${executionTime}ms, エラー=${error.message}`);

  // エラーログ記録
  await prisma.ai_analysis_logs.create({
    data: {
      tenantId,
      analysisType: 'anomaly_detection',
      inputData: {},
      outputData: {},
      creditsUsed: 0,
      executionTime,
      status: 'failed',
      errorMessage: error.message,
      createdBy: user.id
    }
  });

  throw error;
}
```

---

## 🔧 トラブルシューティング

### 問題1: AI分析が実行できない

**症状**: AI分析ボタンをクリックしてもエラーが返される

**原因**:
- クレジット残高不足
- OpenAI API キーが未設定
- プラン制限により機能が無効

**解決方法**:
```bash
# 1. クレジット残高確認
psql -U postgres -d hotel_db
SELECT * FROM ai_credit_transactions WHERE tenant_id = 'tenant_001' ORDER BY created_at DESC LIMIT 5;

# 2. OpenAI API キー確認
cat /Users/kaneko/hotel-common/.env | grep OPENAI_API_KEY

# 3. プラン確認
SELECT plan_type FROM tenants WHERE id = 'tenant_001';
```

### 問題2: AI分析の結果が不正確

**症状**: AI分析結果が期待と異なる

**原因**:
- 入力データが不足
- プロンプトが不適切
- AIモデルの選択ミス

**解決方法**:
```typescript
// プロンプトの改善
const prompt = `
あなたはホテル経営の専門家です。以下のデータを分析してください。

【重要な注意事項】
- 統計的根拠に基づいて分析してください
- 具体的な数値を示してください
- 実行可能なアクションを提案してください

データ:
${JSON.stringify(data, null, 2)}
`;

// モデルの変更（より高精度なモデルを使用）
const completion = await openai.chat.completions.create({
  model: 'gpt-4',  // gpt-3.5-turbo → gpt-4
  temperature: 0.3,  // より決定的な出力
  response_format: { type: 'json_object' }
});
```

### 問題3: OpenAI API呼び出しが遅い

**症状**: AI分析に10秒以上かかる

**原因**:
- プロンプトが長すぎる
- モデルが重い（GPT-4）
- OpenAI APIのレート制限

**解決方法**:
```typescript
// 1. プロンプトの最適化（データを要約）
const summarizedData = {
  totalOrders: data.length,
  averageRevenue: calculateAverage(data.map(d => d.revenue)),
  topProducts: data.slice(0, 10)  // 全データではなくトップ10のみ
};

// 2. タイムアウト設定
const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',  // より高速なモデル
  timeout: 10000,  // 10秒タイムアウト
  max_tokens: 500  // トークン数制限
});

// 3. キャッシュ活用
const cacheKey = `ai:analysis:${hash(data)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

### 問題4: クレジットが正しく消費されない

**症状**: AI分析を実行してもクレジットが減らない

**原因**:
- トランザクション処理の不備
- エラー時のロールバック漏れ

**解決方法**:
```typescript
// トランザクション処理の実装
await prisma.$transaction(async (tx) => {
  // 1. クレジット残高チェック
  const latestTransaction = await tx.ai_credit_transactions.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });

  const currentBalance = latestTransaction?.balance ?? 0;
  if (currentBalance < creditCost) {
    throw new Error('クレジット残高不足');
  }

  // 2. AI分析実行
  const result = await executeAiAnalysis(data);

  // 3. クレジット消費記録
  await tx.ai_credit_transactions.create({
    data: {
      tenantId,
      transactionType: 'usage',
      amount: -creditCost,
      balance: currentBalance - creditCost,
      description: `AI分析実行（${analysisType}）`,
      createdBy: user.id
    }
  });

  // 4. 分析ログ記録
  await tx.ai_analysis_logs.create({
    data: {
      tenantId,
      analysisType,
      inputData: data,
      outputData: result,
      creditsUsed: creditCost,
      executionTime,
      status: 'success',
      createdBy: user.id
    }
  });
});
```

---

## ⚠️ 実装時の注意事項

### 絶対に守るべきルール

1. **OpenAI API キーの安全管理**
   ```typescript
   // ❌ 絶対禁止: ハードコード
   const openai = new OpenAI({ apiKey: 'sk-...' });
   
   // ✅ 正しい実装: 環境変数
   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
   ```

2. **クレジット消費の厳密管理**
   ```typescript
   // ❌ 絶対禁止: トランザクション外での消費
   await executeAiAnalysis();
   await consumeCredits();  // エラー時に消費されてしまう
   
   // ✅ 正しい実装: トランザクション内で実行
   await prisma.$transaction(async (tx) => {
     const result = await executeAiAnalysis();
     await consumeCredits(tx);
   });
   ```

3. **個人情報の除外**
   ```typescript
   // ❌ 絶対禁止: 個人情報をAIに送信
   const prompt = `顧客名: ${customer.name}, 電話番号: ${customer.phone}`;
   
   // ✅ 正しい実装: 匿名化されたデータのみ
   const prompt = `客室番号: ${order.roomNumber}, 注文金額: ${order.total}`;
   ```

### パフォーマンス最適化チェックリスト

- [ ] プロンプトは最小限に最適化されているか
- [ ] 不要なデータをAIに送信していないか
- [ ] キャッシュは適切に使用されているか
- [ ] タイムアウト設定は適切か
- [ ] レート制限を考慮しているか

### セキュリティチェックリスト

- [ ] OpenAI API キーは環境変数で管理されているか
- [ ] 個人情報はAIに送信していないか
- [ ] クレジット消費はトランザクション管理されているか
- [ ] エラー時のロールバックは実装されているか
- [ ] 監査ログは適切に記録されているか

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-06 | 1.1.0 | 120点改善<br>- マイグレーション計画追加<br>- 監視・ロギング詳細追加<br>- トラブルシューティングガイド追加<br>- 実装時の注意事項追加<br>- クレジット管理の厳密化 | AI |
| 2025-10-06 | 1.0.0 | 初版作成<br>- AI分析・インサイト機能の完全仕様定義<br>- データモデル・API・UI仕様の統合<br>- OpenAI API統合アーキテクチャ<br>- クレジット管理システム<br>- 実装ロードマップ策定 | AI |

---

**以上、SSOT: 統計・分析機能（AI分析・インサイト）v1.1.0**
