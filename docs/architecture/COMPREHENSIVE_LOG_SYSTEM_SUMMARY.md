=== 全システム統合ログ管理 総合まとめ ===

**ドキュメントID**: COMPREHENSIVE-LOG-SUMMARY-2025-09-24-001  
**対象システム**: hotel-saas, hotel-pms, hotel-member, hotel-common  
**作成日**: 2025年9月24日  
**ステータス**: 設計完了・実装準備中  

---

## 📋 作成済みドキュメント一覧

| ドキュメント名 | 内容 | 対象システム | 状態 |
|---------------|------|-------------|------|
| **UNIFIED_LOGGING_STANDARDS.md** | ログ粒度・レベル統一基準 | 全システム | ✅ 完成 |
| **ADMIN_CRUD_LOG_IMPLEMENTATION_GUIDE.md** | SaaS管理画面CRUD操作ログ実装ガイド | hotel-saas | ✅ 完成 |
| **CURRENT_LOG_STATUS_MATRIX.md** | 現状ログ記録状況マトリックス | hotel-saas | ✅ 完成 |
| **COMPREHENSIVE_LOG_SYSTEM_SUMMARY.md** | 総合まとめ（本ドキュメント） | 全システム | ✅ 作成中 |

---

## 🎯 ログレベル統一基準（全システム共通）

| レベル | 対象 | 保存期間 | 通知 | 用途 |
|--------|------|----------|------|------|
| **CRITICAL** | システム停止、データ損失、セキュリティ侵害 | 永続保存 | 即座 | 緊急対応 |
| **ERROR** | 機能停止、処理失敗、予期しない例外 | 1年 | 1時間以内 | 障害対応 |
| **WARN** | 異常だが処理継続可能、パフォーマンス劣化 | 6ヶ月 | 日次サマリー | 予防保守 |
| **INFO** | 重要な業務処理、状態変更 | 3ヶ月 | なし | 業務分析 |
| **DEBUG** | 開発・トラブルシューティング用詳細情報 | 1週間 | なし | 開発支援 |

---

## 🗄️ テーブル設計一覧

### **既存テーブル（hotel-saas）**

#### **1. audit_logs（既存・拡張予定）**
```sql
-- 現在の構造 + 拡張予定
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(20) NOT NULL,          -- INSERT, UPDATE, DELETE
  record_id UUID,
  user_id UUID REFERENCES staff(id),
  old_values JSONB,
  new_values JSONB,
  changed_fields JSONB,
  
  -- 拡張予定カラム
  operation_category VARCHAR(50),          -- menu, order, staff, system
  business_context JSONB,                  -- 業務コンテキスト
  risk_level VARCHAR(20) DEFAULT 'LOW',    -- LOW, MEDIUM, HIGH, CRITICAL
  session_id VARCHAR(100),
  
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**用途**: データベースのCUD操作を自動記録（トリガー）  
**記録方法**: PostgreSQLトリガーによる自動記録  
**現状**: 稼働中（拡張が必要）

### **新規テーブル（実装必要）**

#### **2. auth_logs（新規・Priority 1）**
```sql
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
**用途**: ログイン・ログアウト履歴  
**優先度**: Priority 1（セキュリティ・コンプライアンス）

#### **3. ai_operation_logs（新規・Priority 1）**
```sql
CREATE TABLE ai_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID,                            -- 使用者ID
  guest_id VARCHAR(100),                   -- ゲストID
  
  -- AI機能情報
  ai_function VARCHAR(50) NOT NULL,        -- chat, recommendation, booking
  input_data JSONB,                        -- 入力データ
  output_data JSONB,                       -- 出力データ
  processing_time_ms INTEGER,              -- 処理時間
  
  -- クレジット情報（統合）
  credit_cost INTEGER DEFAULT 0,           -- 消費クレジット
  credit_balance_before INTEGER,           -- 使用前残高
  credit_balance_after INTEGER,            -- 使用後残高
  
  -- 結果情報
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**用途**: AI処理履歴 + クレジット消費記録  
**優先度**: Priority 1（課金・請求）

#### **4. billing_logs（新規・Priority 1）**
```sql
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
**用途**: 請求・支払い処理履歴  
**優先度**: Priority 1（課金・請求）

#### **5. device_connection_logs（新規・Priority 2）**
```sql
CREATE TABLE device_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  device_id INTEGER NOT NULL,
  room_id VARCHAR(100),
  
  -- 接続イベント
  event_type VARCHAR(20) NOT NULL,        -- connect, disconnect, timeout, reconnect
  connection_method VARCHAR(20),          -- wifi, ethernet, mobile
  
  -- 接続品質
  signal_strength INTEGER,                -- 信号強度
  latency_ms INTEGER,                     -- レイテンシ
  bandwidth_mbps DECIMAL(5,2),            -- 帯域幅
  
  -- エラー情報
  error_code VARCHAR(50),
  error_message TEXT,
  
  -- 継続時間
  duration_seconds INTEGER,               -- 接続継続時間
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**用途**: デバイス接続・切断履歴  
**優先度**: Priority 2（運用監視）

#### **6. device_session_logs（新規・Priority 2）**
```sql
CREATE TABLE device_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  device_id INTEGER NOT NULL,
  room_id VARCHAR(100),
  
  -- セッション情報
  session_start TIMESTAMP,
  session_end TIMESTAMP,
  session_duration INTEGER,               -- 分
  
  -- 集約データ
  total_taps INTEGER,                     -- 総タップ数
  screens_viewed JSONB,                   -- 閲覧画面リスト
  orders_placed INTEGER,                  -- 注文数
  total_revenue DECIMAL(10,2),            -- 売上
  
  -- バッチ送信情報
  batch_sent_at TIMESTAMP,
  local_log_count INTEGER,                -- 端末側ログ件数
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**用途**: デバイス使用量集約データ  
**優先度**: Priority 2（ビジネス分析）

#### **7. security_logs（新規・Priority 2）**
```sql
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
**用途**: セキュリティイベント記録  
**優先度**: Priority 2（セキュリティ監視）

---

## 📊 操作別ログ記録状況

### **現在記録される操作（✅）**
| 操作カテゴリ | 具体的操作 | 記録テーブル | 記録方法 |
|------------|-----------|------------|---------|
| **メニュー管理** | 追加/変更/削除/価格変更 | audit_logs | トリガー自動 |
| **注文処理** | 作成/変更/キャンセル/ステータス変更 | audit_logs | トリガー自動 |
| **会計処理** | 決済/返金/料金調整 | audit_logs | トリガー自動 |
| **スタッフ管理** | 追加/変更/削除/権限変更 | audit_logs | トリガー自動 |
| **システム設定** | テナント設定/プラン変更 | audit_logs | トリガー自動 |

### **現在記録されない操作（❌）**
| 操作カテゴリ | 具体的操作 | 必要テーブル | 優先度 |
|------------|-----------|------------|-------|
| **認証関連** | ログイン/ログアウト/失敗 | auth_logs | Priority 1 |
| **AIコンシェルジュ** | AI会話/推奨/学習 | ai_operation_logs | Priority 1 |
| **AIクレジット** | 使用/付与/調整 | ai_operation_logs | Priority 1 |
| **請求処理** | 計算/発行/支払い | billing_logs | Priority 1 |
| **デバイス接続** | 接続/切断/エラー | device_connection_logs | Priority 2 |
| **デバイス使用** | 使用量/売上貢献 | device_session_logs | Priority 2 |
| **セキュリティ** | 不正アクセス/異常操作 | security_logs | Priority 2 |

---

## 🔧 実装関数設計

### **統一ログ関数（hotel-saas）**

#### **1. CUD操作ログ記録**
```typescript
async function logCUDOperation(params: {
  tenantId: string;
  userId: string;
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId?: string;
  oldValues?: any;
  newValues?: any;
  operationCategory?: 'menu' | 'order' | 'staff' | 'system';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  businessContext?: any;
  sessionId?: string;
  request?: Request;
}): Promise<void>
```

#### **2. 認証ログ記録**
```typescript
async function logAuthOperation(params: {
  tenantId: string;
  userId?: string;
  action: 'login' | 'logout' | 'login_failed';
  success: boolean;
  failureReason?: string;
  sessionId?: string;
  request?: Request;
}): Promise<void>
```

#### **3. AI操作ログ記録**
```typescript
async function logAIOperation(params: {
  tenantId: string;
  userId?: string;
  guestId?: string;
  aiFunction: string;
  inputData?: any;
  outputData?: any;
  processingTimeMs?: number;
  creditCost?: number;
  creditBalanceBefore?: number;
  creditBalanceAfter?: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void>
```

#### **4. 請求ログ記録**
```typescript
async function logBillingOperation(params: {
  tenantId: string;
  subscriptionId?: number;
  billingPeriod: string;
  action: 'calculate' | 'invoice' | 'payment' | 'failed';
  baseAmount?: number;
  additionalCosts?: any;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  details?: any;
}): Promise<void>
```

---

## 📈 実装ロードマップ

### **Phase 1: 緊急対応（Week 1-2）**
**優先度**: Priority 1（課金・請求・セキュリティ）

□ **audit_logs拡張**
  - operation_category, business_context, risk_level カラム追加
  - 既存データの互換性確保
  - 新しいインデックス作成

□ **auth_logs実装**
  - テーブル作成
  - ログイン・ログアウト処理への組み込み
  - 失敗ログイン記録

□ **ai_operation_logs実装**
  - テーブル作成
  - AI機能呼び出し時のログ記録
  - クレジット消費記録

□ **billing_logs実装**
  - テーブル作成
  - 請求処理への組み込み
  - 支払い処理記録

### **Phase 2: 運用改善（Week 3-4）**
**優先度**: Priority 2（運用監視・分析）

□ **device_connection_logs実装**
  - テーブル作成
  - デバイス接続監視
  - 接続品質記録

□ **device_session_logs実装**
  - テーブル作成
  - セッション集約データ記録
  - バッチ処理実装

□ **security_logs実装**
  - テーブル作成
  - 異常操作検知
  - セキュリティイベント記録

### **Phase 3: 分析・監視（Week 5-6）**
**優先度**: Priority 3（分析・可視化）

□ **統合ダッシュボード**
  - リアルタイム監視画面
  - ログ検索・フィルタ機能
  - 統計・レポート機能

□ **自動アラート機能**
  - 異常検知アルゴリズム
  - 通知システム
  - エスカレーション機能

□ **レポート機能**
  - 定期レポート自動生成
  - CSV エクスポート
  - 分析API提供

---

## 🚨 重要な設計方針

### **パフォーマンス最適化**
✅ **非同期ログ記録**: ユーザー体験に影響しない  
✅ **階層化ログ**: 詳細ログは端末側、集約データはサーバー側  
✅ **適切なインデックス**: 検索性能の確保  
✅ **データ圧縮**: ストレージ効率化  

### **セキュリティ・プライバシー**
✅ **機密情報マスキング**: パスワード・トークン等の除外  
✅ **アクセス制御**: ログレベル別の閲覧権限  
✅ **データ暗号化**: 保存時・転送時の暗号化  
✅ **保存期間管理**: 自動削除・アーカイブ  

### **運用・保守性**
✅ **統一フォーマット**: 全システム共通のログ構造  
✅ **段階的実装**: 既存システムへの影響最小化  
✅ **監視・アラート**: 異常検知・自動通知  
✅ **ドキュメント整備**: 運用手順書・トラブルシューティング  

---

## 📊 予想データ量・コスト

### **月間ログ量見積もり（1テナント）**
| テーブル | 件数/月 | データサイズ | 年間サイズ |
|---------|---------|-------------|-----------|
| audit_logs | 10,000件 | 50MB | 600MB |
| auth_logs | 3,000件 | 5MB | 60MB |
| ai_operation_logs | 3,000件 | 15MB | 180MB |
| billing_logs | 12件 | 0.1MB | 1.2MB |
| device_connection_logs | 9,000件 | 10MB | 120MB |
| device_session_logs | 4,500件 | 20MB | 240MB |
| security_logs | 100件 | 1MB | 12MB |
| **合計** | **29,612件** | **101.1MB** | **1.2GB** |

### **100テナント規模での年間コスト見積もり**
- **ストレージ**: 120GB × $0.023/GB = $2.76/月
- **処理コスト**: 約$10/月
- **監視・分析**: 約$5/月
- **合計**: 約$18/月（100テナント）

---

**作成者**: hotel-kanri統合管理  
**作成完了日**: 2025年9月24日  
**次回更新予定**: Phase 1実装完了後
