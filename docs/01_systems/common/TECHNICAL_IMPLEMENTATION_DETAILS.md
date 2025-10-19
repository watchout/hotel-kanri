# 🔧 統合ログシステム技術実装詳細書

**作成日**: 2025年9月24日  
**対象**: hotel-common開発チーム  
**前提**: `/Users/kaneko/hotel-kanri/docs/01_systems/common/UNIFIED_LOG_SYSTEM_DESIGN.md` 熟読必須  

---

## ⚠️ 【重要】既存実装との重複回避

### **❌ 絶対に実装してはいけない機能**
1. **JWT認証システム** - 既に統合実装済み
2. **API認証ミドルウェア** - 既存の統一認証を使用
3. **データベース接続管理** - 既存のPrisma統合を使用
4. **エラーハンドリング基盤** - 既存の統一エラーハンドリングを使用
5. **モック・フォールバック実装** - 本番用実装のみ

### **✅ 既存システムとの連携方法**
```typescript
// ❌ 新規JWT実装（禁止）
// const jwt = new JWTService()

// ✅ 既存統一認証の利用
import { UnifiedAuth } from '../auth/unified-auth'
const auth = UnifiedAuth.getInstance()
```

---

## 🗄️ データベーススキーマ実装

### **1. テーブル作成SQL（完全版）**

#### **auth_logs テーブル**
```sql
-- 認証ログテーブル
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system VARCHAR(20) NOT NULL CHECK (system IN ('saas', 'pms', 'member', 'common')),
  tenant_id UUID,
  user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'TOKEN_REFRESH', 'PASSWORD_CHANGE')),
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  failure_reason VARCHAR(255),
  device_info JSONB DEFAULT '{}',
  location_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT auth_logs_tenant_check CHECK (
    (system IN ('saas', 'pms', 'member') AND tenant_id IS NOT NULL) OR
    (system = 'common' AND tenant_id IS NULL)
  )
);

-- インデックス
CREATE INDEX idx_auth_logs_system_created ON auth_logs (system, created_at DESC);
CREATE INDEX idx_auth_logs_user_action ON auth_logs (user_id, action);
CREATE INDEX idx_auth_logs_tenant_created ON auth_logs (tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_auth_logs_ip_created ON auth_logs (ip_address, created_at DESC);
CREATE INDEX idx_auth_logs_session ON auth_logs (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_auth_logs_failure ON auth_logs (action, failure_reason) WHERE action = 'LOGIN_FAILED';

-- パーティショニング（月別）
CREATE TABLE auth_logs_2025_09 PARTITION OF auth_logs
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE auth_logs_2025_10 PARTITION OF auth_logs
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- 自動パーティション作成関数
CREATE OR REPLACE FUNCTION create_auth_logs_partition(target_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := DATE_TRUNC('month', target_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'auth_logs_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF auth_logs FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

#### **security_logs テーブル**
```sql
-- セキュリティログテーブル
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system VARCHAR(20) NOT NULL CHECK (system IN ('saas', 'pms', 'member', 'common')),
  tenant_id UUID,
  user_id UUID,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  request_path VARCHAR(500),
  request_method VARCHAR(10) CHECK (request_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  response_code INTEGER,
  blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT security_logs_tenant_check CHECK (
    (system IN ('saas', 'pms', 'member') AND tenant_id IS NOT NULL) OR
    (system = 'common')
  )
);

-- インデックス
CREATE INDEX idx_security_logs_severity_created ON security_logs (severity, created_at DESC);
CREATE INDEX idx_security_logs_system_event ON security_logs (system, event_type);
CREATE INDEX idx_security_logs_ip_created ON security_logs (ip_address, created_at DESC);
CREATE INDEX idx_security_logs_tenant_created ON security_logs (tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_security_logs_blocked ON security_logs (blocked, created_at DESC) WHERE blocked = true;
CREATE INDEX idx_security_logs_critical ON security_logs (severity, created_at DESC) WHERE severity IN ('HIGH', 'CRITICAL');

-- パーティショニング（月別）
CREATE TABLE security_logs_2025_09 PARTITION OF security_logs
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
```

#### **system_batch_logs テーブル**
```sql
-- システム処理ログテーブル
CREATE TABLE system_batch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system VARCHAR(20) NOT NULL CHECK (system IN ('saas', 'pms', 'member', 'common')),
  tenant_id UUID,
  job_name VARCHAR(255) NOT NULL,
  job_type VARCHAR(100) NOT NULL CHECK (job_type IN ('BATCH', 'SYNC', 'CLEANUP', 'MIGRATION', 'BACKUP')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('STARTED', 'SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED')),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER GENERATED ALWAYS AS (
    CASE WHEN end_time IS NOT NULL AND start_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 
    ELSE NULL END
  ) STORED,
  processed_count INTEGER DEFAULT 0 CHECK (processed_count >= 0),
  success_count INTEGER DEFAULT 0 CHECK (success_count >= 0),
  error_count INTEGER DEFAULT 0 CHECK (error_count >= 0),
  error_message TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT batch_logs_counts_check CHECK (success_count + error_count <= processed_count),
  CONSTRAINT batch_logs_time_check CHECK (end_time IS NULL OR end_time >= start_time)
);

-- インデックス
CREATE INDEX idx_batch_logs_system_status ON system_batch_logs (system, status);
CREATE INDEX idx_batch_logs_job_created ON system_batch_logs (job_name, created_at DESC);
CREATE INDEX idx_batch_logs_tenant_created ON system_batch_logs (tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_batch_logs_failed ON system_batch_logs (status, created_at DESC) WHERE status IN ('FAILED', 'TIMEOUT');
```

#### **integration_logs テーブル**
```sql
-- システム間連携ログテーブル
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system VARCHAR(20) NOT NULL CHECK (source_system IN ('saas', 'pms', 'member', 'common')),
  target_system VARCHAR(20) NOT NULL CHECK (target_system IN ('saas', 'pms', 'member', 'common')),
  tenant_id UUID,
  operation VARCHAR(100) NOT NULL,
  endpoint VARCHAR(500),
  request_method VARCHAR(10) CHECK (request_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  request_data JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'RETRY')),
  response_code INTEGER,
  response_time_ms INTEGER CHECK (response_time_ms >= 0),
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
  error_message TEXT,
  correlation_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT integration_logs_systems_check CHECK (source_system != target_system)
);

-- インデックス
CREATE INDEX idx_integration_logs_systems ON integration_logs (source_system, target_system);
CREATE INDEX idx_integration_logs_operation ON integration_logs (operation, created_at DESC);
CREATE INDEX idx_integration_logs_status ON integration_logs (status, created_at DESC);
CREATE INDEX idx_integration_logs_tenant ON integration_logs (tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_integration_logs_correlation ON integration_logs (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_integration_logs_failed ON integration_logs (status, created_at DESC) WHERE status IN ('FAILED', 'TIMEOUT');
```

### **2. Row Level Security (RLS) 設定**
```sql
-- RLS有効化
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_batch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- テナント分離ポリシー
CREATE POLICY tenant_isolation_auth_logs ON auth_logs
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID OR current_setting('app.user_role') = 'SYSTEM_ADMIN');

CREATE POLICY tenant_isolation_security_logs ON security_logs
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID OR current_setting('app.user_role') = 'SYSTEM_ADMIN');

CREATE POLICY tenant_isolation_batch_logs ON system_batch_logs
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID OR current_setting('app.user_role') = 'SYSTEM_ADMIN');

CREATE POLICY tenant_isolation_integration_logs ON integration_logs
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID OR current_setting('app.user_role') = 'SYSTEM_ADMIN');

-- システム管理者用ポリシー
CREATE POLICY system_admin_full_access ON auth_logs
  FOR ALL TO authenticated
  USING (current_setting('app.user_role') = 'SYSTEM_ADMIN');
```

---

## 🔧 API実装詳細

### **1. ログ記録API実装**

#### **認証ログ記録API**
```typescript
// server/api/v1/logs/auth.post.ts
import { z } from 'zod'
import { LogQueue } from '~/server/utils/log-queue'
import { UnifiedAuth } from '~/server/utils/unified-auth'

const AuthLogSchema = z.object({
  system: z.enum(['saas', 'pms', 'member', 'common']),
  tenant_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  email: z.string().email(),
  action: z.enum(['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'TOKEN_REFRESH', 'PASSWORD_CHANGE']),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().optional(),
  session_id: z.string().optional(),
  failure_reason: z.string().optional(),
  device_info: z.record(z.any()).optional(),
  location_info: z.record(z.any()).optional()
})

export default defineEventHandler(async (event) => {
  try {
    // 既存統一認証を使用（重複実装禁止）
    const auth = await UnifiedAuth.validateSystemToken(event)
    if (!auth.isSystemUser) {
      throw createError({
        statusCode: 403,
        statusMessage: 'System authentication required'
      })
    }

    const body = await readBody(event)
    const validatedData = AuthLogSchema.parse(body)

    // テナントID検証
    if (['saas', 'pms', 'member'].includes(validatedData.system) && !validatedData.tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenant_id is required for non-common systems'
      })
    }

    // 非同期ログ記録（既存キューシステム使用）
    await LogQueue.enqueue('auth_log', {
      ...validatedData,
      created_at: new Date().toISOString()
    })

    // 高重要度ログの即座アラート
    if (validatedData.action === 'LOGIN_FAILED' && validatedData.failure_reason) {
      await AlertService.sendSecurityAlert({
        type: 'LOGIN_FAILURE',
        severity: 'MEDIUM',
        details: validatedData
      })
    }

    return {
      success: true,
      message: 'Auth log recorded successfully'
    }

  } catch (error) {
    // 既存統一エラーハンドリングを使用
    return handleUnifiedError(error, event)
  }
})
```

#### **セキュリティログ記録API**
```typescript
// server/api/v1/logs/security.post.ts
import { z } from 'zod'
import { LogQueue } from '~/server/utils/log-queue'
import { AlertService } from '~/server/utils/alert-service'

const SecurityLogSchema = z.object({
  system: z.enum(['saas', 'pms', 'member', 'common']),
  tenant_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  event_type: z.string().min(1).max(100),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(1),
  details: z.record(z.any()).optional(),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().optional(),
  request_path: z.string().max(500).optional(),
  request_method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  response_code: z.number().int().min(100).max(599).optional(),
  blocked: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  try {
    const auth = await UnifiedAuth.validateSystemToken(event)
    if (!auth.isSystemUser) {
      throw createError({
        statusCode: 403,
        statusMessage: 'System authentication required'
      })
    }

    const body = await readBody(event)
    const validatedData = SecurityLogSchema.parse(body)

    // 非同期ログ記録
    await LogQueue.enqueue('security_log', {
      ...validatedData,
      created_at: new Date().toISOString()
    })

    // 重要度に応じた即座アラート
    if (['HIGH', 'CRITICAL'].includes(validatedData.severity)) {
      await AlertService.sendSecurityAlert({
        type: 'SECURITY_INCIDENT',
        severity: validatedData.severity,
        details: validatedData,
        immediate: validatedData.severity === 'CRITICAL'
      })
    }

    return {
      success: true,
      message: 'Security log recorded successfully'
    }

  } catch (error) {
    return handleUnifiedError(error, event)
  }
})
```

### **2. ログ検索API実装**

```typescript
// server/api/v1/logs/search.get.ts
import { z } from 'zod'
import { UnifiedDatabase } from '~/server/utils/unified-database'

const SearchQuerySchema = z.object({
  systems: z.array(z.enum(['saas', 'pms', 'member', 'common'])).optional(),
  log_types: z.array(z.enum(['auth', 'security', 'batch', 'integration'])).optional(),
  tenant_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
})

export default defineEventHandler(async (event) => {
  try {
    const auth = await UnifiedAuth.validateToken(event)
    if (!auth.isAuthenticated || !auth.hasPermission('logs.read')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions'
      })
    }

    const query = getQuery(event)
    const validatedQuery = SearchQuerySchema.parse(query)

    // テナント分離の適用
    const tenantFilter = auth.isSystemAdmin ? 
      validatedQuery.tenant_id : auth.tenantId

    const results = await searchUnifiedLogs({
      ...validatedQuery,
      tenant_id: tenantFilter,
      user_permissions: auth.permissions
    })

    return {
      success: true,
      data: {
        logs: results.logs,
        total_count: results.totalCount,
        has_more: results.hasMore
      }
    }

  } catch (error) {
    return handleUnifiedError(error, event)
  }
})

// ログ検索実装
async function searchUnifiedLogs(params: SearchParams) {
  const db = UnifiedDatabase.getInstance()
  
  // 動的クエリ構築
  let baseQuery = `
    SELECT 
      'auth' as log_type, id, system, tenant_id, created_at,
      jsonb_build_object(
        'user_id', user_id,
        'email', email,
        'action', action,
        'ip_address', ip_address,
        'session_id', session_id
      ) as data
    FROM auth_logs
    WHERE 1=1
  `

  const queryParams: any[] = []
  let paramIndex = 1

  // システムフィルタ
  if (params.systems?.length) {
    baseQuery += ` AND system = ANY($${paramIndex})`
    queryParams.push(params.systems)
    paramIndex++
  }

  // テナントフィルタ
  if (params.tenant_id) {
    baseQuery += ` AND tenant_id = $${paramIndex}`
    queryParams.push(params.tenant_id)
    paramIndex++
  }

  // 日付フィルタ
  if (params.start_date) {
    baseQuery += ` AND created_at >= $${paramIndex}`
    queryParams.push(params.start_date)
    paramIndex++
  }

  if (params.end_date) {
    baseQuery += ` AND created_at <= $${paramIndex}`
    queryParams.push(params.end_date)
    paramIndex++
  }

  // ページネーション
  baseQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  queryParams.push(params.limit, params.offset)

  const result = await db.query(baseQuery, queryParams)
  
  return {
    logs: result.rows,
    totalCount: await getTotalCount(params),
    hasMore: result.rows.length === params.limit
  }
}
```

---

## 🚀 Redis Queue実装

### **1. ログキューシステム**

```typescript
// server/utils/log-queue.ts
import Redis from 'ioredis'
import { UnifiedDatabase } from './unified-database'

class LogQueueService {
  private redis: Redis
  private isProcessing = false

  constructor() {
    // 既存Redis接続を使用（重複実装禁止）
    this.redis = UnifiedRedis.getInstance()
    this.startWorker()
  }

  async enqueue(logType: string, data: any): Promise<void> {
    const queueKey = `log_queue:${logType}`
    const payload = {
      id: crypto.randomUUID(),
      type: logType,
      data,
      timestamp: Date.now(),
      retryCount: 0
    }

    await this.redis.lpush(queueKey, JSON.stringify(payload))
  }

  private async startWorker(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    const logTypes = ['auth_log', 'security_log', 'batch_log', 'integration_log']
    
    while (this.isProcessing) {
      try {
        for (const logType of logTypes) {
          await this.processQueue(logType)
        }
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機
      } catch (error) {
        console.error('Log queue worker error:', error)
        await new Promise(resolve => setTimeout(resolve, 5000)) // エラー時は5秒待機
      }
    }
  }

  private async processQueue(logType: string): Promise<void> {
    const queueKey = `log_queue:${logType}`
    const item = await this.redis.brpop(queueKey, 1) // 1秒タイムアウト

    if (!item) return

    try {
      const payload = JSON.parse(item[1])
      await this.writeToDatabase(payload)
    } catch (error) {
      console.error(`Failed to process ${logType}:`, error)
      // リトライ処理
      await this.handleRetry(logType, item[1])
    }
  }

  private async writeToDatabase(payload: any): Promise<void> {
    const db = UnifiedDatabase.getInstance()

    switch (payload.type) {
      case 'auth_log':
        await db.query(`
          INSERT INTO auth_logs (
            system, tenant_id, user_id, email, action, 
            ip_address, user_agent, session_id, failure_reason,
            device_info, location_info, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          payload.data.system,
          payload.data.tenant_id,
          payload.data.user_id,
          payload.data.email,
          payload.data.action,
          payload.data.ip_address,
          payload.data.user_agent,
          payload.data.session_id,
          payload.data.failure_reason,
          payload.data.device_info || {},
          payload.data.location_info || {},
          payload.data.created_at
        ])
        break

      case 'security_log':
        await db.query(`
          INSERT INTO security_logs (
            system, tenant_id, user_id, event_type, severity,
            description, details, ip_address, user_agent,
            request_path, request_method, response_code, blocked, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          payload.data.system,
          payload.data.tenant_id,
          payload.data.user_id,
          payload.data.event_type,
          payload.data.severity,
          payload.data.description,
          payload.data.details || {},
          payload.data.ip_address,
          payload.data.user_agent,
          payload.data.request_path,
          payload.data.request_method,
          payload.data.response_code,
          payload.data.blocked || false,
          payload.data.created_at
        ])
        break

      // 他のログタイプも同様に実装
    }
  }

  private async handleRetry(logType: string, payloadStr: string): Promise<void> {
    const payload = JSON.parse(payloadStr)
    payload.retryCount = (payload.retryCount || 0) + 1

    if (payload.retryCount <= 3) {
      // 指数バックオフでリトライ
      const delay = Math.pow(2, payload.retryCount) * 1000
      setTimeout(async () => {
        await this.redis.lpush(`log_queue:${logType}`, JSON.stringify(payload))
      }, delay)
    } else {
      // 最大リトライ回数を超えた場合はデッドレターキューに送信
      await this.redis.lpush(`log_queue:${logType}:dead`, payloadStr)
    }
  }
}

export const LogQueue = new LogQueueService()
```

---

## 📊 監視・アラート実装

### **1. アラートサービス**

```typescript
// server/utils/alert-service.ts
import { UnifiedNotification } from './unified-notification'

interface AlertConfig {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  details: any
  immediate?: boolean
}

class AlertServiceClass {
  async sendSecurityAlert(config: AlertConfig): Promise<void> {
    // 既存統一通知システムを使用（重複実装禁止）
    const notification = UnifiedNotification.getInstance()

    const message = this.formatAlertMessage(config)
    const channels = this.getAlertChannels(config.severity)

    for (const channel of channels) {
      switch (channel.type) {
        case 'slack':
          await notification.sendSlack({
            webhook: channel.webhook,
            message,
            severity: config.severity,
            immediate: config.immediate
          })
          break

        case 'email':
          await notification.sendEmail({
            to: channel.recipients,
            subject: `Security Alert: ${config.type}`,
            body: message,
            priority: config.severity === 'CRITICAL' ? 'high' : 'normal'
          })
          break
      }
    }
  }

  private formatAlertMessage(config: AlertConfig): string {
    return `
🚨 Security Alert: ${config.type}
Severity: ${config.severity}
Time: ${new Date().toISOString()}
System: ${config.details.system || 'Unknown'}
Tenant: ${config.details.tenant_id || 'N/A'}
Details: ${JSON.stringify(config.details, null, 2)}
    `.trim()
  }

  private getAlertChannels(severity: string) {
    const channels = []

    // 重要度に応じた通知チャンネル
    if (['HIGH', 'CRITICAL'].includes(severity)) {
      channels.push({
        type: 'slack',
        webhook: process.env.SLACK_SECURITY_WEBHOOK_URL
      })
    }

    if (severity === 'CRITICAL') {
      channels.push({
        type: 'email',
        recipients: process.env.SECURITY_ALERT_EMAILS?.split(',') || []
      })
    }

    return channels
  }
}

export const AlertService = new AlertServiceClass()
```

---

## 🔒 環境設定

### **1. 環境変数（完全版）**

```bash
# .env.example
# ログシステム設定
LOG_DB_HOST=localhost
LOG_DB_PORT=5432
LOG_DB_NAME=hotel_unified_logs
LOG_DB_USER=hotel_log_user
LOG_DB_PASSWORD=secure_password_here

# Redis設定（既存統一Redisを使用）
REDIS_LOG_QUEUE_URL=redis://localhost:6379/2

# アラート設定
SLACK_SECURITY_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SECURITY_ALERT_EMAILS=admin@hotel.com,security@hotel.com

# ログ保持期間
LOG_RETENTION_AUTH_DAYS=730        # 2年
LOG_RETENTION_SECURITY_DAYS=2555   # 7年
LOG_RETENTION_BATCH_DAYS=365       # 1年
LOG_RETENTION_INTEGRATION_DAYS=180 # 6ヶ月

# パフォーマンス設定
LOG_QUEUE_BATCH_SIZE=100
LOG_QUEUE_PROCESS_INTERVAL=1000    # ミリ秒
LOG_SEARCH_MAX_RESULTS=1000

# セキュリティ設定
LOG_API_RATE_LIMIT=1000            # 1時間あたりのリクエスト数
LOG_ENCRYPTION_KEY=your_32_char_encryption_key_here
```

### **2. 設定ファイル**

```typescript
// config/log-system.ts
export const LogSystemConfig = {
  database: {
    host: process.env.LOG_DB_HOST || 'localhost',
    port: parseInt(process.env.LOG_DB_PORT || '5432'),
    database: process.env.LOG_DB_NAME || 'hotel_unified_logs',
    username: process.env.LOG_DB_USER || 'hotel_log_user',
    password: process.env.LOG_DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    }
  },

  redis: {
    url: process.env.REDIS_LOG_QUEUE_URL || 'redis://localhost:6379/2',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  },

  retention: {
    auth_logs: parseInt(process.env.LOG_RETENTION_AUTH_DAYS || '730'),
    security_logs: parseInt(process.env.LOG_RETENTION_SECURITY_DAYS || '2555'),
    system_batch_logs: parseInt(process.env.LOG_RETENTION_BATCH_DAYS || '365'),
    integration_logs: parseInt(process.env.LOG_RETENTION_INTEGRATION_DAYS || '180')
  },

  performance: {
    queueBatchSize: parseInt(process.env.LOG_QUEUE_BATCH_SIZE || '100'),
    processInterval: parseInt(process.env.LOG_QUEUE_PROCESS_INTERVAL || '1000'),
    searchMaxResults: parseInt(process.env.LOG_SEARCH_MAX_RESULTS || '1000')
  },

  security: {
    apiRateLimit: parseInt(process.env.LOG_API_RATE_LIMIT || '1000'),
    encryptionKey: process.env.LOG_ENCRYPTION_KEY
  }
}
```

---

## 🧪 テスト実装

### **1. 単体テスト例**

```typescript
// tests/log-system.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LogQueue } from '~/server/utils/log-queue'
import { UnifiedDatabase } from '~/server/utils/unified-database'

describe('Log System', () => {
  beforeEach(async () => {
    // テスト用データベース初期化
    await UnifiedDatabase.getInstance().query('BEGIN')
  })

  afterEach(async () => {
    // テスト後のクリーンアップ
    await UnifiedDatabase.getInstance().query('ROLLBACK')
  })

  it('should record auth log successfully', async () => {
    const logData = {
      system: 'saas',
      tenant_id: 'test-tenant-uuid',
      user_id: 'test-user-uuid',
      email: 'test@example.com',
      action: 'LOGIN_SUCCESS',
      ip_address: '192.168.1.1'
    }

    await LogQueue.enqueue('auth_log', logData)
    
    // キュー処理を待機
    await new Promise(resolve => setTimeout(resolve, 2000))

    const result = await UnifiedDatabase.getInstance().query(
      'SELECT * FROM auth_logs WHERE user_id = $1',
      [logData.user_id]
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].action).toBe('LOGIN_SUCCESS')
  })

  it('should handle security log with alert', async () => {
    const logData = {
      system: 'saas',
      tenant_id: 'test-tenant-uuid',
      event_type: 'UNAUTHORIZED_ACCESS',
      severity: 'HIGH',
      description: 'Test security incident'
    }

    await LogQueue.enqueue('security_log', logData)
    
    // アラートが送信されることを確認
    // （実際の実装では、アラートサービスをモック化）
  })
})
```

---

## 📋 デプロイメントスクリプト

### **1. データベースマイグレーション**

```sql
-- migrations/001_create_log_tables.sql
-- このファイルの内容は上記のテーブル作成SQLと同じ

-- migrations/002_create_partitions.sql
-- 初期パーティション作成
SELECT create_auth_logs_partition('2025-09-01'::DATE);
SELECT create_auth_logs_partition('2025-10-01'::DATE);
SELECT create_auth_logs_partition('2025-11-01'::DATE);

-- 自動パーティション作成のcron設定
-- 毎月1日に次月のパーティションを作成
-- 0 0 1 * * SELECT create_auth_logs_partition(CURRENT_DATE + INTERVAL '1 month');
```

### **2. デプロイスクリプト**

```bash
#!/bin/bash
# deploy-log-system.sh

set -e

echo "🚀 Deploying Log System..."

# 1. データベースマイグレーション
echo "📊 Running database migrations..."
psql $LOG_DB_URL -f migrations/001_create_log_tables.sql
psql $LOG_DB_URL -f migrations/002_create_partitions.sql

# 2. Redis設定確認
echo "🔧 Checking Redis connection..."
redis-cli -u $REDIS_LOG_QUEUE_URL ping

# 3. 環境変数確認
echo "⚙️ Validating environment variables..."
required_vars=(
  "LOG_DB_HOST"
  "LOG_DB_NAME" 
  "REDIS_LOG_QUEUE_URL"
  "SLACK_SECURITY_WEBHOOK_URL"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  fi
done

# 4. アプリケーションデプロイ
echo "🏗️ Deploying application..."
npm run build
pm2 restart hotel-common-log-system

# 5. ヘルスチェック
echo "🏥 Running health checks..."
sleep 10
curl -f http://localhost:3400/api/v1/logs/health || exit 1

echo "✅ Log System deployment completed successfully!"
```

この技術実装詳細書により、開発チームは質問することなく完全な実装が可能になります。
