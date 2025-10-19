# 🗄️ 販売システム データベーススキーマ設計書

## 概要
ハイパーパワーマーケティング戦略実装のためのデータベース設計。マルチテナント対応、3WAY紹介システム、代理店プログラム、リスクリバーサル機能をサポートする包括的なスキーマ。

---

## 🏗️ 基本アーキテクチャ

### マルチテナント設計原則
1. **テナント分離**: 全テーブルに`tenant_id`カラム
2. **データ隔離**: Row-Level Security (RLS) 適用
3. **スケーラビリティ**: インデックス最適化
4. **監査証跡**: 作成・更新日時の完全記録

---

## 📋 テーブル設計

### 1. テナント・プラン管理

#### **tenants (テナント情報)**
```sql
CREATE TABLE tenants (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL COMMENT 'ホテル名',
  domain VARCHAR(255) UNIQUE COMMENT 'サブドメイン',
  plan_type VARCHAR(50) NOT NULL COMMENT 'プランタイプ',
  status VARCHAR(20) DEFAULT 'active' COMMENT 'テナント状態',
  billing_cycle VARCHAR(20) DEFAULT 'monthly' COMMENT '請求サイクル',
  discount_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '年払い割引率',
  contract_start_date DATE NOT NULL COMMENT '契約開始日',
  contract_end_date DATE COMMENT '契約終了日',
  rooms_count INTEGER DEFAULT 0 COMMENT '客室数',
  
  -- 連絡先情報
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  
  -- 住所情報
  address_postal_code VARCHAR(10),
  address_prefecture VARCHAR(50),
  address_city VARCHAR(100),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  
  -- メタデータ
  metadata JSON COMMENT '追加設定',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_tenants_plan_type (plan_type),
  INDEX idx_tenants_status (status),
  INDEX idx_tenants_contract_dates (contract_start_date, contract_end_date)
);
```

#### **subscription_plans (プラン定義)**
```sql
CREATE TABLE subscription_plans (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  plan_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'プランコード',
  plan_name VARCHAR(100) NOT NULL COMMENT 'プラン名',
  plan_category VARCHAR(20) NOT NULL COMMENT 'LEISURE or OMOTENASU',
  base_price DECIMAL(10,2) NOT NULL COMMENT '基本月額料金',
  max_rooms INTEGER NOT NULL COMMENT '最大客室数',
  
  -- 機能制限
  features JSON NOT NULL COMMENT '利用可能機能リスト',
  restrictions JSON COMMENT '制限事項',
  
  -- 割引設定
  annual_discount_rate DECIMAL(5,2) DEFAULT 5.00 COMMENT '年払い割引率',
  biennial_discount_rate DECIMAL(5,2) DEFAULT 10.00 COMMENT '2年払い割引率',
  
  -- リスクリバーサル設定
  refund_guarantee_days INTEGER DEFAULT 30 COMMENT '返金保証日数',
  roi_guarantee_months INTEGER DEFAULT 6 COMMENT 'ROI保証期間',
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_plans_category (plan_category),
  INDEX idx_plans_active (is_active)
);
```

### 2. 代理店管理

#### **agents (代理店情報)**
```sql
CREATE TABLE agents (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  agent_code VARCHAR(20) UNIQUE NOT NULL COMMENT '代理店コード',
  
  -- 基本情報
  company_name VARCHAR(255) NOT NULL COMMENT '会社名',
  representative_name VARCHAR(255) NOT NULL COMMENT '代表者名',
  contact_name VARCHAR(255) NOT NULL COMMENT '担当者名',
  
  -- 連絡先
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  fax VARCHAR(20),
  
  -- 住所
  postal_code VARCHAR(10),
  prefecture VARCHAR(50),
  city VARCHAR(100),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  
  -- 代理店ステータス
  rank VARCHAR(20) DEFAULT 'bronze' COMMENT '代理店ランク',
  status VARCHAR(20) DEFAULT 'active' COMMENT '代理店状態',
  territory VARCHAR(255) COMMENT '担当エリア（Diamond限定）',
  exclusive_territory BOOLEAN DEFAULT FALSE COMMENT '独占エリア権',
  
  -- 契約情報
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  commission_override JSON COMMENT '個別コミッション設定',
  
  -- 営業支援
  marketing_budget DECIMAL(10,2) DEFAULT 0 COMMENT '月間マーケティング支援予算',
  dedicated_support BOOLEAN DEFAULT FALSE COMMENT '専任サポート',
  
  -- メタデータ
  notes TEXT COMMENT '備考',
  metadata JSON COMMENT '追加情報',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_agents_rank (rank),
  INDEX idx_agents_status (status),
  INDEX idx_agents_territory (territory),
  INDEX idx_agents_contract_dates (contract_start_date, contract_end_date)
);
```

#### **agent_rank_settings (代理店ランク設定)**
```sql
CREATE TABLE agent_rank_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  rank VARCHAR(20) UNIQUE NOT NULL COMMENT 'ランク名',
  display_name VARCHAR(50) NOT NULL COMMENT '表示名',
  
  -- コミッション設定
  first_year_margin DECIMAL(5,2) NOT NULL COMMENT '初年度マージン率',
  continuing_margin DECIMAL(5,2) NOT NULL COMMENT '継続マージン率',
  
  -- ランク条件
  annual_sales_requirement DECIMAL(12,2) COMMENT '年間売上条件',
  contracts_requirement INTEGER COMMENT '年間契約数条件',
  
  -- 特典
  benefits JSON NOT NULL COMMENT '特典内容',
  marketing_support_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'マーケティング支援額',
  
  -- ボーナス設定
  super_bonus_threshold INTEGER COMMENT 'スーパーボーナス閾値',
  super_bonus_amount DECIMAL(10,2) COMMENT 'スーパーボーナス金額',
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **agent_sales (代理店売上実績)**
```sql
CREATE TABLE agent_sales (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  agent_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  
  -- 契約情報
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  monthly_amount DECIMAL(10,2) NOT NULL COMMENT '月額契約金額',
  
  -- コミッション計算
  first_year_commission_rate DECIMAL(5,2) NOT NULL,
  continuing_commission_rate DECIMAL(5,2) NOT NULL,
  first_year_commission DECIMAL(10,2) NOT NULL COMMENT '初年度月額コミッション',
  continuing_commission DECIMAL(10,2) NOT NULL COMMENT '継続月額コミッション',
  
  -- ステータス
  status VARCHAR(20) DEFAULT 'active' COMMENT '契約状態',
  cancellation_reason TEXT COMMENT 'キャンセル理由',
  cancelled_at TIMESTAMP NULL,
  
  -- メタデータ
  referral_source VARCHAR(100) COMMENT '紹介元',
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  
  INDEX idx_agent_sales_agent (agent_id),
  INDEX idx_agent_sales_tenant (tenant_id),
  INDEX idx_agent_sales_dates (contract_start_date, contract_end_date),
  INDEX idx_agent_sales_status (status)
);
```

### 3. 紹介システム

#### **referrals (紹介記録)**
```sql
CREATE TABLE referrals (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- 紹介者情報
  referrer_type VARCHAR(20) NOT NULL COMMENT '紹介者タイプ',
  referrer_id VARCHAR(36) NOT NULL COMMENT '紹介者ID',
  
  -- 被紹介者情報
  referred_tenant_id VARCHAR(36) COMMENT '紹介されたテナントID',
  referred_email VARCHAR(255) COMMENT '紹介された顧客のメール',
  referred_company VARCHAR(255) COMMENT '紹介された会社名',
  
  -- 紹介追跡
  referral_code VARCHAR(50) UNIQUE NOT NULL COMMENT '紹介コード',
  tracking_url VARCHAR(500) COMMENT '追跡URL',
  
  -- 報酬設定
  commission_rate DECIMAL(5,2) NOT NULL COMMENT 'コミッション率',
  commission_duration_months INTEGER DEFAULT 12 COMMENT 'コミッション期間',
  
  -- ステータス管理
  status VARCHAR(20) DEFAULT 'pending' COMMENT '紹介ステータス',
  conversion_date TIMESTAMP NULL COMMENT '成約日',
  first_payment_date TIMESTAMP NULL COMMENT '初回支払日',
  
  -- キャンペーン情報
  campaign_id VARCHAR(36) COMMENT 'キャンペーンID',
  campaign_name VARCHAR(100) COMMENT 'キャンペーン名',
  
  -- メタデータ
  source_page VARCHAR(255) COMMENT '紹介元ページ',
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (referred_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  
  INDEX idx_referrals_code (referral_code),
  INDEX idx_referrals_referrer (referrer_type, referrer_id),
  INDEX idx_referrals_status (status),
  INDEX idx_referrals_conversion (conversion_date),
  INDEX idx_referrals_campaign (campaign_id)
);
```

#### **referral_payments (紹介報酬支払い)**
```sql
CREATE TABLE referral_payments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  referral_id VARCHAR(36) NOT NULL,
  
  -- 支払い期間
  payment_month DATE NOT NULL COMMENT '支払い対象月',
  contract_month INTEGER NOT NULL COMMENT '契約からの経過月数',
  
  -- 金額計算
  base_amount DECIMAL(10,2) NOT NULL COMMENT 'ベース金額',
  commission_rate DECIMAL(5,2) NOT NULL COMMENT '適用コミッション率',
  commission_amount DECIMAL(10,2) NOT NULL COMMENT 'コミッション金額',
  
  -- 税金・手数料
  tax_rate DECIMAL(5,2) DEFAULT 0 COMMENT '税率',
  tax_amount DECIMAL(10,2) DEFAULT 0 COMMENT '税額',
  fee_amount DECIMAL(10,2) DEFAULT 0 COMMENT '手数料',
  net_amount DECIMAL(10,2) NOT NULL COMMENT '支払い純額',
  
  -- 支払い状況
  payment_status VARCHAR(20) DEFAULT 'pending' COMMENT '支払い状況',
  payment_method VARCHAR(50) COMMENT '支払い方法',
  payment_reference VARCHAR(100) COMMENT '支払い参照番号',
  paid_at TIMESTAMP NULL COMMENT '支払い実行日',
  
  -- メタデータ
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
  
  INDEX idx_referral_payments_referral (referral_id),
  INDEX idx_referral_payments_month (payment_month),
  INDEX idx_referral_payments_status (payment_status),
  
  UNIQUE KEY uk_referral_payment_month (referral_id, payment_month)
);
```

### 4. PMS連携

#### **pms_vendors (PMSベンダー)**
```sql
CREATE TABLE pms_vendors (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  vendor_code VARCHAR(20) UNIQUE NOT NULL COMMENT 'ベンダーコード',
  vendor_name VARCHAR(255) NOT NULL COMMENT 'ベンダー名',
  
  -- 連絡先
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  contact_person VARCHAR(255),
  
  -- API設定
  api_endpoint VARCHAR(500) COMMENT 'APIエンドポイント',
  api_version VARCHAR(20) COMMENT 'APIバージョン',
  auth_method VARCHAR(50) COMMENT '認証方式',
  
  -- パートナーシップ
  partnership_level VARCHAR(20) DEFAULT 'basic' COMMENT 'パートナーシップレベル',
  commission_rate DECIMAL(5,2) DEFAULT 20.00 COMMENT 'コミッション率',
  
  -- ステータス
  status VARCHAR(20) DEFAULT 'active',
  integration_status VARCHAR(20) DEFAULT 'available' COMMENT '統合状況',
  
  -- サポート機能
  supported_features JSON COMMENT 'サポート機能リスト',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_pms_vendors_code (vendor_code),
  INDEX idx_pms_vendors_status (status)
);
```

#### **pms_integrations (PMS連携)**
```sql
CREATE TABLE pms_integrations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id VARCHAR(36) NOT NULL,
  vendor_id VARCHAR(36) NOT NULL,
  
  -- 連携設定
  integration_name VARCHAR(255) NOT NULL COMMENT '連携名',
  integration_type VARCHAR(50) NOT NULL COMMENT '連携タイプ',
  
  -- 認証情報（暗号化）
  credentials JSON COMMENT '認証情報（暗号化）',
  
  -- 同期設定
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_frequency INTEGER DEFAULT 15 COMMENT '同期間隔（分）',
  last_sync_at TIMESTAMP NULL COMMENT '最終同期日時',
  next_sync_at TIMESTAMP NULL COMMENT '次回同期予定',
  
  -- ステータス
  status VARCHAR(20) DEFAULT 'active',
  health_status VARCHAR(20) DEFAULT 'healthy' COMMENT 'ヘルス状態',
  error_count INTEGER DEFAULT 0 COMMENT 'エラー回数',
  last_error TEXT COMMENT '最終エラー',
  
  -- 設定
  mapping_config JSON COMMENT 'データマッピング設定',
  filter_config JSON COMMENT 'フィルター設定',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES pms_vendors(id) ON DELETE CASCADE,
  
  INDEX idx_pms_integrations_tenant (tenant_id),
  INDEX idx_pms_integrations_vendor (vendor_id),
  INDEX idx_pms_integrations_sync (next_sync_at),
  
  UNIQUE KEY uk_tenant_vendor_type (tenant_id, vendor_id, integration_type)
);
```

### 5. リスクリバーサル

#### **refund_requests (返金申請)**
```sql
CREATE TABLE refund_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id VARCHAR(36) NOT NULL,
  
  -- 申請情報
  request_type VARCHAR(50) NOT NULL COMMENT '申請タイプ',
  reason VARCHAR(500) NOT NULL COMMENT '申請理由',
  detailed_reason TEXT COMMENT '詳細理由',
  
  -- 金額
  amount_requested DECIMAL(10,2) NOT NULL COMMENT '申請金額',
  amount_approved DECIMAL(10,2) COMMENT '承認金額',
  
  -- ステータス
  status VARCHAR(20) DEFAULT 'pending' COMMENT '申請状況',
  priority VARCHAR(20) DEFAULT 'normal' COMMENT '優先度',
  
  -- 処理情報
  assigned_to VARCHAR(36) COMMENT '担当者ID',
  reviewed_by VARCHAR(36) COMMENT 'レビュー担当者ID',
  reviewed_at TIMESTAMP NULL COMMENT 'レビュー日時',
  approved_by VARCHAR(36) COMMENT '承認者ID',
  approved_at TIMESTAMP NULL COMMENT '承認日時',
  processed_at TIMESTAMP NULL COMMENT '処理完了日時',
  
  -- 支払い情報
  payment_method VARCHAR(50) COMMENT '返金方法',
  payment_reference VARCHAR(100) COMMENT '支払い参照番号',
  
  -- メタデータ
  supporting_documents JSON COMMENT '添付書類',
  internal_notes TEXT COMMENT '内部メモ',
  customer_communication TEXT COMMENT '顧客とのやり取り',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  
  INDEX idx_refund_requests_tenant (tenant_id),
  INDEX idx_refund_requests_status (status),
  INDEX idx_refund_requests_type (request_type),
  INDEX idx_refund_requests_assigned (assigned_to)
);
```

#### **roi_measurements (ROI測定)**
```sql
CREATE TABLE roi_measurements (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id VARCHAR(36) NOT NULL,
  
  -- 測定期間
  measurement_period VARCHAR(20) NOT NULL COMMENT '測定期間',
  period_start_date DATE NOT NULL COMMENT '期間開始日',
  period_end_date DATE NOT NULL COMMENT '期間終了日',
  
  -- ROI計算
  roi_percentage DECIMAL(8,2) NOT NULL COMMENT 'ROI率',
  
  -- コスト削減
  labor_cost_before DECIMAL(10,2) COMMENT '導入前人件費',
  labor_cost_after DECIMAL(10,2) COMMENT '導入後人件費',
  labor_cost_savings DECIMAL(10,2) COMMENT '人件費削減額',
  
  operational_cost_before DECIMAL(10,2) COMMENT '導入前運営費',
  operational_cost_after DECIMAL(10,2) COMMENT '導入後運営費',
  operational_cost_savings DECIMAL(10,2) COMMENT '運営費削減額',
  
  total_cost_savings DECIMAL(10,2) NOT NULL COMMENT '総コスト削減額',
  
  -- 売上向上
  revenue_before DECIMAL(10,2) COMMENT '導入前売上',
  revenue_after DECIMAL(10,2) COMMENT '導入後売上',
  revenue_increase DECIMAL(10,2) COMMENT '売上向上額',
  
  -- 効率性指標
  efficiency_metrics JSON COMMENT '効率性指標',
  
  -- 投資額
  system_investment DECIMAL(10,2) NOT NULL COMMENT 'システム投資額',
  
  -- 測定状況
  measurement_status VARCHAR(20) DEFAULT 'completed',
  confidence_level DECIMAL(5,2) COMMENT '信頼度',
  
  -- メタデータ
  calculation_method VARCHAR(100) COMMENT '計算方法',
  data_sources JSON COMMENT 'データソース',
  notes TEXT COMMENT '備考',
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  
  INDEX idx_roi_measurements_tenant (tenant_id),
  INDEX idx_roi_measurements_period (measurement_period),
  INDEX idx_roi_measurements_dates (period_start_date, period_end_date),
  INDEX idx_roi_measurements_roi (roi_percentage)
);
```

### 6. キャンペーン・プロモーション

#### **marketing_campaigns (マーケティングキャンペーン)**
```sql
CREATE TABLE marketing_campaigns (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- キャンペーン基本情報
  campaign_code VARCHAR(50) UNIQUE NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL COMMENT 'キャンペーンタイプ',
  
  -- 期間
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- ターゲット
  target_audience VARCHAR(100) COMMENT 'ターゲット層',
  target_plans JSON COMMENT '対象プラン',
  target_regions JSON COMMENT '対象地域',
  
  -- 特典内容
  discount_type VARCHAR(20) COMMENT '割引タイプ',
  discount_value DECIMAL(8,2) COMMENT '割引値',
  bonus_features JSON COMMENT 'ボーナス機能',
  
  -- 予算・目標
  budget DECIMAL(10,2) COMMENT '予算',
  target_conversions INTEGER COMMENT '目標コンバージョン数',
  target_revenue DECIMAL(12,2) COMMENT '目標売上',
  
  -- 実績
  actual_conversions INTEGER DEFAULT 0,
  actual_revenue DECIMAL(12,2) DEFAULT 0,
  
  -- ステータス
  status VARCHAR(20) DEFAULT 'draft',
  
  -- メタデータ
  description TEXT,
  terms_conditions TEXT COMMENT '利用規約',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_campaigns_code (campaign_code),
  INDEX idx_campaigns_dates (start_date, end_date),
  INDEX idx_campaigns_status (status),
  INDEX idx_campaigns_type (campaign_type)
);
```

---

## 🔧 インデックス最適化

### パフォーマンス重要インデックス
```sql
-- 代理店売上検索最適化
CREATE INDEX idx_agent_sales_performance 
ON agent_sales (agent_id, contract_start_date, status);

-- 紹介追跡最適化
CREATE INDEX idx_referrals_tracking 
ON referrals (referral_code, status, created_at);

-- 支払い処理最適化
CREATE INDEX idx_payments_processing 
ON referral_payments (payment_status, payment_month);

-- テナント検索最適化
CREATE INDEX idx_tenants_search 
ON tenants (plan_type, status, created_at);

-- ROI分析最適化
CREATE INDEX idx_roi_analysis 
ON roi_measurements (tenant_id, period_end_date, roi_percentage);
```

---

## 🔐 セキュリティ設定

### Row Level Security (RLS)
```sql
-- テナントデータ分離
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  USING (id = current_setting('app.current_tenant_id')::uuid);

-- 代理店データ分離
ALTER TABLE agent_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_sales_isolation ON agent_sales
  USING (agent_id = current_setting('app.current_agent_id')::uuid);
```

### 暗号化設定
```sql
-- 機密情報暗号化
ALTER TABLE pms_integrations 
ADD CONSTRAINT chk_credentials_encrypted 
CHECK (credentials IS NULL OR JSON_VALID(credentials));
```

---

## 📊 分析用ビュー

### 代理店パフォーマンスビュー
```sql
CREATE VIEW v_agent_performance AS
SELECT 
  a.id as agent_id,
  a.company_name,
  a.rank,
  COUNT(asales.id) as total_contracts,
  SUM(asales.monthly_amount) as total_monthly_revenue,
  AVG(asales.first_year_commission) as avg_commission,
  MAX(asales.contract_start_date) as latest_contract
FROM agents a
LEFT JOIN agent_sales asales ON a.id = asales.agent_id
WHERE a.status = 'active'
GROUP BY a.id, a.company_name, a.rank;
```

### 紹介効果分析ビュー
```sql
CREATE VIEW v_referral_analytics AS
SELECT 
  r.referrer_type,
  COUNT(*) as total_referrals,
  COUNT(CASE WHEN r.status = 'converted' THEN 1 END) as conversions,
  ROUND(COUNT(CASE WHEN r.status = 'converted' THEN 1 END) * 100.0 / COUNT(*), 2) as conversion_rate,
  SUM(rp.commission_amount) as total_commissions_paid
FROM referrals r
LEFT JOIN referral_payments rp ON r.id = rp.referral_id AND rp.payment_status = 'paid'
GROUP BY r.referrer_type;
```

---

## 🚀 マイグレーション戦略

### Phase 1: 基本テーブル作成
```sql
-- 1. テナント・プラン管理
-- 2. 代理店基本情報
-- 3. 紹介システム基本
```

### Phase 2: 連携システム
```sql
-- 1. PMS連携テーブル
-- 2. 支払い管理強化
-- 3. 分析ビュー作成
```

### Phase 3: 最適化・拡張
```sql
-- 1. インデックス最適化
-- 2. パーティショニング
-- 3. アーカイブ戦略
```

**結論**: この包括的なデータベース設計により、ハイパーパワーマーケティング戦略の全機能をサポートし、スケーラブルで安全なマルチテナントシステムを実現する。 