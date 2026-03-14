# SSOT: 料金プラン/エンタイトルメント（PRICING_ENTITLEMENTS）

**ドキュメントID**: SSOT_PRICING_ENTITLEMENTS  
**バージョン**: 1.1.0  
**作成日**: 2026-01-03  
**最終更新**: 2026-01-03  
**ステータス**: 🟢 確定  
**Planeタスク**: DEV-0409  
**APIレジストリ**: SSOT_API_REGISTRY.md（登録済み）

---

## 📋 目次

1. [概要](#1-概要)
2. [プラン定義](#2-プラン定義)
3. [機能エンタイトルメント](#3-機能エンタイトルメント)
4. [AIクレジット制限](#4-aiクレジット制限)
5. [データベース設計](#5-データベース設計)
6. [API設計](#6-api設計)
7. [実装ガイド](#7-実装ガイド)
8. [テスト要件](#8-テスト要件)

---

## 1. 概要

### 1.1 目的

OmotenasuAIの料金プランと機能制限（エンタイトルメント）を一元管理する。

### 1.2 関連ドキュメント

| ドキュメント | 用途 |
|:-------------|:-----|
| `SSOT_BUYOUT_STRATEGY.md` | バイアウト戦略（KPI目標） |
| `SSOT_MARKETING_STRATEGY.md` | マーケティング戦略 |
| `DOMESTIC_PRICING_STRATEGY_FINAL.md` | 詳細料金表 |

### 1.3 バイアウト戦略との整合

| 年 | 施設数目標 | ARR目標 | ARPU目標 | 主要プラン |
|:---|:-----------|:--------|:---------|:-----------|
| Year 1 | 100施設 | ¥3,000万 | ¥2.5万/月 | Starter中心 |
| Year 2 | 300施設 | ¥1億 | ¥3万/月 | Pro Lite移行 |
| Year 3 | 500施設 | ¥3億 | ¥5万/月 | Professional主軸 |

---

## 2. プラン定義

### 2.1 LEISURE（レジャーホテル特化）

| プラン | コード | 月額 | 室数上限 | 超過料金 | AIクレジット |
|:-------|:-------|-----:|:--------:|:--------:|:------------:|
| **Starter** ⭐NEW | `leisure_starter` | ¥9,800 | 10室 | ¥1,200/室 | 100/月 |
| Economy | `leisure_economy` | ¥19,800 | 20室 | ¥1,000/室 | 300/月 |
| **Pro Lite** ⭐NEW | `leisure_pro_lite` | ¥34,800 | 35室 | ¥950/室 | 500/月 |
| Professional | `leisure_professional` | ¥49,800 | 50室 | ¥900/室 | 1,000/月 |
| Enterprise | `leisure_enterprise` | ¥99,800 | 100室 | ¥800/室 | 無制限 |

### 2.2 OmotenasuAI（一般ホテル特化）

| プラン | コード | 月額 | 室数上限 | 超過料金 | AIクレジット |
|:-------|:-------|-----:|:--------:|:--------:|:------------:|
| **Starter** ⭐NEW | `omotenasu_starter` | ¥14,800 | 15室 | ¥1,500/室 | 100/月 |
| Economy | `omotenasu_economy` | ¥29,800 | 30室 | ¥1,200/室 | 300/月 |
| **Pro Lite** ⭐NEW | `omotenasu_pro_lite` | ¥49,800 | 50室 | ¥1,100/室 | 700/月 |
| Professional | `omotenasu_professional` | ¥79,800 | 80室 | ¥1,000/室 | 1,500/月 |
| Enterprise | `omotenasu_enterprise` | ¥139,800 | 200室 | ¥800/室 | 無制限 |
| Ultimate | `omotenasu_ultimate` | ¥299,800 | 500室 | ¥700/室 | 無制限 |

### 2.3 年払い割引

| 支払い方法 | 割引率 | 備考 |
|:-----------|:------:|:-----|
| 月払い | 0% | 標準 |
| 1年払い | 5% | 1ヶ月分無料相当 |
| 2年払い | 10% | 2.4ヶ月分無料相当 |

---

## 3. 機能エンタイトルメント

### 3.1 機能マトリクス（LEISURE）

| 機能 | Starter | Economy | Pro Lite | Professional | Enterprise |
|:-----|:-------:|:-------:|:--------:|:------------:|:----------:|
| 基本オーダーシステム | ✅ | ✅ | ✅ | ✅ | ✅ |
| TV統合UI | ✅ | ✅ | ✅ | ✅ | ✅ |
| 多言語翻訳 | 5言語 | 15言語 | 15言語 | 15言語 | 15言語 |
| キャンペーン機能 | ❌ | ✅ | ✅ | ✅ | ✅ |
| AIコンシェルジュ | ❌ | ❌ | 基本 | 高度 | 高度 |
| 分析ダッシュボード | ❌ | ❌ | 基本 | 高度 | 高度 |
| レイアウト編集 | ❌ | ❌ | ❌ | ✅ | ✅ |
| カスタムキャラクター | ❌ | ❌ | ❌ | ❌ | ✅ |
| 専任サポート | ❌ | ❌ | ❌ | ❌ | ✅ |

### 3.2 機能マトリクス（OmotenasuAI）

| 機能 | Starter | Economy | Pro Lite | Professional | Enterprise | Ultimate |
|:-----|:-------:|:-------:|:--------:|:------------:|:----------:|:--------:|
| 基本オーダーシステム | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| フロント連携 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 多言語翻訳 | 5言語 | 10言語 | 10言語 | 15言語 | 15言語 | 15言語 |
| 基本分析 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AIコンシェルジュ | ❌ | ❌ | 基本 | 高度 | 高度 | 高度 |
| 分析ダッシュボード | ❌ | ❌ | 基本 | 高度 | 高度 | 高度 |
| PMS連携 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| API連携 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| カスタム開発 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 完全カスタマイズ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 専用インフラ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 3.3 機能コード一覧

| 機能コード | 説明 | チェック箇所 |
|:-----------|:-----|:-------------|
| `feature:order_system` | 基本オーダーシステム | 注文作成API |
| `feature:tv_ui` | TV統合UI | ゲストUI表示 |
| `feature:translation:5` | 5言語翻訳 | 翻訳API |
| `feature:translation:15` | 15言語翻訳 | 翻訳API |
| `feature:campaign` | キャンペーン機能 | キャンペーンAPI |
| `feature:ai_concierge:basic` | 基本AIコンシェルジュ | AIチャットAPI |
| `feature:ai_concierge:advanced` | 高度AIコンシェルジュ | AIチャットAPI |
| `feature:analytics:basic` | 基本分析 | 分析API |
| `feature:analytics:advanced` | 高度分析 | 分析API |
| `feature:layout_editor` | レイアウト編集 | 管理画面 |
| `feature:custom_character` | カスタムキャラクター | AIキャラクター設定 |
| `feature:pms_integration` | PMS連携 | PMS API |
| `feature:api_access` | API連携 | 外部API |
| `feature:custom_dev` | カスタム開発 | 要相談 |
| `feature:dedicated_infra` | 専用インフラ | インフラ設定 |

---

## 4. AIクレジット制限

### 4.1 クレジット定義

| 操作 | 消費クレジット | 説明 |
|:-----|:--------------:|:-----|
| AIチャット（1メッセージ） | 1 | 1回の会話 |
| 翻訳（1リクエスト） | 1 | 1テキスト翻訳 |
| レコメンド生成 | 2 | おすすめメニュー生成 |
| 画像生成（将来） | 10 | AI画像生成 |

### 4.2 月次リセット

- **リセットタイミング**: 毎月1日 00:00 JST
- **未使用分**: 繰り越しなし
- **超過時**: 追加購入 or 翌月まで待機

### 4.3 追加クレジット購入

| パック | クレジット数 | 価格 | 単価 |
|:-------|:------------:|-----:|:----:|
| 100クレジット | 100 | ¥1,000 | ¥10 |
| 500クレジット | 500 | ¥4,000 | ¥8 |
| 1,000クレジット | 1,000 | ¥7,000 | ¥7 |

---

## 5. データベース設計

### 5.0 既存テーブルとの関係

> **重要**: SSOT_SAAS_MULTITENANT.md で定義された既存テーブルとの関係を明確にする

#### 既存テーブル（SSOT_SAAS_MULTITENANT.md）

| テーブル | 用途 | 本SSOTとの関係 |
|:---------|:-----|:---------------|
| `tenant_system_plan` | テナント×システム×プラン | **置換**: `tenant_subscriptions`に統合 |
| `system_plan_restrictions` | プラン制限定義 | **統合**: `subscription_plans.features`（JSON配列）に吸収 |

#### 移行方針

```markdown
【Phase 1: 並行運用】
1. 新テーブル（subscription_plans, tenant_subscriptions）を作成
2. 既存テーブル（tenant_system_plan, system_plan_restrictions）は残置
3. 新規テナントは新テーブルで管理

【Phase 2: データ移行】
1. 既存テナントのデータを新テーブルにマイグレーション
2. 移行完了後、既存テーブルは参照のみ

【Phase 3: 完全移行】
1. 全テナント移行完了を確認
2. 既存テーブルを削除（またはアーカイブ）
```

#### 移行SQL（参考）

```sql
-- tenant_system_plan → tenant_subscriptions への移行
INSERT INTO tenant_subscriptions (tenant_id, plan_id, status)
SELECT 
  tsp.tenant_id,
  sp.id,
  'active'
FROM tenant_system_plan tsp
JOIN subscription_plans sp ON sp.code = CONCAT(
  CASE WHEN tsp.system_id = 'leisure' THEN 'leisure_' ELSE 'omotenasu_' END,
  LOWER(tsp.plan_name)
);
```

---

### 5.1 テーブル: subscription_plans

```sql
CREATE TABLE subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) UNIQUE NOT NULL,  -- 'leisure_starter' 等
  name            VARCHAR(100) NOT NULL,        -- 'Starter Plan'
  product_line    VARCHAR(20) NOT NULL,         -- 'leisure' or 'omotenasu'
  monthly_price   INT NOT NULL,                 -- 9800 (円)
  room_limit      INT NOT NULL,                 -- 10
  overage_price   INT NOT NULL,                 -- 1200 (円/室)
  ai_credits      INT,                          -- 100 (NULL=無制限)
  features        JSONB NOT NULL DEFAULT '[]',  -- 機能コード配列
  display_order   INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_subscription_plans_code ON subscription_plans(code);
CREATE INDEX idx_subscription_plans_product_line ON subscription_plans(product_line);
```

### 5.2 テーブル: tenant_subscriptions

```sql
CREATE TABLE tenant_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(100) NOT NULL REFERENCES tenants(id),
  plan_id         UUID NOT NULL REFERENCES subscription_plans(id),
  billing_cycle   VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- 'monthly', 'yearly', '2yearly'
  discount_rate   DECIMAL(5,4) NOT NULL DEFAULT 0,         -- 0.05 = 5%
  current_rooms   INT NOT NULL DEFAULT 0,
  ai_credits_used INT NOT NULL DEFAULT 0,
  ai_credits_reset_at TIMESTAMPTZ,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',   -- 'active', 'cancelled', 'expired'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)  -- 1テナント1プラン
);

-- インデックス
CREATE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
```

### 5.3 テーブル: ai_credit_transactions

```sql
CREATE TABLE ai_credit_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(100) NOT NULL REFERENCES tenants(id),
  operation       VARCHAR(50) NOT NULL,         -- 'chat', 'translation', 'recommend'
  credits_used    INT NOT NULL,
  balance_after   INT NOT NULL,
  metadata        JSONB,                        -- 追加情報
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_ai_credit_transactions_tenant ON ai_credit_transactions(tenant_id);
CREATE INDEX idx_ai_credit_transactions_created ON ai_credit_transactions(created_at);
```

### 5.4 Prismaスキーマ

```prisma
model SubscriptionPlan {
  id            String   @id @default(cuid())
  code          String   @unique
  name          String
  productLine   String   @map("product_line")
  monthlyPrice  Int      @map("monthly_price")
  roomLimit     Int      @map("room_limit")
  overagePrice  Int      @map("overage_price")
  aiCredits     Int?     @map("ai_credits")
  features      Json     @default("[]")
  displayOrder  Int      @default(0) @map("display_order")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  tenantSubscriptions TenantSubscription[]
  
  @@map("subscription_plans")
}

model TenantSubscription {
  id              String   @id @default(cuid())
  tenantId        String   @unique @map("tenant_id")
  planId          String   @map("plan_id")
  billingCycle    String   @default("monthly") @map("billing_cycle")
  discountRate    Decimal  @default(0) @map("discount_rate")
  currentRooms    Int      @default(0) @map("current_rooms")
  aiCreditsUsed   Int      @default(0) @map("ai_credits_used")
  aiCreditsResetAt DateTime? @map("ai_credits_reset_at")
  startedAt       DateTime @default(now()) @map("started_at")
  expiresAt       DateTime? @map("expires_at")
  status          String   @default("active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id])
  plan   SubscriptionPlan @relation(fields: [planId], references: [id])
  
  @@map("tenant_subscriptions")
}

model AiCreditTransaction {
  id           String   @id @default(cuid())
  tenantId     String   @map("tenant_id")
  operation    String
  creditsUsed  Int      @map("credits_used")
  balanceAfter Int      @map("balance_after")
  metadata     Json?
  createdAt    DateTime @default(now()) @map("created_at")
  
  @@index([tenantId])
  @@index([createdAt])
  @@map("ai_credit_transactions")
}
```

### 5.5 Tenantモデルへの逆リレーション

> **重要**: 既存のTenantモデルに逆リレーションを追加する必要があります

```prisma
// 既存のTenantモデルに追加
model Tenant {
  // ... 既存フィールド
  
  // ★エンタイトルメント用リレーション追加
  subscription TenantSubscription?  // 1:1 リレーション
  
  // ... 既存リレーション
}
```

**実装時の注意**:
- `hotel-common-rebuild/prisma/schema.prisma` の `Tenant` モデルを更新
- マイグレーション作成: `npx prisma migrate dev --name add_subscription_relation`

---

## 6. API設計

> **参照**: 以下のAPIは `SSOT_API_REGISTRY.md` にも登録済み  
> **実装タスク**: DEV-0430（エンタイトルメント基盤実装）

### 6.1 エンタイトルメント確認API

**エンドポイント**: `GET /api/v1/admin/entitlements`  
**認証**: Session認証（Admin向け）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "plan": {
      "code": "leisure_starter",
      "name": "Starter Plan",
      "productLine": "leisure"
    },
    "limits": {
      "rooms": {
        "limit": 10,
        "current": 8,
        "remaining": 2
      },
      "aiCredits": {
        "limit": 100,
        "used": 45,
        "remaining": 55,
        "resetsAt": "2026-02-01T00:00:00Z"
      }
    },
    "features": {
      "orderSystem": true,
      "tvUi": true,
      "translationLanguages": 5,
      "campaign": false,
      "aiConcierge": null,
      "analytics": null,
      "layoutEditor": false
    }
  }
}
```

### 6.2 機能チェックAPI

**エンドポイント**: `GET /api/v1/admin/entitlements/check/:featureCode`

**レスポンス（許可）**:
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "feature": "feature:ai_concierge:basic"
  }
}
```

**レスポンス（拒否）**:
```json
{
  "success": false,
  "error": {
    "code": "FEATURE_NOT_AVAILABLE",
    "message": "この機能はPro Lite以上のプランで利用できます",
    "upgradeUrl": "/admin/settings/subscription/upgrade"
  }
}
```

### 6.3 AIクレジット消費API

**エンドポイント**: `POST /api/v1/admin/entitlements/consume-credit`

**リクエスト**:
```json
{
  "operation": "chat",
  "credits": 1
}
```

**レスポンス（成功）**:
```json
{
  "success": true,
  "data": {
    "consumed": 1,
    "remaining": 54
  }
}
```

**レスポンス（上限到達）**:
```json
{
  "success": false,
  "error": {
    "code": "CREDIT_LIMIT_EXCEEDED",
    "message": "今月のAIクレジットを使い切りました",
    "purchaseUrl": "/admin/settings/subscription/credits"
  }
}
```

---

## 7. 実装ガイド

### 7.1 エンタイトルメントミドルウェア

```typescript
// hotel-common-rebuild/src/middleware/entitlement.middleware.ts

import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export function requireFeature(featureCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId
    
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true }
    })
    
    if (!subscription || subscription.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NO_ACTIVE_SUBSCRIPTION',
          message: 'アクティブなサブスクリプションがありません'
        }
      })
    }
    
    const features = subscription.plan.features as string[]
    if (!features.includes(featureCode)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: 'この機能は現在のプランでは利用できません',
          upgradeUrl: '/admin/settings/subscription/upgrade'
        }
      })
    }
    
    next()
  }
}
```

### 7.2 室数制限チェック

```typescript
// hotel-common-rebuild/src/services/entitlement.service.ts

export async function checkRoomLimit(tenantId: string): Promise<{
  allowed: boolean
  current: number
  limit: number
}> {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true }
  })
  
  if (!subscription) {
    return { allowed: false, current: 0, limit: 0 }
  }
  
  const currentRooms = await prisma.rooms.count({
    where: { tenantId, isDeleted: false }
  })
  
  return {
    allowed: currentRooms < subscription.plan.roomLimit,
    current: currentRooms,
    limit: subscription.plan.roomLimit
  }
}
```

### 7.3 AIクレジット消費

```typescript
// hotel-common-rebuild/src/services/ai-credit.service.ts

import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function consumeAiCredit(
  tenantId: string,
  operation: string,
  credits: number = 1
): Promise<{ success: boolean; remaining: number }> {
  const key = `ai_credits:${tenantId}:${getCurrentMonth()}`
  
  // Redisで高速カウント
  const used = await redis.incrby(key, credits)
  
  // プラン上限を取得
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true }
  })
  
  const limit = subscription?.plan.aiCredits ?? Infinity
  
  if (used > limit) {
    // ロールバック
    await redis.decrby(key, credits)
    return { success: false, remaining: 0 }
  }
  
  // トランザクションログ記録（非同期）
  prisma.aiCreditTransaction.create({
    data: {
      tenantId,
      operation,
      creditsUsed: credits,
      balanceAfter: limit - used
    }
  }).catch(console.error)
  
  return { success: true, remaining: limit - used }
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
```

---

## 8. テスト要件

### 8.1 単体テスト

| テストケース | 期待結果 |
|:-------------|:---------|
| Starterプランで室数10室以下 | ✅ 許可 |
| Starterプランで室数11室目追加 | ❌ 拒否 + アップグレード案内 |
| AIクレジット100消費後の101回目 | ❌ 拒否 + 購入案内 |
| 月初にAIクレジットリセット | ✅ 残高100に復帰 |

### 8.2 統合テスト

```bash
# 室数制限テスト
curl -X POST http://localhost:3401/api/v1/admin/rooms \
  -H 'Content-Type: application/json' \
  -H 'Cookie: hotel_session=xxx' \
  -d '{"roomNumber": "11"}'
# 期待: 403 ROOM_LIMIT_EXCEEDED

# AIクレジット消費テスト
curl -X POST http://localhost:3401/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message": "おすすめメニュー"}'
# 期待: 200 + remainingCredits表示
```

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|:-----------|:-----|:---------|
| 1.1.0 | 2026-01-03 | APIレジストリ登録、既存テーブル関係明記、Tenant逆リレーション追加 |
| 1.0.0 | 2026-01-03 | 初版作成（DEV-0409） |

