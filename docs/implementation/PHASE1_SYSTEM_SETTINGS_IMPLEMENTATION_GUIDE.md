# 📋 Phase 1: システム設定基盤 実装ガイド

**作成日**: 2025年1月19日  
**対象**: hotel-saas・hotel-common開発者  
**優先度**: 🔴 **最高優先度**  
**前提条件**: **メモ機能TypeScriptエラー完全解消済み**

---

## ⚠️ **実装開始前の必須確認**

### **🚨 TypeScriptエラー解消確認（必須）**

```bash
# 1. hotel-common エラー確認
cd hotel-common
npm run type-check
# ✅ 結果: Found 0 errors. でなければ実装開始禁止

# 2. hotel-saas エラー確認  
cd /Users/kaneko/hotel-saas
npm run type-check
# ✅ 結果: Found 0 errors. でなければ実装開始禁止

# 3. サーバー起動確認
cd /Users/kaneko/hotel-common && npm run dev &
cd /Users/kaneko/hotel-saas && npm run dev &
# ✅ 両方とも正常起動することを確認

# 4. API疎通確認
curl http://localhost:3400/health
curl http://localhost:3100/api/healthz
# ✅ 両方とも200 OKレスポンスを確認
```

**❌ エラーが1件でもある場合**: このPhase 1実装は開始せず、メモ機能完了を最優先で進める

---

## 🎯 **Phase 1 実装概要**

既存SuperAdmin設定管理機能を拡張し、AI・為替レート設定基盤を構築

**参照ドキュメント**:
- `docs/systems/common/SUPERADMIN_AI_SETTINGS_EXTENSION_SPEC.md`
- `docs/01_systems/member/SYSTEM_ADMIN_SPEC.md`

---

## 🏢 **hotel-common 実装手順**

### **Step 1: データベース拡張**

#### **1.1 実装前チェック**
```bash
cd hotel-common
npm run type-check
# ✅ エラー0件確認後に進行
```

#### **1.2 system_settings拡張**
**参照**: `docs/systems/common/SUPERADMIN_AI_SETTINGS_EXTENSION_SPEC.md` (Line 35-100)

```sql
-- prisma/schema.prisma または migration ファイルに追加
-- AI設定カテゴリ
-- 為替レート設定カテゴリ  
-- AIクレジット料金設定カテゴリ
```

#### **1.3 実装後チェック（必須）**
```bash
# TypeScriptエラーチェック
npm run type-check
# ✅ エラー0件でなければ修正必須

# データベースマイグレーション確認
npm run db:migrate
# ✅ 正常完了確認

# サーバー起動確認
npm run dev
# ✅ 正常起動確認
```

### **Step 2: 型定義作成**

#### **2.1 実装前チェック**
```bash
npm run type-check
# ✅ 前ステップのエラーが解消されていることを確認
```

#### **2.2 AI設定型定義**
```typescript
// types/ai-settings.ts
export interface OpenAISettings {
  apiKey: string;
  organizationId?: string;
  defaultModel: 'gpt-4-vision-preview' | 'gpt-4' | 'gpt-3.5-turbo';
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface CurrencyRateSettings {
  usdJpyRate: number;
  eurJpyRate: number;
  autoUpdate: boolean;
  updateInterval: number;
  apiProvider: 'exchangerate-api' | 'fixer' | 'currencylayer' | 'manual';
  apiKey?: string;
}

export interface AICreditPricing {
  creditBasePrice: number;
  markupPercentage: number;
  bulkDiscounts: {
    tier1000: number;
    tier5000: number;
    tier10000: number;
  };
}
```

#### **2.3 実装後チェック（必須）**
```bash
# TypeScriptエラーチェック
npm run type-check
# ✅ エラー0件でなければ型定義修正必須

# インポート確認
npm run build
# ✅ ビルド成功確認
```

### **Step 3: API実装**

#### **3.1 実装前チェック**
```bash
npm run type-check && npm run build
# ✅ 両方成功確認後に進行
```

#### **3.2 SuperAdmin AI設定API**
**参照**: `docs/systems/common/SUPERADMIN_AI_SETTINGS_EXTENSION_SPEC.md` (Line 300-380)

```typescript
// server/api/superadmin/ai-settings.get.ts
export default defineEventHandler(async (event) => {
  // 実装中も必ずTypeScript型を指定
  const settings: {
    openai: OpenAISettings;
    currency: CurrencyRateSettings;
    pricing: AICreditPricing;
  } = {
    // 実装内容
  };
  
  return settings;
});
```

#### **3.3 各ステップ後の必須チェック**
```bash
# ファイル作成毎にチェック
npm run type-check
# ✅ エラー発生時は即座に修正

# API動作確認
npm run dev &
curl http://localhost:3400/api/superadmin/ai-settings
# ✅ 正常レスポンス確認
```

### **Step 4: 暗号化・セキュリティ機能**

#### **4.1 実装前チェック**
```bash
npm run type-check && curl http://localhost:3400/health
# ✅ エラー0件・API正常確認後に進行
```

#### **4.2 SecureSettingsManager実装**
**参照**: `docs/systems/common/SUPERADMIN_AI_SETTINGS_EXTENSION_SPEC.md` (Line 450-500)

```typescript
// utils/secure-settings-manager.ts
export class SecureSettingsManager {
  async encryptAndStore(
    category: string,
    key: string,
    value: string
  ): Promise<void> {
    // 型安全な実装
  }
  
  async decryptAndRetrieve(
    category: string,
    key: string
  ): Promise<string> {
    // 型安全な実装
  }
}
```

#### **4.3 実装後チェック（必須）**
```bash
# 完全チェック
npm run type-check
npm run build
npm run dev &
sleep 5
curl http://localhost:3400/api/superadmin/ai-settings
# ✅ 全て成功確認
```

---

## 🌞 **hotel-saas 実装手順**

### **Step 1: SuperAdmin UI拡張**

#### **1.1 実装前チェック**
```bash
cd hotel-saas
npm run type-check
# ✅ エラー0件確認後に進行

# hotel-commonとの疎通確認
curl http://localhost:3400/api/superadmin/ai-settings
# ✅ hotel-commonのAPIが正常動作していることを確認
```

#### **1.2 AI設定管理画面**
**参照**: `docs/systems/common/SUPERADMIN_AI_SETTINGS_EXTENSION_SPEC.md` (Line 150-250)

```vue
<!-- pages/superadmin/ai-settings.vue -->
<template>
  <div>
    <!-- AI設定管理UI -->
  </div>
</template>

<script setup lang="ts">
// 必ずhotel-commonの型を使用
import type { OpenAISettings, CurrencyRateSettings } from '~/types/ai-settings'

const { data: aiSettings } = await $fetch<{
  openai: OpenAISettings;
  currency: CurrencyRateSettings;
}>('/api/superadmin/ai-settings')
</script>
```

#### **1.3 各コンポーネント作成後の必須チェック**
```bash
# ファイル作成毎にチェック
npm run type-check
# ✅ エラー発生時は即座に修正

# ページ動作確認
npm run dev &
# ブラウザで http://localhost:3100/superadmin/ai-settings 確認
```

### **Step 2: 為替レート管理画面**

#### **2.1 実装前チェック**
```bash
npm run type-check
# ✅ 前ステップのエラーが解消されていることを確認
```

#### **2.2 為替レート管理UI実装**
```vue
<!-- pages/superadmin/currency-rates.vue -->
<template>
  <div>
    <!-- 為替レート管理UI -->
  </div>
</template>

<script setup lang="ts">
import type { CurrencyRateSettings } from '~/types/ai-settings'

// 型安全な実装
</script>
```

#### **2.3 実装後チェック（必須）**
```bash
npm run type-check
npm run build
# ✅ 両方成功確認
```

### **Step 3: 既存権限システム統合**

#### **3.1 実装前チェック**
```bash
npm run type-check && npm run build
# ✅ 両方成功確認後に進行
```

#### **3.2 権限拡張**
**参照**: `docs/01_systems/member/SYSTEM_ADMIN_SPEC.md` (Line 1-35)

```typescript
// types/permissions.ts
interface SuperAdminPermissions {
  // 既存権限（保持）
  system_management: boolean;
  tenant_management: boolean;
  
  // 新規AI関連権限
  ai_settings_management: boolean;
  ai_credit_management: boolean;
  currency_rate_management: boolean;
}
```

#### **3.3 実装後チェック（必須）**
```bash
npm run type-check
npm run build
npm run dev
# ✅ 全て成功確認
```

---

## ✅ **Phase 1 完了確認チェックリスト**

### **hotel-common 完了確認**
```bash
cd hotel-common

# 1. TypeScriptエラー0件
npm run type-check
# ✅ Found 0 errors.

# 2. ビルド成功
npm run build
# ✅ Build completed successfully

# 3. サーバー正常起動
npm run dev &
sleep 5
# ✅ Server running on http://localhost:3400

# 4. 新規API全て正常応答
curl http://localhost:3400/api/superadmin/ai-settings
curl http://localhost:3400/api/superadmin/currency-rates
# ✅ 全て200 OK

# 5. データベース正常動作
# ✅ マイグレーション成功・データ操作正常
```

### **hotel-saas 完了確認**
```bash
cd hotel-saas

# 1. TypeScriptエラー0件
npm run type-check
# ✅ Found 0 errors.

# 2. ビルド成功
npm run build
# ✅ Build completed successfully

# 3. サーバー正常起動
npm run dev &
sleep 5
# ✅ Server running on http://localhost:3100

# 4. 新規画面全て正常表示
# ブラウザ確認:
# ✅ http://localhost:3100/superadmin/ai-settings
# ✅ http://localhost:3100/superadmin/currency-rates

# 5. hotel-common連携正常動作
# ✅ API呼び出し・データ表示正常
```

### **統合確認**
```bash
# Docker Compose 統合確認
docker-compose -f docker-compose.unified.yml up -d
sleep 30

# 全サービス正常起動確認
curl http://localhost:3400/health  # hotel-common
curl http://localhost:3100/api/healthz  # hotel-saas

# 統合動作確認
# ✅ SuperAdmin画面でAI設定変更
# ✅ hotel-commonで設定値反映確認
# ✅ エラーログ0件確認
```

---

## 🚨 **エラー発生時の対処**

### **TypeScriptエラー発生時**
```bash
# 1. エラー詳細確認
npm run type-check 2>&1 | tee ts-errors.log

# 2. エラー修正（例）
# - 型定義不足 → 型追加
# - インポートエラー → パス修正
# - 型不整合 → 型アサーション・修正

# 3. 修正後確認
npm run type-check
# ✅ Found 0 errors. まで修正継続

# 4. 次ステップ進行
```

### **サーバー起動エラー時**
```bash
# 1. プロセス確認・終了
pkill -f "hotel-common\|hotel-saas"

# 2. キャッシュクリア
rm -rf .nuxt .output dist node_modules/.cache

# 3. 依存関係再インストール
npm install

# 4. 段階的起動確認
npm run build
npm run dev

# 5. 正常起動まで修正継続
```

---

## 🎯 **Phase 1 成功基準**

### **必須達成項目**
- [ ] TypeScriptエラー完全0件（hotel-common・hotel-saas）
- [ ] 全サーバー安定起動（24時間連続稼働確認）
- [ ] 新規API全エンドポイント正常応答
- [ ] SuperAdmin画面全機能正常動作
- [ ] hotel-common ↔ hotel-saas 連携正常動作
- [ ] Docker統合環境正常動作

### **品質基準**
- [ ] レスポンス時間: 全API 500ms以内
- [ ] メモリ使用量: 各サービス 512MB以内
- [ ] エラーログ: 0件/24時間
- [ ] テストカバレッジ: 80%以上

---

## ➡️ **Phase 2 進行条件**

**Phase 1完了確認後のみPhase 2（AIクレジット管理）実装開始可能**

```bash
# Phase 2開始前の最終確認
npm run type-check  # hotel-common・hotel-saas両方
npm run build      # hotel-common・hotel-saas両方
docker-compose -f docker-compose.unified.yml up -d
# ✅ 全て成功確認後にPhase 2開始
```

---

**⚠️ 重要**: 各ステップでTypeScriptエラーが発生した場合、**必ず解消してから次に進む**。エラーを残したまま進行することは禁止。

**作成者**: hotel-kanri統合管理システム  
**承認**: システム統括責任者
