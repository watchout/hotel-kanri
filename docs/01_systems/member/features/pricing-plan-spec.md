# 💰 料金プラン＆支払い機能 仕様書

## 🎯 **VMV準拠の料金プラン設計**

### 🔮 **Vision実現のための段階的成長支援**
中小ホテルの成長段階に応じて、無理のない料金設定で段階的にDX化を支援

### 🎯 **Mission実現のための簡便性**
複雑な契約手続きを排除し、オンラインで即座に開始可能

### 💎 **Values実現のための価値提供**
各プランで明確な価値提供と成長支援を実現

---

## 📊 **料金プラン構成**

### 🆓 **FREE プラン（無料）**
**対象**: 試用・小規模ホテル（10室以下）
**価格**: ¥0/月
**会員上限**: 100名

#### ✅ **基本機能**
- 会員登録・管理
- OTPログイン
- 基本ポイントシステム
- 特典管理（5個まで）
- 予約管理（月50件まで）
- 基本レポート

#### ❌ **制限事項**
- AI機能なし
- UI Builder使用不可
- サポートはメールのみ
- データ保持期間：6ヶ月

---

### 🥉 **BASIC プラン**
**対象**: 小規模ホテル（10-30室）
**価格**: ¥8,800/月（税込）
**会員上限**: 500名

#### ✅ **FREE + 追加機能**
- AR宝探しゲーム
- 基本テーマ選択（5種類）
- 会員行動分析（基本）
- 自動メール配信
- 電話サポート（営業時間内）
- データ保持期間：1年

#### 🎯 **ターゲット収益**
- 人件費削減：月10万円
- 顧客満足度向上：リピート率+15%
- ROI：約11倍

---

### 🥈 **PRO プラン**
**対象**: 中規模ホテル（30-50室）
**価格**: ¥28,800/月（税込）
**会員上限**: 2,000名

#### ✅ **BASIC + 追加機能**
- **AIチャットボット**（24時間対応）
- **ノーコードUI Builder**
- **AI会員分析・離脱予測**
- **記憶するチェックアウト機能**
- カスタムページ作成
- 高度なレポート・分析
- 外部システム連携（PMS等）
- 優先サポート（電話・チャット）

#### 🤖 **AI機能**
- 月間API使用量：10,000リクエスト
- 感情分析・パーソナライズ対応
- 自動応答テンプレート

---

### 🥇 **PREMIUM プラン**
**対象**: 大規模・高級ホテル（50室以上）
**価格**: ¥58,800/月（税込）
**会員上限**: 無制限

#### ✅ **PRO + 追加機能**
- **AIビルド機能**（自然言語からUI生成）
- **高度な感情分析・パーソナライズ**
- **AI需要予測・価格最適化**
- **記念日・特別対応自動察知**
- **IoT連携準備**
- マルチテナント管理
- 専用サポート担当
- カスタム開発相談

#### 🤖 **AI機能**
- 月間API使用量：無制限
- カスタムAI学習
- 専用プロンプト設定

---

### 🏢 **ENTERPRISE プラン**
**対象**: ホテルチェーン・フランチャイズ
**価格**: 個別見積り

#### ✅ **PREMIUM + 追加機能**
- マルチテナント管理
- ホワイトラベル提供
- 専用クラウド環境
- SLA保証（99.9%）
- 24時間専用サポート
- オンサイト導入支援
- カスタム機能開発

---

## 💳 **支払い・決済システム**

### 🏦 **対応決済手段**
```json
{
  "payment_methods": [
    {
      "type": "credit_card",
      "providers": ["Visa", "MasterCard", "JCB", "American Express"],
      "processor": "Stripe"
    },
    {
      "type": "bank_transfer",
      "description": "銀行振込（月払い・年払い）",
      "handling_fee": "¥330"
    },
    {
      "type": "invoice",
      "description": "請求書払い（法人向け）",
      "payment_term": "月末締め翌月末払い"
    }
  ]
}
```

### 📅 **請求サイクル**
- **月額プラン**: 毎月同日自動課金
- **年額プラン**: 12ヶ月分前払い（2ヶ月分割引）
- **請求書払い**: 月末締め翌月末払い

### 🎯 **料金体系設計**
```
FREE → BASIC: 導入ハードル最小化
BASIC → PRO: AI機能による大幅な価値向上
PRO → PREMIUM: 高度なカスタマイズ性
PREMIUM → ENTERPRISE: 大規模運用対応
```

---

## 🗄️ **追加データベーステーブル**

### 💰 **subscriptions（サブスクリプション）**
```sql
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    plan_type VARCHAR(20) NOT NULL,  -- 'free', 'basic', 'pro', 'premium', 'enterprise'
    status VARCHAR(20) NOT NULL,     -- 'active', 'cancelled', 'expired', 'trial'
    
    -- 料金情報
    monthly_price INTEGER NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,  -- 'monthly', 'yearly'
    trial_end_date DATE,
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    
    -- 利用制限
    member_limit INTEGER,
    api_usage_limit INTEGER,
    storage_limit_gb INTEGER,
    
    -- 支払い情報
    payment_method VARCHAR(50),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 🧾 **invoices（請求書）**
```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
    
    -- 請求情報
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    tax_amount INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    
    -- 期間情報
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- ステータス
    status VARCHAR(20) NOT NULL,  -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    paid_at TIMESTAMP,
    
    -- Stripe情報
    stripe_invoice_id VARCHAR(100),
    stripe_payment_intent_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 📊 **usage_metrics（使用量メトリクス）**
```sql
CREATE TABLE usage_metrics (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
    
    -- 使用量データ
    metric_type VARCHAR(50) NOT NULL,  -- 'members', 'api_calls', 'storage'
    metric_value INTEGER NOT NULL,
    recorded_date DATE NOT NULL,
    
    -- 制限チェック
    limit_value INTEGER,
    is_over_limit BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(subscription_id, metric_type, recorded_date)
);
```

---

## 🔄 **プランアップグレード・ダウングレード**

### ⬆️ **アップグレード**
```javascript
const upgradeFlow = {
  "immediate_upgrade": {
    "billing": "日割り計算で差額請求",
    "features": "即座にすべての機能が利用可能",
    "data": "既存データはそのまま保持"
  },
  "trial_period": {
    "pro_premium": "14日間無料トライアル",
    "cancellation": "トライアル期間中はいつでも元プランに戻せる"
  }
};
```

### ⬇️ **ダウングレード**
```javascript
const downgradeFlow = {
  "end_of_period": "現在の請求期間終了時に変更",
  "feature_limitation": "制限を超えた機能は段階的に無効化",
  "data_retention": "90日間のデータ保持期間",
  "notification": "制限超過の事前通知"
};
```

---

## 🎯 **プラン別機能マトリックス**

| 機能カテゴリ | FREE | BASIC | PRO | PREMIUM | ENTERPRISE |
|-------------|------|-------|-----|---------|------------|
| **基本機能** | | | | | |
| 会員管理 | ✅ | ✅ | ✅ | ✅ | ✅ |
| ポイントシステム | ✅ | ✅ | ✅ | ✅ | ✅ |
| 予約管理 | 制限あり | ✅ | ✅ | ✅ | ✅ |
| **AI機能** | | | | | |
| AIチャットボット | ❌ | ❌ | ✅ | ✅ | ✅ |
| 感情分析 | ❌ | ❌ | 基本 | 高度 | カスタム |
| 需要予測 | ❌ | ❌ | ❌ | ✅ | ✅ |
| **UI Builder** | | | | | |
| テーマ選択 | ❌ | 基本 | 高度 | 高度 | カスタム |
| AIビルド | ❌ | ❌ | ❌ | ✅ | ✅ |
| **サポート** | | | | | |
| メールサポート | ✅ | ✅ | ✅ | ✅ | ✅ |
| 電話サポート | ❌ | 営業時間 | 優先 | 専用 | 24時間 |

---

## 📈 **収益予測とKPI**

### 💰 **収益目標（年間）**
```
FREE → BASIC 転換率: 15%
BASIC → PRO 転換率: 25%
PRO → PREMIUM 転換率: 10%

目標顧客数（3年後）:
- FREE: 1,000社
- BASIC: 150社 → 年間売上: ¥15,840,000
- PRO: 37社 → 年間売上: ¥12,787,200
- PREMIUM: 4社 → 年間売上: ¥2,822,400
合計年間売上: ¥31,449,600
```

### 📊 **主要KPI**
- **解約率**: 月間5%以下
- **LTV/CAC比**: 3.0以上
- **プランアップグレード率**: 月間2%以上
- **サポート満足度**: 4.5/5.0以上

---

## 🚀 **実装フェーズ**

### **Phase 1: 基本決済機能（2-3週間）**
1. Stripe連携
2. サブスクリプション管理
3. 基本的なプラン制御

### **Phase 2: 高度な機能制御（3-4週間）**
1. 使用量監視システム
2. 制限超過時の自動制御
3. プランアップグレード・ダウングレード

### **Phase 3: 請求書・レポート機能（2-3週間）**
1. 請求書生成・送信
2. 使用量レポート
3. 売上分析ダッシュボード

---

## 🔐 **セキュリティ・コンプライアンス**

### 💳 **決済セキュリティ**
- PCI DSS準拠（Stripe経由）
- 決済情報は自社DB保存なし
- トークン化による安全な決済処理

### 📋 **法的要件**
- 特定商取引法に基づく表記
- 利用規約・プライバシーポリシー
- 自動更新に関する適切な通知

---

このような料金プランと支払い機能の実装について、どの部分から優先的に着手したいでしょうか？ 