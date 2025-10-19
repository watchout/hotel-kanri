=== hotel-saas 現状ログ記録状況マトリックス ===

**ドキュメントID**: SAAS-LOG-STATUS-MATRIX-2025-09-24-001  
**対象システム**: hotel-saas  
**調査日**: 2025年9月24日  
**ステータス**: 現状調査完了  

---

## 📊 テーブル × 操作 ログ記録マトリックス

| テーブル名 | CREATE | UPDATE | DELETE | READ | 特殊操作 | 記録テーブル | 記録方法 | 不足情報 |
|-----------|--------|--------|--------|------|---------|------------|---------|---------|
| **orders** | ✅ | ✅ | ✅ | ❌ | ステータス変更 | audit_logs | トリガー自動 | 理由、承認者 |
| **order_items** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **menu_items** | ✅ | ✅ | ✅ | ❌ | 価格変更、在庫調整 | audit_logs | トリガー自動 | 理由、承認者 |
| **categories** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **staff** | ✅ | ✅ | ✅ | ❌ | 権限変更 | audit_logs | トリガー自動 | 理由、承認者 |
| **users** | ✅ | ✅ | ✅ | ❌ | パスワード変更 | audit_logs | トリガー自動 | 理由 |
| **tenants** | ✅ | ✅ | ❌ | ❌ | プラン変更 | audit_logs | トリガー自動 | 理由、承認者 |
| **device_rooms** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **pages** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **page_histories** | ✅ | ❌ | ❌ | ❌ | - | audit_logs | トリガー自動 | - |
| **Campaign** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **CampaignItem** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **price_rules** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **gacha_menus** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **gacha_menu_items** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **RoomStatus** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **Receipt** | ✅ | ✅ | ✅ | ❌ | 返金処理 | audit_logs | トリガー自動 | 理由、承認者 |
| **CheckInSession** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **CheckInGuest** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **unified_media** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **RoomGradeMedia** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **TranslationJobs** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **subscription_plans** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **agents** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **referrals** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **refund_requests** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **marketing_campaigns** | ✅ | ✅ | ✅ | ❌ | - | audit_logs | トリガー自動 | 理由、承認者 |
| **❌ 記録されない操作** | | | | | | | | |
| **認証ログ** | ❌ | ❌ | ❌ | ❌ | ログイン/ログアウト | なし | - | 全て不足 |
| **AIコンシェルジュ** | ❌ | ❌ | ❌ | ❌ | AI会話、推奨 | なし | - | 全て不足 |
| **AIクレジット** | ❌ | ❌ | ❌ | ❌ | 使用、付与、調整 | なし | - | 全て不足 |
| **請求・課金** | ❌ | ❌ | ❌ | ❌ | 計算、発行、支払い | なし | - | 全て不足 |
| **デバイス監視** | ❌ | ❌ | ❌ | ❌ | 使用量、稼働状況 | なし | - | 全て不足 |
| **セキュリティ** | ❌ | ❌ | ❌ | ❌ | 不正アクセス、異常操作 | なし | - | 全て不足 |
| **レポート・分析** | ❌ | ❌ | ❌ | ❌ | 生成、エクスポート | なし | - | 全て不足 |
| **外部連携** | ❌ | ❌ | ❌ | ❌ | 決済、会計、hotel-common | なし | - | 全て不足 |

---

## 🗄️ 現在のテーブル構成

### **audit_logs（既存・稼働中）**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  table_name VARCHAR(100) NOT NULL,        -- 対象テーブル名
  operation VARCHAR(20) NOT NULL,          -- INSERT, UPDATE, DELETE
  record_id UUID,                          -- 対象レコードID
  user_id UUID REFERENCES staff(id),       -- 操作者ID
  user_email VARCHAR(255),                 -- 操作者メール
  user_role VARCHAR(50),                   -- 操作者権限
  old_values JSONB,                        -- 変更前データ
  new_values JSONB,                        -- 変更後データ
  changed_fields JSONB,                    -- 変更フィールド
  ip_address INET,                         -- IPアドレス
  user_agent TEXT,                         -- ユーザーエージェント
  request_id VARCHAR(100),                 -- リクエストID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**記録方法**: PostgreSQLトリガーによる自動記録
**対象操作**: INSERT, UPDATE, DELETE
**対象テーブル**: users, menu_items, orders, tenants等の主要テーブル

### **セッション管理（Redis・一時的）**
```typescript
// Redisに一時保存（永続化されない）
const sessionData = {
  user_id: user.id,
  tenant_id: user.tenant_id,
  device_info: deviceInfo,
  created_at: new Date().toISOString(),
  last_activity: new Date().toISOString()
}
```

---

## 📋 不足しているテーブル・機能

### **1. 認証ログテーブル（未実装）**
```sql
-- 必要だが存在しない
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,             -- login, logout, login_failed
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **2. AIコンシェルジュログテーブル（未実装）**
```sql
-- 必要だが存在しない
CREATE TABLE ai_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID,                            -- ゲストの場合はNULL
  guest_id VARCHAR(100),                   -- ゲストID
  ai_function VARCHAR(50) NOT NULL,        -- chat, recommendation, booking
  input_data JSONB,                        -- 入力データ
  output_data JSONB,                       -- 出力データ
  processing_time_ms INTEGER,              -- 処理時間
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **3. AIクレジット・課金ログテーブル（未実装）**
```sql
-- 必要だが存在しない
CREATE TABLE ai_credit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID,                            -- 使用者ID
  action VARCHAR(50) NOT NULL,             -- use, grant, adjust, expire
  credit_amount INTEGER NOT NULL,          -- クレジット量
  balance_before INTEGER,                  -- 使用前残高
  balance_after INTEGER,                   -- 使用後残高
  ai_function VARCHAR(50),                 -- 使用したAI機能
  cost_calculation JSONB,                  -- コスト計算詳細
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **4. サブスクリプション・請求ログテーブル（未実装）**
```sql
-- 必要だが存在しない
CREATE TABLE billing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  subscription_id INTEGER,                 -- サブスクリプションID
  billing_period VARCHAR(20) NOT NULL,     -- 請求期間 (YYYY-MM)
  action VARCHAR(50) NOT NULL,             -- calculate, invoice, payment, failed
  base_amount DECIMAL(10,2),               -- 基本料金
  additional_costs JSONB,                  -- 追加費用詳細
  total_amount DECIMAL(10,2),              -- 合計金額
  payment_method VARCHAR(50),              -- 支払い方法
  payment_status VARCHAR(20),              -- 支払い状況
  details JSONB,                           -- 詳細情報
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **5. デバイス使用量ログテーブル（未実装）**
```sql
-- 必要だが存在しない
CREATE TABLE device_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  device_id INTEGER NOT NULL,              -- デバイスID
  room_id VARCHAR(100),                    -- 客室ID
  action VARCHAR(50) NOT NULL,             -- active, inactive, order_placed
  usage_duration INTEGER,                  -- 使用時間（分）
  order_count INTEGER DEFAULT 0,          -- 注文数
  revenue_generated DECIMAL(10,2),         -- 売上貢献額
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **6. セキュリティイベントログテーブル（未実装）**
```sql
-- 必要だが存在しない
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID,                            -- 不正アクセスの場合はNULL
  event_type VARCHAR(50) NOT NULL,         -- unauthorized_access, suspicious_activity
  severity VARCHAR(20) NOT NULL,           -- low, medium, high, critical
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚨 重要な問題点

### **1. 業務コンテキストの欠如**
- **現状**: データ変更は記録されるが「なぜ変更したか」が不明
- **問題**: 不正操作と正当な業務操作の区別ができない
- **必要**: 操作理由、承認者情報の記録

### **2. 認証履歴の完全欠如**
- **現状**: ログイン・ログアウト履歴が残らない
- **問題**: セキュリティ監査ができない
- **必要**: 永続的な認証ログテーブル

### **3. AIコンシェルジュの透明性不足**
- **現状**: AI処理の履歴が残らない
- **問題**: AI判断の検証・改善ができない
- **必要**: AI操作ログテーブル

### **4. セキュリティ監視の不備**
- **現状**: 異常操作・不正アクセスの検知・記録なし
- **問題**: セキュリティインシデントの対応不可
- **必要**: セキュリティイベントログテーブル

### **5. 運用分析の困難**
- **現状**: レポート生成・データエクスポートの履歴なし
- **問題**: 誰がいつ何のデータを見たか不明
- **必要**: 操作ログテーブル（READ操作含む）

---

## 📈 優先度別実装計画

### **Priority 1: 緊急（セキュリティ・コンプライアンス）**
1. **認証ログテーブル**: ログイン・ログアウト履歴
2. **audit_logs拡張**: 業務コンテキスト（理由・承認者）追加
3. **セキュリティログテーブル**: 不正アクセス・異常操作検知

### **Priority 2: 重要（業務改善）**
1. **AIコンシェルジュログテーブル**: AI処理履歴
2. **操作ログテーブル**: レポート生成・データエクスポート履歴

### **Priority 3: 改善（運用効率化）**
1. **ログ分析ダッシュボード**: 統合監視機能
2. **自動アラート機能**: 異常検知・通知

---

## 🔧 実装ロードマップ

### **Phase 1: 基盤整備（Week 1-2）**
- audit_logs拡張（業務コンテキスト追加）
- auth_logsテーブル作成・実装

### **Phase 2: セキュリティ強化（Week 3-4）**
- security_logsテーブル作成・実装
- 異常操作検知機能

### **Phase 3: AI・業務ログ（Week 5-6）**
- ai_operation_logsテーブル作成・実装
- レポート操作ログ機能

### **Phase 4: 監視・分析（Week 7-8）**
- 統合ダッシュボード
- 自動アラート機能

---

**調査者**: hotel-kanri統合管理  
**調査完了日**: 2025年9月24日  
**次回更新予定**: 実装完了後
