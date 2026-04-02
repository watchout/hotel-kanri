# 🚀 最短実装計画書 - 導入待ち店舗対応

## 概要
導入を待っている店舗への最短対応を目指し、マルチテナント化・代理店機能・エコノミープランの最小限実装を行う。

**実装期間**: 2週間  
**対象**: 導入待ち店舗への即座対応  
**優先度**: 最高

---

## 🎯 プランごとの機能制限（明確化）

### 💰 料金プラン体系

#### 🏢 OmotenasuAI プラン
```markdown
【Economy】¥29,800/月（30室）
✅ 基本Room Service
✅ 基本AIコンシェルジュ
✅ 日本語・英語対応
✅ 基本レポート
❌ 多言語対応（3言語以上）
❌ 高度AI機能
❌ PMS連携
❌ カスタマイズ

【Professional】¥79,800/月（80室）
✅ Economy全機能
✅ 多言語対応（5言語）
✅ AIアップセル機能
✅ PMS連携（基本）
✅ 詳細レポート
❌ SSO連携
❌ API開発支援
❌ 専任サポート

【Enterprise】¥139,800/月（200室）
✅ Professional全機能
✅ 多言語対応（15言語）
✅ SSO連携
✅ API開発支援
✅ 専任サポート
✅ SLA保証（99.9%）
✅ カスタム開発
```

#### 🏨 LEISURE プラン
```markdown
【Economy】¥19,800/月（20室）
✅ Room Service
✅ 基本情報配信
✅ 日本語のみ
✅ 基本レポート
❌ AIコンシェルジュ
❌ 多言語対応
❌ PMS連携

【Professional】¥49,800/月（50室）
✅ Economy全機能
✅ 基本AIコンシェルジュ
✅ 英語対応
✅ SNS連携
❌ 高度AI機能
❌ PMS連携

【Enterprise】¥99,800/月（100室）
✅ Professional全機能
✅ 多言語対応（5言語）
✅ PMS連携
✅ 高度分析
✅ カスタマイズ
```

---

## 🤝 代理店支払いシステム

### 💳 支払い構造（代理店経由）

#### 基本方針
**✅ 代理店が支払い責任を負う**
- 代理店が月額料金を当社に支払い
- 代理店が顧客から料金を回収
- 当社は代理店とのみ契約関係

#### 具体的な流れ
```markdown
【契約構造】
1. 当社 ⇄ 代理店（メイン契約）
2. 代理店 ⇄ ホテル（サブ契約）

【支払いフロー】
1. ホテル → 代理店（月額料金）
2. 代理店 → 当社（月額料金 - マージン）
3. 当社 → 代理店（マージン支払い：別途）

【例：Professional OmotenasuAI（¥79,800）】
- ホテル支払い: ¥79,800/月
- 代理店→当社: ¥79,800/月
- 当社→代理店: ¥51,870/月（65%マージン）
- 代理店純利益: ¥51,870/月
```

#### システム実装
```markdown
【請求システム】
- 代理店別請求書自動生成
- ホテル別利用量集計
- マージン自動計算
- 支払い状況追跡

【データ構造】
- Tenant.agentId: 代理店ID
- Tenant.agentCommissionRate: マージン率
- 月次請求データ自動生成
```

---

## ⚡ 最短実装スケジュール（2週間）

### Week 1: 基盤実装

#### Day 1-2: データベース・API
- [x] ✅ Prismaスキーマ追加完了
- [x] ✅ マイグレーション実行完了
- [ ] 代理店管理API完成
- [ ] テナント管理API完成

#### Day 3-4: 管理画面
- [ ] 代理店一覧・登録画面
- [ ] テナント一覧・登録画面
- [ ] プラン制限設定画面

#### Day 5-7: 機能制限実装
- [ ] プラン別機能制限ミドルウェア
- [ ] Economy/Professional/Enterprise制限
- [ ] デバイス数制限
- [ ] AI利用制限

### Week 2: 統合・テスト

#### Day 8-10: 統合実装
- [ ] 代理店支払いシステム
- [ ] 請求書生成機能
- [ ] マージン計算システム
- [ ] 導入ワークフロー

#### Day 11-12: テスト・調整
- [ ] 全機能統合テスト
- [ ] プラン制限動作確認
- [ ] 代理店フロー確認
- [ ] パフォーマンステスト

#### Day 13-14: 導入準備
- [ ] 導入待ち店舗データ準備
- [ ] 代理店アカウント作成
- [ ] 本番環境デプロイ
- [ ] 導入開始

---

## 🏪 導入待ち店舗への対応

### 📋 導入プロセス

#### Step 1: 事前準備（即座実行）
```markdown
【代理店登録】
- 既存代理店パートナーの登録
- ランク設定（Bronze/Silver/Gold等）
- マージン率設定

【店舗情報収集】
- ホテル名・連絡先
- 希望プラン
- 客室数・デバイス数
- 導入希望日
```

#### Step 2: システム登録（Week 1完了後）
```markdown
【テナント作成】
- ホテル基本情報登録
- プラン設定
- 代理店紐付け
- 初期設定

【アクセス権付与】
- 管理画面アクセス
- デバイス認証設定
- 初期コンテンツ設定
```

#### Step 3: 導入・稼働（Week 2完了後）
```markdown
【システム導入】
- デバイス設置・設定
- スタッフ研修
- 試験運用
- 本格稼働

【サポート】
- 初期サポート（1週間）
- 運用サポート（継続）
- 問題解決（即座対応）
```

---

## 💻 技術実装詳細

### 🔧 プラン制限ミドルウェア

#### 機能制限チェック
```typescript
// middleware/plan-restrictions.ts
export default defineNuxtRouteMiddleware((to) => {
  const tenant = useTenant()
  const planConfig = getPlanConfig(tenant.value.planType, tenant.value.planCategory)
  
  // 機能別アクセス制御
  if (to.path.includes('/ai/advanced') && !planConfig.features.advancedAI) {
    throw createError({
      statusCode: 403,
      statusMessage: 'この機能はアップグレードが必要です'
    })
  }
  
  // デバイス数制限
  if (to.path.includes('/devices') && tenant.value.deviceCount >= tenant.value.maxDevices) {
    throw createError({
      statusCode: 403,
      statusMessage: 'デバイス数の上限に達しています'
    })
  }
})
```

#### プラン設定
```typescript
// utils/plan-config.ts
export const PLAN_CONFIGS = {
  'omotenasuai-economy': {
    price: 29800,
    maxDevices: 30,
    features: {
      basicAI: true,
      advancedAI: false,
      multiLanguage: false,
      pmsIntegration: false,
      customization: false,
      sso: false,
      dedicatedSupport: false
    }
  },
  'omotenasuai-professional': {
    price: 79800,
    maxDevices: 80,
    features: {
      basicAI: true,
      advancedAI: true,
      multiLanguage: true,
      pmsIntegration: true,
      customization: false,
      sso: false,
      dedicatedSupport: false
    }
  },
  // ... 他のプラン
}
```

### 💰 代理店支払いシステム

#### 月次請求生成
```typescript
// server/cron/generate-monthly-billing.ts
export default defineCronHandler('0 1 1 * *', async () => {
  const agents = await prisma.agent.findMany({
    where: { status: 'active' }
  })
  
  for (const agent of agents) {
    const tenants = await prisma.tenant.findMany({
      where: { agentId: agent.id, status: 'active' }
    })
    
    let totalAmount = 0
    let totalCommission = 0
    
    for (const tenant of tenants) {
      totalAmount += tenant.monthlyPrice
      totalCommission += tenant.monthlyPrice * (tenant.agentCommissionRate || 0)
    }
    
    // 請求書生成
    await generateAgentInvoice(agent.id, totalAmount, totalCommission)
  }
})
```

---

## 📊 導入効果予測

### 📈 期待される成果

#### 短期効果（1ヶ月）
```markdown
【導入実績】
- 導入待ち店舗: 10-15店舗
- 代理店経由: 70%
- 直販: 30%

【売上効果】
- 月間売上: ¥500-750万
- 代理店マージン: ¥250-375万
- 純売上: ¥250-375万
```

#### 中期効果（3ヶ月）
```markdown
【拡大実績】
- 総導入店舗: 30-50店舗
- 代理店ネットワーク: 10-15社
- リピート・紹介: 20%

【売上効果】
- 月間売上: ¥1,500-2,500万
- 年間売上予測: ¥2-3億
```

---

## ⚠️ リスク管理

### 🚨 主要リスク

#### 技術リスク
```markdown
【開発遅延】
- リスク: 2週間で完成しない
- 対策: 最小限機能に絞る、外部リソース活用

【品質問題】
- リスク: バグ・不具合による信頼失墜
- 対策: 段階的リリース、十分なテスト

【スケーラビリティ】
- リスク: 急激な増加でシステム負荷
- 対策: 監視強化、インフラ準備
```

#### ビジネスリスク
```markdown
【代理店支払い遅延】
- リスク: 代理店の支払い能力不足
- 対策: 与信審査、保証金制度

【顧客満足度】
- リスク: 急ぎ導入で品質低下
- 対策: 手厚いサポート、迅速な問題解決
```

---

## 🎯 成功指標

### 📊 KPI設定

#### 技術指標
```markdown
- システム稼働率: 99.5%以上
- API応答時間: 300ms以下
- エラー率: 0.1%以下
- 導入完了率: 100%
```

#### ビジネス指標
```markdown
- 導入店舗数: 15店舗（1ヶ月）
- 代理店満足度: NPS 50以上
- 顧客満足度: NPS 40以上
- 支払い遅延率: 5%以下
```

---

## 🚀 実装開始

### 📋 今週のアクション

#### 即座実行項目
1. **代理店管理画面**: 基本CRUD機能
2. **テナント登録システム**: プラン設定
3. **機能制限ミドルウェア**: 基本実装
4. **導入待ち店舗リスト**: データ整理

#### 来週完成目標
1. **完全なマルチテナント対応**
2. **代理店支払いシステム**
3. **プラン別機能制限**
4. **導入ワークフロー**

**結論**: 2週間で導入待ち店舗への対応を完了し、代理店経由の支払いシステムにより収益性を確保しながら急速な拡大を実現する。 