=== 【修正版】hotel-common ログシステム実装ガイド ===

🚨 **重要**: 統一アーキテクチャに基づく正式実装ガイドです。

【統一アーキテクチャの責任】
✅ hotel-common: 全ログテーブルの作成・管理
✅ hotel-common: 統一Prismaクライアント配布
✅ hotel-common: hotel_unified_db管理
✅ 各システム: 統一クライアント経由でログ記録

【必読ドキュメント】
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/common/integration/rules/unified-database-management-rules.md
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/common/integration/specifications/unified-prisma-client-specification.md
★★☆ /Users/kaneko/hotel-kanri/docs/01_systems/common/database/CURRENT_DATABASE_STATE_MASTER.md

【実装順序】
Phase 1: 既存audit_logs拡張（1-3日）
Phase 2: 新規ログテーブル作成（4-8日）
Phase 3: 統一Prismaクライアント更新（9-11日）
Phase 4: 各システム連携API実装（12-13日）
Phase 5: 統合テスト・運用準備（14日）

【重要な実装方針】
✅ 必須事項
- 全ログテーブルをhotel_unified_db内に作成
- 統一Prismaクライアントの更新・配布
- Row Level Security（RLS）による完全なテナント分離
- 適切なインデックス・制約設定
- 各システムへの統一クライアント配布

❌ 絶対禁止事項
- 各システムでの独自テーブル作成許可
- 独自Prismaクライアント使用許可
- 統一DB外でのログデータ管理
- 既存テーブルの破壊的変更

【Phase 1: 既存audit_logs拡張】

□ audit_logsテーブル拡張
```sql
-- hotel_unified_db内で実行
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS operation_category VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'LOW';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS business_context JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES staff(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(operation_category, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk ON audit_logs(risk_level, created_at) WHERE risk_level IN ('HIGH', 'CRITICAL');
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_approved_by ON audit_logs(approved_by, created_at);
```

□ 既存データ互換性確保
  □ 新カラムはNULL許可で追加
  □ デフォルト値設定
  □ 既存トリガーの動作確認

【Phase 2: 新規ログテーブル作成】

□ 認証ログテーブル
```sql
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES staff(id),
  action VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'TOKEN_REFRESH'
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  device_info JSONB,
  location_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS設定
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_logs_tenant_isolation ON auth_logs FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- インデックス
CREATE INDEX idx_auth_logs_tenant_created ON auth_logs(tenant_id, created_at);
CREATE INDEX idx_auth_logs_user_action ON auth_logs(user_id, action, created_at);
CREATE INDEX idx_auth_logs_failed ON auth_logs(tenant_id, created_at) WHERE success = FALSE;
```

□ AI操作・クレジットログテーブル
```sql
CREATE TABLE ai_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES staff(id),
  operation VARCHAR(50) NOT NULL, -- 'USE', 'GRANT', 'ADJUST', 'EXPIRE'
  ai_function VARCHAR(100) NOT NULL, -- 'CONCIERGE_CHAT', 'MENU_RECOMMEND', 'TRANSLATION'
  credit_amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  request_details JSONB,
  response_details JSONB,
  cost_calculation JSONB,
  processing_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS設定
ALTER TABLE ai_operation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_operation_logs_tenant_isolation ON ai_operation_logs FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- インデックス
CREATE INDEX idx_ai_operation_logs_tenant_created ON ai_operation_logs(tenant_id, created_at);
CREATE INDEX idx_ai_operation_logs_function ON ai_operation_logs(ai_function, created_at);
CREATE INDEX idx_ai_operation_logs_user ON ai_operation_logs(user_id, created_at);
```

□ 請求・課金ログテーブル
```sql
CREATE TABLE billing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  billing_period VARCHAR(20) NOT NULL, -- '2025-09'
  operation VARCHAR(50) NOT NULL, -- 'CALCULATE', 'GENERATE', 'PAYMENT', 'REFUND'
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'JPY',
  calculation_details JSONB,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50),
  external_transaction_id VARCHAR(255),
  invoice_number VARCHAR(100),
  error_details JSONB,
  processed_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS設定
ALTER TABLE billing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_logs_tenant_isolation ON billing_logs FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- インデックス
CREATE INDEX idx_billing_logs_tenant_period ON billing_logs(tenant_id, billing_period);
CREATE INDEX idx_billing_logs_operation ON billing_logs(operation, created_at);
CREATE INDEX idx_billing_logs_external_id ON billing_logs(external_transaction_id);
```

□ デバイス使用量ログテーブル
```sql
CREATE TABLE device_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  device_id UUID REFERENCES device_rooms(id),
  room_id VARCHAR(100),
  event_type VARCHAR(50) NOT NULL, -- 'CONNECT', 'DISCONNECT', 'HEARTBEAT', 'ERROR'
  connection_quality INTEGER CHECK (connection_quality BETWEEN 1 AND 5),
  session_duration_minutes INTEGER,
  data_transferred_mb DECIMAL(10,2),
  error_count INTEGER DEFAULT 0,
  device_info JSONB,
  network_info JSONB,
  performance_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS設定
ALTER TABLE device_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY device_usage_logs_tenant_isolation ON device_usage_logs FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- インデックス
CREATE INDEX idx_device_usage_logs_tenant_created ON device_usage_logs(tenant_id, created_at);
CREATE INDEX idx_device_usage_logs_device ON device_usage_logs(device_id, created_at);
CREATE INDEX idx_device_usage_logs_room ON device_usage_logs(room_id, created_at);
```

□ セキュリティログテーブル
```sql
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID, -- 不正アクセスの場合はNULL
  event_type VARCHAR(50) NOT NULL, -- 'UNAUTHORIZED_ACCESS', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE'
  severity VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  request_details JSONB,
  response_details JSONB,
  detection_method VARCHAR(100), -- 'RATE_LIMIT', 'PATTERN_ANALYSIS', 'MANUAL'
  action_taken VARCHAR(100), -- 'BLOCKED', 'LOGGED', 'ALERTED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS設定
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_logs_tenant_isolation ON security_logs FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- インデックス
CREATE INDEX idx_security_logs_tenant_created ON security_logs(tenant_id, created_at);
CREATE INDEX idx_security_logs_severity ON security_logs(severity, created_at);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type, created_at);
CREATE INDEX idx_security_logs_ip ON security_logs(ip_address, created_at);
```

【Phase 3: 統一Prismaクライアント更新】

□ Prismaスキーマ更新
```prisma
// prisma/schema.prisma に追加

model AuditLogs {
  id                 String   @id @default(cuid())
  tenantId          String   @map("tenant_id")
  tableName         String   @map("table_name")
  operation         String
  recordId          String?  @map("record_id")
  userId            String?  @map("user_id")
  oldValues         Json?    @map("old_values")
  newValues         Json?    @map("new_values")
  changedFields     Json?    @map("changed_fields")
  // 拡張カラム
  operationCategory String?  @map("operation_category")
  riskLevel         String?  @map("risk_level") @default("LOW")
  businessContext   Json?    @map("business_context")
  sessionId         String?  @map("session_id")
  approvalRequired  Boolean? @map("approval_required") @default(false)
  approvedBy        String?  @map("approved_by")
  reason            String?
  ipAddress         String?  @map("ip_address")
  userAgent         String?  @map("user_agent")
  requestId         String?  @map("request_id")
  createdAt         DateTime @default(now()) @map("created_at")

  tenant     Tenant  @relation(fields: [tenantId], references: [id])
  user       Staff?  @relation(fields: [userId], references: [id])
  approver   Staff?  @relation("AuditLogApprover", fields: [approvedBy], references: [id])

  @@map("audit_logs")
}

model AuthLogs {
  id            String    @id @default(cuid())
  tenantId      String    @map("tenant_id")
  userId        String?   @map("user_id")
  action        String
  ipAddress     String?   @map("ip_address")
  userAgent     String?   @map("user_agent")
  sessionId     String?   @map("session_id")
  success       Boolean
  failureReason String?   @map("failure_reason")
  deviceInfo    Json?     @map("device_info")
  locationInfo  Json?     @map("location_info")
  createdAt     DateTime  @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   Staff? @relation(fields: [userId], references: [id])

  @@map("auth_logs")
}

model AiOperationLogs {
  id                String   @id @default(cuid())
  tenantId          String   @map("tenant_id")
  userId            String?  @map("user_id")
  operation         String
  aiFunction        String   @map("ai_function")
  creditAmount      Int      @map("credit_amount")
  balanceBefore     Int      @map("balance_before")
  balanceAfter      Int      @map("balance_after")
  requestDetails    Json?    @map("request_details")
  responseDetails   Json?    @map("response_details")
  costCalculation   Json?    @map("cost_calculation")
  processingTimeMs  Int?     @map("processing_time_ms")
  success           Boolean  @default(true)
  errorDetails      Json?    @map("error_details")
  createdAt         DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   Staff? @relation(fields: [userId], references: [id])

  @@map("ai_operation_logs")
}

model BillingLogs {
  id                    String    @id @default(cuid())
  tenantId              String    @map("tenant_id")
  billingPeriod         String    @map("billing_period")
  operation             String
  amount                Decimal?  @db.Decimal(10, 2)
  currency              String?   @default("JPY")
  calculationDetails    Json?     @map("calculation_details")
  paymentMethod         String?   @map("payment_method")
  paymentStatus         String?   @map("payment_status")
  externalTransactionId String?   @map("external_transaction_id")
  invoiceNumber         String?   @map("invoice_number")
  errorDetails          Json?     @map("error_details")
  processedBy           String?   @map("processed_by")
  createdAt             DateTime  @default(now()) @map("created_at")

  tenant    Tenant @relation(fields: [tenantId], references: [id])
  processor Staff? @relation(fields: [processedBy], references: [id])

  @@map("billing_logs")
}

model DeviceUsageLogs {
  id                   String    @id @default(cuid())
  tenantId             String    @map("tenant_id")
  deviceId             String?   @map("device_id")
  roomId               String?   @map("room_id")
  eventType            String    @map("event_type")
  connectionQuality    Int?      @map("connection_quality")
  sessionDurationMins  Int?      @map("session_duration_minutes")
  dataTransferredMb    Decimal?  @map("data_transferred_mb") @db.Decimal(10, 2)
  errorCount           Int?      @default(0) @map("error_count")
  deviceInfo           Json?     @map("device_info")
  networkInfo          Json?     @map("network_info")
  performanceMetrics   Json?     @map("performance_metrics")
  createdAt            DateTime  @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("device_usage_logs")
}

model SecurityLogs {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  userId          String?  @map("user_id")
  eventType       String   @map("event_type")
  severity        String
  description     String
  ipAddress       String?  @map("ip_address")
  userAgent       String?  @map("user_agent")
  requestDetails  Json?    @map("request_details")
  responseDetails Json?    @map("response_details")
  detectionMethod String?  @map("detection_method")
  actionTaken     String?  @map("action_taken")
  createdAt       DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   Staff? @relation(fields: [userId], references: [id])

  @@map("security_logs")
}
```

□ 統一Prismaクライアント再生成・配布
```bash
# hotel-common内で実行
npx prisma generate
npm run build

# 各システムへの配布準備
npm pack
```

【Phase 4: 各システム連携API実装】

□ ログ記録共通関数提供
```typescript
// src/services/unified-log-service.ts
export class UnifiedLogService {
  private prisma = getUnifiedPrisma()

  async logAdminCRUD(params: AdminCRUDLogParams) {
    return await this.prisma.auditLogs.create({
      data: {
        tenantId: params.tenantId,
        tableName: params.tableName,
        operation: params.operation,
        recordId: params.recordId,
        userId: params.userId,
        oldValues: params.oldValues,
        newValues: params.newValues,
        operationCategory: params.operationCategory,
        riskLevel: params.riskLevel,
        businessContext: params.businessContext,
        sessionId: params.sessionId,
        approvalRequired: ['HIGH', 'CRITICAL'].includes(params.riskLevel),
        approvedBy: params.approvedBy,
        reason: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      }
    })
  }

  async logAuth(params: AuthLogParams) {
    return await this.prisma.authLogs.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        sessionId: params.sessionId,
        success: params.success,
        failureReason: params.failureReason,
        deviceInfo: params.deviceInfo,
        locationInfo: params.locationInfo
      }
    })
  }

  async logAIOperation(params: AIOperationLogParams) {
    return await this.prisma.aiOperationLogs.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        operation: params.operation,
        aiFunction: params.aiFunction,
        creditAmount: params.creditAmount,
        balanceBefore: params.balanceBefore,
        balanceAfter: params.balanceAfter,
        requestDetails: params.requestDetails,
        responseDetails: params.responseDetails,
        costCalculation: params.costCalculation,
        processingTimeMs: params.processingTimeMs,
        success: params.success,
        errorDetails: params.errorDetails
      }
    })
  }

  // 他のログ記録メソッド...
}
```

【Phase 5: 統合テスト・運用準備】

□ データベーステスト
  □ 全テーブル作成確認
  □ RLS動作確認
  □ インデックス性能確認
  □ 制約動作確認

□ 統一Prismaクライアントテスト
  □ 各システムでの接続テスト
  □ CRUD操作テスト
  □ トランザクションテスト

□ ログ記録機能テスト
  □ 各ログテーブルへの記録テスト
  □ 大量データ処理テスト
  □ 同時アクセステスト

【実装チェックリスト】

□ データベース作業
  □ audit_logs拡張完了
  □ 新規ログテーブル5個作成完了
  □ RLS設定完了
  □ インデックス作成完了

□ 統一Prismaクライアント
  □ スキーマ更新完了
  □ クライアント再生成完了
  □ 各システムへの配布完了

□ 共通サービス
  □ UnifiedLogService実装完了
  □ ログ記録API実装完了
  □ エラーハンドリング実装完了

□ テスト
  □ データベーステスト完了
  □ 統一クライアントテスト完了
  □ ログ記録機能テスト完了

【各システムへの配布事項】

hotel-saas、hotel-pms、hotel-memberチームに以下を配布：
✅ 更新された統一Prismaクライアント
✅ 新ログテーブル仕様書
✅ ログ記録関数使用例
✅ 環境変数設定手順

【完了報告】

実装完了後、以下を報告してください：
- 全ログテーブル作成状況
- 統一Prismaクライアント配布状況
- 各システムでの接続確認結果
- パフォーマンステスト結果
- 運用開始準備状況
