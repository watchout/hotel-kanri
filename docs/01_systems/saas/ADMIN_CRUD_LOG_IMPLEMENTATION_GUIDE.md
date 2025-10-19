=== hotel-saas 管理画面CRUD操作ログ実装ガイド ===

**ドキュメントID**: SAAS-CRUD-LOG-IMPL-2025-09-24-001  
**対象システム**: hotel-saas  
**バージョン**: v1.0  
**作成日**: 2025年9月24日  
**ステータス**: 実装準備完了  

---

【必読ドキュメント】
★★★ 本実装ガイド（SaaS開発チーム必読）
★★☆ 全システム統合ログ管理粒度・レベル統一基準
★☆☆ hotel-common統合ログ管理仕様（後日作成予定）

---

【実装順序】
Phase 1: 既存audit_logsテーブル拡張（本ドキュメント）
Phase 2: 統一ログ関数実装
Phase 3: 管理画面CRUD操作への適用
Phase 4: レポート・監視機能拡張
Phase 5: hotel-common連携対応

---

【重要な実装方針】

❌ 禁止事項:
- 既存audit_logsテーブルの破壊的変更
- 既存レポート・分析機能への影響
- パスワード・機密情報のログ出力
- 同期処理でのログ記録（パフォーマンス劣化）

✅ 必須事項:
- 既存テーブル構造の後方互換性維持
- 非同期でのログ記録処理
- テナント分離の徹底
- 適切なインデックス設定

---

## 🗄️ データベース拡張設計

### **既存audit_logsテーブル拡張**

#### **新規カラム追加（破壊的変更なし）**
```sql
-- 既存テーブルに新しいカラムを追加
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS operation_category VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS business_context JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'LOW';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);

-- 新しいインデックス追加
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(operation_category, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_table ON audit_logs(tenant_id, table_name, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk ON audit_logs(risk_level, created_at) WHERE risk_level IN ('HIGH', 'CRITICAL');
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id, created_at);

-- 既存データの互換性確保
UPDATE audit_logs SET operation_category = 'legacy' WHERE operation_category IS NULL;
UPDATE audit_logs SET risk_level = 'LOW' WHERE risk_level IS NULL;
```

#### **operation_category 定義**
```typescript
enum OperationCategory {
  // 業務操作
  'menu' = 'メニュー管理',
  'order' = '注文処理', 
  'billing' = '会計処理',
  'room' = '客室関連',
  'ai' = 'AIコンシェルジュ',
  
  // 管理操作
  'admin' = '管理画面操作',
  'staff' = 'スタッフ管理',
  'system' = 'システム設定',
  'auth' = '認証関連',
  
  // 互換性
  'legacy' = '既存データ'
}
```

#### **risk_level 定義**
```typescript
enum RiskLevel {
  'LOW' = '通常操作',
  'MEDIUM' = '重要操作', 
  'HIGH' = '高リスク操作',
  'CRITICAL' = '緊急・機密操作'
}
```

---

## 🔧 統一ログ関数実装

### **基本ログ関数**
```typescript
// utils/auditLogger.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditLogParams {
  tenantId: string;
  userId: string;
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  recordId?: string;
  oldValues?: any;
  newValues?: any;
  operationCategory?: OperationCategory;
  riskLevel?: RiskLevel;
  businessContext?: any;
  sessionId?: string;
  request?: {
    ip?: string;
    userAgent?: string;
    requestId?: string;
  };
}

/**
 * 管理画面CRUD操作ログ記録
 */
export async function logAdminCRUDOperation(params: AuditLogParams): Promise<void> {
  try {
    // 非同期でログ記録（パフォーマンス重視）
    setImmediate(async () => {
      await prisma.audit_logs.create({
        data: {
          tenant_id: params.tenantId,
          table_name: params.tableName,
          operation: params.operation,
          record_id: params.recordId,
          user_id: params.userId,
          old_values: params.oldValues ? JSON.stringify(params.oldValues) : null,
          new_values: params.newValues ? JSON.stringify(params.newValues) : null,
          changed_fields: params.oldValues && params.newValues 
            ? JSON.stringify(getChangedFields(params.oldValues, params.newValues))
            : null,
          operation_category: params.operationCategory || 'admin',
          risk_level: params.riskLevel || 'LOW',
          business_context: params.businessContext ? JSON.stringify(params.businessContext) : null,
          session_id: params.sessionId,
          ip_address: params.request?.ip,
          user_agent: params.request?.userAgent,
          request_id: params.request?.requestId,
          created_at: new Date()
        }
      });
    });
  } catch (error) {
    // ログ記録失敗は業務処理に影響させない
    console.error('Audit log failed:', error);
  }
}

/**
 * 変更フィールド検出
 */
function getChangedFields(oldValues: any, newValues: any): string[] {
  const changed: string[] = [];
  
  for (const key in newValues) {
    if (oldValues[key] !== newValues[key]) {
      changed.push(key);
    }
  }
  
  return changed;
}
```

### **高リスク操作専用関数**
```typescript
/**
 * 高リスク操作ログ（承認情報付き）
 */
export async function logHighRiskOperation(params: AuditLogParams & {
  approvedBy?: string;
  approvedAt?: Date;
  reason: string;
}): Promise<void> {
  await logAdminCRUDOperation({
    ...params,
    riskLevel: 'HIGH',
    businessContext: {
      ...params.businessContext,
      approved_by: params.approvedBy,
      approved_at: params.approvedAt,
      operation_reason: params.reason
    }
  });
}
```

---

## 📋 管理画面操作への適用

### **メニュー管理操作**
```typescript
// pages/api/admin/menu/[id].ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;
  const session = await getSession(req, res);
  
  if (method === 'PUT') {
    // メニュー更新処理
    const oldMenu = await prisma.menu_items.findUnique({ where: { id } });
    const updatedMenu = await prisma.menu_items.update({
      where: { id },
      data: req.body
    });
    
    // CRUD操作ログ記録
    await logAdminCRUDOperation({
      tenantId: session.tenantId,
      userId: session.userId,
      tableName: 'menu_items',
      operation: 'UPDATE',
      recordId: id as string,
      oldValues: oldMenu,
      newValues: updatedMenu,
      operationCategory: 'menu',
      riskLevel: req.body.price !== oldMenu?.price ? 'MEDIUM' : 'LOW',
      businessContext: {
        menu_name: updatedMenu.name_ja,
        price_changed: req.body.price !== oldMenu?.price,
        availability_changed: req.body.is_available !== oldMenu?.is_available
      },
      sessionId: session.sessionId,
      request: {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id'] as string
      }
    });
    
    res.json(updatedMenu);
  }
}
```

### **注文管理操作**
```typescript
// pages/api/admin/orders/[id].ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;
  const session = await getSession(req, res);
  
  if (method === 'PATCH') {
    // 注文ステータス変更
    const oldOrder = await prisma.orders.findUnique({ where: { id } });
    const updatedOrder = await prisma.orders.update({
      where: { id },
      data: { status: req.body.status }
    });
    
    // 高リスク操作の場合（返金・キャンセル）
    const isHighRisk = ['cancelled', 'refunded'].includes(req.body.status);
    
    if (isHighRisk) {
      await logHighRiskOperation({
        tenantId: session.tenantId,
        userId: session.userId,
        tableName: 'orders',
        operation: 'UPDATE',
        recordId: id as string,
        oldValues: { status: oldOrder?.status },
        newValues: { status: req.body.status },
        operationCategory: 'order',
        reason: req.body.reason || '管理者による状態変更',
        businessContext: {
          room_id: oldOrder?.room_id,
          total_amount: oldOrder?.total,
          status_change: `${oldOrder?.status} → ${req.body.status}`
        },
        sessionId: session.sessionId,
        request: {
          ip: req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });
    } else {
      await logAdminCRUDOperation({
        tenantId: session.tenantId,
        userId: session.userId,
        tableName: 'orders',
        operation: 'UPDATE',
        recordId: id as string,
        oldValues: { status: oldOrder?.status },
        newValues: { status: req.body.status },
        operationCategory: 'order',
        riskLevel: 'LOW',
        sessionId: session.sessionId,
        request: {
          ip: req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });
    }
    
    res.json(updatedOrder);
  }
}
```

### **スタッフ管理操作**
```typescript
// pages/api/admin/staff/[id].ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;
  const session = await getSession(req, res);
  
  if (method === 'DELETE') {
    // スタッフ削除（高リスク操作）
    const staff = await prisma.users.findUnique({ where: { id } });
    await prisma.users.delete({ where: { id } });
    
    await logHighRiskOperation({
      tenantId: session.tenantId,
      userId: session.userId,
      tableName: 'users',
      operation: 'DELETE',
      recordId: id as string,
      oldValues: {
        email: staff?.email,
        role: staff?.role,
        is_active: staff?.is_active
      },
      newValues: null,
      operationCategory: 'staff',
      reason: req.body.reason || 'スタッフ削除',
      businessContext: {
        deleted_staff_email: staff?.email,
        deleted_staff_role: staff?.role
      },
      sessionId: session.sessionId,
      request: {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });
    
    res.json({ success: true });
  }
}
```

---

## 📊 レポート・監視機能拡張

### **管理画面用ログ検索API**
```typescript
// pages/api/admin/audit-logs.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const { 
    category, 
    riskLevel, 
    userId, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 50 
  } = req.query;
  
  const where: any = {
    tenant_id: session.tenantId
  };
  
  if (category) where.operation_category = category;
  if (riskLevel) where.risk_level = riskLevel;
  if (userId) where.user_id = userId;
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate as string);
    if (endDate) where.created_at.lte = new Date(endDate as string);
  }
  
  const logs = await prisma.audit_logs.findMany({
    where,
    orderBy: { created_at: 'desc' },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    include: {
      user: {
        select: { email: true, role: true }
      }
    }
  });
  
  const total = await prisma.audit_logs.count({ where });
  
  res.json({
    logs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}
```

### **リアルタイム監視ダッシュボード**
```typescript
// pages/api/admin/dashboard/log-stats.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const { period = '24h' } = req.query;
  
  const startDate = new Date();
  if (period === '24h') startDate.setHours(startDate.getHours() - 24);
  if (period === '7d') startDate.setDate(startDate.getDate() - 7);
  if (period === '30d') startDate.setDate(startDate.getDate() - 30);
  
  const stats = await prisma.audit_logs.groupBy({
    by: ['operation_category', 'risk_level'],
    where: {
      tenant_id: session.tenantId,
      created_at: { gte: startDate }
    },
    _count: true
  });
  
  const highRiskOperations = await prisma.audit_logs.findMany({
    where: {
      tenant_id: session.tenantId,
      risk_level: { in: ['HIGH', 'CRITICAL'] },
      created_at: { gte: startDate }
    },
    orderBy: { created_at: 'desc' },
    take: 10,
    include: {
      user: {
        select: { email: true }
      }
    }
  });
  
  res.json({
    stats,
    highRiskOperations,
    period
  });
}
```

---

## 🚀 実装チェックリスト

### Phase 1: データベース拡張
□ audit_logsテーブルへの新規カラム追加
□ 新しいインデックスの作成
□ 既存データの互換性確保
□ マイグレーションスクリプトの作成・テスト

### Phase 2: ログ関数実装
□ 統一ログ関数の実装
□ 高リスク操作専用関数の実装
□ エラーハンドリングの実装
□ 非同期処理の動作確認

### Phase 3: 管理画面適用
□ メニュー管理操作へのログ適用
□ 注文管理操作へのログ適用
□ スタッフ管理操作へのログ適用
□ システム設定操作へのログ適用

### Phase 4: 監視・レポート機能
□ ログ検索APIの実装
□ ダッシュボード統計APIの実装
□ 高リスク操作アラート機能
□ CSV エクスポート機能

### Phase 5: テスト・運用準備
□ 単体テストの作成・実行
□ 統合テストの作成・実行
□ パフォーマンステスト
□ 運用手順書の作成

---

【デプロイメント手順】

1. **開発環境でのテスト**
   - マイグレーション実行
   - ログ関数の動作確認
   - 既存機能への影響確認

2. **ステージング環境での検証**
   - 本番データでの動作確認
   - パフォーマンス測定
   - レポート機能の確認

3. **本番環境へのデプロイ**
   - メンテナンス時間での実行
   - 段階的な機能有効化
   - 監視・アラート設定

4. **運用開始**
   - ログ蓄積状況の監視
   - 管理者向け操作説明
   - 定期的な分析レポート作成

---

**承認者**: hotel-saas開発チーム  
**承認日**: 2025年9月24日（予定）  
**実装開始予定**: 承認後即座
