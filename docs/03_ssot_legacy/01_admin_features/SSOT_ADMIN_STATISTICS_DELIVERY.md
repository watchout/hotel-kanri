# 📢 SSOT: 統計・分析機能（配信スタジオ・A/Bテスト）

**Doc-ID**: SSOT-ADMIN-STATISTICS-DELIVERY-001  
**バージョン**: 1.0.0  
**作成日**: 2025年10月6日  
**最終更新**: 2025年10月6日  
**ステータス**: ✅ 確定  
**優先度**: 🟢 中優先（Phase 4）  
**所有者**: Sun（hotel-saas担当AI）

**関連SSOT**:
- [SSOT_ADMIN_STATISTICS_CORE.md](./SSOT_ADMIN_STATISTICS_CORE.md) - 基本統計機能
- [SSOT_ADMIN_STATISTICS_AI.md](./SSOT_ADMIN_STATISTICS_AI.md) - AI分析・インサイト
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_ADMIN_UI_DESIGN.md](./SSOT_ADMIN_UI_DESIGN.md) - UIデザイン統一ルール

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [機能一覧](#機能一覧)
4. [データモデル](#データモデル)
5. [API仕様](#api仕様)
6. [UI仕様](#ui仕様)
7. [配信スタジオ](#配信スタジオ)
8. [A/Bテスト](#abテスト)
9. [キャンペーン管理](#キャンペーン管理)
10. [実装ロードマップ](#実装ロードマップ)

---

## 📖 概要

### 目的

hotel-saas管理画面で**配信スタジオ・A/Bテスト機能**を提供し、データドリブンなマーケティング施策の実行・効果測定を可能にする。

### 基本方針

- **AIコピー生成**: AI分析結果に基づく自動コピー生成
- **A/Bテスト**: 複数パターンの効果測定
- **配信スケジュール**: 時間指定・条件指定配信
- **効果測定**: リアルタイムCVR・CTR測定

### 適用範囲

- **配信スタジオ**
  - AIコピー生成（商品説明、キャンペーン文言）
  - 配信スケジュール管理
  - 配信履歴・効果測定

- **A/Bテスト**
  - テストパターン作成
  - 自動トラフィック分配
  - 統計的有意性判定
  - 勝者パターン自動適用

- **キャンペーン管理**
  - キャンペーン作成・編集
  - ターゲット設定（客室ランク、時間帯）
  - 効果測定ダッシュボード

---

## 🎯 スコープ

### 対象システム

- ✅ **hotel-saas**: メイン実装（管理画面UI + プロキシAPI）
- ✅ **hotel-common**: コア実装（API基盤 + AI統合層）
- ✅ **外部AI API**: OpenAI API（コピー生成）

### 機能一覧

| # | 機能 | 説明 | 実装優先度 | クレジット消費 |
|:-:|:-----|:-----|:--------:|:------------:|
| 1 | AIコピー生成 | 商品説明・キャンペーン文言の自動生成 | 🔴 最高 | 中（20/回） |
| 2 | 配信スケジュール | 時間指定・条件指定配信 | 🔴 最高 | - |
| 3 | A/Bテスト作成 | テストパターン作成・管理 | 🟡 高 | - |
| 4 | A/Bテスト実行 | 自動トラフィック分配 | 🟡 高 | - |
| 5 | 効果測定 | CVR・CTR・売上測定 | 🟡 高 | - |
| 6 | 勝者パターン適用 | 統計的有意性判定後の自動適用 | 🟢 中 | - |
| 7 | キャンペーン管理 | キャンペーン作成・編集・配信 | 🟢 中 | - |

### 対象外機能

- ❌ メール配信・プッシュ通知 → 将来実装（Phase 5）
- ❌ LINE連携・SNS連携 → スコープ外
- ❌ 外部広告プラットフォーム連携 → スコープ外

---

## 📊 データモデル

### 新規テーブル定義

#### 1. キャンペーンテーブル

```prisma
model campaigns {
  id              String    @id @default(cuid())
  tenantId        String    @map("tenant_id")
  name            String
  description     String?
  campaignType    String    @map("campaign_type")    // 'product_promotion', 'time_limited', 'room_grade_specific'
  status          String    @default("draft")        // 'draft', 'scheduled', 'active', 'paused', 'completed'
  targetAudience  Json?     @map("target_audience")  // ターゲット条件（客室ランク、時間帯等）
  startDate       DateTime? @map("start_date")
  endDate         DateTime? @map("end_date")
  isAbTest        Boolean   @default(false) @map("is_ab_test")
  abTestId        String?   @map("ab_test_id")
  createdBy       String    @map("created_by")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  variants        campaign_variants[]
  deliveries      campaign_deliveries[]
  
  @@map("campaigns")
  @@index([tenantId, status])
  @@index([tenantId, startDate, endDate])
}
```

#### 2. キャンペーンバリアントテーブル

```prisma
model campaign_variants {
  id              String   @id @default(cuid())
  campaignId      String   @map("campaign_id")
  variantName     String   @map("variant_name")      // 'A', 'B', 'C', etc.
  content         Json                               // コピー内容（タイトル、本文、画像URL等）
  trafficWeight   Int      @default(50) @map("traffic_weight") // トラフィック配分（%）
  isControl       Boolean  @default(false) @map("is_control")  // コントロール群
  isWinner        Boolean  @default(false) @map("is_winner")   // 勝者パターン
  createdAt       DateTime @default(now()) @map("created_at")
  
  campaign        campaigns @relation(fields: [campaignId], references: [id])
  impressions     campaign_impressions[]
  conversions     campaign_conversions[]
  
  @@map("campaign_variants")
  @@index([campaignId])
}
```

#### 3. キャンペーン配信履歴テーブル

```prisma
model campaign_deliveries {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  campaignId      String   @map("campaign_id")
  deliveryType    String   @map("delivery_type")    // 'immediate', 'scheduled', 'triggered'
  deliveredAt     DateTime @map("delivered_at")
  targetCount     Int      @map("target_count")     // 配信対象数
  successCount    Int      @map("success_count")    // 配信成功数
  failureCount    Int      @map("failure_count")    // 配信失敗数
  status          String   @default("pending")      // 'pending', 'processing', 'completed', 'failed'
  
  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  campaign        campaigns @relation(fields: [campaignId], references: [id])
  
  @@map("campaign_deliveries")
  @@index([tenantId, deliveredAt])
  @@index([campaignId])
}
```

#### 4. キャンペーンインプレッションテーブル

```prisma
model campaign_impressions {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  campaignId      String   @map("campaign_id")
  variantId       String   @map("variant_id")
  roomId          String?  @map("room_id")
  sessionId       String?  @map("session_id")
  impressedAt     DateTime @default(now()) @map("impressed_at")
  
  tenant          Tenant            @relation(fields: [tenantId], references: [id])
  variant         campaign_variants @relation(fields: [variantId], references: [id])
  
  @@map("campaign_impressions")
  @@index([tenantId, campaignId, impressedAt])
  @@index([variantId])
}
```

#### 5. キャンペーンコンバージョンテーブル

```prisma
model campaign_conversions {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  campaignId      String   @map("campaign_id")
  variantId       String   @map("variant_id")
  roomId          String?  @map("room_id")
  sessionId       String?  @map("session_id")
  orderId         Int?     @map("order_id")
  revenue         Int      @default(0)
  convertedAt     DateTime @default(now()) @map("converted_at")
  
  tenant          Tenant            @relation(fields: [tenantId], references: [id])
  variant         campaign_variants @relation(fields: [variantId], references: [id])
  
  @@map("campaign_conversions")
  @@index([tenantId, campaignId, convertedAt])
  @@index([variantId])
}
```

#### 6. AIコピー生成ログテーブル

```prisma
model ai_copy_generations {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  copyType        String   @map("copy_type")        // 'product_description', 'campaign_title', 'campaign_body'
  inputPrompt     String   @map("input_prompt") @db.Text
  generatedCopy   String   @map("generated_copy") @db.Text
  model           String   @default("gpt-4")
  creditsUsed     Int      @map("credits_used")
  generatedBy     String   @map("generated_by")
  createdAt       DateTime @default(now()) @map("created_at")
  
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  
  @@map("ai_copy_generations")
  @@index([tenantId, createdAt])
}
```

### TypeScript型定義

```typescript
// キャンペーン
interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  campaignType: 'product_promotion' | 'time_limited' | 'room_grade_specific';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  targetAudience?: {
    roomGrades?: string[];
    timeSlots?: { start: string; end: string }[];
    minOrderAmount?: number;
  };
  startDate?: string;
  endDate?: string;
  isAbTest: boolean;
  abTestId?: string;
  variants: CampaignVariant[];
  metrics?: CampaignMetrics;
}

// キャンペーンバリアント
interface CampaignVariant {
  id: string;
  campaignId: string;
  variantName: string;
  content: {
    title: string;
    body: string;
    imageUrl?: string;
    ctaText?: string;
  };
  trafficWeight: number;
  isControl: boolean;
  isWinner: boolean;
  metrics?: VariantMetrics;
}

// キャンペーン効果測定
interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;        // Click-Through Rate（%）
  cvr: number;        // Conversion Rate（%）
  roas: number;       // Return on Ad Spend
}

// バリアント効果測定
interface VariantMetrics {
  impressions: number;
  conversions: number;
  revenue: number;
  cvr: number;
  confidence: number;  // 統計的信頼度（%）
  isSignificant: boolean;
}

// AIコピー生成リクエスト
interface AiCopyGenerationRequest {
  copyType: 'product_description' | 'campaign_title' | 'campaign_body';
  context: {
    productName?: string;
    productCategory?: string;
    targetAudience?: string;
    tone?: 'casual' | 'formal' | 'friendly' | 'luxury';
    length?: 'short' | 'medium' | 'long';
    keywords?: string[];
  };
}

// AIコピー生成レスポンス
interface AiCopyGenerationResponse {
  generatedCopy: string;
  alternatives?: string[];  // 複数パターン生成
  creditsUsed: number;
  model: string;
}
```

---

## 🔌 API仕様

### ベースパス

```
hotel-saas:   /api/v1/admin/campaigns/
hotel-common: /api/v1/campaigns/
```

### エンドポイント一覧

| # | エンドポイント | メソッド | 説明 | 実装状態 |
|:-:|:-------------|:--------|:-----|:------:|
| 1 | `/campaigns` | GET | キャンペーン一覧取得 | ❌ 未実装 |
| 2 | `/campaigns` | POST | キャンペーン作成 | ❌ 未実装 |
| 3 | `/campaigns/:id` | GET | キャンペーン詳細取得 | ❌ 未実装 |
| 4 | `/campaigns/:id` | PUT | キャンペーン更新 | ❌ 未実装 |
| 5 | `/campaigns/:id` | DELETE | キャンペーン削除 | ❌ 未実装 |
| 6 | `/campaigns/:id/variants` | POST | バリアント追加 | ❌ 未実装 |
| 7 | `/campaigns/:id/start` | POST | キャンペーン開始 | ❌ 未実装 |
| 8 | `/campaigns/:id/pause` | POST | キャンペーン一時停止 | ❌ 未実装 |
| 9 | `/campaigns/:id/metrics` | GET | 効果測定取得 | ❌ 未実装 |
| 10 | `/campaigns/:id/winner` | POST | 勝者パターン適用 | ❌ 未実装 |
| 11 | `/ai/generate-copy` | POST | AIコピー生成 | ❌ 未実装 |

### API詳細仕様

#### 1. キャンペーン作成

**エンドポイント**: `POST /api/v1/admin/campaigns`

**リクエストボディ**:
```typescript
{
  "name": "深夜限定セット プロモーション",
  "description": "深夜時間帯の売上向上を目的としたキャンペーン",
  "campaignType": "time_limited",
  "targetAudience": {
    "timeSlots": [
      { "start": "22:00", "end": "02:00" }
    ]
  },
  "startDate": "2025-10-10T00:00:00Z",
  "endDate": "2025-10-31T23:59:59Z",
  "isAbTest": true,
  "variants": [
    {
      "variantName": "A",
      "content": {
        "title": "深夜限定！特別価格",
        "body": "今だけ20%オフ",
        "ctaText": "今すぐ注文"
      },
      "trafficWeight": 50,
      "isControl": true
    },
    {
      "variantName": "B",
      "content": {
        "title": "夜食にぴったり！",
        "body": "お得なセットメニュー",
        "ctaText": "詳細を見る"
      },
      "trafficWeight": 50,
      "isControl": false
    }
  ]
}
```

**レスポンス**:
```typescript
{
  "id": "campaign_abc123",
  "tenantId": "tenant_001",
  "name": "深夜限定セット プロモーション",
  "status": "draft",
  "isAbTest": true,
  "variants": [
    {
      "id": "variant_001",
      "variantName": "A",
      "trafficWeight": 50,
      "isControl": true
    },
    {
      "id": "variant_002",
      "variantName": "B",
      "trafficWeight": 50,
      "isControl": false
    }
  ],
  "createdAt": "2025-10-06T10:30:00Z"
}
```

#### 2. 効果測定取得

**エンドポイント**: `GET /api/v1/admin/campaigns/:id/metrics`

**レスポンス**:
```typescript
{
  "campaignId": "campaign_abc123",
  "overall": {
    "impressions": 1250,
    "clicks": 187,
    "conversions": 45,
    "revenue": 135000,
    "ctr": 14.96,
    "cvr": 3.6,
    "roas": 4.5
  },
  "variants": [
    {
      "variantId": "variant_001",
      "variantName": "A",
      "metrics": {
        "impressions": 625,
        "conversions": 18,
        "revenue": 54000,
        "cvr": 2.88,
        "confidence": 95.2,
        "isSignificant": true
      }
    },
    {
      "variantId": "variant_002",
      "variantName": "B",
      "metrics": {
        "impressions": 625,
        "conversions": 27,
        "revenue": 81000,
        "cvr": 4.32,
        "confidence": 97.5,
        "isSignificant": true
      }
    }
  ],
  "recommendation": {
    "winner": "variant_002",
    "reason": "バリアントBはCVRが50%高く、統計的に有意な差があります（p < 0.05）",
    "suggestedAction": "バリアントBを勝者パターンとして適用することを推奨します"
  }
}
```

#### 3. AIコピー生成

**エンドポイント**: `POST /api/v1/admin/campaigns/ai/generate-copy`

**リクエストボディ**:
```typescript
{
  "copyType": "campaign_title",
  "context": {
    "productName": "深夜限定セット",
    "productCategory": "セットメニュー",
    "targetAudience": "深夜利用者",
    "tone": "friendly",
    "length": "short",
    "keywords": ["お得", "限定", "夜食"]
  }
}
```

**レスポンス**:
```typescript
{
  "generatedCopy": "深夜のお楽しみ！今だけ限定セット",
  "alternatives": [
    "夜食にぴったり！お得な深夜セット",
    "深夜限定！特別価格でご提供",
    "夜更かしのお供に♪ 限定セットメニュー"
  ],
  "creditsUsed": 20,
  "model": "gpt-4"
}
```

---

## 🎨 UI仕様

### 画面構成

```
/admin/campaigns/
├── index.vue                   // キャンペーン一覧
├── create.vue                  // キャンペーン作成
├── [id]/
│   ├── edit.vue                // キャンペーン編集
│   ├── metrics.vue             // 効果測定
│   └── ab-test.vue             // A/Bテスト管理
└── ai-studio/
    └── index.vue               // AIコピー生成スタジオ
```

### キャンペーン一覧画面

**パス**: `/admin/campaigns`

**レイアウト**:
```
┌─────────────────────────────────────┐
│ ヘッダー                             │
│ ├─ タイトル「キャンペーン管理」      │
│ └─ [新規作成] ボタン                 │
├─────────────────────────────────────┤
│ フィルタ                             │
│ ├─ ステータス: [全て▼]              │
│ └─ 期間: [過去30日▼]                │
├─────────────────────────────────────┤
│ キャンペーンカード一覧                │
│ ┌─────────────────────────────────┐ │
│ │ 深夜限定セット プロモーション     │ │
│ │ ステータス: 🟢 実施中             │ │
│ │ 期間: 2025-10-10 ~ 2025-10-31   │ │
│ │ CVR: 4.32% | 売上: ¥135,000     │ │
│ │ [詳細] [編集] [一時停止]         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### キャンペーン作成画面

**パス**: `/admin/campaigns/create`

**レイアウト**:
```
┌─────────────────────────────────────┐
│ ステップインジケーター                │
│ ● 基本情報 → ○ ターゲット → ○ コピー │
├─────────────────────────────────────┤
│ 基本情報                             │
│ ├─ キャンペーン名: [入力欄]         │
│ ├─ 説明: [テキストエリア]           │
│ ├─ タイプ: [商品プロモーション▼]    │
│ └─ 期間: [開始日] ~ [終了日]        │
├─────────────────────────────────────┤
│ A/Bテスト設定                        │
│ ☑ A/Bテストを実施する               │
│ ├─ バリアント数: [2▼]              │
│ └─ トラフィック配分: 50% / 50%      │
├─────────────────────────────────────┤
│ [戻る] [次へ] ボタン                 │
└─────────────────────────────────────┘
```

### AIコピー生成スタジオ

**パス**: `/admin/campaigns/ai-studio`

**レイアウト**:
```
┌─────────────────────────────────────┐
│ AIコピー生成スタジオ                 │
│ クレジット残高: 850                  │
├─────────────────────────────────────┤
│ 生成設定                             │
│ ├─ コピータイプ: [タイトル▼]        │
│ ├─ 商品名: [深夜限定セット]         │
│ ├─ トーン: [フレンドリー▼]          │
│ ├─ 長さ: [短い▼]                    │
│ └─ キーワード: [お得, 限定, 夜食]   │
├─────────────────────────────────────┤
│ [AI生成（20クレジット）] ボタン      │
├─────────────────────────────────────┤
│ 生成結果                             │
│ ┌─────────────────────────────────┐ │
│ │ 深夜のお楽しみ！今だけ限定セット │ │
│ │ [コピー] [採用]                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 夜食にぴったり！お得な深夜セット │ │
│ │ [コピー] [採用]                  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 📢 配信スタジオ

### 配信タイプ

| タイプ | 説明 | 実装優先度 |
|-------|------|-----------|
| 即時配信 | キャンペーン作成後すぐに配信 | 🔴 最高 |
| スケジュール配信 | 指定日時に自動配信 | 🔴 最高 |
| トリガー配信 | 特定条件で自動配信（チェックイン時等） | 🟡 高 |
| 繰り返し配信 | 定期的に自動配信（毎週金曜等） | 🟢 中 |

### 配信ターゲット設定

```typescript
interface TargetAudience {
  // 客室ランク指定
  roomGrades?: string[];          // ['standard', 'deluxe', 'suite']
  
  // 時間帯指定
  timeSlots?: {
    start: string;                // '22:00'
    end: string;                  // '02:00'
  }[];
  
  // 注文金額指定
  minOrderAmount?: number;        // 最低注文金額
  maxOrderAmount?: number;        // 最高注文金額
  
  // 利用回数指定
  minOrderCount?: number;         // 最低注文回数
  
  // 滞在日数指定
  minStayDays?: number;           // 最低滞在日数
}
```

### 配信スケジュール管理

```typescript
// hotel-common: 配信スケジューラー
export class CampaignScheduler {
  constructor(private prisma: PrismaClient) {}

  async scheduleDelivery(campaign: Campaign): Promise<void> {
    // cron式でスケジュール登録
    const cronExpression = this.buildCronExpression(campaign);
    
    // Node-cronまたはBullMQで実行
    cron.schedule(cronExpression, async () => {
      await this.deliverCampaign(campaign.id);
    });
  }

  private async deliverCampaign(campaignId: string): Promise<void> {
    // 1. ターゲット抽出
    const targets = await this.extractTargets(campaignId);
    
    // 2. バリアント選択（A/Bテスト）
    const variant = await this.selectVariant(campaignId);
    
    // 3. 配信実行
    for (const target of targets) {
      await this.sendToTarget(target, variant);
    }
    
    // 4. 配信履歴記録
    await this.logDelivery(campaignId, targets.length);
  }
}
```

---

## 🧪 A/Bテスト

### A/Bテストフロー

```
1. テスト作成
   ├─ バリアントA（コントロール）
   └─ バリアントB（変更版）

2. トラフィック分配
   ├─ 50% → バリアントA
   └─ 50% → バリアントB

3. データ収集
   ├─ インプレッション記録
   ├─ クリック記録
   └─ コンバージョン記録

4. 統計分析
   ├─ CVR計算
   ├─ 統計的有意性判定（χ²検定）
   └─ 信頼区間計算

5. 勝者判定
   ├─ 有意差あり → 勝者パターン適用
   └─ 有意差なし → テスト継続
```

### 統計的有意性判定

```typescript
// hotel-common: A/Bテスト分析サービス
export class AbTestAnalyzer {
  // χ²検定（カイ二乗検定）
  calculateSignificance(
    variantA: VariantMetrics,
    variantB: VariantMetrics
  ): { pValue: number; isSignificant: boolean; confidence: number } {
    // 観測値
    const observed = [
      [variantA.conversions, variantA.impressions - variantA.conversions],
      [variantB.conversions, variantB.impressions - variantB.conversions]
    ];
    
    // 期待値計算
    const totalConversions = variantA.conversions + variantB.conversions;
    const totalImpressions = variantA.impressions + variantB.impressions;
    const expectedRate = totalConversions / totalImpressions;
    
    const expected = [
      [
        variantA.impressions * expectedRate,
        variantA.impressions * (1 - expectedRate)
      ],
      [
        variantB.impressions * expectedRate,
        variantB.impressions * (1 - expectedRate)
      ]
    ];
    
    // χ²統計量計算
    let chiSquare = 0;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        chiSquare += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
      }
    }
    
    // p値計算（自由度1）
    const pValue = 1 - this.chiSquareCDF(chiSquare, 1);
    
    // 有意水準5%で判定
    const isSignificant = pValue < 0.05;
    const confidence = (1 - pValue) * 100;
    
    return { pValue, isSignificant, confidence };
  }
  
  // 勝者判定
  determineWinner(
    variants: CampaignVariant[]
  ): { winnerId: string; reason: string } | null {
    // 最小サンプルサイズチェック（各バリアント100インプレッション以上）
    const hasEnoughData = variants.every(v => v.metrics.impressions >= 100);
    if (!hasEnoughData) {
      return null;
    }
    
    // CVRでソート
    const sorted = variants.sort((a, b) => b.metrics.cvr - a.metrics.cvr);
    const best = sorted[0];
    const second = sorted[1];
    
    // 統計的有意性判定
    const { isSignificant, confidence } = this.calculateSignificance(
      best.metrics,
      second.metrics
    );
    
    if (isSignificant) {
      return {
        winnerId: best.id,
        reason: `バリアント${best.variantName}はCVRが${((best.metrics.cvr - second.metrics.cvr) / second.metrics.cvr * 100).toFixed(1)}%高く、統計的に有意な差があります（信頼度: ${confidence.toFixed(1)}%）`
      };
    }
    
    return null;
  }
}
```

### 勝者パターン自動適用

```typescript
// hotel-common: 勝者パターン適用
export class CampaignService {
  async applyWinner(campaignId: string): Promise<void> {
    // 1. 勝者判定
    const campaign = await this.prisma.campaigns.findUnique({
      where: { id: campaignId },
      include: { variants: true }
    });
    
    const analyzer = new AbTestAnalyzer();
    const result = analyzer.determineWinner(campaign.variants);
    
    if (!result) {
      throw new Error('勝者を判定できません（データ不足または有意差なし）');
    }
    
    // 2. 勝者フラグ設定
    await this.prisma.campaign_variants.update({
      where: { id: result.winnerId },
      data: { isWinner: true }
    });
    
    // 3. トラフィック配分を100%に変更
    await this.prisma.campaign_variants.update({
      where: { id: result.winnerId },
      data: { trafficWeight: 100 }
    });
    
    // 4. 他のバリアントを無効化
    await this.prisma.campaign_variants.updateMany({
      where: {
        campaignId,
        id: { not: result.winnerId }
      },
      data: { trafficWeight: 0 }
    });
    
    // 5. キャンペーンステータス更新
    await this.prisma.campaigns.update({
      where: { id: campaignId },
      data: { isAbTest: false }
    });
  }
}
```

---

## 📊 キャンペーン管理

### キャンペーンライフサイクル

```
draft（下書き）
  ↓ [開始]
scheduled（スケジュール済み）
  ↓ [開始日到達]
active（実施中）
  ↓ [一時停止]
paused（一時停止）
  ↓ [再開]
active（実施中）
  ↓ [終了日到達]
completed（完了）
```

### キャンペーンダッシュボード

```typescript
// キャンペーン効果測定ダッシュボード
interface CampaignDashboard {
  // 概要
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalConversions: number;
  totalRevenue: number;
  
  // トップパフォーマー
  topCampaigns: {
    id: string;
    name: string;
    cvr: number;
    revenue: number;
  }[];
  
  // 期間別推移
  trends: {
    date: string;
    impressions: number;
    conversions: number;
    revenue: number;
  }[];
}
```

---

## 🗓️ 実装ロードマップ

### Phase 1: 基盤構築（2週間）

- [ ] データベーススキーマ作成
  - [ ] `campaigns` テーブル
  - [ ] `campaign_variants` テーブル
  - [ ] `campaign_deliveries` テーブル
  - [ ] `campaign_impressions` テーブル
  - [ ] `campaign_conversions` テーブル
  - [ ] `ai_copy_generations` テーブル
- [ ] hotel-common側にキャンペーン管理API実装
  - [ ] CRUD API
  - [ ] 配信スケジューラー
  - [ ] トラフィック分配ロジック

### Phase 2: AIコピー生成（1週間）

- [ ] OpenAI API統合
- [ ] AIコピー生成サービス実装
- [ ] hotel-common API実装
- [ ] hotel-saas プロキシAPI実装
- [ ] UI実装（AIスタジオ）

### Phase 3: A/Bテスト（2週間）

- [ ] A/Bテスト分析サービス実装
  - [ ] 統計的有意性判定
  - [ ] 勝者判定ロジック
- [ ] インプレッション・コンバージョン記録
- [ ] 効果測定ダッシュボードUI

### Phase 4: 配信管理（1週間）

- [ ] 配信スケジューラー実装
- [ ] ターゲット抽出ロジック
- [ ] 配信履歴管理
- [ ] UI実装（配信管理画面）

### Phase 5: 最適化・監視（1週間）

- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化
- [ ] 監査ログ整備

---

## 🔐 セキュリティ

### データプライバシー

1. **個人情報の除外**
   - キャンペーン配信には匿名化されたデータのみ使用
   - 客室番号のみで顧客名は使用しない

2. **データ保持期間**
   - キャンペーンデータ: 終了後1年間保持
   - インプレッション・コンバージョンログ: 90日間保持

3. **監査ログ**
   - 全キャンペーン作成・編集を記録
   - `campaigns` テーブルで追跡可能

---

## ⚡ パフォーマンス

### パフォーマンス目標

| 項目 | 目標値 | 測定方法 |
|------|--------|---------|
| キャンペーン配信時間 | 1秒以内 | hotel-common側でロギング |
| A/Bテスト分析時間 | 2秒以内 | 統計計算時間 |
| UI描画時間 | 2秒以内 | Lighthouse |

### 最適化戦略

#### インデックス最適化

```prisma
@@index([tenantId, status])
@@index([tenantId, startDate, endDate])
@@index([tenantId, campaignId, impressedAt])
```

#### キャッシュ戦略

```typescript
// Redis キャッシュ（キャンペーン効果測定）
const cacheKey = `campaign:metrics:${campaignId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const metrics = await calculateMetrics(campaignId);

// 5分間キャッシュ
await redis.setex(cacheKey, 300, JSON.stringify(metrics));
return metrics;
```

---

## 🔄 マイグレーション計画

### 新規テーブル作成

配信スタジオ・A/Bテスト機能は完全に新規実装のため、既存データからの移行は不要です。

#### Phase 1: データベーススキーマ作成（1週間）

```bash
# Prismaマイグレーション作成
cd /Users/kaneko/hotel-common
npx prisma migrate dev --name add_campaign_tables

# マイグレーション内容
# - campaigns
# - campaign_variants
# - campaign_deliveries
# - campaign_impressions
# - campaign_conversions
# - ai_copy_generations
```

```sql
-- マイグレーションSQL例
CREATE TABLE campaigns (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  campaign_type     TEXT NOT NULL,
  status            TEXT DEFAULT 'draft',
  target_audience   JSONB,
  start_date        TIMESTAMP,
  end_date          TIMESTAMP,
  is_ab_test        BOOLEAN DEFAULT false,
  ab_test_id        TEXT,
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_campaigns_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_campaigns_tenant_id_status ON campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_tenant_id_start_date_end_date ON campaigns(tenant_id, start_date, end_date);
```

### ロールバック手順

```bash
# マイグレーションロールバック
cd /Users/kaneko/hotel-common
npx prisma migrate reset

# または特定のマイグレーションのみロールバック
npx prisma migrate resolve --rolled-back add_campaign_tables
```

---

## 📊 監視・ロギング

### キャンペーン実行ログ

```typescript
// hotel-common: キャンペーン配信ログ
const delivery = await prisma.campaign_deliveries.create({
  data: {
    tenantId,
    campaignId,
    deliveryType: 'scheduled',
    deliveredAt: new Date(),
    targetCount: targets.length,
    successCount: 0,
    failureCount: 0,
    status: 'processing'
  }
});

console.log(`✅ キャンペーン配信開始: ${delivery.id} (対象: ${targets.length}件)`);

// 配信完了後に更新
await prisma.campaign_deliveries.update({
  where: { id: delivery.id },
  data: {
    successCount: successCount,
    failureCount: failureCount,
    status: 'completed'
  }
});
```

### A/Bテスト効果測定ログ

```typescript
// hotel-common: A/Bテスト分析ログ
const analyzer = new AbTestAnalyzer();
const result = analyzer.determineWinner(campaign.variants);

if (result) {
  console.log(`🏆 A/Bテスト勝者判定: ${result.winnerId}`);
  console.log(`理由: ${result.reason}`);
  
  // 監査ログ記録
  await prisma.auditLogs.create({
    data: {
      tenantId,
      action: 'AB_TEST_WINNER_DETERMINED',
      resource: 'campaigns',
      resourceId: campaignId,
      userId: 'system',
      metadata: {
        winnerId: result.winnerId,
        reason: result.reason
      },
      createdAt: new Date()
    }
  });
} else {
  console.log(`⏳ A/Bテスト継続中: データ不足または有意差なし`);
}
```

### インプレッション・コンバージョン記録

```typescript
// hotel-common: インプレッション記録
await prisma.campaign_impressions.create({
  data: {
    tenantId,
    campaignId,
    variantId,
    roomId: session.roomId,
    sessionId: session.id,
    impressedAt: new Date()
  }
});

console.log(`👁️ インプレッション記録: キャンペーン=${campaignId}, バリアント=${variantId}`);

// hotel-common: コンバージョン記録
await prisma.campaign_conversions.create({
  data: {
    tenantId,
    campaignId,
    variantId,
    roomId: order.roomId,
    sessionId: order.sessionId,
    orderId: order.id,
    revenue: order.total,
    convertedAt: new Date()
  }
});

console.log(`💰 コンバージョン記録: 売上=${order.total}円`);
```

---

## 🔧 トラブルシューティング

### 問題1: キャンペーンが配信されない

**症状**: キャンペーンを開始してもゲスト側に表示されない

**原因**:
- キャンペーンステータスが `draft` のまま
- 配信スケジューラーが起動していない
- ターゲット条件に一致する客室がない

**解決方法**:
```bash
# 1. キャンペーンステータス確認
psql -U postgres -d hotel_db
SELECT id, name, status, start_date, end_date FROM campaigns WHERE tenant_id = 'tenant_001';

# 2. 配信スケジューラー起動確認
# hotel-common: CampaignScheduler が起動しているか確認
ps aux | grep CampaignScheduler

# 3. ターゲット条件確認
SELECT * FROM device_rooms 
WHERE tenant_id = 'tenant_001' 
  AND grade_id IN ('standard', 'deluxe')  -- target_audience.roomGrades
  AND is_deleted = false;
```

### 問題2: A/Bテストの勝者が判定されない

**症状**: 十分なデータがあるのに勝者判定が実行されない

**原因**:
- 最小サンプルサイズ（100インプレッション）に達していない
- 統計的有意差がない（p値 >= 0.05）
- バリアント間のCVR差が小さい

**解決方法**:
```typescript
// 1. データ量確認
const variants = await prisma.campaign_variants.findMany({
  where: { campaignId },
  include: {
    impressions: true,
    conversions: true
  }
});

variants.forEach(v => {
  console.log(`バリアント${v.variantName}: インプレッション=${v.impressions.length}, コンバージョン=${v.conversions.length}`);
});

// 2. 統計分析実行
const analyzer = new AbTestAnalyzer();
const { pValue, isSignificant, confidence } = analyzer.calculateSignificance(
  variants[0].metrics,
  variants[1].metrics
);

console.log(`p値: ${pValue}, 有意: ${isSignificant}, 信頼度: ${confidence}%`);

// 3. 最小サンプルサイズに達していない場合
if (variants.some(v => v.impressions.length < 100)) {
  console.log(`⏳ データ収集継続中: 最小100インプレッション必要`);
}
```

### 問題3: AIコピー生成が失敗する

**症状**: AIコピー生成ボタンをクリックしてもエラーが返される

**原因**:
- OpenAI API キーが未設定
- クレジット残高不足
- プロンプトが不適切

**解決方法**:
```bash
# 1. OpenAI API キー確認
cat /Users/kaneko/hotel-common/.env | grep OPENAI_API_KEY

# 2. クレジット残高確認
psql -U postgres -d hotel_db
SELECT * FROM ai_credit_transactions WHERE tenant_id = 'tenant_001' ORDER BY created_at DESC LIMIT 1;

# 3. プロンプト確認
# hotel-common: AIコピー生成ログを確認
SELECT * FROM ai_copy_generations WHERE tenant_id = 'tenant_001' ORDER BY created_at DESC LIMIT 5;
```

### 問題4: インプレッション・コンバージョンが記録されない

**症状**: キャンペーンは表示されるが、効果測定データが記録されない

**原因**:
- トラッキングコードが実装されていない
- セッションIDが取得できていない
- データベース書き込みエラー

**解決方法**:
```typescript
// hotel-saas: トラッキングコード実装確認
// pages/index.vue（ゲスト側）

import { useCampaignTracking } from '~/composables/useCampaignTracking';

const { trackImpression, trackConversion } = useCampaignTracking();

// キャンペーン表示時
onMounted(async () => {
  if (campaign) {
    await trackImpression(campaign.id, variant.id);
  }
});

// 注文時
const handleOrder = async () => {
  const order = await createOrder(items);
  
  if (campaign) {
    await trackConversion(campaign.id, variant.id, order.id);
  }
};
```

---

## ⚠️ 実装時の注意事項

### 絶対に守るべきルール

1. **トラフィック分配の公平性**
   ```typescript
   // ❌ 絶対禁止: 固定パターンでの分配
   const variant = variants[0];  // 常にバリアントA
   
   // ✅ 正しい実装: ランダム分配
   const randomValue = Math.random() * 100;
   let cumulativeWeight = 0;
   let selectedVariant;
   
   for (const variant of variants) {
     cumulativeWeight += variant.trafficWeight;
     if (randomValue <= cumulativeWeight) {
       selectedVariant = variant;
       break;
     }
   }
   ```

2. **統計的有意性の厳密判定**
   ```typescript
   // ❌ 絶対禁止: サンプルサイズ無視
   if (variantA.cvr > variantB.cvr) {
     applyWinner(variantA.id);  // 危険！
   }
   
   // ✅ 正しい実装: 統計的検定
   const { isSignificant, confidence } = calculateSignificance(variantA, variantB);
   
   if (isSignificant && confidence >= 95) {
     applyWinner(variantA.id);
   }
   ```

3. **個人情報の保護**
   ```typescript
   // ❌ 絶対禁止: 個人情報の記録
   await prisma.campaign_impressions.create({
     data: {
       customerName: customer.name,  // 危険！
       customerEmail: customer.email  // 危険！
     }
   });
   
   // ✅ 正しい実装: 匿名化
   await prisma.campaign_impressions.create({
     data: {
       roomId: session.roomId,
       sessionId: session.id  // 匿名セッションID
     }
   });
   ```

### パフォーマンス最適化チェックリスト

- [ ] インプレッション記録は非同期処理されているか
- [ ] バッチ処理で効率的に記録されているか
- [ ] インデックスは適切に設定されているか
- [ ] キャッシュは活用されているか
- [ ] 不要なデータ取得はしていないか

### セキュリティチェックリスト

- [ ] トラフィック分配は公平か
- [ ] 統計的有意性判定は正しいか
- [ ] 個人情報は記録していないか
- [ ] CSRF対策は実装されているか
- [ ] 監査ログは適切に記録されているか

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-06 | 1.1.0 | 120点改善<br>- マイグレーション計画追加<br>- 監視・ロギング詳細追加<br>- トラブルシューティングガイド追加<br>- 実装時の注意事項追加<br>- A/Bテスト判定の厳密化 | AI |
| 2025-10-06 | 1.0.0 | 初版作成<br>- 配信スタジオ・A/Bテスト機能の完全仕様定義<br>- データモデル・API・UI仕様の統合<br>- AIコピー生成機能統合<br>- 統計的有意性判定ロジック<br>- 実装ロードマップ策定 | AI |

---

**以上、SSOT: 統計・分析機能（配信スタジオ・A/Bテスト）v1.1.0**
