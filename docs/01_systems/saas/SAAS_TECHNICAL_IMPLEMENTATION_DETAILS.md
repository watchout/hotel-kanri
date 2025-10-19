# 🏢 hotel-saas ログシステム技術実装詳細書

**作成日**: 2025年9月24日  
**対象**: hotel-saas開発チーム  
**前提**: `/Users/kaneko/hotel-kanri/docs/01_systems/common/UNIFIED_LOG_SYSTEM_DESIGN.md` 熟読必須  

---

## ⚠️ 【重要】既存実装との重複回避

### **❌ 絶対に実装してはいけない機能**
1. **JWT認証システム** - 既存の統一認証を使用
2. **独自API認証** - hotel-commonの認証APIを使用
3. **独自データベース接続** - 既存のPrisma統合を使用
4. **独自Redis接続** - 既存の統一Redis接続を使用
5. **モック・フォールバック実装** - 本番用実装のみ
6. **独自エラーハンドリング** - 既存の統一エラーハンドリングを使用

### **✅ 既存システムとの連携方法**
```typescript
// ❌ 新規実装（禁止）
// const db = new DatabaseConnection()
// const auth = new AuthService()

// ✅ 既存統合システムの利用
import { UnifiedDatabase } from '~/server/utils/unified-database'
import { UnifiedAuth } from '~/server/utils/unified-auth'
import { HotelCommonClient } from '~/server/utils/hotel-common-client'
```

---

## 🗄️ 既存audit_logs拡張実装

### **1. テーブル拡張SQL（完全版）**

```sql
-- 既存audit_logsテーブルに新カラム追加
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS operation_category VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS business_context JSONB DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES staff(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;

-- 新しいインデックス追加
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_category ON audit_logs (operation_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs (risk_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_approved_by ON audit_logs (approved_by, created_at DESC) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_high_risk ON audit_logs (risk_level, created_at DESC) WHERE risk_level IN ('HIGH', 'CRITICAL');

-- 既存データのデフォルト値設定
UPDATE audit_logs 
SET 
  operation_category = CASE 
    WHEN table_name LIKE '%menu%' THEN 'menu'
    WHEN table_name LIKE '%order%' THEN 'order'
    WHEN table_name LIKE '%staff%' OR table_name LIKE '%user%' THEN 'staff'
    WHEN table_name LIKE '%tenant%' OR table_name LIKE '%setting%' THEN 'system'
    ELSE 'other'
  END,
  risk_level = CASE
    WHEN operation = 'DELETE' THEN 'HIGH'
    WHEN table_name IN ('staff', 'users', 'tenants') THEN 'MEDIUM'
    ELSE 'LOW'
  END,
  business_context = '{}'
WHERE operation_category IS NULL;
```

### **2. 統一ログ記録関数実装**

```typescript
// server/utils/admin-crud-logger.ts
import { UnifiedDatabase } from './unified-database'
import { HotelCommonClient } from './hotel-common-client'
import { AlertService } from './alert-service'

interface CRUDLogParams {
  tenantId: string
  userId: string
  tableName: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  recordId: string
  oldValues?: object
  newValues?: object
  operationCategory: 'menu' | 'order' | 'staff' | 'system' | 'billing' | 'device' | 'campaign'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  businessContext: object
  reason?: string
  approvedBy?: string
  request: H3Event
}

class AdminCRUDLogger {
  private db: UnifiedDatabase
  private commonClient: HotelCommonClient

  constructor() {
    // 既存統合システムを使用（重複実装禁止）
    this.db = UnifiedDatabase.getInstance()
    this.commonClient = HotelCommonClient.getInstance()
  }

  async logAdminCRUDOperation(params: CRUDLogParams): Promise<void> {
    try {
      // 1. 既存audit_logsに拡張版で記録
      await this.writeToAuditLogs(params)

      // 2. 高リスク操作の特別処理
      if (['HIGH', 'CRITICAL'].includes(params.riskLevel)) {
        await this.handleHighRiskOperation(params)
      }

      // 3. hotel-commonへのセキュリティログ送信（必要に応じて）
      if (params.riskLevel === 'CRITICAL') {
        await this.sendSecurityLogToCommon(params)
      }

    } catch (error) {
      console.error('Failed to log CRUD operation:', error)
      // ログ記録失敗は業務処理を止めない
    }
  }

  private async writeToAuditLogs(params: CRUDLogParams): Promise<void> {
    const sessionId = this.extractSessionId(params.request)
    const ipAddress = getClientIP(params.request)
    const userAgent = getHeader(params.request, 'user-agent')

    await this.db.query(`
      INSERT INTO audit_logs (
        tenant_id, table_name, operation, record_id, user_id, user_email, user_role,
        old_values, new_values, changed_fields, ip_address, user_agent, request_id,
        operation_category, risk_level, business_context, session_id, 
        approval_required, approved_by, reason, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()
      )
    `, [
      params.tenantId,
      params.tableName,
      params.operation,
      params.recordId,
      params.userId,
      params.businessContext.userEmail || null,
      params.businessContext.userRole || null,
      params.oldValues ? JSON.stringify(params.oldValues) : null,
      params.newValues ? JSON.stringify(params.newValues) : null,
      this.calculateChangedFields(params.oldValues, params.newValues),
      ipAddress,
      userAgent,
      crypto.randomUUID(),
      params.operationCategory,
      params.riskLevel,
      JSON.stringify(params.businessContext),
      sessionId,
      ['HIGH', 'CRITICAL'].includes(params.riskLevel),
      params.approvedBy || null,
      params.reason || null
    ])
  }

  private async handleHighRiskOperation(params: CRUDLogParams): Promise<void> {
    // 即座アラート送信
    await AlertService.sendSecurityAlert({
      type: 'HIGH_RISK_ADMIN_OPERATION',
      severity: params.riskLevel,
      details: {
        system: 'saas',
        tenant_id: params.tenantId,
        user_id: params.userId,
        operation: `${params.operation} ${params.tableName}`,
        record_id: params.recordId,
        category: params.operationCategory,
        reason: params.reason,
        business_context: params.businessContext
      },
      immediate: params.riskLevel === 'CRITICAL'
    })

    // 承認が必要な操作の場合は追加処理
    if (params.riskLevel === 'CRITICAL' && !params.approvedBy) {
      throw createError({
        statusCode: 403,
        statusMessage: 'CRITICAL operation requires approval'
      })
    }
  }

  private async sendSecurityLogToCommon(params: CRUDLogParams): Promise<void> {
    try {
      await this.commonClient.post('/api/v1/logs/security', {
        system: 'saas',
        tenant_id: params.tenantId,
        user_id: params.userId,
        event_type: 'CRITICAL_ADMIN_OPERATION',
        severity: 'CRITICAL',
        description: `Critical admin operation: ${params.operation} on ${params.tableName}`,
        details: {
          operation: params.operation,
          table_name: params.tableName,
          record_id: params.recordId,
          category: params.operationCategory,
          reason: params.reason,
          business_context: params.businessContext
        },
        ip_address: getClientIP(params.request),
        user_agent: getHeader(params.request, 'user-agent'),
        request_path: params.request.node.req.url,
        request_method: params.request.node.req.method,
        blocked: false
      })
    } catch (error) {
      console.error('Failed to send security log to common:', error)
      // hotel-common連携失敗は業務処理を止めない
    }
  }

  private calculateChangedFields(oldValues?: object, newValues?: object): string | null {
    if (!oldValues || !newValues) return null

    const changes: string[] = []
    const oldKeys = Object.keys(oldValues)
    const newKeys = Object.keys(newValues)
    const allKeys = [...new Set([...oldKeys, ...newKeys])]

    for (const key of allKeys) {
      const oldVal = (oldValues as any)[key]
      const newVal = (newValues as any)[key]
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push(key)
      }
    }

    return changes.length > 0 ? JSON.stringify(changes) : null
  }

  private extractSessionId(request: H3Event): string | null {
    // 既存セッション管理から取得
    return request.context.session?.id || null
  }
}

export const adminCRUDLogger = new AdminCRUDLogger()

// 便利関数
export async function logAdminCRUDOperation(params: CRUDLogParams): Promise<void> {
  return adminCRUDLogger.logAdminCRUDOperation(params)
}

// 高リスク操作専用関数
export async function logHighRiskOperation(params: CRUDLogParams & { approvalToken?: string }): Promise<void> {
  // 承認トークンの検証
  if (params.riskLevel === 'CRITICAL' && !params.approvalToken) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Approval token required for CRITICAL operations'
    })
  }

  return adminCRUDLogger.logAdminCRUDOperation(params)
}
```

---

## 🏢 SaaS固有ログテーブル実装

### **1. AIクレジットログテーブル**

```sql
-- AIクレジット・課金ログテーブル
CREATE TABLE ai_credit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('USE', 'GRANT', 'ADJUST', 'EXPIRE', 'REFUND')),
  ai_function VARCHAR(100) NOT NULL,
  credit_amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  request_details JSONB DEFAULT '{}',
  response_details JSONB DEFAULT '{}',
  cost_calculation JSONB DEFAULT '{}',
  session_id VARCHAR(255),
  correlation_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT ai_credit_logs_balance_check CHECK (
    (operation = 'USE' AND balance_after = balance_before - credit_amount) OR
    (operation IN ('GRANT', 'ADJUST') AND balance_after = balance_before + credit_amount) OR
    (operation IN ('EXPIRE', 'REFUND'))
  )
);

-- インデックス
CREATE INDEX idx_ai_credit_logs_tenant_created ON ai_credit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_ai_credit_logs_user_created ON ai_credit_logs (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ai_credit_logs_operation ON ai_credit_logs (operation, created_at DESC);
CREATE INDEX idx_ai_credit_logs_function ON ai_credit_logs (ai_function, created_at DESC);
CREATE INDEX idx_ai_credit_logs_session ON ai_credit_logs (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_ai_credit_logs_correlation ON ai_credit_logs (correlation_id) WHERE correlation_id IS NOT NULL;
```

### **2. 請求・課金ログテーブル**

```sql
-- 請求・課金ログテーブル
CREATE TABLE billing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_period VARCHAR(20) NOT NULL,
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('CALCULATE', 'GENERATE', 'PAYMENT', 'REFUND', 'ADJUSTMENT')),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'JPY' CHECK (currency IN ('JPY', 'USD', 'EUR')),
  calculation_details JSONB DEFAULT '{}',
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED')),
  external_transaction_id VARCHAR(255),
  error_details JSONB DEFAULT '{}',
  processed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT billing_logs_amount_check CHECK (
    (operation IN ('PAYMENT', 'REFUND') AND amount IS NOT NULL) OR
    (operation NOT IN ('PAYMENT', 'REFUND'))
  )
);

-- インデックス
CREATE INDEX idx_billing_logs_tenant_period ON billing_logs (tenant_id, billing_period);
CREATE INDEX idx_billing_logs_operation_created ON billing_logs (operation, created_at DESC);
CREATE INDEX idx_billing_logs_payment_status ON billing_logs (payment_status, created_at DESC) WHERE payment_status IS NOT NULL;
CREATE INDEX idx_billing_logs_external_id ON billing_logs (external_transaction_id) WHERE external_transaction_id IS NOT NULL;
CREATE INDEX idx_billing_logs_failed ON billing_logs (payment_status, created_at DESC) WHERE payment_status = 'FAILED';
```

### **3. デバイス使用量ログテーブル**

```sql
-- デバイス使用量ログテーブル
CREATE TABLE device_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id UUID REFERENCES device_rooms(id) ON DELETE SET NULL,
  room_id VARCHAR(100),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('CONNECT', 'DISCONNECT', 'HEARTBEAT', 'ERROR', 'MAINTENANCE')),
  connection_quality INTEGER CHECK (connection_quality BETWEEN 1 AND 5),
  session_duration_minutes INTEGER CHECK (session_duration_minutes >= 0),
  data_transferred_mb DECIMAL(10,2) CHECK (data_transferred_mb >= 0),
  error_count INTEGER DEFAULT 0 CHECK (error_count >= 0),
  device_info JSONB DEFAULT '{}',
  network_info JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_device_usage_logs_tenant_created ON device_usage_logs (tenant_id, created_at DESC);
CREATE INDEX idx_device_usage_logs_device_created ON device_usage_logs (device_id, created_at DESC) WHERE device_id IS NOT NULL;
CREATE INDEX idx_device_usage_logs_room_created ON device_usage_logs (room_id, created_at DESC) WHERE room_id IS NOT NULL;
CREATE INDEX idx_device_usage_logs_event_type ON device_usage_logs (event_type, created_at DESC);
CREATE INDEX idx_device_usage_logs_errors ON device_usage_logs (event_type, created_at DESC) WHERE event_type = 'ERROR';
```

---

## 🔗 hotel-common連携実装

### **1. 共通ログ送信クライアント**

```typescript
// server/utils/hotel-common-log-client.ts
import { HotelCommonClient } from './hotel-common-client'

interface AuthLogData {
  system: 'saas'
  tenant_id: string
  user_id: string
  email: string
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'TOKEN_REFRESH'
  ip_address?: string
  user_agent?: string
  session_id?: string
  failure_reason?: string
  device_info?: object
}

interface SecurityLogData {
  system: 'saas'
  tenant_id: string
  user_id?: string
  event_type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  details?: object
  ip_address?: string
  user_agent?: string
  request_path?: string
  request_method?: string
  response_code?: number
  blocked?: boolean
}

class HotelCommonLogClient {
  private client: HotelCommonClient
  private queue: Array<{ type: string, data: any }> = []
  private isProcessing = false

  constructor() {
    // 既存hotel-commonクライアントを使用（重複実装禁止）
    this.client = HotelCommonClient.getInstance()
    this.startQueueProcessor()
  }

  async sendAuthLog(data: AuthLogData): Promise<void> {
    this.enqueue('auth', data)
  }

  async sendSecurityLog(data: SecurityLogData): Promise<void> {
    this.enqueue('security', data)
  }

  async sendBatchLog(data: any): Promise<void> {
    this.enqueue('batch', data)
  }

  async sendIntegrationLog(data: any): Promise<void> {
    this.enqueue('integration', data)
  }

  private enqueue(type: string, data: any): void {
    this.queue.push({ type, data })
  }

  private async startQueueProcessor(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.isProcessing) {
      try {
        if (this.queue.length > 0) {
          const batch = this.queue.splice(0, 10) // 10件ずつ処理
          await this.processBatch(batch)
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Log queue processing error:', error)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  private async processBatch(batch: Array<{ type: string, data: any }>): Promise<void> {
    const promises = batch.map(item => this.sendToCommon(item.type, item.data))
    await Promise.allSettled(promises) // 一部失敗しても続行
  }

  private async sendToCommon(type: string, data: any): Promise<void> {
    try {
      const endpoint = `/api/v1/logs/${type}`
      await this.client.post(endpoint, data, {
        timeout: 5000,
        retries: 3
      })
    } catch (error) {
      console.error(`Failed to send ${type} log to common:`, error)
      // 失敗したログはローカルファイルに保存（オプション）
      await this.saveFailedLog(type, data, error)
    }
  }

  private async saveFailedLog(type: string, data: any, error: any): Promise<void> {
    // 失敗したログをローカルファイルに保存（後で再送信可能）
    const failedLog = {
      type,
      data,
      error: error.message,
      timestamp: new Date().toISOString()
    }
    
    // 既存ファイルシステムを使用
    await appendFile('./logs/failed-common-logs.jsonl', JSON.stringify(failedLog) + '\n')
  }
}

export const hotelCommonLogClient = new HotelCommonLogClient()
```

### **2. 認証ログ統合**

```typescript
// server/middleware/auth-log-integration.ts
import { hotelCommonLogClient } from '~/server/utils/hotel-common-log-client'

export default defineEventHandler(async (event) => {
  // 既存認証ミドルウェアの後に実行
  if (event.context.auth?.loginEvent) {
    const { user, loginResult, request } = event.context.auth.loginEvent

    await hotelCommonLogClient.sendAuthLog({
      system: 'saas',
      tenant_id: user.tenantId,
      user_id: user.id,
      email: user.email,
      action: loginResult.success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      ip_address: getClientIP(event),
      user_agent: getHeader(event, 'user-agent'),
      session_id: loginResult.sessionId,
      failure_reason: loginResult.error?.message,
      device_info: {
        device_type: detectDeviceType(getHeader(event, 'user-agent')),
        browser: detectBrowser(getHeader(event, 'user-agent'))
      }
    })
  }

  // ログアウトイベント
  if (event.context.auth?.logoutEvent) {
    const { user } = event.context.auth.logoutEvent

    await hotelCommonLogClient.sendAuthLog({
      system: 'saas',
      tenant_id: user.tenantId,
      user_id: user.id,
      email: user.email,
      action: 'LOGOUT',
      ip_address: getClientIP(event),
      user_agent: getHeader(event, 'user-agent'),
      session_id: user.sessionId
    })
  }
})
```

---

## 🛡️ セキュリティログ統合

### **1. 不正アクセス検知**

```typescript
// server/middleware/security-monitoring.ts
import { hotelCommonLogClient } from '~/server/utils/hotel-common-log-client'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url
  const method = event.node.req.method
  const ip = getClientIP(event)
  const userAgent = getHeader(event, 'user-agent')

  // 管理者パスへの不正アクセス検知
  if (url?.startsWith('/admin') && !event.context.auth?.isAuthenticated) {
    await hotelCommonLogClient.sendSecurityLog({
      system: 'saas',
      tenant_id: event.context.tenantId || 'unknown',
      event_type: 'UNAUTHORIZED_ADMIN_ACCESS',
      severity: 'HIGH',
      description: 'Unauthorized access attempt to admin area',
      details: {
        attempted_path: url,
        method,
        user_agent: userAgent,
        referrer: getHeader(event, 'referer')
      },
      ip_address: ip,
      user_agent: userAgent,
      request_path: url,
      request_method: method,
      response_code: 401,
      blocked: true
    })
  }

  // 異常な大量リクエスト検知
  const requestCount = await checkRequestRate(ip)
  if (requestCount > 100) { // 1分間に100リクエスト以上
    await hotelCommonLogClient.sendSecurityLog({
      system: 'saas',
      tenant_id: event.context.tenantId || 'unknown',
      user_id: event.context.auth?.userId,
      event_type: 'SUSPICIOUS_HIGH_VOLUME_REQUESTS',
      severity: 'MEDIUM',
      description: 'Abnormally high request volume detected',
      details: {
        request_count: requestCount,
        time_window: '1_minute',
        path: url,
        method
      },
      ip_address: ip,
      user_agent: userAgent,
      blocked: false
    })
  }

  // SQLインジェクション試行検知
  if (containsSQLInjectionPattern(url)) {
    await hotelCommonLogClient.sendSecurityLog({
      system: 'saas',
      tenant_id: event.context.tenantId || 'unknown',
      event_type: 'SQL_INJECTION_ATTEMPT',
      severity: 'CRITICAL',
      description: 'Potential SQL injection attack detected',
      details: {
        suspicious_pattern: extractSQLPattern(url),
        full_url: url
      },
      ip_address: ip,
      user_agent: userAgent,
      request_path: url,
      request_method: method,
      blocked: true
    })

    throw createError({
      statusCode: 403,
      statusMessage: 'Request blocked for security reasons'
    })
  }
})

function containsSQLInjectionPattern(url: string): boolean {
  const patterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
    /'.*or.*'.*=/i
  ]
  return patterns.some(pattern => pattern.test(url))
}

function extractSQLPattern(url: string): string {
  const patterns = [
    /union\s+select[^&]*/i,
    /drop\s+table[^&]*/i,
    /'.*or.*'.*=[^&]*/i
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[0]
  }
  
  return 'unknown_pattern'
}

async function checkRequestRate(ip: string): Promise<number> {
  // 既存Redis接続を使用してレート制限チェック
  const redis = UnifiedRedis.getInstance()
  const key = `rate_limit:${ip}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, 60) // 1分間のウィンドウ
  }
  return count
}
```

---

## 📊 管理画面API修正例

### **1. メニュー管理API**

```typescript
// server/api/admin/menu/[id].put.ts
import { logAdminCRUDOperation } from '~/server/utils/admin-crud-logger'

export default defineEventHandler(async (event) => {
  try {
    // 既存認証チェック（重複実装禁止）
    const auth = await UnifiedAuth.validateToken(event)
    if (!auth.hasPermission('menu.update')) {
      throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
    }

    const menuId = getRouterParam(event, 'id')
    const body = await readBody(event)

    // 既存データ取得
    const oldMenu = await UnifiedDatabase.getInstance().query(
      'SELECT * FROM menu_items WHERE id = $1 AND tenant_id = $2',
      [menuId, auth.tenantId]
    )

    if (!oldMenu.rows[0]) {
      throw createError({ statusCode: 404, statusMessage: 'Menu not found' })
    }

    // 価格変更の場合はリスクレベルを上げる
    const isHighRisk = oldMenu.rows[0].price !== body.price && 
                      Math.abs(oldMenu.rows[0].price - body.price) > 1000

    // メニュー更新処理
    const updatedMenu = await UnifiedDatabase.getInstance().query(`
      UPDATE menu_items 
      SET name_ja = $1, name_en = $2, price = $3, description_ja = $4, 
          description_en = $5, category_id = $6, updated_at = NOW()
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `, [
      body.name_ja, body.name_en, body.price, body.description_ja,
      body.description_en, body.category_id, menuId, auth.tenantId
    ])

    // 拡張ログ記録
    await logAdminCRUDOperation({
      tenantId: auth.tenantId,
      userId: auth.userId,
      tableName: 'menu_items',
      operation: 'UPDATE',
      recordId: menuId,
      oldValues: oldMenu.rows[0],
      newValues: updatedMenu.rows[0],
      operationCategory: 'menu',
      riskLevel: isHighRisk ? 'HIGH' : 'MEDIUM',
      businessContext: {
        userEmail: auth.email,
        userRole: auth.role,
        menuName: body.name_ja,
        priceChange: oldMenu.rows[0].price !== body.price,
        oldPrice: oldMenu.rows[0].price,
        newPrice: body.price,
        categoryChanged: oldMenu.rows[0].category_id !== body.category_id
      },
      reason: body.reason || 'Menu information update',
      request: event
    })

    return {
      success: true,
      data: updatedMenu.rows[0]
    }

  } catch (error) {
    return handleUnifiedError(error, event)
  }
})
```

### **2. スタッフ管理API**

```typescript
// server/api/admin/staff/[id].delete.ts
import { logHighRiskOperation } from '~/server/utils/admin-crud-logger'

export default defineEventHandler(async (event) => {
  try {
    const auth = await UnifiedAuth.validateToken(event)
    if (!auth.hasPermission('staff.delete')) {
      throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
    }

    const staffId = getRouterParam(event, 'id')
    const body = await readBody(event)

    // 削除対象スタッフ情報取得
    const staff = await UnifiedDatabase.getInstance().query(
      'SELECT * FROM staff WHERE id = $1 AND tenant_id = $2',
      [staffId, auth.tenantId]
    )

    if (!staff.rows[0]) {
      throw createError({ statusCode: 404, statusMessage: 'Staff not found' })
    }

    // 自分自身の削除は禁止
    if (staffId === auth.userId) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot delete yourself' })
    }

    // 承認が必要な操作
    if (!body.approvalToken) {
      throw createError({ 
        statusCode: 403, 
        statusMessage: 'Staff deletion requires approval token' 
      })
    }

    // スタッフ削除（論理削除）
    await UnifiedDatabase.getInstance().query(
      'UPDATE staff SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND tenant_id = $2',
      [staffId, auth.tenantId]
    )

    // 高リスク操作ログ記録
    await logHighRiskOperation({
      tenantId: auth.tenantId,
      userId: auth.userId,
      tableName: 'staff',
      operation: 'DELETE',
      recordId: staffId,
      oldValues: staff.rows[0],
      newValues: { ...staff.rows[0], is_deleted: true },
      operationCategory: 'staff',
      riskLevel: 'CRITICAL',
      businessContext: {
        userEmail: auth.email,
        userRole: auth.role,
        deletedStaffEmail: staff.rows[0].email,
        deletedStaffRole: staff.rows[0].role,
        deletedStaffName: staff.rows[0].name
      },
      reason: body.reason || 'Staff deletion',
      approvedBy: body.approvedBy,
      approvalToken: body.approvalToken,
      request: event
    })

    return {
      success: true,
      message: 'Staff deleted successfully'
    }

  } catch (error) {
    return handleUnifiedError(error, event)
  }
})
```

---

## 🔧 SaaS固有ログ記録実装

### **1. AIクレジットログ記録**

```typescript
// server/utils/ai-credit-logger.ts
import { UnifiedDatabase } from './unified-database'

interface AICreditsUsage {
  tenantId: string
  userId: string
  aiFunction: string
  creditAmount: number
  requestDetails: object
  responseDetails: object
  sessionId?: string
}

class AICreditLogger {
  private db: UnifiedDatabase

  constructor() {
    this.db = UnifiedDatabase.getInstance()
  }

  async logCreditUsage(usage: AICreditsUsage): Promise<void> {
    try {
      // 現在の残高取得
      const balanceResult = await this.db.query(
        'SELECT ai_credits_balance FROM tenants WHERE id = $1',
        [usage.tenantId]
      )

      const balanceBefore = balanceResult.rows[0]?.ai_credits_balance || 0
      const balanceAfter = Math.max(0, balanceBefore - usage.creditAmount)

      // 残高更新
      await this.db.query(
        'UPDATE tenants SET ai_credits_balance = $1 WHERE id = $2',
        [balanceAfter, usage.tenantId]
      )

      // ログ記録
      await this.db.query(`
        INSERT INTO ai_credit_logs (
          tenant_id, user_id, operation, ai_function, credit_amount,
          balance_before, balance_after, request_details, response_details,
          session_id, correlation_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        usage.tenantId,
        usage.userId,
        'USE',
        usage.aiFunction,
        usage.creditAmount,
        balanceBefore,
        balanceAfter,
        JSON.stringify(usage.requestDetails),
        JSON.stringify(usage.responseDetails),
        usage.sessionId,
        crypto.randomUUID()
      ])

      // 残高不足警告
      if (balanceAfter < 100) {
        await this.sendLowBalanceAlert(usage.tenantId, balanceAfter)
      }

    } catch (error) {
      console.error('Failed to log AI credit usage:', error)
      throw error
    }
  }

  async logCreditGrant(tenantId: string, amount: number, reason: string, grantedBy: string): Promise<void> {
    const balanceResult = await this.db.query(
      'SELECT ai_credits_balance FROM tenants WHERE id = $1',
      [tenantId]
    )

    const balanceBefore = balanceResult.rows[0]?.ai_credits_balance || 0
    const balanceAfter = balanceBefore + amount

    await this.db.query(
      'UPDATE tenants SET ai_credits_balance = $1 WHERE id = $2',
      [balanceAfter, tenantId]
    )

    await this.db.query(`
      INSERT INTO ai_credit_logs (
        tenant_id, operation, ai_function, credit_amount,
        balance_before, balance_after, request_details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      tenantId,
      'GRANT',
      'MANUAL_GRANT',
      amount,
      balanceBefore,
      balanceAfter,
      JSON.stringify({ reason, granted_by: grantedBy })
    ])
  }

  private async sendLowBalanceAlert(tenantId: string, balance: number): Promise<void> {
    // 既存アラートシステムを使用
    await AlertService.sendAlert({
      type: 'LOW_AI_CREDITS',
      severity: balance < 50 ? 'HIGH' : 'MEDIUM',
      tenantId,
      message: `AI credits running low: ${balance} credits remaining`,
      details: { current_balance: balance }
    })
  }
}

export const aiCreditLogger = new AICreditLogger()
```

### **2. 請求ログ記録**

```typescript
// server/utils/billing-logger.ts
import { UnifiedDatabase } from './unified-database'

interface BillingOperation {
  tenantId: string
  billingPeriod: string
  operation: 'CALCULATE' | 'GENERATE' | 'PAYMENT' | 'REFUND'
  amount?: number
  calculationDetails?: object
  paymentMethod?: string
  paymentStatus?: string
  externalTransactionId?: string
  processedBy?: string
}

class BillingLogger {
  private db: UnifiedDatabase

  constructor() {
    this.db = UnifiedDatabase.getInstance()
  }

  async logBillingOperation(operation: BillingOperation): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO billing_logs (
          tenant_id, billing_period, operation, amount, currency,
          calculation_details, payment_method, payment_status,
          external_transaction_id, processed_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        operation.tenantId,
        operation.billingPeriod,
        operation.operation,
        operation.amount,
        'JPY',
        JSON.stringify(operation.calculationDetails || {}),
        operation.paymentMethod,
        operation.paymentStatus,
        operation.externalTransactionId,
        operation.processedBy
      ])

      // 支払い失敗の場合はアラート
      if (operation.paymentStatus === 'FAILED') {
        await this.sendPaymentFailureAlert(operation)
      }

    } catch (error) {
      console.error('Failed to log billing operation:', error)
      throw error
    }
  }

  private async sendPaymentFailureAlert(operation: BillingOperation): Promise<void> {
    await AlertService.sendAlert({
      type: 'PAYMENT_FAILURE',
      severity: 'HIGH',
      tenantId: operation.tenantId,
      message: `Payment failed for ${operation.billingPeriod}`,
      details: {
        amount: operation.amount,
        payment_method: operation.paymentMethod,
        external_id: operation.externalTransactionId
      }
    })
  }
}

export const billingLogger = new BillingLogger()
```

---

## 🧪 テスト実装

### **1. 統合テスト**

```typescript
// tests/log-integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { logAdminCRUDOperation } from '~/server/utils/admin-crud-logger'
import { aiCreditLogger } from '~/server/utils/ai-credit-logger'

describe('SaaS Log Integration', () => {
  beforeEach(async () => {
    await UnifiedDatabase.getInstance().query('BEGIN')
  })

  afterEach(async () => {
    await UnifiedDatabase.getInstance().query('ROLLBACK')
  })

  it('should log menu update with correct risk level', async () => {
    const params = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      tableName: 'menu_items',
      operation: 'UPDATE' as const,
      recordId: 'menu-123',
      oldValues: { price: 1000, name_ja: 'テストメニュー' },
      newValues: { price: 2000, name_ja: 'テストメニュー' },
      operationCategory: 'menu' as const,
      riskLevel: 'HIGH' as const,
      businessContext: { priceChange: true },
      reason: 'Price adjustment',
      request: mockRequest()
    }

    await logAdminCRUDOperation(params)

    const result = await UnifiedDatabase.getInstance().query(
      'SELECT * FROM audit_logs WHERE record_id = $1',
      ['menu-123']
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].risk_level).toBe('HIGH')
    expect(result.rows[0].operation_category).toBe('menu')
  })

  it('should log AI credit usage correctly', async () => {
    await aiCreditLogger.logCreditUsage({
      tenantId: 'test-tenant',
      userId: 'test-user',
      aiFunction: 'CONCIERGE_CHAT',
      creditAmount: 10,
      requestDetails: { message: 'Test question' },
      responseDetails: { response: 'Test answer' }
    })

    const result = await UnifiedDatabase.getInstance().query(
      'SELECT * FROM ai_credit_logs WHERE tenant_id = $1',
      ['test-tenant']
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].operation).toBe('USE')
    expect(result.rows[0].credit_amount).toBe(10)
  })
})

function mockRequest(): any {
  return {
    node: {
      req: {
        url: '/api/admin/menu/123',
        method: 'PUT',
        headers: {
          'user-agent': 'Test Agent',
          'x-forwarded-for': '192.168.1.1'
        }
      }
    },
    context: {
      session: { id: 'test-session' }
    }
  }
}
```

---

## 📋 環境設定

### **1. 環境変数（SaaS固有）**

```bash
# .env (SaaS固有設定)
# hotel-common連携設定
HOTEL_COMMON_API_URL=http://localhost:3400
HOTEL_COMMON_API_TOKEN=your_system_jwt_token_here

# ログ設定
SAAS_LOG_LEVEL=INFO
SAAS_LOG_HIGH_RISK_ALERT=true
SAAS_LOG_RETENTION_DAYS=365

# AIクレジット設定
AI_CREDIT_LOW_BALANCE_THRESHOLD=100
AI_CREDIT_CRITICAL_BALANCE_THRESHOLD=50

# 請求設定
BILLING_LOG_ENCRYPTION_KEY=your_billing_encryption_key_here
BILLING_ALERT_WEBHOOK=https://your-billing-alert-webhook.com

# セキュリティ設定
SECURITY_LOG_IMMEDIATE_ALERT=true
SECURITY_RATE_LIMIT_THRESHOLD=100
SECURITY_SQL_INJECTION_BLOCK=true
```

### **2. デプロイスクリプト**

```bash
#!/bin/bash
# deploy-saas-log-system.sh

set -e

echo "🏢 Deploying SaaS Log System..."

# 1. 既存audit_logs拡張
echo "📊 Extending audit_logs table..."
psql $DATABASE_URL -f migrations/extend_audit_logs.sql

# 2. SaaS固有テーブル作成
echo "🗄️ Creating SaaS-specific log tables..."
psql $DATABASE_URL -f migrations/create_saas_log_tables.sql

# 3. 環境変数確認
echo "⚙️ Validating SaaS environment variables..."
required_vars=(
  "HOTEL_COMMON_API_URL"
  "HOTEL_COMMON_API_TOKEN"
  "AI_CREDIT_LOW_BALANCE_THRESHOLD"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  fi
done

# 4. hotel-common連携テスト
echo "🔗 Testing hotel-common connectivity..."
curl -f -H "Authorization: Bearer $HOTEL_COMMON_API_TOKEN" \
     "$HOTEL_COMMON_API_URL/api/v1/health" || exit 1

# 5. アプリケーションデプロイ
echo "🚀 Deploying SaaS application..."
npm run build
pm2 restart hotel-saas

echo "✅ SaaS Log System deployment completed successfully!"
```

この技術実装詳細書により、hotel-saas開発チームは質問することなく完全な実装が可能になります。
