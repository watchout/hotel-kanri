# プレミアム機能制限仕様書

## 1. 概要

本仕様書は、hotel-saasにおけるプレミアム機能の制限に関する仕様を定義します。特定の高度な機能はProfessional以上のプランでのみ利用可能とし、サブスクリプションプランに応じた機能制限を実装します。

## 2. 対象機能

以下の機能をプレミアム機能として、Professional以上のプランでのみ利用可能とします：

1. **シークレット販売（裏メニュー）**
   - 特別なアクセスコードが必要な限定メニュー機能
   - 既存機能の利用制限

2. **ガチャメニュー**
   - ランダムに商品が選ばれる新機能
   - 新規実装機能

## 3. プラン体系

現在の料金体系（`docs/features/COMPLETE_PRICING_MATRIX.md`）に基づき、以下のプラン区分を設定します：

### 3.1 LEISUREプラン
- **Economy**: ¥19,800/月 - 基本機能のみ
- **Professional**: ¥49,800/月 - プレミアム機能利用可能
- **Enterprise**: ¥99,800/月 - プレミアム機能利用可能
- **Ultimate**: 別途見積もり - プレミアム機能利用可能

### 3.2 OmotenasuAIプラン
- **Economy**: ¥29,800/月 - 基本機能のみ
- **Professional**: ¥79,800/月 - プレミアム機能利用可能
- **Enterprise**: ¥139,800/月 - プレミアム機能利用可能
- **Ultimate**: ¥299,800/月 - プレミアム機能利用可能
- **Custom Enterprise**: 別途見積もり - プレミアム機能利用可能

## 4. データモデル

### 4.1 TenantSubscriptionテーブル拡張

```prisma
model TenantSubscription {
  id                Int       @id @default(autoincrement())
  tenantId          String
  planType          String    // "LEISURE_Economy", "LEISURE_Professional", "OmotenasuAI_Enterprise" など
  isActive          Boolean   @default(true)
  startDate         DateTime
  endDate           DateTime?

  // プレミアム機能フラグ
  enableSecretMenu  Boolean   @default(false) // シークレットメニュー機能
  enableGachaMenu   Boolean   @default(false) // ガチャメニュー機能

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  tenant            Tenant    @relation(fields: [tenantId], references: [id])
}
```

## 5. 機能制限の実装

### 5.1 バックエンド制限

各APIエンドポイントにプラン制限チェックを実装します：

```typescript
// プレミアム機能アクセスチェック関数
async function checkPremiumFeatureAccess(tenantId: string, feature: 'secretMenu' | 'gachaMenu') {
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId, isActive: true }
  });

  if (!subscription) {
    throw createError({
      statusCode: 403,
      message: 'アクティブなサブスクリプションがありません'
    });
  }

  // プラン種別によるチェック
  const isProfessionalOrAbove = ['LEISURE_Professional', 'LEISURE_Enterprise',
    'OmotenasuAI_Professional', 'OmotenasuAI_Enterprise', 'OmotenasuAI_Ultimate'].includes(subscription.planType);

  // 機能フラグによるチェック
  const isFeatureEnabled = feature === 'secretMenu' ?
    subscription.enableSecretMenu : subscription.enableGachaMenu;

  if (!isProfessionalOrAbove || !isFeatureEnabled) {
    throw createError({
      statusCode: 403,
      message: `この機能はProfessionalプラン以上で利用可能です`
    });
  }

  return true;
}
```

### 5.2 API制限実装

各プレミアム機能のAPIエンドポイントに制限を適用します：

```typescript
// シークレットメニュー関連API
export default defineEventHandler(async (event) => {
  const { tenantId } = event.context;

  // プレミアム機能チェック
  await checkPremiumFeatureAccess(tenantId, 'secretMenu');

  // 以降の処理を実行
  // ...
});

// ガチャメニュー関連API
export default defineEventHandler(async (event) => {
  const { tenantId } = event.context;

  // プレミアム機能チェック
  await checkPremiumFeatureAccess(tenantId, 'gachaMenu');

  // 以降の処理を実行
  // ...
});
```

### 5.3 フロントエンド制限

管理画面のUIにもプラン制限を適用します：

```typescript
// テナントのプラン情報を取得するコンポーザブル
export function useTenantPlan() {
  const tenant = useTenant();
  const subscription = ref(null);
  const isProfessionalOrAbove = computed(() => {
    if (!subscription.value) return false;

    const planType = subscription.value.planType;
    return planType.includes('Professional') ||
           planType.includes('Enterprise') ||
           planType.includes('Ultimate');
  });

  const hasSecretMenuAccess = computed(() =>
    isProfessionalOrAbove.value && subscription.value?.enableSecretMenu);

  const hasGachaMenuAccess = computed(() =>
    isProfessionalOrAbove.value && subscription.value?.enableGachaMenu);

  // テナントのサブスクリプション情報を取得
  const fetchSubscription = async () => {
    const { data } = await useFetch('/api/v1/tenant/subscription');
    subscription.value = data.value;
  };

  onMounted(fetchSubscription);

  return {
    subscription,
    isProfessionalOrAbove,
    hasSecretMenuAccess,
    hasGachaMenuAccess
  };
}
```

### 5.4 UI実装

管理画面のUIでは、プラン制限に基づいて機能の表示/非表示を切り替えます：

```vue
<template>
  <div>
    <!-- 通常機能 -->
    <div class="menu-management">
      <!-- 通常のメニュー管理UI -->
    </div>

    <!-- シークレットメニュー機能 -->
    <div v-if="hasSecretMenuAccess" class="secret-menu-management">
      <h2>シークレットメニュー設定</h2>
      <!-- シークレットメニュー管理UI -->
    </div>
    <div v-else class="premium-feature-locked">
      <h2>シークレットメニュー設定</h2>
      <p>この機能はProfessionalプラン以上で利用可能です</p>
      <button @click="showUpgradeDialog">プランをアップグレード</button>
    </div>

    <!-- ガチャメニュー機能 -->
    <div v-if="hasGachaMenuAccess" class="gacha-menu-management">
      <h2>ガチャメニュー設定</h2>
      <!-- ガチャメニュー管理UI -->
    </div>
    <div v-else class="premium-feature-locked">
      <h2>ガチャメニュー設定</h2>
      <p>この機能はProfessionalプラン以上で利用可能です</p>
      <button @click="showUpgradeDialog">プランをアップグレード</button>
    </div>
  </div>
</template>

<script setup>
import { useTenantPlan } from '~/composables/useTenantPlan';

const { hasSecretMenuAccess, hasGachaMenuAccess } = useTenantPlan();

function showUpgradeDialog() {
  // プランアップグレードダイアログを表示
}
</script>
```

## 6. プラン移行処理

### 6.1 プランアップグレード

テナントがプランをアップグレードした場合の処理：

```typescript
async function upgradeToProfessional(tenantId: string) {
  // サブスクリプション情報を更新
  await prisma.tenantSubscription.update({
    where: { tenantId },
    data: {
      planType: 'LEISURE_Professional', // または 'OmotenasuAI_Professional'
      enableSecretMenu: true,
      enableGachaMenu: true
    }
  });

  // プラン変更通知
  await sendPlanChangeNotification(tenantId, 'upgrade');
}
```

### 6.2 プランダウングレード

テナントがプランをダウングレードした場合の処理：

```typescript
async function downgradeToEconomy(tenantId: string) {
  // プレミアム機能の使用状況を確認
  const secretMenuCount = await prisma.menuItem.count({
    where: { tenantId, isSecret: true }
  });

  const gachaMenuCount = await prisma.gachaMenu.count({
    where: { tenantId }
  });

  // プレミアム機能が使用されている場合は警告
  if (secretMenuCount > 0 || gachaMenuCount > 0) {
    // 警告メール送信
    await sendPlanDowngradeWarning(tenantId, {
      secretMenuCount,
      gachaMenuCount
    });
  }

  // サブスクリプション情報を更新
  await prisma.tenantSubscription.update({
    where: { tenantId },
    data: {
      planType: 'LEISURE_Economy', // または 'OmotenasuAI_Economy'
      enableSecretMenu: false,
      enableGachaMenu: false
    }
  });

  // プラン変更通知
  await sendPlanChangeNotification(tenantId, 'downgrade');
}
```

## 7. エラーハンドリング

### 7.1 APIエラー

プレミアム機能へのアクセス制限違反時のエラーレスポンス：

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "この機能はProfessionalプラン以上で利用可能です",
  "details": {
    "requiredPlan": "Professional",
    "currentPlan": "Economy",
    "feature": "secretMenu"
  }
}
```

### 7.2 UI表示

プレミアム機能へのアクセス制限違反時のUI表示：

```vue
<template>
  <div class="premium-feature-error">
    <div class="error-icon">
      <svg><!-- ロックアイコン --></svg>
    </div>
    <h3>プレミアム機能</h3>
    <p>この機能を利用するには、Professionalプラン以上へのアップグレードが必要です。</p>
    <div class="action-buttons">
      <button class="primary" @click="showUpgradeDialog">プランをアップグレード</button>
      <button class="secondary" @click="goBack">戻る</button>
    </div>
  </div>
</template>
```

## 8. 監査・ログ記録

プレミアム機能へのアクセス試行を監査ログに記録します：

```typescript
async function logPremiumFeatureAccess(tenantId: string, feature: string, success: boolean, details: any = {}) {
  await prisma.activityLog.create({
    data: {
      tenantId,
      action: 'PREMIUM_FEATURE_ACCESS',
      target: feature,
      success,
      details: JSON.stringify({
        ...details,
        timestamp: new Date().toISOString()
      })
    }
  });
}
```

## 9. 将来拡張予定

- 追加プレミアム機能の実装
- 機能ごとのアドオン料金設定
- 利用量ベースの課金モデル
- トライアル期間の提供
