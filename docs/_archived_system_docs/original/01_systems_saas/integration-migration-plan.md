# 統一Prismaクライアント移行計画

**作成日**: 2025年1月28日  
**対象**: hotel-saas (Sun)  
**期限**: 3日以内（統合仕様準拠）

## 📊 **移行対象API一覧**

### **✅ 完了済み (2個)**
- `server/api/v1/admin/tenant/current.get.ts` ✅
- `server/api/v1/admin/orders/index.get.ts` ✅

### **🔥 高優先度 (10個) - Iza修正完了後すぐ**
**理由**: 管理画面で頻繁に使用されるAPI

1. `server/api/v1/admin/summary.get.ts` - ダッシュボード統計
2. `server/api/v1/admin/kitchen/items.get.ts` - キッチン管理
3. `server/api/v1/order/place.post.ts` - 注文作成
4. `server/api/v1/order/menu.get.ts` - メニュー取得
5. `server/api/v1/admin/menu/index.get.ts` - メニュー管理
6. `server/api/v1/admin/categories/index.get.ts` - カテゴリ管理
7. `server/api/v1/admin/orders/[id].get.ts` - 注文詳細
8. `server/api/v1/admin/orders/[id]/status.put.ts` - 注文ステータス更新
9. `server/api/v1/admin/settings.get.ts` - 設定取得
10. `server/api/v1/admin/settings.put.ts` - 設定更新

### **⚡ 中優先度 (20個) - 第2段階**
**理由**: 管理機能、統計機能

#### メニュー・カテゴリ管理
- `server/api/v1/admin/menu/index.post.ts`
- `server/api/v1/admin/menu/[id].get.ts`
- `server/api/v1/admin/menu/[id].put.ts`
- `server/api/v1/admin/menu/[id].delete.ts`
- `server/api/v1/admin/categories/index.post.ts`
- `server/api/v1/admin/categories/[id].put.ts`

#### 注文管理
- `server/api/v1/admin/orders/[id]/items/index.get.ts`
- `server/api/v1/admin/orders/[id]/items/status.put.ts`
- `server/api/v1/admin/orders/[id]/items/[itemId]/status.put.ts`
- `server/api/v1/admin/orders/items/[id]/cancel.post.ts`

#### 統計・分析
- `server/api/v1/admin/statistics/kpis.get.ts`
- `server/api/v1/admin/statistics/popular-products.get.ts`
- `server/api/v1/admin/statistics/room-analysis.get.ts`
- `server/api/v1/admin/statistics/time-analysis.get.ts`

#### システム設定
- `server/api/v1/admin/system/ai-models.get.ts`
- `server/api/v1/admin/system/ai-models.post.ts`
- `server/api/v1/admin/system/openai-key.get.ts`
- `server/api/v1/admin/system/openai-key.post.ts`

### **💡 低優先度 (50個) - 第3段階**
**理由**: 特殊機能、使用頻度低

#### 高度な統計・分析
- `server/api/v1/admin/statistics/*` (残り)
- `server/api/v1/admin/billing/*`
- `server/api/v1/admin/plan-restrictions/*`

#### レイアウト管理
- `server/api/v1/admin/layouts/*`
- `server/api/v1/admin/content-layouts/*`

#### エージェント・コンシェルジュ
- `server/api/v1/admin/agents/*`
- `server/api/v1/admin/concierge/*`
- `server/api/v1/concierge/*`

#### その他
- `server/api/v1/admin/tags/*`
- `server/api/v1/admin/phone-order/*`
- `server/api/v1/admin/devices/*`
- `server/api/v1/admin/additional-devices/*`
- `server/api/v1/admin/deliveries/*`
- `server/api/v1/admin/usage-statistics/*`
- `server/api/v1/admin/tenants/*`
- `server/api/v1/guest/*`
- `server/api/v1/tenants/*`
- `server/api/auth/*`

## 🔧 **移行手順（各API共通）**

### **Step 1: インポート変更**
```typescript
// 変更前
import prisma from '~/server/utils/prisma'

// 変更後
import { unifiedClient } from '~/server/utils/unified-prisma'
```

### **Step 2: withTenant()でラップ**
```typescript
// 変更前
const result = await prisma.order.findMany({...})

// 変更後
const result = await unifiedClient.withTenant(async () => {
  const prisma = unifiedClient.getRawClient()
  return await prisma.order.findMany({
    where: {
      tenantId: unifiedClient.getTenantId(), // テナント分離
      ...
    }
  })
})
```

### **Step 3: テナントID追加**
全てのCRUD操作に`tenantId`を明示的に追加

### **Step 4: エラーハンドリング**
統一クライアントのエラーハンドリングに対応

## ⏱️ **実装スケジュール**

- **Day 1**: 高優先度10個 (Iza修正完了後すぐ)
- **Day 2**: 中優先度20個
- **Day 3**: 低優先度50個 + 最終確認

## 🧪 **テスト方針**

各段階完了後：
1. 管理画面の基本動作確認
2. API応答の統一性確認
3. テナント分離の確認
4. エラーハンドリングの確認

## 🚨 **リスクと対策**

- **リスク**: 大量API同時移行による不安定化
- **対策**: 段階的移行 + 各段階でのテスト
- **緊急時**: 個別APIのロールバック準備 