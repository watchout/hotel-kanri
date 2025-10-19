# 🗄️ 統合ログシステム設計書

**作成日**: 2025年9月24日  
**対象システム**: hotel-common（共通ログ管理）、hotel-saas（システム固有ログ）  
**設計方針**: 共通ログはhotel-common、システム固有ログは各システム内で管理  

---

## 📋 設計概要

### 基本方針
1. **認証・セキュリティ・システム間連携ログ** → hotel-commonで一元管理
2. **業務固有ログ（CRUD操作等）** → 各システム内で管理
3. **統合監視・分析** → hotel-commonで全ログを横断検索可能
4. **パフォーマンス重視** → 非同期ログ記録、専用インデックス

---

## 🏗️ テーブル設計

### 【hotel-common 共通ログテーブル】

#### 1. 認証ログテーブル
```sql
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system VARCHAR(20) NOT NULL,           -- 'saas', 'pms', 'member', 'common'
  tenant_id UUID,                        -- テナントID（システム固有の場合）
  user_id UUID NOT NULL,                 -- ユーザーID
  email VARCHAR(255) NOT NULL,           -- ログインメール
  action VARCHAR(50) NOT NULL,           -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'TOKEN_REFRESH'
  ip_address INET,                       -- IPアドレス
  user_agent TEXT,                       -- ユーザーエージェント
  session_id VARCHAR(255),               -- セッションID
  failure_reason VARCHAR(255),           -- 失敗理由（失敗時のみ）
  device_info JSONB,                     -- デバイス情報
  location_info JSONB,                   -- 位置情報（IPから推定）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_auth_logs_system_created (system, created_at),
  INDEX idx_auth_logs_user_action (user_id, action),
  INDEX idx_auth_logs_tenant_created (tenant_id, created_at),
  INDEX idx_auth_logs_ip_created (ip_address, created_at)
);
```

#### 2. セキュリティログテーブル
```sql
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system VARCHAR(20) NOT NULL,           -- 発生システム
  tenant_id UUID,                        
  user_id UUID,                          -- 関連ユーザー（不明な場合はNULL）
  event_type VARCHAR(100) NOT NULL,      -- 'UNAUTHORIZED_ACCESS', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE_ATTEMPT'
  severity VARCHAR(20) NOT NULL,         -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  description TEXT NOT NULL,             -- イベント説明
  details JSONB,                         -- イベント詳細データ
  ip_address INET,
  user_agent TEXT,
  request_path VARCHAR(500),             -- アクセス先パス
  request_method VARCHAR(10),            -- HTTPメソッド
  response_code INTEGER,                 -- レスポンスコード
  blocked BOOLEAN DEFAULT FALSE,         -- ブロックしたかどうか
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_security_logs_severity_created (severity, created_at),
  INDEX idx_security_logs_system_event (system, event_type),
  INDEX idx_security_logs_ip_created (ip_address, created_at),
  INDEX idx_security_logs_tenant_created (tenant_id, created_at)
);
```

#### 3. システム内部処理ログテーブル
```sql
CREATE TABLE system_batch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system VARCHAR(20) NOT NULL,           -- 実行システム
  tenant_id UUID,                        -- 関連テナント（全体処理の場合はNULL）
  job_name VARCHAR(255) NOT NULL,        -- ジョブ名
  job_type VARCHAR(100) NOT NULL,        -- 'BATCH', 'SYNC', 'CLEANUP', 'MIGRATION'
  status VARCHAR(50) NOT NULL,           -- 'STARTED', 'SUCCESS', 'FAILED', 'TIMEOUT'
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,                   -- 実行時間（ミリ秒）
  processed_count INTEGER DEFAULT 0,     -- 処理件数
  success_count INTEGER DEFAULT 0,       -- 成功件数
  error_count INTEGER DEFAULT 0,         -- エラー件数
  error_message TEXT,                    -- エラー詳細
  details JSONB,                         -- 処理詳細・設定情報
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_batch_logs_system_status (system, status),
  INDEX idx_batch_logs_job_created (job_name, created_at),
  INDEX idx_batch_logs_tenant_created (tenant_id, created_at)
);
```

#### 4. システム間連携ログテーブル
```sql
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system VARCHAR(20) NOT NULL,    -- 送信元システム
  target_system VARCHAR(20) NOT NULL,    -- 送信先システム
  tenant_id UUID,
  operation VARCHAR(100) NOT NULL,       -- 'ROOM_STATUS_SYNC', 'ORDER_NOTIFY', 'USER_SYNC'
  endpoint VARCHAR(500),                 -- APIエンドポイント
  request_method VARCHAR(10),            -- HTTPメソッド
  request_data JSONB,                    -- リクエストデータ
  response_data JSONB,                   -- レスポンスデータ
  status VARCHAR(50) NOT NULL,           -- 'SUCCESS', 'FAILED', 'TIMEOUT', 'RETRY'
  response_code INTEGER,                 -- HTTPレスポンスコード
  response_time_ms INTEGER,              -- レスポンス時間
  retry_count INTEGER DEFAULT 0,         -- リトライ回数
  error_message TEXT,
  correlation_id VARCHAR(255),           -- 関連処理ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- インデックス
  INDEX idx_integration_logs_systems (source_system, target_system),
  INDEX idx_integration_logs_operation (operation, created_at),
  INDEX idx_integration_logs_status (status, created_at),
  INDEX idx_integration_logs_tenant (tenant_id, created_at)
);
```

---

## 🔧 API設計

### 【hotel-common ログ記録API】

#### 1. 認証ログ記録API
```typescript
POST /api/v1/logs/auth
Content-Type: application/json

{
  "system": "saas",
  "tenant_id": "uuid",
  "user_id": "uuid", 
  "email": "user@example.com",
  "action": "LOGIN_SUCCESS",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "session_id": "session_uuid",
  "device_info": {
    "device_type": "desktop",
    "os": "Windows 10",
    "browser": "Chrome 118"
  }
}
```

#### 2. セキュリティログ記録API
```typescript
POST /api/v1/logs/security
Content-Type: application/json

{
  "system": "saas",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "event_type": "UNAUTHORIZED_ACCESS",
  "severity": "HIGH",
  "description": "管理者権限が必要なページへの不正アクセス試行",
  "details": {
    "attempted_path": "/admin/users",
    "user_role": "user",
    "required_role": "admin"
  },
  "ip_address": "192.168.1.1",
  "request_path": "/admin/users",
  "request_method": "GET",
  "response_code": 403,
  "blocked": true
}
```

#### 3. システム処理ログ記録API
```typescript
POST /api/v1/logs/batch
Content-Type: application/json

{
  "system": "saas",
  "tenant_id": "uuid",
  "job_name": "daily_billing_calculation",
  "job_type": "BATCH",
  "status": "SUCCESS",
  "start_time": "2025-09-24T10:00:00Z",
  "end_time": "2025-09-24T10:05:30Z",
  "processed_count": 150,
  "success_count": 148,
  "error_count": 2,
  "details": {
    "target_date": "2025-09-23",
    "calculation_method": "usage_based"
  }
}
```

#### 4. システム間連携ログ記録API
```typescript
POST /api/v1/logs/integration
Content-Type: application/json

{
  "source_system": "saas",
  "target_system": "common",
  "tenant_id": "uuid",
  "operation": "ORDER_NOTIFY",
  "endpoint": "/api/v1/notifications/order",
  "request_method": "POST",
  "request_data": {
    "order_id": "order_uuid",
    "room_id": "101",
    "status": "completed"
  },
  "response_data": {
    "success": true,
    "notification_id": "notif_uuid"
  },
  "status": "SUCCESS",
  "response_code": 200,
  "response_time_ms": 250,
  "correlation_id": "corr_uuid"
}
```

---

## 📊 ログ検索・分析API

### 1. 統合ログ検索API
```typescript
GET /api/v1/logs/search
Query Parameters:
- systems: string[] (対象システム)
- log_types: string[] (ログタイプ)
- tenant_id: string
- user_id: string
- start_date: string (ISO 8601)
- end_date: string (ISO 8601)
- severity: string (セキュリティログ用)
- status: string (バッチ・連携ログ用)
- limit: number (デフォルト: 100)
- offset: number (デフォルト: 0)

Response:
{
  "success": true,
  "data": {
    "logs": [...],
    "total_count": 1500,
    "has_more": true
  }
}
```

### 2. ログ統計API
```typescript
GET /api/v1/logs/stats
Query Parameters:
- systems: string[]
- log_types: string[]
- tenant_id: string
- start_date: string
- end_date: string
- group_by: string ('hour', 'day', 'week')

Response:
{
  "success": true,
  "data": {
    "auth_logs": {
      "total": 1200,
      "success": 1150,
      "failed": 50
    },
    "security_logs": {
      "total": 25,
      "by_severity": {
        "LOW": 15,
        "MEDIUM": 8,
        "HIGH": 2,
        "CRITICAL": 0
      }
    },
    "timeline": [
      {
        "timestamp": "2025-09-24T10:00:00Z",
        "auth_count": 45,
        "security_count": 2
      }
    ]
  }
}
```

---

## 🚀 パフォーマンス最適化

### 1. 非同期ログ記録
- ログ記録はキューイングシステム（Redis Queue）を使用
- メイン処理をブロックしない
- バッチ処理で効率的にDB書き込み

### 2. パーティショニング
```sql
-- 月別パーティショニング例
CREATE TABLE auth_logs_2025_09 PARTITION OF auth_logs
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
```

### 3. インデックス戦略
- 検索頻度の高いカラムに複合インデックス
- 時系列データに対する効率的なインデックス
- 定期的なインデックス最適化

### 4. データ保持期間
- 認証ログ: 2年
- セキュリティログ: 7年（高severity）、3年（低severity）
- システム処理ログ: 1年
- 連携ログ: 6ヶ月

---

## 🔒 セキュリティ要件

### 1. アクセス制御
- ログ記録API: システム間認証必須
- ログ検索API: 管理者権限必須
- テナント分離: 必ずtenant_idでフィルタリング

### 2. データ暗号化
- 機密情報（パスワード等）は記録しない
- PII（個人識別情報）は暗号化して保存
- 転送時はTLS必須

### 3. 監査証跡
- ログ自体の改ざん検知機能
- 管理者によるログアクセスも記録
- 定期的な整合性チェック

---

## 📈 監視・アラート

### 1. リアルタイム監視
- セキュリティログの重要度HIGH以上で即座にアラート
- 認証失敗率の異常検知
- システム間連携の失敗率監視

### 2. 定期レポート
- 日次セキュリティサマリー
- 週次システム稼働レポート
- 月次ログ統計レポート

### 3. ダッシュボード
- リアルタイムログ監視画面
- システム別ログ統計
- 異常検知アラート一覧

---

## 🔄 データ移行・バックアップ

### 1. 既存データ移行
- 現在のaudit_logsから認証関連データを抽出
- システム別にデータを分類・移行
- 移行後の整合性チェック

### 2. バックアップ戦略
- 日次フルバックアップ
- 継続的WALアーカイブ
- 地理的分散バックアップ

### 3. 災害復旧
- RPO: 1時間以内
- RTO: 4時間以内
- 定期的な復旧テスト実施

---

この設計書に基づいて、次に各システム向けの実装指示書を作成します。
